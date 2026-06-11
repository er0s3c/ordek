// ============================================================================
//  lib/accounts.js — SUNUCU-ONLY hesap & sınıf deposu (panel kimlik doğrulaması).
//  lib/progress.js ile aynı dosya-tabanlı desen. JSON: data/accounts.json + classes.json
//  ⚠ Kasıtlı zafiyetli Prisma `User` tablosu BURADA KULLANILMAZ (o tablo SQLi/IDOR hedefi).
//  Parolalar scrypt + per-user tuz ile hash'lenir (yeni bağımlılık yok).
//  Lab PP dolu → JSON parse'ta __proto__/constructor/prototype anahtarları reddedilir.
// ============================================================================
import fs from "fs";
import path from "path";
import crypto from "node:crypto";

const DATA_DIR = process.env.LAB_DATA_DIR || path.join(process.cwd(), "data");
const ACCOUNTS = path.join(DATA_DIR, "accounts.json");
const CLASSES = path.join(DATA_DIR, "classes.json");

const DANGER = new Set(["__proto__", "constructor", "prototype"]);
// Prototype-pollution savunmacı reviver: tehlikeli anahtarları düşür.
function safeParse(str, fallback) {
  try {
    return JSON.parse(str, (k, v) => (DANGER.has(k) ? undefined : v));
  } catch { return fallback; }
}
function readJSON(file, fallback) {
  try { return safeParse(fs.readFileSync(file, "utf-8"), fallback) ?? fallback; }
  catch { return fallback; }
}
function writeJSON(file, obj) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(obj, null, 2));
}

const genId = (p) => p + "_" + crypto.randomBytes(6).toString("hex");
// İnsan-dostu sınıf kodu (karışan karakterler yok: 0/O, 1/I/L çıkarıldı)
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
function genCode(len = 6) {
  let s = "";
  const b = crypto.randomBytes(len);
  for (let i = 0; i < len; i++) s += CODE_ALPHABET[b[i] % CODE_ALPHABET.length];
  return s;
}

// ───────── şifreleme ─────────
export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(String(password), salt, 64).toString("hex");
  return { salt, passHash: hash };
}
export function verifyPassword(user, password) {
  if (!user || !user.salt || !user.passHash) return false;
  let h;
  try { h = crypto.scryptSync(String(password), user.salt, 64); } catch { return false; }
  const expected = Buffer.from(user.passHash, "hex");
  return h.length === expected.length && crypto.timingSafeEqual(h, expected);
}

// ───────── kullanıcılar ─────────
function loadUsers() {
  const j = readJSON(ACCOUNTS, { users: [] });
  return Array.isArray(j.users) ? j.users : [];
}
function saveUsers(users) { writeJSON(ACCOUNTS, { users }); }

export function listUsers() { return loadUsers(); }
export function getUserById(id) { return loadUsers().find((u) => u.id === id) || null; }
export function getUserByUsername(username) {
  const u = String(username || "").trim().toLowerCase();
  return loadUsers().find((x) => x.username.toLowerCase() === u) || null;
}
export function teacherExists() { return loadUsers().some((u) => u.role === "teacher"); }

// { role, username, password, displayName, classId } -> user (passHash hariç döner)
export function createUser({ role, username, password, displayName, classId = null }) {
  const uname = String(username || "").trim();
  if (!uname) throw new Error("kullanıcı adı gerekli");
  if (!/^[a-zA-Z0-9_.-]{3,32}$/.test(uname)) throw new Error("kullanıcı adı 3-32, harf/rakam/._- olmalı");
  if (String(password || "").length < 4) throw new Error("parola en az 4 karakter olmalı");
  const users = loadUsers();
  if (users.some((u) => u.username.toLowerCase() === uname.toLowerCase())) throw new Error("bu kullanıcı adı alınmış");
  const { salt, passHash } = hashPassword(password);
  const user = {
    id: genId(role === "teacher" ? "t" : "s"),
    role: role === "teacher" ? "teacher" : "student",
    username: uname,
    displayName: String(displayName || uname).trim().slice(0, 60),
    classId: classId || null,
    salt, passHash,
    createdAt: Date.now(),
  };
  users.push(user);
  saveUsers(users);
  return publicUser(user);
}

export function updateUser(id, patch) {
  const users = loadUsers();
  const i = users.findIndex((u) => u.id === id);
  if (i < 0) return null;
  const allowed = ["displayName", "classId"];
  for (const k of allowed) if (k in patch) users[i][k] = patch[k];
  saveUsers(users);
  return publicUser(users[i]);
}

export function publicUser(u) {
  if (!u) return null;
  const { salt, passHash, ...pub } = u;
  return pub;
}

// ───────── sınıflar ─────────
function loadClasses() {
  const j = readJSON(CLASSES, { classes: [] });
  return Array.isArray(j.classes) ? j.classes : [];
}
function saveClasses(classes) { writeJSON(CLASSES, { classes }); }

export function listClasses(teacherId) {
  const all = loadClasses();
  return teacherId ? all.filter((c) => c.teacherId === teacherId) : all;
}
export function getClassById(id) { return loadClasses().find((c) => c.id === id) || null; }
export function getClassByCode(code) {
  const c = String(code || "").trim().toUpperCase();
  return loadClasses().find((x) => x.code === c && !x.archived) || null;
}

export function createClass({ name, teacherId }) {
  const classes = loadClasses();
  let code;
  do { code = genCode(6); } while (classes.some((c) => c.code === code));
  const cls = {
    id: genId("c"),
    name: String(name || "Sınıf").trim().slice(0, 60) || "Sınıf",
    code,
    teacherId,
    archived: false,
    createdAt: Date.now(),
  };
  classes.push(cls);
  saveClasses(classes);
  return cls;
}

export function updateClass(id, patch) {
  const classes = loadClasses();
  const i = classes.findIndex((c) => c.id === id);
  if (i < 0) return null;
  if ("name" in patch) classes[i].name = String(patch.name).trim().slice(0, 60) || classes[i].name;
  if ("archived" in patch) classes[i].archived = !!patch.archived;
  if (patch.regenerateCode) {
    let code;
    do { code = genCode(6); } while (classes.some((c) => c.code === code));
    classes[i].code = code;
  }
  saveClasses(classes);
  return classes[i];
}

export function deleteClass(id) {
  const classes = loadClasses().filter((c) => c.id !== id);
  saveClasses(classes);
  // sınıftaki öğrencilerin classId'sini boşalt
  const users = loadUsers();
  let changed = false;
  for (const u of users) if (u.classId === id) { u.classId = null; changed = true; }
  if (changed) saveUsers(users);
  return true;
}

export function studentsOfClass(classId) {
  return loadUsers().filter((u) => u.role === "student" && u.classId === classId).map(publicUser);
}
// Bir öğretmenin tüm sınıflarındaki öğrenciler
export function studentsOfTeacher(teacherId) {
  const classIds = new Set(listClasses(teacherId).map((c) => c.id));
  return loadUsers().filter((u) => u.role === "student" && classIds.has(u.classId)).map(publicUser);
}
