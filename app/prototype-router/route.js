// PROTOTYPE POLLUTION HEDEF MAKINESI — "Profil Ayarları (gelişmiş mod)"
// GET /prototype-router  -> JSON ayar formu
// POST /prototype-router -> güvensiz merge → Object.prototype kirlenir
import { getLevel } from "@/lib/level";
import { FLAGS } from "@/lib/flags";
import { page, html } from "@/lib/machine-ui";

export const dynamic = "force-dynamic";
const FLAG = FLAGS["prototype-pollution"];

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });
}

function merge(target, source, level) {
  for (let key in source) {
    if (!Object.prototype.hasOwnProperty.call(source, key)) continue;
    if (level === "medium" && key === "__proto__") continue;
    if (level === "high" && (key === "__proto__" || key === "constructor")) continue;
    if (typeof source[key] === "object" && source[key] !== null) {
      if (!target[key] || (typeof target[key] !== "object" && typeof target[key] !== "function")) target[key] = {};
      merge(target[key], source[key], level);
    } else target[key] = source[key];
  }
  return target;
}

// Paylaşılan panel sürecini kalıcı kirletmemek için: demo'dan sonra Object.prototype'a
// sızmış anahtarları temizle. (İzole docker hedefinde gerekmez ama panelde DoS'u önler.)
function cleanupProto(input) {
  const keys = new Set(["isAdmin", "env", "NODE_OPTIONS", "shell", "polluted"]);
  try { for (const k of Object.keys((input && input.__proto__) || {})) keys.add(k); } catch {}
  try { for (const k of Object.keys((input && input.constructor && input.constructor.prototype) || {})) keys.add(k); } catch {}
  for (const k of keys) { try { delete Object.prototype[k]; } catch {} }
}

const DEFAULT_JSON = `{
  "theme": "dark",
  "notifications": { "email": true, "sms": false }
}`;

const HEAD = `<script>
  document.addEventListener('submit', async (e) => {
    if(e.target.id !== 'proto-form') return; e.preventDefault();
    const s=document.getElementById('settings-json').value;
    const box=document.getElementById('result-box'),st=document.getElementById('result-status'),c=document.getElementById('result-content');
    box.style.display='block'; c.textContent='Uygulanıyor…';
    try{
      try{ JSON.parse(s); }catch(_){ throw new Error('Geçersiz JSON formatı!'); }
      const res=await fetch('/prototype-router',{method:'POST',headers:{'Content-Type':'application/json'},body:s});
      const data=await res.json();
      if(data.error){ st.className='err'; st.textContent='HATA'; c.className=''; c.textContent=data.error; }
      else { st.className='dim'; st.textContent='BAŞARILI'; c.className='leak'; c.textContent=JSON.stringify(data,null,2); }
    }catch(err){ st.className='err'; st.textContent='SİSTEM HATASI'; c.textContent=err.message; }
  });
</script>`;

export async function GET(req) {
  const level = getLevel(req.headers);
  const body = `
    <div class="panel"><div class="panel-b col" style="display:flex;flex-direction:column;gap:14px">
      <h2 style="margin:0;font-size:19px">⚙️ Profil Ayarları (Gelişmiş Mod)</h2>
      <p class="sub" style="margin:0">JSON ayarların varsayılan ayarlarla <b>merge (birleştirme)</b> işlemine sokulur. <b>Hedef:</b> Object.prototype'i kirleterek <code>isAdmin</code> özelliğini <code>true</code> yap.</p>
      <form id="proto-form"><div class="input-group"><label>JSON Ayarları</label><textarea id="settings-json" required style="min-height:150px">${DEFAULT_JSON}</textarea></div>
        <button type="submit" class="btn primary">Ayarları Uygula</button></form>
      <div class="console" id="result-box" style="display:none"><div class="dim" id="result-status">Sistem Yanıtı</div><div id="result-content"></div></div>
    </div></div>
  `;
  return html(page({ title: "ördek // Prototype Pollution", level, subtitle: "protolab", body, head: HEAD }));
}

export async function POST(req) {
  const level = getLevel(req.headers);
  try {
    const userSettingsInput = await req.json();
    function MockObject() {}
    let defaultSettings = new MockObject();
    defaultSettings.theme = "light";
    defaultSettings.language = "tr";
    merge(defaultSettings, userSettingsInput, level);

    let userPrivileges = new MockObject();
    const polluted = userPrivileges.isAdmin === true;
    const settingsSnap = JSON.parse(JSON.stringify(defaultSettings)); // temizlikten önce kopyala
    cleanupProto(userSettingsInput);
    if (polluted) {
      return json({ message: "Ayarlar güncellendi. HACKED!", status: "Admin yetkisi tespit edildi (Prototype Pollution).", flag: FLAG, settings: settingsSnap });
    }
    return json({ message: "Ayarlar başarıyla güncellendi.", status: "Normal Kullanıcı", isAdmin: false, settings: settingsSnap });
  } catch (err) {
    return json({ error: "Invalid Request: " + err.message }, 400);
  }
}
