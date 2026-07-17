// ============================================================================
//  lib/stepProgress.js — SUNUCU-ONLY, dosya-tabanlı ADIM ilerleme deposu.
//  Bandit-tarzı soru motorunun (lib/steps.js) "öğrenci kaçıncı soruya geldi"
//  durumunu tutar. lib/progress.js'in ikizidir ama AYRI dosyaya yazar
//  (data/steps.json) — böylece progress.json şekli + level-matrix regresyon
//  testi etkilenmez.
//
//  Şekil: { global: { [slug]: reachedIndex },
//           users:  { [userId]: { [slug]: reachedIndex } } }
//   reachedIndex = o lab için ÇÖZÜLMÜŞ soru sayısı (0 = hiç; total = bitti).
//   Bireysel/anonim akış global'e, sınıf modu öğrenci users[userId]'e yazar.
// ============================================================================
import fs from "fs";
import path from "path";

const DATA_DIR = process.env.LAB_DATA_DIR || path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "steps.json");
const DANGER = new Set(["__proto__", "constructor", "prototype"]);

function read() {
  try {
    const j = JSON.parse(fs.readFileSync(FILE, "utf-8"), (k, v) => (DANGER.has(k) ? undefined : v));
    if (j && typeof j === "object") {
      return {
        global: j.global && typeof j.global === "object" ? j.global : {},
        users: j.users && typeof j.users === "object" ? j.users : {},
      };
    }
  } catch {}
  return { global: {}, users: {} };
}

function write(state) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(state, null, 2));
  } catch {}
}

const toIdx = (v) => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

// ───────── okuma ─────────
export function getStep(userId, slug) {
  if (!slug) return 0;
  const state = read();
  const map = userId ? state.users[userId] : state.global;
  return map && typeof map === "object" ? toIdx(map[slug]) : 0;
}

// ───────── yazma (yalnız ileri; geri sarmaz) ─────────
export function setStep(userId, slug, idx) {
  if (!slug) return 0;
  const next = toIdx(idx);
  const state = read();
  let map;
  if (userId) {
    if (!state.users[userId] || typeof state.users[userId] !== "object") state.users[userId] = {};
    map = state.users[userId];
  } else {
    map = state.global;
  }
  const cur = toIdx(map[slug]);
  if (next > cur) { map[slug] = next; write(state); return next; }
  map[slug] = cur;
  return cur;
}

// ───────── öğretmen paneli / sıfırlama ─────────
export function getAllSteps() { return read().users; }

export function resetStepUser(userId) {
  const state = read();
  if (userId && state.users[userId]) { delete state.users[userId]; write(state); }
  return {};
}

export function resetSteps() {
  const state = read();
  state.global = {};
  write(state);
  return {};
}
