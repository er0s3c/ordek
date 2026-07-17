"use client";
import React, { useState as uS, useEffect as uE, useMemo, useRef } from "react";
import { GROUPS, VULNS, KILLCHAINS } from "./labData";
import { filterVulns, pickRandomVuln, pickNextUnsolved, computeBadges, roadmapStatus, moduleProgress, matchRunningMachine } from "./labLogic";
import { LEARN, ROADMAP } from "./academyData";
import { computeGamify } from "./gamifyData";
import MachinePanel from "./MachinePanel";
import ToolLabPanel from "./ToolLabPanel";
import NotificationCenter from "./NotificationCenter";
import CopyButton from "./CopyButton";
import QuizPanel from "./QuizPanel";
import ConnCheckPanel from "./ConnCheckPanel";
import VpnPanel from "./VpnPanel";
import { MACHINES, MACHINE_SLUGS } from "@/lib/machines";
import { toast } from "@/lib/toast";
/* ===========================================================
   ördek // Vulnerable Lab — Uygulama kabuğu + görünümler
   Model: yalnızca GERÇEK hedef makineler. In-app demo YOK.
   =========================================================== */

const LS_SOLVED = "ördek_solved_v1";
const LS_LEVEL = "ördek_level_v1";
const LS_AUTH = "ördek_auth_v1";
const LS_WELCOME = "ördek_welcome_v1";
const LS_LESSONS = "ördek_lessons_v1"; // okunan teori dersleri {lessonId:true}
const LS_AUTOCLOSE = "ördek_autoclose_v1"; // flag bulununca makineyi oto-kapat

const loadJSON = (k, d) => { if (typeof window === "undefined") return d; try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const LEVEL_LABEL = { low: "Low", medium: "Medium", high: "High" };

// Sunucu ilerlemesini yereldekiyle birleştir (slug başına seviye kümeleri tekilleştirilir).
const mergeSolved = (a, b) => {
  const out = { ...(a || {}) };
  for (const k of Object.keys(b || {})) out[k] = [...new Set([...(out[k] || []), ...(b[k] || [])])];
  return out;
};

// Bildirimleri birleştir: sunucu mesajları (id m_*) yetkilidir (read durumu dahil),
// yerel olaylar (id local_*: makine/flag) korunur. id'ye göre tekilleştirir.
const mergeNotes = (prev, serverMsgs) => {
  const map = new Map();
  for (const n of prev || []) map.set(n.id, n);
  for (const m of serverMsgs || []) {
    const ex = map.get(m.id);
    // Bir kez okundu işaretlenen bildirim, poll tekrar getirince okunmamışa DÖNMESİN.
    map.set(m.id, { ...(ex || {}), ...m, read: (ex && ex.read) || m.read || false });
  }
  return [...map.values()];
};

// Roadmap'te bir dersi bul: { mod, lesson, title } | null. (sunum + bant için)
const findLesson = (moduleId, lessonId) => {
  const mod = ROADMAP.find(m => m.id === moduleId);
  if (!mod) return null;
  const lesson = (mod.lessons || []).find(l => l.id === lessonId) || null;
  return { mod, lesson, title: (lesson && lesson.title) || mod.name };
};

/* ───────── icons (inline, minimal) ───────── */
const Ic = ({ d, ...p }) => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d={d} /></svg>;
const ICONS = {
  grid: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  shield: "M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z",
  flag: "M5 21V4m0 0h11l-2 4 2 4H5",
  bug: "M9 9V6a3 3 0 0 1 6 0v3M6 13H3m18 0h-3M6 18l-2 2m16 0l-2-2M8 9h8v5a4 4 0 0 1-8 0z",
  level: "M4 20V10m6 10V4m6 16v-6",
  target: "M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0-18 0M12 12m-4 0a4 4 0 1 0 8 0a4 4 0 1 0-8 0M12 12m-0.5 0a0.5 0.5 0 1 0 1 0a0.5 0.5 0 1 0-1 0",
  send: "M22 2 11 13M22 2l-7 20-4-9-9-4z",
  server: "M3 5h18v6H3zM3 13h18v6H3zM7 8h.01M7 16h.01",
  home: "M3 11l9-8 9 8M5 10v10h14V10",
  book: "M4 5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2zM18 3v16",
  award: "M12 15a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM8.5 13.5L7 22l5-3 5 3-1.5-8.5",
  users: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  rocket: "M5 13c-2 1-2 6-2 6s5 0 6-2M12 15l-3-3a13 13 0 0 1 9-9c2 0 3 1 3 3a13 13 0 0 1-9 9M15 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2",
  info: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20M12 8h.01M11 12h1v4h1",
  search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.35-4.35",
  dice: "M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM8 8h.01M16 8h.01M8 16h.01M16 16h.01M12 12h.01",
};

// Sayaç dolum animasyonu (prefers-reduced-motion'a saygılı, count-up).
function useCountUp(target, ms = 700) {
  const [n, setN] = uS(0);
  const ref = useRef();
  uE(() => {
    if (typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setN(target); return;
    }
    const t0 = performance.now();
    cancelAnimationFrame(ref.current);
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / ms);
      setN(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) ref.current = requestAnimationFrame(tick);
    };
    ref.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(ref.current);
  }, [target, ms]);
  return n;
}

const setLevelCookie = (lvl) => { if (typeof document !== "undefined") document.cookie = `security_level=${lvl}; path=/; SameSite=Lax`; };

/* ───────── ortak: kopyalanabilir komut kutusu ───────── */
function CopyCmd({ cmd, note }) {
  const [ok, setOk] = uS(false);
  const copy = () => { try { navigator.clipboard.writeText(cmd); setOk(true); setTimeout(() => setOk(false), 1400); } catch {} };
  return (
    <div className="col" style={{ gap: 4 }}>
      <div className="cmd"><span className="pr">$</span><code>{cmd}</code>
        <button type="button" className={"cp" + (ok ? " ok" : "")} onClick={copy}>{ok ? "kopyalandı ✓" : "kopyala"}</button></div>
      {note && <span className="faint mono" style={{ fontSize: 11 }}>{note}</span>}
    </div>
  );
}

/* ───────── ortak: sihirbaz adım göstergesi (stepper) ───────── */
function StepDots({ n, i }) {
  return (
    <div className="wdots" aria-hidden="true">
      {Array.from({ length: n }).map((_, k) => (
        <div key={k} className={"wd " + (k === i ? "on" : k < i ? "done" : "")}>
          <span className="b">{k < i ? "✓" : k + 1}</span>
          {k < n - 1 && <span className="ln" />}
        </div>
      ))}
    </div>
  );
}

/* ───────── interaktif menü turu (spotlight, "sonraki sonraki") ───────── */
const TOUR_INTRO = { title: "ördek-lab turu 🦆", body: "Menüleri 30 saniyede tanıyalım. Her adımda soldaki ilgili menü vurgulanır. İstediğin an \"Atla\" diyebilirsin." };
const TOUR = {
  base: [
    TOUR_INTRO,
    { sel: '[data-tour="dashboard"]', title: "Zafiyet Dizini", body: "27 zafiyetin listesi. Bir zafiyet seç, senaryosunu oku ve izole hedef makineyi başlat." },
    { sel: '[data-tour="academy"]', title: "Öğren / Akademi", body: "Önce teori: her zafiyet nedir, neden tehlikeli, gerçek hayatta nerede karşına çıkar ve nasıl korunulur." },
    { sel: '[data-tour="level"]', title: "Security Level", body: "Low / Medium / High. Seçtiğin seviye tüm hedeflerin zorluğunu ve flag'ini değiştirir." },
    { sel: '[data-tour="machines"]', title: "Docker Makineleri", body: "Başlattığın izole hedef konteynerler burada. \"Aç\" ile yalnız sana açık (kimlik-doğrulamalı) makineni yeni sekmede sömür." },
    { sel: '[data-tour="submit"]', title: "Flag Gönder (Hub)", body: "Yakaladığın ordek{…} flag'ini buraya yapıştır; sistem hangi zafiyete ait olduğunu otomatik bulur." },
    { sel: '[data-tour="flags"]', title: "Rozetler & İlerleme", body: "Çözdüklerin, kazandığın rozetler ve kill-chain senaryoları. İlerlemeni buradan izle." },
  ],
  teacher: [
    TOUR_INTRO,
    { sel: '[data-tour="teacher"]', title: "Öğretmen Paneli", body: "Sınıf oluştur, üretilen kodu öğrencilere ver ve ilerlemeyi CANLI izle: kim ne çözdü, hangi rozeti aldı, nerede takıldı." },
    { sel: '[data-tour="machines"]', title: "Docker Makineleri", body: "Sınıfta çalışan tüm hedef makineler. Hepsi senin bilgisayarında; izole, kaynak-sınırlı ve internetsiz çalışır." },
    { sel: '[data-tour="flags"]', title: "Rozetler & İlerleme", body: "Zafiyet × seviye matrisi ve rozetler — sınıfın genel durumuna da buradan bakabilirsin." },
    { sel: '[data-tour="academy"]', title: "Öğren / Akademi", body: "Ders anlatımı için hazır teori içeriği: her zafiyetin açıklaması ve gerçek dünya örnekleri." },
  ],
};

function Tour({ steps, onClose }) {
  const [i, setI] = uS(0);
  const [rect, setRect] = uS(null);
  const step = steps[i];
  uE(() => {
    const measure = () => {
      const el = step && step.sel ? document.querySelector(step.sel) : null;
      if (el) { el.scrollIntoView({ block: "nearest" }); const r = el.getBoundingClientRect(); setRect({ top: r.top, left: r.left, width: r.width, height: r.height }); }
      else setRect(null);
    };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => { window.removeEventListener("resize", measure); window.removeEventListener("scroll", measure, true); };
  }, [i]);
  uE(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); if (e.key === "ArrowRight") setI(p => Math.min(steps.length - 1, p + 1)); if (e.key === "ArrowLeft") setI(p => Math.max(0, p - 1)); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const last = i === steps.length - 1;
  const w = typeof window !== "undefined" ? window.innerWidth : 1200;
  const h = typeof window !== "undefined" ? window.innerHeight : 800;
  let popStyle;
  if (rect && rect.width) {
    const right = rect.left + rect.width + 16;
    popStyle = right + 340 < w
      ? { top: Math.max(12, Math.min(rect.top - 4, h - 240)), left: right }
      : { top: Math.max(12, Math.min(rect.top + rect.height + 12, h - 240)), left: Math.max(12, rect.left) };
  } else popStyle = { top: "50%", left: "50%", transform: "translate(-50%,-50%)" };
  return (
    <div className="tour-root" role="dialog" aria-modal="true">
      <div className="tour-backdrop" onClick={onClose} />
      {rect && rect.width
        ? <div className="tour-spot" style={{ top: rect.top - 6, left: rect.left - 6, width: rect.width + 12, height: rect.height + 12 }} />
        : null}
      <div className="tour-pop" style={popStyle}>
        <div className="eyebrow">// tur · {i + 1}/{steps.length}</div>
        <h3>{step.title}</h3>
        <p>{step.body}</p>
        <div className="tour-dots">{steps.map((_, k) => <span key={k} className={k === i ? "on" : k < i ? "done" : ""} />)}</div>
        <div className="tour-nav">
          <button className="kbtn ghost sm" onClick={onClose}>Atla</button>
          <span style={{ flex: 1 }} />
          {i > 0 && <button className="kbtn sm" onClick={() => setI(i - 1)}>← Geri</button>}
          <button className="kbtn primary sm" onClick={() => last ? onClose() : setI(i + 1)}>{last ? "Bitir ✓" : "Sonraki →"}</button>
        </div>
      </div>
    </div>
  );
}

/* ───────── toast bildirimleri ───────── */
function Toaster() {
  const [items, setItems] = uS([]);
  uE(() => {
    const on = (e) => {
      const id = Math.random().toString(36).slice(2);
      setItems(p => [...p.slice(-4), { id, msg: e.detail.msg, type: e.detail.type || "ok" }]);
      setTimeout(() => setItems(p => p.filter(x => x.id !== id)), 3400);
    };
    window.addEventListener("ordek-toast", on);
    return () => window.removeEventListener("ordek-toast", on);
  }, []);
  if (!items.length) return null;
  return <div className="toaster">{items.map(t => <div key={t.id} className={"toast " + t.type}>{t.msg}</div>)}</div>;
}

/* ───────── kutlama: konfeti + opsiyonel ses (flag yakalandığında) ───────── */
const LS_SOUND = "ördek_sound_v1";
// Herhangi bir yerden çağrılır; <Confetti/> dinler. (toast'a benzer olay köprüsü)
function celebrate() { if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("ordek-celebrate")); }
// Kısa, zarif "ding" — yalnız ses açıkken (localStorage). WebAudio, ek dosya yok.
function playDing() {
  try {
    if (typeof window === "undefined" || loadJSON(LS_SOUND, false) !== true) return;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const ac = new AC();
    [660, 880, 1175].forEach((f, i) => {
      const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime + i * 0.085;
      o.type = "sine"; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.12, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
      o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + 0.24);
    });
    setTimeout(() => { try { ac.close(); } catch {} }, 900);
  } catch {}
}
const CF_HUES = ["--green-bright", "--blue", "--amber", "--green", "--red-bright"];
function Confetti() {
  const [bursts, setBursts] = uS([]);
  uE(() => {
    const reduce = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const on = () => {
      playDing();
      if (reduce) return; // hareket azaltma: yalnız ses, konfeti yok
      const id = Math.random().toString(36).slice(2);
      const pieces = Array.from({ length: 80 }).map((_, i) => ({
        i, left: Math.random() * 100, delay: Math.random() * 0.25, dur: 1.7 + Math.random() * 1.3,
        rot: Math.round(Math.random() * 360 + 120), drift: Math.round((Math.random() * 2 - 1) * 90),
        w: 6 + Math.random() * 6, hue: CF_HUES[i % CF_HUES.length],
      }));
      setBursts(b => [...b, { id, pieces }]);
      setTimeout(() => setBursts(b => b.filter(x => x.id !== id)), 3200);
    };
    window.addEventListener("ordek-celebrate", on);
    return () => window.removeEventListener("ordek-celebrate", on);
  }, []);
  if (!bursts.length) return null;
  return (
    <div className="confetti" aria-hidden="true">
      {bursts.map(b => b.pieces.map(p => (
        <span key={b.id + "-" + p.i} className="cf" style={{
          left: p.left + "%", width: p.w, height: p.w * 0.42, background: `var(${p.hue})`,
          animationDelay: p.delay + "s", animationDuration: p.dur + "s",
          "--drift": p.drift + "px", "--rot": p.rot + "deg",
        }} />
      )))}
    </div>
  );
}

