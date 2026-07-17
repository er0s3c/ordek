"use client";
// ============================================================================
//  app/QuizPanel.jsx — modül sonu çoktan seçmeli test.
//  ⚠ Cevaplar SUNUCU-ONLY (lib/quizData.js): burada yalnız /api/quiz'in
//     sterilize (cevapsız) çıktısı kullanılır; puanlama POST /api/quiz'te yapılır.
//  Test yoksa hiçbir şey render etmez (graceful).
// ============================================================================
import React, { useState, useEffect } from "react";
import { toast } from "@/lib/toast";

const celebrate = () => { if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("ordek-celebrate")); };

export default function QuizPanel({ moduleId, onPass }) {
  const [quiz, setQuiz] = useState(null);     // { id, title, pass, questions }
  const [best, setBest] = useState(0);
  const [answers, setAnswers] = useState({}); // { [qIndex]: choiceIndex }
  const [result, setResult] = useState(null); // POST sonucu
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    setQuiz(null); setAnswers({}); setResult(null); setLoaded(false);
    (async () => {
      try {
        const r = await fetch(`/api/quiz?module=${encodeURIComponent(moduleId)}`);
        const d = await r.json();
        if (!alive) return;
        if (d.hasQuiz) { setQuiz(d.quiz); setBest(d.best || 0); }
      } catch {}
      if (alive) setLoaded(true);
    })();
    return () => { alive = false; };
  }, [moduleId]);

  if (!loaded || !quiz) return null;

  const total = quiz.questions.length;
  const answeredCount = Object.keys(answers).length;
  const pick = (qi, ci) => { if (!result) setAnswers((a) => ({ ...a, [qi]: ci })); };

  const submit = async () => {
    if (answeredCount < total || busy) return;
    setBusy(true);
    try {
      const arr = quiz.questions.map((_, i) => answers[i]);
      const r = await fetch("/api/quiz", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ module: moduleId, answers: arr }) });
      const d = await r.json();
      if (!d.ok) { toast("Test gönderilemedi", "err"); return; }
      setResult(d); setBest(d.best || 0);
      if (d.passed) { celebrate(); toast(`Testi geçtin! Skor %${d.score}`, "ok"); onPass && onPass(d.score); }
      else toast(`Skor %${d.score} — geçmek için %${d.pass} gerekli`, "warn");
    } catch { toast("Bağlantı hatası", "err"); }
    finally { setBusy(false); }
  };

  const reset = () => { setAnswers({}); setResult(null); };

  return (
    <div className="panel quizp" style={{ marginTop: 18 }}>
      <div className="panel-h">
        <span>📝 modül testi</span>
        <span style={{ flex: 1 }} />
        {best > 0 && <span className={"tag " + (best >= quiz.pass ? "solved" : "medium")}>en iyi: %{best}</span>}
      </div>
      <div className="panel-b">
        <h3 style={{ margin: "0 0 4px" }}>{quiz.title}</h3>
        <div className="sub" style={{ marginBottom: 14 }}>{total} soru · geçme: %{quiz.pass}</div>

        {result && (
          <div className={"callout quiz-banner " + (result.passed ? "ok" : "warn")} style={{ marginBottom: 14 }}>
            <span className="ci">{result.passed ? "🎉" : "↻"}</span>
            <span>{result.passed ? `Tebrikler, testi geçtin! Skorun %${result.score} (${result.correct}/${result.total} doğru).` : `Skorun %${result.score} (${result.correct}/${result.total}). Geçmek için %${result.pass} gerekiyor — açıklamaları oku ve tekrar dene.`}</span>
          </div>
        )}

        {quiz.questions.map((q) => {
          const res = result && result.results[q.i];
          return (
            <div className="quiz-q" key={q.i}>
              <div className="quiz-qh"><span className="quiz-n">{q.i + 1}</span><span>{q.q}</span></div>
              <div className="quiz-choices">
                {q.choices.map((c, ci) => {
                  const sel = answers[q.i] === ci;
                  let cls = "quiz-choice" + (sel ? " sel" : "");
                  if (res) {
                    if (ci === res.correct) cls += " correct";
                    else if (sel && !res.ok) cls += " wrong";
                  }
                  return (
                    <button type="button" key={ci} className={cls} disabled={!!result} onClick={() => pick(q.i, ci)}>
                      <span className="qc-mark" />{c}
                    </button>
                  );
                })}
              </div>
              {res && <div className={"quiz-explain " + (res.ok ? "ok" : "no")}>{res.ok ? "✓ Doğru" : "✗ Yanlış"} — {res.explain}</div>}
            </div>
          );
        })}

        <div className="row between" style={{ marginTop: 16, alignItems: "center" }}>
          {!result
            ? <button className="kbtn primary" disabled={answeredCount < total || busy} onClick={submit}>Testi gönder ({answeredCount}/{total})</button>
            : <button className="kbtn" onClick={reset}>↻ Tekrar dene</button>}
          {!result && answeredCount < total && <span className="sub">tüm soruları yanıtla</span>}
        </div>
      </div>
    </div>
  );
}
