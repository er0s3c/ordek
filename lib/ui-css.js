// ============================================================================
//  lib/ui-css.js — TEK tasarım kaynağı (token + primitive + animasyon).
//  Hem panel (app/layout.jsx <style> enjeksiyonu) hem standalone hedef sayfalar
//  (lib/machine-ui.js) buradan beslenir; böylece palet/tipografi tek yerde durur,
//  drift olmaz.
//
//    SHARED_CSS  → her iki taraf (token, reset, ortak primitive'ler, animasyon)
//    PANEL_CSS   → yalnızca kontrol paneli (app-shell + yeni sayfalar)
//    TARGET_CSS  → yalnızca standalone hedef sayfaları (machine-ui)
// ============================================================================

// ---- Token + reset + ortak primitive'ler + animasyonlar --------------------
const SHARED_CSS = `
@import url("https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap");
:root{
  /* yüzeyler — soğuk gri-kömür */
  --bg-0:#171a16; --bg-1:#20241e; --bg-2:#2a2f27; --bg-3:#343b2f; --bg-inset:#13160f;
  --line:#3a4034; --line-soft:#2c3228;
  /* metin (--ink-faint WCAG AA için hafif açıldı: 6b7360 → 7e886b) */
  --ink:#dde3d2; --ink-dim:#9aa389; --ink-faint:#7e886b;
  /* aksan — fosfor yeşili */
  --green:#8fcf3f; --green-bright:#b6f24a; --green-deep:#5c8a23; --green-glow:rgba(143,207,63,.22);
  /* durum */
  --amber:#e0a32e; --red:#d9512c; --red-bright:#ef6a44; --blue:#6fb3d9;
  /* seviye renkleri */
  --lvl-low:#d9512c; --lvl-medium:#e0a32e; --lvl-high:#8fcf3f; --lvl-impossible:#6fb3d9;
  /* kategori renkleri (zafiyet dizini gruplarını bir bakışta ayırır) */
  --cat-core:var(--green); --cat-auth:var(--blue); --cat-modern:var(--amber);
  /* aksan alias (target sayfaları danger moduna geçebilir) */
  --accent:var(--green); --accent-bright:var(--green-bright); --accent-deep:var(--green-deep);
  /* yarıçap / hareket / yüzey */
  --radius-sm:5px; --radius:7px; --radius-lg:11px;
  /* 4px tabanlı boşluk ölçeği (tutarlı ritim) */
  --sp-1:4px; --sp-2:8px; --sp-3:12px; --sp-4:16px; --sp-5:20px; --sp-6:24px; --sp-7:32px; --sp-8:48px;
  /* klavye odağı halkası (erişilebilirlik) */
  --focus:0 0 0 2px var(--bg-0),0 0 0 4px var(--green);
  --ease:cubic-bezier(.4,0,.2,1);
  --panel-grad:linear-gradient(180deg,#252b21,#20241e);
  --glass:rgba(32,36,30,.72);
  --elev-1:0 1px 0 rgba(255,255,255,.03) inset, 0 6px 18px rgba(0,0,0,.30);
  --elev-2:0 1px 0 rgba(255,255,255,.04) inset, 0 16px 40px rgba(0,0,0,.45);
  --ring:0 0 0 3px var(--green-glow);
  --font-sans:"IBM Plex Sans","Segoe UI",system-ui,sans-serif;
  --font-mono:"JetBrains Mono","IBM Plex Mono",ui-monospace,"SF Mono",Menlo,monospace;
}
*{box-sizing:border-box}
html,body{margin:0;min-height:100%}
body{background:
    radial-gradient(1200px 600px at 78% -10%, rgba(143,207,63,.06), transparent 60%),
    radial-gradient(900px 500px at -10% 110%, rgba(111,179,217,.05), transparent 55%),
    var(--bg-0);
  color:var(--ink);font-family:var(--font-sans);font-size:15px;line-height:1.5;-webkit-font-smoothing:antialiased}
body[data-accent="danger"]{--accent:var(--red-bright);--accent-bright:#ff8a66;--accent-deep:#7a3320}
/* ince tarama-çizgisi dokusu */
body::before{content:"";position:fixed;inset:0;pointer-events:none;z-index:9999;opacity:.45;mix-blend-mode:screen;
  background:repeating-linear-gradient(0deg,rgba(143,207,63,.022) 0 1px,transparent 1px 3px)}
a{color:var(--accent);text-decoration:none;transition:color .15s var(--ease)} a:hover{color:var(--accent-bright)}
/* native <button> color'u miras ALMAZ → koyu temada metin siyaha düşer. inherit ile düzelt. */
button{font-family:inherit;color:inherit}
code,kbd,.mono{font-family:var(--font-mono)}
::selection{background:var(--green-deep);color:#0d0f0c}
*::-webkit-scrollbar{width:11px;height:11px}
*::-webkit-scrollbar-track{background:var(--bg-inset)}
*::-webkit-scrollbar-thumb{background:#3c4435;border:2px solid var(--bg-inset);border-radius:6px}
*::-webkit-scrollbar-thumb:hover{background:#4d5743}

/* ---- başlık blokları ---- */
.eyebrow{font-family:var(--font-mono);font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:var(--accent);margin-bottom:8px}
.h1{font-size:24px;font-weight:650;letter-spacing:-.2px;margin:0 0 6px}
.sub{color:var(--ink-dim);font-size:14px;line-height:1.55}
.page-h{margin-bottom:22px;animation:fadeUp .4s var(--ease) both}
.page-h h1{font-size:25px;margin:0 0 6px;font-weight:650;letter-spacing:-.3px}
.page-h .sub{color:var(--ink-dim);font-size:14px;max-width:70ch}

/* ---- panel / kart ---- */
.panel{background:var(--panel-grad);border:1px solid var(--line);border-radius:var(--radius-lg);box-shadow:var(--elev-1)}
.panel-h{display:flex;align-items:center;gap:10px;padding:13px 17px;border-bottom:1px solid var(--line-soft);
  font-family:var(--font-mono);font-size:12px;letter-spacing:.5px;text-transform:uppercase;color:var(--ink-dim)}
.panel-b{padding:17px}
/* tıklanabilir / yükselen kartlar */
.lift{transition:transform .18s var(--ease),box-shadow .18s var(--ease),border-color .18s var(--ease)}
.lift:hover{transform:translateY(-2px);box-shadow:var(--elev-2);border-color:#4d5743}

/* ---- form / input ---- */
.field{display:block;margin-bottom:14px}
.field label{display:block;font-family:var(--font-mono);font-size:11px;letter-spacing:.6px;text-transform:uppercase;color:var(--ink-faint);margin-bottom:6px}
.input,textarea.input,select.input{width:100%;padding:10px 13px;background:var(--bg-inset);border:1px solid var(--line);border-radius:var(--radius);
  color:var(--ink);font-family:var(--font-mono);font-size:13.5px;outline:none;transition:border-color .15s var(--ease),box-shadow .15s var(--ease)}
.input:focus{border-color:var(--accent-deep);box-shadow:var(--ring)}
textarea.input{resize:vertical;min-height:74px;line-height:1.55}

/* ---- etiket / chip ---- */
.tag{display:inline-flex;align-items:center;gap:6px;font-family:var(--font-mono);font-size:10.5px;letter-spacing:.5px;
  text-transform:uppercase;padding:3px 9px;border-radius:100px;border:1px solid var(--line);color:var(--ink-dim);background:var(--bg-2)}
/* <button class="tag"> native (açık) zemini koyu temada "beyaz buton" gösterir — tıklanabilir çipler koyu kalsın */
button.tag{cursor:pointer;font:inherit;font-family:var(--font-mono);transition:background .15s var(--ease),border-color .15s var(--ease),color .15s var(--ease)}
button.tag:hover{background:var(--bg-3);border-color:#4d5743;color:var(--ink)}
.tag.low{color:var(--lvl-low);border-color:#5a2c1f;background:#271812}
.tag.medium{color:var(--lvl-medium);border-color:#5c4a1c;background:#251f10}
.tag.high{color:var(--lvl-high);border-color:#41591f;background:#1c2412}
.tag.solved{color:var(--green-bright);border-color:var(--green-deep);background:#1c2412}
/* aktif filtre çipi (dizin araç çubuğu) */
.tag.on{color:var(--green-bright);border-color:var(--green-deep);background:#1c2412}
button.tag.on:hover{color:var(--green-bright);border-color:var(--green-deep);background:#21300f}

/* ---- açıklama kutusu (öğretici callout) ---- */
.callout{display:flex;gap:11px;padding:13px 15px;border-radius:var(--radius);background:var(--bg-2);
  border:1px solid var(--line);border-left:3px solid var(--accent);font-size:13.5px;color:var(--ink-dim);line-height:1.55}
.callout b{color:var(--ink)} .callout .ci{flex:none;font-size:15px;line-height:1.4;color:var(--accent)}

/* ---- konsol / çıktı ---- */
.console,.out{background:var(--bg-inset);border:1px solid var(--line);border-radius:var(--radius);padding:14px 16px;
  font-family:var(--font-mono);font-size:12.5px;line-height:1.65;color:var(--ink-dim);white-space:pre-wrap;word-break:break-word;overflow-x:auto;max-height:360px}
.console .ok,.out .ok{color:var(--green-bright)} .console .warn{color:var(--amber)}
.console .err,.out .err{color:var(--red-bright)} .console .dim{color:var(--ink-faint)}
.console .ink{color:var(--ink)} .console .leak{color:var(--blue)}

/* ---- yardımcılar ---- */
.row{display:flex;gap:12px;align-items:center} .col{display:flex;flex-direction:column}
.between{justify-content:space-between} .wrap{flex-wrap:wrap}
.muted{color:var(--ink-dim)} .faint{color:var(--ink-faint)}
.mt8{margin-top:8px}.mt12{margin-top:12px}.mt16{margin-top:16px}.mt24{margin-top:24px}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}

/* ============================ ANİMASYONLAR ============================ */
@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@keyframes viewIn{from{opacity:0;transform:translateY(10px) scale(.995)}to{opacity:1;transform:none}}
@keyframes popIn{0%{opacity:0;transform:scale(.92)}60%{transform:scale(1.02)}100%{opacity:1;transform:scale(1)}}
@keyframes flagIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}
@keyframes pulseDot{0%,100%{box-shadow:0 0 0 0 rgba(224,163,46,.45)}50%{box-shadow:0 0 0 5px rgba(224,163,46,0)}}
@keyframes pulseOk{0%,100%{box-shadow:0 0 0 0 rgba(143,207,63,.45)}50%{box-shadow:0 0 0 5px rgba(143,207,63,0)}}
@keyframes shimmer{from{background-position:-360px 0}to{background-position:360px 0}}
@keyframes glowSweep{0%{transform:translateX(-120%)}100%{transform:translateX(220%)}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes stepIn{from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:none}}
@keyframes staggerUp{from{opacity:0;transform:translateY(11px)}to{opacity:1;transform:none}}
@keyframes gradientShift{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
@keyframes checkDraw{to{stroke-dashoffset:0}}
@keyframes floaty{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
@keyframes copyPop{0%{transform:scale(1)}40%{transform:scale(1.16)}100%{transform:scale(1)}}
@keyframes haloPulse{0%,100%{box-shadow:0 0 14px var(--green-glow) inset,0 0 0 0 var(--green-glow)}50%{box-shadow:0 0 14px var(--green-glow) inset,0 0 0 6px transparent}}
/* kart üzerinde geçen ince parıltı (hover) */
@keyframes cardSheen{0%{transform:translateX(-160%) skewX(-12deg)}100%{transform:translateX(260%) skewX(-12deg)}}
@keyframes glowPulseSoft{0%,100%{box-shadow:0 0 0 0 transparent}50%{box-shadow:0 0 16px var(--green-glow)}}
/* konfeti parçacığı düşüşü (kutlama) */
@keyframes confettiFall{0%{transform:translateY(-12px) translateX(0) rotate(0);opacity:1}100%{transform:translateY(100vh) translateX(var(--drift,0)) rotate(var(--rot,200deg));opacity:.12}}
.shimmer{background:linear-gradient(90deg,var(--bg-2) 25%,var(--bg-3) 50%,var(--bg-2) 75%);background-size:720px 100%;animation:shimmer 1.3s linear infinite;border-radius:var(--radius)}
/* kademeli giriş yardımcıları */
.stagger>*{animation:staggerUp .42s var(--ease) both}
.stagger>*:nth-child(1){animation-delay:.03s}.stagger>*:nth-child(2){animation-delay:.09s}
.stagger>*:nth-child(3){animation-delay:.15s}.stagger>*:nth-child(4){animation-delay:.21s}
.stagger>*:nth-child(5){animation-delay:.27s}.stagger>*:nth-child(6){animation-delay:.33s}
.stagger>*:nth-child(7){animation-delay:.39s}.stagger>*:nth-child(8){animation-delay:.45s}
.rise{animation:staggerUp .5s var(--ease) both}

@media (prefers-reduced-motion: reduce){
  *,*::before,*::after{animation-duration:.001ms !important;animation-iteration-count:1 !important;transition-duration:.001ms !important}
  .lift:hover{transform:none}
  .vuln-card:hover{transform:none}
  .confetti{display:none !important}
}

/* ════════════════ FAZ 2 — TASARIM SİSTEMİ KATMANI (palet + butonlar korunur) ════════════════ */
/* — erişilebilirlik: tutarlı klavye-odağı halkası (fare tıklamasında değil, yalnız :focus-visible) — */
a:focus-visible,button:focus-visible,[tabindex]:focus-visible,
.kbtn:focus-visible,.tag:focus-visible,.nav-item:focus-visible,.vuln-card:focus-visible,
input:focus-visible,select:focus-visible,textarea:focus-visible,summary:focus-visible{
  outline:none;box-shadow:var(--focus);border-radius:var(--radius-sm)}
:focus:not(:focus-visible){outline:none}

/* — tipografi ölçeği — */
.h2{font-size:20px;font-weight:650;letter-spacing:-.2px;margin:0 0 6px;color:var(--ink)}
.h3{font-size:16px;font-weight:600;margin:0 0 4px;color:var(--ink)}
.h4{font-size:13.5px;font-weight:600;margin:0 0 4px;color:var(--ink)}
.h5{font-family:var(--font-mono);font-size:11px;letter-spacing:1px;text-transform:uppercase;color:var(--ink-faint);margin:0 0 6px}
.text-xs{font-size:11.5px}.text-sm{font-size:13px}.text-lg{font-size:17px}
.text-mono{font-family:var(--font-mono)} .text-accent{color:var(--accent)} .text-center{text-align:center}

/* — rozet (durum/sayı) — */
.badge{display:inline-flex;align-items:center;gap:5px;min-width:18px;height:18px;padding:0 6px;justify-content:center;
  font-family:var(--font-mono);font-size:10.5px;font-weight:600;border-radius:100px;background:var(--bg-3);color:var(--ink-dim);border:1px solid var(--line)}
.badge.accent{background:#1c2412;border-color:var(--green-deep);color:var(--green-bright)}
.badge.danger{background:#271812;border-color:#5a2c1f;color:var(--red-bright)}
.badge.dot{min-width:auto;width:8px;height:8px;padding:0}

/* — istatistik kartı (dashboard) — */
.stat-card{display:flex;flex-direction:column;gap:4px;padding:var(--sp-4);background:var(--panel-grad);
  border:1px solid var(--line);border-radius:var(--radius-lg);box-shadow:var(--elev-1)}
.stat-card .sv{font-family:var(--font-mono);font-size:26px;font-weight:600;color:var(--ink);line-height:1.1}
.stat-card .sl{font-family:var(--font-mono);font-size:10.5px;letter-spacing:.8px;text-transform:uppercase;color:var(--ink-faint)}
.stat-card .sv.accent{color:var(--green-bright)}

/* — ilerleme halkası (SVG conic) — */
.ring{--p:0;--sz:64px;width:var(--sz);height:var(--sz);border-radius:50%;display:grid;place-items:center;flex:none;
  background:conic-gradient(var(--green) calc(var(--p)*1%),var(--bg-3) 0);
  -webkit-mask:radial-gradient(farthest-side,transparent calc(50% - 7px),#000 calc(50% - 6px));
          mask:radial-gradient(farthest-side,transparent calc(50% - 7px),#000 calc(50% - 6px))}
.ring-wrap{position:relative;display:inline-grid;place-items:center}
.ring-wrap .rv{position:absolute;font-family:var(--font-mono);font-size:13px;font-weight:600;color:var(--ink)}

/* — ayraç — */
.divider{height:1px;background:var(--line-soft);border:0;margin:var(--sp-4) 0}
.divider.v{width:1px;height:auto;align-self:stretch;margin:0 var(--sp-3)}

/* — sekmeler — */
.tabs{display:inline-flex;gap:2px;padding:3px;background:var(--bg-inset);border:1px solid var(--line);border-radius:var(--radius)}
.tab{padding:6px 13px;border:0;background:transparent;color:var(--ink-dim);font-family:var(--font-mono);font-size:12px;
  border-radius:var(--radius-sm);cursor:pointer;transition:background .15s var(--ease),color .15s var(--ease)}
.tab:hover{color:var(--ink)} .tab.on{background:var(--bg-2);color:var(--green-bright);box-shadow:var(--elev-1)}

/* — boş durum — */
.empty-state{display:flex;flex-direction:column;align-items:center;gap:8px;padding:var(--sp-8) var(--sp-5);text-align:center;color:var(--ink-faint)}
.empty-state .es-ic{font-size:34px;opacity:.7;filter:grayscale(.3)}
.empty-state .es-t{font-size:15px;color:var(--ink-dim)}

/* — iskelet yükleyici (genel) — */
.skel{background:linear-gradient(90deg,var(--bg-2) 25%,var(--bg-3) 50%,var(--bg-2) 75%);background-size:200% 100%;
  animation:shimmer 1.3s linear infinite;border-radius:var(--radius-sm)}
.skel-line{height:11px;margin:7px 0} .skel-line.w60{width:60%}.skel-line.w40{width:40%}

/* — araç-ipucu — */
.tip{position:relative;display:inline-flex;cursor:help;border-bottom:1px dotted var(--ink-faint)}
.tip::after{content:attr(data-tip);position:absolute;left:50%;bottom:calc(100% + 7px);transform:translateX(-50%) translateY(4px);
  background:var(--bg-3);color:var(--ink);border:1px solid var(--line);border-radius:var(--radius-sm);padding:6px 9px;
  font-family:var(--font-sans);font-size:12px;white-space:nowrap;box-shadow:var(--elev-2);opacity:0;pointer-events:none;
  transition:opacity .15s var(--ease),transform .15s var(--ease);z-index:120}
.tip:hover::after,.tip:focus-visible::after{opacity:1;transform:translateX(-50%) translateY(0)}

/* — modal / diyalog (palet + .kbtn butonlarıyla) — */
.modal-backdrop{position:fixed;inset:0;z-index:200;display:grid;place-items:center;padding:var(--sp-5);
  background:rgba(8,10,7,.62);backdrop-filter:blur(3px);animation:fadeUp .2s var(--ease) both}
.modal{width:min(540px,100%);max-height:88vh;overflow:auto;background:var(--panel-grad);border:1px solid var(--line);
  border-radius:var(--radius-lg);box-shadow:var(--elev-2);animation:popIn .22s var(--ease) both}
.modal-h{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:14px 18px;border-bottom:1px solid var(--line-soft)}
.modal-h h3{margin:0;font-size:16px} .modal-b{padding:18px} .modal-f{display:flex;justify-content:flex-end;gap:8px;padding:14px 18px;border-top:1px solid var(--line-soft)}

/* — toast / anlık bildirim yığını — */
.toast-stack{position:fixed;right:18px;bottom:18px;z-index:300;display:flex;flex-direction:column;gap:8px;max-width:340px}
.toast{display:flex;align-items:flex-start;gap:9px;padding:11px 14px;background:var(--glass);backdrop-filter:blur(8px);
  border:1px solid var(--line);border-left:3px solid var(--accent);border-radius:var(--radius);box-shadow:var(--elev-2);
  font-size:13px;color:var(--ink);animation:popIn .22s var(--ease) both}
.toast.ok{border-left-color:var(--green)} .toast.warn{border-left-color:var(--amber)} .toast.err{border-left-color:var(--red-bright)}

/* — ağ topolojisi mini-diyagramı (tool lab menzili) — */
.topo{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:var(--sp-3);background:var(--bg-inset);
  border:1px solid var(--line);border-radius:var(--radius);font-family:var(--font-mono);font-size:12px}
.topo .node{display:flex;flex-direction:column;align-items:center;gap:3px;padding:7px 11px;border-radius:var(--radius-sm);
  border:1px solid var(--line);background:var(--bg-2);min-width:92px;text-align:center}
.topo .node .ip{color:var(--green-bright)} .topo .node .nl{color:var(--ink-faint);font-size:10px;text-transform:uppercase;letter-spacing:.6px}
.topo .node.atk{border-color:var(--green-deep)} .topo .node.tgt{border-color:#5a2c1f}
.topo .link{flex:1;min-width:24px;height:1px;background:repeating-linear-gradient(90deg,var(--line) 0 5px,transparent 5px 9px)}

/* — BRIDGE (BYO-VM) bağlantı topolojisi: Kali VM → Windows host → hedef (animasyonlu) — */
@keyframes packetFlow{0%{left:2%;opacity:0}12%{opacity:1}88%{opacity:1}100%{left:96%;opacity:0}}
@keyframes packetFlowR{0%{right:2%;opacity:0}12%{opacity:1}88%{opacity:1}100%{right:96%;opacity:0}}
@keyframes portPulse{0%{opacity:0;transform:translateY(6px) scale(.96)}100%{opacity:1;transform:none}}
@keyframes nodeGlow{0%,100%{box-shadow:0 0 0 0 transparent}50%{box-shadow:0 0 16px var(--green-glow)}}
@keyframes radarSweep{to{transform:rotate(360deg)}}
.netflow{display:flex;align-items:stretch;gap:8px;flex-wrap:wrap;padding:var(--sp-4) var(--sp-3);
  background:radial-gradient(420px 130px at 50% -30%,rgba(143,207,63,.08),transparent 70%),var(--bg-inset);
  border:1px solid var(--line);border-radius:var(--radius);font-family:var(--font-mono);overflow:hidden}
.netflow .nf-node{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;
  min-width:108px;flex:1;padding:11px 10px;border-radius:var(--radius);border:1px solid var(--line);
  background:var(--bg-2);text-align:center;position:relative;transition:border-color .3s var(--ease)}
.netflow .nf-emo{font-size:22px;line-height:1;filter:drop-shadow(0 1px 3px rgba(0,0,0,.5))}
.netflow.live .nf-emo{animation:floaty 4.5s var(--ease) infinite}
.netflow .nf-t{font-size:12.5px;color:var(--ink);font-weight:700;margin-top:3px}
.netflow .nf-s{font-size:10px;color:var(--ink-faint);text-transform:uppercase;letter-spacing:.5px}
.netflow .nf-node.kali{border-color:var(--green-deep)}
.netflow .nf-node.host{border-color:#3a5a7a}
.netflow .nf-node.tgt{border-color:#5a2c1f}
.netflow.live .nf-node.tgt{animation:nodeGlow 2.6s var(--ease) infinite}
.netflow .nf-link{position:relative;flex:1;min-width:40px;align-self:center;height:2px;border-radius:2px;
  background:repeating-linear-gradient(90deg,var(--line) 0 6px,transparent 6px 11px)}
.netflow .nf-lbl{position:absolute;top:-17px;left:50%;transform:translateX(-50%);font-size:9.5px;color:var(--ink-faint);white-space:nowrap}
.netflow .nf-pkt{position:absolute;top:50%;width:7px;height:7px;margin-top:-3.5px;border-radius:50%;left:2%;
  background:var(--green-bright);box-shadow:0 0 8px var(--green-bright);opacity:0}
.netflow.live .nf-pkt{animation:packetFlow 1.9s var(--ease) infinite}
.netflow.live .nf-pkt.d2{animation:packetFlow 1.9s var(--ease) .6s infinite}
@media (max-width:560px){.netflow{flex-direction:column}.netflow .nf-link{width:2px;height:26px;min-width:0;margin:0 auto}
  .netflow.live .nf-pkt{animation:none}.netflow .nf-lbl{position:static;transform:none;margin:2px 0}}

/* — yayımlanan servis portu çipleri (sırayla belirir) — */
.port-chip{display:inline-flex;align-items:center;gap:7px;padding:6px 10px;border-radius:var(--radius-sm);
  border:1px solid var(--green-deep);background:linear-gradient(180deg,#1d2512,#191e10);font-family:var(--font-mono);
  font-size:12.5px;color:var(--ink);animation:portPulse .4s var(--ease) both}
.port-chip b{color:var(--green-bright);font-weight:600}
.port-chip .pc-arrow{color:var(--ink-faint)}
.port-chip code{color:var(--green-bright);font-weight:700}

/* — host IP rehber tablosu (VM ağ moduna göre) — */
.hosttab{display:flex;flex-direction:column;border:1px solid var(--line);border-radius:var(--radius);overflow:hidden;font-family:var(--font-mono)}
.hosttab .ht-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:7px 11px;border-top:1px solid var(--line-soft)}
.hosttab .ht-row:first-child{border-top:0}
.hosttab .ht-row:nth-child(odd){background:var(--bg-2)}
.hosttab .ht-net{font-size:12px;color:var(--ink-dim)}
.hosttab .ht-ip{font-size:12.5px;color:var(--green-bright);font-weight:700;white-space:nowrap}

/* — bağlantı testi: başarı bandı + sorun giderme listesi — */
.callout.cc-ok{border-left-color:var(--green);background:linear-gradient(90deg,rgba(143,207,63,.10),transparent 70%);animation:popIn .3s var(--ease) both}
.tshoot{display:flex;flex-direction:column;gap:8px;border:1px solid var(--line);border-radius:var(--radius);padding:var(--sp-3);background:var(--bg-inset)}
.tshoot .ts-row{display:flex;gap:10px;align-items:flex-start;animation:staggerUp .36s var(--ease) both}
.tshoot .ts-row b{font-size:13.5px;color:var(--ink)}
.tshoot .ts-n{flex:none;width:20px;height:20px;border-radius:50%;display:grid;place-items:center;font-size:11px;font-weight:700;
  background:linear-gradient(180deg,#3a2417,#2a1a10);color:var(--amber);border:1px solid #5a2c1f;margin-top:1px}

/* — responsive: dar ekranda grid'leri tek sütuna indir — */
@media (max-width:720px){
  .grid2,.grid3{grid-template-columns:1fr}
  .stat-row{grid-template-columns:repeat(2,1fr) !important}
}
`;

