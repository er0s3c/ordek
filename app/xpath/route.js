// XPath Injection HEDEF MAKINESI — kullanıcılar XML'de, giriş XPath ile doğrulanır
// GET /xpath -> form ; POST /xpath (form) -> //user[username='U' and password='P']
import { getLevel } from "@/lib/level";
import { FLAGS } from "@/lib/flags";
import { page, html, esc } from "@/lib/machine-ui";

export const dynamic = "force-dynamic";
const FLAG = FLAGS["xpath-injection"];

async function form(req) {
  try { const f = await req.formData(); return { u: String(f.get("username") || ""), p: String(f.get("password") || "") }; }
  catch { return { u: "", p: "" }; }
}

// XPath tautoloji enjeksiyonu sezgisi (seviyeye göre tırnak filtresi).
function bypasses(u, level) {
  if (level === "high") return false;                    // parametrelendirme → enjeksiyon yok
  if (level === "low")  return /'\s*or\s*'?\s*1\s*'?\s*=\s*'?\s*1/i.test(u) || /'\s*or\s*'[^']*'\s*=\s*'[^']*/i.test(u);
  // medium: tek tırnak filtrelenir → çift tırnaklı tautoloji çalışır
  const s = u.replace(/'/g, "");
  return /"\s*or\s*"?\s*1\s*"?\s*=\s*"?\s*1/i.test(s) || /"\s*or\s*"[^"]*"\s*=\s*"[^"]*/i.test(s);
}

export async function GET(req) {
  const level = getLevel(req.headers);
  const body = `
  <div class="panel"><div class="panel-b col" style="display:flex;flex-direction:column;gap:14px">
    <h2 style="margin:0;font-size:19px">📂 Üye Girişi (XML/XPath)</h2>
    <p class="sub" style="margin:0">Kimlik XPath ile doğrulanır:
      <code>//user[username='<b>U</b>' and password='<b>P</b>']</code><br>
      <b>Hedef:</b> XPath enjeksiyonuyla (<code>' or '1'='1</code>) admin olarak gir.</p>
    <form method="post" class="col" style="gap:10px">
      <div class="input-group"><label>Kullanıcı adı</label><input name="username" value="admin' or '1'='1"></div>
      <div class="input-group"><label>Parola</label><input name="password" value="x"></div>
      <button class="btn primary" type="submit">Giriş</button></form>
  </div></div>`;
  return html(page({ title: "ördek // XPathi", level, subtitle: "xpath-lab", body }));
}

export async function POST(req) {
  const level = getLevel(req.headers);
  const { u, p } = await form(req);
  const query = `//user[username='${u}' and password='${p}']`;
  if (bypasses(u, level)) {
    const banner = `<div class="flag"><span class="ic">⚑</span><div><div class="lbl">XPath bypass — admin kaydı döndü</div><div class="val">${esc(FLAG)}</div></div></div>`;
    const body = `<div class="panel"><div class="panel-b col" style="gap:12px">
      <h2 style="margin:0">✅ Hoş geldin, admin</h2>
      <p class="sub" style="margin:0">Çalışan sorgu: <code>${esc(query)}</code></p>${banner}</div></div>`;
    return html(page({ title: "ördek // XPathi", level, subtitle: "xpath-lab", body }));
  }
  const body = `<div class="panel"><div class="panel-b"><div class="alert">Geçersiz kimlik. Sorgu: <code>${esc(query)}</code></div></div></div>`;
  return html(page({ title: "ördek // XPathi", level, subtitle: "xpath-lab", body }), 401);
}
