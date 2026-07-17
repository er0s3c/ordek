// Oyunlaştırma API — seri (streak) + quiz skorları (rozet/XP istemcide hesaplanır).
// POST → bugünü aktif işaretle (ping), güncel seriyi döndür.
// GET  → { streak, quizScores, days }  (yazmaz)
import { getSession } from "@/lib/session";
import { recordActivity, getStreak, getActivityDays } from "@/lib/gamify";
import { getAllQuizScores } from "@/lib/quizProgress";

export const dynamic = "force-dynamic";

function uid(req) {
  if (process.env.LAB_MODE !== "class") return null;
  const s = getSession(req);
  return s ? s.userId : false;
}

export async function GET(req) {
  const u = uid(req);
  if (u === false) return Response.json({ ok: false, error: "yetkisiz" }, { status: 403 });
  return Response.json({ ok: true, streak: getStreak(u || null), quizScores: getAllQuizScores(u || null), days: getActivityDays(u || null) });
}

export async function POST(req) {
  const u = uid(req);
  if (u === false) return Response.json({ ok: false, error: "yetkisiz" }, { status: 403 });
  return Response.json({ ok: true, streak: recordActivity(u || null) });
}
