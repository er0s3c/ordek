// Öğretmen — sınıf etkileşimi: ödev atama, modül kilidi, sunum yayını, öğrenciye mesaj.
import { getSession } from "@/lib/session";
import { getUserById, listClasses, getClassById } from "@/lib/accounts";
import {
  getClassroom, setUnlockedModules, addAssignment, removeAssignment,
  setPresentation, clearPresentation, addNotification,
  broadcastNotification, getHelpRequests, resolveHelpRequest, resolveAllHelpRequests,
  logAudit, getSubmissions, gradeSubmission, takeAttendance, getAttendance,
} from "@/lib/classroom";
import { publish } from "@/lib/notify-bus";

export const dynamic = "force-dynamic";

function gate(req) {
  if (process.env.LAB_MODE !== "class") return null;
  const s = getSession(req);
  return s && s.role === "teacher" ? s : null;
}

export async function GET(req) {
  const sess = gate(req);
  if (!sess) return Response.json({ error: "yetkisiz" }, { status: 403 });
  const classes = listClasses(sess.userId);
  const rooms = {};
  for (const c of classes) rooms[c.id] = { ...getClassroom(c.id), help: getHelpRequests(c.id) };
  return Response.json({ rooms });
}

export async function POST(req) {
  const sess = gate(req);
  if (!sess) return Response.json({ error: "yetkisiz" }, { status: 403 });
  let body = {}; try { body = await req.json(); } catch {}
  const action = body.action;
  const owns = (classId) => { const c = getClassById(classId); return c && c.teacherId === sess.userId; };

  const teacherName = () => { const t = getUserById(sess.userId); return (t && (t.displayName || t.username)) || "Öğretmen"; };

  // Sınıf-bazlı aksiyonlar — sınıf bu öğretmene mi ait?
  if (["setModules", "assign", "unassign", "present", "stopPresent", "broadcast", "resolveHelp", "listSubmissions", "gradeSubmission", "takeAttendance", "listAttendance"].includes(action)) {
    if (!owns(body.classId)) return Response.json({ ok: false, error: "sınıf bulunamadı" }, { status: 404 });
    if (action === "setModules") { const r = setUnlockedModules(body.classId, body.modules); logAudit(body.classId, { action: "setModules", actor: teacherName(), detail: Array.isArray(r) ? r.join(",") : "auto" }); return Response.json({ ok: true, unlockedModules: r }); }
    if (action === "assign") { const a = addAssignment(body.classId, { type: body.type, ref: body.ref, title: body.title, dueDate: body.dueDate, description: body.description, maxPoints: body.maxPoints, submitType: body.submitType }); logAudit(body.classId, { action: "assign", actor: teacherName(), detail: a && a.title }); return Response.json({ ok: true, assignment: a }); }
    // Öğretmen: bir ödevin tüm teslimleri (notlandırma ekranı)
    if (action === "listSubmissions") return Response.json({ ok: true, submissions: getSubmissions(body.classId, body.assignmentId) });
    // Yoklama: o anki aktif öğrenciler snapshot'lanır (present listesi istemcide lastActivity'den hesaplanır)
    if (action === "takeAttendance") { const r = takeAttendance(body.classId, body.present); logAudit(body.classId, { action: "attendance", actor: teacherName(), detail: `${(r && r.present.length) || 0} öğrenci` }); return Response.json({ ok: true, attendance: r, recent: getAttendance(body.classId) }); }
    if (action === "listAttendance") return Response.json({ ok: true, recent: getAttendance(body.classId) });
    // Öğretmen: bir teslimi notlandır → öğrenciye anlık bildirim
    if (action === "gradeSubmission") {
      const rec = gradeSubmission(body.classId, body.assignmentId, body.studentId, { grade: body.grade, feedback: body.feedback, gradedBy: teacherName() });
      if (!rec) return Response.json({ ok: false, error: "teslim bulunamadı" }, { status: 404 });
      const m = addNotification(body.studentId, { text: `Ödevin notlandırıldı: ${rec.grade} puan${rec.feedback ? " — " + rec.feedback : ""}`, title: "Ödev notu", type: "teacher", from: teacherName() });
      if (m) publish(body.studentId, { kind: "note", note: m });
      logAudit(body.classId, { action: "grade", actor: teacherName(), detail: `${body.studentId}: ${rec.grade}` });
      return Response.json({ ok: true, submission: rec });
    }
    if (action === "unassign") return Response.json({ ok: true, assignments: removeAssignment(body.classId, body.assignmentId) });
    if (action === "present") { const p = setPresentation(body.classId, { moduleId: body.moduleId, lessonId: body.lessonId }); logAudit(body.classId, { action: "present", actor: teacherName(), detail: `${body.moduleId || ""}/${body.lessonId || ""}` }); return Response.json({ ok: true, presentation: p }); }
    if (action === "stopPresent") { clearPresentation(body.classId); return Response.json({ ok: true, presentation: null }); }
    // Tüm sınıfa duyuru → her öğrenciye bildirim + anlık (SSE) ileti
    if (action === "broadcast") {
      const added = broadcastNotification(body.classId, { text: body.text, title: body.title, priority: body.priority, from: teacherName() });
      for (const a of added) publish(a.studentId, { kind: "note", note: a.message });
      logAudit(body.classId, { action: "broadcast", actor: teacherName(), detail: `${added.length} öğrenci: ${String(body.text || "").slice(0, 80)}` });
      return Response.json({ ok: true, count: added.length });
    }
    // Yardım isteğini çöz: helpId ZORUNLU; tümünü kapatmak için açıkça {all:true}.
    if (action === "resolveHelp") {
      if (body.all === true) return Response.json({ ok: true, help: resolveAllHelpRequests(body.classId) });
      if (!body.helpId) return Response.json({ ok: false, error: "helpId gerekli" }, { status: 400 });
      return Response.json({ ok: true, help: resolveHelpRequest(body.classId, body.helpId) });
    }
  }

  // Öğrenciye mesaj — öğrenci bu öğretmenin sınıflarından birinde mi?
  if (action === "message") {
    const st = getUserById(body.studentId);
    const myClassIds = new Set(listClasses(sess.userId).map((c) => c.id));
    if (!st || st.role !== "student" || !myClassIds.has(st.classId)) return Response.json({ ok: false, error: "yetkisiz" }, { status: 403 });
    const m = addNotification(st.id, { text: body.text, title: body.title, priority: body.priority, type: "teacher", from: teacherName() });
    if (!m) return Response.json({ ok: false, error: "mesaj boş" }, { status: 400 });
    publish(st.id, { kind: "note", note: m }); // anlık (SSE) teslim
    logAudit(st.classId, { action: "message", actor: teacherName(), detail: `→ ${st.displayName || st.username}` });
    return Response.json({ ok: true, message: m });
  }

  return Response.json({ ok: false, error: "bilinmeyen aksiyon" }, { status: 400 });
}
