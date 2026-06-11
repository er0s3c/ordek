// CLICKJACKING HEDEF MAKINESI — frame koruması seviyeye göre
// GET /clickjacking               -> saldırgan PoC sayfası (hedefi iframe'e gömer)
// GET /clickjacking?action=panel  -> hassas admin paneli (frame header'ları burada set edilir)
import { getLevel } from "@/lib/level";
import { FLAGS } from "@/lib/flags";
import { page, flagBanner, html } from "@/lib/machine-ui";

export const dynamic = "force-dynamic";
const FLAG = FLAGS["clickjacking"];

function frameHeaders(level) {
  if (level === "high") return { "X-Frame-Options": "DENY", "Content-Security-Policy": "frame-ancestors 'none'" };
  if (level === "medium") return { "X-Frame-Options": "ALLOW-FROM https://trusted.ordek-store.com" }; // modern tarayıcılarca yok sayılır
  return {}; // low: koruma yok
}

function panelBody(level) {
  return `
    <div class="panel"><div class="panel-b col" style="display:flex;flex-direction:column;gap:12px">
      <h2 id="sensitive-action" style="margin:0;font-size:19px">⚙️ Hesap Ayarları — Rol Yönetimi</h2>
      <p class="sub" style="margin:0">Tek tıkla hesabını yükselt. (Bu sayfa frame korumasını ${level === "high" ? "UYGULUYOR" : "uygulamıyor"}.)</p>
      <button class="btn primary" style="align-self:flex-start">Rolü ADMIN yap</button>
    </div></div>`;
}

function attackerBody() {
  return `
    ${flagBanner({ value: "", sub: "Hedef hassas panel iframe içinde render edildi — clickjacking mümkün.", hidden: true })}
    <div class="panel"><div class="panel-b col" style="display:flex;flex-direction:column;gap:14px">
      <h2 style="margin:0;font-size:19px">🖼️ Clickjacking PoC — Saldırgan Sayfası</h2>
      <p class="sub" style="margin:0">Aşağıda hedefin hassas paneli düşük opaklıkta bir iframe içine gömüldü. iframe içeriği yüklenebiliyorsa (frame koruması yoksa) kurbana fark ettirmeden o butona tıklatabilirsin.</p>
      <div id="frame-status" class="note">iframe yükleniyor…</div>
      <div style="position:relative;border:1px dashed var(--line);border-radius:6px;overflow:hidden;min-height:160px">
        <div style="padding:26px;text-align:center"><button class="btn">🎁 Ödülü Al!</button> <span class="sub">(decoy buton)</span></div>
        <iframe id="victim" src="/clickjacking?action=panel" style="position:absolute;inset:0;width:100%;height:100%;opacity:.28;border:0"></iframe>
      </div>
    </div></div>
    <script>
      const f=document.getElementById('victim'), st=document.getElementById('frame-status');
      f.addEventListener('load', ()=>{
        try{
          const doc=f.contentDocument;
          if(doc && doc.getElementById('sensitive-action')){
            st.textContent='iframe yüklendi — frame koruması YOK, clickjacking mümkün!'; st.style.color='var(--green-bright)';
            fetch('/api/flag/reveal?slug=clickjacking').then(function(r){return r.json();}).then(function(d){var fb=document.getElementById('mk-flag');if(!fb)return;if(d&&d.flag){var v=fb.querySelector('.val');if(v)v.textContent=d.flag;}fb.classList.remove('hidden');}).catch(function(){var fb=document.getElementById('mk-flag');if(fb)fb.classList.remove('hidden');});
          } else { st.textContent='iframe içeriği erişilemez (boş).'; st.style.color='var(--amber)'; }
        }catch(e){ st.textContent='iframe BLOKLANDI (frame-ancestors / X-Frame-Options) — sayfa korumalı.'; st.style.color='var(--amber)'; }
      });
    </script>`;
}

export async function GET(req) {
  const level = getLevel(req.headers);
  const url = new URL(req.url);
  if (url.searchParams.get("action") === "panel") {
    return html(page({ title: "ördek // Hesap Ayarları", level, subtitle: "account", body: panelBody(level) }), 200, frameHeaders(level));
  }
  return html(page({ title: "ördek // Clickjacking PoC", level, subtitle: "clickjacking-lab", body: attackerBody() }));
}
