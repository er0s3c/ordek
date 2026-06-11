// Öğrenci kaydı (sınıf modu): kullanıcı adı + parola + ad + SINIF KODU.
import { createUser, getClassByCode } from "@/lib/accounts";
import { sessionCookie } from "@/lib/session";
import { logEvent } from "@/lib/events";

export const dynamic = "force-dynamic";

export async function POST(req) {
  if (process.env.LAB_MODE !== "class") return Response.json({ ok: false, error: "Sınıf modu etkin değil." }, { status: 400 });
  let body = {}; try { body = await req.json(); } catch {}
  const cls = getClassByCode(body.classCode);
  if (!cls) return Response.json({ ok: false, error: "Sınıf kodu geçersiz veya pasif." }, { status: 400 });
  try {
    const u = createUser({ role: "student", username: body.username, password: body.password, displayName: body.displayName, classId: cls.id });
    logEvent({ userId: u.id, type: "register", detail: `sınıf: ${cls.name}` });
    return new Response(JSON.stringify({ ok: true, user: { ...u, className: cls.name } }), {
      headers: { "content-type": "application/json", "set-cookie": sessionCookie(u.id, "student") },
    });
  } catch (e) {
    return Response.json({ ok: false, error: String((e && e.message) || e) }, { status: 400 });
  }
}