/* ═══════════════════════════════ APP ═══════════════════════════════ */
function App() {
  const [mounted, setMounted] = uS(false);
  const [session, setSession] = uS(null); // { mode, needsSetup, user }
  const [auth, setAuth] = uS(false);       // bireysel mod yerel kapısı
  const [view, setView] = uS("dashboard"); // dashboard | vuln | level | flags | submit | machines
  const [vulnId, setVulnId] = uS(VULNS[0].id);
  const [level, setLevel] = uS("low");
  const [solved, setSolved] = uS({}); // {slug: [levels]}
  const [tour, setTour] = uS(null);   // { steps, flag } | null — interaktif menü turu
  const [sound, setSound] = uS(false); // kutlama sesi (localStorage)
  const [readLessons, setReadLessons] = uS({}); // okunan teori dersleri {lessonId:true}
  const [academyModule, setAcademyModule] = uS(null); // aktif roadmap modülü id | null (akademi içi)
  const [classroom, setClassroom] = uS(null); // sınıf canlı durum: { unlockedModules, assignments, presentation, messages }
  const shownMsgs = useRef(null); if (shownMsgs.current === null) shownMsgs.current = new Set(); // toast'lanan mesaj id'leri
  const [notes, setNotes] = uS([]); // bildirim merkezi: sunucu mesajları ∪ yerel olaylar (makine/flag)
  const [autoClose, setAutoClose] = uS(true); // flag bulununca makineyi oto-kapat (localStorage)

  // Mod + oturum durumu (sunucudan). Bireysel modda user=null, kapı yerel.
  const loadSession = () => fetch("/api/auth/session").then(r => r.json())
    .then(s => setSession(s && s.mode ? s : { mode: "individual", needsSetup: false, user: null }))
    .catch(() => setSession({ mode: "individual", needsSetup: false, user: null }));

  uE(() => {
    setAuth(loadJSON(LS_AUTH, false));
    setSound(loadJSON(LS_SOUND, false));
    const lvl = loadJSON(LS_LEVEL, "low");
    setLevel(lvl);
    setLevelCookie(lvl);
    setSolved(loadJSON(LS_SOLVED, {}));
    setReadLessons(loadJSON(LS_LESSONS, {}));
    setAutoClose(loadJSON(LS_AUTOCLOSE, true));
    if (!loadJSON(LS_WELCOME, false)) setView("welcome"); // ilk girişte karşılama
    loadSession().finally(() => setMounted(true));
  }, []);
  // Sunucu-taraflı ilerlemeyi çek ve yereldekiyle birleştir (sekmeler/konteynerler arası kalıcılık).
  uE(() => {
    fetch("/api/progress").then(r => r.json()).then(d => { if (d && d.solved) setSolved(prev => mergeSolved(prev, d.solved)); }).catch(() => {});
  }, []);
  // Oyunlaştırma: bugünü "aktif" işaretle (günlük seri / streak için).
  uE(() => { fetch("/api/gamify", { method: "POST" }).catch(() => {}); }, []);
  uE(() => { if (mounted) { localStorage.setItem(LS_LEVEL, JSON.stringify(level)); setLevelCookie(level); } }, [level, mounted]);
  uE(() => { if (mounted) localStorage.setItem(LS_SOLVED, JSON.stringify(solved)); }, [solved, mounted]);
  uE(() => { if (mounted) localStorage.setItem(LS_AUTH, JSON.stringify(auth)); }, [auth, mounted]);
  uE(() => { if (mounted) localStorage.setItem(LS_SOUND, JSON.stringify(sound)); }, [sound, mounted]);
  uE(() => { if (mounted) localStorage.setItem(LS_LESSONS, JSON.stringify(readLessons)); }, [readLessons, mounted]);
  uE(() => { if (mounted) localStorage.setItem(LS_AUTOCLOSE, JSON.stringify(autoClose)); }, [autoClose, mounted]);
  // Sınıf modu: canlı sınıf durumunu (ödev/kilit/sunum/mesaj) periyodik çek.
  uE(() => {
    if (!mounted || !session || session.mode !== "class") return;
    let stop = false;
    const isTeacher = session.user && session.user.role === "teacher";
    const pull = () => {
      fetch("/api/classroom").then(r => r.json()).then(d => { if (!stop && d) setClassroom(d); }).catch(() => {});
      // Öğretmen: bekleyen yardım isteklerini header bildirim merkezine taşı (SSE'ye poll fallback).
      if (isTeacher) fetch("/api/teacher/classroom").then(r => r.json()).then(d => {
        if (stop || !d || !d.rooms) return;
        const helps = [];
        for (const cid of Object.keys(d.rooms)) for (const h of (d.rooms[cid].help || [])) helps.push({ id: "help_" + h.id, type: "help", from: h.studentName, text: h.note || "Yardım istedi", title: "Yardım isteği", ts: h.ts || Date.now(), read: false });
        if (helps.length) setNotes(prev => mergeNotes(prev, helps));
      }).catch(() => {});
    };
    pull();
    const t = setInterval(pull, 4000);
    return () => { stop = true; clearInterval(t); };
  }, [mounted, session]);
  // İlk girişte rol-bazlı menü turu (localStorage bayrağıyla bir kez; gateler geçildikten sonra).
  uE(() => {
    if (!mounted || !session) return;
    const isClass = session.mode === "class";
    const me = session.user, role = me && me.role;
    if (isClass) { if (session.needsSetup || !me) return; } else if (!auth) return;
    const flag = isClass ? (role === "teacher" ? "ordek_tour_teacher_v1" : "ordek_tour_student_v1") : "ordek_tour_individual_v1";
    if (loadJSON(flag, false)) return;
    const steps = (isClass && role === "teacher") ? TOUR.teacher : TOUR.base;
    const t = setTimeout(() => setTour({ steps, flag }), 700);
    return () => clearTimeout(t);
  }, [mounted, session, auth]);

  const vuln = useMemo(() => VULNS.find(v => v.id === vulnId), [vulnId]);
  const totalFlags = VULNS.length * 3;
  // Yalnız zafiyet flag'lerini say (tool-* lab çözümleri sayacı bozmasın).
  const gotFlags = VULNS.reduce((a, v) => a + ((solved[v.slug] || []).length), 0);

  const markSolved = (slug, lvl) => setSolved(prev => {
    const cur = prev[slug] || [];
    if (cur.includes(lvl)) return prev;
    return { ...prev, [slug]: [...cur, lvl] };
  });
  const markRead = (lessonId) => setReadLessons(prev => (prev[lessonId] ? prev : { ...prev, [lessonId]: true }));
  // Yerel bildirim ekle (makine hazır / flag çözüldü gibi sunucu-dışı olaylar).
  const addNote = (note) => setNotes(prev => [...prev, { id: "local_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6), ts: Date.now(), read: false, type: "system", ...note }]);
  // Merkez açılınca: yereli okundu yap + sunucu mesajlarını okundu işaretle.
  const markAllNotesRead = () => {
    setNotes(prev => prev.map(n => (n.read ? n : { ...n, read: true })));
    fetch("/api/classroom", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "markRead" }) }).catch(() => {});
  };
  const clearNotes = () => { setNotes([]); shownMsgs.current = new Set(); };
  // Öğrenci → öğretmene "yardım iste" (el kaldır).
  const requestHelp = async () => {
    const note = typeof window !== "undefined" ? (window.prompt("Öğretmene iletmek istediğin kısa not (opsiyonel):") || "") : "";
    const d = await fetch("/api/classroom", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "help", note }) }).then(r => r.json()).catch(() => ({}));
    if (d && d.ok) toast("✋ Yardım isteğin öğretmene iletildi", "ok"); else toast((d && d.error) || "İstek gönderilemedi", "err");
  };
  // Sunucu mesajları geldikçe merkeze işle + ilk gelişte toast (bir kez).
  uE(() => {
    if (!classroom || !Array.isArray(classroom.messages)) return;
    classroom.messages.forEach(m => { if (!m.read && !shownMsgs.current.has(m.id)) { shownMsgs.current.add(m.id); toast(`${m.priority === "urgent" ? "🚨" : "✉️"} ${m.from}: ${m.text}`, m.priority === "urgent" ? "warn" : "ok"); } });
    setNotes(prev => mergeNotes(prev, classroom.messages));
  }, [classroom]);
  // Gerçek-zamanlı (SSE) — anlık teslim; kopulursa 4 sn poll fallback zaten çalışır.
  uE(() => {
    if (!mounted || !session || session.mode !== "class" || !session.user) return;
    let es;
    try { es = new EventSource("/api/notify/stream"); } catch { return; }
    es.onmessage = (e) => {
      let d; try { d = JSON.parse(e.data); } catch { return; }
      if (d.kind === "note" && d.note) {
        if (!shownMsgs.current.has(d.note.id)) { shownMsgs.current.add(d.note.id); toast(`${d.note.priority === "urgent" ? "🚨" : "✉️"} ${d.note.from}: ${d.note.text}`, d.note.priority === "urgent" ? "warn" : "ok"); }
        setNotes(prev => mergeNotes(prev, [d.note]));
      } else if (d.kind === "help" && d.help) {
        toast(`✋ ${d.help.studentName} yardım istedi`, "warn");
        // Stabil id (help_<id>) → poll fallback ile aynı kaydı tekrarlamaz.
        setNotes(prev => mergeNotes(prev, [{ id: "help_" + d.help.id, type: "help", from: d.help.studentName, text: d.help.note || "Yardım istedi", title: "Yardım isteği", ts: d.help.ts || Date.now(), read: false }]));
      }
    };
    es.onerror = () => {}; // EventSource otomatik yeniden bağlanır
    return () => { try { es.close(); } catch {} };
  }, [mounted, session && session.user && session.user.id]);
  const resetProgress = async () => {
    if (typeof window !== "undefined" && !window.confirm("Tüm ilerleme (sunucu + yerel) sıfırlansın mı?")) return;
    try { await fetch("/api/progress", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ reset: 1 }) }); } catch {}
    setSolved({});
  };

  if (!mounted || !session) return null;

  const isClass = session.mode === "class";
  const me = session.user;
  const role = me && me.role;
  const showTeacher = !isClass || role === "teacher"; // bireysel: kişisel özet · sınıf: yalnız öğretmen

  // Sınıf modu kapıları: önce ilk öğretmen sihirbazı, sonra giriş/kayıt.
  if (isClass) {
    if (session.needsSetup) return <TeacherSetup onDone={loadSession} />;
    if (!me) return <ClassAuth onAuthed={loadSession} />;
  } else if (!auth) {
    return <Login onAuth={() => setAuth(true)} />;
  }

  const logout = async () => {
    if (isClass) { try { await fetch("/api/auth/logout", { method: "POST" }); } catch {} setView("dashboard"); await loadSession(); }
    else setAuth(false);
  };
  const startTour = () => {
    const flag = isClass ? (role === "teacher" ? "ordek_tour_teacher_v1" : "ordek_tour_student_v1") : "ordek_tour_individual_v1";
    setTour({ steps: (isClass && role === "teacher") ? TOUR.teacher : TOUR.base, flag });
  };

  const openVuln = (id) => { setVulnId(id); setView("vuln"); };
  const dismissWelcome = () => { if (typeof window !== "undefined") localStorage.setItem(LS_WELCOME, JSON.stringify(true)); setView("dashboard"); };
  // Sınıf canlı durumundan türetilenler (role uygun: bireyselde hepsi boş/null).
  const presentation = classroom && classroom.presentation && classroom.presentation.active ? classroom.presentation : null;
  const overrides = isClass ? { unlocked: classroom ? classroom.unlockedModules : null } : null;
  const assignments = (classroom && classroom.assignments) || [];
  const isStudent = isClass && role === "student";
  const presented = presentation ? findLesson(presentation.moduleId, presentation.lessonId) : null;
  const crumb = view === "welcome" ? "Karşılama"
    : view === "onboarding" ? "Başlarken"
    : view === "dashboard" ? "Laboratuvarlar"
    : view === "academy" ? "Öğren / Akademi"
    : view === "level" ? "Security Level"
    : view === "flags" ? "Rozetler & İlerleme"
    : view === "submit" ? "Flag Gönder (Hub)"
    : view === "machines" ? "Docker Makineleri"
    : view === "leaderboard" ? "Skor Tablosu"
    : view === "history" ? "Flag Geçmişi"
    : view === "assignments" ? "Ödevlerim"
    : view === "teacher" ? (isClass && role === "teacher" ? "Öğretmen Paneli" : "İlerleme Özeti")
    : vuln.name;

  return (
    <div className="app">
      <div className="brand">
        <img className="brand-logo" src="/ordek.png" alt="ördek" />
        <div className="brand-name"><b>ördek</b> <span>// vuln-lab</span></div>
      </div>

      <div className="header">
        <div className="crumb">~/ <b>{crumb}</b></div>
        <div className="spacer" />
        <div className="pill">level: <b style={{ color: `var(--lvl-${level})` }}>{LEVEL_LABEL[level]}</b></div>
        <div className="pill">flags: <b>{gotFlags}</b>/{totalFlags}</div>
        {isClass && me && <div className="pill">{role === "teacher" ? "👩‍🏫" : "🎓"} <b>{me.displayName || me.username}</b>{me.className ? <span className="faint"> · {me.className}</span> : null}</div>}
        {isStudent && <button className="kbtn ghost" style={{ padding: "6px 12px", fontSize: 13 }} onClick={requestHelp} title="öğretmenden yardım iste (el kaldır)">✋ Yardım</button>}
        {isClass && <NotificationCenter notes={notes} onMarkAllRead={markAllNotesRead} onClear={clearNotes} />}
        <button className="kbtn ghost" style={{ padding: "6px 10px", fontSize: 13 }} onClick={() => setAutoClose(a => !a)} title={autoClose ? "flag bulununca makine oto-kapanır: açık" : "oto-kapanma: kapalı"} aria-pressed={autoClose}>{autoClose ? "⏹ oto" : "⏹̶ oto"}</button>
        <button className="kbtn ghost" style={{ padding: "6px 10px", fontSize: 13 }} onClick={() => setSound(s => !s)} title={sound ? "kutlama sesi: açık" : "kutlama sesi: kapalı"} aria-pressed={sound}>{sound ? "🔊" : "🔇"}</button>
        <button className="kbtn ghost" style={{ padding: "6px 12px", fontSize: 13 }} onClick={startTour} title="menü turunu tekrar başlat">🎯 Tur</button>
        <button className="kbtn ghost" style={{ padding: "6px 12px", fontSize: 13 }} onClick={logout}>çıkış</button>
      </div>

      <Sidebar view={view} setView={setView} solved={solved} showTeacher={showTeacher} role={role} isClass={isClass} />

      <div className="main">
        <div className="main-wrap">
          {isStudent && presented && view !== "academy" && (
            <div className="present-bar"><span className="live" /> 👩‍🏫 Öğretmen anlatıyor — <b style={{ marginLeft: 4 }}>{presented.title}</b><span style={{ flex: 1 }} /><button className="kbtn sm" onClick={() => { setAcademyModule(presentation.moduleId); setView("academy"); }}>İzle →</button></div>
          )}
          <div className="view-anim" key={view}>
            {view === "welcome" && <Welcome setView={setView} openVuln={openVuln} onDone={dismissWelcome} />}
            {view === "onboarding" && <Onboarding />}
            {view === "dashboard" && <Dashboard openVuln={openVuln} solved={solved} setView={setView} level={level} assignments={assignments} />}
            {view === "academy" && <Academy openVuln={openVuln} solved={solved} readLessons={readLessons} markRead={markRead} markSolved={markSolved} addNote={addNote} autoClose={autoClose} module={academyModule} setModule={setAcademyModule} overrides={overrides} presentation={isStudent ? presentation : null} assignments={assignments} />}
            {view === "vuln" && <VulnDetail vuln={vuln} level={level} setLevel={setLevel} solved={solved} markSolved={markSolved} openVuln={openVuln} autoClose={autoClose} addNote={addNote} />}
            {view === "level" && <LevelView level={level} setLevel={setLevel} />}
            {view === "flags" && <FlagsView solved={solved} readLessons={readLessons} openVuln={openVuln} gotFlags={gotFlags} totalFlags={totalFlags} onReset={resetProgress} />}
            {view === "submit" && <FlagHub level={level} markSolved={markSolved} openVuln={openVuln} autoClose={autoClose} addNote={addNote} />}
            {view === "machines" && <MachineManager autoClose={autoClose} addNote={addNote} />}
            {view === "leaderboard" && <Leaderboard />}
            {view === "history" && <FlagHistory openVuln={openVuln} />}
            {view === "assignments" && <AssignmentsView assignments={assignments} submissions={(classroom && classroom.submissions) || {}} openVuln={openVuln} onSubmitted={() => fetch("/api/classroom").then(r => r.json()).then(d => d && setClassroom(d)).catch(() => {})} />}
            {view === "teacher" && (isClass && role === "teacher" ? <TeacherConsole /> : <TeacherPanel />)}
          </div>
        </div>
      </div>

      <div className="footer">
        <span className="seg">user: <b>{me ? (me.displayName || me.username) : "lokal"}</b></span>
        {isClass && <span className="seg">mode: <b>{role === "teacher" ? "öğretmen" : me && me.className ? me.className : "sınıf"}</b></span>}
        <span className="seg">server: <b>vuln-lab.local</b></span>
        <span className="seg">next-node // intentionally vulnerable</span>
        <span className="spacer" />
        <span className="lvlchip">⚠ yalnızca eğitim amaçlı — izole ortam</span>
      </div>

      {tour && <Tour steps={tour.steps} onClose={() => { if (typeof window !== "undefined") localStorage.setItem(tour.flag, JSON.stringify(true)); setTour(null); }} />}
      <Toaster />
      <Confetti />
    </div>
  );
}

