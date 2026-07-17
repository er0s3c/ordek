// Modül testi API — bireysel modda global, sınıf modunda öğrenci-bazlı.
// GET  ?module=<id>           → { hasQuiz, quiz?, best }   (cevapsız sorular)
// POST { module, answers[] }  → { score, passed, results[] } + en yüksek skoru kaydeder
import { getSession } from "@/lib/session";
import { publicQuiz, checkQuiz, hasQuiz } from "@/lib/quiz";
import { getQuizScore, setQuizScore } from "@/lib/quizProgress";

export const dynamic = "force-dynamic";

// Bireysel mod: oturum yok → null (global ilerleme). Sınıf modu: oturum şart → userId; yoksa false (yetkisiz).
function uid(req) {
  if (process.env.LAB_MODE !== "class") return null;
  const s = getSession(req);
  return s ? s.userId : false;
}

export async function GET(req) {
  const u = uid(req);
  if (u === false) return Response.json({ ok: false, error: "yetkisiz" }, { status: 403 });
  const id = new URL(req.url).searchParams.get("module") || "";
  if (!hasQuiz(id)) return Response.json({ ok: true, hasQuiz: false });
  return Response.json({ ok: true, hasQuiz: true, quiz: publicQuiz(id), best: getQuizScore(u || null, id) });
}

export async function POST(req) {
  const u = uid(req);
  if (u === false) return Response.json({ ok: false, error: "yetkisiz" }, { status: 403 });
  let body = {}; try { body = await req.json(); } catch {}
  const id = typeof body.module === "string" ? body.module : "";
  if (!hasQuiz(id)) return Response.json({ ok: false, error: "test yok" }, { status: 404 });
  const result = checkQuiz(id, body.answers);
  const best = setQuizScore(u || null, id, result.score);
  return Response.json({ ok: true, ...result, best });
}