// ---- Yalnızca kontrol paneli: app-shell + yeni sayfalar --------------------
const PANEL_CSS = `
#root{height:100%}
.app{position:relative;display:grid;grid-template-columns:264px 1fr;grid-template-rows:54px 1fr 30px;
  grid-template-areas:"brand header" "side main" "side foot";height:100%;min-height:0}
/* çok hafif, yavaşça kayan degrade katmanı (main alanın arkasından görünür) */
.app::before{content:"";position:fixed;inset:0;z-index:-1;pointer-events:none;opacity:.6;
  background:radial-gradient(1100px 520px at 88% -12%,rgba(143,207,63,.05),transparent 60%),
            radial-gradient(900px 480px at -12% 112%,rgba(111,179,217,.045),transparent 60%);
  background-size:185% 185%;animation:gradientShift 28s var(--ease) infinite}

/* marka köşesi */
.brand{grid-area:brand;display:flex;align-items:center;gap:10px;padding:0 18px;background:var(--glass);
  backdrop-filter:blur(8px);border-right:1px solid var(--line);border-bottom:1px solid var(--line)}
.brand-mark{width:28px;height:28px;display:grid;place-items:center;border:1px solid var(--green-deep);border-radius:6px;
  background:#1c2118;color:var(--green-bright);font-family:var(--font-mono);font-weight:700;font-size:15px;box-shadow:0 0 12px var(--green-glow) inset}
.brand-name{font-family:var(--font-mono);font-weight:600;letter-spacing:.4px;font-size:15px}
.brand-name b{color:var(--green-bright);font-weight:700} .brand-name span{color:var(--ink-faint)}
/* Logo: geniş (2816×1536) şeffaf ördek — KARE kırpma yok; contain + şekli izleyen glow */
.brand-logo{height:34px;width:auto;max-width:96px;object-fit:contain;display:block;filter:drop-shadow(0 1px 3px rgba(0,0,0,.5)) drop-shadow(0 0 7px var(--green-glow))}
.auth-logo{height:84px;width:auto;max-width:230px;object-fit:contain;display:block;filter:drop-shadow(0 2px 5px rgba(0,0,0,.55)) drop-shadow(0 0 16px var(--green-glow));animation:floaty 5s var(--ease) infinite}

/* üst başlık çubuğu */
.header{grid-area:header;display:flex;align-items:center;gap:16px;padding:0 20px;background:var(--glass);
  backdrop-filter:blur(8px);border-bottom:1px solid var(--line);
  /* backdrop-filter kendi stacking context'ini kurar; z-index olmadan .main üstüne biner
     ve içindeki .noti-pop arkada kalır. Header'ı .main üstüne kaldır. */
  position:relative;z-index:50}
.header .crumb{font-family:var(--font-mono);font-size:13px;color:var(--ink-dim)}
.header .crumb b{color:var(--ink)} .header .spacer{flex:1}
.header .pill{font-family:var(--font-mono);font-size:12px;padding:5px 11px;border:1px solid var(--line);border-radius:100px;color:var(--ink-dim);background:var(--bg-2)}
.header .pill b{color:var(--ink)}

/* kenar çubuğu */
.sidebar{grid-area:side;background:var(--bg-1);border-right:1px solid var(--line);overflow-y:auto;padding:12px 0 30px}
.nav-sec{padding:0 12px;margin-top:6px}
.nav-sec-h{padding:10px 8px 5px;font-family:var(--font-mono);font-size:10px;letter-spacing:1.4px;text-transform:uppercase;color:var(--ink-faint)}
.nav-item{display:flex;align-items:center;gap:10px;width:100%;padding:8px 12px;border:1px solid transparent;border-radius:var(--radius);
  background:none;color:var(--ink-dim);font-size:14px;text-align:left;cursor:pointer;font-family:var(--font-sans);
  transition:background .14s var(--ease),color .14s var(--ease),transform .14s var(--ease)}
.nav-item .ic{width:16px;color:var(--ink-faint);flex:none;display:flex}
.nav-item:hover{background:var(--bg-2);color:var(--ink)}
.nav-item:hover .ic{color:var(--ink-dim)}
.nav-item.active{background:#232a1c;color:var(--green-bright);border-color:var(--green-deep)}
.nav-item.active .ic{color:var(--green)}
.nav-item .badge-n{margin-left:auto;font-family:var(--font-mono);font-size:10px;color:var(--green);background:#1c2412;border:1px solid var(--green-deep);border-radius:100px;padding:1px 7px}

.nav-group{margin-top:14px}
.nav-group-h{display:flex;align-items:baseline;justify-content:space-between;padding:6px 18px;font-family:var(--font-mono);
  font-size:10.5px;letter-spacing:1.2px;text-transform:uppercase;color:var(--ink-faint)}
.nav-group-h span{color:#4c5443;font-size:9.5px}
.nav-vuln{display:flex;align-items:center;gap:9px;width:100%;padding:6px 18px 6px 16px;background:none;border:0;border-left:2px solid transparent;
  color:var(--ink-dim);font-size:13.5px;text-align:left;cursor:pointer;font-family:var(--font-sans);transition:background .14s var(--ease),color .14s var(--ease)}
.nav-vuln:hover{background:var(--bg-2);color:var(--ink)}
.nav-vuln.active{background:#1f2519;color:var(--green-bright);border-left-color:var(--green)}
.nav-vuln .dot{width:6px;height:6px;border-radius:50%;flex:none;background:var(--line);transition:background .2s var(--ease)}
.nav-vuln.solved .dot{background:var(--green);box-shadow:0 0 6px var(--green)}
.nav-vuln .nm{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.nav-vuln .num{font-family:var(--font-mono);font-size:10.5px;color:var(--ink-faint)}

/* ana alan */
.main{grid-area:main;overflow-y:auto;padding:28px 34px 64px}
.main-wrap{max-width:1040px;margin:0 auto}
.view-anim{animation:viewIn .32s var(--ease) both}

/* ---- dashboard araç çubuğu (arama + filtre + hızlı atlama) ---- */
.dash-toolbar{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:18px}
.dash-search{position:relative;flex:1;min-width:200px}
.dash-search .input{padding-left:34px}
.dash-search .si{position:absolute;left:11px;top:50%;transform:translateY(-50%);color:var(--ink-faint);display:flex;pointer-events:none}
.chips{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
.chips .sep{width:1px;height:18px;background:var(--line);margin:0 2px}

/* ---- yenilenen zafiyet kartları (kategori-renkli) ---- */
.vuln-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(248px,1fr));gap:14px}
.vuln-card{position:relative;overflow:hidden;display:flex;flex-direction:column;gap:7px;text-align:left;cursor:pointer;
  padding:16px 16px 13px;border:1px solid var(--line);border-radius:var(--radius-lg);
  background:linear-gradient(180deg,rgba(42,47,39,.55),rgba(32,36,30,.6));box-shadow:var(--elev-1);
  transition:transform .18s var(--ease),box-shadow .18s var(--ease),border-color .18s var(--ease)}
.vuln-card[data-cat="core"]{--cat:var(--cat-core)} .vuln-card[data-cat="auth"]{--cat:var(--cat-auth)} .vuln-card[data-cat="modern"]{--cat:var(--cat-modern)}
.vuln-card .vc-accent{position:absolute;top:0;left:0;right:0;height:2px;background:var(--cat,var(--green));opacity:.85;box-shadow:0 0 12px var(--cat,var(--green))}
.vuln-card::after{content:"";position:absolute;top:0;bottom:0;left:0;width:38%;pointer-events:none;opacity:0;
  background:linear-gradient(100deg,transparent,rgba(221,227,210,.08),transparent);transform:translateX(-160%) skewX(-12deg)}
.vuln-card:hover{transform:translateY(-3px);border-color:color-mix(in srgb,var(--cat,var(--green)) 50%,var(--line));
  box-shadow:var(--elev-2),0 0 22px color-mix(in srgb,var(--cat,var(--green)) 20%,transparent)}
.vuln-card:hover::after{opacity:1;animation:cardSheen .9s var(--ease) 1}
.vuln-card .vc-top{display:flex;align-items:center;justify-content:space-between;gap:8px}
.vuln-card .vc-ic{width:30px;height:30px;border-radius:8px;display:grid;place-items:center;flex:none;color:var(--cat,var(--green));
  background:color-mix(in srgb,var(--cat,var(--green)) 13%,var(--bg-inset));border:1px solid color-mix(in srgb,var(--cat,var(--green)) 38%,var(--line))}
.vuln-card .vc-name{font-weight:650;font-size:15px;color:var(--ink);line-height:1.25}
.vuln-card .vc-desc{font-size:12.5px;color:var(--ink-dim);line-height:1.45;flex:1;
  display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.vuln-card .vc-foot{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:3px;padding-top:9px;border-top:1px solid var(--line-soft)}
.vuln-card .vc-cat{font-family:var(--font-mono);font-size:10px;letter-spacing:.5px;text-transform:uppercase;color:var(--cat,var(--green));opacity:.9}
.vuln-card .vc-go{font-family:var(--font-mono);font-size:11px;color:var(--ink-faint);transition:color .15s var(--ease),transform .15s var(--ease)}
.vuln-card:hover .vc-go{color:var(--cat,var(--green));transform:translateX(2px)}

/* ---- kategori başlığı (dizin + akademi) ---- */
.cat-h{display:flex;align-items:center;gap:10px;margin-bottom:12px}
.cat-h[data-cat="core"]{--cat:var(--cat-core)} .cat-h[data-cat="auth"]{--cat:var(--cat-auth)} .cat-h[data-cat="modern"]{--cat:var(--cat-modern)}
.cat-h .cdot{width:9px;height:9px;border-radius:3px;flex:none;background:var(--cat,var(--green));box-shadow:0 0 10px var(--cat,var(--green))}
.cat-h h2{font-size:16px;margin:0;font-family:var(--font-mono);letter-spacing:.3px}
.cat-h .csub{margin-left:auto}
.empty-state{padding:34px 20px;text-align:center;color:var(--ink-dim);border:1px dashed var(--line);border-radius:var(--radius-lg);background:var(--bg-1)}
.empty-state .ee{font-size:30px;display:block;margin-bottom:8px;filter:grayscale(.2)}

/* ---- konfeti (kutlama) ---- */
.confetti{position:fixed;inset:0;pointer-events:none;z-index:1200;overflow:hidden}
.confetti .cf{position:absolute;top:-18px;border-radius:1px;animation-name:confettiFall;animation-timing-function:cubic-bezier(.3,.6,.5,1);animation-fill-mode:forwards;will-change:transform,opacity}

/* alt çubuk */
.footer{grid-area:foot;display:flex;align-items:center;gap:18px;padding:0 16px;background:var(--bg-1);border-top:1px solid var(--line);
  font-family:var(--font-mono);font-size:11.5px;color:var(--ink-faint)}
.footer .seg b{color:var(--ink-dim)} .footer .spacer{flex:1} .footer .lvlchip{color:var(--ink)}

/* ---- panel butonları ---- */
.kbtn{display:inline-flex;align-items:center;gap:8px;padding:9px 16px;border-radius:var(--radius);border:1px solid var(--line);
  background:var(--bg-2);color:var(--ink);font-size:14px;font-weight:500;cursor:pointer;
  transition:background .15s var(--ease),border-color .15s var(--ease),filter .15s var(--ease),transform .08s var(--ease)}
.kbtn:hover{background:var(--bg-3);border-color:#4d5743}
.kbtn:active{transform:translateY(1px)}
.kbtn:disabled{opacity:.55;cursor:default}
.kbtn.primary{background:linear-gradient(180deg,#7cb531,#5c8a23);border-color:#4e7a1d;color:#11160a;font-weight:600;text-shadow:0 1px 0 rgba(255,255,255,.15);box-shadow:0 4px 14px rgba(124,181,49,.18)}
.kbtn.primary:hover{filter:brightness(1.08)}
.kbtn.ghost{background:none} .kbtn.ghost:hover{background:var(--bg-2)}
.kbtn.danger{color:var(--red-bright);border-color:#5a2c1f;background:#2a1c17} .kbtn.danger:hover{background:#33211a}
.kbtn.sm{padding:5px 11px;font-size:12.5px}

/* ---- flag yakalama bandı (ince kutlama) ---- */
.flag-banner{position:relative;display:flex;align-items:center;gap:12px;margin-top:14px;padding:13px 17px;border-radius:var(--radius);
  border:1px solid var(--green-deep);background:linear-gradient(180deg,#20290f,#1a2110);color:var(--green-bright);
  font-family:var(--font-mono);box-shadow:0 0 22px var(--green-glow);overflow:hidden;animation:popIn .4s var(--ease) both}
.flag-banner::after{content:"";position:absolute;top:0;bottom:0;width:42%;
  background:linear-gradient(100deg,transparent,rgba(182,242,74,.18),transparent);animation:glowSweep 1.4s var(--ease) .15s 1}
.flag-banner .lbl{font-size:11px;letter-spacing:1px;text-transform:uppercase;color:var(--green)}
.flag-banner .val{font-size:15px;font-weight:600}

/* ---- seviye segment kontrolü ---- */
.levelseg{display:inline-flex;border:1px solid var(--line);border-radius:var(--radius);overflow:hidden}
.levelseg button{padding:7px 16px;background:var(--bg-2);border:0;border-right:1px solid var(--line);color:var(--ink-dim);
  font-family:var(--font-mono);font-size:12px;letter-spacing:.5px;text-transform:uppercase;cursor:pointer;transition:background .15s var(--ease),color .15s var(--ease)}
.levelseg button:last-child{border-right:0}
.levelseg button:hover{background:var(--bg-3);color:var(--ink)}
.levelseg button.on{color:#11160a;font-weight:700}
.levelseg button.on[data-l="low"]{background:var(--lvl-low)} .levelseg button.on[data-l="medium"]{background:var(--lvl-medium)} .levelseg button.on[data-l="high"]{background:var(--lvl-high)}

/* ---- durum noktası (makine) ---- */
.dotstat{width:8px;height:8px;border-radius:50%;display:inline-block}
.dotstat.run{background:var(--green-bright);animation:pulseOk 1.8s var(--ease) infinite}
.dotstat.boot{background:var(--amber);animation:pulseDot 1.4s var(--ease) infinite}

/* ---- ilerleme çubuğu / halka ---- */
.bar{height:10px;background:var(--bg-inset);border-radius:100px;overflow:hidden;border:1px solid var(--line)}
.bar>i{display:block;height:100%;background:linear-gradient(90deg,var(--green-deep),var(--green-bright));box-shadow:0 0 12px var(--green-glow);transition:width .6s var(--ease)}
.ring{transform:rotate(-90deg)}
.ring circle{fill:none;stroke-width:9;stroke-linecap:round}
.ring .trk{stroke:var(--bg-inset)}
.ring .val{stroke:var(--green-bright);transition:stroke-dashoffset .8s var(--ease)}

/* ============================ YENİ SAYFALAR ============================ */
/* karşılama / onboarding */
.hero{position:relative;overflow:hidden;background:radial-gradient(700px 240px at 12% -40%,rgba(143,207,63,.16),transparent 70%),radial-gradient(560px 200px at 96% 120%,rgba(111,179,217,.10),transparent 70%),var(--panel-grad);background-size:160% 160%;animation:gradientShift 22s var(--ease) infinite}
.hero::after{content:"";position:absolute;inset:0;pointer-events:none;opacity:.4;z-index:0;
  background:linear-gradient(transparent 0 27px,rgba(143,207,63,.05) 27px 28px),linear-gradient(90deg,transparent 0 27px,rgba(143,207,63,.05) 27px 28px);
  background-size:28px 28px;-webkit-mask-image:radial-gradient(circle at 82% -10%,#000,transparent 70%);mask-image:radial-gradient(circle at 82% -10%,#000,transparent 70%)}
.hero>*{position:relative;z-index:1}
.steps{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
.step{position:relative;padding:18px;border:1px solid var(--line);border-radius:var(--radius-lg);background:var(--bg-1)}
.step .n{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;font-family:var(--font-mono);font-weight:700;
  color:#11160a;background:var(--green);margin-bottom:11px;box-shadow:0 0 14px var(--green-glow)}
.step h3{margin:0 0 5px;font-size:15px}
.step p{margin:0;color:var(--ink-dim);font-size:13.5px;line-height:1.5}
.step .arr{position:absolute;right:-12px;top:50%;transform:translateY(-50%);color:var(--line);font-size:18px;z-index:1}

/* ============================ ONBOARDING / SİHİRBAZ ============================ */
/* animasyonlu giriş/kurulum arka planı */
.auth-bg{position:fixed;inset:0;z-index:0;overflow:hidden;pointer-events:none}
.auth-bg::before{content:"";position:absolute;inset:-25%;
  background:
    radial-gradient(620px 360px at 18% 14%,rgba(143,207,63,.16),transparent 60%),
    radial-gradient(560px 320px at 84% 84%,rgba(111,179,217,.12),transparent 60%),
    radial-gradient(700px 420px at 78% 6%,rgba(143,207,63,.08),transparent 60%);
  background-size:170% 170%;animation:gradientShift 20s var(--ease) infinite}
.auth-bg::after{content:"";position:absolute;inset:0;opacity:.5;
  background:linear-gradient(transparent 0 31px,rgba(143,207,63,.05) 31px 32px),
            linear-gradient(90deg,transparent 0 31px,rgba(143,207,63,.05) 31px 32px);
  background-size:32px 32px;-webkit-mask-image:radial-gradient(circle at 50% 38%,#000,transparent 72%);
  mask-image:radial-gradient(circle at 50% 38%,#000,transparent 72%)}
.auth-card{position:relative;z-index:1;animation:popIn .45s var(--ease) both}

/* adım göstergesi (stepper) */
.wdots{display:flex;align-items:center;margin-bottom:16px}
.wdots .wd{display:flex;align-items:center;flex:1}
.wdots .wd:last-child{flex:none}
.wdots .wd .b{width:28px;height:28px;border-radius:50%;flex:none;display:grid;place-items:center;
  font-family:var(--font-mono);font-size:12.5px;font-weight:700;border:1px solid var(--line);
  background:var(--bg-inset);color:var(--ink-faint);transition:background .3s var(--ease),color .3s var(--ease),border-color .3s var(--ease),box-shadow .3s var(--ease)}
.wdots .wd.on .b{background:var(--green);border-color:var(--green-deep);color:#11160a;box-shadow:0 0 13px var(--green-glow)}
.wdots .wd.done .b{background:#1c2412;border-color:var(--green-deep);color:var(--green-bright)}
.wdots .wd .ln{flex:1;height:2px;background:var(--line);margin:0 7px;border-radius:2px;transition:background .35s var(--ease)}
.wdots .wd.done .ln{background:var(--green-deep)}
.wstep{animation:stepIn .34s var(--ease) both}

/* büyük seçim kartları (Bireysel / Öğretmen) */
.choice-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.choice-card{position:relative;text-align:left;display:flex;flex-direction:column;gap:9px;padding:20px;
  border:1px solid var(--line);border-radius:var(--radius-lg);background:var(--bg-1);cursor:pointer;width:100%;
  font-family:inherit;transition:transform .18s var(--ease),box-shadow .18s var(--ease),border-color .18s var(--ease)}
.choice-card:hover{transform:translateY(-3px);border-color:var(--green-deep);box-shadow:0 0 22px var(--green-glow)}
.choice-card.on{border-color:var(--green-deep);background:linear-gradient(180deg,#1d2512,#191e10);box-shadow:0 0 22px var(--green-glow)}
.choice-card .ci{width:42px;height:42px;border-radius:11px;display:grid;place-items:center;font-size:22px;
  background:#1c2118;border:1px solid var(--green-deep);box-shadow:0 0 14px var(--green-glow) inset}
.choice-card.on .ci{animation:haloPulse 2.4s var(--ease) infinite}
.choice-card h3{margin:0;font-size:16px}
.choice-card p{margin:0;color:var(--ink-dim);font-size:13px;line-height:1.5}
.choice-card .now{position:absolute;top:13px;right:13px}

/* kopyalanabilir komut kutusu */
.cmd{display:flex;align-items:center;gap:10px;padding:11px 13px;border-radius:var(--radius);
  background:var(--bg-inset);border:1px solid var(--line);font-family:var(--font-mono);font-size:13px}
.cmd .pr{color:var(--green);flex:none;-webkit-user-select:none;user-select:none}
.cmd code{flex:1;color:var(--ink);background:none;border:0;padding:0;word-break:break-all;white-space:pre-wrap}
.cmd .cp{flex:none;border:1px solid var(--line);background:var(--bg-2);color:var(--ink-dim);border-radius:5px;
  padding:5px 10px;font-family:var(--font-mono);font-size:11px;cursor:pointer;transition:background .15s var(--ease),color .15s var(--ease),border-color .15s var(--ease)}
.cmd .cp:hover{background:var(--bg-3);color:var(--ink)}
.cmd .cp.ok{color:var(--green-bright);border-color:var(--green-deep);animation:copyPop .3s var(--ease)}

/* numaralı dikey adım listesi (rehber / sınıf kurulumu) */
.flow{display:flex;flex-direction:column}
.flow .fl{display:flex;gap:14px;padding:15px 0;border-top:1px solid var(--line-soft);animation:staggerUp .42s var(--ease) both}
.flow .fl:first-child{border-top:0;padding-top:2px}
.flow .fl .fn{width:27px;height:27px;border-radius:50%;flex:none;display:grid;place-items:center;
  font-family:var(--font-mono);font-weight:700;font-size:12.5px;color:#11160a;background:var(--green);box-shadow:0 0 12px var(--green-glow)}
.flow .fl .fc{flex:1;display:flex;flex-direction:column;gap:9px;min-width:0}
.flow .fl h4{margin:0;font-size:14.5px}
.flow .fl p{margin:0;color:var(--ink-dim);font-size:13px;line-height:1.55}

/* akademi */
.cat-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px}
.learn-sec{padding:14px 0;border-top:1px solid var(--line-soft)}
.learn-sec:first-child{border-top:0;padding-top:0}
.learn-sec .lk{display:flex;align-items:center;gap:8px;font-family:var(--font-mono);font-size:11px;letter-spacing:.6px;text-transform:uppercase;color:var(--accent);margin-bottom:6px}
.learn-sec p{margin:0;color:var(--ink-dim);font-size:14px;line-height:1.6}
details.lrn>summary{list-style:none;cursor:pointer} details.lrn>summary::-webkit-details-marker{display:none}
details.lrn .pm::after{content:"＋";color:var(--ink-faint)} details.lrn[open] .pm::after{content:"－";color:var(--green)}
details.lrn[open]>summary{border-bottom:1px solid var(--line-soft)}

/* rozetler */
.badge-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:13px}
.badge{display:flex;flex-direction:column;align-items:center;text-align:center;gap:7px;padding:18px 12px;border:1px solid var(--line);
  border-radius:var(--radius-lg);background:var(--bg-1);transition:transform .18s var(--ease),box-shadow .18s var(--ease)}
.badge.on{border-color:var(--green-deep);background:linear-gradient(180deg,#1d2512,#191e10);box-shadow:0 0 18px var(--green-glow);animation:popIn .4s var(--ease) both}
.badge.on:hover{transform:translateY(-3px)}
.badge .emo{font-size:30px;line-height:1;filter:grayscale(1) opacity(.4)}
.badge.on .emo{filter:none}
.badge .bt{font-size:13px;font-weight:600;color:var(--ink)} .badge.on .bt{color:var(--green-bright)}
.badge .bd{font-size:11px;color:var(--ink-faint);line-height:1.4}

/* öğretmen matrisi */
.mtx{width:100%;border-collapse:collapse;font-size:12.5px}
.mtx th,.mtx td{padding:8px 10px;border-bottom:1px solid var(--line-soft);text-align:left}
.mtx th{font-family:var(--font-mono);font-size:10.5px;letter-spacing:.5px;text-transform:uppercase;color:var(--ink-faint);font-weight:600}
.mtx td.c{text-align:center}
.mtx .cell{display:inline-grid;place-items:center;width:26px;height:20px;border-radius:4px;font-family:var(--font-mono);font-size:9px;font-weight:700;border:1px solid var(--line);background:var(--bg-inset);color:var(--ink-faint)}
.mtx .cell.y{color:#11160a;border-color:var(--green-deep)}
.mtx .cell.y[data-l="low"]{background:var(--lvl-low)} .mtx .cell.y[data-l="medium"]{background:var(--lvl-medium)} .mtx .cell.y[data-l="high"]{background:var(--lvl-high)}
.mtx tr:hover td{background:rgba(143,207,63,.03)}

/* ============================ İNTERAKTİF TUR (spotlight) ============================ */
.tour-root{position:fixed;inset:0;z-index:1000}
.tour-backdrop{position:fixed;inset:0;background:transparent;cursor:pointer}
.tour-spot{position:fixed;border-radius:8px;border:2px solid var(--green);pointer-events:none;
  box-shadow:0 0 0 9999px rgba(9,11,8,.72),0 0 18px var(--green-glow);
  transition:top .3s var(--ease),left .3s var(--ease),width .3s var(--ease),height .3s var(--ease)}
.tour-pop{position:fixed;z-index:1001;width:330px;max-width:calc(100vw - 24px);background:var(--panel-grad);
  border:1px solid var(--green-deep);border-radius:var(--radius-lg);box-shadow:var(--elev-2);padding:16px 18px;animation:popIn .3s var(--ease) both}
.tour-pop h3{margin:3px 0 6px;font-size:16px}
.tour-pop p{margin:0 0 12px;color:var(--ink-dim);font-size:13.5px;line-height:1.55}
.tour-dots{display:flex;gap:6px;margin-bottom:13px}
.tour-dots span{width:7px;height:7px;border-radius:50%;background:var(--line);transition:background .2s var(--ease)}
.tour-dots span.on{background:var(--green);box-shadow:0 0 7px var(--green-glow)}
.tour-dots span.done{background:var(--green-deep)}
.tour-nav{display:flex;align-items:center;gap:8px}

/* ============================ TOAST BİLDİRİMLERİ ============================ */
.toaster{position:fixed;right:18px;bottom:42px;z-index:1100;display:flex;flex-direction:column;gap:8px;align-items:flex-end}
.toast{padding:11px 15px;border-radius:var(--radius);background:var(--bg-3);border:1px solid var(--line);color:var(--ink);
  font-size:13.5px;box-shadow:var(--elev-2);animation:flagIn .25s var(--ease) both;max-width:360px}
.toast.ok{border-color:var(--green-deep);background:linear-gradient(180deg,#1f2712,#1a2110);color:var(--green-bright)}
.toast.warn{border-color:#5c4a1c;background:#251f10;color:var(--amber)}
.toast.err{border-color:#5a2c1f;background:#2a1c17;color:var(--red-bright)}

/* ============================ LABORATUVAR KARTI İLERLEME ÇUBUĞU ============================ */
.vc-bar{height:5px;border-radius:100px;background:var(--bg-inset);overflow:hidden;border:1px solid var(--line)}
.vc-bar>i{display:block;height:100%;background:linear-gradient(90deg,var(--green-deep),var(--green-bright));transition:width .5s var(--ease)}
.tag.prog{color:var(--green-bright);border-color:var(--green-deep)}
.tag.assign{color:var(--amber);border-color:#5c4a1c;background:#251f10}

/* ============================ AKADEMİ YOL HARİTASI ============================ */
.roadmap{display:flex;flex-direction:column;gap:14px}
.rm-mod{position:relative;display:flex;gap:16px;align-items:flex-start;width:100%;text-align:left;cursor:pointer;font-family:inherit;
  padding:16px 18px;border:1px solid var(--line);border-radius:var(--radius-lg);background:var(--bg-1);
  transition:transform .16s var(--ease),border-color .16s var(--ease),box-shadow .16s var(--ease)}
.rm-mod:hover{transform:translateY(-2px);border-color:var(--green-deep);box-shadow:0 0 18px var(--green-glow)}
.rm-mod.done{border-color:var(--green-deep);background:linear-gradient(180deg,#1b2211,#181d10)}
.rm-mod.locked{cursor:not-allowed;opacity:.65}
.rm-mod.locked:hover{transform:none;border-color:var(--line);box-shadow:none}
.rm-ic{width:42px;height:42px;border-radius:12px;flex:none;display:grid;place-items:center;font-size:21px;background:var(--bg-inset);border:1px solid var(--line)}
.rm-mod.active .rm-ic,.rm-mod.done .rm-ic{background:#1c2412;border-color:var(--green-deep);box-shadow:0 0 14px var(--green-glow)}
.rm-main{flex:1;min-width:0;display:flex;flex-direction:column;gap:7px}
.rm-top{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.rm-top h3{margin:0;font-size:15.5px}
.rm-num{font-family:var(--font-mono);font-size:11px;color:var(--ink-faint)}
.rm-state{margin-left:auto;font-family:var(--font-mono);font-size:11px;color:var(--ink-dim)}
.rm-state.ok{color:var(--green-bright)}
.rm-desc{margin:0;color:var(--ink-dim);font-size:13px;line-height:1.5}
.rm-bar{height:6px;margin-top:2px}
.rm-lock{font-size:12px;color:var(--amber);font-family:var(--font-mono)}

/* ===================== AKADEMİ ZAMAN TÜNELİ (zigzag — ortada omurga, sağlı-sollu) ===================== */
.tl{position:relative;display:flex;flex-direction:column;gap:20px;padding:6px 0;max-width:960px;margin:0 auto}
.tl::before{content:"";position:absolute;left:50%;top:8px;bottom:8px;width:2px;transform:translateX(-50%);
  background:linear-gradient(180deg,transparent,var(--green-deep) 7%,var(--green-deep) 93%,transparent);opacity:.65}
.tl-item{position:relative;display:grid;grid-template-columns:1fr 1fr;column-gap:52px;align-items:center}
.tl-node{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:2;
  width:38px;height:38px;border-radius:50%;display:grid;place-items:center;
  font-family:var(--font-mono);font-size:14px;font-weight:600;
  border:2px solid var(--line);background:var(--bg-inset);color:var(--ink-dim);box-shadow:0 0 0 5px var(--bg-0)}
.tl-item.active .tl-node{border-color:var(--green-deep);color:var(--green-bright);box-shadow:0 0 0 5px var(--bg-0),0 0 18px var(--green-glow)}
.tl-item.done .tl-node{border-color:var(--green-deep);background:var(--green);color:#11160a;box-shadow:0 0 0 5px var(--bg-0),0 0 18px var(--green-glow)}
.tl-item.locked .tl-node{opacity:.7}
.tl-card{position:relative;grid-column:1;display:block;width:100%;text-align:left;cursor:pointer;font-family:inherit;color:inherit;
  border:1px solid var(--line);border-radius:var(--radius-lg);background:var(--bg-1);overflow:hidden;
  transition:transform .16s var(--ease),border-color .16s var(--ease),box-shadow .16s var(--ease)}
.tl-item.right .tl-card{grid-column:2}
.tl-card:hover{transform:translateY(-2px);border-color:var(--green-deep);box-shadow:0 0 20px var(--green-glow)}
.tl-card:focus-visible{outline:var(--focus);outline-offset:2px}
.tl-item.done .tl-card{border-color:var(--green-deep);background:linear-gradient(180deg,#1b2211,#181d10)}
.tl-item.locked .tl-card{cursor:not-allowed;opacity:.6}
.tl-item.locked .tl-card:hover{transform:none;border-color:var(--line);box-shadow:none}
.tl-card::after{content:"";position:absolute;top:50%;transform:translateY(-50%);width:28px;height:2px;background:var(--line);z-index:0}
.tl-item.left .tl-card::after{right:-28px}
.tl-item.right .tl-card::after{left:-28px}
.tl-item.active .tl-card::after,.tl-item.done .tl-card::after{background:var(--green-deep)}
.tl-figure{position:relative;height:120px;display:grid;place-items:center;overflow:hidden;
  background:radial-gradient(130% 100% at 50% 0,#1d2415,#13160f);border-bottom:1px solid var(--line)}
.tl-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
.tl-emoji{font-size:44px;opacity:.5;filter:drop-shadow(0 0 14px var(--green-glow))}
.tl-body{padding:13px 15px;display:flex;flex-direction:column;gap:7px}
.tl-top{display:flex;align-items:center;gap:9px;flex-wrap:wrap}
.tl-top h3{margin:0;font-size:15px}
.tl-num{font-family:var(--font-mono);font-size:11px;color:var(--ink-faint)}
.tl-state{margin-left:auto;font-family:var(--font-mono);font-size:11px;color:var(--ink-dim)}
.tl-state.ok{color:var(--green-bright)}
.tl-desc{margin:0;color:var(--ink-dim);font-size:12.5px;line-height:1.5}
.tl-bar{height:6px;margin-top:2px}
.tl-lock{font-size:11.5px;color:var(--amber);font-family:var(--font-mono)}
@media (max-width:720px){
  .tl{max-width:none}
  .tl::before{left:18px}
  .tl-item{grid-template-columns:1fr;column-gap:0;padding-left:50px}
  .tl-item.left .tl-card,.tl-item.right .tl-card{grid-column:1}
  .tl-node{left:18px}
  .tl-card::after,.tl-item.left .tl-card::after,.tl-item.right .tl-card::after{left:-32px;right:auto;width:32px}
}

/* ============================ MODÜL OKUYUCU (ders) ============================ */
.modv{display:grid;grid-template-columns:248px 1fr;gap:20px;align-items:start}
.modv-steps{display:flex;flex-direction:column;gap:4px;position:sticky;top:8px}
.modv-step{display:flex;align-items:center;gap:9px;padding:9px 11px;border-radius:var(--radius);border:1px solid transparent;
  background:none;color:var(--ink-dim);font-size:13px;text-align:left;cursor:pointer;font-family:inherit;transition:background .14s var(--ease),color .14s var(--ease)}
.modv-step:hover{background:var(--bg-2);color:var(--ink)}
.modv-step.cur{background:#232a1c;color:var(--green-bright);border-color:var(--green-deep)}
.modv-step .st-n{width:22px;height:22px;border-radius:50%;flex:none;display:grid;place-items:center;font-family:var(--font-mono);font-size:11px;border:1px solid var(--line);background:var(--bg-inset);color:var(--ink-faint)}
.modv-step.done .st-n{background:var(--green);border-color:var(--green-deep);color:#11160a}
.modv-step .st-t{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.lesson-img{display:block;width:100%;max-height:280px;object-fit:cover;border-radius:var(--radius);border:1px solid var(--line);background:var(--bg-inset);margin:0 0 14px}
.lesson-body p{color:var(--ink-dim);font-size:14.5px;line-height:1.65;margin:0 0 12px}
.lesson-ex{display:flex;gap:9px;align-items:flex-start;font-size:13.5px;color:var(--ink-dim);margin:5px 0}
.lesson-ex .bl{color:var(--green);flex:none}
.lesson-cmd{margin:6px 0;padding:10px 13px;border-radius:var(--radius);background:var(--bg-inset);border:1px solid var(--line);
  font-family:var(--font-mono);font-size:12.5px;color:var(--ink);white-space:pre-wrap;word-break:break-word}
.lesson-key{display:flex;gap:9px;align-items:flex-start;padding:12px 14px;border-radius:var(--radius);border:1px solid var(--green-deep);
  background:#1a2110;color:var(--green-bright);font-size:13.5px;line-height:1.5;margin-top:8px}
.lesson-nav{display:flex;align-items:center;gap:10px;justify-content:space-between;margin-top:20px}

/* ============================ MODÜL TESTİ (quiz) ============================ */
.quiz-q{padding:13px 0;border-top:1px solid var(--line-soft)}
.quiz-q:first-of-type{border-top:none;padding-top:2px}
.quiz-qh{display:flex;gap:9px;align-items:flex-start;font-size:14px;color:var(--ink);font-weight:500;margin-bottom:9px}
.quiz-n{flex:none;width:22px;height:22px;border-radius:50%;display:grid;place-items:center;font-family:var(--font-mono);font-size:11px;background:var(--bg-inset);border:1px solid var(--line);color:var(--ink-dim)}
.quiz-choices{display:flex;flex-direction:column;gap:7px;padding-left:31px}
.quiz-choice{display:flex;align-items:center;gap:10px;width:100%;text-align:left;cursor:pointer;font-family:inherit;color:var(--ink-dim);
  padding:9px 12px;border:1px solid var(--line);border-radius:var(--radius);background:var(--bg-1);font-size:13.5px;
  transition:border-color .14s var(--ease),background .14s var(--ease),color .14s var(--ease)}
.quiz-choice:hover:not(:disabled){border-color:var(--green-deep);color:var(--ink)}
.quiz-choice .qc-mark{flex:none;width:15px;height:15px;border-radius:50%;border:2px solid var(--line);background:var(--bg-inset);transition:all .14s var(--ease)}
.quiz-choice.sel{border-color:var(--green-deep);color:var(--ink);background:#1a2110}
.quiz-choice.sel .qc-mark{border-color:var(--green);background:var(--green);box-shadow:inset 0 0 0 3px var(--bg-1)}
.quiz-choice.correct{border-color:var(--green-deep);background:#1a2110;color:var(--green-bright)}
.quiz-choice.correct .qc-mark{border-color:var(--green);background:var(--green)}
.quiz-choice.wrong{border-color:var(--red);background:#26140f;color:var(--red-bright)}
.quiz-choice.wrong .qc-mark{border-color:var(--red);background:var(--red)}
.quiz-choice:disabled{cursor:default}
.quiz-explain{margin:8px 0 2px 31px;font-size:12.5px;line-height:1.5;color:var(--ink-dim)}
.quiz-explain.ok{color:var(--green-bright)}
.quiz-explain.no{color:var(--amber)}
.quiz-banner{align-items:flex-start}
.quiz-banner.ok{border-left-color:var(--green)}
.quiz-banner.warn{border-left-color:var(--amber)}

/* ============================ XP / SEVİYE / SERİ (oyunlaştırma) ============================ */
.xp-panel{background:linear-gradient(180deg,#1b2211,var(--bg-1))}
.xp-level{display:flex;align-items:center;gap:12px;flex:none}
.xp-ic{font-size:38px;line-height:1;filter:drop-shadow(0 0 12px var(--green-glow))}
.xp-lname{font-size:18px;font-weight:650;color:var(--green-bright)}
.xp-lnum{font-family:var(--font-mono);font-size:11px;color:var(--ink-faint);text-transform:uppercase;letter-spacing:.5px}
.xp-bar{height:9px}
.xp-bar>i{background:linear-gradient(90deg,var(--green-deep),var(--green-bright))}
.xp-stats{display:flex;gap:10px;flex-wrap:wrap;flex:none}
.xp-stat{display:flex;flex-direction:column;gap:2px;align-items:center;min-width:60px;padding:8px 10px;border:1px solid var(--line);border-radius:var(--radius);background:var(--bg-inset)}
.xs-v{font-family:var(--font-mono);font-size:15px;font-weight:700;color:var(--ink)}
.xs-l{font-family:var(--font-mono);font-size:9.5px;text-transform:uppercase;letter-spacing:.4px;color:var(--ink-faint);white-space:nowrap}

/* ============================ SUNUM MODU ============================ */
.present-bar{display:flex;align-items:center;gap:10px;padding:10px 16px;margin-bottom:16px;border-radius:var(--radius);
  border:1px solid var(--green-deep);background:linear-gradient(180deg,#20290f,#1a2110);color:var(--green-bright);font-size:13.5px;animation:popIn .3s var(--ease) both}
.present-bar .live{width:9px;height:9px;border-radius:50%;flex:none;background:var(--green-bright);box-shadow:0 0 8px var(--green-bright);animation:pulseOk 1.8s var(--ease) infinite}
.present-slide{border:1px solid var(--green-deep);border-radius:var(--radius-lg);background:var(--panel-grad);padding:32px 36px;box-shadow:0 0 30px var(--green-glow)}
.present-slide h2{font-size:25px;margin:0 0 18px;letter-spacing:-.3px}
.present-slide .lesson-body p{font-size:17px;line-height:1.7;color:var(--ink)}
.present-slide .lesson-ex{font-size:15.5px}
.present-slide .lesson-cmd{font-size:14.5px}

/* ============================ SINIF ISI HARİTASI ============================ */
.heat{display:flex;flex-direction:column;gap:3px}
.heat-row{display:flex;align-items:center;gap:8px}
.heat-row .hl{flex:1;min-width:0;font-size:12.5px;color:var(--ink-dim);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.heat-cell{flex:none;width:54px;height:20px;border-radius:4px;display:grid;place-items:center;font-family:var(--font-mono);font-size:10px;font-weight:700;border:1px solid var(--line);color:var(--ink)}

@media (max-width:860px){
  .app{grid-template-columns:1fr;grid-template-areas:"brand" "header" "main" "foot";grid-template-rows:54px 48px 1fr 30px}
  .sidebar{display:none}
  .grid2,.steps,.choice-grid,.modv{grid-template-columns:1fr}
  .modv-steps{position:static}
  .step .arr{display:none}
}

/* ---- bildirim merkezi (zil + açılır liste) ---- */
.noticenter{position:relative;display:inline-flex}
.bell{position:relative;background:none;border:1px solid var(--line);border-radius:var(--radius);padding:6px 10px;font-size:15px;cursor:pointer;color:var(--ink);line-height:1}
.bell:hover{background:var(--bg-2)}
.bell-badge{position:absolute;top:-6px;right:-6px;min-width:17px;height:17px;padding:0 4px;border-radius:9px;background:var(--red-bright,#e5534b);color:#fff;font-size:10px;font-weight:700;font-family:var(--font-mono);display:grid;place-items:center;box-shadow:0 0 0 2px var(--bg-1,#11140d)}
.noti-pop{position:absolute;top:calc(100% + 8px);right:0;width:340px;max-width:88vw;background:var(--bg-2);border:1px solid var(--line);border-radius:var(--radius);box-shadow:0 12px 36px rgba(0,0,0,.45);z-index:80;overflow:hidden}
.noti-h{display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid var(--line-soft);font-family:var(--font-mono);font-size:12px;color:var(--ink-dim);text-transform:uppercase;letter-spacing:.5px}
.noti-list{max-height:380px;overflow-y:auto}
.noti-empty{padding:20px 14px;text-align:center;color:var(--ink-faint);font-size:13px}
.noti-item{display:flex;gap:9px;padding:10px 12px;border-bottom:1px solid var(--line-soft)}
.noti-item.unread{background:rgba(124,181,49,.07)}
.noti-item.urgent{background:rgba(229,83,75,.09)}
.noti-ic{flex:none;font-size:15px;line-height:1.3}
.noti-body{min-width:0;flex:1}
.noti-title{font-weight:600;font-size:13px;color:var(--ink)}
.noti-text{font-size:13px;color:var(--ink-dim);word-break:break-word}
.noti-text b{color:var(--ink)}
.noti-ts{display:flex;align-items:center;gap:7px;margin-top:3px;font-family:var(--font-mono);font-size:10px;color:var(--ink-faint)}
.noti-urgent{color:var(--red-bright,#e5534b);font-weight:700}

/* ════════════════ FAZ 2 — RESPONSIVE APP-SHELL ════════════════ */
/* Dar ekran: sabit sidebar yerine üstten açılır çekmece; ana alan tam genişlik. */
@media (max-width:860px){
  .app{grid-template-columns:1fr;grid-template-rows:54px auto 1fr 30px;
    grid-template-areas:"brand" "header" "main" "foot"}
  .brand-corner{grid-area:brand}
  .side{position:fixed;top:0;left:0;bottom:0;width:264px;z-index:160;transform:translateX(-100%);
    transition:transform .22s var(--ease);box-shadow:var(--elev-2)}
  .app.nav-open .side{transform:translateX(0)}
  .app.nav-open::after{content:"";position:fixed;inset:0;z-index:150;background:rgba(8,10,7,.5)}
  .nav-toggle{display:inline-flex !important}
  .main{padding:18px 16px}
}
.nav-toggle{display:none;align-items:center;justify-content:center;width:34px;height:34px;flex:none;
  background:var(--bg-2);border:1px solid var(--line);border-radius:var(--radius-sm);color:var(--ink);cursor:pointer;font-size:16px}
@media (max-width:560px){
  .vuln-grid,.vulns{grid-template-columns:1fr !important}
  .page-h h1{font-size:21px}
}
`;

