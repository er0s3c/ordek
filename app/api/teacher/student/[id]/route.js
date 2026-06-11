// Öğrenci drill-down — matris + aktivite zaman çizelgesi + makine durumları + hatalar.
import { getSession } from "@/lib/session";
import { getUserById, listClasses, publicUser, getClassById } from "@/lib/accounts";
import { getUserProgress } from "@/lib/progress";
import { queryEvents } from "@/lib/events";
import { listMachines } from "@/lib/docker";

export const dynamic = "force-dynamic";

function gate(req) {
  if (process.env.LAB_MODE !== "class") return null;
  const s = getSession(req);
  return s && s.role === "teacher" ? s : null;
}

export async function GET(req, { params }) {
  const sess = gate(req);
  if (!sess) return Response.json({ error: "yetkisiz" }, { status: 403 });

  const student = getUserById(params.id);
  if (!student || student.role !== "student") return Response.json({ error: "öğrenci bulunamadı" }, { status: 404 });

  // yetki: öğrenci bu öğretmenin sınıflarından birinde mi?
  const myClassIds = new Set(listClasses(sess.userId).map((c) => c.id));
  if (!myClassIds.has(student.classId)) return Response.json({ error: "yetkisiz" }, { status: 403 });

  const { solved } = getUserProgress(student.id);
  const events = queryEvents({ userIds: [student.id], limit: 150 });
  const errors = queryEvents({ userIds: [student.id], types: ["machine_error", "error", "flag_fail"], limit: 60 });

  let machines = [];
  let dockerError = null;
  try {
    machines = (await listMachines()).filter((m) => m.studentId === student.id);
  } catch (e) { dockerError = String((e && e.stderr) || (e && e.message) || e); }

  const cls = getClassById(student.classId);
  const pub = publicUser(student);
  return Response.json({
    student: { ...pub, className: cls ? cls.name : null },
    solved, events, errors, machines, dockerError,
  });
}
