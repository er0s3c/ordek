// MASS ASSIGNMENT HEDEF MAKINESI
// GET /mass  -> profil formu + canlı DB görüntüsü
// POST /mass -> gövdedeki JSON'u profile atar (mass assignment'a açık)
import { getLevel } from "@/lib/level";
import { FLAGS } from "@/lib/flags";
import { page, flagBanner, esc, html } from "@/lib/machine-ui";

export const dynamic = "force-dynamic";
const FLAG = FLAGS["mass-assignment"];

// In-memory (deep-freeze: konteyner kapanınca sıfırlanır)
let DB = { profile: { id: 101, username: "guest_user", email: "guest@ordek-store.com", bio: "Sisteme yeni katıldım.", role: "user", isAdmin: false } };

const HEAD = `<style>
  .mass-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}
  @media(max-width:768px){.mass-grid{grid-template-columns:1fr}}
  .db-view{background:var(--bg-inset);border:1px solid var(--line);border-radius:6px;padding:16px;font-family:var(--font-mono);font-size:13px;color:var(--green-bright);white-space:pre-wrap;word-break:break-all}
</style>
<script>
  async function submitProfile(){
    const payload={email:document.getElementById('f_email').value,bio:document.getElementById('f_bio').value};
    await fetch('/mass',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    window.location.reload();
  }
  async function resetDB(){ await fetch('/mass?reset=1',{method:'POST',headers:{'content-type':'application/json'},body:'{}'}); window.location.reload(); }
</script>`;

function renderPage(level, dbState, resultMsg = null, isSuccess = false) {
  const body = `
    ${isSuccess ? flagBanner({ value: FLAG, sub: "Gizli alan (role/isAdmin) göndererek yetki yükselttin." }) : ""}
    <div class="mass-grid">
      <div class="panel"><div class="panel-h">📝 profili düzenle</div><div class="panel-b col" style="display:flex;flex-direction:column;gap:14px">
        <p class="sub" style="margin:0">Yalnızca e-posta ve biyografi alanları görünür. API bu formu JSON olarak kabul eder — araya girip (Burp/fetch) gizli alan ekleyebilir misin?</p>
        ${resultMsg ? `<div class="note" style="${isSuccess ? "border-left-color:var(--green);color:var(--green-bright)" : ""}">${esc(resultMsg)}</div>` : ""}
        <form onsubmit="event.preventDefault();submitProfile();" style="display:flex;flex-direction:column;gap:14px">
          <div class="input-group"><label>E-posta Adresi</label><input type="email" id="f_email" value="${esc(dbState.email)}"></div>
          <div class="input-group"><label>Biyografi</label><textarea id="f_bio">${esc(dbState.bio)}</textarea></div>
          <div style="display:flex;gap:10px"><button type="submit" class="btn primary">Kaydet (Gövdeyi Gönder)</button><button type="button" class="btn danger" onclick="resetDB()">DB Sıfırla</button></div>
        </form>
        <div class="note"><b>Görev:</b> <code>role</code> değerini <b>admin</b> ya da <code>isAdmin</code> bayrağını <b>true</b> yap.</div>
      </div></div>
      <div class="panel"><div class="panel-h">🗄️ veritabanı görüntüsü (canlı)</div><div class="panel-b"><div class="db-view">${esc(JSON.stringify(dbState, null, 2))}</div></div></div>
    </div>
  `;
  return page({ title: "ördek // Mass Assignment", level, subtitle: "profil ayarları", body, head: HEAD });
}

export async function GET(req) {
  const level = getLevel(req.headers);
  const isSuccess = DB.profile.role === "admin" || DB.profile.isAdmin === true;
  return html(renderPage(level, DB.profile, null, isSuccess));
}

export async function POST(req) {
  const level = getLevel(req.headers);
  const url = new URL(req.url);
  if (url.searchParams.get("reset")) {
    DB.profile = { id: 101, username: "guest_user", email: "guest@ordek-store.com", bio: "Sisteme yeni katıldım.", role: "user", isAdmin: false };
    return html(renderPage(level, DB.profile, "Veritabanı sıfırlandı."));
  }

  let body = {};
  try { body = await req.json(); } catch { return html(renderPage(level, DB.profile, "Hata: Geçersiz JSON!")); }

  if (level === "low") {
    Object.assign(DB.profile, body); // mass assignment
  } else if (level === "medium") {
    const payload = { ...body };
    if (payload.role !== undefined) delete payload.role; // 'role' yasak ama 'isAdmin' unutulmuş
    Object.assign(DB.profile, payload);
  } else { // high: allowlist
    if (body.email !== undefined) DB.profile.email = body.email;
    if (body.bio !== undefined) DB.profile.bio = body.bio;
  }

  const isSuccess = DB.profile.role === "admin" || DB.profile.isAdmin === true;
  return html(renderPage(level, DB.profile, isSuccess ? "Profil güncellendi. YETKİLER ARTTIRILDI!" : "Profil güncellendi.", isSuccess));
}
