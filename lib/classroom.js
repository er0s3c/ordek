// ============================================================================
//  lib/classroom.js — SUNUCU-ONLY sınıf etkileşim deposu (sınıf modu).
//  lib/progress.js / lib/accounts.js ile aynı dosya-tabanlı desen.
//  JSON: data/classroom.json
//    { classes:  { [classId]: { unlockedModules:[]|null, assignments:[], presentation:{}|null } },
//      messages: { [studentId]: [ {id,text,from,ts,read,type,priority,title} ] },
//      help:     { [classId]:  [ {id,studentId,studentName,note,ts,resolved} ] },
//      audit:    { [classId]:  [ {id,action,actor,detail,ts} ] } }
//  Yazımlar ATOMİK (geçici dosya + rename): süreç ortada çökse bile JSON bozulmaz.
//  Tutar: öğretmenin sınıfa ödev atama, modül kilidini yönetme, sunum yayını,
//  öğrenciye bildirim/duyuru gönderme ve öğrencinin yardım isteği durumu. ⚠ FLAG/secret YOK.
//  Lab PP dolu → JSON parse'ta __proto__/constructor/prototype reddedilir.
// ============================================================================
import fs from "fs";
import path from "path";
import crypto from "node:crypto";
import { studentsOfClass } from "./accounts.js";

const DATA_DIR = process.env.LAB_DATA_DIR || path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "classroom.json");
const DANGER = new Set(["__proto__", "constructor", "prototype"]);

const MSG_CAP = 200;        // öğrenci başına saklanan mesaj tavanı (önceki: 50; erken mesajlar kaybolmasın)
const HELP_CAP = 50;        // sınıf başına yardım isteği tavanı
const AUDIT_CAP = 200;      // sınıf başına denetim kaydı tavanı
const HELP_COOLDOWN_MS = 10000; // çözülen isteğin hemen ardından yeniden açılma için bekleme

// classId/studentId gibi anahtarlar: boş olmayan, makul uzunlukta string olmalı (PP/abuse koruması).
function validId(v) { return typeof v === "string" && v.length > 0 && v.length <= 128 && !DANGER.has(v); }

