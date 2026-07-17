// Makine aksiyonu: durdur / yeniden başlat (deep-freeze).
// Sınıf modunda öğrenci oturumu varsa olaylar aktivite günlüğüne yazılır.
import { stopMachine, restartMachine, restartToolLab, MACHINE_SLUGS, LEVELS } from "@/lib/docker";
import { isToolLab } from "@/lib/toolLabs";
import { getSession } from "@/lib/session";
import { getUserById } from "@/lib/accounts";
import { logEvent } from "@/lib/events";

export const dynamic = "force-dynamic";

function student(req) {
  if (process.env.LAB_MODE !== "class") return null;
  const s = getSession(req);
  return s && s.role === "student" ? s : null;
}

export async function POST(req, { params }) {
  const id = params.id;
  if (!/^[a-zA-Z0-9_.-]+$/.test(id)) return Response.json({ error: "gecersiz id" }, { status: 400 });
  let body = {}; try { body = await req.json(); } catch {}
  const action = body.action || "stop";

  const sess = student(req);
  const studentId = sess ? sess.userId : null;
  const studentName = sess ? (getUserById(sess.userId) || {}).username || sess.userId : null;

  try {
    if (action === "stop") {
      const r = await stopMachine(id);
      if (studentId) logEvent({ userId: studentId, type: "machine_stop", detail: id });
      return Response.json(r);
    }
    if (action === "restart") {
      const slug = body.slug;
      if (isToolLab(slug)) {
        const r = await restartToolLab({ id, slug, studentId, studentName });
        if (studentId) logEvent({ userId: studentId, type: "machine_restart", slug, level: "lab" });
        return Response.json(r);
      }
      const level = body.level;
      if (!MACHINE_SLUGS.includes(slug) || !LEVELS.includes(level)) return Response.json({ error: "slug/level gerekli" }, { status: 400 });
      const r = await restartMachine({ id, slug, level, studentId, studentName });
      if (studentId) logEvent({ userId: studentId, type: "machine_restart", slug, level });
      return Response.json(r);
    }
    return Response.json({ error: "bilinmeyen aksiyon" }, { status: 400 });
  } catch (e) {
    if (studentId) logEvent({ userId: studentId, type: "machine_error", detail: String((e && e.stderr) || (e && e.message) || e), ok: false });
    return Response.json({ error: "docker hatasi", detail: String((e && e.stderr) || (e && e.message) || e) }, { status: 500 });
  }
}
