// Canlı sınıf skor tablosu (sınıf modu). Öğrenci → kendi sınıfı; öğretmen → tüm sınıfları.
// Flag sayısına göre sıralı (rankStudents). ⚠ FLAG/secret YOK — yalnız sayılar + adlar.
import { getSession } from "@/lib/session";
import { getUserById, studentsOfClass, studentsOfTeacher } from "@/lib/accounts";
import { getUserProgress } from "@/lib/progress";
import { rankStudents } from "@/app/labLogic";

export const dynamic = "force-dynamic";

export async function GET(req) {
  if (process.env.LAB_MODE !== "class") return Response.json({ rows: [], meId: null, role: null });
  const sess = getSession(req);
  if (!sess) return Response.json({ error: "yetkisiz" }, { status: 403 });
  const me = getUserById(sess.userId);
  if (!me) return Response.json({ error: "yetkisiz" }, { status: 403 });

  const students = me.role === "teacher" ? studentsOfTeacher(me.id) : (me.classId ? studentsOfClass(me.classId) : []);
  const rows = students.map((s) => {
    const solved = getUserProgress(s.id).solved;
    const count = Object.values(solved).reduce((a, ls) => a + (Array.isArray(ls) ? ls.length : 0), 0);
    return { id: s.id, name: s.displayName || s.username, count, classId: s.classId };
  });
  return Response.json({ rows: rankStudents(rows), meId: me.id, role: me.role });
}
