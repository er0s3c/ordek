// HOST HEADER POISONING HEDEF MAKINESI — parola sıfırlama linki Host'tan kurulur
import { getLevel } from "@/lib/level";
import { FLAGS } from "@/lib/flags";
import { page, html } from "@/lib/machine-ui";

export const dynamic = "force-dynamic";
const FLAG = FLAGS["host-header-poisoning"];

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });
}

const HEAD = `<script>
  document.addEventListener('submit', async (e) => {
    if(e.target.id !== 'reset-form') return; e.preventDefault();
    const email=document.getElementById('email').value;
    const box=document.getElementById('result-box'),c=document.getElementById('result-content');
    box.style.display='block'; c.className=''; c.textContent='Gönderiliyor…';
    try{
      const res=await fetch('/host-header',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email})});
      const data=await res.json();
      if(data.error){ c.className='err'; c.textContent=data.error; }
      else{ c.textContent=data.emailBody;
        if(data.isPoisoned){ c.className='err'; c.textContent+='\\n\\n[!] HOST ZEHİRLENDİ! FLAG: '+(data.flag||''); }
        else c.className='leak';
      }
    }catch(err){ c.className='err'; c.textContent='Hata: '+err.message; }
  });
</script>`;

export async function GET(req) {
  const level = getLevel(req.headers);
  const body = `
    <div class="panel"><div class="panel-b col" style="display:flex;flex-direction:column;gap:14px">
      <h2 style="margin:0;font-size:19px;text-align:center">Şifremi Unuttum</h2>
      <p class="sub" style="margin:0;text-align:center">E-posta adresini gir; sana bir sıfırlama bağlantısı gönderelim.<br>
        <b>Hedef:</b> Giden e-postadaki linkin alan adını (Host) kendi kontrolündeki bir alan adına çevir. (Tarayıcıdan Host setlenemez — curl/Burp ile <code>Host: evil.com</code>.)</p>
      <form id="reset-form"><div class="input-group"><label>Kayıtlı E-Posta</label><input type="email" id="email" value="admin@ordek-store.com" required></div>
        <button type="submit" class="btn primary block">Sıfırlama Bağlantısı Gönder</button></form>
      <div class="console" id="result-box" style="display:none"><div class="dim">Simüle Edilen Giden E-Posta</div><div id="result-content"></div></div>
    </div></div>
  `;
  return html(page({ title: "ördek // Şifre Sıfırlama", level, subtitle: "host-poisoning-lab", body, head: HEAD }));
}

export async function POST(req) {
  const level = getLevel(req.headers);
  try {
    const { email } = await req.json();
    if (!email) return json({ error: "E-posta gerekli" }, 400);

    let hostHeader = req.headers.get("host") || req.headers.get("x-forwarded-host") || "localhost:3000";
    const SYSTEM_DOMAIN = "localhost:3000";
    const resetToken = "d8e8fca2dc0f896fd7cb4cb0031ba249";
    let isPoisoned = false, resetLink = "";

    if (level === "low") {
      resetLink = `http://${hostHeader}/reset-password?token=${resetToken}`;
      if (hostHeader !== SYSTEM_DOMAIN && !hostHeader.includes("localhost")) isPoisoned = true;
    } else if (level === "medium") {
      if (!hostHeader.includes("localhost") && !hostHeader.includes("ordek-store.com")) {
        return json({ error: "GÜVENLİK İHLALİ: Geçersiz Host Başlığı! (WAF)" }, 403);
      }
      resetLink = `http://${hostHeader}/reset-password?token=${resetToken}`;
      if (hostHeader.includes("evil.com")) isPoisoned = true; // localhost:@evil.com gibi bypass
    } else { // high: sabit domain
      const SAFE_DOMAIN = process.env.DOMAIN || "localhost:3000";
      resetLink = `http://${SAFE_DOMAIN}/reset-password?token=${resetToken}`;
    }

    const emailBody = `Kime: ${email}
Konu: Şifre Sıfırlama Talebi

Merhaba,
Şifrenizi sıfırlamak için aşağıdaki bağlantıya tıklayın:

${resetLink}

Eğer bu talebi siz yapmadıysanız lütfen dikkate almayın.`;

    return json({ emailBody, isPoisoned, flag: isPoisoned ? FLAG : undefined });
  } catch {
    return json({ error: "Invalid Request" }, 400);
  }
}
