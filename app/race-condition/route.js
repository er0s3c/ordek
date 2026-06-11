// RACE CONDITION (TOCTOU) HEDEF MAKINESI — "Cüzdan" tek kullanımlık kupon
import { getLevel } from "@/lib/level";
import { FLAGS } from "@/lib/flags";
import { page, flagBanner, html } from "@/lib/machine-ui";

export const dynamic = "force-dynamic";
const FLAG = FLAGS["race-condition"];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let db = { balance: 0, coupons: { WELCOME100: { used: false, value: 100 } } };

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });
}

const HEAD = `<script>
  async function resetSystem(){ await fetch('/race-condition?reset=1'); window.location.reload(); }
  document.addEventListener('submit', async (e) => {
    if(e.target.id !== 'coupon-form') return; e.preventDefault();
    const coupon=document.getElementById('coupon').value;
    const msg=document.getElementById('msg'),btn=document.getElementById('submit-btn'),balanceEl=document.getElementById('balance'),fb=document.getElementById('mk-flag');
    btn.disabled=true; msg.textContent='İşleniyor…'; msg.className='sub';
    try{
      const res=await fetch('/race-condition',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({coupon})});
      const data=await res.json();
      msg.textContent=data.error||data.message; msg.style.color=data.error?'var(--red-bright)':'var(--green-bright)';
      balanceEl.textContent=data.balance;
      if(data.flag && fb){ var v=fb.querySelector('.val'); if(v) v.textContent=data.flag; fb.classList.remove('hidden'); }
    }catch(err){ msg.textContent='Bağlantı hatası.'; msg.style.color='var(--red-bright)'; }
    btn.disabled=false;
  });
</script>`;

export async function GET(req) {
  const level = getLevel(req.headers);
  const url = new URL(req.url);
  if (url.searchParams.has("reset")) {
    db.balance = 0; db.coupons.WELCOME100.used = false;
    return json({ message: "Sistem sıfırlandı." });
  }
  const body = `
    ${flagBanner({ value: "", sub: "TOCTOU yarışı: tek kullanımlık kupon birden çok kez uygulandı.", hidden: true })}
    <div class="panel"><div class="panel-b col" style="display:flex;flex-direction:column;gap:14px;text-align:center">
      <div class="row" style="display:flex;justify-content:space-between;align-items:center">
        <h2 style="margin:0;font-size:19px">Cüzdanım</h2>
        <button class="btn" style="padding:6px 12px;font-size:12px" onclick="resetSystem()">Sıfırla</button>
      </div>
      <p class="sub" style="margin:0">Sana özel tek kullanımlık 100₺ hediye çeki!<br><b>Hedef:</b> kuponu "aynı anda" birden çok kez kullanarak bakiyeyi 100₺ üzerine çıkar (Race Condition / TOCTOU).</p>
      <div style="font-size:44px;font-weight:700;color:var(--green-bright);font-family:var(--font-mono)"><span id="balance">${db.balance}</span> ₺</div>
      <form id="coupon-form">
        <div class="input-group"><label>Kupon Kodu</label><input type="text" id="coupon" value="WELCOME100" required style="text-align:center;letter-spacing:2px;font-weight:700"></div>
        <button type="submit" class="btn primary block" id="submit-btn">Kuponu Kullan</button>
        <div id="msg" class="sub" style="margin-top:12px"></div>
      </form>
    </div></div>
  `;
  return html(page({ title: "ördek // Cüzdan (Race Condition)", level, subtitle: "race-condition-lab", body, head: HEAD }));
}

export async function POST(req) {
  const level = getLevel(req.headers);
  try {
    const { coupon } = await req.json();
    if (!coupon || !db.coupons[coupon]) return json({ error: "Geçersiz Kupon Kodu.", balance: db.balance }, 400);
    const c = db.coupons[coupon];

    if (level === "low") {
      if (c.used === true) return json({ error: "Bu kupon zaten kullanılmış.", balance: db.balance }, 400);
      await sleep(500); // geniş TOCTOU penceresi
      db.balance += c.value; c.used = true;
    } else if (level === "medium") {
      if (c.used === true) return json({ error: "Bu kupon zaten kullanılmış.", balance: db.balance }, 400);
      await sleep(5); // küçük pencere
      db.balance += c.value; c.used = true;
    } else { // high: önce kilitle, sonra işle (atomik)
      if (c.used === true) return json({ error: "Bu kupon zaten kullanılmış.", balance: db.balance }, 400);
      c.used = true;
      await sleep(500);
      db.balance += c.value;
    }
    return json({ message: "Kupon başarıyla uygulandı! +100₺", balance: db.balance, flag: db.balance > 100 ? FLAG : undefined });
  } catch {
    return json({ error: "Geçersiz İstek", balance: db.balance }, 400);
  }
}
