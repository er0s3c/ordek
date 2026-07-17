// GraphQL Introspection & Injection HEDEF MAKINESI
// GET /graphql -> oyun alanı ; POST /graphql -> {query} mini-GraphQL motoru
import { getLevel } from "@/lib/level";
import { FLAGS } from "@/lib/flags";
import { page, html } from "@/lib/machine-ui";

export const dynamic = "force-dynamic";
const FLAG = FLAGS["graphql-injection"];

const USERS = { 1: { id: 1, username: "admin", email: "admin@ordek.com", secretNote: FLAG } };

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });
}

// Mini şema (introspection için)
const SCHEMA = {
  queryType: { fields: [{ name: "me" }, { name: "user" }] },
  types: [
    { name: "Query", fields: [{ name: "me" }, { name: "user" }] },
    { name: "User", fields: [{ name: "id" }, { name: "username" }, { name: "email" }, { name: "secretNote" }] },
  ],
};

const HEAD = `<script>
 async function gq(){ const q=document.getElementById('q').value, c=document.getElementById('out');
  c.style.display='block'; c.textContent='...';
  const r=await fetch('/graphql',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query:q})});
  const d=await r.json(); c.className=JSON.stringify(d).includes('ordek{')?'leak':''; c.textContent=JSON.stringify(d,null,2); }
 window.addEventListener('DOMContentLoaded',()=>document.getElementById('go').addEventListener('click',gq));
</script>`;

export async function GET(req) {
  const level = getLevel(req.headers);
  const body = `
  <div class="panel"><div class="panel-b col" style="display:flex;flex-direction:column;gap:14px">
    <h2 style="margin:0;font-size:19px">⬡ GraphQL API (/graphql)</h2>
    <p class="sub" style="margin:0">Bir GraphQL sorgusu çalıştır. Introspection ile şemayı keşfet, gizli alanı bul.<br>
      <b>Hedef:</b> Yetkisiz <code>secretNote</code> alanını sorgulayıp flag'i çek.</p>
    <div class="input-group"><label>Query</label>
      <textarea id="q" style="min-height:120px;font-family:var(--font-mono)">{ __schema { queryType { fields { name } } } }</textarea></div>
    <button id="go" class="btn primary" type="button">Çalıştır</button>
    <div class="console"><div class="dim">Yanıt</div><pre id="out" style="display:none;margin:0"></pre></div>
  </div></div>`;
  return html(page({ title: "ördek // GraphQL", level, subtitle: "graphql-lab", body, head: HEAD }));
}

export async function POST(req) {
  const level = getLevel(req.headers);
  let b; try { b = await req.json(); } catch { return json({ error: "Geçersiz JSON" }, 400); }
  const q = String((b && b.query) || "");

  // Introspection
  if (q.includes("__schema")) {
    if (level === "high") return json({ errors: [{ message: "introspection disabled" }] }, 400);
    return json({ data: { __schema: SCHEMA } });
  }
  // user(id:N){ ... secretNote ... }
  const mUser = q.match(/user\s*\(\s*id\s*:\s*(\d+)\s*\)\s*\{([\s\S]*?)\}/i);
  if (mUser) {
    const u = USERS[mUser[1]]; if (!u) return json({ data: { user: null } });
    const fields = mUser[2];
    const out = {};
    for (const f of ["id", "username", "email", "secretNote"]) {
      if (new RegExp("\\b" + f + "\\b").test(fields)) {
        if (f === "secretNote" && level === "high") return json({ errors: [{ message: "field 'secretNote' yetkisiz" }] }, 403);
        out[f] = u[f];
      }
    }
    return json({ data: { user: out } });
  }
  if (/\bme\b/.test(q)) return json({ data: { me: { username: "guest" } } });
  return json({ errors: [{ message: "anlaşılmayan sorgu" }] }, 400);
}
