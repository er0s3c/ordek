// ============================================================================
//  lib/machine-ui.js — Standalone "hedef makine" sayfaları için TEK tasarım sistemi.
//  Tüm app/<slug>/route.js sayfaları buradan import eder. Tasarım token'ları ve
//  ortak primitive'ler artık lib/ui-css.js'te (SHARED_CSS) tutulur; panelle
//  (app/layout.jsx) birebir aynı kaynaktan beslenir, kopya CSS yoktur.
//
//  CommonJS (lib/level.js & lib/vulns.js ile aynı konvansiyon):
//    import { page, cardPage, flagBanner, hintBox, esc, html } from "@/lib/machine-ui";
// ============================================================================

const { SHARED_CSS, TARGET_CSS } = require("./ui-css");

const LBL = { low: "Low", medium: "Medium", high: "High" };

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function html(body, status = 200, extraHeaders = {}) {
  return new Response(body, {
    status,
    headers: { "content-type": "text/html; charset=utf-8", ...extraHeaders },
  });
}

// ---- Tasarım: tek kaynak lib/ui-css.js (paylaşılan + hedef-sayfa stilleri) --
const BASE_CSS = SHARED_CSS + TARGET_CSS;

// ---- ortak parçalar --------------------------------------------------------
function levelBadge(level) {
  return `<span class="badge" data-l="${esc(level)}">level: ${esc((LBL[level] || level)).toUpperCase()}</span>`;
}

function navbar(level, subtitle, accent) {
  return `<div class="nav">
  <img src="/ordek.png" alt="ördek">
  <div class="brand">ördek <span>// ${esc(subtitle || "hedef makine")}</span></div>
  ${levelBadge(level)}
</div>`;
}

function footer() {
  return `<div class="foot">⚠ kasıtlı zafiyetli — yalnızca izole/eğitim ortamı · ördek-lab</div>`;
}

// Konfetisiz, ölçülü başarı bandı. hidden:true ise JS ile açılmak üzere gizli.
function flagBanner({ value, sub = "", title = "Exploit doğrulandı — flag", hidden = false, id = "mk-flag" } = {}) {
  return `<div id="${esc(id)}" class="flag${hidden ? " hidden" : ""}">
  <span class="ic">⚑</span>
  <div><div class="lbl">${esc(title)}</div><div class="val">${esc(value)}</div>${sub ? `<div class="sub">${esc(sub)}</div>` : ""}</div>
</div>`;
}

// Spoiler korumalı ipucu + çözüm paneli. hints: string[]; solution: GÜVENLİ HTML.
function hintBox({ hints = [], solution = "" } = {}) {
  const items = (hints || []).map((h, i) =>
    `<details class="spoiler"><summary>İpucu ${i + 1}</summary><div class="sp-body">${esc(h)}</div></details>`).join("");
  const sol = solution
    ? `<details class="spoiler sol"><summary>Çözümü göster</summary><div class="sp-body">${solution}</div></details>` : "";
  if (!items && !sol) return "";
  return `<div class="panel"><div class="panel-h">// ipucu &amp; çözüm</div><div class="panel-b">${items}${sol}</div></div>`;
}

// Hedef sayfa, kimlik-doğrulamalı proxy (:3001) KÖKÜNDEN servis edilir → flag aynı origin'e
// (/api/flag) gönderilir; proxy bunu panele iletir (öğrenci oturum çerezi taşınır). Panelde de same-origin.
const PANEL_ORIGIN = "";

// Hedef sayfa yolu -> zafiyet slug (ortak flag-submit kutusu istemcide slug'ı buradan çözer).
const PATH_SLUG = {
  brute: "brute-force", cmd: "command-injection", csrf: "csrf", lfi: "file-inclusion",
  sqli: "sql-injection", "sqli-blind": "sql-injection-blind", "xss-ref": "xss-reflected",
  "xss-stored": "xss-stored", jwt: "insecure-jwt", cors: "cors-misconfig", mass: "mass-assignment",
  idor: "idor-bola", "mfa-router": "mfa-bypass", "insecure-router": "insecure-randomness",
  "ssrf-router": "ssrf", "prototype-router": "prototype-pollution", "pp-gadget": "server-side-pp-gadget",
  ssti: "ssti", "insecure-deserialization": "insecure-deserialization", "open-redirect": "open-redirect",
  "host-header": "host-header-poisoning", "race-condition": "race-condition", "business-logic": "business-logic",
  redos: "redos", clickjacking: "clickjacking", upload: "file-upload", "csv-injection": "csv-injection",
  "nmap-recon": "nmap-recon", "metasploit-rce": "metasploit-rce",
  // ── Faz 2 yeni zafiyet sayfaları ──
  xxe: "xxe", nosql: "nosql-injection", graphql: "graphql-injection", ldap: "ldap-injection",
  xpath: "xpath-injection", hpp: "http-parameter-pollution", "cache-poison": "web-cache-poisoning",
  "ws-chat": "websocket-tampering", "git-disclosure": "git-disclosure", "jwt-confusion": "jwt-alg-confusion",
};

