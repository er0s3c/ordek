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
  /* metin */
  --ink:#dde3d2; --ink-dim:#9aa389; --ink-faint:#6b7360;
  /* aksan — fosfor yeşili */
  --green:#8fcf3f; --green-bright:#b6f24a; --green-deep:#5c8a23; --green-glow:rgba(143,207,63,.22);
  /* durum */
  --amber:#e0a32e; --red:#d9512c; --red-bright:#ef6a44; --blue:#6fb3d9;
  /* seviye renkleri */
  --lvl-low:#d9512c; --lvl-medium:#e0a32e; --lvl-high:#8fcf3f; --lvl-impossible:#6fb3d9;
  /* aksan alias (target sayfaları danger moduna geçebilir) */
  --accent:var(--green); --accent-bright:var(--green-bright); --accent-deep:var(--green-deep);
  /* yarıçap / hareket / yüzey */
  --radius-sm:5px; --radius:7px; --radius-lg:11px;
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
button{font-family:inherit}
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
  text-transform:uppercase;padding:3px 9px;border-radius:100px;border:1px solid var(--line);color:var(--ink-dim)}
.tag.low{color:var(--lvl-low);border-color:#5a2c1f;background:#271812}
.tag.medium{color:var(--lvl-medium);border-color:#5c4a1c;background:#251f10}
.tag.high{color:var(--lvl-high);border-color:#41591f;background:#1c2412}
.tag.solved{color:var(--green-bright);border-color:var(--green-deep);background:#1c2412}

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
}
`;

// ---- Yalnızca kontrol paneli: app-shell + yeni sayfalar --------------------
const PANEL_CSS = `
#root{height:100%}
.app{display:grid;grid-template-columns:264px 1fr;grid-template-rows:54px 1fr 30px;
  grid-template-areas:"brand header" "side main" "side foot";height:100%;min-height:0}

/* marka köşesi */
.brand{grid-area:brand;display:flex;align-items:center;gap:10px;padding:0 18px;background:var(--glass);
  backdrop-filter:blur(8px);border-right:1px solid var(--line);border-bottom:1px solid var(--line)}
.brand-mark{width:28px;height:28px;display:grid;place-items:center;border:1px solid var(--green-deep);border-radius:6px;
  background:#1c2118;color:var(--green-bright);font-family:var(--font-mono);font-weight:700;font-size:15px;box-shadow:0 0 12px var(--green-glow) inset}
.brand-name{font-family:var(--font-mono);font-weight:600;letter-spacing:.4px;font-size:15px}
.brand-name b{color:var(--green-bright);font-weight:700} .brand-name span{color:var(--ink-faint)}

/* üst başlık çubuğu */
.header{grid-area:header;display:flex;align-items:center;gap:16px;padding:0 20px;background:var(--glass);
  backdrop-filter:blur(8px);border-bottom:1px solid var(--line)}
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

@media (max-width:860px){
  .app{grid-template-columns:1fr;grid-template-areas:"brand" "header" "main" "foot";grid-template-rows:54px 48px 1fr 30px}
  .sidebar{display:none}
  .grid2,.steps,.choice-grid{grid-template-columns:1fr}
  .step .arr{display:none}
}
`;

// ---- Yalnızca standalone hedef sayfaları (machine-ui) ----------------------
const TARGET_CSS = `
/* ---- hedef sayfa navbar ---- */
.nav{display:flex;align-items:center;gap:12px;padding:14px 24px;background:var(--glass);backdrop-filter:blur(8px);border-bottom:1px solid var(--line);position:sticky;top:0;z-index:10}
.nav img{width:32px;height:32px;border-radius:6px;border:1px solid var(--accent-deep);object-fit:cover}
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
.brand img{width:38px;height:38px;border-radius:6px;border:1px solid var(--accent-deep);box-shadow:0 0 14px var(--green-glow);object-fit:cover}
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
