// NoSQL Injection HEDEF MAKINESI — Mongo-tarzı giriş API'si
// GET /nosql -> form ; POST /nosql -> {username,password} sorgu nesnesine konur (operatör enjeksiyonu)
import { getLevel } from "@/lib/level";
import { FLAGS } from "@/lib/flags";
import { page, html } from "@/lib/machine-ui";

export const dynamic = "force-dynamic";
const FLAG = FLAGS["nosql-injection"];

// Sahte kullanıcı "koleksiyonu"
const USERS = [{ username: "admin", password: "S3cr3t_DuCk_92!", role: "admin" }];

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });
}

// Mongo-tarzı eşleştirme: değer bir operatör nesnesiyse ($ne/$gt/$regex) onu uygular (zafiyetli).
function matchVal(actual, cond) {
  if (cond && typeof cond === "object") {
    if ("$ne" in cond) return actual !== cond.$ne;
    if ("$gt" in cond) return actual > cond.$gt;
    if ("$regex" in cond) { try { return new RegExp(cond.$regex).test(actual); } catch { return false; } }
    if ("$in" in cond) return Array.isArray(cond.$in) && cond.$in.includes(actual);
    return false;
  }
  return actual === cond;
}

const HEAD = `<script>
 document.addEventListener('submit', async (e)=>{ if(e.target.id!=='nq')return; e.preventDefault();
  let pw; try{ pw=JSON.parse(document.getElementById('pw').value); }catch{ pw=document.getElementById('pw').value; }
  const body={username:document.getElementById('un').value,password:pw};
  const c=document.getElementById('out'); c.style.display='block'; c.textContent='Sorgulanıyor…';
  const r=await fetch('/nosql',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const d=await r.json(); c.className=d.flag?'leak':(d.ok?'leak':'err'); c.textContent=JSON.stringify(d,null,2);
 });
</script>`;

export async function GET(req) {
  const level = getLevel(req.headers);
  const body = `
  <div class="panel"><div class="panel-b col" style="display:flex;flex-direction:column;gap:14px">
    <h2 style="margin:0;font-size:19px">🍃 Yönetim Girişi (Mongo)</h2>
    <p class="sub" style="margin:0">Parola alanına düz metin <i>veya</i> JSON gönderebilirsin (API gövdeyi doğrudan sorguya koyar).<br>
      <b>Hedef:</b> Operatör enjeksiyonuyla (<code>$ne</code>/<code>$regex</code>) admin parolasını bilmeden gir.</p>
    <form id="nq"><div class="input-group"><label>Kullanıcı adı</label><input id="un" value="admin"></div>
      <div class="input-group"><label>Parola (düz metin ya da JSON: {"$ne":""})</label><input id="pw" value='{"$ne":""}'></div>
      <button class="btn primary" type="submit">Giriş</button></form>
    <div class="console"><div class="dim">Yanıt</div><pre id="out" style="display:none;margin:0"></pre></div>
  </div></div>`;
  return html(page({ title: "ördek // NoSQLi", level, subtitle: "nosql-lab", body, head: HEAD }));
}

export async function POST(req) {
  const level = getLevel(req.headers);
  let b; try { b = await req.json(); } catch { return json({ error: "Geçersiz JSON" }, 400); }
  let { username, password } = b || {};

  if (level === "high") {
    // Güvenli: alanlar string'e zorlanır → operatör enjeksiyonu imkânsız.
    username = String(username); password = String(password);
  } else if (level === "medium" && password && typeof password === "object") {
    // $ne/$gt kara listede; $regex hâlâ açık (kısmi filtre).
    if ("$ne" in password || "$gt" in password) return json({ error: "engellenen operatör ($ne/$gt)" }, 400);
  }

  const u = USERS.find((x) => matchVal(x.username, username) && matchVal(x.password, password));
  if (u && u.role === "admin") return json({ ok: true, role: "admin", flag: FLAG, msg: `Hoş geldin ${u.username} — ${FLAG}` });
  return json({ ok: false, error: "Geçersiz kimlik" }, 401);
}
