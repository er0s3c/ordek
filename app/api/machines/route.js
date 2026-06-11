// Docker hedef makineleri: listele (GET) + başlat (POST).
// Sınıf modunda makine, oturumdaki öğrenciye etiketlenir (öğretmen takibi) ve
// başlatma/hata olayları aktivite günlüğüne yazılır.
import { listMachines, startMachine, MACHINE_SLUGS, LEVELS } from "@/lib/docker";
import { getSession } from "@/lib/session";
import { getUserById } from "@/lib/accounts";
import { logEvent } from "@/lib/events";

export const dynamic = "force-dynamic";

function dockerErr(e) {
  return Response.json(
    { error: "docker calistirilamadi (panel docker.sock erisimine sahip mi?)", detail: String((e && e.stderr) || (e && e.message) || e) },
    { status: 500 }
  );
}

function student(req) {
  if (process.env.LAB_MODE !== "class") return null;
  const s = getSession(req);
  return s && s.role === "student" ? s : null;
}

// Çalışan makineleri listele. Sınıf modunda öğrenci yalnızca kendi makinelerini görür;
// öğretmen (ve bireysel mod) hepsini görür.
export async function GET(req) {
  try {
    let machines = await listMachines();
    const sess = process.env.LAB_MODE === "class" ? getSession(req) : null;
    if (sess && sess.role === "student") machines = machines.filter((m) => m.studentId === sess.userId);
    return Response.json({ machines });
  } catch (e) { return dockerErr(e); }
}

// Makine baslat: belirli zafiyet + seviye icin tek hedef konteyner
export async function POST(req) {
  let body = {};
  try { body = await req.json(); } catch {}
  const slug = body.slug, level = body.level;
  if (!MACHINE_SLUGS.includes(slug)) return Response.json({ error: "bilinmeyen zafiyet" }, { status: 400 });
  if (!LEVELS.includes(level)) return Response.json({ error: "gecersiz seviye" }, { status: 400 });

  const sess = student(req);
  const studentId = sess ? sess.userId : null;
  const studentName = sess ? (getUserById(sess.userId) || {}).username || sess.userId : null;

  try {
    const m = await startMachine({ slug, level, studentId, studentName });
    if (studentId) logEvent({ userId: studentId, type: "machine_start", slug, level, detail: `port ${m.port}` });
    return Response.json(m);
  } catch (e) {
    if (studentId) logEvent({ userId: studentId, type: "machine_error", slug, level, detail: String((e && e.stderr) || (e && e.message) || e), ok: false });
    return dockerErr(e);
  }
}
