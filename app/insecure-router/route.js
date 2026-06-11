// INSECURE RANDOMNESS HEDEF MAKINESI — "Parola Sıfırlama" portalı
// /insecure-router?page=reset|verify|outbox|success
import crypto from "crypto";
import { getLevel } from "@/lib/level";
import { FLAGS } from "@/lib/flags";
import { page, flagBanner, esc, html } from "@/lib/machine-ui";

export const dynamic = "force-dynamic";
const FLAG = FLAGS["insecure-randomness"];

let STATE = { tokens: {}, outbox: [], counter: 1000, adminPassword: "admin_super_secret", adminHacked: false };

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8" } });
}

function generateToken(level) {
  if (level === "low") { STATE.counter += 1; return STATE.counter.toString(); } // ardışık sayaç
  if (level === "medium") { const now = Math.floor(Date.now() / 1000); return ((now * 3 + 142) % 100000).toString().padStart(5, "0"); } // zaman tabanlı
  return crypto.randomBytes(4).toString("hex"); // high: güvenli
}

const hintFor = (level) =>
  level === "low" ? `<b>Low:</b> Token basit bir global sayaç. Kendine kod iste, Giden Kutusu'ndan oku; sonra admin'e kod iste ve bir sonraki sayıyı tahmin ederek Doğrula sekmesinde admin parolasını değiştir.`
  : level === "medium" ? `<b>Medium:</b> Token o anki saniyeye dayalı. Kendine kod isteyip paterni çöz, hızlı davranarak admin'in token'ını tahmin et.`
  : `<b>High:</b> Kriptografik rastgele baytlar — tahmin imkânsız.`;

function subnav(active) {
  const link = (p, label) => `<a href="/insecure-router?page=${p}" class="tag" style="cursor:pointer;${active === p ? "color:var(--green-bright);border-color:var(--green-deep)" : ""}">${label}</a>`;
  return `<div style="display:flex;gap:8px;flex-wrap:wrap">${link("reset", "Sıfırla")} ${link("verify", "Doğrula")} ${link("outbox", `Giden Kutusu (${STATE.outbox.length})`)}</div>`;
}

function renderPage(level, pageName, errorMsg = null) {
  let content = "";
  if (pageName === "reset") {
    content = `
      <div class="panel"><div class="panel-b col" style="display:flex;flex-direction:column;gap:14px">
        <div style="text-align:center;font-size:38px">🔑</div>
        <h2 style="margin:0;text-align:center;font-size:19px">Parolamı Unuttum</h2>
        <p class="sub" style="margin:0;text-align:center">Sıfırlamak istediğin hesabın e-postasını seç; kod mail adresine gönderilir.</p>
        ${errorMsg ? `<div class="alert">🚫 ${esc(errorMsg)}</div>` : ""}
        <div id="success-msg" class="note" style="display:none;border-left-color:var(--green);color:var(--green-bright)"></div>
        <form onsubmit="event.preventDefault();requestReset();">
          <div class="input-group"><label>E-posta</label>
            <select id="email" required>
              <option value="hacker@ordek.com">hacker@ordek.com (Benim Hesabım)</option>
              <option value="admin@ordek.com">admin@ordek.com (Hedef)</option>
            </select></div>
          <button type="submit" class="btn primary block">Sıfırlama Kodu Gönder</button>
        </form>
        <div class="note">${hintFor(level)}</div>
      </div></div>
      <script>
        async function requestReset(){
          const email=document.getElementById('email').value;
          const res=await fetch('/insecure-router?action=reset',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email})});
          const data=await res.json();
          if(data.success){ if(email==="hacker@ordek.com"){ window.location.href='/insecure-router?page=outbox'; } else { const m=document.getElementById('success-msg'); m.style.display='block'; m.innerText='✅ admin@ordek.com adresine kod gönderildi.'; } }
          else window.location.href='/insecure-router?page=reset&error='+encodeURIComponent(data.error);
        }
      </script>`;
  } else if (pageName === "verify") {
    content = `
      <div class="panel"><div class="panel-b col" style="display:flex;flex-direction:column;gap:14px">
        <div style="text-align:center;font-size:38px">🔐</div>
        <h2 style="margin:0;text-align:center;font-size:19px">Parola Doğrulama</h2>
        <p class="sub" style="margin:0;text-align:center">Maile gelen kodu ve yeni parolanı gir.</p>
        ${errorMsg ? `<div class="alert">🚫 ${esc(errorMsg)}</div>` : ""}
        <form onsubmit="event.preventDefault();verifyReset();">
          <div class="input-group"><label>Hesap (E-posta)</label>
            <select id="email" required><option value="hacker@ordek.com">hacker@ordek.com</option><option value="admin@ordek.com">admin@ordek.com</option></select></div>
          <div class="input-group"><label>Sıfırlama Kodu (Token)</label><input type="text" id="token" placeholder="Örn: 1042 veya a1b2c3" required autocomplete="off"></div>
          <div class="input-group"><label>Yeni Parola</label><input type="password" id="new_password" placeholder="Yeni parolan" required></div>
          <button type="submit" class="btn primary block">Parolayı Değiştir</button>
        </form>
      </div></div>
      <script>
        async function verifyReset(){
          const email=document.getElementById('email').value,token=document.getElementById('token').value,new_password=document.getElementById('new_password').value;
          const res=await fetch('/insecure-router?action=verify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,token,new_password})});
          const data=await res.json();
          if(data.success && data.admin_hacked) window.location.href='/insecure-router?page=success';
          else if(data.success) window.location.href='/insecure-router?page=reset';
          else window.location.href='/insecure-router?page=verify&error='+encodeURIComponent(data.error);
        }
      </script>`;
  } else if (pageName === "outbox") {
    content = `
      <div class="panel"><div class="panel-b col" style="display:flex;flex-direction:column;gap:12px">
        <h2 style="margin:0;font-size:19px">📥 Giden Kutusu (sahte mail sunucusu)</h2>
        <p class="sub" style="margin:0">Sana (hacker@ordek.com) gönderilen mailler burada loglanır. Admin'in mailleri gösterilmez.</p>
        <div style="max-height:420px;overflow-y:auto;display:flex;flex-direction:column;gap:10px">
          ${STATE.outbox.length === 0 ? '<div class="note" style="text-align:center">Hiç mail yok.</div>' : ""}
          ${STATE.outbox.slice().reverse().map((m) => `
            <div class="note" style="border-left-color:var(--green)">
              <div style="display:flex;justify-content:space-between;font-family:var(--font-mono);font-size:12px;color:var(--ink-faint);margin-bottom:6px"><span>Alıcı: <b style="color:var(--ink)">${esc(m.to)}</b></span><span>${esc(m.time)}</span></div>
              <div style="font-family:var(--font-mono);color:var(--green);font-size:12px;margin-bottom:6px">Konu: ${esc(m.subject)}</div>${m.body}</div>`).join("")}
        </div>
        <button class="btn" style="align-self:flex-start" onclick="fetch('/insecure-router?action=clear_outbox',{method:'POST'}).then(()=>window.location.reload())">Kutuyu Temizle</button>
      </div></div>`;
  } else if (pageName === "success") {
    content = `
      ${flagBanner({ value: FLAG, sub: "Zayıf rastgelelik (insecure randomness) ile admin token'ını tahmin edip parolayı ele geçirdin." })}
      <div class="panel"><div class="panel-b col" style="display:flex;flex-direction:column;gap:12px;text-align:center">
        <div style="font-size:44px">✅</div>
        <h2 style="margin:0;font-size:19px">İşlem Başarılı</h2>
        <p class="sub" style="margin:0">Admin parolası başarıyla değiştirildi.</p>
        <button class="btn primary" style="align-self:center" onclick="window.location.href='/insecure-router?page=reset'">Geri Dön</button>
      </div></div>`;
  }

  const body = `${subnav(pageName)}${content}`;
  return page({ title: "ördek // Parola Sıfırlama", level, subtitle: "labs", body });
}

