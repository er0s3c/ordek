// İlk öğretmen hesabını oluştur (sınıf modu, ilk açılış sihirbazı).
// Bir öğretmen zaten varsa reddedilir (idempotent koruma).
import { teacherExists, createUser } from "@/lib/accounts";
import { sessionCookie } from "@/lib/session";
import { logEvent } from "@/lib/events";

export const dynamic = "force-dynamic";

export async function POST(req) {
  if (process.env.LAB_MODE !== "class") return Response.json({ ok: false, error: "Sınıf modu etkin değil." }, { status: 400 });
  if (teacherExists()) return Response.json({ ok: false, error: "Öğretmen hesabı zaten oluşturulmuş." }, { status: 409 });
  let body = {}; try { body = await req.json(); } catch {}
  try {
    const u = createUser({ role: "teacher", username: body.username, password: body.password, displayName: body.displayName });
    logEvent({ userId: u.id, type: "register", detail: "öğretmen (ilk kurulum)" });
    return new Response(JSON.stringify({ ok: true, user: u }), {
      headers: { "content-type": "application/json", "set-cookie": sessionCookie(u.id, "teacher") },
    });
  } catch (e) {
    return Response.json({ ok: false, error: String((e && e.message) || e) }, { status: 400 });
  }
}
