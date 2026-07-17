// Makine "canlı tut" — idle reaper'ı sıfırlar. Öğrenci paneli, üzerinde çalıştığı
// makinenin token'ı için periyodik/elle çağırır; touch(token) son-görülme'yi günceller.
import { touch } from "@/lib/docker";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(req) {
  if (process.env.LAB_MODE === "class" && !getSession(req)) {
    return Response.json({ ok: false, error: "yetkisiz" }, { status: 403 });
  }
  let body = {}; try { body = await req.json(); } catch {}
  const token = String(body.token || "");
  if (!/^[A-Za-z0-9_-]{6,64}$/.test(token)) return Response.json({ ok: false, error: "gecersiz token" }, { status: 400 });
  touch(token);
  return Response.json({ ok: true, token, ts: Date.now() });
}
