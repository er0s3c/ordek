// ============================================================================
//  test/ui-regression.mjs — tasarım sistemi regresyon kilidi (CSS string denetimi).
//  Çalıştır:  node test/ui-regression.mjs
//  Amaç: "Zafiyet Dizini'nde zafiyet adları siyah" hatasının geri gelmesini ve
//  v2 kategori/konfeti stillerinin kazara silinmesini engellemek.
// ============================================================================
import assert from "node:assert/strict";
import { SHARED_CSS, PANEL_CSS } from "../lib/ui-css.js";

let pass = 0, fail = 0;
function t(name, fn) {
  try { fn(); pass++; console.log(`\x1b[32mPASS\x1b[0m ${name}`); }
  catch (e) { fail++; console.log(`\x1b[31mFAIL\x1b[0m ${name}\n   ${e && e.message ? e.message : e}`); }
}

/* ───────── siyah-yazı kök neden kilidi ───────── */
t("button kuralı color:inherit içerir (siyah-yazı fix)", () => {
  assert.match(SHARED_CSS, /button\s*\{[^}]*color:\s*inherit/);
});

/* ───────── v2 kategori-renk sistemi ───────── */
t("kategori tokenları tanımlı (--cat-core/auth/modern)", () => {
  for (const tok of ["--cat-core", "--cat-auth", "--cat-modern"]) {
    assert.ok(SHARED_CSS.includes(tok), `eksik token: ${tok}`);
  }
});
t("aktif filtre çipi (.tag.on) stili var", () => {
  assert.ok(SHARED_CSS.includes(".tag.on"));
});

/* ───────── v2 panel stilleri ───────── */
t("yenilenen zafiyet kartı (.vuln-card) ve araç çubuğu (.dash-toolbar) var", () => {
  assert.ok(PANEL_CSS.includes(".vuln-card"));
  assert.ok(PANEL_CSS.includes(".dash-toolbar"));
  assert.ok(PANEL_CSS.includes(".vc-name"));
});
t("konfeti stili + keyframe tanımlı", () => {
  assert.ok(PANEL_CSS.includes(".confetti"), ".confetti sınıfı eksik");
  assert.ok(SHARED_CSS.includes("@keyframes confettiFall"), "confettiFall keyframe eksik");
});

/* ───────── akademi yol haritası + sunum + ısı haritası stilleri ───────── */
t("yol haritası (.roadmap/.rm-mod) ve modül okuyucu (.modv) stilleri var", () => {
  for (const c of [".roadmap", ".rm-mod", ".rm-mod.locked", ".modv", ".modv-step", ".lesson-cmd"]) {
    assert.ok(PANEL_CSS.includes(c), `eksik stil: ${c}`);
  }
});
t("sunum modu (.present-slide/.present-bar) ve ısı haritası (.heat-cell) stilleri var", () => {
  for (const c of [".present-bar", ".present-slide", ".heat", ".heat-cell"]) {
    assert.ok(PANEL_CSS.includes(c), `eksik stil: ${c}`);
  }
});
t("laboratuvar kartı ilerleme çubuğu (.vc-bar) + görev rozeti (.tag.assign) var", () => {
  assert.ok(PANEL_CSS.includes(".vc-bar"));
  assert.ok(PANEL_CSS.includes(".tag.assign"));
});

/* ───────── yeni: zigzag timeline + quiz + XP/oyunlaştırma stilleri ───────── */
t("akademi zigzag timeline (.tl/.tl-item/.tl-node/.tl-card) + sağ-sol + responsive", () => {
  for (const c of [".tl", ".tl-item", ".tl-node", ".tl-card", ".tl-item.right", ".tl-figure"]) {
    assert.ok(PANEL_CSS.includes(c), `eksik timeline stili: ${c}`);
  }
  assert.ok(PANEL_CSS.includes("max-width:720px"), "timeline responsive breakpoint eksik");
  assert.ok(PANEL_CSS.includes(".lesson-img"), "ders görseli stili eksik");
});
t("modül testi (.quiz-choice/.quiz-q) + doğru/yanlış durumları var", () => {
  for (const c of [".quiz-q", ".quiz-choice", ".quiz-choice.correct", ".quiz-choice.wrong", ".quiz-explain"]) {
    assert.ok(PANEL_CSS.includes(c), `eksik quiz stili: ${c}`);
  }
});
t("XP/seviye/seri paneli (.xp-panel/.xp-bar/.xp-stat) stilleri var", () => {
  for (const c of [".xp-panel", ".xp-level", ".xp-bar", ".xp-stat", ".xs-v"]) {
    assert.ok(PANEL_CSS.includes(c), `eksik XP stili: ${c}`);
  }
});

/* ───────── yeni: BRIDGE (BYO-VM) bağlantı topolojisi + port çipleri + animasyonlar ───────── */
t("bridge bağlantı topolojisi (.netflow/.nf-node/.nf-pkt) + paket akış animasyonu var", () => {
  for (const c of [".netflow", ".nf-node", ".nf-link", ".nf-pkt", ".netflow.live"]) {
    assert.ok(SHARED_CSS.includes(c), `eksik netflow stili: ${c}`);
  }
  assert.ok(SHARED_CSS.includes("@keyframes packetFlow"), "packetFlow keyframe eksik");
});
t("yayımlanan port çipleri (.port-chip) + host IP rehber tablosu (.hosttab) var", () => {
  for (const c of [".port-chip", ".pc-arrow", ".hosttab", ".ht-row", ".ht-ip"]) {
    assert.ok(SHARED_CSS.includes(c), `eksik bridge stili: ${c}`);
  }
  assert.ok(SHARED_CSS.includes("@keyframes portPulse"), "portPulse keyframe eksik");
});
t("bağlantı testi: başarı bandı (.cc-ok) + sorun giderme listesi (.tshoot) var", () => {
  for (const c of [".callout.cc-ok", ".tshoot", ".ts-row", ".ts-n"]) {
    assert.ok(SHARED_CSS.includes(c), `eksik conncheck stili: ${c}`);
  }
});

console.log(`\n${pass} geçti, ${fail} başarısız.`);
process.exit(fail ? 1 : 0);
