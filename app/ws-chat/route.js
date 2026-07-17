// WebSocket Message Tampering HEDEF MAKINESI — canlı destek (WS frame HTTP simülasyonu)
// GET /ws-chat -> arayüz ; POST /ws-chat -> tek bir WS "mesajı" işlenir (istemci role'üne güvenir)
import { getLevel } from "@/lib/level";
import { FLAGS } from "@/lib/flags";
import { page, html } from "@/lib/machine-ui";

export const dynamic = "force-dynamic";
const FLAG = FLAGS["websocket-tampering"];

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });
}

const HEAD = `<script>
 async function send(txt){ let m; try{ m=JSON.parse(document.getElementById('msg').value); }catch{ return alert('Geçersiz JSON'); }
  const c=document.getElementById('out'); c.style.display='block';
  const r=await fetch('/ws-chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(m)});
  const d=await r.json(); c.className=JSON.stringify(d).includes('ordek{')?'leak':''; c.textContent=JSON.stringify(d,null,2); }
 window.addEventListener('DOMContentLoaded',()=>document.getElementById('go').addEventListener('click',send));
</script>`;

export async function GET(req) {
  const level = getLevel(req.headers);
  const body = `
  <div class="panel"><div class="panel-b col" style="display:flex;flex-direction:column;gap:14px">
    <h2 style="margin:0;font-size:19px">💬 Canlı Destek (WebSocket)</h2>
    <p class="sub" style="margin:0">İstemci her WS mesajında bir JSON gönderir. Sunucu mesajdaki alanlara göre işlem yapar.<br>
      <b>Hedef:</b> Mesaj gövdesini kurcalayıp admin-only <code>getSecret</code> aksiyonunu çalıştır.</p>
    <div class="input-group"><label>WS mesajı (JSON)</label>
      <textarea id="msg" style="min-height:90px;font-family:var(--font-mono)">{"action":"getSecret","role":"admin"}</textarea></div>
    <button id="go" class="btn primary" type="button">Mesajı Gönder ▶</button>
    <div class="console"><div class="dim">Sunucu yanıtı</div><pre id="out" style="display:none;margin:0"></pre></div>
  </div></div>`;
  return html(page({ title: "ördek // WS", level, subtitle: "ws-chat-lab", body, head: HEAD }));
}

export async function POST(req) {
  const level = getLevel(req.headers);
  let m; try { m = await req.json(); } catch { return json({ error: "Geçersiz mesaj" }, 400); }
  const action = String(m.action || "");

  // Sunucu oturumundan GERÇEK rol (istemci bunu kontrol edemez).
  const sessionRole = "guest";
  let effectiveAdmin;
  if (level === "low") effectiveAdmin = m.role === "admin";                     // istemci role'üne güvenir
  else if (level === "medium") effectiveAdmin = m.role === "admin" || m.isStaff === true; // gizli isStaff bayrağı kontrolsüz
  else effectiveAdmin = sessionRole === "admin";                                // high: yalnız oturum rolü

  if (action === "getSecret") {
    if (effectiveAdmin) return json({ ok: true, secret: FLAG, msg: `admin paneli: ${FLAG}` });
    return json({ ok: false, error: "yetkisiz: bu aksiyon admin ister" }, 403);
  }
  if (action === "send") return json({ ok: true, echo: String(m.text || "") });
  return json({ ok: false, error: "bilinmeyen aksiyon" }, 400);
}
