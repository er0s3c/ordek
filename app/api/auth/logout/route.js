// Çıkış — oturum çerezini temizle.
import { clearCookie } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST() {
  return new Response(JSON.stringify({ ok: true }), {
    headers: { "content-type": "application/json", "set-cookie": clearCookie() },
  });
}
