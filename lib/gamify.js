// ============================================================================
//  lib/gamify.js — SUNUCU-ONLY aktivite/seri (streak) deposu.
//  Günlük aktivite günlerini tutar; XP/rozet hesabı istemcide (app/gamifyData.js)
//  yapılır — burada yalnız tarih-temelli SERİ sunucuda güvenle hesaplanır.
//
//  Şekil: { global:{days:[YYYY-MM-DD,...]}, users:{[userId]:{days:[...]}} }
//   days = kullanıcının aktif olduğu (uygulamayı açtığı) benzersiz günler.
// ============================================================================
import fs from "fs";
import path from "path";

const DATA_DIR = process.env.LAB_DATA_DIR || path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "gamify.json");
const DANGER = new Set(["__proto__", "constructor", "prototype"]);
const CAP = 400; // ~13 ay

const today = () => new Date().toISOString().slice(0, 10);

function read() {
  try {
    const j = JSON.parse(fs.readFileSync(FILE, "utf-8"), (k, v) => (DANGER.has(k) ? undefined : v));
    if (j && typeof j === "object") {
      return {
        global: j.global && typeof j.global === "object" ? j.global : { days: [] },
        users: j.users && typeof j.users === "object" ? j.users : {},
      };
    }
  } catch {}
  return { global: { days: [] }, users: {} };
}

function write(state) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const tmp = FILE + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
    fs.renameSync(tmp, FILE);
  } catch {}
}

function bucket(state, userId) {
  if (userId) {
    if (!state.users[userId] || typeof state.users[userId] !== "object") state.users[userId] = { days: [] };
    if (!Array.isArray(state.users[userId].days)) state.users[userId].days = [];
    return state.users[userId];
  }
  if (!Array.isArray(state.global.days)) state.global.days = [];
  return state.global;
}

// Ardışık gün serisi: en son aktif gün bugün ya da dün ise geriye doğru say.
function streakOf(days) {
  if (!Array.isArray(days) || !days.length) return 0;
  const set = new Set(days);
  const d = new Date();
  const iso = (x) => x.toISOString().slice(0, 10);
  if (!set.has(iso(d))) { d.setUTCDate(d.getUTCDate() - 1); if (!set.has(iso(d))) return 0; }
  let n = 0;
  while (set.has(iso(d))) { n++; d.setUTCDate(d.getUTCDate() - 1); }
  return n;
}

export function recordActivity(userId) {
  const state = read();
  const b = bucket(state, userId);
  const t = today();
  if (!b.days.includes(t)) {
    b.days.push(t);
    if (b.days.length > CAP) b.days = b.days.slice(-CAP);
    write(state);
  }
  return streakOf(b.days);
}

export function getStreak(userId) {
  const state = read();
  const b = userId ? (state.users[userId] || { days: [] }) : state.global;
  return streakOf(b.days || []);
}

export function getActivityDays(userId) {
  const state = read();
  const b = userId ? (state.users[userId] || { days: [] }) : state.global;
  return Array.isArray(b.days) ? b.days.slice() : [];
}