// Ortak flag-submit kutusu — izole Docker hedef sayfasının altına eklenir.
// Slug URL yolundan çözülür; flag panel origin'inin /api/flag'ine POST edilir (CORS açık) →
// ilerleme panelde toplanır. Yol haritada yoksa kutu gizlenir.
function flagSubmit(level = "low") {
  return `<div class="panel" id="mk-submit"><div class="panel-h"><span style="color:var(--accent)">⚑ flag gönder</span></div>
<div class="panel-b">
  <p class="sub" style="margin:0 0 10px">Bu hedefte yakaladığın <code>ordek{...}</code> flag'ini doğrula — panel ilerlemene işlenir.</p>
  <div style="display:flex;gap:8px"><input id="mk-flag-input" class="input" placeholder="ordek{...}" autocomplete="off" style="flex:1"><button class="btn primary" type="button" id="mk-flag-btn">Doğrula</button></div>
  <div id="mk-flag-result" style="margin-top:10px"></div>
</div>
<script>(function(){
  var PANEL=${JSON.stringify(PANEL_ORIGIN)}, LEVEL=${JSON.stringify(level)}, MAP=${JSON.stringify(PATH_SLUG)};
  var seg=location.pathname.split('/').filter(Boolean)[0]||'', SLUG=MAP[seg], box=document.getElementById('mk-submit');
  if(!SLUG){ if(box) box.style.display='none'; return; }
  var inp=document.getElementById('mk-flag-input'),btn=document.getElementById('mk-flag-btn'),res=document.getElementById('mk-flag-result');
  function go(){
    var v=(inp.value||'').trim(); if(!v) return; btn.disabled=true; res.innerHTML='<span class="sub">Doğrulanıyor…</span>';
    fetch(PANEL+'/api/flag',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({slug:SLUG,level:LEVEL,flag:v})})
      .then(function(r){return r.json();}).then(function(d){
        if(d.ok){ res.innerHTML='<div class="flag"><span class="ic">⚑</span><div><div class="lbl">Doğru flag — çözüldü işaretlendi</div><div class="val">'+SLUG+' · '+LEVEL+'</div></div></div>'; }
        else{ res.innerHTML='<div class="alert">'+(d.error||'Flag eşleşmedi.')+'</div>'; }
      }).catch(function(e){ res.innerHTML='<div class="alert">Hata: '+e.message+'</div>'; }).finally(function(){ btn.disabled=false; });
  }
  btn.addEventListener('click',go); inp.addEventListener('keydown',function(e){ if(e.key==='Enter'){ e.preventDefault(); go(); } });
})();</script></div>`;
}

// Tam navbar+container düzeni (idor/cors/dashboard tarzı).
function page({ title, level = "low", subtitle, body = "", accent = "green", head = "" }) {
  return `<!doctype html><html lang="tr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title || "ördek")}</title>
<link rel="icon" href="/ordek.png">
<style>${BASE_CSS}</style>${head}</head>
<body${accent === "danger" ? ' data-accent="danger"' : ""}>
${navbar(level, subtitle, accent)}
<div class="wrap">${body}${flagSubmit(level)}</div>
${footer()}
</body></html>`;
}

// Ortalanmış tek kart düzeni (login/araç formları: cmd, sqli-blind login vb.).
function cardPage({ title, level = "low", cardTitle = "", body = "", accent = "green", head = "", width }) {
  const w = width || 400;
  return `<!doctype html><html lang="tr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title || "ördek")}</title>
<link rel="icon" href="/ordek.png">
<style>${BASE_CSS}</style>${head}</head>
<body${accent === "danger" ? ' data-accent="danger"' : ""}>
<div class="center"><div style="display:flex;flex-direction:column;gap:16px;width:${w}px;max-width:100%">
  <div class="card" style="width:100%">
    ${cardTitle ? `<div class="hd">${cardTitle}</div>` : ""}
    <div class="bd">${body}</div>
  </div>
  ${flagSubmit(level)}
</div></div>
</body></html>`;
}

module.exports = {
  BASE_CSS, LBL, esc, html, levelBadge, navbar, footer,
  flagBanner, hintBox, page, cardPage,
};
