// Öğretmen paneli — sınıf + öğrenci özeti (her öğrencinin ilerleme/aktivite/makine durumu).
import { getSession } from "@/lib/session";
import { getUserById, listClasses, studentsOfTeacher, getClassById } from "@/lib/accounts";
import { getAllUserProgress } from "@/lib/progress";
import { lastActivityMap, failCounts } from "@/lib/events";
import { listMachines } from "@/lib/docker";

export const dynamic = "force-dynamic";

function gate(req) {
  if (process.env.LAB_MODE !== "class") return null;
  const s = getSession(req);
  return s && s.role === "teacher" ? s : null;
}

function summarize(solved) {
  let total = 0, low = 0, medium = 0, high = 0;
  for (const ls of Object.values(solved || {})) {
    for (const l of ls || []) { total++; if (l === "low") low++; else if (l === "medium") medium++; else if (l === "high") high++; }
  }
  return { total, low, medium, high };
}

export async function GET(req) {
  const sess = gate(req);
  if (!sess) return Response.json({ error: "yetkisiz" }, { status: 403 });
  const teacher = getUserById(sess.userId);

  const classes = listClasses(sess.userId);
  const students = studentsOfTeacher(sess.userId);
  const allProgress = getAllUserProgress();
  const ids = students.map((s) => s.id);
  const lastAct = lastActivityMap(ids);
  const fails = failCounts(ids);

  // Docker makineleri (öğrenci başına çalışan sayısı) — docker yoksa hata gracefully geç
  let machinesByStudent = {};
  let dockerError = null;
  try {
    const machines = await listMachines();
    for (const m of machines) { if (m.studentId) machinesByStudent[m.studentId] = (machinesByStudent[m.studentId] || 0) + 1; }
  } catch (e) { dockerError = String((e && e.stderr) || (e && e.message) || e); }

  const classNameById = {};
  for (const c of classes) classNameById[c.id] = c.name;

  const studentRows = students.map((s) => {
    const solved = allProgress[s.id] || {};
    const sum = summarize(solved);
    const f = fails[s.id] || { fail: 0, ok: 0 };
    return {
      id: s.id, username: s.username, displayName: s.displayName,
      classId: s.classId, className: classNameById[s.classId] || null,
      createdAt: s.createdAt,
      solved, ...sum,
      lastActivity: lastAct[s.id] || 0,
      runningMachines: machinesByStudent[s.id] || 0,
      fails: f.fail, oks: f.ok,
    };
  });

  const classRows = classes.map((c) => ({
    id: c.id, name: c.name, code: c.code, archived: !!c.archived, createdAt: c.createdAt,
    studentCount: studentRows.filter((s) => s.classId === c.id).length,
  }));

  return Response.json({
    teacher: teacher ? { id: teacher.id, username: teacher.username, displayName: teacher.displayName } : null,
    classes: classRows,
    students: studentRows,
    dockerError,
  });
}
