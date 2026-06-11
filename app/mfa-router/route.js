// MFA / 2FA Bypass HEDEF MAKINESI
// /mfa-router                 -> login
// /mfa-router?page=otp        -> OTP doğrulama
// /mfa-router?page=dashboard  -> panel (low/medium: state bypass; high: MFA zorunlu)
import { getLevel } from "@/lib/level";
import { FLAGS } from "@/lib/flags";
import { page, cardPage, flagBanner, esc, html } from "@/lib/machine-ui";

export const dynamic = "force-dynamic";
const FLAG = FLAGS["mfa-bypass"];

let STATE = { isLoggedIn: false, isMfaVerified: false, currentOtpCode: null, loginEmail: null };

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8" } });
}
const generateOtp = () => Math.floor(1000 + Math.random() * 9000).toString();

const hintFor = (level, where) => {
  if (level === "low") return where === "login"
    ? `<b>Low:</b> "Giriş Yap" sonrası F12 → <b>Console</b> sekmesinde sızdırılan <code>[DEBUG] MFA Token</code> kodunu gör (veya Network'te <code>action=login</code> yanıtındaki <code>token</code>).`
    : `<b>Low:</b> F12 → <b>Console</b>'da kod görünür; ayrıca login yanıtının <code>token</code> alanında.`;
  if (level === "medium") return `<b>Medium:</b> Yanıtta kod dönmez. Kod girme — adres çubuğunda <code>?page=otp</code> yerine <code>?page=dashboard</code> yazıp Enter'a bas (state bypass).`;
  return `<b>High:</b> Sistem güvenli; gerçek kodu bilmen gerekir, bypass yok.`;
};

function renderLogin(level, errorMsg = null, infoMsg = null) {
  const body = `
    <div class="brand"><img src="/ordek.png" alt="ördek"><div class="t">ördek <span>// secure portal</span></div></div>
    <h2 style="text-align:center;margin:0 0 6px;font-size:19px">Güvenli Giriş</h2>
    <p class="sub" style="text-align:center;margin-bottom:16px">Yönetim paneline erişmek için bilgilerini gir.</p>
    ${errorMsg ? `<div class="alert" style="margin-bottom:14px">🚫 ${esc(errorMsg)}</div>` : ""}
    ${infoMsg ? `<div class="note" style="margin-bottom:14px">ℹ️ ${esc(infoMsg)}</div>` : ""}
    <form onsubmit="event.preventDefault();doLogin();">
      <div class="input-group"><label>E-posta</label><input type="email" id="email" value="admin@ordek.com" required></div>
      <div class="input-group"><label>Parola</label><input type="password" id="password" value="password" required></div>
      <button type="submit" class="btn primary block">Giriş Yap</button>
    </form>
    <div class="note" style="margin-top:16px">${hintFor(level, "login")}</div>
    <script>
      ${level === "low" ? `console.warn("[DEBUG] MFA Token -> ${STATE.currentOtpCode || "bekleniyor"}");` : ""}
      async function doLogin(){
        const email=document.getElementById('email').value,password=document.getElementById('password').value;
        const res=await fetch('/mfa-router?action=login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})});
        const data=await res.json();
        if(data.success) window.location.href=data.redirect; else window.location.href='/mfa-router?page=login&error='+encodeURIComponent(data.error);
      }
    </script>
  `;
  return cardPage({ title: "ördek // Güvenli Giriş", level, cardTitle: "// secure login", body, width: 400 });
}