// ---- Yalnızca standalone hedef sayfaları (machine-ui) ----------------------
const TARGET_CSS = `
/* ---- hedef sayfa navbar ---- */
.nav{display:flex;align-items:center;gap:12px;padding:14px 24px;background:var(--glass);backdrop-filter:blur(8px);border-bottom:1px solid var(--line);position:sticky;top:0;z-index:10}
.nav img{height:30px;width:auto;max-width:84px;object-fit:contain;filter:drop-shadow(0 0 6px var(--green-glow))}
.nav .brand{font-family:var(--font-mono);font-weight:700;font-size:16px;letter-spacing:.3px}
.nav .brand span{color:var(--ink-faint);font-weight:400}
.nav .badge{margin-left:auto;font-family:var(--font-mono);font-size:12px;padding:5px 12px;border-radius:100px;color:var(--lvl-low);border:1px solid currentColor;background:rgba(0,0,0,.18)}
.nav .badge[data-l="medium"]{color:var(--lvl-medium)} .nav .badge[data-l="high"]{color:var(--lvl-high)}

/* ---- yerleşim ---- */
.wrap{max-width:920px;margin:36px auto;padding:0 20px;display:flex;flex-direction:column;gap:20px}
.center{min-height:100vh;display:grid;place-items:center;padding:24px}

/* ---- kart ---- */
.card{width:400px;max-width:100%;background:var(--panel-grad);border:1px solid var(--line);border-radius:var(--radius-lg);box-shadow:var(--elev-2)}
.card .hd{padding:13px 18px;border-bottom:1px solid var(--line-soft);font-family:var(--font-mono);font-size:12px;letter-spacing:.5px;text-transform:uppercase;color:var(--ink-dim)}
.card .bd{padding:22px 20px}
.brand{display:flex;gap:11px;align-items:center;justify-content:center;margin-bottom:20px}
.brand img{height:48px;width:auto;max-width:140px;object-fit:contain;filter:drop-shadow(0 0 12px var(--green-glow))}
.brand .t{font-family:var(--font-mono);font-weight:700;font-size:16px} .brand .t span{color:var(--ink-faint);font-weight:400}

/* ---- form ---- */
label{display:block;font-family:var(--font-mono);font-size:11px;letter-spacing:.6px;text-transform:uppercase;color:var(--ink-faint);margin:0 0 6px}
.input-group{margin-bottom:15px}
input,textarea,select{width:100%;padding:10px 13px;background:var(--bg-inset);border:1px solid var(--line);border-radius:var(--radius);
  color:var(--ink);font-family:var(--font-mono);font-size:13.5px;outline:none;transition:border-color .15s var(--ease),box-shadow .15s var(--ease)}
input:focus,textarea:focus,select:focus{border-color:var(--accent-deep);box-shadow:var(--ring)}
textarea{resize:vertical;min-height:74px;line-height:1.55}

/* ---- buton ---- */
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:10px 18px;border-radius:var(--radius);border:1px solid var(--line);
  background:var(--bg-2);color:var(--ink);font-family:var(--font-sans);font-size:14px;font-weight:500;cursor:pointer;transition:background .15s var(--ease),border-color .15s var(--ease),filter .15s var(--ease),transform .08s var(--ease)}
.btn:hover{background:var(--bg-3);border-color:#4d5743} .btn:active{transform:translateY(1px)}
.btn.primary{background:linear-gradient(180deg,#7cb531,#5c8a23);border-color:#4e7a1d;color:#11160a;font-weight:600;text-shadow:0 1px 0 rgba(255,255,255,.15)}
.btn.primary:hover{filter:brightness(1.08)} .btn.danger{color:var(--red-bright);border-color:#5a2c1f;background:#2a1c17}
.btn.ghost{background:none} .btn.block{width:100%}

/* ---- uyarı / not ---- */
.alert{padding:12px 14px;border-radius:var(--radius);background:rgba(217,81,44,.1);border:1px solid #5a2c1f;color:var(--red-bright);font-size:13.5px}
.note{padding:12px 14px;border-radius:var(--radius);background:var(--bg-2);border:1px solid var(--line);border-left:3px solid var(--accent);font-size:13.5px;color:var(--ink-dim);line-height:1.55}
.note b{color:var(--ink)}

/* ---- başarı bandı ---- */
.flag{position:relative;overflow:hidden;display:flex;align-items:center;gap:14px;padding:15px 18px;border-radius:var(--radius-lg);border:1px solid var(--green-deep);
  background:linear-gradient(180deg,#20290f,#1a2110);color:var(--green-bright);font-family:var(--font-mono);box-shadow:0 0 24px var(--green-glow);animation:popIn .4s var(--ease) both}
.flag::after{content:"";position:absolute;top:0;bottom:0;width:42%;background:linear-gradient(100deg,transparent,rgba(182,242,74,.18),transparent);animation:glowSweep 1.4s var(--ease) .15s 1}
.flag .ic{font-size:20px;line-height:1}
.flag .lbl{font-size:10.5px;letter-spacing:1px;text-transform:uppercase;color:var(--green)}
.flag .val{font-size:15px;font-weight:600;word-break:break-all}
.flag .sub{font-size:11.5px;color:var(--ink-dim);margin-top:2px}
.flag.hidden{display:none}

/* ---- spoiler ipucu/çözüm ---- */
.spoiler{border:1px solid var(--line);border-radius:var(--radius);margin-bottom:8px;background:var(--bg-2)}
.spoiler:last-child{margin-bottom:0}
.spoiler>summary{cursor:pointer;padding:9px 12px;font-family:var(--font-mono);font-size:12.5px;color:var(--ink-dim);list-style:none}
.spoiler>summary::-webkit-details-marker{display:none}
.spoiler>summary:before{content:"▸ ";color:var(--accent)}
.spoiler[open]>summary:before{content:"▾ "}
.spoiler .sp-body{padding:2px 12px 12px;color:var(--ink);font-size:13.5px;line-height:1.6}
.spoiler .sp-body code{background:var(--bg-inset);border:1px solid var(--line);border-radius:3px;padding:2px 6px;font-size:12.5px;word-break:break-all}
.spoiler.sol>summary{color:var(--amber)}

/* ---- fiş (idor vb.) ---- */
.receipt{background:#fff;color:#111;padding:30px;border-radius:4px;font-family:var(--font-mono);box-shadow:0 10px 25px rgba(0,0,0,.5);position:relative}
.receipt .r-h{text-align:center;border-bottom:2px dashed #ccc;padding-bottom:14px;margin-bottom:14px}
.receipt .r-row{display:flex;justify-content:space-between;margin:7px 0;font-size:14px}
.receipt .r-total{border-top:2px dashed #ccc;padding-top:14px;margin-top:14px;font-weight:700;font-size:18px;display:flex;justify-content:space-between}

/* ---- istatistik ---- */
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px}
.stat{background:var(--panel-grad);border:1px solid var(--line);border-radius:var(--radius-lg);padding:18px;display:flex;flex-direction:column;gap:6px}
.stat .k{font-family:var(--font-mono);font-size:11px;color:var(--ink-dim);text-transform:uppercase}
.stat .v{font-size:28px;font-weight:800;color:var(--accent-bright);font-family:var(--font-mono)}

/* ---- alt bilgi ---- */
.foot{padding:14px 24px;border-top:1px solid var(--line);background:var(--bg-1);font-family:var(--font-mono);font-size:11.5px;color:var(--ink-faint);text-align:center}

@media (max-width:640px){.nav{padding:12px 16px} .wrap{margin:20px auto;padding:0 14px} .card{width:100%}}
`;

module.exports = { SHARED_CSS, PANEL_CSS, TARGET_CSS };