/* ═══════════════════════════════ LOGIN ═══════════════════════════════ */
function Login({ onAuth }) {
  const [u, setU] = uS("");
  const [p, setP] = uS("");
  const [err, setErr] = uS("");
  const go = (e) => {
    e && e.preventDefault();
    if (u === "admin" && p === "password") { onAuth(); }
    else setErr("Hatalı kimlik bilgileri.");
  };
  return (
    <>
      <div className="auth-bg" />
      <div style={{ height: "100%", display: "grid", placeItems: "center", padding: 24, position: "relative" }}>
        <div className="auth-card" style={{ width: 420, maxWidth: "100%" }}>
          <div className="col" style={{ gap: 12, marginBottom: 22, alignItems: "center" }}>
            <img className="auth-logo" src="/ordek.png" alt="ördek" />
            <div style={{ textAlign: "center" }}>
              <div className="brand-name" style={{ fontSize: 24 }}><b>ördek</b></div>
              <div className="faint mono" style={{ fontSize: 12, letterSpacing: 1 }}>VULNERABLE LAB // v2.0</div>
            </div>
          </div>
          <form className="panel" onSubmit={go}>
            <div className="panel-h">// authentication required</div>
            <div className="panel-b stagger">
              <div className="field"><label>Kullanıcı adı</label>
                <input className="input" autoFocus value={u} onChange={e => { setU(e.target.value); setErr(""); }} placeholder="admin" /></div>
              <div className="field"><label>Parola</label>
                <input className="input" type="password" value={p} onChange={e => { setP(e.target.value); setErr(""); }} placeholder="••••••••" /></div>
              {err && <div className="console" style={{ color: "var(--red-bright)", marginBottom: 12 }}>{err}</div>}
              <button className="kbtn primary" style={{ width: "100%", justifyContent: "center" }} type="submit">Giriş yap →</button>
              <div className="row" style={{ justifyContent: "center", marginTop: 12, fontSize: 12 }}>
                <span className="faint mono">admin / password</span>
              </div>
            </div>
          </form>
          <p className="faint" style={{ textAlign: "center", fontSize: 12, marginTop: 16 }}>
            ⚠ Bu sistem bilinçli olarak zafiyet içerir. Yalnızca izole, yetkili eğitim ortamında çalıştırın.
          </p>
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════ SIDEBAR ═══════════════════════════════ */
function Sidebar({ view, setView, solved, showTeacher = true, role, isClass = false }) {
  const solvedCount = Object.values(solved).reduce((a, ls) => a + ls.length, 0);
  const teacherLabel = role === "teacher" ? "Öğretmen Paneli" : "İlerleme Özeti";
  const isStudent = isClass && role === "student";
  // Sade menü: zafiyetler artık "Laboratuvarlar" kart görünümünde — tek tek listelenmez.
  // "Başlarken" (onboarding) yalnız öğretmen/bireysel modda; öğrencide gizli.
  const sections = [
    { h: "Başla", items: [["welcome", "Karşılama", ICONS.home], ...(!isStudent ? [["onboarding", "Başlarken", ICONS.rocket]] : [])] },
    { h: "Akademi", items: [["academy", "Yol Haritası", ICONS.book], ...(isStudent ? [["assignments", "Ödevlerim", ICONS.flag]] : [])] },
    { h: "Laboratuvarlar", items: [["dashboard", "Laboratuvarlar", ICONS.grid], ["machines", "Docker Makineleri", ICONS.server], ["submit", "Flag Gönder", ICONS.send]] },
    { h: "İlerleme", items: [
      ["level", "Security Level", ICONS.level],
      ["flags", "Rozetler & İlerleme", ICONS.award],
      ...(isClass ? [["leaderboard", "Skor Tablosu", ICONS.award]] : []),
      ...(isClass && role === "student" ? [["history", "Flag Geçmişi", ICONS.flag]] : []),
      ...(showTeacher ? [["teacher", teacherLabel, ICONS.users]] : []),
    ] },
  ];
  return (
    <div className="sidebar">
      {sections.map(sec => (
        <div className="nav-sec" key={sec.h}>
          <div className="nav-sec-h">{sec.h}</div>
          {sec.items.map(([v, label, icon]) => (
            <button key={v} data-tour={v} className={`nav-item ${view === v ? "active" : ""}`} onClick={() => setView(v)}>
              <span className="ic"><Ic d={icon} /></span> {label}
              {v === "flags" && solvedCount > 0 && <span className="badge-n">{solvedCount}</span>}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════ DASHBOARD ═══════════════════════════════ */
const GROUP_SHORT = { core: "Çekirdek", auth: "Kimlik & Yetki", modern: "Modern" };
const STATUS_FILTERS = [["all", "Tümü"], ["unsolved", "Çözülmemiş"], ["solved", "Başlanan"], ["full", "Tam ✓"]];
const chipCls = (on) => "tag" + (on ? " on" : "");

function Dashboard({ openVuln, solved, setView, level, assignments = [] }) {
  const assignedSlugs = new Set(assignments.filter(a => a.type === "lab").map(a => a.ref));
  const [query, setQuery] = uS("");
  const [group, setGroup] = uS("all");
  const [status, setStatus] = uS("all");
  const filtered = useMemo(() => filterVulns(VULNS, { query, group, status }, solved), [query, group, status, solved]);
  const active = query.trim() !== "" || group !== "all" || status !== "all";

  const goRandom = () => { const pool = filtered.length ? filtered : VULNS; const v = pickRandomVuln(pool); if (v) { toast(`🎲 ${v.name}`, "ok"); openVuln(v.id); } };
  const goNext = () => { const v = pickNextUnsolved(VULNS, solved); if (v) { toast(`→ Sıradaki: ${v.name}`, "ok"); openVuln(v.id); } else toast("Tüm zafiyetler tam çözülmüş 🏆", "ok"); };
  const clear = () => { setQuery(""); setGroup("all"); setStatus("all"); };

  return (
    <div>
      <div className="page-h">
        <div className="eyebrow">// vulnerable lab</div>
        <h1>Laboratuvarlar</h1>
        <div className="sub">{VULNS.length} zafiyet · her biri <b className="muted">Low / Medium / High</b> seviyelerinde sömürülebilir. Ara, filtrele, bir kart seç ve izole Docker hedefini başlat.</div>
      </div>

      <div className="panel" style={{ marginBottom: 18 }}>
        <div className="panel-b row between wrap" style={{ gap: 16 }}>
          <div className="row" style={{ gap: 22 }}>
            <Stat n={VULNS.length} l="zafiyet" />
            <Stat n={VULNS.length * 3} l="toplam flag" />
            <Stat n={KILLCHAINS.length} l="kill-chain" />
          </div>
          <div className="row wrap" style={{ gap: 10 }}>
            <span className="muted">Aktif seviye:</span>
            <span className="tag" style={{ color: `var(--lvl-${level})`, borderColor: `var(--lvl-${level})` }}>{LEVEL_LABEL[level]}</span>
            <button className="kbtn ghost" onClick={() => setView("level")}>değiştir</button>
          </div>
        </div>
      </div>

      {/* araç çubuğu: arama + hızlı atlama */}
      <div className="dash-toolbar">
        <div className="dash-search">
          <span className="si"><Ic d={ICONS.search} /></span>
          <input className="input" placeholder="Zafiyet ara… (ör. injection, brute, xss)" value={query} onChange={e => setQuery(e.target.value)} aria-label="Zafiyet ara" />
        </div>
        <button className="kbtn" onClick={goRandom} title="Filtreye uyan rastgele bir zafiyet aç"><span className="ic" style={{ display: "inline-flex" }}><Ic d={ICONS.dice} /></span> Rastgele</button>
        <button className="kbtn" onClick={goNext} title="İlk tam çözülmemiş zafiyete git">→ Sıradaki</button>
      </div>

      {/* araç çubuğu: grup + durum filtreleri */}
      <div className="dash-toolbar" style={{ marginTop: -4 }}>
        <div className="chips">
          <span className="faint mono" style={{ fontSize: 10, letterSpacing: 0.5 }}>GRUP</span>
          <button className={chipCls(group === "all")} onClick={() => setGroup("all")}>Tümü</button>
          {GROUPS.map(g => <button key={g.id} className={chipCls(group === g.id)} onClick={() => setGroup(g.id)}>{GROUP_SHORT[g.id] || g.label}</button>)}
        </div>
        <div className="chips">
          <span className="faint mono" style={{ fontSize: 10, letterSpacing: 0.5 }}>DURUM</span>
          {STATUS_FILTERS.map(([s, lbl]) => <button key={s} className={chipCls(status === s)} onClick={() => setStatus(s)}>{lbl}</button>)}
        </div>
        <span style={{ flex: 1 }} />
        <span className="faint mono" style={{ fontSize: 11 }}>{filtered.length}/{VULNS.length}</span>
        {active && <button className="kbtn ghost sm" onClick={clear}>temizle ✕</button>}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state"><span className="ee">🔍</span>Eşleşen zafiyet yok. Aramayı veya filtreyi değiştir.</div>
      ) : GROUPS.map(g => {
        const items = filtered.filter(v => v.group === g.id);
        if (!items.length) return null;
        return (
          <div key={g.id} style={{ marginBottom: 24 }}>
            <div className="cat-h" data-cat={g.id}>
              <span className="cdot" />
              <h2>{g.label}</h2>
              <span className="tag csub">{g.sub}</span>
            </div>
            <div className="vuln-grid stagger">
              {items.map(v => {
                const done = (solved[v.slug] || []);
                const pct = Math.round((done.length / 3) * 100);
                return (
                  <button key={v.id} className="vuln-card" data-cat={g.id} onClick={() => openVuln(v.id)}>
                    <span className="vc-accent" />
                    <div className="vc-top">
                      <span className="vc-ic"><Ic d={ICONS.bug} /></span>
                      <div className="row" style={{ gap: 6 }}>
                        {assignedSlugs.has(v.slug) && <span className="tag assign" title="Öğretmen görevi">📌 görev</span>}
                        {done.length === 3 ? <span className="tag solved">✓ tam</span> : done.length > 0 ? <span className="tag prog">devam ediyor · {done.length}/3</span> : <span className="tag">açık</span>}
                      </div>
                    </div>
                    <div className="vc-name">{v.name}</div>
                    <div className="vc-desc">{v.scenario}</div>
                    <div className="vc-bar" title={`${done.length}/3 seviye`}><i style={{ width: `${pct}%` }} /></div>
                    <div className="vc-foot"><span className="vc-cat">{GROUP_SHORT[g.id]}</span><span className="vc-go">aç →</span></div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
const Stat = ({ n, l }) => {
  const v = useCountUp(n);
  return (
    <div className="col"><span style={{ fontSize: 26, fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--green-bright)", lineHeight: 1 }}>{v}</span><span className="faint mono" style={{ fontSize: 11, letterSpacing: 0.5 }}>{l}</span></div>
  );
};

/* ═══════════════════════════════ VULN DETAIL ═══════════════════════════════ */
function VulnDetail({ vuln, level, setLevel, solved, markSolved, openVuln, autoClose = true, addNote }) {
  const done = solved[vuln.slug] || [];
  const groupVulns = VULNS.filter(v => v.group === vuln.group);
  const idx = groupVulns.findIndex(v => v.id === vuln.id);
  const spec = MACHINES[vuln.slug] || {};

  return (
    <div>
      <div className="page-h">
        <div className="row between wrap" style={{ alignItems: "flex-end" }}>
          <div>
            <div className="eyebrow">// {GROUPS.find(g => g.id === vuln.group).label}</div>
            <h1>{vuln.name}</h1>
            <div className="sub">{vuln.scenario}</div>
          </div>
          <div className="col" style={{ gap: 6, alignItems: "flex-end" }}>
            <span className="faint mono" style={{ fontSize: 11 }}>SECURITY LEVEL</span>
            <div className="levelseg">
              {["low", "medium", "high"].map(l => (
                <button key={l} data-l={l} className={level === l ? "on" : ""} onClick={() => setLevel(l)}>
                  {LEVEL_LABEL[l]}{done.includes(l) ? " ✓" : ""}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid2" style={{ gridTemplateColumns: "1.4fr 1fr", alignItems: "start" }}>
        {/* SOL: izole docker hedef makinesi + flag gönder */}
        <div className="col" style={{ gap: 16 }}>
          {MACHINE_SLUGS.includes(vuln.slug)
            ? <MachinePanel key={vuln.slug + level} vuln={vuln} level={level} solved={done} autoClose={autoClose} addNote={addNote} />
            : <div className="panel"><div className="panel-b"><div className="muted" style={{ fontSize: 13 }}>Bu zafiyet için izole Docker hedefi tanımlı değil.</div></div></div>}

          <FlagSubmit vuln={vuln} level={level} solved={done} onSolved={() => markSolved(vuln.slug, level)} />
        </div>

        {/* SAĞ: görevler + seviye davranışı + (varsa) ipucu/çözüm */}
        <div className="col" style={{ gap: 16 }}>
          {!MACHINE_SLUGS.includes(vuln.slug) && spec.objectives && (
            <div className="panel">
              <div className="panel-h">// görevler</div>
              <div className="panel-b col" style={{ gap: 7 }}>
                {spec.objectives.map((o, i) => (
                  <div key={i} className="row" style={{ gap: 8, fontSize: 13.5 }}><span style={{ color: "var(--green)" }}>▸</span><span className="muted">{o}</span></div>
                ))}
              </div>
            </div>
          )}
          <div className="panel">
            <div className="panel-h">// seviye davranışı</div>
            <div className="panel-b col" style={{ gap: 0 }}>
              {["low", "medium", "high"].map((l, i) => (
                <div key={l} style={{ padding: "11px 0", borderTop: i ? "1px solid var(--line-soft)" : 0 }}>
                  <div className="row" style={{ gap: 8, marginBottom: 4 }}>
                    <span className="tag" style={{ color: `var(--lvl-${l})`, borderColor: `var(--lvl-${l})`, background: "transparent" }}>{LEVEL_LABEL[l]}</span>
                    {level === l && <span className="faint mono" style={{ fontSize: 10 }}>● aktif</span>}
                    {done.includes(l) && <span className="faint mono" style={{ fontSize: 10, color: "var(--green)" }}>✓ flag</span>}
                  </div>
                  <div className="muted" style={{ fontSize: 13.5, lineHeight: 1.5 }}>{vuln.levels[l]}</div>
                </div>
              ))}
            </div>
          </div>
          {(vuln.hints || vuln.solution) && <HintSolution hints={vuln.hints} solution={vuln.solution} />}
        </div>
      </div>

      <div className="row between mt24">
        <button className="kbtn ghost" disabled={idx === 0} style={{ opacity: idx === 0 ? 0.4 : 1 }} onClick={() => idx > 0 && openVuln(groupVulns[idx - 1].id)}>← önceki</button>
        <span className="faint mono" style={{ fontSize: 12 }}>{idx + 1} / {groupVulns.length} — {GROUPS.find(g => g.id === vuln.group).label}</span>
        <button className="kbtn ghost" disabled={idx === groupVulns.length - 1} style={{ opacity: idx === groupVulns.length - 1 ? 0.4 : 1 }} onClick={() => idx < groupVulns.length - 1 && openVuln(groupVulns[idx + 1].id)}>sonraki →</button>
      </div>
    </div>
  );
}

/* ───────── Flag gönderme (gerçek doğrulama: POST /api/flag) ───────── */
function FlagSubmit({ vuln, level, solved, onSolved }) {
  const [val, setVal] = uS("");
  const [state, setState] = uS(null); // {ok, msg}
  const [busy, setBusy] = uS(false);
  const submit = async () => {
    if (!val.trim()) return;
    setBusy(true); setState(null);
    try {
      const r = await fetch("/api/flag", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ slug: vuln.slug, level, flag: val.trim() }) });
      const d = await r.json();
      if (d.ok) { setState({ ok: true, msg: "Doğru flag — çözüldü olarak işaretlendi.", flag: val.trim() }); onSolved(); toast(`⚑ Doğru flag! ${vuln.name} · ${LEVEL_LABEL[level]}`, "ok"); celebrate(); }
      else setState({ ok: false, msg: d.error || "Flag eşleşmedi." });
    } catch (e) { setState({ ok: false, msg: String(e.message || e) }); }
    setBusy(false);
  };
  return (
    <div className="panel">
      <div className="panel-h">
        <span style={{ color: "var(--green)" }}>⚑ flag gönder</span>
        <span style={{ flex: 1 }} />
        {solved.includes(level) && <span className="tag solved">{LEVEL_LABEL[level]} ✓</span>}
      </div>
      <div className="panel-b col" style={{ gap: 10 }}>
        <div className="muted" style={{ fontSize: 13 }}>Hedefte yakaladığın <code>ordek{"{...}"}</code> flag'ini buraya yapıştır ve doğrula.</div>
        <div className="row" style={{ gap: 8 }}>
          <input className="input" style={{ flex: 1 }} placeholder="ordek{...}" value={val} onChange={e => { setVal(e.target.value); setState(null); }} onKeyDown={e => e.key === "Enter" && submit()} />
          <button className="kbtn primary" onClick={submit} disabled={busy}>{busy ? "…" : "Doğrula"}</button>
        </div>
        {state && (
          state.ok
            ? <div className="flag-banner"><span style={{ fontSize: 18 }}>⚑</span><div className="col" style={{ gap: 2, flex: 1 }}><span className="lbl">{state.msg}</span><span className="val">{LEVEL_LABEL[level]}</span></div><CopyButton value={state.flag} compact title="flag'i kopyala" /></div>
            : <div className="console" style={{ color: "var(--red-bright)" }}>{state.msg}</div>
        )}
      </div>
    </div>
  );
}

/* ───────── İpucu + çözüm (spoiler) ───────── */
function HintSolution({ hints, solution }) {
  return (
    <div className="panel">
      <div className="panel-h">// ipucu &amp; çözüm</div>
      <div className="panel-b col" style={{ gap: 8 }}>
        {(hints || []).map((h, i) => (
          <details key={i} style={{ border: "1px solid var(--line)", borderRadius: 4, background: "var(--bg-2)" }}>
            <summary style={{ cursor: "pointer", padding: "8px 11px", fontFamily: "var(--font-mono)", fontSize: 12.5, color: "var(--ink-dim)" }}>İpucu {i + 1}</summary>
            <div className="muted" style={{ padding: "0 11px 11px", fontSize: 13.5, lineHeight: 1.55 }}>{h}</div>
          </details>
        ))}
        {solution && (
          <details style={{ border: "1px solid var(--line)", borderRadius: 4, background: "var(--bg-2)" }}>
            <summary style={{ cursor: "pointer", padding: "8px 11px", fontFamily: "var(--font-mono)", fontSize: 12.5, color: "var(--amber)" }}>Çözümü göster</summary>
            <div className="muted" style={{ padding: "0 11px 11px", fontSize: 13.5, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{solution}</div>
            <div style={{ padding: "0 11px 11px" }}><CopyButton value={solution} label="çözümü kopyala" className="kbtn ghost sm" /></div>
          </details>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════ LEVEL VIEW ═══════════════════════════════ */
function LevelView({ level, setLevel }) {
  const rows = [
    { l: "low", t: "Tamamen savunmasız. Hiçbir güvenlik kontrolü yok — temel exploit'leri öğrenmek için başlangıç noktası." },
    { l: "medium", t: "Kötü/eksik savunmalar. Naif kara listeler ve filtreler var; atlatma (bypass) teknikleri gerekir." },
    { l: "high", t: "İyi uygulanmış savunmalar. Çoğu temel saldırı engellenir; ileri teknik veya zincirleme gerekir." },
  ];
  return (
    <div>
      <div className="page-h">
        <div className="eyebrow">// global ayar</div>
        <h1>Security Level</h1>
        <div className="sub">Seçilen seviye tüm zafiyetlerin davranışını değiştirir (çerez ile hedef sayfalara taşınır). Her zafiyet her üç seviyede de ayrı bir flag verir.</div>
      </div>
      <div className="panel">
        <div className="panel-b col" style={{ gap: 0 }}>
          {rows.map((r, i) => (
            <button key={r.l} onClick={() => setLevel(r.l)} style={{ display: "flex", gap: 16, alignItems: "flex-start", textAlign: "left", background: level === r.l ? "var(--bg-2)" : "none", border: 0, borderTop: i ? "1px solid var(--line-soft)" : 0, padding: "18px 6px", cursor: "pointer", borderRadius: 4 }}>
              <span style={{ width: 16, height: 16, borderRadius: "50%", border: `2px solid var(--lvl-${r.l})`, marginTop: 3, flex: "none", background: level === r.l ? `var(--lvl-${r.l})` : "transparent", boxShadow: level === r.l ? `0 0 10px var(--lvl-${r.l})` : "none" }} />
              <div style={{ flex: 1 }}>
                <div className="row" style={{ gap: 10 }}>
                  <span style={{ fontWeight: 700, fontFamily: "var(--font-mono)", color: `var(--lvl-${r.l})`, fontSize: 16 }}>{LEVEL_LABEL[r.l]}</span>
                  {level === r.l && <span className="tag" style={{ color: "var(--green-bright)" }}>aktif</span>}
                </div>
                <div className="muted mt8" style={{ fontSize: 14 }}>{r.t}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
      <p className="faint mono mt16" style={{ fontSize: 12 }}>// not: seviye, isteklere `x-security-level` başlığı veya `security_level` çerezi ile de verilebilir (curl/Burp).</p>
    </div>
  );
}

/* ═══════════════════════════════ FLAGS / PROGRESS ═══════════════════════════════ */
/* ═══════════════════════════════ ÖDEVLERİM (öğrenci) ═══════════════════════════════ */
function AssignmentsView({ assignments = [], submissions = {}, openVuln, onSubmitted }) {
  const [drafts, setDrafts] = uS({});
  const [busy, setBusy] = uS("");
  const fmt = (ts) => ts ? new Date(ts).toLocaleString("tr-TR", { dateStyle: "medium", timeStyle: "short" }) : null;
  const submit = async (a) => {
    const text = (drafts[a.id] || "").trim();
    if (!text) { toast("Önce çözümünü yaz", "warn"); return; }
    setBusy(a.id);
    try {
      const r = await fetch("/api/classroom", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "submitAssignment", assignmentId: a.id, text }) });
      const d = await r.json();
      if (d.ok) { toast("✓ Ödev teslim edildi", "ok"); onSubmitted && onSubmitted(); }
      else toast(d.error || "Teslim edilemedi", "err");
    } catch { toast("Bağlantı hatası", "err"); }
    finally { setBusy(""); }
  };
  if (!assignments.length) return (
    <div>
      <div className="page-h"><div className="eyebrow">// ödevlerim</div><h1>Ödevlerim</h1><div className="sub">Öğretmenin atadığı ödevler ve teslimlerin burada görünür.</div></div>
      <div className="empty-state"><span className="es-ic">📋</span><div className="es-t">Henüz ödev atanmadı.</div></div>
    </div>
  );
  return (
    <div>
      <div className="page-h"><div className="eyebrow">// ödevlerim</div><h1>Ödevlerim</h1><div className="sub">Öğretmenin atadığı ödevler. Yazılı ödevleri buradan teslim et; lab/modül ödevlerini ilgili bölümden tamamla.</div></div>
      <div className="col" style={{ gap: 14 }}>
        {assignments.map(a => {
          const sub = submissions[a.id];
          const graded = sub && sub.grade != null;
          const overdue = a.dueDate && Date.now() > a.dueDate && !sub;
          return (
            <div className="panel" key={a.id}>
              <div className="panel-h">
                <span>{a.type === "module" ? "📘 modül" : a.submitType === "writeup" ? "📝 yazılı" : "⚑ lab"} ödevi</span>
                <span style={{ flex: 1 }} />
                {a.dueDate && <span className={"tag " + (overdue ? "low" : "")}>son: {fmt(a.dueDate)}</span>}
                {graded && <span className="tag solved">not: {sub.grade}/{a.maxPoints}</span>}
                {sub && !graded && <span className="tag prog">teslim edildi · değerlendiriliyor</span>}
              </div>
              <div className="panel-b col" style={{ gap: 10 }}>
                <h3 style={{ margin: 0 }}>{a.title}</h3>
                {a.description && <p className="sub" style={{ margin: 0 }}>{a.description}</p>}
                {a.submitType === "writeup" ? (
                  <>
                    {sub && <div className={"callout" + (graded ? "" : "")}><span className="ci">{graded ? "✓" : "⏳"}</span><span>Teslimin alındı ({fmt(sub.ts)}).{graded ? ` Not: ${sub.grade}/${a.maxPoints}.` : " Henüz notlanmadı."}{sub.feedback ? ` Geri bildirim: ${sub.feedback}` : ""}</span></div>}
                    <textarea className="input" rows={5} placeholder="Çözümünü / yazını buraya yaz…" value={drafts[a.id] ?? (sub ? sub.text : "")} onChange={e => setDrafts(d => ({ ...d, [a.id]: e.target.value }))} />
                    <div className="row"><button className="kbtn primary" disabled={busy === a.id} onClick={() => submit(a)}>{sub ? "↻ Yeniden teslim et" : "Teslim et"}</button></div>
                  </>
                ) : a.type === "lab" ? (
                  <div className="row"><button className="kbtn" onClick={() => { const v = VULNS.find(x => x.slug === a.ref); if (v && openVuln) openVuln(v.id); }}>Laba git →</button></div>
                ) : (
                  <div className="callout"><span className="ci">📘</span><span>Bu modülü "Akademi → Yol Haritası" bölümünden tamamla.</span></div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FlagsView({ solved, readLessons, openVuln, gotFlags, totalFlags, onReset }) {
  const pct = totalFlags ? Math.round((gotFlags / totalFlags) * 100) : 0;
  const C = 2 * Math.PI * 42; // ring çevresi
  const [gsrv, setGsrv] = uS(null); // sunucudan: { streak, quizScores }
  uE(() => {
    let on = true;
    fetch("/api/gamify").then(r => r.json()).then(d => { if (on && d && d.ok) setGsrv(d); }).catch(() => {});
    return () => { on = false; };
  }, []);
  const lessonsRead = Object.values(readLessons || {}).filter(Boolean).length;
  const gam = computeGamify({ solved, lessonsRead, quizScores: (gsrv && gsrv.quizScores) || {}, streak: (gsrv && gsrv.streak) || 0 });
  const badges = gam.badges;
  const earned = badges.filter(b => b.on).length;
  return (
    <div>
      <div className="page-h">
        <div className="eyebrow">// rozetler & ilerleme</div>
        <h1>Rozetler & İlerleme</h1>
        <div className="sub">XP, seviye, günlük serin, yakaladığın flag'ler ve kazandığın rozetler — hepsi bir bakışta.</div>
      </div>

      <div className="panel xp-panel" style={{ marginBottom: 18 }}>
        <div className="panel-b row wrap" style={{ gap: 22, alignItems: "center" }}>
          <div className="xp-level"><span className="xp-ic">{gam.levelIcon}</span><div className="col" style={{ gap: 2 }}><span className="xp-lname">{gam.levelName}</span><span className="xp-lnum">Seviye {gam.level}</span></div></div>
          <div className="col" style={{ gap: 6, flex: 1, minWidth: 220 }}>
            <div className="row between"><span className="mono" style={{ fontSize: 13, color: "var(--green-bright)", fontWeight: 700 }}>{gam.xp} XP</span><span className="faint mono" style={{ fontSize: 12 }}>{gam.nextAt ? `sonraki: ${gam.nextName} · ${gam.nextAt} XP` : "en yüksek seviye ✓"}</span></div>
            <div className="bar xp-bar"><i style={{ width: `${gam.pct}%` }} /></div>
          </div>
          <div className="xp-stats">
            <div className="xp-stat"><span className="xs-v">🔥 {gam.streak}</span><span className="xs-l">seri (gün)</span></div>
            <div className="xp-stat"><span className="xs-v">{gam.flagCount}</span><span className="xs-l">flag</span></div>
            <div className="xp-stat"><span className="xs-v">{gam.quizPassed}</span><span className="xs-l">test ✓</span></div>
            <div className="xp-stat"><span className="xs-v">{earned}/{badges.length}</span><span className="xs-l">rozet</span></div>
          </div>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 22 }}>
        <div className="panel-b row wrap" style={{ gap: 22, alignItems: "center" }}>
          <svg className="ring" width="104" height="104" viewBox="0 0 104 104" style={{ flex: "none" }}>
            <circle className="trk" cx="52" cy="52" r="42" />
            <circle className="val" cx="52" cy="52" r="42" strokeDasharray={C} strokeDashoffset={C * (1 - pct / 100)} />
          </svg>
          <div className="col" style={{ gap: 6, flex: 1, minWidth: 200 }}>
            <div className="row between">
              <span className="mono" style={{ fontSize: 14 }}>Toplam ilerleme (sunucu)</span>
              {onReset && <button className="kbtn ghost sm" onClick={onReset}>sıfırla</button>}
            </div>
            <div className="mono" style={{ color: "var(--green-bright)", fontSize: 20, fontWeight: 700 }}>{gotFlags} / {totalFlags} flag · %{pct}</div>
            <div className="bar"><i style={{ width: `${pct}%` }} /></div>
            <div className="faint mono" style={{ fontSize: 12 }}>{earned}/{badges.length} rozet kazanıldı</div>
          </div>
        </div>
      </div>

      <h2 style={{ fontSize: 16, fontFamily: "var(--font-mono)", margin: "0 0 12px" }}>Rozetler</h2>
      <div className="badge-grid" style={{ marginBottom: 28 }}>
        {badges.map(b => (
          <div key={b.t} className={`badge ${b.on ? "on" : ""}`} title={b.d}>
            <span className="emo">{b.emo}</span>
            <span className="bt">{b.t}</span>
            <span className="bd">{b.on ? "kazanıldı ✓" : b.d}</span>
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: 16, fontFamily: "var(--font-mono)", margin: "0 0 12px" }}>Kill-Chain Senaryoları</h2>
      <div className="col" style={{ gap: 14, marginBottom: 28 }}>
        {KILLCHAINS.map(kc => {
          const steps = kc.steps.map(s => VULNS.find(v => v.slug === s)).filter(Boolean);
          const doneCount = steps.filter(s => (solved[s.slug] || []).length > 0).length;
          return (
            <div className="panel" key={kc.id}>
              <div className="panel-h"><span style={{ color: "var(--green)" }}>⛓ {kc.title}</span><span style={{ flex: 1 }} /><span className="tag" style={{ color: doneCount === steps.length ? "var(--green-bright)" : "var(--ink-dim)" }}>{doneCount}/{steps.length} adım</span></div>
              <div className="panel-b">
                <div className="row wrap" style={{ gap: 8, marginBottom: 12 }}>
                  {steps.map((s, i) => (
                    <React.Fragment key={s.slug}>
                      <button className="tag" style={{ cursor: "pointer", color: (solved[s.slug] || []).length ? "var(--green-bright)" : "var(--ink-dim)", borderColor: (solved[s.slug] || []).length ? "var(--green-deep)" : "var(--line)" }} onClick={() => openVuln(s.id)}>{(solved[s.slug] || []).length ? "✓ " : ""}{s.name}</button>
                      {i < steps.length - 1 && <span className="faint">→</span>}
                    </React.Fragment>
                  ))}
                </div>
                <div className="muted" style={{ fontSize: 13.5, lineHeight: 1.55 }}>{kc.note}</div>
              </div>
            </div>
          );
        })}
      </div>

      <h2 style={{ fontSize: 16, fontFamily: "var(--font-mono)", margin: "0 0 12px" }}>Flag Defteri</h2>
      <div className="panel">
        <div className="panel-b col" style={{ gap: 0 }}>
          {VULNS.map((v, i) => {
            const ls = solved[v.slug] || [];
            return (
              <div key={v.id} className="row between" style={{ padding: "10px 4px", borderTop: i ? "1px solid var(--line-soft)" : 0 }}>
                <button className="ghost" style={{ background: "none", border: 0, color: "var(--ink)", cursor: "pointer", fontSize: 14, textAlign: "left", flex: 1 }} onClick={() => openVuln(v.id)}>{v.name}</button>
                <div className="row" style={{ gap: 5 }}>
                  {["low", "medium", "high"].map(l => (
                    <span key={l} title={LEVEL_LABEL[l]} style={{ width: 24, height: 18, borderRadius: 3, display: "grid", placeItems: "center", fontSize: 9, fontFamily: "var(--font-mono)", color: ls.includes(l) ? "#11160a" : "var(--ink-faint)", background: ls.includes(l) ? `var(--lvl-${l})` : "var(--bg-inset)", border: "1px solid var(--line)", fontWeight: 700 }}>{l[0].toUpperCase()}</span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════ FLAG HUB (ortak gönderim) ═══════════════════════════════ */
function FlagHub({ level, markSolved, openVuln, autoClose = true, addNote }) {
  const [val, setVal] = uS("");
  const [state, setState] = uS(null);
  const [busy, setBusy] = uS(false);
  const [closing, setClosing] = uS(null); // { id, name, sec } — oto-kapanma geri sayımı
  const timer = useRef(null);

  const cancelClose = () => { if (timer.current) { clearInterval(timer.current); timer.current = null; } setClosing(null); };
  // Flag çözülen zafiyetin çalışan makinesini bul → uyar + geri say + durdur.
  const autoStop = async (slug, lvl) => {
    if (!autoClose) return;
    let machines = [];
    try { const d = await (await fetch("/api/machines")).json(); machines = d.machines || []; } catch {}
    const m = matchRunningMachine(machines, slug, lvl);
    if (!m) return;
    if (addNote) addNote({ type: "machine", title: "Makine otomatik kapanıyor", text: `${m.name || m.slug} (${LEVEL_LABEL[lvl] || lvl}) — flag bulundu, ~10 sn içinde durduruluyor.` });
    let sec = 10;
    setClosing({ id: m.id, name: m.name || m.slug, sec });
    timer.current = setInterval(async () => {
      sec -= 1;
      if (sec <= 0) {
        clearInterval(timer.current); timer.current = null;
        try { await fetch(`/api/machines/${m.id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "stop" }) }); } catch {}
        toast("■ Makine otomatik kapatıldı", "warn");
        setClosing(null);
      } else setClosing(c => (c ? { ...c, sec } : c));
    }, 1000);
  };

  const submit = async () => {
    if (!val.trim()) return;
    setBusy(true); setState(null);
    try {
      const r = await fetch("/api/flag/detect", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ flag: val.trim(), level }) });
      const d = await r.json();
      if (d.ok) { markSolved(d.slug, d.level || level); setState({ ok: true, name: d.name, slug: d.slug, flag: val.trim() }); toast(`⚑ Eşleşti: ${d.name}`, "ok"); celebrate(); autoStop(d.slug, d.level || level); }
      else setState({ ok: false, msg: d.error || "Bu flag hiçbir zafiyetle eşleşmedi." });
    } catch (e) { setState({ ok: false, msg: String(e.message || e) }); }
    setBusy(false);
  };
  uE(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  return (
    <div>
      <div className="page-h">
        <div className="eyebrow">// ortak flag gönderimi</div>
        <h1>Flag Gönder (Hub)</h1>
        <div className="sub">Herhangi bir hedeften yakaladığın <code>ordek{"{...}"}</code> flag'ini buraya yapıştır — sistem hangi zafiyete ait olduğunu otomatik bulup ilerlemene işler. Aktif seviye: <b style={{ color: `var(--lvl-${level})` }}>{LEVEL_LABEL[level]}</b> (flag her seviyeye sayılır).</div>
      </div>
      <div className="panel"><div className="panel-b col" style={{ gap: 12 }}>
        <div className="row" style={{ gap: 8 }}>
          <input className="input" style={{ flex: 1 }} placeholder="ordek{...}" value={val} onChange={e => { setVal(e.target.value); setState(null); }} onKeyDown={e => e.key === "Enter" && submit()} />
          <button className="kbtn primary" onClick={submit} disabled={busy}>{busy ? "…" : "Gönder"}</button>
        </div>
        {state && (state.ok
          ? <div className="flag-banner"><span style={{ fontSize: 18 }}>⚑</span><div className="col" style={{ gap: 2, flex: 1 }}><span className="lbl">Eşleşti: {state.name}</span><span className="val">{LEVEL_LABEL[level]} · çözüldü işaretlendi</span></div><CopyButton value={state.flag} compact title="flag'i kopyala" /></div>
          : <div className="console" style={{ color: "var(--red-bright)" }}>{state.msg}</div>)}
        {closing && (
          <div className="callout" style={{ borderLeftColor: "var(--amber)" }}>
            <span className="ci" style={{ color: "var(--amber)" }}>⏳</span>
            <span style={{ flex: 1 }}>🎉 Flag bulundu! <b>{closing.name}</b> makinesi <b>{closing.sec}sn</b> içinde otomatik kapanıyor…</span>
            <button className="kbtn sm" onClick={cancelClose}>İptal</button>
          </div>
        )}
        {state && state.ok && (() => { const v = VULNS.find(x => x.slug === state.slug); return v ? <button className="kbtn ghost" style={{ alignSelf: "flex-start" }} onClick={() => openVuln(v.id)}>→ {v.name} zafiyetine git</button> : null; })()}
      </div></div>
    </div>
  );
}

/* ═══════════════════════════════ MACHINE MANAGER (docker) ═══════════════════════════════ */
function MachineManager({ autoClose, addNote }) {
  const [machines, setMachines] = uS([]);
  const [err, setErr] = uS(null);
  const [busy, setBusy] = uS("");
  const [ready, setReady] = uS({});
  const refresh = async () => {
    try {
      const r = await fetch("/api/machines"); const d = await r.json();
      if (d.machines) { setMachines(d.machines); setErr(null); }
      else if (d.error) setErr(d.error + (d.detail ? " — " + d.detail : ""));
    } catch (e) { setErr(String(e.message || e)); }
  };
  uE(() => { refresh(); const t = setInterval(refresh, 4000); return () => clearInterval(t); }, []);
  uE(() => {
    let stop = false;
    machines.forEach(m => {
      if (m.token && !ready[m.id]) fetch(`/api/machines/ready?token=${encodeURIComponent(m.token)}`)
        .then(r => r.json()).then(d => { if (!stop && d.ready) { setReady(p => ({ ...p, [m.id]: true })); toast(`✅ ${m.name || m.slug} hazır`, "ok"); if (addNote) addNote({ type: "machine", title: "Makine hazır", text: `${m.name || m.slug} (${LEVEL_LABEL[m.level] || m.level}) açıldı — sömürmeye başla.` }); } }).catch(() => {});
    });
    return () => { stop = true; };
  }, [machines]);
  const post = (url, body) => fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).then(r => r.json());
  const stop = async (id) => { setBusy(id); await post(`/api/machines/${id}`, { action: "stop" }).catch(() => {}); await refresh(); setBusy(""); };
  const restart = async (m) => { setBusy(m.id); setReady(p => ({ ...p, [m.id]: false })); await post(`/api/machines/${m.id}`, { action: "restart", slug: m.slug, level: m.level }).catch(() => {}); await refresh(); setBusy(""); };
  const keepalive = (token) => { if (!token) return; post("/api/machines/keepalive", { token }).then(() => toast("⏱ Makine süresi yenilendi (idle sayacı sıfırlandı)", "ok")).catch(() => {}); };
  const toolUrl = (m) => (typeof window !== "undefined" && m.token) ? `${window.location.protocol}//${window.location.hostname}:3001/__open/${m.token}` : "";
  return (
    <div>
      <div className="page-h">
        <div className="eyebrow">// docker orchestration</div>
        <h1>Docker Makineleri</h1>
        <div className="sub">Çalışan izole hedef konteynerler. Her zafiyet+seviye ayrı bir makinedir (deep-freeze). Birkaç saniyede bir otomatik yenilenir.</div>
      </div>
      {err && <div className="panel" style={{ marginBottom: 16 }}><div className="panel-b"><div className="console" style={{ color: "var(--red-bright)" }}>⚠ {err}</div></div></div>}
      <div className="panel">
        <div className="panel-h">// çalışan makineler<span style={{ flex: 1 }} /><span className="tag">{machines.length} aktif</span>
          <button className="kbtn ghost" style={{ padding: "4px 10px", fontSize: 12, marginLeft: 8 }} onClick={refresh}>⟳ yenile</button></div>
        <div className="panel-b col" style={{ gap: 0 }}>
          {machines.length === 0 && <div className="muted" style={{ fontSize: 13, padding: "8px 2px" }}>Çalışan makine yok. Bir zafiyet aç → "▸ Makineyi Başlat".</div>}
          {machines.map((m, i) => (
            <div key={m.id} className="row between wrap" style={{ padding: "12px 2px", borderTop: i ? "1px solid var(--line-soft)" : 0, gap: 12 }}>
              <div className="col" style={{ gap: 3 }}>
                <span style={{ fontWeight: 600 }}>{m.name || m.slug}</span>
                <span className="faint mono" style={{ fontSize: 11 }}>{m.slug} · <span style={{ color: `var(--lvl-${m.level})` }}>{LEVEL_LABEL[m.level] || m.level}</span> · <span title="kimlik-doğrulamalı kapı, izole">🔒 izole</span>{m.status ? <> · <span title="çalışma süresi">⏱ {m.status}</span></> : null}</span>
              </div>
              <div className="row" style={{ gap: 8, alignItems: "center" }}>
                <span className="tag" style={{ color: ready[m.id] ? "var(--green-bright)" : "var(--amber)", gap: 7 }}><span className={"dotstat " + (ready[m.id] ? "run" : "boot")} />{ready[m.id] ? "çalışıyor" : "başlatılıyor"}</span>
                <a className="kbtn primary" href={m.url} target="_blank" rel="noreferrer">↗ Aç</a>
                {toolUrl(m) && <CopyButton value={toolUrl(m)} compact title="araç adresini (Burp/curl) kopyala" />}
                <button className="kbtn" onClick={() => keepalive(m.token)} title="canlı tut — idle oto-kapanma sayacını sıfırla">⏱</button>
                <button className="kbtn" disabled={busy === m.id} onClick={() => restart(m)} title="deep-freeze yeniden başlat">{busy === m.id ? "…" : "⟳"}</button>
                <button className="kbtn danger" disabled={busy === m.id} onClick={() => stop(m.id)} title="durdur">■</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════ SKOR TABLOSU (leaderboard) ═══════════════════════════════ */
function Leaderboard() {
  const [rows, setRows] = uS([]);
  const [meId, setMeId] = uS(null);
  const [err, setErr] = uS(null);
  uE(() => {
    let stop = false;
    const load = () => fetch("/api/leaderboard").then(r => r.json()).then(d => { if (stop) return; if (d.rows) { setRows(d.rows); setMeId(d.meId); } else if (d.error) setErr(d.error); }).catch(() => {});
    load(); const t = setInterval(load, 5000); return () => { stop = true; clearInterval(t); };
  }, []);
  return (
    <div>
      <div className="page-h"><div className="eyebrow">// canlı sıralama</div><h1>🏆 Skor Tablosu</h1><div className="sub">Sınıfındaki flag sıralaması — toplam yakalanan flag sayısına göre, canlı (5 sn).</div></div>
      {err && <div className="panel" style={{ marginBottom: 16 }}><div className="panel-b"><div className="console" style={{ color: "var(--amber)" }}>⚠ {err}</div></div></div>}
      <div className="panel"><div className="panel-b col" style={{ gap: 0 }}>
        {rows.length === 0 && <div className="muted" style={{ fontSize: 13, padding: "8px 2px" }}>Henüz veri yok — bir flag çözüldüğünde burada görünür.</div>}
        {rows.map((r, i) => {
          const medal = r.rank === 1 ? "🥇" : r.rank === 2 ? "🥈" : r.rank === 3 ? "🥉" : null;
          const meRow = r.id === meId;
          return (
            <div key={r.id} className="row between wrap" style={{ padding: "10px 8px", borderTop: i ? "1px solid var(--line-soft)" : 0, background: meRow ? "var(--bg-2)" : undefined, borderRadius: meRow ? 6 : 0 }}>
              <div className="row" style={{ gap: 12, alignItems: "center" }}>
                <span className="mono" style={{ width: 30, textAlign: "center", fontSize: medal ? 18 : 14, color: "var(--ink-dim)" }}>{medal || r.rank}</span>
                <span style={{ fontWeight: 600 }}>{r.name}{meRow ? <span className="faint"> (sen)</span> : null}</span>
              </div>
              <span className="tag" style={{ color: "var(--green-bright)" }}>{r.count} flag</span>
            </div>
          );
        })}
      </div></div>
    </div>
  );
}

/* ═══════════════════════════════ FLAG GEÇMİŞİ (öğrenci) ═══════════════════════════════ */
function FlagHistory({ openVuln }) {
  const [events, setEvents] = uS([]);
  uE(() => {
    let stop = false;
    const load = () => fetch("/api/progress/history").then(r => r.json()).then(d => { if (!stop && d.events) setEvents(d.events); }).catch(() => {});
    load(); const t = setInterval(load, 6000); return () => { stop = true; clearInterval(t); };
  }, []);
  return (
    <div>
      <div className="page-h"><div className="eyebrow">// flag deneme geçmişi</div><h1>Flag Geçmişi</h1><div className="sub">Son flag denemelerin (başarılı/başarısız). En yeni üstte.</div></div>
      <div className="panel"><div className="panel-b col" style={{ gap: 0 }}>
        {events.length === 0 && <div className="muted" style={{ fontSize: 13, padding: "8px 2px" }}>Henüz flag denemesi yok.</div>}
        {events.map((e, i) => {
          const v = VULNS.find(x => x.slug === e.slug);
          return (
            <div key={i} className="row between wrap" style={{ padding: "9px 2px", borderTop: i ? "1px solid var(--line-soft)" : 0, gap: 10 }}>
              <div className="row" style={{ gap: 10, alignItems: "center" }}>
                <span style={{ fontSize: 15 }}>{e.type === "flag_ok" ? "✅" : "❌"}</span>
                <div className="col" style={{ gap: 2 }}>
                  <span style={{ fontWeight: 600 }}>{e.name || (v && v.name) || e.slug}</span>
                  <span className="faint mono" style={{ fontSize: 11 }}>{e.slug} · <span style={{ color: `var(--lvl-${e.level})` }}>{LEVEL_LABEL[e.level] || e.level || "—"}</span> · {e.ts ? new Date(e.ts).toLocaleString("tr") : ""}</span>
                </div>
              </div>
              {v && <button className="kbtn ghost sm" onClick={() => openVuln(v.id)}>→ git</button>}
            </div>
          );
        })}
      </div></div>
    </div>
  );
}

/* ═══════════════════════════════ KARŞILAMA (onboarding) ═══════════════════════════════ */
function Welcome({ setView, openVuln, onDone }) {
  return (
    <div>
      <div className="panel hero" style={{ marginBottom: 18 }}>
        <div className="panel-b" style={{ padding: "30px 26px" }}>
          <div className="eyebrow">// hoş geldin</div>
          <h1 style={{ fontSize: 30, margin: "0 0 8px", letterSpacing: "-.5px" }}>ördek <span style={{ color: "var(--ink-faint)", fontWeight: 400 }}>// vuln-lab</span></h1>
          <p className="sub" style={{ maxWidth: "64ch", fontSize: 15 }}>TryHackMe / HackTheBox tarzı, <b>gerçekten sömürülebilir</b> bir web güvenliği laboratuvarı. 27 zafiyet, her biri Low / Medium / High seviyelerinde. Hedefler izole Docker konteynerlerinde çalışır — kendi makinende güvenle pratik yap.</p>
          <div className="row wrap" style={{ gap: 10, marginTop: 18 }}>
            <button className="kbtn primary" onClick={onDone}>Hadi başlayalım →</button>
            <button className="kbtn" onClick={() => setView("academy")}>Önce teoriyi öğren</button>
            <button className="kbtn" onClick={() => setView("onboarding")}>🦆 Nasıl kurulur? · Öğretmen modu</button>
          </div>
        </div>
      </div>

      <h2 style={{ fontSize: 16, fontFamily: "var(--font-mono)", margin: "0 0 12px" }}>3 adımda nasıl çalışır</h2>
      <div className="steps" style={{ marginBottom: 20 }}>
        <div className="step lift"><div className="n">1</div><h3>Zafiyet seç</h3><p>Soldaki <b>Zafiyet Dizini</b>'nden bir zafiyet aç. Sağda senaryo, görevler ve ipuçları seni bekler.</p><span className="arr">→</span></div>
        <div className="step lift"><div className="n">2</div><h3>Makineyi başlat & aç</h3><p><b>▸ Makineyi Başlat</b> ile izole Docker hedefini ayağa kaldır; hazır olunca <b>↗ Makineyi Aç</b> ile yeni sekmede sömür.</p><span className="arr">→</span></div>
        <div className="step lift"><div className="n">3</div><h3>Flag'i yakala & gönder</h3><p>Hedefteki <code>ordek{"{...}"}</code> flag'ini bul, panele yapıştır. Doğruysa ilerlemen ve rozetlerin güncellenir.</p></div>
      </div>

      <div className="grid2">
        <div className="panel"><div className="panel-h">// nereden başlamalı</div><div className="panel-b col" style={{ gap: 10 }}>
          <div className="callout"><span className="ci">📚</span><span><b>Yeniysen:</b> önce <a onClick={() => setView("academy")} style={{ cursor: "pointer" }}>Akademi</a>'den teoriyi oku, sonra Dizin'den ilk zafiyeti dene.</span></div>
          <div className="callout"><span className="ci">🧭</span><span><b>Yönünü kaybetme:</b> <a onClick={() => setView("flags")} style={{ cursor: "pointer" }}>Rozetler &amp; İlerleme</a>'de ne çözdüğünü ve kill-chain senaryolarını gör.</span></div>
        </div></div>
        <div className="panel"><div className="panel-h">// etik kullanım</div><div className="panel-b">
          <div className="callout" style={{ borderLeftColor: "var(--amber)" }}><span className="ci" style={{ color: "var(--amber)" }}>⚠</span><span>Bu lab <b>kasıtlı olarak zafiyetlidir</b>. Yalnızca izole/yetkili eğitim ortamında çalıştır; öğrendiğin teknikleri yalnızca <b>izinli</b> sistemlerde uygula.</span></div>
        </div></div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════ BAŞLARKEN (mod kurulumu rehberi) ═══════════════════════════════ */
function Onboarding() {
  const [pick, setPick] = uS("class"); // hangi mod kartı açık
  return (
    <div>
      <div className="page-h">
        <div className="eyebrow">// başlarken</div>
        <h1>Nasıl kurulur?</h1>
        <div className="sub">ördek-lab iki şekilde çalışır. Şu an <b className="muted">Bireysel</b> moddasın. Öğretmensen ve sınıfını canlı izlemek istiyorsan <b className="muted">Öğretmen / Sınıf</b> moduna geç — aşağıdaki adımları sırayla izle.</div>
      </div>

      <div className="choice-grid" style={{ marginBottom: 22 }}>
        <button className={"choice-card" + (pick === "individual" ? " on" : "")} onClick={() => setPick("individual")}>
          {pick === "individual" && <span className="tag solved now">şu an aktif</span>}
          <span className="ci">🧑‍💻</span>
          <h3>Bireysel</h3>
          <p>Tek kişi, yerel kullanım. <b>admin / password</b> ile gir, zafiyetleri çözmeye başla. Ekstra kuruluma gerek yok.</p>
        </button>
        <button className={"choice-card" + (pick === "class" ? " on" : "")} onClick={() => setPick("class")}>
          {pick === "class" && <span className="tag now" style={{ color: "var(--green-bright)", borderColor: "var(--green-deep)" }}>kurulum gerekli</span>}
          <span className="ci">👩‍🏫</span>
          <h3>Öğretmen / Sınıf</h3>
          <p>Öğretmen + öğrenciler. Sınıf kodu, kayıt ve <b>canlı takip paneli</b>. Tek komutla açılır.</p>
        </button>
      </div>

      {pick === "individual" ? (
        <div className="panel view-anim" key="indiv"><div className="panel-b col" style={{ gap: 10 }}>
          <div className="callout"><span className="ci">✓</span><span>Zaten bireysel moddasın — yapman gereken bir şey yok. Soldan <b>Zafiyet Dizini</b>'ne geçip ilk hedefini başlatabilirsin.</span></div>
        </div></div>
      ) : (
        <div className="panel view-anim" key="class">
          <div className="panel-h">// öğretmen modunu aç — 4 adım</div>
          <div className="panel-b">
            <div className="callout" style={{ marginBottom: 16 }}><span className="ci">ℹ</span><span>Mod, kurulumda <code>.env</code>'e yazılır; bu yüzden tek seferlik bir komut + yeniden başlatma gerekir. Komutları projenin kök klasöründe (<code>zafiyetli-makine/</code>) sırayla çalıştır.</span></div>
            <div className="flow">
              <div className="fl"><span className="fn">1</span><div className="fc">
                <h4>Sınıf modunu seç</h4>
                <p>Kurulum sihirbazını çalıştır ve açılan menüde <b>[2] Sınıf</b>'ı seç (ya da soru sormadan <code>--mode class</code> ver).</p>
                <CopyCmd cmd="npm run setup" note="menüde [2] Sınıf'ı seç" />
                <CopyCmd cmd="node setup.mjs --mode class" note="alternatif: doğrudan sınıf modu" />
              </div></div>
              <div className="fl"><span className="fn">2</span><div className="fc">
                <h4>Sunucuyu başlat</h4>
                <p>Docker ile (önerilen) ya da Docker'sız geliştirme olarak ayağa kaldır.</p>
                <CopyCmd cmd="docker compose up -d --build" note="panel → http://localhost:3000" />
                <CopyCmd cmd="npm install && npm run dev" note="Docker'sız alternatif" />
              </div></div>
              <div className="fl"><span className="fn">3</span><div className="fc">
                <h4>Paneli yeniden aç</h4>
                <p>http://localhost:3000 adresini aç; bu sefer seni <b>ilk öğretmen hesabı sihirbazı</b> karşılar. Adım adım hesabını oluştur.</p>
              </div></div>
              <div className="fl"><span className="fn">4</span><div className="fc">
                <h4>Sınıf aç &amp; öğrencileri çağır</h4>
                <p>Öğretmen panelinde <b>sınıf oluştur</b> → üretilen <b>kodu paylaş</b> → öğrenciler "Kayıt ol"da kodu girer → ilerlemelerini <b>canlı</b> izle.</p>
              </div></div>
            </div>
            <div className="callout" style={{ marginTop: 16, borderLeftColor: "var(--amber)" }}><span className="ci" style={{ color: "var(--amber)" }}>⚠</span><span>Sınıf modu kasıtlı zafiyetli hedefler barındıran paylaşımlı bir sunucudur — <b>yalnızca izole sınıf/LAN ağında</b> çalıştır.</span></div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════ ÖĞREN / AKADEMİ (yol haritası) ═══════════════════════════════ */
// Akademi görseli: /academy/<id>.png. Görsel yoksa (404) sessizce kaybolur — layout bozulmaz.
function AcademyImg({ id, className }) {
  const [ok, setOk] = uS(true);
  if (!id || !ok) return null;
  return <img className={className} src={`/academy/${id}.png`} alt="" loading="lazy" onError={() => setOk(false)} />;
}

// Bir dersin içeriğini render et — teori (body/examples/cmd) veya lab dersi (LEARN).
function LessonContent({ mod, lesson }) {
  if (mod.type === "labs") {
    const L = LEARN[lesson.slug] || {};
    return (
      <div className="lesson-body">
        {L.what && <p><b>Nedir? </b>{L.what}</p>}
        {L.why && <p><b>Neden tehlikeli? </b>{L.why}</p>}
        {L.daily && <p><b>Günlük hayatta: </b>{L.daily}</p>}
        {Array.isArray(L.examples) && L.examples.map((ex, i) => (
          <div key={i} className="lesson-ex"><span className="bl">•</span><span>{ex}</span></div>
        ))}
        {L.real && <p style={{ marginTop: 10 }}><b>Gerçek olay: </b>{L.real}</p>}
        {L.defense && <p><b>Korunma: </b>{L.defense}</p>}
      </div>
    );
  }
  return (
    <div className="lesson-body">
      <AcademyImg id={lesson.id} className="lesson-img" />
      {(lesson.body || []).map((p, i) => <p key={i}>{p}</p>)}
      {Array.isArray(lesson.examples) && lesson.examples.length > 0 && (
        <div style={{ margin: "6px 0" }}>
          <div className="lk" style={{ marginBottom: 4 }}>Günlük hayattan örnekler</div>
          {lesson.examples.map((ex, i) => <div key={i} className="lesson-ex"><span className="bl">•</span><span>{ex}</span></div>)}
        </div>
      )}
      {Array.isArray(lesson.cmd) && lesson.cmd.length > 0 && (
        <div style={{ margin: "8px 0" }}>
          <div className="lk" style={{ marginBottom: 4 }}>Örnek kullanım</div>
          {lesson.cmd.map((c, i) => <div key={i} className="lesson-cmd">{c}</div>)}
        </div>
      )}
      {lesson.key && <div className="lesson-key"><span>🔑</span><span>{lesson.key}</span></div>}
    </div>
  );
}

// Öğrenciye yapılan canlı sunumun senkron, salt-okunur slaytı.
function PresentView({ presentation }) {
  const found = findLesson(presentation.moduleId, presentation.lessonId);
  if (!found || !found.lesson) return <div className="empty-state"><span className="ee">👩‍🏫</span>Öğretmen sunum hazırlıyor…</div>;
  return (
    <div>
      <div className="present-bar"><span className="live" /> 👩‍🏫 Öğretmen anlatıyor — canlı sunum (seni takip ediyor)</div>
      <div className="present-slide">
        <div className="eyebrow">// {found.mod.name}</div>
        <h2>{found.lesson.title}</h2>
        <LessonContent mod={found.mod} lesson={found.lesson} />
      </div>
    </div>
  );
}

// Tek modül: solda ders listesi (stepper), sağda tek tek ders (TryHackMe tarzı).
function ModuleView({ mod, st, solved, readLessons, markRead, markSolved, addNote, autoClose, openVuln, onBack, nextMod, onOpenModule }) {
  const lessons = mod.lessons || [];
  const [idx, setIdx] = uS(0);
  const lesson = lessons[idx] || lessons[0];
  const isLab = mod.type === "labs" || mod.type === "tool";
  const isDone = (l) => (isLab ? (solved[l.slug] || []).length > 0 : !!readLessons[l.id]);
  const doneNow = lesson ? isDone(lesson) : false;
  const pct = st.total ? Math.round((st.done / st.total) * 100) : 0;

  // Gerçek araç labı modülü: tek ders = ToolLabPanel (terminal + görevler + flag).
  if (mod.type === "tool") {
    return (
      <div>
        <div className="page-h">
          <div className="row between wrap" style={{ alignItems: "flex-end" }}>
            <div>
              <div className="eyebrow">// araç labı · {st.done}/{st.total}</div>
              <h1>{mod.icon} {mod.name}</h1>
              <div className="sub">{mod.intro}</div>
            </div>
            <button className="kbtn ghost" onClick={onBack}>← yol haritası</button>
          </div>
          <div className="bar" style={{ marginTop: 14 }}><i style={{ width: `${pct}%` }} /></div>
        </div>
        <ToolLabPanel slug={lesson.slug} solved={solved[lesson.slug] || []} markSolved={markSolved} addNote={addNote} autoClose={autoClose} />
        {st.complete && (
          <div className="flag-banner" style={{ marginTop: 18 }}>
            <span style={{ fontSize: 18 }}>🎉</span>
            <div className="col" style={{ gap: 2 }}><span className="lbl">araç labı tamamlandı</span><span className="val">{mod.name}</span></div>
            <span style={{ flex: 1 }} />
            {nextMod && <button className="kbtn primary" onClick={() => onOpenModule(nextMod.id)}>Sonraki modül → {nextMod.name}</button>}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="page-h">
        <div className="row between wrap" style={{ alignItems: "flex-end" }}>
          <div>
            <div className="eyebrow">// modül · {st.done}/{st.total}</div>
            <h1>{mod.icon} {mod.name}</h1>
            <div className="sub">{mod.intro}</div>
          </div>
          <button className="kbtn ghost" onClick={onBack}>← yol haritası</button>
        </div>
        <div className="bar" style={{ marginTop: 14 }}><i style={{ width: `${pct}%` }} /></div>
      </div>

      <div className="modv">
        <div className="modv-steps">
          {lessons.map((l, i) => (
            <button key={l.id} className={`modv-step ${i === idx ? "cur" : ""} ${isDone(l) ? "done" : ""}`} onClick={() => setIdx(i)}>
              <span className="st-n">{isDone(l) ? "✓" : i + 1}</span>
              <span className="st-t">{l.title}</span>
            </button>
          ))}
        </div>

        <div className="panel">
          <div className="panel-h">
            <span>{mod.type === "labs" ? "🐛 zafiyet dersi" : "📖 ders"} · {idx + 1}/{lessons.length}</span>
            <span style={{ flex: 1 }} />
            {doneNow && <span className="tag solved">✓ tamamlandı</span>}
          </div>
          <div className="panel-b">
            <h2 style={{ margin: "0 0 14px", fontSize: 19 }}>{lesson && lesson.title}</h2>
            {lesson && <LessonContent mod={mod} lesson={lesson} />}
            {mod.type === "labs" && (
              <div className="callout" style={{ marginTop: 12 }}><span className="ci">⚑</span><span>{doneNow ? "Bu lapı çözdün — ders tamamlandı ✓" : "Bu dersi tamamlamak için aşağıdaki laptan bu zafiyetin flag'ini yakala."}</span></div>
            )}
            <div className="lesson-nav">
              <button className="kbtn ghost" disabled={idx === 0} onClick={() => idx > 0 && setIdx(idx - 1)}>← önceki</button>
              <div className="row" style={{ gap: 8 }}>
                {mod.type === "labs"
                  ? <button className="kbtn primary" onClick={() => openVuln(lesson.vulnId)}>→ Laba geç</button>
                  : (doneNow
                    ? <span className="tag solved">okundu ✓</span>
                    : <button className="kbtn primary" onClick={() => { markRead(lesson.id); if (idx < lessons.length - 1) setIdx(idx + 1); }}>Tamamladım ✓</button>)}
              </div>
              <button className="kbtn ghost" disabled={idx === lessons.length - 1} onClick={() => idx < lessons.length - 1 && setIdx(idx + 1)}>sonraki →</button>
            </div>
          </div>
        </div>
      </div>

      {mod.id === "kali-kurulum" && <VpnPanel />}
      {mod.id === "kali-kurulum" && <ConnCheckPanel />}
      {mod.type === "theory" && <QuizPanel moduleId={mod.id} />}

      {st.complete && (
        <div className="flag-banner" style={{ marginTop: 18 }}>
          <span style={{ fontSize: 18 }}>🎉</span>
          <div className="col" style={{ gap: 2 }}><span className="lbl">modül tamamlandı</span><span className="val">{mod.name}</span></div>
          <span style={{ flex: 1 }} />
          {nextMod && <button className="kbtn primary" onClick={() => onOpenModule(nextMod.id)}>Sonraki modül → {nextMod.name}</button>}
        </div>
      )}
    </div>
  );
}

// Yol haritası: ortada dikey omurga, modüller sağlı-sollu (zigzag timeline).
function Roadmap({ status, onOpen, assignedMods }) {
  const doneCount = status.filter(s => s.complete).length;
  return (
    <div>
      <div className="page-h">
        <div className="eyebrow">// öğren · yol haritası</div>
        <h1>Öğren / Akademi</h1>
        <div className="sub">Sıralı bir öğrenme yolu: temel kavramlardan ağ modelleri, protokoller ve sunuculara; keşiften gerçek web zafiyetlerine. Bir modülü tamamla, sonraki açılsın.</div>
        <div className="row" style={{ gap: 8, marginTop: 12, alignItems: "center" }}>
          <span className="tag prog">{doneCount}/{ROADMAP.length} modül</span>
          <div className="bar" style={{ flex: 1, maxWidth: 320 }}><i style={{ width: `${Math.round((doneCount / ROADMAP.length) * 100)}%` }} /></div>
        </div>
      </div>
      <div className="tl">
        {ROADMAP.map((m, i) => {
          const st = status[i];
          const cls = !st.unlocked ? "locked" : st.complete ? "done" : "active";
          const side = i % 2 === 0 ? "left" : "right";
          const pct = st.total ? Math.round((st.done / st.total) * 100) : 0;
          return (
            <div key={m.id} className={`tl-item ${side} ${cls}`}>
              <span className="tl-node" aria-hidden="true">{!st.unlocked ? "🔒" : st.complete ? "✓" : i + 1}</span>
              <button className="tl-card" disabled={!st.unlocked} onClick={() => st.unlocked && onOpen(m.id)} title={st.unlocked ? m.name : "kilitli"}>
                <div className="tl-figure">
                  <AcademyImg id={m.id} className="tl-img" />
                  <span className="tl-emoji">{m.icon}</span>
                </div>
                <div className="tl-body">
                  <div className="tl-top">
                    <span className="tl-num">{i + 1}/{ROADMAP.length}</span>
                    <h3>{m.name}</h3>
                    {assignedMods && assignedMods.has(m.id) && <span className="tag assign">📌 görev</span>}
                    <span className={"tl-state" + (st.complete ? " ok" : "")}>{st.complete ? "✓ tamamlandı" : st.unlocked ? `${st.done}/${st.total}` : "kilitli"}</span>
                  </div>
                  <p className="tl-desc">{m.intro}</p>
                  {st.unlocked
                    ? <div className="bar tl-bar"><i style={{ width: `${pct}%` }} /></div>
                    : <div className="tl-lock">🔒 Önce “{ROADMAP[i - 1] ? ROADMAP[i - 1].name : "önceki"}” modülünü tamamla</div>}
                </div>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Academy({ openVuln, solved, readLessons, markRead, markSolved, addNote, autoClose, module, setModule, overrides, presentation, assignments }) {
  // Öğrenciye canlı sunum yapılıyorsa: senkron salt-okunur slayt (kilit baypas eder).
  if (presentation) return <PresentView presentation={presentation} />;
  const status = roadmapStatus(ROADMAP, { solved, readLessons, overrides });
  const assignedMods = new Set((assignments || []).filter(a => a.type === "module").map(a => a.ref));
  if (module) {
    const i = ROADMAP.findIndex(m => m.id === module);
    const mod = ROADMAP[i];
    const st = status[i];
    if (mod && st && st.unlocked) {
      return <ModuleView key={mod.id} mod={mod} st={st} solved={solved} readLessons={readLessons} markRead={markRead} markSolved={markSolved} addNote={addNote} autoClose={autoClose} openVuln={openVuln} onBack={() => setModule(null)} nextMod={ROADMAP[i + 1] || null} onOpenModule={setModule} />;
    }
  }
  return <Roadmap status={status} onOpen={setModule} assignedMods={assignedMods} />;
}

/* ═══════════════════════════════ ÖĞRETMEN PANELİ ═══════════════════════════════ */
function TeacherPanel() {
  const [data, setData] = uS(null);
  const [busy, setBusy] = uS(false);
  const load = async () => {
    try { const r = await fetch("/api/progress"); const d = await r.json(); setData(d.solved || {}); } catch { setData({}); }
  };
  uE(() => { load(); }, []);
  const reset = async () => {
    if (typeof window !== "undefined" && !window.confirm("Sunucu ilerlemesi sıfırlansın mı?")) return;
    setBusy(true);
    try { await fetch("/api/progress", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ reset: 1 }) }); } catch {}
    await load(); setBusy(false);
  };
  const download = (name, content, type) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };
  const exportJSON = () => download("ordek-ilerleme.json", JSON.stringify(data || {}, null, 2), "application/json");
  const exportCSV = () => {
    const rows = [["zafiyet", "slug", "grup", "low", "medium", "high", "toplam"]];
    VULNS.forEach(v => { const ls = (data && data[v.slug]) || []; rows.push([v.name, v.slug, v.group, ls.includes("low") ? "1" : "0", ls.includes("medium") ? "1" : "0", ls.includes("high") ? "1" : "0", String(ls.length)]); });
    download("ordek-ilerleme.csv", rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n"), "text/csv;charset=utf-8");
  };
  const got = data ? Object.values(data).reduce((a, ls) => a + ls.length, 0) : 0;
  const total = VULNS.length * 3;
  const pct = total ? Math.round(got / total * 100) : 0;
  return (
    <div>
      <div className="page-h">
        <div className="eyebrow">// eğitmen</div>
        <h1>Öğretmen Paneli</h1>
        <div className="sub">Öğrenci ilerlemesinin sunucu-taraflı özeti. Matristen kim neyi çözdü gör, raporu dışa aktar ya da sıfırla.</div>
      </div>
      <div className="callout" style={{ marginBottom: 16 }}><span className="ci">ℹ</span><span>İlerleme bu lab kurulumundaki <b>paylaşımlı sunucu sayacından</b> okunur; flag doğrulandıkça otomatik işlenir. (<code>GET /api/progress</code>)</span></div>

      <div className="panel" style={{ marginBottom: 16 }}>
        <div className="panel-h">// özet<span style={{ flex: 1 }} />
          <button className="kbtn ghost sm" onClick={load}>⟳ yenile</button>
          <button className="kbtn ghost sm" onClick={exportJSON}>JSON</button>
          <button className="kbtn ghost sm" onClick={exportCSV}>CSV</button>
          <button className="kbtn ghost sm" onClick={() => typeof window !== "undefined" && window.print()}>yazdır</button>
          <button className="kbtn danger sm" disabled={busy} onClick={reset}>sıfırla</button>
        </div>
        <div className="panel-b">
          <div className="row between" style={{ marginBottom: 8 }}><span className="mono">Genel tamamlanma</span><span className="mono" style={{ color: "var(--green-bright)" }}>{got} / {total} · %{pct}</span></div>
          <div className="bar"><i style={{ width: `${pct}%` }} /></div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-h">// zafiyet × seviye matrisi</div>
        <div className="panel-b" style={{ overflowX: "auto" }}>
          {data === null
            ? <div className="muted" style={{ fontSize: 13 }}>Yükleniyor…</div>
            : <table className="mtx">
                <thead><tr><th>Zafiyet</th><th>Grup</th><th className="c">Low</th><th className="c">Medium</th><th className="c">High</th></tr></thead>
                <tbody>
                  {VULNS.map(v => {
                    const ls = (data && data[v.slug]) || [];
                    return (
                      <tr key={v.id}>
                        <td>{v.name}</td>
                        <td className="faint mono" style={{ fontSize: 11 }}>{v.group}</td>
                        {["low", "medium", "high"].map(lv => (
                          <td key={lv} className="c"><span className={`cell ${ls.includes(lv) ? "y" : ""}`} data-l={lv}>{ls.includes(lv) ? "✓" : "·"}</span></td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════ SINIF MODU — KİMLİK ═══════════════════════════════ */
const AUTH_SHELL = { height: "100%", display: "grid", placeItems: "center", padding: 24 };
function AuthBrand({ tagline }) {
  return (
    <div className="col" style={{ gap: 12, marginBottom: 22, alignItems: "center" }}>
      <img className="auth-logo" src="/ordek.png" alt="ördek" />
      <div style={{ textAlign: "center" }}>
        <div className="brand-name" style={{ fontSize: 24 }}><b>ördek</b></div>
        <div className="faint mono" style={{ fontSize: 12, letterSpacing: 1 }}>{tagline}</div>
      </div>
    </div>
  );
}

// Öğrenci/öğretmen giriş + öğrenci kayıt (sınıf kodu ile).
function ClassAuth({ onAuthed }) {
  const [tab, setTab] = uS("login");
  const [f, setF] = uS({ username: "", password: "", displayName: "", classCode: "" });
  const [err, setErr] = uS("");
  const [busy, setBusy] = uS(false);
  const upd = (k, v) => { setF(p => ({ ...p, [k]: v })); setErr(""); };
  const submit = async (e) => {
    e && e.preventDefault();
    if (!f.username || !f.password || (tab === "register" && !f.classCode)) { setErr("Lütfen alanları doldur."); return; }
    setBusy(true); setErr("");
    const url = tab === "login" ? "/api/auth/login" : "/api/auth/register";
    const body = tab === "login"
      ? { username: f.username, password: f.password }
      : { username: f.username, password: f.password, displayName: f.displayName || f.username, classCode: f.classCode };
    try {
      const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const d = await r.json();
      if (d.ok) { await onAuthed(); } else setErr(d.error || "İşlem başarısız.");
    } catch (e2) { setErr(String(e2.message || e2)); }
    setBusy(false);
  };
  return (
    <>
      <div className="auth-bg" />
      <div style={{ ...AUTH_SHELL, position: "relative" }}>
      <div className="auth-card" style={{ width: 440, maxWidth: "100%" }}>
        <AuthBrand tagline="VULNERABLE LAB // SINIF" />
        <div className="panel">
          <div className="levelseg" style={{ display: "flex", margin: "14px 14px 0" }}>
            <button className={tab === "login" ? "on" : ""} style={{ flex: 1 }} onClick={() => { setTab("login"); setErr(""); }}>Giriş</button>
            <button className={tab === "register" ? "on" : ""} style={{ flex: 1 }} onClick={() => { setTab("register"); setErr(""); }}>Kayıt ol</button>
          </div>
          <form className="panel-b stagger" onSubmit={submit} key={tab}>
            <div className="field"><label>Kullanıcı adı</label>
              <input className="input" autoFocus value={f.username} onChange={e => upd("username", e.target.value)} placeholder="ör. ayse23" /></div>
            {tab === "register" && (
              <>
                <div className="field"><label>Görünen ad (opsiyonel)</label>
                  <input className="input" value={f.displayName} onChange={e => upd("displayName", e.target.value)} placeholder="Ayşe Yılmaz" /></div>
                <div className="field"><label>Sınıf kodu</label>
                  <input className="input mono" value={f.classCode} onChange={e => upd("classCode", e.target.value.toUpperCase())} placeholder="ÖğretmeninDEN ALDIĞIN KOD" style={{ letterSpacing: 2, textTransform: "uppercase" }} /></div>
              </>
            )}
            <div className="field"><label>Parola</label>
              <input className="input" type="password" value={f.password} onChange={e => upd("password", e.target.value)} placeholder="••••••••" /></div>
            {err && <div className="console" style={{ color: "var(--red-bright)", marginBottom: 12 }}>{err}</div>}
            <button className="kbtn primary" style={{ width: "100%", justifyContent: "center" }} type="submit" disabled={busy}>{busy ? "…" : (tab === "login" ? "Giriş yap →" : "Kayıt ol →")}</button>
          </form>
        </div>
        <p className="faint" style={{ textAlign: "center", fontSize: 12, marginTop: 16 }}>
          {tab === "register" ? "Öğretmeninden aldığın sınıf koduyla kayıt ol." : "Öğretmensen kendi hesabınla giriş yap."}
        </p>
      </div>
      </div>
    </>
  );
}

// İlk açılış: sınıf modu sihirbazı (3 adım: tanıtım → öğretmen hesabı → sıradaki adımlar).
function TeacherSetup({ onDone }) {
  const [step, setStep] = uS(0);
  const [f, setF] = uS({ username: "", displayName: "", password: "", password2: "" });
  const [err, setErr] = uS("");
  const [busy, setBusy] = uS(false);
  const upd = (k, v) => { setF(p => ({ ...p, [k]: v })); setErr(""); };
  const submit = async (e) => {
    e && e.preventDefault();
    if (!f.username || !f.password) { setErr("Kullanıcı adı ve parola gerekli."); return; }
    if (f.password !== f.password2) { setErr("Parolalar eşleşmiyor."); return; }
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/auth/setup", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ username: f.username, displayName: f.displayName || f.username, password: f.password }) });
      const d = await r.json();
      if (d.ok) { setStep(2); } else setErr(d.error || "Oluşturulamadı.");
    } catch (e2) { setErr(String(e2.message || e2)); }
    setBusy(false);
  };
  return (
    <>
      <div className="auth-bg" />
      <div style={{ ...AUTH_SHELL, position: "relative" }}>
        <div className="auth-card" style={{ width: 480, maxWidth: "100%" }}>
          <AuthBrand tagline="VULNERABLE LAB // İLK KURULUM" />
          <div className="panel">
            <div className="panel-b">
              <StepDots n={3} i={step} />

              {step === 0 && (
                <div className="wstep col" style={{ gap: 14 }} key="s0">
                  <div>
                    <div className="eyebrow">// adım 1 — tanıtım</div>
                    <h2 style={{ margin: "2px 0 6px", fontSize: 19 }}>Sınıf moduna hoş geldin 👩‍🏫</h2>
                    <p className="muted" style={{ fontSize: 13.5, lineHeight: 1.6, margin: 0 }}>
                      Bu, öğretmen + öğrencilerin paylaştığı tek sunucudur. Birazdan <b>ilk öğretmen hesabını</b> oluşturacaksın; sonra bir <b>sınıf</b> açıp <b>kodu</b> öğrencilerine vereceksin ve herkesi <b>canlı</b> izleyeceksin.
                    </p>
                  </div>
                  <div className="flow">
                    <div className="fl"><span className="fn">1</span><div className="fc"><h4>Öğretmen hesabı</h4><p>Kendi kullanıcı adın ve parolanı belirle (bu ekranda).</p></div></div>
                    <div className="fl"><span className="fn">2</span><div className="fc"><h4>Sınıf aç &amp; kodu paylaş</h4><p>Panelde sınıf oluştur; üretilen kodu öğrencilere ver.</p></div></div>
                    <div className="fl"><span className="fn">3</span><div className="fc"><h4>Canlı takip</h4><p>İlerleme matrisi, aktivite akışı, çalışan makineler — hepsi anlık.</p></div></div>
                  </div>
                  <button className="kbtn primary" style={{ justifyContent: "center" }} onClick={() => setStep(1)}>Başla → öğretmen hesabı</button>
                </div>
              )}

              {step === 1 && (
                <form className="wstep col stagger" style={{ gap: 0 }} onSubmit={submit} key="s1">
                  <div className="eyebrow">// adım 2 — öğretmen hesabı</div>
                  <div className="callout" style={{ margin: "4px 0 14px" }}><span className="ci">👩‍🏫</span><span>Bu sınıf sunucusunda henüz öğretmen yok. İlk öğretmen hesabını buradan oluştur.</span></div>
                  <div className="field"><label>Öğretmen kullanıcı adı</label>
                    <input className="input" autoFocus value={f.username} onChange={e => upd("username", e.target.value)} placeholder="ogretmen" /></div>
                  <div className="field"><label>Görünen ad (opsiyonel)</label>
                    <input className="input" value={f.displayName} onChange={e => upd("displayName", e.target.value)} placeholder="Mehmet Öğretmen" /></div>
                  <div className="field"><label>Parola</label>
                    <input className="input" type="password" value={f.password} onChange={e => upd("password", e.target.value)} placeholder="güçlü bir parola" /></div>
                  <div className="field"><label>Parola (tekrar)</label>
                    <input className="input" type="password" value={f.password2} onChange={e => upd("password2", e.target.value)} placeholder="••••••••" /></div>
                  {f.password && f.password2 && f.password !== f.password2 && <div className="faint" style={{ color: "var(--amber)", fontSize: 12, marginBottom: 10 }}>Parolalar henüz eşleşmiyor.</div>}
                  {err && <div className="console" style={{ color: "var(--red-bright)", marginBottom: 12 }}>{err}</div>}
                  <div className="row" style={{ gap: 8 }}>
                    <button type="button" className="kbtn ghost" onClick={() => { setErr(""); setStep(0); }}>← geri</button>
                    <button className="kbtn primary" style={{ flex: 1, justifyContent: "center" }} type="submit" disabled={busy}>{busy ? "…" : "Öğretmen hesabını oluştur →"}</button>
                  </div>
                </form>
              )}

              {step === 2 && (
                <div className="wstep col" style={{ gap: 14 }} key="s2">
                  <div className="flag-banner"><span style={{ fontSize: 18 }}>✓</span><div className="col" style={{ gap: 2 }}><span className="lbl">öğretmen hesabı hazır</span><span className="val">{f.displayName || f.username}</span></div></div>
                  <div>
                    <div className="eyebrow">// adım 3 — sıradaki</div>
                    <h2 style={{ margin: "2px 0 6px", fontSize: 18 }}>Şimdi sınıfını kur</h2>
                    <p className="muted" style={{ fontSize: 13.5, lineHeight: 1.6, margin: 0 }}>Panele girince seni "3 adımda sınıfını kur" rehberi karşılar:</p>
                  </div>
                  <div className="flow">
                    <div className="fl"><span className="fn">1</span><div className="fc"><h4>Sınıf oluştur</h4><p>"+ Sınıf oluştur" ile bir sınıf aç (ör. 11-A Siber).</p></div></div>
                    <div className="fl"><span className="fn">2</span><div className="fc"><h4>Kodu paylaş</h4><p>Üretilen sınıf kodunu öğrencilerine ver; "Kayıt ol"da bu kodu girerler.</p></div></div>
                    <div className="fl"><span className="fn">3</span><div className="fc"><h4>Canlı izle</h4><p>Öğrenciler katıldıkça ilerleme ve aktiviteleri panelde anlık görürsün.</p></div></div>
                  </div>
                  <button className="kbtn primary" style={{ justifyContent: "center" }} onClick={() => onDone()}>Panele gir →</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════ ÖĞRETMEN KONSOLU (sınıf modu) ═══════════════════════════════ */
const EVT = {
  flag_ok: { emo: "✅", t: "flag doğru", c: "var(--green-bright)" },
  flag_fail: { emo: "❌", t: "flag yanlış", c: "var(--red-bright)" },
  machine_start: { emo: "▶", t: "makine başlattı", c: "var(--green)" },
  machine_stop: { emo: "■", t: "makine durdurdu", c: "var(--ink-dim)" },
  machine_restart: { emo: "⟳", t: "makine yeniden başlattı", c: "var(--amber)" },
  machine_error: { emo: "⚠", t: "makine hatası", c: "var(--red-bright)" },
  login: { emo: "🔑", t: "giriş yaptı", c: "var(--ink-dim)" },
  register: { emo: "🆕", t: "kayıt oldu", c: "var(--green)" },
  blocked: { emo: "🚫", t: "yabancı makineye girmeye çalıştı", c: "var(--amber)" },
  error: { emo: "⚠", t: "hata", c: "var(--red-bright)" },
};
function timeAgo(ts) {
  if (!ts) return "—";
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return s + " sn önce";
  const m = Math.floor(s / 60); if (m < 60) return m + " dk önce";
  const h = Math.floor(m / 60); if (h < 24) return h + " sa önce";
  return Math.floor(h / 24) + " g önce";
}
const downloadBlob = (name, content, type) => {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a"); a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
};
const evtLine = (e) => {
  const meta = EVT[e.type] || { emo: "•", t: e.type, c: "var(--ink-dim)" };
  const tail = [e.slug && (VULNS.find(v => v.slug === e.slug)?.name || e.slug), e.level && LEVEL_LABEL[e.level], e.detail].filter(Boolean).join(" · ");
  return { meta, tail };
};

function StudentMatrix({ solved }) {
  return (
    <table className="mtx">
      <thead><tr><th>Zafiyet</th><th className="c">Low</th><th className="c">Medium</th><th className="c">High</th></tr></thead>
      <tbody>
        {VULNS.map(v => {
          const ls = (solved && solved[v.slug]) || [];
          return (
            <tr key={v.id}>
              <td>{v.name}</td>
              {["low", "medium", "high"].map(lv => (
                <td key={lv} className="c"><span className={`cell ${ls.includes(lv) ? "y" : ""}`} data-l={lv}>{ls.includes(lv) ? "✓" : "·"}</span></td>
              ))}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function TeacherConsole() {
  const [data, setData] = uS(null);
  const [feed, setFeed] = uS([]);
  const [err, setErr] = uS(null);
  const [filterClass, setFilterClass] = uS(null);
  const [newClass, setNewClass] = uS("");
  const [newCode, setNewCode] = uS("");
  const [sel, setSel] = uS(null);     // seçili öğrenci id
  const [detail, setDetail] = uS(null);
  const [copied, setCopied] = uS("");
  const [rooms, setRooms] = uS({});   // classId -> { unlockedModules, assignments, presentation }
  const [ctrlClass, setCtrlClass] = uS("");   // sınıf araçları hedef sınıfı
  const [presMod, setPresMod] = uS(ROADMAP[0].id);
  const [presLesson, setPresLesson] = uS(ROADMAP[0].lessons[0].id);
  const [asgType, setAsgType] = uS("lab");
  const [asgRef, setAsgRef] = uS(VULNS[0].slug);
  const [asgTitle, setAsgTitle] = uS("");
  const [asgDesc, setAsgDesc] = uS("");
  const [asgDue, setAsgDue] = uS("");
  const [asgPoints, setAsgPoints] = uS(100);
  const [subsFor, setSubsFor] = uS(null);  // notlandırma: { classId, a }
  const [subs, setSubs] = uS([]);
  const [grades, setGrades] = uS({});       // { studentId: { grade, feedback } }
  const [att, setAtt] = uS([]);             // son yoklamalar
  const [msg, setMsg] = uS("");
  const [bcast, setBcast] = uS("");
  const [bcastPrio, setBcastPrio] = uS("normal");
  const TOTAL = VULNS.length * 3;

  const loadOverview = async () => {
    try {
      const r = await fetch("/api/teacher/overview"); const d = await r.json();
      if (d.error) { setErr(d.error); return; }
      setErr(d.dockerError ? "Docker: " + d.dockerError : null);
      setData(d);
    } catch (e) { setErr(String(e.message || e)); }
  };
  const loadRooms = async () => {
    try { const r = await fetch("/api/teacher/classroom"); const d = await r.json(); if (d.rooms) setRooms(d.rooms); } catch {}
  };
  const loadFeed = async () => {
    try {
      const q = filterClass ? `?classId=${encodeURIComponent(filterClass)}&limit=60` : "?limit=60";
      const r = await fetch("/api/teacher/events" + q); const d = await r.json();
      if (d.events) setFeed(d.events);
    } catch {}
  };
  uE(() => { loadOverview(); loadFeed(); loadRooms(); const t = setInterval(() => { loadOverview(); loadFeed(); loadRooms(); }, 5000); return () => clearInterval(t); }, [filterClass]);
  uE(() => { if (sel) loadDetail(sel); }, [sel]);
  // seçili öğrenci detayını periyodik tazele
  uE(() => { if (!sel) return; const t = setInterval(() => loadDetail(sel), 5000); return () => clearInterval(t); }, [sel]);

  const loadDetail = async (id) => {
    try { const r = await fetch(`/api/teacher/student/${id}`); const d = await r.json(); if (!d.error) setDetail(d); } catch {}
  };
  const post = (url, body) => fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).then(r => r.json());
  const createClass = async () => {
    if (!newClass.trim()) return;
    const d = await post("/api/teacher/class", { action: "create", name: newClass.trim(), code: newCode.trim() }).catch(() => ({}));
    if (d && d.ok === false) { toast(d.error || "Sınıf oluşturulamadı", "err"); return; }
    setNewClass(""); setNewCode(""); loadOverview();
    if (d && d.class) toast(`Sınıf oluşturuldu · kod: ${d.class.code}`, "ok");
  };
  const classAction = async (action, id, extra = {}) => {
    if (action === "delete" && typeof window !== "undefined" && !window.confirm("Sınıf silinsin mi? Öğrenciler sınıfsız kalır.")) return;
    await post("/api/teacher/class", { action, id, ...extra }); loadOverview();
  };
  const resetStudent = async (id) => { if (typeof window !== "undefined" && !window.confirm("Bu öğrencinin ilerlemesi sıfırlansın mı?")) return; await post("/api/teacher/reset", { studentId: id }); loadOverview(); if (sel === id) loadDetail(id); };
  const copyCode = (code) => { try { navigator.clipboard.writeText(code); setCopied(code); setTimeout(() => setCopied(""), 1500); } catch {} };
  // sınıf araçları (ödev / kilit / sunum) — hepsi /api/teacher/classroom
  const roomPost = async (body, okMsg) => { const d = await post("/api/teacher/classroom", body).catch(() => ({})); if (d && d.ok === false) { toast(d.error || "İşlem başarısız", "err"); return null; } loadRooms(); if (okMsg) toast(okMsg, "ok"); return d; };
  const startPresent = (classId) => roomPost({ action: "present", classId, moduleId: presMod, lessonId: presLesson }, "📺 Sunum başladı");
  const stopPresent = (classId) => roomPost({ action: "stopPresent", classId }, "Sunum bitti");
  const assign = (classId) => {
    if (asgType === "writeup") {
      if (!asgTitle.trim()) { toast("Önce ödev başlığı yaz", "warn"); return; }
      roomPost({ action: "assign", classId, type: "lab", submitType: "writeup", ref: "", title: asgTitle.trim(), description: asgDesc.trim(), dueDate: asgDue ? new Date(asgDue).getTime() : null, maxPoints: Number(asgPoints) || 100 }, "📝 Yazılı ödev atandı");
      setAsgTitle(""); setAsgDesc(""); setAsgDue(""); return;
    }
    const t = asgType === "module" ? (ROADMAP.find(m => m.id === asgRef) || {}).name : (VULNS.find(v => v.slug === asgRef) || {}).name;
    roomPost({ action: "assign", classId, type: asgType, ref: asgRef, title: t || asgRef }, "📌 Görev atandı");
  };
  const unassign = (classId, assignmentId) => roomPost({ action: "unassign", classId, assignmentId });
  // notlandırma: bir ödevin teslimlerini yükle/notla
  const openSubs = async (a) => { setSubsFor({ classId: targetClass, a }); const d = await post("/api/teacher/classroom", { action: "listSubmissions", classId: targetClass, assignmentId: a.id }).catch(() => ({})); setSubs((d && d.submissions) || []); };
  const gradeSub = async (a, studentId) => {
    const g = grades[studentId] || {};
    const d = await post("/api/teacher/classroom", { action: "gradeSubmission", classId: targetClass, assignmentId: a.id, studentId, grade: Number(g.grade), feedback: g.feedback || "" }).catch(() => ({}));
    if (d && d.ok) { toast("✓ Notlandı", "ok"); const r = await post("/api/teacher/classroom", { action: "listSubmissions", classId: targetClass, assignmentId: a.id }).catch(() => ({})); setSubs((r && r.submissions) || []); }
    else toast((d && d.error) || "Notlanamadı", "err");
  };
  // yoklama: o an aktif (son 15 dk) öğrencileri snapshot'la
  const takeAtt = async () => {
    const now = Date.now();
    const present = students.filter(s => s.lastActivity && now - s.lastActivity < 15 * 60 * 1000).map(s => ({ id: s.id, name: s.displayName || s.username }));
    const d = await post("/api/teacher/classroom", { action: "takeAttendance", classId: targetClass, present }).catch(() => ({}));
    if (d && d.ok) { toast(`📋 Yoklama alındı: ${present.length} öğrenci`, "ok"); setAtt(d.recent || []); }
    else toast((d && d.error) || "Yoklama alınamadı", "err");
  };
  const toggleModule = (classId, modId, isOpen) => {
    const room = rooms[classId] || {};
    const base = Array.isArray(room.unlockedModules) ? room.unlockedModules : [];
    const set = new Set(base);
    if (isOpen) set.delete(modId); else set.add(modId);
    roomPost({ action: "setModules", classId, modules: [...set] });
  };
  const manageModules = (classId) => roomPost({ action: "setModules", classId, modules: [ROADMAP[0].id] }, "Elle yönetime geçildi");
  const autoModules = (classId) => roomPost({ action: "setModules", classId, modules: null }, "Otomatik kilide döndü");
  const sendMessage = async (studentId) => { if (!msg.trim()) return; const d = await post("/api/teacher/classroom", { action: "message", studentId, text: msg.trim() }).catch(() => ({})); if (d && d.ok) { toast("✉️ Mesaj gönderildi", "ok"); setMsg(""); } else toast((d && d.error) || "Mesaj gönderilemedi", "err"); };
  const broadcast = async () => { if (!bcast.trim()) return; const d = await post("/api/teacher/classroom", { action: "broadcast", classId: targetClass, text: bcast.trim(), priority: bcastPrio }).catch(() => ({})); if (d && d.ok) { toast(`📢 Duyuru ${d.count} öğrenciye gönderildi`, "ok"); setBcast(""); } else toast((d && d.error) || "Duyuru gönderilemedi", "err"); loadRooms(); };
  const resolveHelp = async (helpId) => { await post("/api/teacher/classroom", { action: "resolveHelp", classId: targetClass, helpId }).catch(() => {}); loadRooms(); };

  const classes = (data && data.classes) || [];
  const studentsAll = (data && data.students) || [];
  const students = filterClass ? studentsAll.filter(s => s.classId === filterClass) : studentsAll;
  const avgPct = students.length ? Math.round(students.reduce((a, s) => a + s.total, 0) / students.length / TOTAL * 100) : 0;
  const totalSolved = students.reduce((a, s) => a + s.total, 0);

  const exportCSV = () => {
    const rows = [["ad", "kullanici", "sinif", "toplam", "low", "medium", "high", "yuzde", "son_aktivite"]];
    students.forEach(s => rows.push([s.displayName, s.username, s.className || "", String(s.total), String(s.low), String(s.medium), String(s.high), TOTAL ? Math.round(s.total / TOTAL * 100) + "%" : "0%", s.lastActivity ? new Date(s.lastActivity).toISOString() : ""]));
    downloadBlob("ordek-sinif.csv", rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n"), "text/csv;charset=utf-8");
  };
  const exportJSON = () => downloadBlob("ordek-sinif.json", JSON.stringify({ classes, students }, null, 2), "application/json");

  const selStudent = students.find(s => s.id === sel) || studentsAll.find(s => s.id === sel);

  // sınıf araçları hedef sınıfı + o sınıfın canlı durumu
  const targetClass = ctrlClass || (classes[0] && classes[0].id) || "";
  const room = rooms[targetClass] || { unlockedModules: null, assignments: [], presentation: null };
  const presLessons = (ROADMAP.find(m => m.id === presMod) || ROADMAP[0]).lessons || [];
  // ısı haritası: her zafiyeti kaç öğrenci çözdü (en az çözülen = en çok zorlanılan)
  const heatMax = students.length || 1;
  const heat = VULNS.map(v => ({ slug: v.slug, name: v.name, cnt: students.filter(s => (s.solved[v.slug] || []).length > 0).length }));
  const hardest = [...heat].filter(h => h.cnt < heatMax).sort((a, b) => a.cnt - b.cnt).slice(0, 6);

  return (
    <div>
      <div className="page-h">
        <div className="eyebrow">// eğitmen konsolu</div>
        <h1>Öğretmen Paneli</h1>
        <div className="sub">Sınıflarını yönet, öğrenci ilerlemesini canlı izle: kim hangi aşamada, ne yaptı, hangi makineleri çalıştırıyor ve nerede takıldı/hata aldı — hepsi bir bakışta.</div>
      </div>

      {err && <div className="panel" style={{ marginBottom: 16 }}><div className="panel-b"><div className="console" style={{ color: "var(--amber)" }}>⚠ {err}</div></div></div>}

      {/* özet */}
      <div className="panel" style={{ marginBottom: 16 }}>
        <div className="panel-b row wrap between" style={{ gap: 16 }}>
          <div className="row" style={{ gap: 26 }}>
            <Stat n={classes.length} l="sınıf" />
            <Stat n={students.length} l="öğrenci" />
            <Stat n={totalSolved} l="çözülen flag" />
            <div className="col"><span style={{ fontSize: 26, fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--green-bright)", lineHeight: 1 }}>%{avgPct}</span><span className="faint mono" style={{ fontSize: 11 }}>ort. tamamlanma</span></div>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <button className="kbtn ghost sm" onClick={() => { loadOverview(); loadFeed(); }}>⟳ yenile</button>
            <button className="kbtn ghost sm" onClick={exportCSV}>CSV</button>
            <button className="kbtn ghost sm" onClick={exportJSON}>JSON</button>
            <button className="kbtn ghost sm" onClick={() => typeof window !== "undefined" && window.print()}>yazdır</button>
          </div>
        </div>
      </div>

      {/* sınıf araçları: sunum · ödev · modül kilidi */}
      {classes.length > 0 && (
        <div className="panel" style={{ marginBottom: 16 }}>
          <div className="panel-h"><span style={{ color: "var(--green)" }}>🎛️ sınıf araçları</span><span style={{ flex: 1 }} />
            <span className="faint mono" style={{ fontSize: 11, marginRight: 6 }}>sınıf:</span>
            <select className="input sm" style={{ width: "auto", padding: "5px 9px" }} value={targetClass} onChange={e => setCtrlClass(e.target.value)}>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="panel-b col" style={{ gap: 16 }}>
            {/* SUNUM */}
            <div>
              <div className="lk" style={{ marginBottom: 7 }}>📺 Sunum (anlatım) — öğrencilere canlı yayınla</div>
              {room.presentation && room.presentation.active && (
                <div className="present-bar" style={{ marginBottom: 8 }}><span className="live" /> Yayında: <b style={{ marginLeft: 4 }}>{(findLesson(room.presentation.moduleId, room.presentation.lessonId) || {}).title || "—"}</b></div>
              )}
              <div className="row wrap" style={{ gap: 8 }}>
                <select className="input sm" style={{ width: "auto", padding: "6px 9px" }} value={presMod} onChange={e => { setPresMod(e.target.value); const m = ROADMAP.find(x => x.id === e.target.value) || ROADMAP[0]; setPresLesson(m.lessons[0].id); }}>
                  {ROADMAP.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                <select className="input sm" style={{ width: "auto", padding: "6px 9px", maxWidth: 260 }} value={presLesson} onChange={e => setPresLesson(e.target.value)}>
                  {presLessons.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}
                </select>
                <button className="kbtn primary sm" onClick={() => startPresent(targetClass)}>▶ Yayına başla</button>
                {room.presentation && room.presentation.active && <button className="kbtn danger sm" onClick={() => stopPresent(targetClass)}>■ Durdur</button>}
              </div>
            </div>

            {/* ÖDEV */}
            <div style={{ borderTop: "1px solid var(--line-soft)", paddingTop: 14 }}>
              <div className="lk" style={{ marginBottom: 7 }}>📌 Ödev / görev ata</div>
              <div className="row wrap" style={{ gap: 8, alignItems: "flex-start" }}>
                <select className="input sm" style={{ width: "auto", padding: "6px 9px" }} value={asgType} onChange={e => { const v = e.target.value; setAsgType(v); if (v !== "writeup") setAsgRef(v === "module" ? ROADMAP[0].id : VULNS[0].slug); }}>
                  <option value="lab">Laboratuvar</option>
                  <option value="module">Akademi modülü</option>
                  <option value="writeup">Yazılı ödev (writeup)</option>
                </select>
                {asgType === "writeup" ? (
                  <div className="col" style={{ gap: 6, flex: 1, minWidth: 240 }}>
                    <input className="input sm" placeholder="Ödev başlığı (ör. SQLi raporu)" value={asgTitle} onChange={e => setAsgTitle(e.target.value)} />
                    <textarea className="input" rows={2} placeholder="Açıklama / yönerge (opsiyonel)" value={asgDesc} onChange={e => setAsgDesc(e.target.value)} />
                    <div className="row wrap" style={{ gap: 10 }}>
                      <label className="faint mono" style={{ fontSize: 11, display: "flex", flexDirection: "column", gap: 3 }}>son tarih<input className="input sm" type="datetime-local" value={asgDue} onChange={e => setAsgDue(e.target.value)} /></label>
                      <label className="faint mono" style={{ fontSize: 11, display: "flex", flexDirection: "column", gap: 3 }}>puan<input className="input sm" type="number" min="1" max="1000" style={{ width: 80 }} value={asgPoints} onChange={e => setAsgPoints(e.target.value)} /></label>
                    </div>
                  </div>
                ) : (
                  <select className="input sm" style={{ width: "auto", padding: "6px 9px", maxWidth: 280 }} value={asgRef} onChange={e => setAsgRef(e.target.value)}>
                    {asgType === "module" ? ROADMAP.map(m => <option key={m.id} value={m.id}>{m.name}</option>) : VULNS.map(v => <option key={v.slug} value={v.slug}>{v.name}</option>)}
                  </select>
                )}
                <button className="kbtn primary sm" onClick={() => assign(targetClass)}>+ Görev ata</button>
              </div>
              {room.assignments && room.assignments.length > 0 && (
                <div className="col" style={{ gap: 6, marginTop: 10 }}>
                  {room.assignments.map(a => (
                    <div key={a.id} className="row wrap" style={{ gap: 8, alignItems: "center" }}>
                      <span className="tag assign" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        {a.submitType === "writeup" ? "📝" : a.type === "module" ? "📘" : "⚑"} {a.title}
                        <button className="ghost" style={{ background: "none", border: 0, color: "inherit", cursor: "pointer", fontSize: 13 }} onClick={() => unassign(targetClass, a.id)} title="kaldır">✕</button>
                      </span>
                      {a.submitType === "writeup" && <button className="kbtn ghost sm" onClick={() => openSubs(a)}>📥 Teslimler</button>}
                      {a.dueDate && <span className="faint mono" style={{ fontSize: 11 }}>son: {new Date(a.dueDate).toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" })}</span>}
                    </div>
                  ))}
                </div>
              )}
              {subsFor && (
                <div className="panel" style={{ marginTop: 12 }}>
                  <div className="panel-h"><span>📥 Teslimler · {subsFor.a.title}</span><span style={{ flex: 1 }} /><button className="kbtn ghost sm" onClick={() => setSubsFor(null)}>kapat ✕</button></div>
                  <div className="panel-b col" style={{ gap: 12 }}>
                    {subs.length === 0 ? <div className="faint mono" style={{ fontSize: 12 }}>Henüz teslim yok.</div> : subs.map(s => {
                      const g = grades[s.studentId] || {};
                      return (
                        <div key={s.studentId} className="col" style={{ gap: 6, borderTop: "1px solid var(--line-soft)", paddingTop: 10 }}>
                          <div className="row between"><b>{s.studentName}</b>{s.grade != null && <span className="tag solved">not: {s.grade}/{subsFor.a.maxPoints}</span>}</div>
                          <div className="lesson-cmd" style={{ whiteSpace: "pre-wrap" }}>{s.text}</div>
                          <div className="row wrap" style={{ gap: 8, alignItems: "center" }}>
                            <input className="input sm" type="number" min="0" max={subsFor.a.maxPoints} placeholder={`puan (max ${subsFor.a.maxPoints})`} style={{ width: 130 }} value={g.grade ?? (s.grade ?? "")} onChange={e => setGrades(p => ({ ...p, [s.studentId]: { ...p[s.studentId], grade: e.target.value } }))} />
                            <input className="input sm" placeholder="geri bildirim (opsiyonel)" style={{ flex: 1, minWidth: 160 }} value={g.feedback ?? (s.feedback ?? "")} onChange={e => setGrades(p => ({ ...p, [s.studentId]: { ...p[s.studentId], feedback: e.target.value } }))} />
                            <button className="kbtn primary sm" onClick={() => gradeSub(subsFor.a, s.studentId)}>Notla</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* YOKLAMA */}
            <div style={{ borderTop: "1px solid var(--line-soft)", paddingTop: 14 }}>
              <div className="row between" style={{ marginBottom: 7 }}>
                <div className="lk">📋 Yoklama (son 15 dk aktif öğrenciler)</div>
                <button className="kbtn ghost sm" onClick={takeAtt}>📋 Yoklama al</button>
              </div>
              {att.length > 0 && (
                <div className="col" style={{ gap: 4 }}>
                  {att.slice(0, 5).map(r => (
                    <div key={r.day} className="row" style={{ gap: 8, fontSize: 12.5 }}>
                      <span className="mono" style={{ color: "var(--green-bright)", minWidth: 92 }}>{r.day}</span>
                      <span className="faint mono">{r.present.length} öğrenci</span>
                      <span className="faint" style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.present.map(p => p.name).join(", ") || "—"}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* MODÜL KİLİDİ */}
            <div style={{ borderTop: "1px solid var(--line-soft)", paddingTop: 14 }}>
              <div className="row between" style={{ marginBottom: 7 }}>
                <div className="lk">🔓 Modül kilidi (sınıf için)</div>
                {Array.isArray(room.unlockedModules)
                  ? <button className="kbtn ghost sm" onClick={() => autoModules(targetClass)}>otomatiğe dön</button>
                  : <button className="kbtn ghost sm" onClick={() => manageModules(targetClass)}>elle yönet</button>}
              </div>
              {!Array.isArray(room.unlockedModules)
                ? <div className="muted" style={{ fontSize: 13 }}>Otomatik (sıralı kilit): her öğrenci kendi ilerlemesiyle ilerler. Sınıfça pace'lemek için "elle yönet"e bas.</div>
                : <div className="row wrap" style={{ gap: 6 }}>
                    {ROADMAP.map((m, i) => {
                      const open = i === 0 || room.unlockedModules.includes(m.id);
                      return <button key={m.id} className="tag" style={{ cursor: i === 0 ? "default" : "pointer", color: open ? "var(--green-bright)" : "var(--ink-dim)", borderColor: open ? "var(--green-deep)" : "var(--line)" }} disabled={i === 0} onClick={() => toggleModule(targetClass, m.id, open)}>{open ? "✓ " : "🔒 "}{m.name}</button>;
                    })}
                  </div>}
            </div>

            {/* DUYURU (broadcast) */}
            <div style={{ borderTop: "1px solid var(--line-soft)", paddingTop: 14 }}>
              <div className="lk" style={{ marginBottom: 7 }}>📢 Tüm sınıfa anlık duyuru (SSE)</div>
              <div className="row wrap" style={{ gap: 8 }}>
                <input className="input sm" style={{ flex: 1, minWidth: 200 }} placeholder="Duyuru metni…" value={bcast} onChange={e => setBcast(e.target.value)} onKeyDown={e => e.key === "Enter" && broadcast()} />
                <select className="input sm" style={{ width: "auto", padding: "6px 9px" }} value={bcastPrio} onChange={e => setBcastPrio(e.target.value)}>
                  <option value="normal">normal</option>
                  <option value="urgent">acil 🚨</option>
                </select>
                <button className="kbtn primary sm" onClick={broadcast}>Gönder</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* yardım istekleri (öğrenci el kaldırdı) */}
      {classes.length > 0 && Array.isArray(room.help) && room.help.length > 0 && (
        <div className="panel" style={{ marginBottom: 16 }}>
          <div className="panel-h"><span style={{ color: "var(--amber)" }}>✋ yardım istekleri</span><span style={{ flex: 1 }} /><span className="tag" style={{ color: "var(--amber)" }}>{room.help.length} bekliyor</span></div>
          <div className="panel-b col" style={{ gap: 0 }}>
            {room.help.map((h, i) => (
              <div key={h.id} className="row between wrap" style={{ padding: "9px 2px", borderTop: i ? "1px solid var(--line-soft)" : 0, gap: 10 }}>
                <div className="col" style={{ gap: 2 }}>
                  <span style={{ fontWeight: 600 }}>✋ {h.studentName}{h.note ? <span className="faint" style={{ fontWeight: 400 }}> — {h.note}</span> : null}</span>
                  <span className="faint mono" style={{ fontSize: 11 }}>{h.ts ? new Date(h.ts).toLocaleString("tr") : ""}</span>
                </div>
                <div className="row" style={{ gap: 6 }}>
                  <button className="kbtn ghost sm" onClick={() => setSel(h.studentId)}>öğrenciyi gör</button>
                  <button className="kbtn primary sm" onClick={() => resolveHelp(h.id)}>çözüldü</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* sınıf ilerleme ısı haritası */}
      {students.length > 0 && (
        <div className="panel" style={{ marginBottom: 16 }}>
          <div className="panel-h"><span style={{ color: "var(--green)" }}>🔥 ısı haritası</span><span style={{ flex: 1 }} /><span className="faint mono" style={{ fontSize: 10 }}>her zafiyeti çözen öğrenci sayısı</span></div>
          <div className="panel-b">
            {hardest.length > 0 && (
              <div className="row wrap" style={{ gap: 6, marginBottom: 12 }}>
                <span className="faint mono" style={{ fontSize: 11 }}>En çok zorlanılan:</span>
                {hardest.map(h => <span key={h.slug} className="tag" style={{ color: "var(--amber)" }}>{h.name} · {h.cnt}/{heatMax}</span>)}
              </div>
            )}
            <div className="heat">
              {heat.map(h => {
                const ratio = heatMax ? h.cnt / heatMax : 0;
                return (
                  <div key={h.slug} className="heat-row">
                    <span className="hl">{h.name}</span>
                    <span className="heat-cell" style={{ background: `rgba(143,207,63,${0.08 + ratio * 0.8})`, color: ratio > 0.5 ? "#11160a" : "var(--ink-dim)" }}>{h.cnt}/{heatMax}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* sıralama (leaderboard) + kim hangi rozeti aldı */}
      {students.length > 0 && (
        <div className="panel" style={{ marginBottom: 16 }}>
          <div className="panel-h"><span style={{ color: "var(--green)" }}>🏆 sıralama</span><span style={{ flex: 1 }} /><span className="faint mono" style={{ fontSize: 10 }}>flag · kazanılan rozetler</span></div>
          <div className="panel-b col" style={{ gap: 0 }}>
            {[...students].sort((a, b) => b.total - a.total || (b.lastActivity || 0) - (a.lastActivity || 0)).map((s, i) => {
              const pct = TOTAL ? Math.round(s.total / TOTAL * 100) : 0;
              const earned = computeBadges(s.solved).filter(b => b.on);
              const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;
              return (
                <div key={s.id} className="row between wrap" style={{ gap: 10, padding: "9px 2px", borderTop: i ? "1px solid var(--line-soft)" : 0, cursor: "pointer", background: sel === s.id ? "var(--bg-2)" : undefined }} onClick={() => setSel(s.id)}>
                  <div className="row" style={{ gap: 10, minWidth: 200, flex: 1 }}>
                    <span className="mono" style={{ width: 28, textAlign: "center", fontSize: medal ? 17 : 13, color: "var(--ink-dim)" }}>{medal || (i + 1)}</span>
                    <div className="col" style={{ gap: 2 }}>
                      <span style={{ fontWeight: 600 }}>{s.displayName}</span>
                      <span className="faint mono" style={{ fontSize: 10 }}>{s.className || "—"} · {s.total}/{TOTAL} · %{pct}</span>
                    </div>
                  </div>
                  <div className="row" style={{ gap: 3, flexWrap: "wrap", maxWidth: 240, justifyContent: "flex-end" }}>
                    {earned.length ? earned.map(b => <span key={b.t} title={`${b.t} — ${b.d}`} style={{ fontSize: 16 }}>{b.emo}</span>) : <span className="faint" style={{ fontSize: 12 }}>henüz rozet yok</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid2" style={{ gridTemplateColumns: "1.5fr 1fr", alignItems: "start" }}>
        <div className="col" style={{ gap: 16 }}>
          {/* sınıf yönetimi */}
          <div className="panel">
            <div className="panel-h">// sınıflarım</div>
            <div className="panel-b col" style={{ gap: 12 }}>
              <div className="row wrap" style={{ gap: 8 }}>
                <input className="input" style={{ flex: 2, minWidth: 180 }} placeholder="Yeni sınıf adı (ör. 11-A Siber)" value={newClass} onChange={e => setNewClass(e.target.value)} onKeyDown={e => e.key === "Enter" && createClass()} />
                <input className="input mono" style={{ flex: 1, minWidth: 120, letterSpacing: 1.5, textTransform: "uppercase" }} placeholder="KOD (ops. · ör. GRUP1)" value={newCode} onChange={e => setNewCode(e.target.value.toUpperCase())} onKeyDown={e => e.key === "Enter" && createClass()} title="Boş bırakırsan okunaklı bir kod otomatik üretilir" />
                <button className="kbtn primary" onClick={createClass}>+ Sınıf oluştur</button>
              </div>
              {classes.length === 0 && (
                <div className="col" style={{ gap: 12 }}>
                  <div className="callout"><span className="ci">👋</span><span>Henüz sınıfın yok. <b>3 adımda</b> sınıfını kur ve öğrencilerini canlı izlemeye başla.</span></div>
                  <div className="flow">
                    <div className="fl"><span className="fn">1</span><div className="fc"><h4>Sınıf oluştur</h4><p>Yukarıdaki kutuya bir ad yaz (ör. <b>11-A Siber</b>) ve <b>"+ Sınıf oluştur"</b>a bas.</p></div></div>
                    <div className="fl"><span className="fn">2</span><div className="fc"><h4>Kodu paylaş</h4><p>Oluşan sınıfın yanındaki <b>kodu</b> kopyala; öğrencilerine ver. "Kayıt ol"da bu kodu girerler.</p></div></div>
                    <div className="fl"><span className="fn">3</span><div className="fc"><h4>Canlı izle</h4><p>Öğrenciler katıldıkça ilerleme matrisi, aktivite akışı ve makineleri burada anlık görürsün.</p></div></div>
                  </div>
                </div>
              )}
              {classes.map(c => (
                <div key={c.id} className="row between wrap" style={{ gap: 10, padding: "10px 0", borderTop: "1px solid var(--line-soft)" }}>
                  <div className="col" style={{ gap: 3 }}>
                    <span style={{ fontWeight: 600 }}>{c.name}{c.archived ? <span className="faint"> (arşiv)</span> : null}</span>
                    <span className="faint mono" style={{ fontSize: 11 }}>{c.studentCount} öğrenci</span>
                  </div>
                  <div className="row" style={{ gap: 6, alignItems: "center" }}>
                    <button className="tag mono" title="kodu kopyala" style={{ cursor: "pointer", color: "var(--green-bright)", letterSpacing: 2, fontSize: 14 }} onClick={() => copyCode(c.code)}>{copied === c.code ? "kopyalandı ✓" : c.code}</button>
                    <button className="kbtn ghost sm" title="kodu yenile" onClick={() => classAction("regenerate", c.id)}>⟳ kod</button>
                    <button className="kbtn ghost sm" onClick={() => classAction("archive", c.id, { archived: !c.archived })}>{c.archived ? "aktifle" : "arşivle"}</button>
                    <button className="kbtn danger sm" onClick={() => classAction("delete", c.id)}>sil</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* öğrenci listesi */}
          <div className="panel">
            <div className="panel-h">// öğrenciler<span style={{ flex: 1 }} />
              <span className="tag">{students.length}</span></div>
            <div className="panel-b">
              {classes.length > 0 && (
                <div className="row wrap" style={{ gap: 6, marginBottom: 12 }}>
                  <button className={`tag ${!filterClass ? "" : ""}`} style={{ cursor: "pointer", color: !filterClass ? "var(--green-bright)" : "var(--ink-dim)", borderColor: !filterClass ? "var(--green-deep)" : "var(--line)" }} onClick={() => setFilterClass(null)}>tümü</button>
                  {classes.map(c => (
                    <button key={c.id} className="tag" style={{ cursor: "pointer", color: filterClass === c.id ? "var(--green-bright)" : "var(--ink-dim)", borderColor: filterClass === c.id ? "var(--green-deep)" : "var(--line)" }} onClick={() => setFilterClass(c.id)}>{c.name}</button>
                  ))}
                </div>
              )}
              {students.length === 0
                ? <div className="muted" style={{ fontSize: 13 }}>Bu görünümde öğrenci yok. Sınıf kodunu paylaş; öğrenciler kayıt oldukça burada görünür.</div>
                : <div style={{ overflowX: "auto" }}>
                    <table className="mtx">
                      <thead><tr><th>Öğrenci</th><th>Sınıf</th><th>İlerleme</th><th className="c">Flag</th><th className="c">Makine</th><th>Son aktivite</th><th className="c">Durum</th><th></th></tr></thead>
                      <tbody>
                        {students.map(s => {
                          const pct = TOTAL ? Math.round(s.total / TOTAL * 100) : 0;
                          const stuck = s.fails >= 5 && s.total === 0;
                          return (
                            <tr key={s.id} style={{ cursor: "pointer", background: sel === s.id ? "var(--bg-2)" : undefined }} onClick={() => setSel(s.id)}>
                              <td><b>{s.displayName}</b><div className="faint mono" style={{ fontSize: 10 }}>@{s.username}</div></td>
                              <td className="faint" style={{ fontSize: 12 }}>{s.className || "—"}</td>
                              <td style={{ minWidth: 120 }}><div className="bar" style={{ marginBottom: 2 }}><i style={{ width: `${pct}%` }} /></div><span className="faint mono" style={{ fontSize: 10 }}>%{pct}</span></td>
                              <td className="c mono">{s.total}/{TOTAL}</td>
                              <td className="c">{s.runningMachines > 0 ? <span className="tag" style={{ color: "var(--green-bright)" }}>{s.runningMachines} ▶</span> : <span className="faint">0</span>}</td>
                              <td className="faint" style={{ fontSize: 12 }}>{timeAgo(s.lastActivity)}</td>
                              <td className="c">{stuck ? <span className="tag" style={{ color: "var(--amber)" }}>takıldı</span> : s.total === TOTAL ? <span className="tag solved">tam ✓</span> : <span className="faint">—</span>}</td>
                              <td className="c"><button className="kbtn ghost sm" onClick={(e) => { e.stopPropagation(); setSel(s.id); }}>detay</button></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>}
            </div>
          </div>
        </div>

        {/* canlı aktivite akışı */}
        <div className="panel" style={{ position: "sticky", top: 8 }}>
          <div className="panel-h"><span style={{ color: "var(--green)" }}>● canlı aktivite</span><span style={{ flex: 1 }} /><span className="faint mono" style={{ fontSize: 10 }}>5sn</span></div>
          <div className="panel-b col" style={{ gap: 0, maxHeight: 560, overflowY: "auto" }}>
            {feed.length === 0 && <div className="muted" style={{ fontSize: 13 }}>Henüz aktivite yok.</div>}
            {feed.map((e, i) => {
              const { meta, tail } = evtLine(e);
              return (
                <div key={i} className="row" style={{ gap: 8, padding: "8px 0", borderTop: i ? "1px solid var(--line-soft)" : 0, alignItems: "flex-start" }}>
                  <span style={{ color: meta.c }}>{meta.emo}</span>
                  <div className="col" style={{ gap: 1, flex: 1 }}>
                    <span style={{ fontSize: 13 }}><b>{e.who}</b> <span className="muted">{meta.t}</span></span>
                    {tail && <span className="faint" style={{ fontSize: 11.5 }}>{tail}</span>}
                  </div>
                  <span className="faint mono" style={{ fontSize: 10, whiteSpace: "nowrap" }}>{timeAgo(e.ts)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* öğrenci drill-down */}
      {sel && (
        <div className="panel" style={{ marginTop: 18, borderColor: "var(--green-deep)" }}>
          <div className="panel-h">
            <span style={{ color: "var(--green-bright)" }}>// öğrenci: {selStudent ? selStudent.displayName : sel}</span>
            <span style={{ flex: 1 }} />
            <button className="kbtn danger sm" onClick={() => resetStudent(sel)}>ilerlemeyi sıfırla</button>
            <button className="kbtn ghost sm" onClick={() => { setSel(null); setDetail(null); }}>✕ kapat</button>
          </div>
          <div className="panel-b" style={{ borderBottom: "1px solid var(--line-soft)" }}>
            <div className="lk" style={{ marginBottom: 6 }}>✉️ Öğrenciye mesaj / ipucu gönder</div>
            <div className="row" style={{ gap: 8 }}>
              <input className="input" style={{ flex: 1 }} placeholder="ör. SQLi'de tek tırnak (') ile başla, sonra UNION SELECT dene…" value={msg} onChange={e => setMsg(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMessage(sel)} />
              <button className="kbtn primary" onClick={() => sendMessage(sel)}>Gönder</button>
            </div>
          </div>
          <div className="panel-b">
            {!detail ? <div className="muted" style={{ fontSize: 13 }}>Yükleniyor…</div> : (
              <div className="grid2" style={{ gridTemplateColumns: "1.1fr 1fr", alignItems: "start", gap: 16 }}>
                {/* matris */}
                <div className="col" style={{ gap: 12 }}>
                  <div>
                    <div className="faint mono" style={{ fontSize: 11, marginBottom: 6 }}>ZAFİYET × SEVİYE MATRİSİ</div>
                    <div style={{ overflowX: "auto" }}><StudentMatrix solved={detail.solved} /></div>
                  </div>
                  <div>
                    <div className="faint mono" style={{ fontSize: 11, marginBottom: 6 }}>ROZETLER</div>
                    <div className="row wrap" style={{ gap: 6 }}>
                      {computeBadges(detail.solved).map(b => (
                        <span key={b.t} className="tag" title={b.d} style={{ opacity: b.on ? 1 : 0.45, color: b.on ? "var(--green-bright)" : "var(--ink-faint)", borderColor: b.on ? "var(--green-deep)" : "var(--line)" }}>{b.emo} {b.t}{b.on ? " ✓" : ""}</span>
                      ))}
                    </div>
                  </div>
                </div>
                {/* makineler + hatalar + zaman çizelgesi */}
                <div className="col" style={{ gap: 14 }}>
                  <div>
                    <div className="faint mono" style={{ fontSize: 11, marginBottom: 6 }}>ÇALIŞAN MAKİNELER</div>
                    {(!detail.machines || detail.machines.length === 0)
                      ? <div className="muted" style={{ fontSize: 12.5 }}>{detail.dockerError ? "Docker durumu okunamadı." : "Şu an çalışan makine yok."}</div>
                      : detail.machines.map(m => (
                        <div key={m.id} className="row between" style={{ gap: 8, padding: "6px 0", borderTop: "1px solid var(--line-soft)" }}>
                          <span style={{ fontSize: 13 }}>{m.name} <span className="faint mono" style={{ fontSize: 10 }}>· {LEVEL_LABEL[m.level] || m.level} · :{m.port}</span></span>
                          {m.url && <a className="kbtn ghost sm" href={m.url} target="_blank" rel="noreferrer">↗</a>}
                        </div>
                      ))}
                  </div>
                  <div>
                    <div className="faint mono" style={{ fontSize: 11, marginBottom: 6 }}>SON HATALAR & TAKILMALAR</div>
                    {(!detail.errors || detail.errors.length === 0)
                      ? <div className="muted" style={{ fontSize: 12.5 }}>Kayıtlı hata yok.</div>
                      : detail.errors.slice(0, 8).map((e, i) => {
                        const { meta, tail } = evtLine(e);
                        return <div key={i} className="row" style={{ gap: 8, padding: "5px 0", alignItems: "flex-start" }}><span style={{ color: meta.c }}>{meta.emo}</span><span className="muted" style={{ fontSize: 12.5, flex: 1 }}>{meta.t}{tail ? " — " + tail : ""}</span><span className="faint mono" style={{ fontSize: 10 }}>{timeAgo(e.ts)}</span></div>;
                      })}
                  </div>
                  <div>
                    <div className="faint mono" style={{ fontSize: 11, marginBottom: 6 }}>NE YAPTI? (zaman çizelgesi)</div>
                    <div className="col" style={{ gap: 0, maxHeight: 240, overflowY: "auto" }}>
                      {(!detail.events || detail.events.length === 0)
                        ? <div className="muted" style={{ fontSize: 12.5 }}>Aktivite yok.</div>
                        : detail.events.map((e, i) => {
                          const { meta, tail } = evtLine(e);
                          return <div key={i} className="row" style={{ gap: 8, padding: "5px 0", borderTop: i ? "1px solid var(--line-soft)" : 0, alignItems: "flex-start" }}><span style={{ color: meta.c }}>{meta.emo}</span><span className="muted" style={{ fontSize: 12.5, flex: 1 }}>{meta.t}{tail ? " — " + tail : ""}</span><span className="faint mono" style={{ fontSize: 10 }}>{timeAgo(e.ts)}</span></div>;
                        })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
