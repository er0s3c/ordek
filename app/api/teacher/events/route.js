// Canlı aktivite akışı — öğretmenin sınıflarındaki son olaylar (poll edilir).
import { getSession } from "@/lib/session";
import { listClasses, studentsOfTeacher, getClassById } from "@/lib/accounts";
import { queryEvents } from "@/lib/events";

export const dynamic = "force-dynamic";

function gate(req) {
  if (process.env.LAB_MODE !== "class") return null;
  const s = getSession(req);
  return s && s.role === "teacher" ? s : null;
}

export async function GET(req) {
  const sess = gate(req);
  if (!sess) return Response.json({ error: "yetkisiz" }, { status: 403 });
  const url = new URL(req.url);
  const classId = url.searchParams.get("classId");
  const studentId = url.searchParams.get("studentId");
  const since = Number(url.searchParams.get("since")) || 0;
  const limit = Math.min(Number(url.searchParams.get("limit")) || 80, 300);

  let students = studentsOfTeacher(sess.userId);
  if (classId) students = students.filter((s) => s.classId === classId);
  if (studentId) students = students.filter((s) => s.id === studentId);

  const nameById = {};
  for (const s of students) nameById[s.id] = s.displayName || s.username;

  const events = queryEvents({ userIds: students.map((s) => s.id), since, limit })
    .map((e) => ({ ...e, who: nameById[e.userId] || e.userId }));

  return Response.json({ events });
}