function renderOtp(level, errorMsg = null) {
  const body = `
    <div style="text-align:center;font-size:44px;margin-bottom:8px">📱</div>
    <h2 style="text-align:center;margin:0 0 6px;font-size:19px">İki Adımlı Doğrulama</h2>
    <p class="sub" style="text-align:center;margin-bottom:16px">${esc(STATE.loginEmail || "")} adresine gönderilen 4 haneli kodu gir.</p>
    ${errorMsg ? `<div class="alert" style="margin-bottom:14px">🚫 ${esc(errorMsg)}</div>` : ""}
    <form onsubmit="event.preventDefault();verifyOtp();">
      <div class="input-group"><input type="text" id="otpcode" placeholder="0000" maxlength="4" style="text-align:center;font-size:22px;letter-spacing:8px;font-weight:700" autocomplete="off" required></div>
      <button type="submit" class="btn primary block">Doğrula</button>
      <button type="button" class="btn block" style="margin-top:10px" onclick="window.location.href='/mfa-router?action=logout'">İptal Et</button>
    </form>
    <div class="note" style="margin-top:16px">${hintFor(level, "otp")}</div>
    <script>
      ${level === "low" ? `console.warn("[DEBUG] MFA Token is -> ${STATE.currentOtpCode}");` : ""}
      async function verifyOtp(){
        const code=document.getElementById('otpcode').value;
        const res=await fetch('/mfa-router?action=verify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code})});
        const data=await res.json();
        if(data.success) window.location.href=data.redirect; else window.location.href='/mfa-router?page=otp&error='+encodeURIComponent(data.error);
      }
    </script>
  `;
  return cardPage({ title: "ördek // 2FA", level, cardTitle: "// two-factor auth", body, width: 400 });
}

function renderDashboard(level) {
  const body = `
    ${flagBanner({ value: FLAG, sub: "MFA mantık hatasından faydalanarak yetkisiz panel erişimi sağladın." })}
    <div class="panel"><div class="panel-b col" style="display:flex;flex-direction:column;gap:14px">
      <h2 style="margin:0;font-size:19px">🦆 Yönetim Paneli</h2>
      <p class="sub" style="margin:0">Hoş geldin, <b>${esc(STATE.loginEmail || "admin")}</b>. Sisteme tam yetkili giriş yaptın.</p>
      <div class="note"><b>GİZLİ NOT:</b> Bu sayfayı görebiliyorsan MFA aşamasını atladın — flag yukarıda.</div>
      <button class="btn" style="width:auto;align-self:flex-start" onclick="window.location.href='/mfa-router?action=logout'">Çıkış Yap</button>
    </div></div>
  `;
  return page({ title: "ördek // Yönetim Paneli", level, subtitle: "secure portal", body });
}

export async function GET(req) {
  const level = getLevel(req.headers);
  const url = new URL(req.url);
  const action = url.searchParams.get("action");
  const errorMsg = url.searchParams.get("error");
  const pageParam = url.searchParams.get("page") || "login";

  if (action === "logout") {
    STATE = { isLoggedIn: false, isMfaVerified: false, currentOtpCode: null, loginEmail: null };
    return new Response(null, { status: 302, headers: { Location: "/mfa-router?page=login" } });
  }

  if (pageParam === "dashboard") {
    if (!STATE.isLoggedIn) return html(renderLogin(level, "Önce giriş yapmalısın!"));
    if (level === "high" && !STATE.isMfaVerified) return html(renderOtp(level, "GÜVENLİK İHLALİ: MFA tamamlanmadan bu sayfaya erişemezsin!"));
    return html(renderDashboard(level)); // low/medium: yalnızca isLoggedIn yeter → state bypass
  }
  if (pageParam === "otp") return html(renderOtp(level, errorMsg));
  return html(renderLogin(level, errorMsg));
}

export async function POST(req) {
  const level = getLevel(req.headers);
  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  let body = {};
  try { body = await req.json(); } catch { return json({ success: false, error: "Geçersiz JSON!" }, 400); }

  if (action === "login") {
    const { email, password } = body;
    if (email === "admin@ordek.com" && password === "password") {
      STATE.isLoggedIn = true; STATE.isMfaVerified = false; STATE.loginEmail = email; STATE.currentOtpCode = generateOtp();
      if (level === "low") return json({ success: true, redirect: "/mfa-router?page=otp", message: "MFA kodu gönderildi.", token: STATE.currentOtpCode });
      return json({ success: true, redirect: "/mfa-router?page=otp", message: "MFA kodu gönderildi." });
    }
    return json({ success: false, error: "Hatalı e-posta veya parola!" });
  }

  if (action === "verify") {
    const { code } = body;
    if (!STATE.isLoggedIn) return json({ success: false, error: "Önce giriş yapmalısın." });
    if (code && code === STATE.currentOtpCode) { STATE.isMfaVerified = true; return json({ success: true, redirect: "/mfa-router?page=dashboard" }); }
    return json({ success: false, error: "Hatalı 4 haneli kod! Tekrar dene." });
  }
  return json({ success: false, error: "Bilinmeyen işlem." }, 400);
}
