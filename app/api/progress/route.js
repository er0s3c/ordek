// Sunucu-taraflı ilerleme/scoreboard. Panel ilk yüklemede GET ile okur.
// GET            -> { solved: { [slug]: ["low",...] } }  (sınıf modunda oturumdaki öğrencinin)
// POST {reset:1} -> ilerlemeyi sıfırla (oturumdaki öğrencinin / global)
// POST {slug,level} -> manuel işaretle (genelde /api/flag otomatik işaretler)
// CORS açık (LAB-ONLY): docker hedefleri de raporlayabilsin.
import { getProgress, markSolved, resetProgress, getUserProgress, markSolvedFor, resetUser } from "@/lib/progress";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
};
const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json", ...CORS } });

function studentOf(req) {
  if (process.env.LAB_MODE !== "class") return null;
  const s = getSession(req);
  return s && s.role === "student" ? s.userId : null;
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function GET(req) {
  const sid = studentOf(req);
  return json(sid ? getUserProgress(sid) : getProgress());
}

export async function POST(req) {
  let body = {};
  try { body = await req.json(); } catch {}
  const sid = studentOf(req);
  if (body.reset) return json(sid ? resetUser(sid) : resetProgress());
  if (body.slug) return json(sid ? markSolvedFor(sid, body.slug, body.level) : markSolved(body.slug, body.level));
  return json({ error: "slug gerekli" }, 400);
}
