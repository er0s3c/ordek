// ============================================================================
//  test/classroom-units.mjs — lib/classroom.js depo mantığı (framework'süz).
//  Çalıştır:  node test/classroom-units.mjs   (Docker/sunucu GEREKMEZ)
//  İzole tmp LAB_DATA_DIR kullanır → gerçek data/ klasörüne dokunmaz.
//  Kapsam: addNotification (type/priority) · broadcastNotification fan-out ·
//          yardım isteği ekle/listele/çöz · markMessagesRead.
// ============================================================================
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// ⚠ Modüller DATA_DIR'i yüklenirken okur → import'tan ÖNCE env'i kur, sonra dinamik import.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ordek-class-"));
process.env.LAB_DATA_DIR = tmp;

const {
  addNotification, addMessage, getMessagesFor, markMessagesRead,
  broadcastNotification, addHelpRequest, getHelpRequests, resolveHelpRequest,
  resolveAllHelpRequests, logAudit, getAudit, pruneClassData,
  addAssignment, submitAssignment, getSubmissions, getStudentSubmissions, gradeSubmission,
  takeAttendance, getAttendance,
} = await import("../lib/classroom.js");
const { createUser, createClass } = await import("../lib/accounts.js");

let pass = 0, fail = 0;
function t(name, fn) {
  try { fn(); pass++; console.log(`\x1b[32mPASS\x1b[0m ${name}`); }
  catch (e) { fail++; console.log(`\x1b[31mFAIL\x1b[0m ${name}\n   ${e && e.message ? e.message : e}`); }
}

// Test sınıfı + öğrenciler
const cls = createClass({ name: "Test Sınıfı", teacherId: "t_test" });
const s1 = createUser({ role: "student", username: "stud1", password: "1234", classId: cls.id });
const s2 = createUser({ role: "student", username: "stud2", password: "1234", classId: cls.id });

/* ───────── addNotification ───────── */
t("addNotification: type/priority/title alanlarını saklar", () => {
  const m = addNotification(s1.id, { text: "merhaba", from: "Öğr", type: "teacher", priority: "urgent", title: "Başlık" });
  assert.equal(m.text, "merhaba");
  assert.equal(m.type, "teacher");
  assert.equal(m.priority, "urgent");
  assert.equal(m.title, "Başlık");
  assert.equal(m.read, false);
  const list = getMessagesFor(s1.id);
  assert.ok(list.some(x => x.id === m.id));
});
t("addNotification: geçersiz type/priority varsayılana düşer", () => {
  const m = addNotification(s1.id, { text: "x", type: "hacker", priority: "boom" });
  assert.equal(m.type, "teacher");
  assert.equal(m.priority, "normal");
});
t("addMessage: geriye uyumlu (type teacher) çalışır", () => {
  const m = addMessage(s2.id, { text: "eski-api" });
  assert.equal(m.type, "teacher");
  assert.ok(getMessagesFor(s2.id).some(x => x.id === m.id));
});

/* ───────── broadcastNotification ───────── */
t("broadcastNotification: sınıftaki tüm öğrencilere ekler (fan-out)", () => {
  const before1 = getMessagesFor(s1.id).length;
  const before2 = getMessagesFor(s2.id).length;
  const added = broadcastNotification(cls.id, { text: "tüm sınıfa duyuru", from: "Öğr", priority: "normal" });
  assert.equal(added.length, 2);
  assert.equal(getMessagesFor(s1.id).length, before1 + 1);
  assert.equal(getMessagesFor(s2.id).length, before2 + 1);
  assert.ok(getMessagesFor(s1.id).some(m => m.type === "broadcast" && m.text === "tüm sınıfa duyuru"));
});
t("broadcastNotification: boş metin hiç kayıt eklemez", () => {
  assert.deepEqual(broadcastNotification(cls.id, { text: "" }), []);
});

/* ───────── markMessagesRead ───────── */
t("markMessagesRead: id verilmezse hepsini okundu yapar", () => {
  markMessagesRead(s1.id);
  assert.ok(getMessagesFor(s1.id).every(m => m.read === true));
});

/* ───────── yardım istekleri ───────── */
t("addHelpRequest + getHelpRequests: açık istek listelenir", () => {
  const h = addHelpRequest(cls.id, { studentId: s1.id, studentName: "stud1", note: "takıldım" });
  assert.equal(h.resolved, false);
  const open = getHelpRequests(cls.id);
  assert.equal(open.length, 1);
  assert.equal(open[0].studentName, "stud1");
});
t("addHelpRequest: aynı öğrencinin açık isteği çoğaltılmaz (günceller)", () => {
  addHelpRequest(cls.id, { studentId: s1.id, studentName: "stud1", note: "hâlâ takıldım" });
  const open = getHelpRequests(cls.id);
  assert.equal(open.length, 1);
  assert.equal(open[0].note, "hâlâ takıldım");
});
t("resolveHelpRequest: çözülen istek açık listeden çıkar", () => {
  const open = getHelpRequests(cls.id);
  resolveHelpRequest(cls.id, open[0].id);
  assert.equal(getHelpRequests(cls.id).length, 0);
});

