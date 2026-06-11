// BUSINESS LOGIC (Fiyat Manipülasyonu) HEDEF MAKINESI — mağaza sepeti
import { getLevel } from "@/lib/level";
import { FLAGS } from "@/lib/flags";
import { page, html } from "@/lib/machine-ui";

export const dynamic = "force-dynamic";
const FLAG = FLAGS["business-logic"];
const PRODUCTS = { ordek_oyuncak: { name: "Peluş Ördek", price: 250 }, ordek_kupa: { name: "Ördek Kupa", price: 80 } };

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });
}

const HEAD = `<style>
  .cart-item{display:flex;justify-content:space-between;align-items:center;background:var(--bg-inset);padding:14px 16px;border:1px solid var(--line);border-radius:6px;margin-bottom:12px}
  .item-name{font-weight:700;margin-bottom:4px}.item-price{color:var(--ink-dim);font-family:var(--font-mono);font-size:13px}
  .qty-input{width:64px;text-align:center;background:var(--bg-0);border:1px solid var(--line);color:var(--ink);padding:6px;border-radius:4px;font-family:var(--font-mono)}
  .checkout-box{margin-top:24px;padding-top:18px;border-top:1px solid var(--line);display:flex;justify-content:space-between;align-items:center}
  .total{font-size:22px;font-weight:700;color:var(--green-bright);font-family:var(--font-mono)}
</style>
<script>
  function updateTotal(){
    const a=parseInt(document.getElementById('qty-oyuncak').value)||0, b=parseInt(document.getElementById('qty-kupa').value)||0;
    window.currentTotal=(a*250)+(b*80); document.getElementById('display-total').textContent=window.currentTotal+' ₺';
  }
  async function checkout(){
    const a=parseInt(document.getElementById('qty-oyuncak').value)||0, b=parseInt(document.getElementById('qty-kupa').value)||0;
    const payload={cart:[{id:"ordek_oyuncak",quantity:a},{id:"ordek_kupa",quantity:b}],totalPrice:window.currentTotal||0};
    const box=document.getElementById('result-box'),c=document.getElementById('result-content');
    box.style.display='block'; c.className=''; c.textContent='İşleniyor…';
    try{
      const res=await fetch('/business-logic',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      const data=await res.json();
      if(data.error){ c.className='err'; c.textContent=data.error; }
      else{
        let txt=data.message+'\\n\\nÇekilen Tutar: '+data.chargedAmount+' ₺';
        if(data.flag){ txt+='\\n\\n[!] HACK BAŞARILI! 100₺ altına Peluş Ördek aldın.\\nFLAG: '+data.flag; c.className='ok'; }
        else c.className='leak';
        c.textContent=txt;
      }
    }catch(err){ c.className='err'; c.textContent='Hata: '+err.message; }
  }
  window.addEventListener('DOMContentLoaded',updateTotal);
</script>`;

export async function GET(req) {
  const level = getLevel(req.headers);
  const body = `
    <div class="panel"><div class="panel-b col" style="display:flex;flex-direction:column;gap:6px">
      <h2 style="margin:0 0 4px;font-size:19px">Alışveriş Sepeti</h2>
      <p class="sub" style="margin:0 0 12px">Peluş Ördek almak istiyorsun ama cüzdanında 100₺ var.<br><b>Hedef:</b> sepet mantığındaki zafiyeti kullanıp toplamı düşür ve ürünleri ucuza kapat.</p>
      <div class="cart-item"><div><div class="item-name">Peluş Ördek</div><div class="item-price">Birim Fiyat: 250 ₺</div></div>
        <input type="number" class="qty-input" id="qty-oyuncak" value="1" min="0" onchange="updateTotal()"></div>
      <div class="cart-item"><div><div class="item-name">Ördek Kupa</div><div class="item-price">Birim Fiyat: 80 ₺</div></div>
        <input type="number" class="qty-input" id="qty-kupa" value="0" min="-10" onchange="updateTotal()"></div>
      <div class="checkout-box"><div><div class="sub" style="font-size:12px">TOPLAM TUTAR</div><div class="total" id="display-total">250 ₺</div></div>
        <button class="btn primary" onclick="checkout()">Satın Al</button></div>
      <div class="console" id="result-box" style="display:none;margin-top:16px"><div class="dim">Sunucu Yanıtı</div><div id="result-content"></div></div>
    </div></div>
  `;
  return html(page({ title: "ördek // Mağaza Sepeti", level, subtitle: "store-checkout", body, head: HEAD }));
}

export async function POST(req) {
  const level = getLevel(req.headers);
  try {
    const { cart, totalPrice } = await req.json();
    if (!cart || !Array.isArray(cart)) return json({ error: "Sepet verisi geçersiz." }, 400);

    // Flag yalnızca gerçek "kazanım" durumunda (250₺'lik Peluş Ördek ≤100₺'ye alındı) sunucudan döner.
    const toyQty = Number((cart.find((i) => i && i.id === "ordek_oyuncak") || {}).quantity || 0);
    const wonFlag = (amt) => (toyQty > 0 && amt <= 100) ? FLAG : undefined;

    let calculatedTotal = 0, hasItems = false;
    if (level === "low") {
      for (const item of cart) if (item.quantity > 0) hasItems = true;
      if (!hasItems) return json({ error: "Sepetiniz boş." }, 400);
      if (totalPrice < 0) return json({ error: "Tutar 0'dan küçük olamaz." }, 400);
      return json({ success: true, message: "Satın alma başarılı!", chargedAmount: totalPrice, flag: wonFlag(totalPrice) }); // istemciye güven
    }
    if (level === "medium") {
      for (const item of cart) {
        if (PRODUCTS[item.id]) { const qty = parseInt(item.quantity); if (qty !== 0) hasItems = true; calculatedTotal += PRODUCTS[item.id].price * qty; }
      }
      if (!hasItems) return json({ error: "Sepetiniz boş." }, 400);
      if (calculatedTotal < 0) return json({ error: "Sisteme borçlanamazsınız." }, 400);
      return json({ success: true, message: "Satın alma başarılı!", chargedAmount: calculatedTotal, flag: wonFlag(calculatedTotal) }); // negatif qty istismarı açık
    }
    // high: negatif/geçersiz qty reddedilir
    for (const item of cart) {
      if (PRODUCTS[item.id]) {
        const qty = parseInt(item.quantity);
        if (isNaN(qty) || qty < 0) return json({ error: "GÜVENLİK İHLALİ: Geçersiz ürün miktarı!" }, 400);
        if (qty > 0) hasItems = true;
        calculatedTotal += PRODUCTS[item.id].price * qty;
      }
    }
    if (!hasItems) return json({ error: "Sepetiniz boş." }, 400);
    return json({ success: true, message: "Satın alma başarılı!", chargedAmount: calculatedTotal });
  } catch {
    return json({ error: "Invalid Request" }, 400);
  }
}
