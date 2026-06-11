// ============================================================================
//  lib/progress.js — SUNUCU-ONLY, dosya-tabanlı ilerleme deposu (panel konteyneri).
//  Şekil: { solved: { [slug]: ["low",...] },           // legacy/bireysel/anonim global
//           users:  { [userId]: { [slug]: ["low",...] } } }  // sınıf modu, öğrenci-başına
//  Bireysel/anonim akış global `solved`'a yazar (regresyon testi bunu kullanır).
//  Sınıf modunda oturumlu öğrenci `users[userId]`'e yazar.
// ============================================================================
import fs from "fs";
import path from "path";

const DATA_DIR = process.env.LAB_DATA_DIR || path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "progress.json");
const LEVELS = ["low", "medium", "high"];
const DANGER = new Set(["__proto__", "constructor", "prototype"]);

function read() {
  try {
    const j = JSON.parse(fs.readFileSync(FILE, "utf-8"), (k, v) => (DANGER.has(k) ? undefined : v));
    if (j && typeof j === "object") {
      return {
        solved: j.solved && typeof j.solved === "object" ? j.solved : {},
        users: j.users && typeof j.users === "object" ? j.users : {},
      };
    }
  } catch {}
  return { solved: {}, users: {} };
}

function write(state) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(state, null, 2));
  } catch {}
}

const normLevel = (level) => (LEVELS.includes(String(level)) ? String(level) : "low");

function mark(map, slug, level) {
  const lvl = normLevel(level);
  const cur = Array.isArray(map[slug]) ? map[slug] : [];
  if (!cur.includes(lvl)) { cur.push(lvl); map[slug] = cur; return true; }
  map[slug] = cur;
  return false;
}

// ───────── legacy / bireysel / anonim (global) ─────────
export function getProgress() {
  return { solved: read().solved };
}

export function markSolved(slug, level) {
  if (!slug) return getProgress();
  const state = read();
  mark(state.solved, slug, level);
  write(state);
  return { solved: state.solved };
}

export function resetProgress() {
  const state = read();
  state.solved = {};
  write(state);
  return { solved: {} };
}

// ───────── sınıf modu / öğrenci-başına ─────────
export function getUserProgress(userId) {
  if (!userId) return { solved: {} };
  const u = read().users[userId];
  return { solved: u && typeof u === "object" ? u : {} };
}

export function markSolvedFor(userId, slug, level) {
  if (!userId) return markSolved(slug, level);
  if (!slug) return getUserProgress(userId);
  const state = read();
  if (!state.users[userId] || typeof state.users[userId] !== "object") state.users[userId] = {};
  mark(state.users[userId], slug, level);
  write(state);
  return { solved: state.users[userId] };
}

export function resetUser(userId) {
  const state = read();
  if (state.users[userId]) { delete state.users[userId]; write(state); }
  return { solved: {} };
}

// Tüm kullanıcı ilerlemesi (öğretmen paneli): { [userId]: { [slug]: [levels] } }
export function getAllUserProgress() {
  return read().users;
}
