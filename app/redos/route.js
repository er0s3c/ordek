// ReDoS (Catastrophic Backtracking) HEDEF MAKINESI — "Kullanıcı Adı Doğrulama"
import { getLevel } from "@/lib/level";
import { FLAGS } from "@/lib/flags";
import { page, html } from "@/lib/machine-ui";

export const dynamic = "force-dynamic";
const FLAG = FLAGS["redos"];
const VULNERABLE_REGEX = /^(([a-zA-Z0-9])+)+$/;
const SAFE_REGEX = /^[a-zA-Z0-9]+$/;

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });
}

const HEAD = `<script>
  document.addEventListener('submit', async (e) => {
    if(e.target.id !== 'check-form') return; e.preventDefault();
    const username=document.getElementById('username').value;
    const box=document.getElementById('result-box'),c=document.getElementById('result-content'),timerEl=document.getElementById('timer'),btn=document.getElementById('submit-btn');
    box.style.display='block'; c.className=''; c.textContent='Kontrol ediliyor…'; btn.disabled=true; timerEl.textContent='Süre: ölçülüyor…';
    const t0=performance.now();
    try{
      const res=await fetch('/redos',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username})});
      const data=await res.json(); const dur=Math.round(performance.now()-t0); timerEl.textContent='Süre: '+dur+' ms';
      if(data.error){ c.className='err'; c.textContent=data.error;
        if(dur>5000 && data.timeout_flag) c.textContent+='\\n\\n[!] MÜKEMMEL! Sunucu 5 sn'+'+ kilitlendi.\\nFLAG: '+data.timeout_flag;
      } else { c.className='leak'; c.textContent=data.message; }
    }catch(err){ c.className='err'; c.textContent='Hata (veya timeout): '+err.message; timerEl.textContent='Süre: '+Math.round(performance.now()-t0)+' ms'; }
    btn.disabled=false;
  });
</script>`;

export async function GET(req) {
  const level = getLevel(req.headers);
  const body = `
    <div class="panel"><div class="panel-b col" style="display:flex;flex-direction:column;gap:14px">
      <h2 style="margin:0;font-size:19px;text-align:center">Kullanıcı Adı Doğrulama</h2>
      <p class="sub" style="margin:0;text-align:center">Kullanıcı adı yalnızca harf ve rakamdan oluşmalı.<br>
        <b>Hedef:</b> Sunucudaki regex'i kilitleyerek (catastrophic backtracking) yanıtı 5 sn üzerine çıkar.<br>
        <i>İpucu: yalnızca eşleşmeyen karakterin konumunu düşün.</i></p>
      <form id="check-form"><div class="input-group"><label>Kullanıcı Adı</label><input type="text" id="username" value="ordek123" required></div>
        <button type="submit" class="btn primary block" id="submit-btn">Doğrula</button></form>
      <div class="console" id="result-box" style="display:none"><div class="dim">Sistem Yanıtı</div><div id="result-content"></div><div class="dim" id="timer" style="text-align:right;margin-top:8px">Süre: 0 ms</div></div>
    </div></div>
  `;
  return html(page({ title: "ördek // ReDoS", level, subtitle: "redos-lab", body, head: HEAD }));
}

export async function POST(req) {
  const level = getLevel(req.headers);
  try {
    const { username } = await req.json();
    if (!username) return json({ error: "Kullanıcı adı gerekli" }, 400);

    if (level === "medium" && username.length > 50) {
      return json({ error: "GÜVENLİK İHLALİ: Uzunluk limiti aşıldı! Maksimum 50 karakter." }, 400);
    }
    if (level === "high") {
      if (username.length > 30) return json({ error: "Çok uzun isim." }, 400);
      return SAFE_REGEX.test(username) ? json({ message: "Geçerli kullanıcı adı." }) : json({ error: "Geçersiz karakter." }, 400);
    }

    const startTime = Date.now();
    let isMatch = false, didTimeout = false;
    try {
      if (username.length > 40 && username.match(/[^a-zA-Z0-9]/)) {
        await new Promise((r) => setTimeout(r, 5500)); // gerçek kilitlenme yerine simülasyon
        didTimeout = true;
      } else {
        isMatch = VULNERABLE_REGEX.test(username);
      }
    } catch { didTimeout = true; }

    if (didTimeout || Date.now() - startTime > 5000) {
      return json({ error: "Request Timeout (CPU %100).", timeout_flag: FLAG }, 503);
    }
    return isMatch ? json({ message: "Geçerli kullanıcı adı." }) : json({ error: "Sadece harf ve rakam izinli." }, 400);
  } catch {
    return json({ error: "Invalid Request" }, 400);
  }
}
