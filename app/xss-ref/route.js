// XSS (Reflected) HEDEF MAKINESI
// GET /xss-ref?q=... -> arama sonuçları + yansıyan XSS
import { getLevel } from "@/lib/level";
import { FLAGS } from "@/lib/flags";
import { page, flagBanner, esc, html } from "@/lib/machine-ui";

export const dynamic = "force-dynamic";
const FLAG = FLAGS["xss-reflected"];

const HEAD = `<script>
  window.showFlag = function(){
    fetch('/api/flag/reveal?slug=xss-reflected').then(function(r){return r.json();}).then(function(d){
      var f=document.getElementById('mk-flag'); if(!f) return;
      if(d&&d.flag){ var v=f.querySelector('.val'); if(v) v.textContent=d.flag; }
      f.classList.remove('hidden');
    }).catch(function(){ var f=document.getElementById('mk-flag'); if(f) f.classList.remove('hidden'); });
  };
</script>`;

function renderSearchPage(level, q, qReflect) {
  const body = `
    ${flagBanner({ value: "", sub: "Tarayıcıda JavaScript çalıştırdın (reflected XSS).", hidden: true })}
    <div class="panel"><div class="panel-b">
      <form method="get" action="/xss-ref" style="display:flex;gap:8px">
        <input name="q" placeholder="Ürünlerde ara…" value="${esc(q)}" style="flex:1">
        <button class="btn primary" type="submit">Ara</button>
      </form>
    </div></div>
    ${q ? `
      <div class="panel"><div class="panel-b">
        <div class="sub" style="margin-bottom:6px">Arama sonuçları:</div>
        <div style="font-size:18px;font-weight:600;margin-bottom:14px">"<span style="color:var(--green-bright);font-family:var(--font-mono)">${qReflect}</span>"</div>
        <div class="note" style="text-align:center;padding:28px"><div style="font-size:40px">🔍</div>Sonuç bulunamadı. Arama terimini değiştir.</div>
      </div></div>`
      : `<div class="panel"><div class="panel-b note" style="text-align:center;padding:36px"><div style="font-size:40px">👋</div>Ördek Store'a hoş geldin. Yukarıdan ürün ara.</div></div>`}
  `;
  return page({ title: "ördek // Search", level, subtitle: "store", body, head: HEAD });
}

export async function GET(req) {
  const level = getLevel(req.headers);
  const url = new URL(req.url);
  let q = url.searchParams.get("q") || "";
  let qReflect = q; // sink: sonuç başlığına yansır

  if (level === "low") {
    // filtre yok → qReflect ham yansır
  } else if (level === "medium") {
    // yalnızca <script> blokları silinir; onerror/onload kalır
    qReflect = q.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  } else if (level === "high") {
    qReflect = esc(q); // güvenli encode
  }

  return html(renderSearchPage(level, q, qReflect));
}
