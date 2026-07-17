// ============================================================================
//  app/api/steps — BANDIT-TARZI adım motoru API'si.
//   GET  ?slug=   → sterilize sorular (cevaplar AYIKLANMIŞ) + öğrencinin ilerlemesi
//   POST {slug,index,answer} → sıradaki soruyu doğrula, ilerlet; son adım = flag.
//  Doğruluk kaynağı SUNUCU-ONLY: lib/steps.js (sorular/cevaplar) + lib/flags.js (flag).
//  Sınıf modunda oturumlu öğrenci → kişisel ilerleme + olay kaydı; yoksa global.
// ============================================================================
import { stepsFor, stepCount, publicSteps, checkStep } from "@/lib/steps";
import { getStep, setStep } from "@/lib/stepProgress";
import { markSolved, markSolvedFor } from "@/lib/progress";
import { getSession } from "@/lib/session";
import { logEvent } from "@/lib/events";
import { MACHINES } from "@/lib/machines";

export const dynamic = "force-dynamic";

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });

function student(req) {
  const sess = process.env.LAB_MODE === "class" ? getSession(req) : null;
  return sess && sess.role === "student" ? sess.userId : null;
}

export async function GET(req) {
  const slug = new URL(req.url).searchParams.get("slug");
  if (!slug || !stepsFor(slug)) return json({ error: "bu lab için adım yok", hasSteps: false }, 404);
  const studentId = student(req);
  const total = stepCount(slug);
  const reached = Math.min(getStep(studentId, slug), total);
  return json({ slug, total, reached, done: reached >= total, questions: publicSteps(slug, reached) });
}

export async function POST(req) {
  let body = {};
  try { body = await req.json(); } catch {}
  const { slug, index, answer, level } = body || {};
  // Web zafiyetleri seviye (low/medium/high) geçer; araç labları geçmez → "lab"
  // (progress.js bunu "low"a normalize eder; mevcut araç-lab davranışıyla aynı).
  const markLevel = ["low", "medium", "high"].includes(level) ? level : "lab";

  if (!slug || !stepsFor(slug)) return json({ ok: false, error: "bilinmeyen lab" }, 400);
  const total = stepCount(slug);
  const studentId = student(req);
  const reached = Math.min(getStep(studentId, slug), total);

  if (reached >= total) return json({ ok: true, reached, total, done: true }); // zaten bitmiş

  // Sıkı gating: yalnız SIRADAKİ soru cevaplanabilir (ileri atlama yok).
  const idx = Math.floor(Number(index));
  if (!(idx === reached)) return json({ ok: false, error: "sıradaki soruyu cevapla (atlama yok)", reached, total }, 409);

  const qs = stepsFor(slug);
  const isLast = idx === total - 1;
  const name = (MACHINES[slug] && MACHINES[slug].name) || slug;

  if (!checkStep(slug, idx, answer)) {
    // Son adım (flag) yanlışsa öğretmen takibi için kaydet; ara adımlarda log tutma.
    if (isLast && studentId) logEvent({ userId: studentId, type: "flag_fail", slug, level: "lab", name, ok: false });
    return json({ ok: false, error: qs[idx].isFlag ? "Flag eşleşmedi — doğru çıktıyı yakaladığından emin ol." : "Cevap yanlış — komutu çalıştırıp çıktıyı tekrar kontrol et.", reached, total });
  }

  const newReached = setStep(studentId, slug, reached + 1);
  const done = newReached >= total;

  // Son adım = flag → mevcut flag/skor/rozet akışını aynen tetikle.
  if (isLast) {
    if (studentId) markSolvedFor(studentId, slug, markLevel); else markSolved(slug, markLevel);
    if (studentId) logEvent({ userId: studentId, type: "flag_ok", slug, level: markLevel, name, ok: true });
  }

  return json({ ok: true, reached: newReached, total, done, next: done ? null : publicSteps(slug, newReached).slice(-1)[0] });
}
