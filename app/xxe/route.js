// XXE (XML External Entity) HEDEF MAKINESI — fatura içe-aktarma
// GET /xxe  -> form ; POST /xxe -> XML ayrıştırılır (harici varlık çözülür = XXE)
import { getLevel } from "@/lib/level";
import { FLAGS } from "@/lib/flags";
import { page, html, esc } from "@/lib/machine-ui";
import fs from "fs";

export const dynamic = "force-dynamic";
const FLAG = FLAGS["xxe"];
const FLAG_PATH = "/tmp/xxe_flag.txt";
try { fs.writeFileSync(FLAG_PATH, FLAG + "\n"); } catch {}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });
}

// Zafiyetli "ayrıştırıcı": DOCTYPE içindeki SYSTEM "file://..." varlığını çözer (gerçek XXE davranışı).
function resolveEntities(xml) {
  const out = {};
  const re = /<!ENTITY\s+(\w+)\s+SYSTEM\s+["']file:\/\/([^"']+)["']\s*>/gi;
  let m;
  while ((m = re.exec(xml))) {
    const name = m[1], p = m[2];
    try { out[name] = p.endsWith("xxe_flag.txt") ? (FLAG) : fs.readFileSync(p, "utf-8"); }
    catch (e) { out[name] = `[okunamadı: ${p}]`; }
  }
  return out;
}

const HEAD = `<script>
 document.addEventListener('submit', async (e)=>{ if(e.target.id!=='xxe-form')return; e.preventDefault();
  const xml=document.getElementById('xml').value, c=document.getElementById('out');
  c.style.display='block'; c.className='leak'; c.textContent='Ayrıştırılıyor…';
  try{ const r=await fetch('/xxe',{method:'POST',headers:{'Content-Type':'application/xml'},body:xml});
   const d=await r.json(); c.className=d.error?'err':'leak'; c.textContent=d.error||d.parsed; }
  catch(err){ c.className='err'; c.textContent=err.message; } });
</script>`;

export async function GET(req) {
  const level = getLevel(req.headers);
  const sample = `<?xml version="1.0"?>
<invoice>
  <customer>ördek A.Ş.</customer>
  <note>Teşekkürler</note>
</invoice>`;
  const body = `
  <div class="panel"><div class="panel-b col" style="display:flex;flex-direction:column;gap:14px">
    <h2 style="margin:0;font-size:19px">🧾 Fatura İçe-Aktar (XML)</h2>
    <p class="sub" style="margin:0">XML faturanı yapıştır; sistem ayrıştırıp <code>&lt;note&gt;</code> alanını gösterir.<br>
      <b>Hedef:</b> Harici varlık (XXE) ile <code>${FLAG_PATH}</code> dosyasını oku.</p>
    <form id="xxe-form"><div class="input-group"><label>XML</label>
      <textarea id="xml" required style="min-height:160px;font-family:var(--font-mono)">${esc(sample)}</textarea></div>
      <button type="submit" class="btn primary">Faturayı İşle</button></form>
    <div class="console"><div class="dim">Ayrıştırılan Çıktı</div><div id="out" style="display:none"></div></div>
  </div></div>`;
  return html(page({ title: "ördek // XXE", level, subtitle: "xxe-lab", body, head: HEAD }));
}

export async function POST(req) {
  const level = getLevel(req.headers);
  let xml = "";
  try { xml = await req.text(); } catch { return json({ error: "Geçersiz istek" }, 400); }
  if (!xml) return json({ error: "XML boş" }, 400);

  if (level === "high") {
    // Güvenli: harici varlık çözümü kapalı; &x; çözülmez (ham bırakılır).
    const note = (xml.match(/<note>([\s\S]*?)<\/note>/i) || [])[1] || "";
    return json({ parsed: note.replace(/&\w+;/g, "[entity engellendi]") });
  }
  if (level === "medium" && /DOCTYPE/.test(xml)) {
    // Naif WAF: yalnız BÜYÜK harf 'DOCTYPE' arar → `<!doctype` ile atlatılır.
    return json({ error: "GÜVENLİK: 'DOCTYPE' bildirimi engellendi (WAF)" }, 403);
  }
  // low + medium(bypass): varlıkları çöz → XXE
  const ents = resolveEntities(xml);
  let note = (xml.match(/<note>([\s\S]*?)<\/note>/i) || [])[1] || "";
  note = note.replace(/&(\w+);/g, (_, n) => (n in ents ? ents[n] : `&${n};`));
  return json({ parsed: note || "(note alanı boş)" });
}
