// Öğrenci / sınıf ilerlemesini sıfırla (öğretmen).
import { getSession } from "@/lib/session";
import { getUserById, listClasses, getClassById, studentsOfClass } from "@/lib/accounts";
import { resetUser } from "@/lib/progress";
import { logEvent } from "@/lib/events";

export const dynamic = "force-dynamic";

function gate(req) {
  if (process.env.LAB_MODE !== "class") return null;
  const s = getSession(req);
  return s && s.role === "teacher" ? s : null;
}

export async function POST(req) {
  const sess = gate(req);
  if (!sess) return Response.json({ error: "yetkisiz" }, { status: 403 });
  let body = {}; try { body = await req.json(); } catch {}
  const myClassIds = new Set(listClasses(sess.userId).map((c) => c.id));

  if (body.studentId) {
    const st = getUserById(body.studentId);
    if (!st || !myClassIds.has(st.classId)) return Response.json({ ok: false, error: "yetkisiz" }, { status: 403 });
    resetUser(st.id);
    logEvent({ userId: st.id, type: "error", detail: "ilerleme öğretmen tarafından sıfırlandı" });
    return Response.json({ ok: true, reset: st.id });
  }

  if (body.classId) {
    if (!myClassIds.has(body.classId)) return Response.json({ ok: false, error: "yetkisiz" }, { status: 403 });
    const sts = studentsOfClass(body.classId);
    for (const s of sts) resetUser(s.id);
    return Response.json({ ok: true, reset: sts.map((s) => s.id) });
  }

  return Response.json({ ok: false, error: "studentId veya classId gerekli" }, { status: 400 });
}
