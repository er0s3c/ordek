"use client";
import React, { useState as uS, useEffect as uE, useMemo, useRef } from "react";
import { GROUPS, VULNS, KILLCHAINS } from "./labData";
import { CATEGORY_INTRO, LEARN } from "./academyData";
import MachinePanel from "./MachinePanel";
import { MACHINES, MACHINE_SLUGS } from "@/lib/machines";
/* ===========================================================
   ördek // Vulnerable Lab — Uygulama kabuğu + görünümler
   Model: yalnızca GERÇEK hedef makineler. In-app demo YOK.
   =========================================================== */

const LS_SOLVED = "ördek_solved_v1";
const LS_LEVEL = "ördek_level_v1";
const LS_AUTH = "ördek_auth_v1";
const LS_WELCOME = "ördek_welcome_v1";

const loadJSON = (k, d) => { if (typeof window === "undefined") return d; try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const LEVEL_LABEL = { low: "Low", medium: "Medium", high: "High" };

// Sunucu ilerlemesini yereldekiyle birleştir (slug başına seviye kümeleri tekilleştirilir).
const mergeSolved = (a, b) => {
  const out = { ...(a || {}) };
  for (const k of Object.keys(b || {})) out[k] = [...new Set([...(out[k] || []), ...(b[k] || [])])];
  return out;
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

/* ═══════════════════════════════ APP ═══════════════════════════════ */
function App() {
  const [mounted, setMounted] = uS(false);
  const [session, setSession] = uS(null); // { mode, needsSetup, user }
  const [auth, setAuth] = uS(false);       // bireysel mod yerel kapısı
  const [view, setView] = uS("dashboard"); // dashboard | vuln | level | flags | submit | machines
  const [vulnId, setVulnId] = uS(VULNS[0].id);
  const [level, setLevel] = uS("low");
  const [solved, setSolved] = uS({}); // {slug: [levels]}

  // Mod + oturum durumu (sunucudan). Bireysel modda user=null, kapı yerel.
  const loadSession = () => fetch("/api/auth/session").then(r => r.json())
    .then(s => setSession(s && s.mode ? s : { mode: "individual", needsSetup: false, user: null }))
    .catch(() => setSession({ mode: "individual", needsSetup: false, user: null }));

  uE(() => {
    setAuth(loadJSON(LS_AUTH, false));
    const lvl = loadJSON(LS_LEVEL, "low");
    setLevel(lvl);
    setLevelCookie(lvl);
    setSolved(loadJSON(LS_SOLVED, {}));
    if (!loadJSON(LS_WELCOME, false)) setView("welcome"); // ilk girişte karşılama
    loadSession().finally(() => setMounted(true));
  }, []);
  // Sunucu-taraflı ilerlemeyi çek ve yereldekiyle birleştir (sekmeler/konteynerler arası kalıcılık).
  uE(() => {
    fetch("/api/progress").then(r => r.json()).then(d => { if (d && d.solved) setSolved(prev => mergeSolved(prev, d.solved)); }).catch(() => {});
  }, []);
  uE(() => { if (mounted) { localStorage.setItem(LS_LEVEL, JSON.stringify(level)); setLevelCookie(level); } }, [level, mounted]);
  uE(() => { if (mounted) localStorage.setItem(LS_SOLVED, JSON.stringify(solved)); }, [solved, mounted]);
  uE(() => { if (mounted) localStorage.setItem(LS_AUTH, JSON.stringify(auth)); }, [auth, mounted]);

  const vuln = useMemo(() => VULNS.find(v => v.id === vulnId), [vulnId]);
  const totalFlags = VULNS.length * 3;
  const gotFlags = Object.values(solved).reduce((a, ls) => a + ls.length, 0);

  const markSolved = (slug, lvl) => setSolved(prev => {
    const cur = prev[slug] || [];
    if (cur.includes(lvl)) return prev;
    return { ...prev, [slug]: [...cur, lvl] };
  });
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

  const openVuln = (id) => { setVulnId(id); setView("vuln"); };
  const dismissWelcome = () => { if (typeof window !== "undefined") localStorage.setItem(LS_WELCOME, JSON.stringify(true)); setView("dashboard"); };
  const crumb = view === "welcome" ? "Karşılama"
    : view === "onboarding" ? "Başlarken"
    : view === "dashboard" ? "Zafiyet Dizini"
    : view === "academy" ? "Öğren / Akademi"
    : view === "level" ? "Security Level"
    : view === "flags" ? "Rozetler & İlerleme"
    : view === "submit" ? "Flag Gönder (Hub)"
    : view === "machines" ? "Docker Makineleri"
    : view === "teacher" ? (isClass && role === "teacher" ? "Öğretmen Paneli" : "İlerleme Özeti")
    : vuln.name;

  return (
    <div className="app">
      <div className="brand">
        <img src="/ordek.png" alt="logo" style={{ width: 34, height: 34, borderRadius: 4, border: "1px solid var(--green-deep)", objectFit: "cover" }} />
        <div className="brand-name"><b>ördek</b> <span>// vuln-lab</span></div>
      </div>

      <div className="header">
        <div className="crumb">~/ <b>{crumb}</b></div>
        <div className="spacer" />
        <div className="pill">level: <b style={{ color: `var(--lvl-${level})` }}>{LEVEL_LABEL[level]}</b></div>
        <div className="pill">flags: <b>{gotFlags}</b>/{totalFlags}</div>
        {isClass && me && <div className="pill">{role === "teacher" ? "👩‍🏫" : "🎓"} <b>{me.displayName || me.username}</b>{me.className ? <span className="faint"> · {me.className}</span> : null}</div>}
        <button className="kbtn ghost" style={{ padding: "6px 12px", fontSize: 13 }} onClick={logout}>çıkış</button>
      </div>

      <Sidebar view={view} setView={setView} vulnId={vulnId} openVuln={openVuln} solved={solved} showTeacher={showTeacher} role={role} />

      <div className="main">
        <div className="main-wrap">
          <div className="view-anim" key={view}>
            {view === "welcome" && <Welcome setView={setView} openVuln={openVuln} onDone={dismissWelcome} />}
            {view === "onboarding" && <Onboarding />}
            {view === "dashboard" && <Dashboard openVuln={openVuln} solved={solved} setView={setView} level={level} />}
            {view === "academy" && <Academy openVuln={openVuln} solved={solved} />}
            {view === "vuln" && <VulnDetail vuln={vuln} level={level} setLevel={setLevel} solved={solved} markSolved={markSolved} openVuln={openVuln} />}
            {view === "level" && <LevelView level={level} setLevel={setLevel} />}
            {view === "flags" && <FlagsView solved={solved} openVuln={openVuln} gotFlags={gotFlags} totalFlags={totalFlags} onReset={resetProgress} />}
            {view === "submit" && <FlagHub level={level} markSolved={markSolved} openVuln={openVuln} />}
            {view === "machines" && <MachineManager />}
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
          <div className="row" style={{ gap: 12, marginBottom: 22, justifyContent: "center" }}>
            <img src="/ordek.png" alt="logo" style={{ width: 40, height: 40, borderRadius: 4, border: "1px solid var(--green-deep)", objectFit: "cover", boxShadow: "0 0 12px rgba(143,207,63,.25)", animation: "floaty 5s var(--ease) infinite" }} />
            <div>
              <div className="brand-name" style={{ fontSize: 22 }}><b>ördek</b></div>
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
function Sidebar({ view, setView, vulnId, openVuln, solved, showTeacher = true, role }) {
  const solvedCount = Object.values(solved).reduce((a, ls) => a + ls.length, 0);
  const teacherLabel = role === "teacher" ? "Öğretmen Paneli" : "İlerleme Özeti";
  return (
    <div className="sidebar">
      {[
        { h: "Başla", items: [["welcome", "Karşılama", ICONS.home], ["onboarding", "Başlarken", ICONS.rocket], ["dashboard", "Zafiyet Dizini", ICONS.grid]] },
        { h: "Öğren", items: [["academy", "Öğren / Akademi", ICONS.book]] },
        { h: "Pratik", items: [["level", "Security Level", ICONS.level], ["machines", "Docker Makineleri", ICONS.server], ["submit", "Flag Gönder (Hub)", ICONS.send]] },
        { h: "İlerleme", items: [["flags", "Rozetler & İlerleme", ICONS.award], ...(showTeacher ? [["teacher", teacherLabel, ICONS.users]] : [])] },
      ].map(sec => (
        <div className="nav-sec" key={sec.h}>
          <div className="nav-sec-h">{sec.h}</div>
          {sec.items.map(([v, label, icon]) => (
            <button key={v} className={`nav-item ${view === v ? "active" : ""}`} onClick={() => setView(v)}>
              <span className="ic"><Ic d={icon} /></span> {label}
              {v === "flags" && solvedCount > 0 && <span className="badge-n">{solvedCount}</span>}
            </button>
          ))}
        </div>
      ))}
      {GROUPS.map(g => (
        <div className="nav-group" key={g.id}>
          <div className="nav-group-h"><span style={{ color: "inherit" }}>{g.label}</span><span>{g.sub}</span></div>
          {VULNS.filter(v => v.group === g.id).map(v => {
            const done = (solved[v.slug] || []).length;
            return (
              <button key={v.id} className={`nav-vuln ${view === "vuln" && vulnId === v.id ? "active" : ""} ${done ? "solved" : ""}`} onClick={() => openVuln(v.id)}>
                <span className="dot" />
                <span className="nm">{v.name}</span>
                {done > 0 && <span className="num" style={{ color: "var(--green)" }}>{done}/3</span>}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════ DASHBOARD ═══════════════════════════════ */
function Dashboard({ openVuln, solved, setView, level }) {
  return (
    <div>
      <div className="page-h">
        <div className="eyebrow">// vulnerable lab</div>
        <h1>Zafiyet Dizini</h1>
        <div className="sub">{VULNS.length} zafiyet · her biri <b className="muted">Low / Medium / High</b> seviyelerinde sömürülebilir. Bir zafiyet seç, izole Docker hedefini başlat, flag'i yakala.</div>
      </div>

      <div className="panel" style={{ marginBottom: 22 }}>
        <div className="panel-b row between wrap" style={{ gap: 16 }}>
          <div className="row" style={{ gap: 22 }}>
            <Stat n={VULNS.length} l="zafiyet" />
            <Stat n={VULNS.length * 3} l="toplam flag" />
            <Stat n={KILLCHAINS.length} l="kill-chain" />
          </div>
          <div className="row" style={{ gap: 10 }}>
            <span className="muted">Aktif seviye:</span>
            <span className="tag" style={{ color: `var(--lvl-${level})`, borderColor: `var(--lvl-${level})` }}>{LEVEL_LABEL[level]}</span>
            <button className="kbtn ghost" onClick={() => setView("level")}>değiştir</button>
          </div>
        </div>
      </div>

      {GROUPS.map(g => (
        <div key={g.id} style={{ marginBottom: 26 }}>
          <div className="row between" style={{ marginBottom: 12 }}>
            <h2 style={{ fontSize: 16, margin: 0, fontFamily: "var(--font-mono)", letterSpacing: 0.3 }}>{g.label}</h2>
            <span className="tag">{g.sub}</span>
          </div>
          <div className="grid3 stagger">
            {VULNS.filter(v => v.group === g.id).map(v => {
              const done = (solved[v.slug] || []);
              return (
                <button key={v.id} className="panel lift" style={{ textAlign: "left", cursor: "pointer", padding: 0, border: "1px solid var(--line)" }} onClick={() => openVuln(v.id)}>
                  <div className="panel-b">
                    <div className="row between" style={{ marginBottom: 8 }}>
                      <span className="ic" style={{ color: "var(--green)" }}><Ic d={ICONS.bug} /></span>
                      {done.length === 3 ? <span className="tag solved">✓ tam</span> : done.length > 0 ? <span className="tag" style={{ color: "var(--green)" }}>{done.length}/3</span> : <span className="tag">açık</span>}
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{v.name}</div>
                    <div className="muted" style={{ fontSize: 13, lineHeight: 1.45, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{v.scenario}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
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
function VulnDetail({ vuln, level, setLevel, solved, markSolved, openVuln }) {
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
            ? <MachinePanel key={vuln.slug + level} vuln={vuln} level={level} />
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
      if (d.ok) { setState({ ok: true, msg: "Doğru flag — çözüldü olarak işaretlendi." }); onSolved(); }
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
            ? <div className="flag-banner"><span style={{ fontSize: 18 }}>⚑</span><div className="col" style={{ gap: 2 }}><span className="lbl">{state.msg}</span><span className="val">{LEVEL_LABEL[level]}</span></div></div>
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
function FlagsView({ solved, openVuln, gotFlags, totalFlags, onReset }) {
  const pct = totalFlags ? Math.round((gotFlags / totalFlags) * 100) : 0;
  const C = 2 * Math.PI * 42; // ring çevresi
  const has = (s) => (solved[s] || []).length > 0;
  const groupSlugs = (g) => VULNS.filter(v => v.group === g).map(v => v.slug);
  const allSolved = (arr) => arr.length > 0 && arr.every(has);
  const levelCount = (lv) => Object.values(solved).filter(ls => ls.includes(lv)).length;
  const chainDone = KILLCHAINS.some(kc => kc.steps.every(has));
  const badges = [
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
  const earned = badges.filter(b => b.on).length;
  return (
    <div>
      <div className="page-h">
        <div className="eyebrow">// rozetler & ilerleme</div>
        <h1>Rozetler & İlerleme</h1>
        <div className="sub">Yakaladığın flag'ler, kazandığın rozetler ve zafiyetleri zincirleyen saldırı senaryoları — hepsi bir bakışta.</div>
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
function FlagHub({ level, markSolved, openVuln }) {
  const [val, setVal] = uS("");
  const [state, setState] = uS(null);
  const [busy, setBusy] = uS(false);
  const submit = async () => {
    if (!val.trim()) return;
    setBusy(true); setState(null);
    try {
      const r = await fetch("/api/flag/detect", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ flag: val.trim(), level }) });
      const d = await r.json();
      if (d.ok) { markSolved(d.slug, d.level || level); setState({ ok: true, name: d.name, slug: d.slug }); }
      else setState({ ok: false, msg: d.error || "Bu flag hiçbir zafiyetle eşleşmedi." });
    } catch (e) { setState({ ok: false, msg: String(e.message || e) }); }
    setBusy(false);
  };
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
          ? <div className="flag-banner"><span style={{ fontSize: 18 }}>⚑</span><div className="col" style={{ gap: 2 }}><span className="lbl">Eşleşti: {state.name}</span><span className="val">{LEVEL_LABEL[level]} · çözüldü işaretlendi</span></div></div>
          : <div className="console" style={{ color: "var(--red-bright)" }}>{state.msg}</div>)}
        {state && state.ok && (() => { const v = VULNS.find(x => x.slug === state.slug); return v ? <button className="kbtn ghost" style={{ alignSelf: "flex-start" }} onClick={() => openVuln(v.id)}>→ {v.name} zafiyetine git</button> : null; })()}
      </div></div>
    </div>
  );
}

/* ═══════════════════════════════ MACHINE MANAGER (docker) ═══════════════════════════════ */
function MachineManager() {
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
    machines.forEach(m => { if (m.url && !ready[m.id]) fetch(m.url, { mode: "no-cors" }).then(() => { if (!stop) setReady(p => ({ ...p, [m.id]: true })); }).catch(() => {}); });
    return () => { stop = true; };
  }, [machines]);
  const post = (url, body) => fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).then(r => r.json());
  const stop = async (id) => { setBusy(id); await post(`/api/machines/${id}`, { action: "stop" }).catch(() => {}); await refresh(); setBusy(""); };
  const restart = async (m) => { setBusy(m.id); setReady(p => ({ ...p, [m.id]: false })); await post(`/api/machines/${m.id}`, { action: "restart", slug: m.slug, level: m.level }).catch(() => {}); await refresh(); setBusy(""); };
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
                <span className="faint mono" style={{ fontSize: 11 }}>{m.slug} · <span style={{ color: `var(--lvl-${m.level})` }}>{LEVEL_LABEL[m.level] || m.level}</span> · port :{m.port}</span>
              </div>
              <div className="row" style={{ gap: 8, alignItems: "center" }}>
                <span className="tag" style={{ color: ready[m.id] ? "var(--green-bright)" : "var(--amber)", gap: 7 }}><span className={"dotstat " + (ready[m.id] ? "run" : "boot")} />{ready[m.id] ? "çalışıyor" : "başlatılıyor"}</span>
                <a className="kbtn primary" href={m.url} target="_blank" rel="noreferrer">↗ Aç</a>
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

/* ═══════════════════════════════ ÖĞREN / AKADEMİ ═══════════════════════════════ */
function Academy({ openVuln, solved }) {
  return (
    <div>
      <div className="page-h">
        <div className="eyebrow">// öğren</div>
        <h1>Öğren / Akademi</h1>
        <div className="sub">Her zafiyetin teorisi — nedir, neden tehlikeli, <b className="muted">günlük hayatta nerede karşılaşırsın</b>, gerçek dünya olayı ve nasıl korunulur. Önce burada anla, sonra "Pratiğe geç" ile uygula.</div>
      </div>
      {GROUPS.map(g => (
        <div key={g.id} style={{ marginBottom: 26 }}>
          <div className="row between" style={{ marginBottom: 8 }}>
            <h2 style={{ fontSize: 16, margin: 0, fontFamily: "var(--font-mono)" }}>{g.label}</h2>
            <span className="tag">{g.sub}</span>
          </div>
          <div className="callout" style={{ marginBottom: 12 }}><span className="ci">ℹ</span><span>{CATEGORY_INTRO[g.id]}</span></div>
          <div className="col" style={{ gap: 10 }}>
            {VULNS.filter(v => v.group === g.id).map(v => {
              const L = LEARN[v.slug] || {};
              const done = (solved[v.slug] || []).length;
              return (
                <details key={v.id} className="panel lrn">
                  <summary style={{ padding: "13px 16px", display: "flex", alignItems: "center", gap: 10 }}>
                    <span className="ic" style={{ color: "var(--green)", display: "flex" }}><Ic d={ICONS.bug} /></span>
                    <span style={{ fontWeight: 600, flex: 1 }}>{v.name}</span>
                    {done > 0 && <span className="tag solved">{done}/3 ✓</span>}
                    <span className="pm mono" style={{ fontSize: 17 }} />
                  </summary>
                  <div className="panel-b">
                    {L.what && <div className="learn-sec"><div className="lk">Nedir?</div><p>{L.what}</p></div>}
                    {L.why && <div className="learn-sec"><div className="lk">Neden tehlikeli?</div><p>{L.why}</p></div>}
                    {L.daily && (
                      <div className="learn-sec">
                        <div className="lk">Günlük hayatta nerede karşılaşırsın?</div>
                        <p>{L.daily}</p>
                        {Array.isArray(L.examples) && L.examples.length > 0 && (
                          <div className="col" style={{ gap: 6, marginTop: 6 }}>
                            {L.examples.map((ex, i) => (
                              <div key={i} className="row" style={{ gap: 8, alignItems: "flex-start", fontSize: 13.5 }}>
                                <span style={{ color: "var(--green)" }}>•</span><span className="muted">{ex}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    {L.real && <div className="learn-sec"><div className="lk">Gerçek dünya olayı</div><p>{L.real}</p></div>}
                    {L.defense && <div className="learn-sec"><div className="lk">Nasıl korunulur?</div><p>{L.defense}</p></div>}
                    <div className="learn-sec">
                      <div className="lk">Seviye davranışı</div>
                      {["low", "medium", "high"].map(lv => (
                        <div key={lv} className="row" style={{ gap: 8, alignItems: "flex-start", marginTop: 5 }}>
                          <span className="tag" style={{ color: `var(--lvl-${lv})`, borderColor: `var(--lvl-${lv})`, background: "transparent", flex: "none" }}>{LEVEL_LABEL[lv]}</span>
                          <span className="muted" style={{ fontSize: 13.5, lineHeight: 1.5 }}>{v.levels[lv]}</span>
                        </div>
                      ))}
                    </div>
                    <button className="kbtn primary mt12" onClick={() => openVuln(v.id)}>→ Pratiğe geç</button>
                  </div>
                </details>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
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
    <div className="row" style={{ gap: 12, marginBottom: 22, justifyContent: "center" }}>
      <img src="/ordek.png" alt="logo" style={{ width: 40, height: 40, borderRadius: 4, border: "1px solid var(--green-deep)", objectFit: "cover", boxShadow: "0 0 12px rgba(143,207,63,.25)" }} />
      <div>
        <div className="brand-name" style={{ fontSize: 22 }}><b>ördek</b></div>
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
  const [sel, setSel] = uS(null);     // seçili öğrenci id
  const [detail, setDetail] = uS(null);
  const [copied, setCopied] = uS("");
  const TOTAL = VULNS.length * 3;

  const loadOverview = async () => {
    try {
      const r = await fetch("/api/teacher/overview"); const d = await r.json();
      if (d.error) { setErr(d.error); return; }
      setErr(d.dockerError ? "Docker: " + d.dockerError : null);
      setData(d);
    } catch (e) { setErr(String(e.message || e)); }
  };
  const loadFeed = async () => {
    try {
      const q = filterClass ? `?classId=${encodeURIComponent(filterClass)}&limit=60` : "?limit=60";
      const r = await fetch("/api/teacher/events" + q); const d = await r.json();
      if (d.events) setFeed(d.events);
    } catch {}
  };
  uE(() => { loadOverview(); loadFeed(); const t = setInterval(() => { loadOverview(); loadFeed(); }, 5000); return () => clearInterval(t); }, [filterClass]);
  uE(() => { if (sel) loadDetail(sel); }, [sel]);
  // seçili öğrenci detayını periyodik tazele
  uE(() => { if (!sel) return; const t = setInterval(() => loadDetail(sel), 5000); return () => clearInterval(t); }, [sel]);

  const loadDetail = async (id) => {
    try { const r = await fetch(`/api/teacher/student/${id}`); const d = await r.json(); if (!d.error) setDetail(d); } catch {}
  };
  const post = (url, body) => fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).then(r => r.json());
  const createClass = async () => { if (!newClass.trim()) return; await post("/api/teacher/class", { action: "create", name: newClass.trim() }); setNewClass(""); loadOverview(); };
  const classAction = async (action, id, extra = {}) => {
    if (action === "delete" && typeof window !== "undefined" && !window.confirm("Sınıf silinsin mi? Öğrenciler sınıfsız kalır.")) return;
    await post("/api/teacher/class", { action, id, ...extra }); loadOverview();
  };
  const resetStudent = async (id) => { if (typeof window !== "undefined" && !window.confirm("Bu öğrencinin ilerlemesi sıfırlansın mı?")) return; await post("/api/teacher/reset", { studentId: id }); loadOverview(); if (sel === id) loadDetail(id); };
  const copyCode = (code) => { try { navigator.clipboard.writeText(code); setCopied(code); setTimeout(() => setCopied(""), 1500); } catch {} };

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

      <div className="grid2" style={{ gridTemplateColumns: "1.5fr 1fr", alignItems: "start" }}>
        <div className="col" style={{ gap: 16 }}>
          {/* sınıf yönetimi */}
          <div className="panel">
            <div className="panel-h">// sınıflarım</div>
            <div className="panel-b col" style={{ gap: 12 }}>
              <div className="row" style={{ gap: 8 }}>
                <input className="input" style={{ flex: 1 }} placeholder="Yeni sınıf adı (ör. 11-A Siber)" value={newClass} onChange={e => setNewClass(e.target.value)} onKeyDown={e => e.key === "Enter" && createClass()} />
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
          <div className="panel-b">
            {!detail ? <div className="muted" style={{ fontSize: 13 }}>Yükleniyor…</div> : (
              <div className="grid2" style={{ gridTemplateColumns: "1.1fr 1fr", alignItems: "start", gap: 16 }}>
                {/* matris */}
                <div className="col" style={{ gap: 12 }}>
                  <div>
                    <div className="faint mono" style={{ fontSize: 11, marginBottom: 6 }}>ZAFİYET × SEVİYE MATRİSİ</div>
                    <div style={{ overflowX: "auto" }}><StudentMatrix solved={detail.solved} /></div>
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
