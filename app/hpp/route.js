// HTTP Parameter Pollution HEDEF MAKINESI — yetki WAF'ı vs uygulama farklı okur
// GET /hpp?role=...&role=... -> WAF ilk değeri, uygulama son değeri/array'i okur (HPP)
import { getLevel } from "@/lib/level";
import { FLAGS } from "@/lib/flags";
import { page, html, esc } from "@/lib/machine-ui";

export const dynamic = "force-dynamic";
const FLAG = FLAGS["http-parameter-pollution"];

export async function GET(req) {
  const level = getLevel(req.headers);
  const sp = new URL(req.url).searchParams;
  const roles = sp.getAll("role");          // tüm 'role' değerleri (sırayla)
  const arrRole = sp.get("role[]");          // dizi-stili kirletme
  const isProbe = roles.length > 0 || arrRole != null;

  if (isProbe) {
    const first = roles[0] || null, last = roles.length ? roles[roles.length - 1] : null;
    let wafRole, appRole;
    if (level === "low") { wafRole = first; appRole = last; }                          // WAF ilk, uygulama son
    else if (level === "medium") { wafRole = last; appRole = (arrRole != null ? arrRole : last); } // WAF role[]'ü görmez
    else { wafRole = last; appRole = last; }                                           // high: tek kanonik okuma

    // WAF: admin'i engelle
    if (wafRole === "admin") {
      const body = `<div class="panel"><div class="panel-b"><div class="alert">🛡️ WAF: 'admin' rolü engellendi.</div></div></div>`;
      return html(page({ title: "ördek // HPP", level, subtitle: "hpp-lab", body }), 403);
    }
    if (appRole === "admin") {
      const banner = `<div class="flag"><span class="ic">⚑</span><div><div class="lbl">HPP — WAF '${esc(String(wafRole))}' gördü, uygulama 'admin' uyguladı</div><div class="val">${esc(FLAG)}</div></div></div>`;
      const body = `<div class="panel"><div class="panel-b col" style="gap:12px"><h2 style="margin:0">💸 Yönetici İşlemi Onaylandı</h2>${banner}</div></div>`;
      return html(page({ title: "ördek // HPP", level, subtitle: "hpp-lab", body }));
    }
    const body = `<div class="panel"><div class="panel-b"><div class="leak">Rol: ${esc(String(appRole))} — yönetici işlemi reddedildi.</div></div></div>`;
    return html(page({ title: "ördek // HPP", level, subtitle: "hpp-lab", body }));
  }

  const body = `
  <div class="panel"><div class="panel-b col" style="display:flex;flex-direction:column;gap:14px">
    <h2 style="margin:0;font-size:19px">💸 Para Transfer Onayı (HPP)</h2>
    <p class="sub" style="margin:0">Yetki WAF'ı ile uygulama mantığı aynı parametreyi farklı okuyabilir.<br>
      <b>Hedef:</b> <code>role</code> parametresini çoğaltarak (HPP) 'admin' işlemini onaylat.</p>
    <div class="console"><div class="dim">Dene</div>
      <div class="leak">low: <code>/hpp?role=user&amp;role=admin</code><br>medium: <code>/hpp?role=user&amp;role[]=admin</code></div></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <a class="btn" href="/hpp?role=user&role=admin">role=user&role=admin</a>
      <a class="btn" href="/hpp?role=user&role[]=admin">role=user&role[]=admin</a>
      <a class="btn ghost" href="/hpp?role=admin">role=admin (WAF)</a></div>
  </div></div>`;
  return html(page({ title: "ördek // HPP", level, subtitle: "hpp-lab", body }));
}
