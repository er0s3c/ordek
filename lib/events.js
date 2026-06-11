// ============================================================================
//  lib/events.js — SUNUCU-ONLY aktivite günlüğü (öğretmen paneli için).
//  JSONL append (data/events.jsonl). Her satır bir olay.
//  Tipler: flag_ok | flag_fail | machine_start | machine_stop | machine_restart
//          | machine_error | login | register | error
// ============================================================================
import fs from "fs";
import path from "path";

const DATA_DIR = process.env.LAB_DATA_DIR || path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "events.jsonl");
const MAX_RETURN = 2000; // dosya büyükse okuma tavanı

// { userId, type, slug?, level?, detail?, ok? }
export function logEvent(evt) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const line = JSON.stringify({ ts: Date.now(), ...sanitize(evt) }) + "\n";
    fs.appendFileSync(FILE, line);
  } catch {}
}

function sanitize(evt) {
  const out = {};
  const keys = ["userId", "type", "slug", "level", "detail", "ok", "name"];
  for (const k of keys) if (evt[k] !== undefined && k !== "__proto__") out[k] = evt[k];
  if (typeof out.detail === "string") out.detail = out.detail.slice(0, 500);
  return out;
}

function readAll() {
  let raw = "";
  try { raw = fs.readFileSync(FILE, "utf-8"); } catch { return []; }
  const lines = raw.split("\n");
  const out = [];
  // sondan başla (en yeni), MAX_RETURN ile sınırla
  for (let i = lines.length - 1; i >= 0 && out.length < MAX_RETURN; i--) {
    const l = lines[i].trim();
    if (!l) continue;
    try {
      const o = JSON.parse(l);
      if (o && typeof o === "object") out.push(o);
    } catch {}
  }
  return out; // en yeni -> en eski
}

// { userIds?: Set|Array, types?: Array, since?: ts, limit?: n }
export function queryEvents({ userIds, types, since, limit = 200 } = {}) {
  const idSet = userIds ? new Set(Array.isArray(userIds) ? userIds : [...userIds]) : null;
  const typeSet = types ? new Set(types) : null;
  const out = [];
  for (const e of readAll()) {
    if (idSet && !idSet.has(e.userId)) continue;
    if (typeSet && !typeSet.has(e.type)) continue;
    if (since && e.ts < since) continue;
    out.push(e);
    if (out.length >= limit) break;
  }
  return out; // en yeni -> en eski
}

// userId -> son aktivite ts (yoksa 0)
export function lastActivityMap(userIds) {
  const idSet = userIds ? new Set(userIds) : null;
  const map = {};
  for (const e of readAll()) { // en yeni -> en eski; ilk görülen en yenidir
    if (idSet && !idSet.has(e.userId)) continue;
    if (e.userId && !(e.userId in map)) map[e.userId] = e.ts;
  }
  return map;
}

// userId -> ardışık/son başarısız flag deneme sayısı (takılan tespiti, son N olay içinde)
export function failCounts(userIds, windowN = 400) {
  const idSet = userIds ? new Set(userIds) : null;
  const map = {};
  let seen = 0;
  for (const e of readAll()) {
    if (seen++ > windowN) break;
    if (e.type !== "flag_fail" && e.type !== "flag_ok") continue;
    if (idSet && !idSet.has(e.userId)) continue;
    if (!map[e.userId]) map[e.userId] = { fail: 0, ok: 0 };
    if (e.type === "flag_fail") map[e.userId].fail++; else map[e.userId].ok++;
  }
  return map;
}
