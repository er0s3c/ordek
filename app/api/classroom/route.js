// Öğrenci/sınıf-kullanıcısı — kendi sınıfının canlı durumu: açık modüller, ödevler,
// öğretmen sunumu ve bana gelen mesajlar. (Sunum modu için ~3-4 sn poll edilir.)
import { getSession } from "@/lib/session";
import { getUserById, getClassById } from "@/lib/accounts";
import { getClassroom, getMessagesFor, markMessagesRead, addHelpRequest, submitAssignment, getStudentSubmissions } from "@/lib/classroom";
import { publish } from "@/lib/notify-bus";

export const dynamic = "force-dynamic";

// Sınıf modu + oturum şartı. Bireysel modda boş döner (istemci yine de poll etmez).
function me(req) {
  if (process.env.LAB_MODE !== "class") return null;
  const s = getSession(req);
  if (!s) return null;
  return getUserById(s.userId);
}

export async function GET(req) {
  const user = me(req);
  if (!user) return Response.json({ classId: null, unlockedModules: null, assignments: [], presentation: null, messages: [] });
  const room = getClassroom(user.classId);
  const messages = user.role === "student" ? getMessagesFor(user.id) : [];
  const submissions = user.role === "student" ? getStudentSubmissions(user.classId, user.id) : {};
  return Response.json({
    classId: user.classId || null,
    unlockedModules: room.unlockedModules,
    assignments: room.assignments,
    presentation: room.presentation,
    messages,
    submissions,
  });
}

export async function POST(req) {
  const user = me(req);
  if (!user) return Response.json({ ok: false, error: "yetkisiz" }, { status: 403 });
  let body = {}; try { body = await req.json(); } catch {}
  if (body.action === "markRead") {
    markMessagesRead(user.id, Array.isArray(body.ids) ? body.ids : null);
    return Response.json({ ok: true });
  }
  // Öğrenci "yardım iste" (el kaldır) → sınıfın öğretmenine anlık (SSE) bildirim.
  if (body.action === "help") {
    if (user.role !== "student" || !user.classId) return Response.json({ ok: false, error: "yalnız öğrenci" }, { status: 403 });
    const h = addHelpRequest(user.classId, { studentId: user.id, studentName: user.displayName || user.username, note: body.note });
    const cls = getClassById(user.classId);
    if (cls && cls.teacherId) publish(cls.teacherId, { kind: "help", help: h, classId: user.classId });
    return Response.json({ ok: true, help: h });
  }
  // Öğrenci ödev teslimi (writeup). studentId DAİMA oturumdan → IDOR yok.
  if (body.action === "submitAssignment") {
    if (user.role !== "student" || !user.classId) return Response.json({ ok: false, error: "yalnız öğrenci" }, { status: 403 });
    const rec = submitAssignment(user.classId, body.assignmentId, user.id, { text: body.text, studentName: user.displayName || user.username });
    if (!rec) return Response.json({ ok: false, error: "ödev bulunamadı" }, { status: 404 });
    const cls = getClassById(user.classId);
    if (cls && cls.teacherId) publish(cls.teacherId, { kind: "submission", studentId: user.id, studentName: user.displayName || user.username, assignmentId: body.assignmentId, classId: user.classId });
    return Response.json({ ok: true, submission: rec });
  }
  return Response.json({ ok: false, error: "bilinmeyen aksiyon" }, { status: 400 });
}
