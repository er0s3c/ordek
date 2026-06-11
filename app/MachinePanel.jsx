"use client";
import React, { useState, useEffect, useCallback } from "react";
import { MACHINES } from "@/lib/machines";

const LBL = { low: "Low", medium: "Medium", high: "High" };

export default function MachinePanel({ vuln, level }) {
  const spec = MACHINES[vuln.slug] || {};
  const [machine, setMachine] = useState(null);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState(null);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const r = await fetch("/api/machines");
      const d = await r.json();
      if (d.machines) {
        const m = d.machines.find((x) => x.slug === vuln.slug && x.level === level);
        setMachine(m || null);
        if (!m) setReady(false);
      } else if (d.error) setErr(d.error);
    } catch {}
  }, [vuln.slug, level]);

  useEffect(() => { setMachine(null); setReady(false); setErr(null); refresh(); }, [refresh]);

  // hazır mı? (boot ~30-60sn)
  useEffect(() => {
    if (!machine || !machine.url) return;
    let stop = false;
    const tick = async () => {
      try { await fetch(machine.url, { mode: "no-cors" }); if (!stop) setReady(true); }
      catch { if (!stop) setTimeout(tick, 3000); }
    };
    tick();
    return () => { stop = true; };
  }, [machine && machine.url]);

  const post = async (url, body) => {
    const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    return r.json();
  };
  const start = async () => {
    setBusy("start"); setErr(null); setReady(false);
    const d = await post("/api/machines", { slug: vuln.slug, level }).catch((e) => ({ error: String(e) }));
    if (d.error) setErr(d.error + (d.detail ? " — " + d.detail : "")); else setMachine(d);
    setBusy("");
  };
  const restart = async () => {
    if (!machine) return; setBusy("restart"); setErr(null); setReady(false);
    const d = await post(`/api/machines/${machine.id}`, { action: "restart", slug: vuln.slug, level }).catch((e) => ({ error: String(e) }));
    if (d.error) setErr(d.error); else setMachine(d);
    setBusy("");
  };
  const stop = async () => {
    if (!machine) return; setBusy("stop");
    await post(`/api/machines/${machine.id}`, { action: "stop" }).catch(() => {});
    setMachine(null); setReady(false); setBusy("");
  };

  return (
    <div className="col" style={{ gap: 16 }}>
      {/* TARGET MACHINE */}
      <div className="panel">
        <div className="panel-h">
          <span style={{ color: `var(--lvl-${level})` }}>● {LBL[level]}</span>
          <span>// hedef makine</span>
          <span style={{ flex: 1 }} />
          {machine && <span className="tag" style={{ color: ready ? "var(--green-bright)" : "var(--amber)", gap: 7 }}><span className={"dotstat " + (ready ? "run" : "boot")} />{ready ? "çalışıyor" : "başlatılıyor"}</span>}
        </div>
        <div className="panel-b">
          {!machine && (
            <div className="col" style={{ gap: 14, alignItems: "flex-start" }}>
              <div className="muted" style={{ fontSize: 14 }}>
                Bu zafiyete (<b style={{ color: `var(--lvl-${level})` }}>{LBL[level]}</b>) özel, izole bir hedef makine Docker üzerinde başlatılır.
                Seviyeyi değiştirmek için soldaki <b>Security Level</b>'ı kullan — her seviye ayrı makinedir.
              </div>
              <button className="kbtn primary" disabled={busy === "start"} onClick={start} style={{ fontSize: 15, padding: "11px 22px" }}>
                {busy === "start" ? "Başlatılıyor…" : "▸ Makineyi Başlat"}
              </button>
            </div>
          )}
          {machine && (
            <div className="col" style={{ gap: 12 }}>
              <div className="row between wrap" style={{ gap: 12 }}>
                <div className="col" style={{ gap: 4 }}>
                  <span className="faint mono" style={{ fontSize: 11 }}>HEDEF ADRESİ</span>
                  <a className="mono" style={{ fontSize: 17, fontWeight: 600 }} href={machine.url} target="_blank" rel="noreferrer">{machine.url}</a>
                </div>
                <div className="col" style={{ gap: 4, alignItems: "flex-end" }}>
                  <span className="faint mono" style={{ fontSize: 11 }}>PORT</span>
                  <span className="mono" style={{ fontSize: 17, color: "var(--green-bright)" }}>{machine.port}</span>
                </div>
              </div>
              {!ready && <div className="col" style={{ gap: 8 }}>
                <div className="shimmer" style={{ height: 14, width: "55%" }} />
                <div className="console"><span className="warn">makine açılıyor… (~30-60 sn, Next.js + DB seed)</span>
<span className="dim">hazır olunca adres tıklanabilir; sayfayı yenilemen gerekmez.</span></div>
              </div>}
              <div className="row wrap" style={{ gap: 8 }}>
                <a className="kbtn primary" href={machine.url} target="_blank" rel="noreferrer">↗ Makineyi Aç</a>
                <button className="kbtn" disabled={busy === "restart"} onClick={restart}>{busy === "restart" ? "Sıfırlanıyor…" : "⟳ Yeniden Başlat (deep-freeze)"}</button>
                <button className="kbtn danger" disabled={busy === "stop"} onClick={stop}>{busy === "stop" ? "Durduruluyor…" : "■ Durdur"}</button>
              </div>
              <div className="faint mono" style={{ fontSize: 11.5 }}>⚠ deep-freeze: yeniden başlatınca her şey sıfırlanır. Konteyner durdurulunca silinir.</div>
            </div>
          )}
          {err && <div className="console err mt12" style={{ color: "var(--red-bright)" }}>⚠ {err}</div>}
        </div>
      </div>

      {/* SENARYO */}
      <div className="panel">
        <div className="panel-h">// senaryo</div>
        <div className="panel-b col" style={{ gap: 12 }}>
          <div className="muted" style={{ fontSize: 14, lineHeight: 1.55 }}>{spec.story}</div>
          {spec.objectives && (
            <div className="col" style={{ gap: 6 }}>
              <span className="faint mono" style={{ fontSize: 11 }}>GÖREVLER</span>
              {spec.objectives.map((o, i) => (
                <div key={i} className="row" style={{ gap: 8, fontSize: 13.5 }}><span style={{ color: "var(--green)" }}>▸</span><span className="muted">{o}</span></div>
              ))}
            </div>
          )}
          {spec.endpoint && (
            <div className="col" style={{ gap: 4 }}>
              <span className="faint mono" style={{ fontSize: 11 }}>HEDEF ENDPOINT</span>
              <code style={{ background: "var(--bg-inset)", border: "1px solid var(--line)", borderRadius: 4, padding: "7px 10px", fontSize: 12.5, color: "var(--ink)" }}>
                {spec.endpoint.method} {spec.endpoint.path}{spec.endpoint.kind === "query" && spec.endpoint.sample ? "?" + spec.endpoint.sample : ""}
              </code>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
