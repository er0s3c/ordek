// ============================================================================
//  app/gamifyData.js — XP/seviye/rozet KURALLARI + saf hesap (istemci-güvenli).
//  Burada SIR yoktur; her şey kullanıcının kendi ilerlemesinden türetilir.
//  computeGamify() FlagsView'da çağrılır. Seri (streak) sunucudan (/api/gamify)
//  gelir; XP/rozet bu saf fonksiyonla istemcide hesaplanır.
// ============================================================================

// Çözülen her (zafiyet × seviye) için XP.
const LVL_XP = { low: 10, medium: 15, high: 25 };
const PER_LESSON = 5;     // okunan her teori dersi
const PER_QUIZ = 25;      // geçilen her modül testi
const PER_STREAK_DAY = 8; // seri günü başına

export const LEVELS = [
  { name: "Çaylak", min: 0, icon: "🥚" },
  { name: "Çırak", min: 120, icon: "🌱" },
  { name: "Gözcü", min: 300, icon: "🔍" },
  { name: "Avcı", min: 600, icon: "🎯" },
  { name: "Uzman", min: 1000, icon: "⚔️" },
  { name: "Usta", min: 1600, icon: "🛡️" },
  { name: "Efsane", min: 2400, icon: "👑" },
];

// ctx: { solved:{slug:[lvls]}, lessonsRead:int, quizScores:{id:score}, streak:int }
export function computeGamify({ solved = {}, lessonsRead = 0, quizScores = {}, streak = 0 } = {}) {
  let xp = 0, flagCount = 0, highCount = 0;
  for (const lvls of Object.values(solved || {})) {
    if (!Array.isArray(lvls)) continue;
    for (const lv of lvls) { xp += LVL_XP[lv] || 10; flagCount++; if (lv === "high") highCount++; }
  }
  const lessons = Math.max(0, lessonsRead | 0);
  xp += lessons * PER_LESSON;

  const qVals = Object.values(quizScores || {}).map(Number).filter((n) => Number.isFinite(n));
  const quizPassed = qVals.filter((s) => s >= 70).length;
  const quizPerfect = qVals.some((s) => s >= 100);
  xp += quizPassed * PER_QUIZ;
  xp += Math.max(0, streak | 0) * PER_STREAK_DAY;

  let li = 0;
  for (let i = 0; i < LEVELS.length; i++) if (xp >= LEVELS[i].min) li = i;
  const cur = LEVELS[li], next = LEVELS[li + 1] || null;
  const pct = next ? Math.max(0, Math.min(100, Math.round(((xp - cur.min) / (next.min - cur.min)) * 100))) : 100;

  const badges = [
    { emo: "🩸", t: "İlk Kan", d: "İlk flag'ini yakala", on: flagCount >= 1 },
    { emo: "🚩", t: "Beşli", d: "5 flag yakala", on: flagCount >= 5 },
    { emo: "⚔️", t: "Yirmi Vuruş", d: "20 flag yakala", on: flagCount >= 20 },
    { emo: "🟩", t: "Zorlu Avcı", d: "En az 1 High flag çöz", on: highCount >= 1 },
    { emo: "📚", t: "Akademisyen", d: "10 ders oku", on: lessons >= 10 },
    { emo: "🧠", t: "Sınavcı", d: "Bir modül testini geç", on: quizPassed >= 1 },
    { emo: "💯", t: "Tam Not", d: "Bir testten %100 al", on: quizPerfect },
    { emo: "🔥", t: "3 Gün Seri", d: "3 gün üst üste çalış", on: streak >= 3 },
    { emo: "☄️", t: "7 Gün Seri", d: "7 gün üst üste çalış", on: streak >= 7 },
  ];

  return {
    xp, level: li + 1, levelName: cur.name, levelIcon: cur.icon,
    nextName: next ? next.name : null, nextAt: next ? next.min : null,
    pct, flagCount, quizPassed, streak: Math.max(0, streak | 0), badges,
  };
}

export default computeGamify;
