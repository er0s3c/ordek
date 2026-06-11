// OPEN REDIRECT HEDEF MAKINESI — giriş sonrası ?redirect= yönlendirmesi
import { getLevel } from "@/lib/level";
import { FLAGS } from "@/lib/flags";
import { page, cardPage, flagBanner, esc, html } from "@/lib/machine-ui";

export const dynamic = "force-dynamic";
const FLAG = FLAGS["open-redirect"];

function loginForm(level, errorMsg = "") {
  const body = `
    <div class="brand"><img src="/ordek.png" alt="ördek"><div class="t">ördek <span>// login</span></div></div>
    <h2 style="text-align:center;margin:0 0 6px;font-size:19px">Kullanıcı Girişi</h2>
    <p class="sub" style="text-align:center;margin-bottom:16px">Giriş sonrası sistem seni <code>?redirect=</code> değerine yönlendirir.<br><b>Hedef:</b> sistemi kandırıp dış bir bağlantıya (örn. <code>http://evil.com</code>) yönlendirt.</p>
    ${errorMsg ? `<div class="alert" style="margin-bottom:14px">🚫 ${esc(errorMsg)}</div>` : ""}
    <form id="login-form">
      <div class="input-group"><label>Kullanıcı Adı</label><input type="text" id="username" value="admin" required></div>
      <div class="input-group"><label>Şifre</label><input type="password" id="password" value="password123" required></div>
      <div class="input-group"><label>Yönlendirilecek URL (?redirect=)</label><input type="text" id="redirect-url" value="/dashboard" required></div>
      <button type="submit" class="btn primary block">Giriş Yap</button>
    </form>
    <script>
      document.getElementById('login-form').addEventListener('submit',(e)=>{e.preventDefault();
        const u=document.getElementById('redirect-url').value; window.location.href="/open-redirect?redirect="+encodeURIComponent(u);});
    </script>
  `;
  return cardPage({ title: "ördek // Login", level, cardTitle: "// open-redirect-lab", body, width: 460 });
}

function resultPage(level, target, external) {
  const body = `
    ${external ? flagBanner({ value: FLAG, sub: "Open Redirect: dış bağlantıya yönlendirme sağlandı." }) : ""}
    <div class="panel"><div class="panel-b col" style="display:flex;flex-direction:column;gap:12px;text-align:center">
      <div style="font-size:40px">${external ? "↗️" : "✅"}</div>
      <h2 style="margin:0;font-size:19px">${external ? "Dış Bağlantıya Yönlendirme" : "Yönlendirildin"}</h2>
      <p class="sub" style="margin:0">${external ? "Gerçek uygulamada tarayıcın şu adrese giderdi:" : "Dahili sayfaya yönlendirildin:"}</p>
      <code style="background:var(--bg-inset);border:1px solid var(--line);border-radius:4px;padding:8px 12px;word-break:break-all">${esc(target)}</code>
      <a class="btn" style="align-self:center" href="/open-redirect">← Geri dön</a>
    </div></div>
  `;
  return page({ title: "ördek // Redirect", level, subtitle: "open-redirect-lab", body });
}

export async function GET(req) {
  const level = getLevel(req.headers);
  const url = new URL(req.url);
  if (!url.searchParams.has("redirect")) return html(loginForm(level));

  const target = url.searchParams.get("redirect");
  const isExternal = (t) => {
    try { return new URL(t, "http://localhost:3000").host !== "localhost:3000"; } catch { return false; }
  };

  if (level === "low") {
    return html(resultPage(level, target, isExternal(target))); // ham kullanım
  }
  if (level === "medium") {
    if (!target.includes("ordek-store.com")) return html(loginForm(level, "GÜVENLİK İHLALİ: Hedef URL 'ordek-store.com' içermelidir! (WAF)"));
    return html(resultPage(level, target, isExternal(target))); // //evil.com/ordek-store.com gibi ile bypass
  }
  // high: URL parse + host allowlist
  try {
    const targetObj = new URL(target, "http://localhost:3000");
    if (targetObj.host !== "localhost:3000" && targetObj.host !== "ordek-store.com") {
      return html(loginForm(level, "GÜVENLİK İHLALİ: Dış bağlantılara yönlendirme yasak! Yalnızca dahili yollar."));
    }
    return html(resultPage(level, targetObj.href, false));
  } catch {
    return html(loginForm(level, "Geçersiz URL formatı."));
  }
}
