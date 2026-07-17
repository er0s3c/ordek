// Proxy → panel heartbeat: hedef makine etkinliğini bildirir (idle-reaper için).
// Yalnız proxy çağırır; paylaşılan sır ile doğrulanır.
import { touch } from "@/lib/docker";

export const dynamic = "force-dynamic";

const SECRET = process.env.LAB_SESSION_SECRET || "ordek-lab-dev-session-secret-change-me";

export async function POST(req) {
  if (req.headers.get("x-proxy-secret") !== SECRET) {
    return Response.json({ error: "yetkisiz" }, { status: 403 });
  }
  let body = {};
  try { body = await req.json(); } catch {}
  if (body && body.token) touch(String(body.token));
  return Response.json({ ok: true });
}
