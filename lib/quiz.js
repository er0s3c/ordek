// ============================================================================
//  lib/quiz.js — modül testi mantığı (SUNUCU-ONLY).
//  publicQuiz()  → soru + şıklar (CEVAPSIZ) — istemciye gönderilebilir.
//  checkQuiz()   → cevapları puanlar, doğru indeks + açıklamayı döndürür.
//  Cevaplar yalnız sunucuda (lib/quizData.js) durur; asla client'a sızmaz.
// ============================================================================
import { QUIZZES } from "./quizData.js";

export function hasQuiz(id) {
  return !!(id && Object.prototype.hasOwnProperty.call(QUIZZES, id));
}

export function quizMeta(id) {
  const q = hasQuiz(id) ? QUIZZES[id] : null;
  return q ? { id, title: q.title, pass: q.pass ?? 70, count: q.questions.length } : null;
}

// İstemciye gönderilecek hali: cevap (answer) ve açıklama (explain) ÇIKARILIR.
export function publicQuiz(id) {
  if (!hasQuiz(id)) return null;
  const q = QUIZZES[id];
  return {
    id,
    title: q.title,
    pass: q.pass ?? 70,
    questions: q.questions.map((x, i) => ({ i, q: x.q, choices: x.choices.slice() })),
  };
}

// answers: index dizisi (answers[i] = kullanıcının i. soruda seçtiği şık indeksi)
export function checkQuiz(id, answers) {
  if (!hasQuiz(id)) return null;
  const q = QUIZZES[id];
  const arr = Array.isArray(answers) ? answers : [];
  let correct = 0;
  const results = q.questions.map((x, i) => {
    const raw = arr[i];
    const your = raw === undefined || raw === null || raw === "" ? null : Number(raw);
    const ok = your === x.answer;
    if (ok) correct++;
    return { i, ok, your, correct: x.answer, explain: x.explain };
  });
  const total = q.questions.length;
  const score = total ? Math.round((correct / total) * 100) : 0;
  const pass = q.pass ?? 70;
  return { id, score, correct, total, pass, passed: score >= pass, results };
}

export function listQuizIds() {
  return Object.keys(QUIZZES);
}
