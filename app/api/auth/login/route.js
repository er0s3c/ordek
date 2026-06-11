// Giriş (sınıf modu): öğretmen veya öğrenci.
import { getUserByUsername, verifyPassword, publicUser, getClassById } from "@/lib/accounts";
import { sessionCookie } from "@/lib/session";
import { logEvent } from "@/lib/events";

export const dynamic = "force-dynamic";

export async function POST(req) {
  if (process.env.LAB_MODE !== "class") return Response.json({ ok: false, error: "Sınıf modu etkin değil." }, { status: 400 });
  let body = {}; try { body = await req.json(); } catch {}
  const u = getUserByUsername(body.username);
  if (!u || !verifyPassword(u, body.password)) {
    return Response.json({ ok: false, error: "Kullanıcı adı veya parola hatalı." }, { status: 401 });
  }
  logEvent({ userId: u.id, type: "login" });
  const user = publicUser(u);
  if (user.classId) { const c = getClassById(user.classId); user.className = c ? c.name : null; }
  return new Response(JSON.stringify({ ok: true, user }), {
    headers: { "content-type": "application/json", "set-cookie": sessionCookie(u.id, u.role) },
  });
}
