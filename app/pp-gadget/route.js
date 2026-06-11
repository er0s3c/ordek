// SERVER-SIDE PP → GADGET HEDEF MAKINESI
// 1) POST /pp-gadget          -> prototype'i kirlet
// 2) GET  /pp-gadget?action=trigger -> kirlenen prototype gadget'a sızar (NODE_OPTIONS/shell → RCE)
import { exec } from "child_process";
import util from "util";
import { getLevel } from "@/lib/level";
import { FLAGS } from "@/lib/flags";
import { page, html } from "@/lib/machine-ui";

export const dynamic = "force-dynamic";
const FLAG = FLAGS["server-side-pp-gadget"];
const execPromise = util.promisify(exec);

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

// Gadget durumu global.__PP_GADGET_STATE'te tutulur; Object.prototype kirliliği yalnızca
// merge'in yan etkisidir ve paylaşılan panel sürecini bozar → demo sonrası temizlenir.
function cleanupProto(input) {
  const keys = new Set(["isAdmin", "env", "NODE_OPTIONS", "shell", "polluted"]);
  try { for (const k of Object.keys((input && input.__proto__) || {})) keys.add(k); } catch {}
  try { for (const k of Object.keys((input && input.constructor && input.constructor.prototype) || {})) keys.add(k); } catch {}
  for (const k of keys) { try { delete Object.prototype[k]; } catch {} }
}

const DEFAULT_JSON = `{
  "__proto__": {
    "env": { "NODE_OPTIONS": "--require /tmp/evil.js" }
  }
}`;

const HEAD = `<script>
  document.addEventListener('submit', async (e) => {
    if(e.target.id !== 'proto-form') return; e.preventDefault();
    const s=document.getElementById('settings-json').value;
    const box=document.getElementById('result-box'),st=document.getElementById('result-status'),c=document.getElementById('result-content');
    box.style.display='block'; c.className=''; c.textContent='Kirletiliyor…';
    try{
      try{ JSON.parse(s); }catch(_){ throw new Error('Geçersiz JSON'); }
      const res=await fetch('/pp-gadget',{method:'POST',headers:{'Content-Type':'application/json'},body:s});
      const data=await res.json(); if(data.error) throw new Error(data.error);
      st.className='dim'; st.textContent='ADIM 1 BAŞARILI'; c.textContent='Obje güncellendi. Şimdi gadget\\'ı tetikle.';
    }catch(err){ st.className='err'; st.textContent='HATA'; c.textContent=err.message; }
  });
  document.addEventListener('click', async (e) => {
    if(e.target.id !== 'trigger-gadget') return;
    const box=document.getElementById('result-box'),st=document.getElementById('result-status'),c=document.getElementById('result-content');
    box.style.display='block'; c.className=''; c.textContent='Çalıştırılıyor…';
    try{
      const res=await fetch('/pp-gadget?action=trigger',{method:'GET'}); const data=await res.json();
      if(data.error) throw new Error(data.error);
      if(data.hacked){ st.className='err'; st.textContent='RCE BAŞARILI!'; c.className='err'; }
      else { st.className='dim'; st.textContent='ÇIKTI'; c.className='leak'; }
      c.textContent=data.output || JSON.stringify(data,null,2);
    }catch(err){ st.className='err'; st.textContent='HATA'; c.textContent=err.message; }
  });
</script>`;

export async function GET(req) {
  const level = getLevel(req.headers);
  const url = new URL(req.url);

  if (url.searchParams.get("action") === "trigger") {
    const pollutions = global.__PP_GADGET_STATE || {};
    let options = {};
    if (level === "high") options = Object.create(null);
    else { function MockOptions() {} MockOptions.prototype = pollutions; options = new MockOptions(); }
    try {
      const env = options.env || {};
      const shell = options.shell;
      if (env.NODE_OPTIONS && env.NODE_OPTIONS.includes("--require")) {
        return json({ hacked: true, output: "HACKED! NODE_OPTIONS injected.\nFLAG: " + FLAG + "\nProcess environment poisoned." });
      }
      if (shell && shell.includes("id")) {
        const { stdout } = await execPromise("id", { timeout: 1000 });
        return json({ hacked: true, output: "HACKED! Shell overridden.\nFLAG: " + FLAG + "\nOutput:\n" + stdout });
      }
      const { stdout } = await execPromise("echo system ok", { timeout: 1000 });
      return json({ hacked: false, output: stdout });
    } catch (e) {
      return json({ error: "Execution failed: " + e.message }, 500);
    }
  }

  const body = `
    <div class="panel"><div class="panel-b col" style="display:flex;flex-direction:column;gap:14px">
      <h2 style="margin:0;font-size:19px">🧩 Sistem Durumu Güncelleyici (Gadget RCE)</h2>
      <p class="sub" style="margin:0">1) Arka plan konfigürasyonunu <b>Prototype Pollution</b> ile kirlet (<code>NODE_OPTIONS</code> veya <code>shell</code>).<br>
        2) "Sistem Durumunu Getir" ile arka planda çalışan <code>child_process</code> gadget'ını senin argümanlarınla tetikle.</p>
      <form id="proto-form"><div class="input-group"><label>Konfigürasyon JSON</label><textarea id="settings-json" required style="min-height:120px">${DEFAULT_JSON}</textarea></div>
        <button type="submit" class="btn primary">1. Konfigürasyonu Kirlet</button></form>
    </div></div>
    <div class="panel"><div class="panel-b col" style="display:flex;flex-direction:column;gap:14px">
      <h2 style="margin:0;font-size:19px">🖥️ İç Servis (Gadget)</h2>
      <p class="sub" style="margin:0">Arka planda periyodik çalışan sistem durum aracı.</p>
      <button id="trigger-gadget" class="btn">2. Sistem Durumunu Getir (Tetikle)</button>
      <div class="console" id="result-box" style="display:none"><div class="dim" id="result-status">Sistem Yanıtı</div><div id="result-content"></div></div>
    </div></div>
  `;
  return html(page({ title: "ördek // PP Gadget RCE", level, subtitle: "pp-gadget", body, head: HEAD }));
}

export async function POST(req) {
  const level = getLevel(req.headers);
  try {
    const input = await req.json();
    let pollutedState = level === "high" ? Object.create(null) : {};
    merge(pollutedState, input, level);
    global.__PP_GADGET_STATE = {};
    if (input.__proto__) Object.assign(global.__PP_GADGET_STATE, input.__proto__);
    if (input.constructor && input.constructor.prototype) Object.assign(global.__PP_GADGET_STATE, input.constructor.prototype);
    cleanupProto(input); // Object.prototype'ı temizle (gadget state global'de korunur)
    return json({ message: "Konfigürasyon uygulandı" });
  } catch (err) {
    return json({ error: "Invalid Request: " + err.message }, 400);
  }
}
