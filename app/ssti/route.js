// SSTI (EJS) HEDEF MAKINESI — "Hakkımda" profil önizleme
// GET /ssti          -> form
// POST /ssti?render=1 -> bio EJS ile render edilir (SSTI'ye açık)
import ejs from "ejs";
import { getLevel } from "@/lib/level";
import { FLAGS } from "@/lib/flags";
import { page, html } from "@/lib/machine-ui";

export const dynamic = "force-dynamic";
const FLAG = FLAGS["ssti"];

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });
}

const HEAD = `<script>
  document.addEventListener('submit', async (e) => {
    if(e.target.id !== 'ssti-form') return; e.preventDefault();
    const bio=document.getElementById('bio').value;
    const box=document.getElementById('result-box'),c=document.getElementById('result-content');
    box.style.display='block'; c.className=''; c.textContent='Yükleniyor…';
    try{
      const res=await fetch('/ssti?render=1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({bio})});
      const data=await res.json();
      if(data.error){ c.className='err'; c.textContent=data.error; }
      else { c.className='leak'; c.innerHTML=data.rendered; }
    }catch(err){ c.className='err'; c.textContent=err.message; }
  });
</script>`;

export async function GET(req) {
  const level = getLevel(req.headers);
  const body = `
    <div class="panel"><div class="panel-b col" style="display:flex;flex-direction:column;gap:14px">
      <h2 style="margin:0;font-size:19px">📝 Profil (EJS Render)</h2>
      <p class="sub" style="margin:0">Hakkında bir şeyler yaz; sistem bunu EJS template motoruyla işleyip gösterir.<br>
        <b>Hedef:</b> Sunucuda <code>id</code> çalıştır veya gizli flag'i oku (SSTI).</p>
      <form id="ssti-form"><div class="input-group"><label>Biyografi (EJS destekli)</label><textarea id="bio" required style="min-height:120px">Merhaba, ben bir ördeğim. <%= 7 * 7 %> yaşındayım.</textarea></div>
        <button type="submit" class="btn primary">Profili Önizle</button></form>
      <div class="console" id="result-box" style="display:none"><div class="dim" id="result-status">Render Edilen Çıktı</div><div id="result-content" class="leak"></div></div>
    </div></div>
  `;
  return html(page({ title: "ördek // SSTI", level, subtitle: "ssti-lab", body, head: HEAD }));
}

export async function POST(req) {
  const level = getLevel(req.headers);
  try {
    const { bio } = await req.json();
    if (!bio) return json({ error: "Bio cannot be empty" }, 400);
    try {
      let rendered = "";
      if (level === "low") {
        rendered = ejs.render(`<h2>Profil</h2><p>${bio}</p>`, { flag: FLAG });
      } else if (level === "medium") {
        if (bio.includes("require") || bio.includes("process")) {
          return json({ error: "GÜVENLİK İHLALİ: 'require' veya 'process' engellendi! (WAF)" }, 403);
        }
        rendered = ejs.render(`<h2>Profil</h2><p>${bio}</p>`, { flag: FLAG });
      } else { // high: girdi yalnızca veri
        rendered = ejs.render(`<h2>Profil</h2><p><%= userBio %></p>`, { userBio: bio });
      }
      return json({ rendered });
    } catch (ejsError) {
      return json({ error: "EJS Render Error: " + ejsError.message }, 500);
    }
  } catch {
    return json({ error: "Invalid Request" }, 400);
  }
}