/* ───────── REGRESYON: sınıf modu hata düzeltmeleri ───────── */
// helpId verilmeden çağrı, DİĞER açık istekleri çözmez (eski HIGH bug: hepsini kapatıyordu).
t("resolveHelpRequest: helpId YOKSA hiçbir isteği çözmez (bug fix)", () => {
  const c2 = createClass({ name: "Yardım Sınıfı", teacherId: "t_help" });
  const a = createUser({ role: "student", username: "h_a", password: "1234", classId: c2.id });
  const b = createUser({ role: "student", username: "h_b", password: "1234", classId: c2.id });
  addHelpRequest(c2.id, { studentId: a.id, studentName: "a", note: "?" });
  addHelpRequest(c2.id, { studentId: b.id, studentName: "b", note: "?" });
  assert.equal(getHelpRequests(c2.id).length, 2);
  resolveHelpRequest(c2.id, null);            // helpId yok → no-op
  resolveHelpRequest(c2.id, undefined);       // helpId yok → no-op
  assert.equal(getHelpRequests(c2.id).length, 2, "helpId'siz çağrı istekleri kapatmamalı");
  const open = getHelpRequests(c2.id);
  resolveHelpRequest(c2.id, open[0].id);       // yalnız BİRİ
  assert.equal(getHelpRequests(c2.id).length, 1);
});
t("resolveAllHelpRequests: açıkça hepsini çözer", () => {
  const c3 = createClass({ name: "Toplu Sınıf", teacherId: "t_all" });
  const a = createUser({ role: "student", username: "all_a", password: "1234", classId: c3.id });
  const b = createUser({ role: "student", username: "all_b", password: "1234", classId: c3.id });
  addHelpRequest(c3.id, { studentId: a.id, studentName: "a" });
  addHelpRequest(c3.id, { studentId: b.id, studentName: "b" });
  assert.equal(getHelpRequests(c3.id).length, 2);
  assert.deepEqual(resolveAllHelpRequests(c3.id), []);
  assert.equal(getHelpRequests(c3.id).length, 0);
});
// getMessagesFor sayfalama (limit/before) — erken mesajlara da erişilebilir.
t("getMessagesFor: limit ve before ile sayfalama", () => {
  const c4 = createClass({ name: "Mesaj Sınıfı", teacherId: "t_msg" });
  const u = createUser({ role: "student", username: "m_u", password: "1234", classId: c4.id });
  for (let i = 0; i < 5; i++) addNotification(u.id, { text: "m" + i });
  const all = getMessagesFor(u.id);
  assert.equal(all.length, 5);
  const last2 = getMessagesFor(u.id, { limit: 2 });
  assert.equal(last2.length, 2);
  assert.equal(last2[1].text, "m4");
  const beforeM2 = getMessagesFor(u.id, { before: all[2].ts });
  assert.ok(beforeM2.every((m) => m.ts < all[2].ts));
});
// Denetim kaydı (audit log).
t("logAudit + getAudit: aksiyonları kim/ne olarak kaydeder", () => {
  const c5 = createClass({ name: "Audit Sınıfı", teacherId: "t_aud" });
  logAudit(c5.id, { action: "broadcast", actor: "Öğretmen X", detail: "selam" });
  logAudit(c5.id, { action: "assign", actor: "Öğretmen X", detail: "Ödev 1" });
  const log = getAudit(c5.id);
  assert.equal(log.length, 2);
  assert.equal(log[0].action, "assign"); // en yeni başta
  assert.equal(log[1].actor, "Öğretmen X");
});
// Yetim veri temizliği: sınıf silinince classroom verisi budanır.
t("pruneClassData: sınıf/help/audit + öğrenci mesajları temizlenir", () => {
  const c6 = createClass({ name: "Silinecek", teacherId: "t_del" });
  const u = createUser({ role: "student", username: "d_u", password: "1234", classId: c6.id });
  addNotification(u.id, { text: "veda" });
  addHelpRequest(c6.id, { studentId: u.id, studentName: "d" });
  logAudit(c6.id, { action: "x", actor: "y" });
  pruneClassData(c6.id, [u.id]);
  assert.equal(getHelpRequests(c6.id).length, 0);
  assert.equal(getAudit(c6.id).length, 0);
  assert.equal(getMessagesFor(u.id).length, 0);
});
// Geçersiz/abuse id'leri reddedilir (PP/length).
t("validId: __proto__ / boş / aşırı uzun id reddedilir", () => {
  assert.equal(addNotification("__proto__", { text: "x" }), null);
  assert.equal(addNotification("", { text: "x" }), null);
  assert.equal(addNotification("a".repeat(200), { text: "x" }), null);
  assert.deepEqual(getMessagesFor("__proto__"), []);
});

