// ============================================================================
//  app/labLogic.js — Saf (React'siz) lab mantığı: dizin filtreleme, rastgele /
//  sıradaki zafiyet seçimi ve rozet hesabı.
//  Hem app/LabApp.jsx (UI) hem test/units.mjs (node) buradan import eder; böylece
//  mantık tek yerde durur, framework olmadan test edilebilir.
//  NOT: Bu modülde flag/secret YOK — yalnızca istemci-güvenli katalog mantığı.
// ============================================================================
import { VULNS, KILLCHAINS } from "./labData.js";

// Bir zafiyetin çözülmüş seviye listesi (0..3 eleman).
const levelsOf = (solved, slug) => (solved && solved[slug]) || [];

/**
 * Dizin arama + filtre.
 *  query  → ad/senaryo içinde (büyük/küçük harf duyarsız, latin)
 *  group  → "all" | "core" | "auth" | "modern"
 *  status → "all" | "unsolved" (0) | "solved" (>0) | "full" (=3)
 */
export function filterVulns(vulns, { query = "", group = "all", status = "all" } = {}, solved = {}) {
  const q = String(query).trim().toLowerCase();
  return (vulns || []).filter((v) => {
    if (group !== "all" && v.group !== group) return false;
    const done = levelsOf(solved, v.slug).length;
    if (status === "unsolved" && done > 0) return false;
    if (status === "solved" && done === 0) return false;
    if (status === "full" && done < 3) return false;
    if (q) {
      const hay = `${v.name} ${v.scenario || ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

// Rastgele zafiyet. rnd enjekte edilebilir (deterministik test için).
export function pickRandomVuln(vulns, rnd = Math.random) {
  const list = vulns || [];
  if (!list.length) return null;
  return list[Math.floor(rnd() * list.length)] || list[0];
}

// İlk "tam çözülmemiş" (<3 seviye) zafiyet; hepsi tamsa null.
export function pickNextUnsolved(vulns, solved = {}) {
  return (vulns || []).find((v) => levelsOf(solved, v.slug).length < 3) || null;
}

// ─────────────────────────────────────────────────────────────────────────
//  Akademi yol haritası (roadmap) — modül ilerleme + kilit mantığı.
//  Saf/flag'siz: hem app/LabApp.jsx hem test/units.mjs buradan import eder.
//  Modül şekli (academyData.ROADMAP):
//    { id, type:"theory"|"labs", lessons:[ {id, ...} | {id, slug} ] }
//  theory dersi: readLessons[lesson.id] truthy ise "okundu" sayılır.
//  labs dersi:  solved[slug] içinde en az bir seviye varsa "çözüldü" sayılır.
// ─────────────────────────────────────────────────────────────────────────

// Bir modülün ilerlemesi: { done, total, complete }.
export function moduleProgress(module, { solved = {}, readLessons = {} } = {}) {
  const lessons = (module && module.lessons) || [];
  const total = lessons.length;
  let done = 0;
  for (const ls of lessons) {
    if (module && (module.type === "labs" || module.type === "tool")) {
      const slug = ls.slug || ls.id;
      if (levelsOf(solved, slug).length > 0) done++;
    } else if (readLessons[ls.id]) {
      done++;
    }
  }
  return { done, total, complete: total > 0 && done === total };
}

/**
 * Tüm yol haritasının durumu. Her modül için { id, done, total, complete, unlocked }.
 *  - overrides yok (bireysel): sıralı kilit — modül i, i===0 veya önceki tamamsa açılır.
 *  - overrides.unlocked dizisi varsa (sınıf modu, öğretmen yönetir): açık modüller
 *    bu listeyle belirlenir (ilk modül her zaman açık kalır — güvenlik).
 */
export function roadmapStatus(roadmap, { solved = {}, readLessons = {}, overrides = null } = {}) {
  const list = roadmap || [];
  const forced = overrides && Array.isArray(overrides.unlocked) ? overrides.unlocked : null;
  const out = [];
  let prevComplete = true; // ilk modül daima açık
  for (let i = 0; i < list.length; i++) {
    const m = list[i];
    const { done, total, complete } = moduleProgress(m, { solved, readLessons });
    const unlocked = forced ? (i === 0 || forced.includes(m.id)) : (i === 0 || prevComplete);
    out.push({ id: m.id, done, total, complete, unlocked });
    prevComplete = complete;
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────
//  Makine / bildirim / skor — saf yardımcılar (UI + node testleri ortak).
//  Flag/secret YOK; yalnızca istemci-güvenli veri üzerinde çalışır.
// ─────────────────────────────────────────────────────────────────────────

// Flag çözülünce oto-kapatılacak makineyi bul: slug+level eşleşen çalışan makine.
// machines: /api/machines listesi. Eşleşme yoksa null.
export function matchRunningMachine(machines, slug, level) {
  if (!Array.isArray(machines) || !slug) return null;
  return machines.find((m) => m && m.slug === slug && (!level || m.level === level)) || null;
}

// Bildirim listesinde okunmamış sayısı.
export function unreadCount(notes) {
  if (!Array.isArray(notes)) return 0;
  return notes.reduce((n, m) => n + (m && !m.read ? 1 : 0), 0);
}

// Skor tablosu sıralaması: count azalan, eşitlikte ad artan (stabil) + yarışma sırası (1,2,2,4).
export function rankStudents(rows) {
  const sorted = [...(rows || [])].sort((a, b) => {
    const d = (b.count || 0) - (a.count || 0);
    if (d) return d;
    return String(a.name || "").localeCompare(String(b.name || ""), "tr");
  });
  let lastCount = null, lastRank = 0;
  return sorted.map((r, i) => {
    const count = r.count || 0;
    const rank = count === lastCount ? lastRank : i + 1;
    lastCount = count; lastRank = rank;
    return { ...r, count, rank };
  });
}

// Rozet hesabı (FlagsView + öğretmen paneli ortak). VULNS/KILLCHAINS katalogdan.
export function computeBadges(solved) {
  const s = solved || {};
  const has = (slug) => (s[slug] || []).length > 0;
  // Yalnız zafiyet flag'lerini say (tool-* lab çözümleri rozet/oranı bozmasın).
  const gotFlags = VULNS.reduce((a, v) => a + ((s[v.slug] || []).length), 0);
  const groupSlugs = (g) => VULNS.filter((v) => v.group === g).map((v) => v.slug);
  const allSolved = (arr) => arr.length > 0 && arr.every(has);
  const levelCount = (lv) => Object.values(s).filter((ls) => ls && ls.includes(lv)).length;
  const chainDone = KILLCHAINS.some((kc) => kc.steps.every(has));
  const totalFlags = VULNS.length * 3;
  return [
    { emo: "🩸", t: "İlk Kan", d: "İlk flag'ini yakala", on: gotFlags >= 1 },
    { emo: "🧩", t: "Çekirdek Avcısı", d: "Tüm çekirdek zafiyetleri çöz", on: allSolved(groupSlugs("core")) },
    { emo: "🔑", t: "Kimlik Kırıcı", d: "Tüm AuthN/AuthZ çöz", on: allSolved(groupSlugs("auth")) },
    { emo: "⚙️", t: "Modern Usta", d: "Tüm modern/sunucu çöz", on: allSolved(groupSlugs("modern")) },
    { emo: "🟥", t: "Low Avcısı", d: "10+ Low flag", on: levelCount("low") >= 10 },
    { emo: "🟧", t: "Medium Avcısı", d: "10+ Medium flag", on: levelCount("medium") >= 10 },
    { emo: "🟩", t: "High Avcısı", d: "10+ High flag", on: levelCount("high") >= 10 },
    { emo: "⛓️", t: "Zincir Kırıcı", d: "Bir kill-chain'i tamamla", on: chainDone },
    { emo: "🌗", t: "Yarı Yol", d: "Flag'lerin yarısı", on: totalFlags > 0 && gotFlags >= Math.ceil(totalFlags / 2) },
    { emo: "🏆", t: "Efsane", d: "Tüm flag'leri topla", on: totalFlags > 0 && gotFlags === totalFlags },
  ];
}
