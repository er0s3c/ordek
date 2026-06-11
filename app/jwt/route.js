// INSECURE JWT HEDEF MAKINESI
// GET /jwt  -> debugger UI + varsayılan user token
// POST /jwt -> token doğrula; admin ise FLAG
import { getLevel } from "@/lib/level";
import { FLAGS } from "@/lib/flags";
import { page, flagBanner, esc, html } from "@/lib/machine-ui";
import crypto from "crypto";

export const dynamic = "force-dynamic";
const FLAG = FLAGS["insecure-jwt"];
const STRONG_SECRET = crypto.randomBytes(32).toString("hex");

const b64url = (str) => Buffer.from(str).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
function b64urlDecode(str) { let b = str.replace(/-/g, "+").replace(/_/g, "/"); while (b.length % 4) b += "="; return Buffer.from(b, "base64").toString("utf-8"); }
function createToken(payloadObj, secret, alg = "HS256") {
  const h64 = b64url(JSON.stringify({ alg, typ: "JWT" }));
  const p64 = b64url(JSON.stringify(payloadObj));
  if (alg.toLowerCase() === "none" || !secret) return `${h64}.${p64}.`;
  const sig = crypto.createHmac("sha256", secret).update(`${h64}.${p64}`).digest("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  return `${h64}.${p64}.${sig}`;
}

const HEAD = `<style>
  .jwt-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}
  @media (max-width:768px){.jwt-grid{grid-template-columns:1fr}}
  .part-header{color:var(--red-bright)}.part-payload{color:#c98fe0}.part-sig{color:var(--blue)}
  #decodeResult{margin-top:14px;background:var(--bg-inset);padding:14px;border-radius:6px;font-family:var(--font-mono);font-size:13px;display:none;white-space:pre-wrap;word-break:break-all}
</style>
<script>
  function decodeToken(){
    const t=document.getElementById('tokenInput').value.trim();const parts=t.split('.');const box=document.getElementById('decodeResult');
    if(parts.length<2){box.innerHTML='<span style="color:var(--red-bright)">Geçersiz token formatı</span>';box.style.display='block';return;}
    try{
      const header=JSON.stringify(JSON.parse(atob(parts[0].replace(/-/g,'+').replace(/_/g,'/'))),null,2);
      const payload=JSON.stringify(JSON.parse(atob(parts[1].replace(/-/g,'+').replace(/_/g,'/'))),null,2);
      box.innerHTML='<span class="part-header">HEADER:</span>\\n'+header+'\\n\\n<span class="part-payload">PAYLOAD:</span>\\n'+payload;
      if(parts[2])box.innerHTML+='\\n\\n<span class="part-sig">SIGNATURE:</span>\\n'+parts[2];
      box.style.display='block';
    }catch(e){box.innerHTML='<span style="color:var(--red-bright)">Base64/JSON parse hatası</span>';box.style.display='block';}
  }
  function forgeAlgNone(){
    const t=document.getElementById('tokenInput').value.trim();const parts=t.split('.');if(parts.length<2)return;
    try{
      const p=JSON.parse(atob(parts[1].replace(/-/g,'+').replace(/_/g,'/')));p.role="admin";
      const h=btoa(JSON.stringify({alg:"none",typ:"JWT"})).replace(/=/g,'').replace(/\\+/g,'-').replace(/\\//g,'_');
      const np=btoa(JSON.stringify(p)).replace(/=/g,'').replace(/\\+/g,'-').replace(/\\//g,'_');
      document.getElementById('tokenInput').value=h+'.'+np+'.';decodeToken();
    }catch(e){alert("Token değiştirilemedi.");}
  }
</script>`;

function renderPage(level, initialToken, resultMsg = null, isAdmin = false) {
  const body = `
    ${isAdmin ? flagBanner({ value: FLAG, sub: "İmza mekanizmasını aşarak admin token'ı ürettin." }) : ""}
    <div class="jwt-grid">
      <div class="panel"><div class="panel-h">🛠️ jwt debugger</div><div class="panel-b col" style="display:flex;flex-direction:column;gap:12px">
        <p class="sub" style="margin:0">Oturum açmak istediğin token'ı yapıştır, içeriğini incele veya yeniden üret.</p>
        <textarea id="tokenInput" placeholder="eyJhbGciOi…" style="min-height:160px">${esc(initialToken)}</textarea>
        <div style="display:flex;gap:10px">
          <button class="btn" onclick="decodeToken()">Decode</button>
          <button class="btn" onclick="forgeAlgNone()">alg:none üret (admin)</button>
        </div>
        <div id="decodeResult"></div>
      </div></div>
      <div class="panel"><div class="panel-h">🚪 login</div><div class="panel-b col" style="display:flex;flex-direction:column;gap:14px">
        <p class="sub" style="margin:0">Sisteme girmek için token'ını doğrula (yalnızca admin paneli mevcut).</p>
        <form method="POST" action="/jwt" style="display:flex;flex-direction:column;gap:14px">
          <textarea name="token" id="submitToken" style="display:none"></textarea>
          ${resultMsg ? `<div class="${isAdmin ? "flag" : "alert"}">${esc(resultMsg)}</div>` : ""}
          <div class="note" style="text-align:center;padding:22px"><div style="font-size:30px;margin-bottom:6px">🔒</div>Admin yetkisi gerektirir.</div>
          <button type="submit" class="btn primary" onclick="document.getElementById('submitToken').value=document.getElementById('tokenInput').value">Token ile Giriş Yap</button>
        </form>
      </div></div>
    </div>
  `;
  return page({ title: "ördek // JWT Debugger", level, subtitle: "access control", body, head: HEAD });
}

function secretFor(level) { return level === "low" || level === "medium" ? "secret123" : STRONG_SECRET; }

export async function GET(req) {
  const level = getLevel(req.headers);
  const token = createToken({ username: "guest", role: "user" }, secretFor(level), "HS256");
  return html(renderPage(level, token));
}

export async function POST(req) {
  const level = getLevel(req.headers);
  const formData = await req.formData();
  const token = formData.get("token") || "";
  const secret = secretFor(level);

  const parts = token.split(".");
  if (parts.length < 2 || parts.length > 3) return html(renderPage(level, token, "HATA: Geçersiz JWT formatı"));

  let resultMsg = "", isAdmin = false;
  try {
    const header = JSON.parse(b64urlDecode(parts[0]));
    const payload = JSON.parse(b64urlDecode(parts[1]));
    const providedSig = parts[2] || "";

    if (level === "low" && header.alg && header.alg.toLowerCase() === "none") {
      if (payload.role === "admin") { isAdmin = true; resultMsg = "BAŞARILI: alg:none ile imza atlatıldı. Admin erişimi verildi!"; }
      else resultMsg = "Giriş yapıldı ama rolün admin değil. (role: " + payload.role + ")";
    } else {
      const expectedSig = crypto.createHmac("sha256", secret).update(parts[0] + "." + parts[1]).digest("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
      if (providedSig === expectedSig) {
        if (payload.role === "admin") { isAdmin = true; resultMsg = level === "medium" ? "BAŞARILI: Zayıf secret (secret123) kırıldı, geçerli admin token üretildi!" : "BAŞARILI: Güçlü secret ile yetki doğrulandı!"; }
        else resultMsg = "İmza geçerli ama rolün admin değil. (role: " + payload.role + ")";
      } else resultMsg = "HATA: İmza geçersiz! Token kurcalanmış.";
    }
  } catch { resultMsg = "HATA: Token decode/doğrulama sırasında sorun oluştu."; }

  return html(renderPage(level, token, resultMsg, isAdmin));
}
