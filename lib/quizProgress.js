// ============================================================================
//  lib/quizProgress.js — SUNUCU-ONLY modül testi skor deposu.
//  lib/stepProgress.js'in ikizidir ama AYRI dosyaya yazar (data/quiz.json) —
//  böylece progress.json / steps.json şekli ve level-matrix regresyonu etkilenmez.
//
//  Şekil: { global: { [moduleId]: bestScore },
//           users:  { [userId]: { [moduleId]: bestScore } } }
//   bestScore = o modül testinde alınan EN YÜKSEK yüzde (0-100).
//   Bireysel/anonim akış global'e, sınıf modu öğrenci users[userId]'e yazar.
// ============================================================================
import fs from "fs";
import path from "path";

const DATA_DIR = process.env.LAB_DATA_DIR || path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "quiz.json");
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
    const tmp = FILE + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
    fs.renameSync(tmp, FILE); // atomik
  } catch {}
}

const toScore = (v) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 0;
};

// ───────── okuma ─────────
export function getQuizScore(userId, id) {
  if (!id) return 0;
  const state = read();
  const map = userId ? state.users[userId] : state.global;
  return map && typeof map === "object" ? toScore(map[id]) : 0;
}

export function getAllQuizScores(userId) {
  const state = read();
  const map = userId ? state.users[userId] : state.global;
  return map && typeof map === "object" ? { ...map } : {};
}

// ───────── yazma (yalnız EN YÜKSEK skoru tutar) ─────────
export function setQuizScore(userId, id, score) {
  if (!id || DANGER.has(id)) return 0;
  const next = toScore(score);
  const state = read();
  let map;
  if (userId) {
    if (!state.users[userId] || typeof state.users[userId] !== "object") state.users[userId] = {};
    map = state.users[userId];
  } else {
    map = state.global;
  }
  const cur = toScore(map[id]);
  if (next > cur) { map[id] = next; write(state); return next; }
  map[id] = cur;
  return cur;
}

// ───────── öğretmen paneli ─────────
export function getAllUsersQuiz() { return read().users; }

export function resetQuizUser(userId) {
  const state = read();
  if (userId && state.users[userId]) { delete state.users[userId]; write(state); }
  return {};
}
