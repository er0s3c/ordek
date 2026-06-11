// Ortak flag-submit hub: yapıştırılan ham flag'in HANGİ zafiyete ait olduğunu otomatik bul.
// POST { flag, level? } -> { ok, slug, name, level } | { ok:false }
// Sınıf modunda oturumlu öğrenci varsa ilerleme ona; yoksa global'e işlenir.
import { FLAGS } from "@/lib/flags";
import { MACHINES } from "@/lib/machines";
import { markSolved, markSolvedFor } from "@/lib/progress";
import { getSession } from "@/lib/session";
import { logEvent } from "@/lib/events";

export const dynamic = "force-dynamic";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
};
const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json", ...CORS } });

const norm = (s) => String(s || "").trim().toLowerCase();

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function POST(req) {
  let body = {};
  try { body = await req.json(); } catch {}
  const target = norm(body.flag);
  if (!target) return json({ ok: false, error: "Flag boş." }, 400);

  const sess = process.env.LAB_MODE === "class" ? getSession(req) : null;
  const studentId = sess && sess.role === "student" ? sess.userId : null;

  const slug = Object.keys(FLAGS).find((s) => norm(FLAGS[s]) === target);
  if (!slug) {
    if (studentId) logEvent({ userId: studentId, type: "flag_fail", detail: "hub: eşleşmedi", ok: false });
    return json({ ok: false, error: "Bu flag hiçbir zafiyetle eşleşmedi." });
  }

  const level = ["low", "medium", "high"].includes(body.level) ? body.level : "low";
  const name = (MACHINES[slug] && MACHINES[slug].name) || slug;
  if (studentId) { markSolvedFor(studentId, slug, level); logEvent({ userId: studentId, type: "flag_ok", slug, level, name, ok: true }); }
  else markSolved(slug, level);
  return json({ ok: true, slug, name, level });
}
