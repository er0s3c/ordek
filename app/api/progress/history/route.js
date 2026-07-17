// Öğrencinin kendi flag deneme geçmişi (başarılı/başarısız) — sınıf modu.
// Aktivite günlüğünden (events.jsonl) yalnız kendi flag olaylarını döndürür.
import { getSession } from "@/lib/session";
import { queryEvents } from "@/lib/events";

export const dynamic = "force-dynamic";

export async function GET(req) {
  if (process.env.LAB_MODE !== "class") return Response.json({ events: [] });
  const sess = getSession(req);
  if (!sess) return Response.json({ events: [] });
  const events = queryEvents({ userIds: [sess.userId], types: ["flag_ok", "flag_fail"], limit: 50 });
  return Response.json({ events });
}
