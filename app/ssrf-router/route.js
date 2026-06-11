// SSRF HEDEF MAKINESI — "Web Sitesi Önizleme" aracı
// GET /ssrf-router  -> form
// POST /ssrf-router -> sunucu verilen URL'i (mock) fetch eder; iç servis/metadata sızar
import { getLevel } from "@/lib/level";
import { FLAGS } from "@/lib/flags";
import { page, esc, html } from "@/lib/machine-ui";

export const dynamic = "force-dynamic";
const FLAG = FLAGS["ssrf"];

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });
}

// Lab güvenliği için gerçek dış istek atmaz; iç servis/metadata yanıtlarını simüle eder.
async function simulateFetch(urlString) {
  try {
    const parsed = new URL(urlString);
    const host = parsed.hostname.toLowerCase();
    const port = parsed.port;
    const path = parsed.pathname;

    const localhostVariations = ["localhost", "127.0.0.1", "2130706433", "0x7f000001", "localtest.me", "127.0.0.1.nip.io"];
    if (localhostVariations.includes(host)) {
      if (port === "8080" && path.startsWith("/admin")) {
        return { status: 200, data: JSON.stringify({ service: "Internal Admin Panel", status: "Authenticated via Localhost Trust", flag: FLAG, secret_data: "Bu veriye sadece sunucunun kendisi (localhost) erişebilir!" }, null, 2) };
      }
      return { status: 404, data: "404 Not Found (Internal): bilinmeyen iç servis portu/yolu." };
    }
    if (host === "169.254.169.254") {
      if (path.includes("/meta-data")) {
        return { status: 200, data: JSON.stringify({ "iam/security-credentials/admin": { AccessKeyId: "AKIAIOSFODNN7EXAMPLE", SecretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY", Token: FLAG } }, null, 2) };
      }
      return { status: 200, data: "ami-id\ninstance-id\niam/\nmeta-data/" };
    }
    return { status: 200, data: `Web sitesi önizlemesi — bağlantı başarılı: ${host}\n(Not: lab güvenliği gereği dış sitelere gerçek istek atılmaz, bu mock yanıttır.)` };
  } catch (err) {
    return { status: 400, data: "Error fetching URL: " + err.message };
  }
}

const HEAD = `<script>
  document.addEventListener('submit', async (e) => {
    if(e.target.id !== 'ssrf-form') return; e.preventDefault();
    const url=document.getElementById('url').value;
    const box=document.getElementById('result-box'), st=document.getElementById('result-status'), c=document.getElementById('result-content');
    box.style.display='block'; st.textContent='İSTEK ATILIYOR…'; c.textContent='Yükleniyor…';
    try{
      const res=await fetch('/ssrf-router',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url})});
      const data=await res.json();
      if(data.error){ st.className='err'; st.textContent='HATA'; c.className=''; c.textContent=data.error; }
      else { st.className='dim'; st.textContent='HTTP '+data.status; c.className='leak'; c.textContent=data.data; }
    }catch(err){ st.className='err'; st.textContent='SİSTEM HATASI'; c.textContent=err.message; }
  });
</script>`;

export async function GET(req) {
  const level = getLevel(req.headers);
  const body = `
    <div class="panel"><div class="panel-b col" style="display:flex;flex-direction:column;gap:14px">
      <h2 style="margin:0;font-size:19px">🌐 Web Sitesi Önizleme Aracı</h2>
      <p class="sub" style="margin:0">Girdiğin URL'deki içerik sunucu tarafında (server-side) getirilip gösterilir.<br>
        <b>Hedef:</b> İç ağdaki admin paneline (<code>http://localhost:8080/admin</code>) veya cloud metadata'ya (<code>http://169.254.169.254/latest/meta-data/</code>) eriş.</p>
      <form id="ssrf-form">
        <div class="input-group"><label>URL Girin</label><input type="text" id="url" placeholder="http://example.com" value="http://example.com" required></div>
        <button type="submit" class="btn primary">İçeriği Getir</button>
      </form>
      <div class="console" id="result-box" style="display:none"><div class="dim" id="result-status"></div><div id="result-content"></div></div>
    </div></div>
  `;
  return html(page({ title: "ördek // Web Önizleme (SSRF)", level, subtitle: "ssrf-lab", body, head: HEAD }));
}

export async function POST(req) {
  const level = getLevel(req.headers);
  try {
    const body = await req.json();
    const targetUrl = body.url;
    if (!targetUrl) return json({ error: "URL is required" }, 400);

    if (level === "medium") {
      const blacklist = ["localhost", "127.0.0.1", "169.254.169.254"];
      const lower = targetUrl.toLowerCase();
      if (blacklist.some((ip) => lower.includes(ip))) {
        return json({ error: "GÜVENLİK İHLALİ: İç ağ/metadata IP'lerine erişim yasak! (blacklist)" }, 403);
      }
    } else if (level === "high") {
      // startsWith whitelist (bypass: http://api.ordek-store.com@127.0.0.1:8080)
      if (!targetUrl.startsWith("http://api.ordek-store.com")) {
        return json({ error: "GÜVENLİK İHLALİ: Sadece 'http://api.ordek-store.com' domainine istek atılabilir! (whitelist)" }, 403);
      }
    }

    const result = await simulateFetch(targetUrl);
    return json({ status: result.status, data: result.data });
  } catch (err) {
    return json({ error: "Invalid Request: " + err.message }, 400);
  }
}
