// Metasploit Servis Exploit HEDEF MAKINESI — bilinen-CVE zafiyetli "OrdekAdmin 1.0".
// GET  /metasploit-rce  -> servis konsolu (banner + sürüm + sızan varsayılan token)
// POST /metasploit-rce  -> { cmd, token } JSON; exploit modülü mantığı (RCE).
// Seviye: low=kimlik doğrulamasız RCE · medium=zayıf token kontrolü (banner'dan sızan
//         varsayılan token ile atlanır) · high=yamalı (not vulnerable).
import { getLevel } from "@/lib/level";
import { FLAGS } from "@/lib/flags";
import { page, esc, html } from "@/lib/machine-ui";

export const dynamic = "force-dynamic";
const FLAG = FLAGS["metasploit-rce"];
const DEFAULT_TOKEN = "VULNSOFT-DEFAULT";

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });

// Sahte meterpreter/komut çıktısı + flag (low/medium başarılı exploit'te).
function meterpreter(cmd) {
  const fake = {
    id: "uid=0(root) gid=0(root) groups=0(root)",
    whoami: "root",
    "uname -a": "Linux ordek-target 6.1.0-ordek #1 SMP x86_64 GNU/Linux",
    "ls /root": "flag.txt  .ssh  config.bak",
  };
  const res = fake[cmd] || `$ ${cmd}\n(komut hedefte çalıştırıldı)`;
  return [
    "[*] Started reverse handler",
    "[*] Sending stage (ordek/meterpreter) to target...",
    "[+] Exploit completed — Meterpreter session 1 opened",
    "meterpreter > shell",
    res,
    "meterpreter > cat /root/flag.txt",
    FLAG,
  ].join("\n");
}

function render(level) {
  const leak = (level === "low" || level === "medium")
    ? `<!-- mgmt default token: ${DEFAULT_TOKEN} -->`
    : "";
  const patched = level === "high"
    ? `<div class="alert" style="margin-bottom:12px">⚠ Bu sürüm yamalandı (OrdekAdmin 1.0.3): girdi temizleniyor + güçlü yetki. Exploit modülü 'not vulnerable' dönecek.</div>` : "";
  const hint = (level === "medium")
    ? `<p class="sub" style="margin:0 0 10px">Not: yönetim arşivi <code>config.bak</code> sızmış olabilir — sayfa kaynağını (View Source) incele.</p>` : "";

  const body = `${leak}
  <div class="panel"><div class="panel-h">// OrdekAdmin Management Console v1.0</div><div class="panel-b">
    <p class="sub" style="margin:0 0 8px">Servis: <code>OrdekAdmin httpd 1.0</code> · CVE-ORDEK-2024-0001 (yetkisiz komut yürütme).</p>
    <p class="sub" style="margin:0 0 10px">msfconsole: <code>use exploit/ordek/admin_rce</code> → <code>set RHOSTS &lt;host&gt;</code> → <code>set CMD id</code> → <code>run</code></p>
    ${patched}${hint}
    <div class="field" style="margin-bottom:8px"><label>CMD — çalıştırılacak komut</label><input id="ms-cmd" class="input" value="id" autocomplete="off"></div>
    <div class="field" style="margin-bottom:10px"><label>TOKEN — set TOKEN (medium için gerekli)</label><input id="ms-token" class="input" placeholder="(boş)" autocomplete="off"></div>
    <button class="btn primary" type="button" id="ms-run">▸ exploit / run</button>
    <pre id="ms-out" class="out" style="margin-top:12px;display:none;white-space:pre-wrap"></pre>
  </div></div>
  <script>(function(){
    var b=document.getElementById('ms-run'),out=document.getElementById('ms-out');
    function run(){
      var cmd=document.getElementById('ms-cmd').value, token=document.getElementById('ms-token').value;
      b.disabled=true; out.style.display='block'; out.textContent='[*] Started exploit / running...';
      fetch('/metasploit-rce',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({cmd:cmd,token:token})})
        .then(function(r){return r.json();}).then(function(d){ out.textContent=d.output||JSON.stringify(d); })
        .catch(function(e){ out.textContent='hata: '+e.message; }).finally(function(){ b.disabled=false; });
    }
    b.addEventListener('click',run);
  })();</script>`;

  return page({ title: "ördek // Metasploit RCE", level, subtitle: "exploit/ordek/admin_rce", body, accent: "danger" });
}

export async function GET(req) {
  return html(render(getLevel(req.headers)));
}

export async function POST(req) {
  const level = getLevel(req.headers);
  let body = {};
  try { body = await req.json(); } catch {}
  const cmd = String(body.cmd || "").trim();
  const token = String(body.token || "").trim();

  if (!cmd) return json({ ok: false, output: "[-] CMD boş. 'set CMD <komut>' sonra 'run'." });

  if (level === "high") {
    return json({ ok: false, output: "[*] Exploit completed, but the target is not vulnerable (patched).\n[-] No session was created." });
  }
  if (level === "medium" && token !== DEFAULT_TOKEN) {
    return json({ ok: false, output: "[-] 403: management token reddedildi.\n[*] İpucu: 'set TOKEN <token>' — banner/kaynak içinde sızan varsayılan yönetim token'ını dene." });
  }
  // low (veya doğru token'lı medium): yetkisiz RCE başarılı
  return json({ ok: true, output: meterpreter(cmd), flag: FLAG });
}