export async function GET(req) {
  const level = getLevel(req.headers);
  const url = new URL(req.url);
  const pageName = url.searchParams.get("page") || "reset";
  const errorMsg = url.searchParams.get("error");
  // Flag yalnızca admin parolası gerçekten ele geçirildiyse gösterilir (doğrudan ?page=success ile sızdırılamaz).
  if (pageName === "success" && !STATE.adminHacked) {
    return new Response(null, { status: 302, headers: { Location: "/insecure-router?page=reset&error=" + encodeURIComponent("Önce admin'in token'ını tahmin edip parolasını değiştirmelisin.") } });
  }
  return html(renderPage(level, pageName, errorMsg));
}

export async function POST(req) {
  const level = getLevel(req.headers);
  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  let body = {};
  if (action !== "clear_outbox") {
    try { body = await req.json(); } catch { return json({ success: false, error: "Geçersiz JSON" }, 400); }
  }

  if (action === "reset") {
    const { email } = body;
    if (email !== "hacker@ordek.com" && email !== "admin@ordek.com") return json({ success: false, error: "Bilinmeyen e-posta adresi." });
    const token = generateToken(level);
    STATE.tokens[email] = token;
    if (email === "hacker@ordek.com") {
      STATE.outbox.push({ to: email, subject: "Parola Sıfırlama Kodunuz", time: new Date().toLocaleTimeString("tr-TR"),
        body: `Hesabın için sıfırlama talebi alındı.<br><br>Kodun: <b style="font-size:16px;background:var(--bg-2);padding:2px 6px;border-radius:4px;border:1px solid var(--line);color:var(--green-bright)">${token}</b>` });
    }
    return json({ success: true });
  }

  if (action === "verify") {
    const { email, token, new_password } = body;
    if (!STATE.tokens[email]) return json({ success: false, error: "Bu hesap için aktif sıfırlama talebi yok." });
    if (STATE.tokens[email] !== token) return json({ success: false, error: "Hatalı sıfırlama kodu!" });
    delete STATE.tokens[email];
    if (email === "admin@ordek.com") { STATE.adminPassword = new_password; STATE.adminHacked = true; return json({ success: true, admin_hacked: true }); }
    return json({ success: true });
  }

  if (action === "clear_outbox") { STATE.outbox = []; return json({ success: true }); }
  return json({ success: false, error: "Bilinmeyen işlem." }, 400);
}
