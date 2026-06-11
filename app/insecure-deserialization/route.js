// INSECURE DESERIALIZATION HEDEF MAKINESI — "Cookie Analiz Aracı"
// GET /insecure-deserialization  -> form
// POST /insecure-deserialization -> base64 token node-serialize ile çözülür (RCE'ye açık)
import serialize from "node-serialize";
import { getLevel } from "@/lib/level";
import { FLAGS } from "@/lib/flags";
import { page, html } from "@/lib/machine-ui";

export const dynamic = "force-dynamic";
const FLAG = FLAGS["insecure-deserialization"];

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });
}

const SAMPLE = "eyAidXNlcm5hbWUiOiAiZ3Vlc3QiLCAiaXNBZG1pbiI6IGZhbHNlIH0=";

const HEAD = `<script>
  document.addEventListener('submit', async (e) => {
    if(e.target.id !== 'deser-form') return; e.preventDefault();
    const cookieData=document.getElementById('cookie-data').value;
    const box=document.getElementById('result-box'),c=document.getElementById('result-content');
    box.style.display='block'; c.className=''; c.textContent='Çözümleniyor…';
    try{
      const res=await fetch('/insecure-deserialization',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:cookieData})});
      const data=await res.json();
      if(data.error){ c.className='err'; c.textContent=data.error; }
      else { c.className='leak'; c.textContent=(data.flag?('FLAG: '+data.flag+'\\n\\n'):'')+JSON.stringify(data.session,null,2); }
    }catch(err){ c.className='err'; c.textContent=err.message; }
  });
</script>`;

export async function GET(req) {
  const level = getLevel(req.headers);
  const body = `
    <div class="panel"><div class="panel-b col" style="display:flex;flex-direction:column;gap:14px">
      <h2 style="margin:0;font-size:19px">🍪 Cookie Analiz Aracı</h2>
      <p class="sub" style="margin:0">Oturum çerezini (base64) çözümleyip ekrana yansıtır.<br>
        <b>Örnek:</b> <code>${SAMPLE}</code><br>
        Bypass: node-serialize fonksiyon çalıştırma zafiyeti (<code>_$$ND_FUNC$$_</code>).</p>
      <form id="deser-form"><div class="input-group"><label>Base64 Cookie Verisi</label><textarea id="cookie-data" required style="min-height:120px">${SAMPLE}</textarea></div>
        <button type="submit" class="btn primary">Çözümle (Deserialize)</button></form>
      <div class="console" id="result-box" style="display:none"><div class="dim" id="result-status">Oturum Bilgisi</div><div id="result-content" class="leak"></div></div>
    </div></div>
  `;
  return html(page({ title: "ördek // Deserialization", level, subtitle: "deserialization-lab", body, head: HEAD }));
}

export async function POST(req) {
  const level = getLevel(req.headers);
  try {
    const { token } = await req.json();
    if (!token) return json({ error: "Token eksik" }, 400);

    let decodedString = "";
    try { decodedString = Buffer.from(token, "base64").toString("utf-8"); }
    catch { return json({ error: "Geçersiz Base64 verisi." }, 400); }

    try {
      let sessionObj = {};
      if (level === "low") {
        sessionObj = serialize.unserialize(decodedString);
        if (sessionObj.cmd_output) return json({ session: sessionObj, flag: FLAG });
      } else if (level === "medium") {
        if (decodedString.includes("_$$ND_FUNC$$_") || decodedString.includes("child_process") || decodedString.includes("exec")) {
          return json({ error: "GÜVENLİK İHLALİ: Zararlı deserialization paterni tespit edildi! (WAF)" }, 403);
        }
        sessionObj = serialize.unserialize(decodedString);
        if (sessionObj.cmd_output) return json({ session: sessionObj, flag: FLAG });
      } else { // high: yalnızca JSON.parse
        sessionObj = JSON.parse(decodedString);
      }
      return json({ session: sessionObj });
    } catch (parseError) {
      return json({ error: "Deserialization Error: " + parseError.message }, 500);
    }
  } catch {
    return json({ error: "Invalid Request" }, 400);
  }
}