function read() {
  try {
    const j = JSON.parse(fs.readFileSync(FILE, "utf-8"), (k, v) => (DANGER.has(k) ? undefined : v));
    if (j && typeof j === "object") {
      return {
        classes: j.classes && typeof j.classes === "object" ? j.classes : {},
        messages: j.messages && typeof j.messages === "object" ? j.messages : {},
        help: j.help && typeof j.help === "object" ? j.help : {},
        audit: j.audit && typeof j.audit === "object" ? j.audit : {},
        submissions: j.submissions && typeof j.submissions === "object" ? j.submissions : {},
        attendance: j.attendance && typeof j.attendance === "object" ? j.attendance : {},
      };
    }
  } catch {}
  return { classes: {}, messages: {}, help: {}, audit: {}, submissions: {}, attendance: {} };
}
// ATOMİK yazım: geçici dosyaya yaz + rename → yarım/bozuk JSON imkânsız (Node rename Windows'ta da replace eder).
function write(state) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const tmp = `${FILE}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
    fs.renameSync(tmp, FILE);
  } catch {}
}
const genId = (p) => p + "_" + crypto.randomBytes(5).toString("hex");

function emptyClass() { return { unlockedModules: null, assignments: [], presentation: null }; }
// Bir sınıfın kaydını güvenli varsayılanlarla döndür (eksik alanları doldur).
function classOf(state, classId) {
  const c = state.classes[classId];
  if (!c || typeof c !== "object") return emptyClass();
  return {
    unlockedModules: Array.isArray(c.unlockedModules) ? c.unlockedModules : null,
    assignments: Array.isArray(c.assignments) ? c.assignments : [],
    presentation: c.presentation && typeof c.presentation === "object" ? c.presentation : null,
  };
}

// ───────── okuma ─────────
export function getClassroom(classId) {
  if (!validId(classId)) return emptyClass();
  return classOf(read(), classId);
}

// ───────── modül kilidi (öğretmen sınıfı pace'ler) ─────────
// modules: string[] → yalnız bu modüller açık. null → otomatik (sıralı) kilit.
export function setUnlockedModules(classId, modules) {
  if (!validId(classId)) return null;
  const state = read();
  const c = classOf(state, classId);
  c.unlockedModules = Array.isArray(modules) ? modules.filter((m) => typeof m === "string") : null;
  state.classes[classId] = c;
  write(state);
  return c.unlockedModules;
}

// ───────── ödev / görev ─────────
// submitType: "writeup" (öğrenci metin teslim eder) | "flag" (flag çözümüyle sayılır).
// dueDate (ts), description, maxPoints opsiyoneldir (geriye uyumlu).
export function addAssignment(classId, { type, ref, title, dueDate, description, maxPoints, submitType } = {}) {
  if (!validId(classId)) return null;
  const state = read();
  const c = classOf(state, classId);
  const due = Number(dueDate);
  const max = Number(maxPoints);
  const a = {
    id: genId("a"),
    type: type === "module" ? "module" : "lab",
    ref: String(ref || ""),
    title: String(title || "").slice(0, 120),
    description: String(description || "").slice(0, 1000),
    submitType: submitType === "writeup" ? "writeup" : "flag",
    maxPoints: Number.isFinite(max) && max > 0 ? Math.min(1000, Math.round(max)) : 100,
    dueDate: Number.isFinite(due) && due > 0 ? due : null,
    ts: Date.now(),
  };
  c.assignments = [...c.assignments, a].slice(-50);
  state.classes[classId] = c;
  write(state);
  return a;
}
export function removeAssignment(classId, assignmentId) {
  if (!validId(classId)) return null;
  const state = read();
  const c = classOf(state, classId);
  c.assignments = c.assignments.filter((a) => a.id !== assignmentId);
  // ödev silinince teslimlerini de buda
  if (state.submissions[classId]) delete state.submissions[classId][assignmentId];
  state.classes[classId] = c;
  write(state);
  return c.assignments;
}

// ───────── ödev teslimi & notlandırma ─────────
// Şekil: submissions[classId][assignmentId][studentId] = { text, ts, studentName, grade?, feedback?, gradedBy?, gradedAt? }
function subRoot(state, classId, assignmentId) {
  if (!state.submissions[classId] || typeof state.submissions[classId] !== "object") state.submissions[classId] = {};
  if (!state.submissions[classId][assignmentId] || typeof state.submissions[classId][assignmentId] !== "object") state.submissions[classId][assignmentId] = {};
  return state.submissions[classId][assignmentId];
}
const findAssignment = (state, classId, assignmentId) => classOf(state, classId).assignments.find((a) => a.id === assignmentId) || null;

// Öğrenci writeup teslim eder/günceller. ⚠ studentId DAİMA oturumdan gelir (IDOR koruması).
export function submitAssignment(classId, assignmentId, studentId, { text, studentName } = {}) {
  if (!validId(classId) || !validId(studentId) || !validId(assignmentId)) return null;
  const state = read();
  const a = findAssignment(state, classId, assignmentId);
  if (!a) return null; // var olmayan ödeve teslim yok
  const root = subRoot(state, classId, assignmentId);
  const prev = root[studentId] && typeof root[studentId] === "object" ? root[studentId] : {};
  root[studentId] = {
    text: String(text || "").slice(0, 5000),
    studentName: String(studentName || prev.studentName || studentId).slice(0, 60),
    ts: Date.now(),
    // yeniden teslimde önceki not düşer (yeniden değerlendirme gerekir)
    grade: null, feedback: "", gradedBy: null, gradedAt: null,
  };
  write(state);
  return root[studentId];
}
// Öğretmen: bir ödevin tüm teslimleri (öğrenci-id'leriyle birlikte).
export function getSubmissions(classId, assignmentId) {
  if (!validId(classId) || !validId(assignmentId)) return [];
  const root = read().submissions[classId]?.[assignmentId];
  if (!root || typeof root !== "object") return [];
  return Object.keys(root).filter(validId).map((sid) => ({ studentId: sid, ...root[sid] }));
}
// Öğrenci: bu sınıftaki kendi teslimleri/notları (assignmentId → kayıt).
export function getStudentSubmissions(classId, studentId) {
  if (!validId(classId) || !validId(studentId)) return {};
  const byAssign = read().submissions[classId];
  if (!byAssign || typeof byAssign !== "object") return {};
  const out = {};
  for (const aid of Object.keys(byAssign)) {
    const rec = byAssign[aid]?.[studentId];
    if (rec && typeof rec === "object") out[aid] = rec;
  }
  return out;
}
// Öğretmen notlandırır. grade 0..maxPoints arası sıkıştırılır.
export function gradeSubmission(classId, assignmentId, studentId, { grade, feedback, gradedBy } = {}) {
  if (!validId(classId) || !validId(assignmentId) || !validId(studentId)) return null;
  const state = read();
  const a = findAssignment(state, classId, assignmentId);
  const max = a && Number.isFinite(a.maxPoints) ? a.maxPoints : 100;
  const root = subRoot(state, classId, assignmentId);
  const rec = root[studentId] && typeof root[studentId] === "object" ? root[studentId] : null;
  if (!rec) return null; // teslim yoksa notlanamaz
  const g = Number(grade);
  rec.grade = Number.isFinite(g) ? Math.max(0, Math.min(max, Math.round(g))) : null;
  rec.feedback = String(feedback || "").slice(0, 1000);
  rec.gradedBy = String(gradedBy || "").slice(0, 80);
  rec.gradedAt = Date.now();
  write(state);
  return rec;
}

// ───────── yoklama (attendance) ─────────
// Şekil: attendance[classId][YYYY-MM-DD] = [{ id, name }]  (öğretmen anlık snapshot alır)
const ATT_DAYS_CAP = 120;
export function takeAttendance(classId, present = []) {
  if (!validId(classId)) return null;
  const state = read();
  if (!state.attendance[classId] || typeof state.attendance[classId] !== "object") state.attendance[classId] = {};
  const day = new Date().toISOString().slice(0, 10);
  const list = (Array.isArray(present) ? present : [])
    .filter((p) => p && validId(p.id))
    .map((p) => ({ id: String(p.id), name: String(p.name || p.id).slice(0, 60) }));
  state.attendance[classId][day] = list;
  // gün tavanı
  const days = Object.keys(state.attendance[classId]).sort();
  while (days.length > ATT_DAYS_CAP) delete state.attendance[classId][days.shift()];
  write(state);
  return { day, present: list };
}
export function getAttendance(classId, { days = 14 } = {}) {
  if (!validId(classId)) return [];
  const byDay = read().attendance[classId];
  if (!byDay || typeof byDay !== "object") return [];
  return Object.keys(byDay).sort().reverse().slice(0, days).map((day) => ({ day, present: Array.isArray(byDay[day]) ? byDay[day] : [] }));
}

// ───────── sunum modu ─────────
export function setPresentation(classId, { moduleId, lessonId } = {}) {
  if (!validId(classId)) return null;
  const state = read();
  const c = classOf(state, classId);
  c.presentation = { active: true, moduleId: String(moduleId || ""), lessonId: String(lessonId || ""), ts: Date.now() };
  state.classes[classId] = c;
  write(state);
  return c.presentation;
}
export function clearPresentation(classId) {
  if (!validId(classId)) return null;
  const state = read();
  const c = classOf(state, classId);
  c.presentation = null;
  state.classes[classId] = c;
  write(state);
  return null;
}

// ───────── öğrenciye bildirim / mesaj / ipucu ─────────
const TYPES = new Set(["teacher", "broadcast", "system", "help"]);
const PRIOS = new Set(["normal", "urgent"]);

// Bir bildirim nesnesi kur (saf; I/O yok) — addNotification ve broadcast ortak kullanır.
function buildNote({ text, from, type, priority, title }) {
  return {
    id: genId("m"),
    text: String(text).slice(0, 500),
    from: String(from || "Öğretmen").slice(0, 60),
    type: TYPES.has(type) ? type : "teacher",
    priority: PRIOS.has(priority) ? priority : "normal",
    title: String(title || "").slice(0, 80),
    ts: Date.now(),
    read: false,
  };
}
// Tek öğrenciye zengin bildirim ekle (type/priority/title alanlarıyla).
export function addNotification(studentId, { text, from, type, priority, title } = {}) {
  if (!validId(studentId) || !text) return null;
  const state = read();
  const list = Array.isArray(state.messages[studentId]) ? state.messages[studentId] : [];
  const m = buildNote({ text, from, type, priority, title });
  state.messages[studentId] = [...list, m].slice(-MSG_CAP);
  write(state);
  return m;
}
// Geriye uyumlu sarmalayıcı (eski "message" action'ı bunu çağırır).
export function addMessage(studentId, opts = {}) {
  return addNotification(studentId, { ...opts, type: opts.type || "teacher" });
}

// Tüm sınıfa duyuru: her öğrenciye aynı bildirimi ekler; eklenen kayıtları döner.
// TEK read()/write(): N öğrenci için tek atomik yazım (eski hâli N dosya I/O + yarım-kalma riski).
// (publish fan-out'u çağıran route, dönen list'in studentId'leriyle yapar.)
export function broadcastNotification(classId, { text, from, priority, title } = {}) {
  if (!validId(classId) || !text) return [];
  const students = studentsOfClass(classId);
  if (!students.length) return [];
  const state = read();
  const out = [];
  for (const s of students) {
    if (!validId(s.id)) continue;
    const list = Array.isArray(state.messages[s.id]) ? state.messages[s.id] : [];
    const m = buildNote({ text, from, type: "broadcast", priority, title });
    state.messages[s.id] = [...list, m].slice(-MSG_CAP);
    out.push({ studentId: s.id, message: m });
  }
  write(state); // tek yazım → ya hepsi ya hiçbiri (atomik)
  return out;
}
// Öğrencinin mesajları. opts.limit/opts.before ile sayfalama (eskiler de erişilebilir).
export function getMessagesFor(studentId, { limit, before } = {}) {
  if (!validId(studentId)) return [];
  let list = read().messages[studentId];
  list = Array.isArray(list) ? list : [];
  if (typeof before === "number") list = list.filter((m) => m.ts < before);
  if (typeof limit === "number" && limit > 0) list = list.slice(-limit);
  return list;
}
export function markMessagesRead(studentId, ids) {
  // ⚠ studentId DAİMA oturumdan (user.id) gelmeli — asla request body'sinden (IDOR).
  if (!validId(studentId)) return [];
  const state = read();
  const list = Array.isArray(state.messages[studentId]) ? state.messages[studentId] : [];
  const set = Array.isArray(ids) && ids.length ? new Set(ids.map(String)) : null;
  for (const m of list) if (!set || set.has(m.id)) m.read = true;
  state.messages[studentId] = list;
  write(state);
  return list;
}

// ───────── öğrenci → öğretmen "yardım iste" (el kaldır) ─────────
function helpOf(state, classId) {
  const l = state.help[classId];
  return Array.isArray(l) ? l : [];
}
// Yeni yardım isteği ekle. Aynı öğrencinin açık isteği varsa onu günceller (spam'i engeller).
// Cooldown: çözülmüş isteğin hemen ardından yeniden açma (flood) HELP_COOLDOWN_MS boyunca aynı kaydı tazeler.
export function addHelpRequest(classId, { studentId, studentName, note } = {}) {
  if (!validId(classId) || !validId(studentId)) return null;
  const state = read();
  const list = helpOf(state, classId);
  const now = Date.now();
  // 1) açık istek varsa güncelle. 2) yoksa ama yakın zamanda çözülmüş istek varsa onu yeniden aç (cooldown → tek kayıt).
  const reuse = list.find((h) => h.studentId === studentId && (!h.resolved || now - (h.ts || 0) < HELP_COOLDOWN_MS));
  if (reuse) {
    reuse.note = String(note || reuse.note || "").slice(0, 300);
    reuse.ts = now;
    reuse.resolved = false;
    state.help[classId] = list;
    write(state);
    return reuse;
  }
  const h = {
    id: genId("h"),
    studentId: String(studentId),
    studentName: String(studentName || studentId).slice(0, 60),
    note: String(note || "").slice(0, 300),
    ts: now,
    resolved: false,
  };
  state.help[classId] = [...list, h].slice(-HELP_CAP);
  write(state);
  return h;
}
// Bir sınıfın yardım isteklerini döndür (varsayılan: yalnız açık olanlar).
export function getHelpRequests(classId, { includeResolved = false } = {}) {
  if (!validId(classId)) return [];
  const list = helpOf(read(), classId);
  return includeResolved ? list : list.filter((h) => !h.resolved);
}
// TEK bir yardım isteğini çözüldü işaretle. ⚠ helpId ZORUNLU — yoksa hiçbir şey yapma
// (eski sürüm helpId boşsa SINIFTAKİ TÜM istekleri çözüyordu = kazara/kötü-niyetli toplu kapatma).
export function resolveHelpRequest(classId, helpId) {
  if (!validId(classId) || !helpId) return getHelpRequests(classId);
  const state = read();
  const list = helpOf(state, classId);
  for (const h of list) if (h.id === helpId) h.resolved = true;
  state.help[classId] = list;
  write(state);
  return list.filter((h) => !h.resolved);
}
// Bir sınıftaki TÜM açık yardım isteklerini bilinçli olarak çöz (öğretmen "hepsini temizle").
export function resolveAllHelpRequests(classId) {
  if (!validId(classId)) return [];
  const state = read();
  const list = helpOf(state, classId);
  for (const h of list) h.resolved = true;
  state.help[classId] = list;
  write(state);
  return [];
}

// ───────── denetim kaydı (audit) ─────────
// Öğretmen aksiyonlarını kim/ne/ne zaman olarak kaydet (broadcast, ödev, sunum, mesaj…).
export function logAudit(classId, { action, actor, detail } = {}) {
  if (!validId(classId) || !action) return null;
  const state = read();
  const list = Array.isArray(state.audit[classId]) ? state.audit[classId] : [];
  const a = { id: genId("au"), action: String(action).slice(0, 40), actor: String(actor || "").slice(0, 80), detail: String(detail || "").slice(0, 200), ts: Date.now() };
  state.audit[classId] = [...list, a].slice(-AUDIT_CAP);
  write(state);
  return a;
}
export function getAudit(classId, { limit = 50 } = {}) {
  if (!validId(classId)) return [];
  const list = Array.isArray(read().audit[classId]) ? read().audit[classId] : [];
  return list.slice(-limit).reverse();
}

// ───────── yetim veri temizliği ─────────
// Sınıf silindiğinde/arşivlendiğinde ilgili classroom verisini buda (classes/help/audit + o sınıfın
// öğrencilerinin mesajları). Çağıran (teacher/class route) silmeden ÖNCE öğrenci id'lerini geçer.
export function pruneClassData(classId, studentIds = []) {
  if (!validId(classId)) return false;
  const state = read();
  delete state.classes[classId];
  delete state.help[classId];
  delete state.audit[classId];
  delete state.submissions[classId];
  delete state.attendance[classId];
  for (const sid of studentIds) if (validId(sid)) delete state.messages[sid];
  write(state);
  return true;
}
