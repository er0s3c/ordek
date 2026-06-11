// CORS Misconfiguration HEDEF MAKINESI
// GET /cors?action=api -> zafiyetli API (hassas veri + flag döner)
// GET /cors            -> "attacker simulator" (sahte Origin ile API'ye istek atar)
import { getLevel } from "@/lib/level";
import { FLAGS } from "@/lib/flags";
import { page, flagBanner, html } from "@/lib/machine-ui";

export const dynamic = "force-dynamic";
const FLAG = FLAGS["cors-misconfig"];

const SENSITIVE_DATA = {
  user: "admin@ordek-store.com",
  balance: "$5,420.00",
  flag: FLAG,
  message: "Bu veriyi sadece 'https://ordek-store.com' okuyabilmelidir!",
};

function renderAttackerPage(level) {
  const body = `
    ${flagBanner({ value: "", sub: "Çapraz-origin istekle hassas API verisini çaldın.", hidden: true })}
    <div class="panel"><div class="panel-b col" style="display:flex;flex-direction:column;gap:14px">
      <h2 style="margin:0;font-size:19px;color:var(--red-bright)">🎯 Hedef: ordek-store.com kullanıcı verileri</h2>
      <p class="sub">Şu an sahte/saldırgan bir sitedesin. Kurban bu sayfayı ziyaret ettiğinde tarayıcısı arka planda <code>/cors?action=api</code> adresine istek atıp gizli bilgileri çalmaya çalışır. CORS yanlış yapılandırıldıysa tarayıcı veriyi okumana izin verir.</p>
      <div class="input-group">
        <label>Saldırganın Origin'ini simüle et (sahte Origin)</label>
        <input type="text" id="fakeOrigin" value="https://evil.com">
        <small class="sub" style="display:block;margin-top:6px;font-size:11.5px">Tarayıcı normalde Origin başlığını JS ile değiştirtmez. Bu lab'da, proxy'siz test için yazdığın değer <code>X-Fake-Origin</code> başlığıyla iletilir ve API bunu gerçek Origin gibi işler.</small>
      </div>
      <button class="btn primary" onclick="executeXHR()">API'ye İstek At (fetch)</button>
    </div></div>
    <div class="panel"><div class="panel-h">💻 tarayıcı konsolu (fetch yanıtı)</div>
      <div class="panel-b"><div class="console" id="terminalOutput">Bekleniyor…</div></div></div>
    <script>
      async function executeXHR(){
        const originVal = document.getElementById('fakeOrigin').value.trim();
        const term = document.getElementById('terminalOutput');
        term.innerHTML = "İstek gönderiliyor…\\nGET /cors?action=api\\nOrigin: " + originVal + "\\n…";
        try{
          const res = await fetch('/cors?action=api', { headers: { 'X-Fake-Origin': originVal } });
          if(!res.ok){ term.innerHTML += "\\n\\n<span class='err'>HTTP Hatası: " + res.status + "</span>"; return; }
          const data = await res.json();
          if(data.corsError){
            term.innerHTML += "\\n\\n<span class='err'>🚫 CORS politikası engelledi!</span>\\nSebep: " + data.corsError;
          } else {
            term.innerHTML += "\\n\\n<span class='ok'>✅ CORS başarılı! Veriler okundu:</span>\\n";
            term.innerHTML += "<span class='leak'>" + JSON.stringify(data, null, 2) + "</span>";
            if(data.flag){ var fb=document.getElementById('mk-flag'); var v=fb.querySelector('.val'); if(v) v.textContent=data.flag; fb.classList.remove('hidden'); }
          }
        }catch(e){ term.innerHTML += "\\n\\n<span class='err'>Ağ hatası (CORS olabilir): " + e.message + "</span>"; }
      }
    </script>
  `;
  return page({ title: "Evil // Attacker Simulator", level, subtitle: "attacker simulator", body, accent: "danger" });
}

function jsonResponse(obj, status = 200, corsHeaders = {}) {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json", ...corsHeaders } });
}

export async function GET(req) {
  const level = getLevel(req.headers);
  const url = new URL(req.url);
  if (url.searchParams.get("action") !== "api") {
    return html(renderAttackerPage(level));
  }

  const reqOrigin = req.headers.get("x-fake-origin") || req.headers.get("origin") || "";
  const TRUSTED = "ordek-store.com";
  let corsHeaders = {};

  if (level === "low") {
    corsHeaders["Access-Control-Allow-Origin"] = reqOrigin || "*"; // yansıtma
    corsHeaders["Access-Control-Allow-Credentials"] = "true";
  } else if (level === "medium") {
    if (reqOrigin.endsWith(TRUSTED)) { // evilordek-store.com ile atlatılır
      corsHeaders["Access-Control-Allow-Origin"] = reqOrigin;
      corsHeaders["Access-Control-Allow-Credentials"] = "true";
    }
  } else if (level === "high") {
    if (reqOrigin === `https://${TRUSTED}`) {
      corsHeaders["Access-Control-Allow-Origin"] = reqOrigin;
      corsHeaders["Access-Control-Allow-Credentials"] = "true";
    }
  }

  if (!corsHeaders["Access-Control-Allow-Origin"]) {
    return jsonResponse({
      corsError: `The 'Access-Control-Allow-Origin' header value is not equal to the supplied origin ('${reqOrigin}'). Origin not allowed.`,
    }, 200);
  }
  return jsonResponse(SENSITIVE_DATA, 200, corsHeaders);
}
