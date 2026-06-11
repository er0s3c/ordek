// IDOR / BOLA HEDEF MAKINESI — gerçek "Sipariş Detayları" sayfası.
// GET /idor?orderId=1002 -> faturayı gösterir (sahiplik kontrolü seviyeye göre)
import { getLevel } from "@/lib/level";
import { FLAGS } from "@/lib/flags";
import { page, flagBanner, esc, html } from "@/lib/machine-ui";

export const dynamic = "force-dynamic";
const FLAG = FLAGS["idor-bola"];

const DB = {
  orders: [
    { id: "1001", uuid: "order-a1b2c3d4-super-secret-admin", owner_id: 1,
      items: ["1x Altın Ördek Heykeli", "3x VIP Bilet", "1x Gizli Kasa"], total: "$15,000.00", status: "Delivered",
      secret_note: FLAG },
    { id: "1002", uuid: "order-e5f6g7h8-standard-user-order", owner_id: 2,
      items: ["2x Standart Ördek Yemi", "1x Ördek Şapkası"], total: "$45.00", status: "Processing",
      secret_note: "Teşekkür ederiz." },
  ],
};
const CURRENT_USER_ID = 2; // saldırganın oturumu

function renderPage(level, orderIdParam, orderData = null, errorMsg = null) {
  const isSuccess = !!(orderData && orderData.secret_note && orderData.secret_note.includes("ordek{"));
  const receipt = orderData ? `
    <div class="receipt">
      <div class="r-h"><div style="font-weight:700;font-size:16px">ÖRDEK STORE A.Ş.</div><div style="font-size:12px;color:#666">Sipariş Faturası · ${new Date().toLocaleDateString()}</div></div>
      <div style="margin-bottom:12px;font-size:13px">Sipariş No: <b>${esc(orderData.id)}</b><br>
        <span style="font-size:11px;color:#888">UUID: ${esc(orderData.uuid)}</span><br>
        Müşteri ID: <b>${esc(orderData.owner_id)}</b> · Durum: <b>${esc(orderData.status)}</b></div>
      ${orderData.items.map((i) => `<div class="r-row"><span>${esc(i)}</span></div>`).join("")}
      <div class="r-total"><span>TOPLAM</span><span>${esc(orderData.total)}</span></div>
      <div style="text-align:center;margin-top:18px;font-size:12px;color:#444">NOT: ${esc(orderData.secret_note)}</div>
    </div>` : "";

  const body = `
    ${isSuccess ? flagBanner({ value: orderData.secret_note, sub: "IDOR ile başka kullanıcının faturasını görüntüledin." }) : ""}
    <div class="panel"><div class="panel-b col" style="display:flex;flex-direction:column;gap:14px">
      <h2 style="margin:0;font-size:19px">📦 Sipariş Detayları</h2>
      <div class="note">Giriş yapan kullanıcı ID: <b>${CURRENT_USER_ID}</b> · İstenen sipariş ID: <b>${esc(orderIdParam || "—")}</b></div>
      ${errorMsg ? `<div class="alert">🚫 ${esc(errorMsg)}</div>` : ""}
      ${receipt}
      <div class="note"><b>Görev:</b> Adres çubuğundaki <code>orderId</code>'yi değiştirerek başka bir kullanıcının (admin'in) faturasına eriş. Admin faturasındaki <b>NOT</b> alanında flag var.</div>
    </div></div>
  `;
  return page({ title: "ördek // Sipariş Detayları", level, subtitle: "sipariş geçmişi", body });
}

export async function GET(req) {
  const level = getLevel(req.headers);
  const url = new URL(req.url);
  const defaultOrderId = level === "medium" ? DB.orders[1].uuid : DB.orders[1].id;

  if (!url.searchParams.has("orderId")) {
    return new Response(null, { status: 302, headers: { Location: `/idor?orderId=${defaultOrderId}` } });
  }

  const orderId = url.searchParams.get("orderId");
  let orderData = null, errorMsg = null;

  if (level === "low") {
    orderData = DB.orders.find((o) => o.id === orderId);
    if (!orderData) errorMsg = "Bu ID numarasına sahip bir sipariş bulunamadı. (404)";
  } else if (level === "medium") {
    orderData = DB.orders.find((o) => o.uuid === orderId);
    if (!orderData) {
      errorMsg = DB.orders.find((o) => o.id === orderId)
        ? "Güvenlik İhlali: Yeni sistemde sipariş ID'leri sayısal olamaz. Lütfen size verilen UUID'yi kullanın."
        : "Sipariş bulunamadı. (404)";
    }
  } else { // high: sahiplik zorunlu
    orderData = DB.orders.find((o) => o.id === orderId && o.owner_id === CURRENT_USER_ID);
    if (!orderData) errorMsg = "Erişim Reddedildi veya Sipariş Bulunamadı! (403/404)";
  }

  return html(renderPage(level, orderId, orderData, errorMsg));
}