/* ───────── ödev teslimi & notlandırma (B2) ───────── */
t("addAssignment: writeup alanlarını (dueDate/maxPoints/submitType) saklar", () => {
  const a = addAssignment(cls.id, { type: "lab", submitType: "writeup", title: "Rapor", description: "yaz", maxPoints: 50, dueDate: 1234567890 });
  assert.equal(a.submitType, "writeup");
  assert.equal(a.maxPoints, 50);
  assert.equal(a.dueDate, 1234567890);
  assert.equal(a.description, "yaz");
});
t("submitAssignment: öğrenci teslim eder, getSubmissions listeler", () => {
  const a = addAssignment(cls.id, { submitType: "writeup", title: "Ödev A" });
  const rec = submitAssignment(cls.id, a.id, s1.id, { text: "çözümüm", studentName: "stud1" });
  assert.equal(rec.text, "çözümüm");
  assert.equal(rec.grade, null);
  const subs = getSubmissions(cls.id, a.id);
  assert.equal(subs.length, 1);
  assert.equal(subs[0].studentId, s1.id);
});
t("submitAssignment: var olmayan ödeve teslim reddedilir", () => {
  assert.equal(submitAssignment(cls.id, "a_yok", s1.id, { text: "x" }), null);
});
t("gradeSubmission: notu maxPoints'e sıkıştırır + öğrenci kendi teslimini görür", () => {
  const a = addAssignment(cls.id, { submitType: "writeup", title: "Ödev B", maxPoints: 100 });
  submitAssignment(cls.id, a.id, s1.id, { text: "abc", studentName: "stud1" });
  const g = gradeSubmission(cls.id, a.id, s1.id, { grade: 250, feedback: "iyi", gradedBy: "Öğr" });
  assert.equal(g.grade, 100); // 250 → max 100
  assert.equal(g.feedback, "iyi");
  const mine = getStudentSubmissions(cls.id, s1.id);
  assert.equal(mine[a.id].grade, 100);
});
t("gradeSubmission: teslim yoksa notlanamaz (null)", () => {
  const a = addAssignment(cls.id, { submitType: "writeup", title: "Ödev C" });
  assert.equal(gradeSubmission(cls.id, a.id, s2.id, { grade: 10 }), null);
});
t("submitAssignment: studentId IDOR/PP koruması (__proto__ reddedilir)", () => {
  const a = addAssignment(cls.id, { submitType: "writeup", title: "Ödev D" });
  assert.equal(submitAssignment(cls.id, a.id, "__proto__", { text: "x" }), null);
});
t("yeniden teslim önceki notu düşürür (yeniden değerlendirme)", () => {
  const a = addAssignment(cls.id, { submitType: "writeup", title: "Ödev E" });
  submitAssignment(cls.id, a.id, s1.id, { text: "v1" });
  gradeSubmission(cls.id, a.id, s1.id, { grade: 80 });
  const re = submitAssignment(cls.id, a.id, s1.id, { text: "v2" });
  assert.equal(re.grade, null);
  assert.equal(re.text, "v2");
});

/* ───────── yoklama (B4) ───────── */
t("takeAttendance + getAttendance: bugünün snapshot'ını saklar", () => {
  const r = takeAttendance(cls.id, [{ id: s1.id, name: "stud1" }, { id: s2.id, name: "stud2" }]);
  assert.equal(r.present.length, 2);
  const recent = getAttendance(cls.id);
  assert.equal(recent[0].present.length, 2);
  assert.equal(recent[0].day, new Date().toISOString().slice(0, 10));
});
t("takeAttendance: geçersiz id'leri eler", () => {
  const c = createClass({ name: "Yoklama2", teacherId: "t_y2" });
  const r = takeAttendance(c.id, [{ id: "__proto__", name: "x" }, { id: "", name: "y" }, { id: "ok_1", name: "z" }]);
  assert.equal(r.present.length, 1);
  assert.equal(r.present[0].id, "ok_1");
});
t("pruneClassData: submissions + attendance da temizlenir", () => {
  const c = createClass({ name: "Sil2", teacherId: "t_del2" });
  const u = createUser({ role: "student", username: "d_u2", password: "1234", classId: c.id });
  const a = addAssignment(c.id, { submitType: "writeup", title: "S" });
  submitAssignment(c.id, a.id, u.id, { text: "x" });
  takeAttendance(c.id, [{ id: u.id, name: "d" }]);
  pruneClassData(c.id, [u.id]);
  assert.equal(getSubmissions(c.id, a.id).length, 0);
  assert.equal(getAttendance(c.id).length, 0);
});

// temizlik
try { fs.rmSync(tmp, { recursive: true, force: true }); } catch {}

console.log(`\n${pass} geçti, ${fail} başarısız.`);
process.exit(fail ? 1 : 0);
