// Flag doğrulama — panelin + hedef sayfaların "flag gönder" kutusu buraya POST atar.
// Tek doğruluk kaynağı: lib/flags.js (her zafiyetin canonical flag'i, SUNUCU-ONLY).
// Sınıf modunda oturumlu öğrenci varsa ilerleme ona; yoksa global'e işlenir (bireysel/anonim).
// Her deneme aktivite günlüğüne yazılır (öğretmen takibi).
// CORS açık: izole docker hedefleri (farklı port) panel'e rapor edebilsin (LAB-ONLY).
import { FLAGS } from "@/lib/flags";
import { markSolved, markSolvedFor } from "@/lib/progress";
import { getSession } from "@/lib/session";
import { logEvent } from "@/lib/events";
import { MACHINES } from "@/lib/machines";

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
  const { slug, level, flag } = body || {};

  const expected = FLAGS[slug];
  if (!expected) return json({ ok: false, error: "bilinmeyen zafiyet" }, 400);

  // Sınıf modu + öğrenci oturumu → kişisel ilerleme + olay kaydı
  const sess = process.env.LAB_MODE === "class" ? getSession(req) : null;
  const studentId = sess && sess.role === "student" ? sess.userId : null;
  const name = (MACHINES[slug] && MACHINES[slug].name) || slug;

  if (norm(flag) === norm(expected)) {
    if (studentId) markSolvedFor(studentId, slug, level); else markSolved(slug, level);
    if (studentId) logEvent({ userId: studentId, type: "flag_ok", slug, level, name, ok: true });
    return json({ ok: true, slug, level: level || null });
  }
  if (studentId) logEvent({ userId: studentId, type: "flag_fail", slug, level, name, ok: false });
  return json({ ok: false, error: "Flag eşleşmedi — hedefte doğru exploit'i çalıştırdığından emin ol." });
}
