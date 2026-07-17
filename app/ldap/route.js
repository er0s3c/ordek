// LDAP Injection HEDEF MAKINESI — kurumsal giriş (LDAP filtresi)
// GET /ldap -> form ; POST /ldap (form) -> filtre `(&(uid=USER)(userPassword=PASS))`
import { getLevel } from "@/lib/level";
import { FLAGS } from "@/lib/flags";
import { page, html, esc } from "@/lib/machine-ui";

export const dynamic = "force-dynamic";
const FLAG = FLAGS["ldap-injection"];

async function form(req) {
  try { const f = await req.formData(); return { u: String(f.get("username") || ""), p: String(f.get("password") || "") }; }
  catch { return { u: "", p: "" }; }
}

// LDAP enjeksiyon metakarakterleri ile filtre mantığının kırıldığını sezen değerlendirme.
function bypasses(u, level) {
  let s = u;
  if (level === "high") return false;                  // kaçışlanır → enjeksiyon yok
  if (level === "medium") s = s.replace(/\*/g, "");     // yalnız * filtrelenir; )( kalır
  const hasParenInj = /\)\s*\(/.test(s);                // ...)(... → ek koşul/her-zaman-doğru
  const hasWild = level === "low" && s.includes("*");   // low: tek joker de yeter
  return hasParenInj || hasWild;
}

export async function GET(req) {
  const level = getLevel(req.headers);
  const body = `
  <div class="panel"><div class="panel-b col" style="display:flex;flex-direction:column;gap:14px">
    <h2 style="margin:0;font-size:19px">🏢 Kurumsal Giriş (LDAP)</h2>
    <p class="sub" style="margin:0">Kimlik LDAP filtresiyle doğrulanır:
      <code>(&amp;(uid=<b>GİRDİ</b>)(userPassword=...))</code><br>
      <b>Hedef:</b> Filtre enjeksiyonuyla (<code>*</code>, <code>)(</code>) parolayı bilmeden gir.</p>
    <form method="post" class="col" style="gap:10px">
      <div class="input-group"><label>Kullanıcı adı</label><input name="username" value="*)(uid=*))(|(uid=*"></div>
      <div class="input-group"><label>Parola</label><input name="password" value="x"></div>
      <button class="btn primary" type="submit">Giriş</button></form>
  </div></div>`;
  return html(page({ title: "ördek // LDAPi", level, subtitle: "ldap-lab", body }));
}

export async function POST(req) {
  const level = getLevel(req.headers);
  const { u } = await form(req);
  const filter = `(&(uid=${u})(userPassword=***))`;
  if (bypasses(u, level)) {
    const banner = `<div class="flag"><span class="ic">⚑</span><div><div class="lbl">LDAP filtre bypass — admin olarak giriş</div><div class="val">${esc(FLAG)}</div></div></div>`;
    const body = `<div class="panel"><div class="panel-b col" style="gap:12px">
      <h2 style="margin:0">✅ Yönetim Paneli</h2>
      <p class="sub" style="margin:0">Uygulanan filtre: <code>${esc(filter)}</code> → her-zaman-doğru oldu.</p>${banner}</div></div>`;
    return html(page({ title: "ördek // LDAPi", level, subtitle: "ldap-lab", body }));
  }
  const body = `<div class="panel"><div class="panel-b"><div class="alert">Giriş başarısız. Filtre: <code>${esc(filter)}</code></div></div></div>`;
  return html(page({ title: "ördek // LDAPi", level, subtitle: "ldap-lab", body }), 401);
}
