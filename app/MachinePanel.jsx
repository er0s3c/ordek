"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { MACHINES } from "@/lib/machines";
import { toast } from "@/lib/toast";
import CopyButton from "./CopyButton";
import StepRunner from "./StepRunner";

const LBL = { low: "Low", medium: "Medium", high: "High" };

export default function MachinePanel({ vuln, level, solved = [], autoClose = true, addNote }) {
  const spec = MACHINES[vuln.slug] || {};
  const [machine, setMachine] = useState(null);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState(null);
  const [ready, setReady] = useState(false);
  const [closing, setClosing] = useState(null); // { sec } — flag bulununca oto-kapanma geri sayımı
  const closeTimer = useRef(null);
  const notifiedReady = useRef(false);

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

  // hazır mı? (boot ~10-40sn) — panel iç ağdan sunucu-taraflı yoklar
  useEffect(() => {
    if (!machine || !machine.token) return;
    let stop = false;
    const tick = async () => {
      try {
        const r = await fetch(`/api/machines/ready?token=${encodeURIComponent(machine.token)}`);
        const d = await r.json();
        if (stop) return;
        if (d.ready) {
          setReady(true);
          if (!notifiedReady.current) {
            notifiedReady.current = true;
            toast(`✅ ${spec.name || vuln.name} hazır`, "ok");
            if (addNote) addNote({ type: "machine", title: "Makine hazır", text: `${spec.name || vuln.name} (${LBL[level] || level}) açıldı — sömürmeye başla.` });
          }
        } else setTimeout(tick, 3000);
      } catch { if (!stop) setTimeout(tick, 3000); }
    };
    tick();
    return () => { stop = true; };
  }, [machine && machine.token]);

  const post = async (url, body) => {
    const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    return r.json();
  };
  const start = async () => {
    setBusy("start"); setErr(null); setReady(false); notifiedReady.current = false;
    const d = await post("/api/machines", { slug: vuln.slug, level }).catch((e) => ({ error: String(e) }));
    if (d.error) { setErr(d.message || (d.error + (d.detail ? " — " + d.detail : ""))); toast(d.message || "Makine başlatılamadı", d.error === "full" ? "warn" : "err"); }
    else { setMachine(d); toast("✓ Makine başlatıldı — açılıyor…", "ok"); }
    setBusy("");
  };
  const restart = async () => {
    if (!machine) return; setBusy("restart"); setErr(null); setReady(false); notifiedReady.current = false;
    const d = await post(`/api/machines/${machine.id}`, { action: "restart", slug: vuln.slug, level }).catch((e) => ({ error: String(e) }));
    if (d.error) { setErr(d.error); toast("Sıfırlanamadı", "err"); } else { setMachine(d); toast("⟳ Makine sıfırlandı (deep-freeze)", "ok"); }
    setBusy("");
  };
  const stop = async () => {
    if (!machine) return; setBusy("stop");
    if (closeTimer.current) { clearInterval(closeTimer.current); closeTimer.current = null; } setClosing(null);
    await post(`/api/machines/${machine.id}`, { action: "stop" }).catch(() => {});
    setMachine(null); setReady(false); setBusy(""); toast("■ Makine durduruldu", "warn");
  };
  const keepalive = () => { if (!machine || !machine.token) return; post("/api/machines/keepalive", { token: machine.token }).then(() => toast("⏱ Süre yenilendi (idle sayacı sıfırlandı)", "ok")).catch(() => {}); };
  const cancelAutoClose = () => { if (closeTimer.current) { clearInterval(closeTimer.current); closeTimer.current = null; } setClosing(null); toast("Oto-kapanma iptal edildi", "ok"); };

  // Araç (Burp/curl) adresi: ayrı kapı (proxy) — token-yeteneği ile çerez alınır.
  const PROXY_PORT = 3001;
  const toolBase = typeof window !== "undefined" ? `${window.location.protocol}//${window.location.hostname}:${PROXY_PORT}` : "";
  const toolUrl = machine && machine.token ? `${toolBase}/__open/${machine.token}` : "";

  // Flag çözülünce (solved bu seviyeyi içerince) çalışan makineyi uyararak oto-kapat.
  useEffect(() => {
    if (!autoClose || !machine || !solved.includes(level) || closing || closeTimer.current) return;
    let sec = 10;
    setClosing({ sec });
    if (addNote) addNote({ type: "machine", title: "Makine otomatik kapanıyor", text: `${spec.name || vuln.name} (${LBL[level] || level}) — flag bulundu, ~10 sn içinde durduruluyor.` });
    const mid = machine.id;
    closeTimer.current = setInterval(async () => {
      sec -= 1;
      if (sec <= 0) {
        clearInterval(closeTimer.current); closeTimer.current = null;
        try { await post(`/api/machines/${mid}`, { action: "stop" }); } catch {}
        setMachine(null); setReady(false); setClosing(null);
        toast("■ Makine otomatik kapatıldı (flag bulundu)", "warn");
      } else setClosing({ sec });
    }, 1000);
  }, [solved, level, machine, autoClose]);

  // Panel açıkken makineyi canlı tut (idle reaper'a yem olmasın) — 5 dk'da bir.
  useEffect(() => {
    if (!machine || !machine.token) return;
    const t = setInterval(() => { fetch("/api/machines/keepalive", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token: machine.token }) }).catch(() => {}); }, 300000);
    return () => clearInterval(t);
  }, [machine && machine.token]);

  useEffect(() => () => { if (closeTimer.current) clearInterval(closeTimer.current); }, []);

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
              <div className="callout" style={{ borderLeftColor: ready ? "var(--green)" : "var(--amber)" }}>
                <span className="ci" style={{ color: ready ? "var(--green)" : "var(--amber)" }}>{ready ? "✓" : "⏳"}</span>
                <span>{ready
                  ? <>Makinen hazır — <b>↗ Makineyi Aç</b> ile yeni sekmede sömürmeye başla. Bu makine yalnız sana açık (kimlik-doğrulamalı kapı).</>
                  : <>Makine açılıyor… (~10-40 sn). Hazır olunca <b>Aç</b> aktifleşir; sayfayı yenilemen gerekmez.</>}</span>
              </div>
              {!ready && <div className="shimmer" style={{ height: 12, width: "55%" }} />}
              {closing && (
                <div className="callout" style={{ borderLeftColor: "var(--amber)" }}>
                  <span className="ci" style={{ color: "var(--amber)" }}>⏳</span>
                  <span style={{ flex: 1 }}>🎉 Flag bulundu! Bu makine <b>{closing.sec}sn</b> içinde otomatik kapanıyor…</span>
                  <button className="kbtn sm" onClick={cancelAutoClose}>İptal</button>
                </div>
              )}
              {machine.status && <div className="faint mono" style={{ fontSize: 11 }}>⏱ çalışma süresi: {machine.status}</div>}
              <div className="row wrap" style={{ gap: 8 }}>
                <a className="kbtn primary" href={machine.url} target="_blank" rel="noreferrer"
                   style={ready ? {} : { opacity: 0.55 }} title={ready ? "" : "henüz açılıyor"}>↗ Makineyi Aç</a>
                <button className="kbtn" onClick={keepalive} title="canlı tut — idle oto-kapanma sayacını sıfırla">⏱ Canlı Tut</button>
                <button className="kbtn" disabled={busy === "restart"} onClick={restart}>{busy === "restart" ? "Sıfırlanıyor…" : "⟳ Yeniden Başlat (deep-freeze)"}</button>
                <button className="kbtn danger" disabled={busy === "stop"} onClick={stop}>{busy === "stop" ? "Durduruluyor…" : "■ Durdur"}</button>
              </div>
              {toolUrl && (
                <div className="col" style={{ gap: 4 }}>
                  <span className="faint mono" style={{ fontSize: 11 }}>ARAÇ ADRESİ (Burp / curl / sqlmap)</span>
                  <div className="row" style={{ gap: 6, alignItems: "stretch" }}>
                    <code style={{ flex: 1, background: "var(--bg-inset)", border: "1px solid var(--line)", borderRadius: 4, padding: "7px 10px", fontSize: 12, color: "var(--ink)", wordBreak: "break-all" }}>{toolUrl}</code>
                    <CopyButton value={toolUrl} compact title="araç adresini kopyala" />
                  </div>
                  <span className="faint mono" style={{ fontSize: 10.5 }}>Bu adresi araçta bir kez ziyaret et (çerez alır), sonra <b>{toolBase}/…</b> yollarını hedefle. Çerezsiz erişim engellidir.</span>
                </div>
              )}
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
              <div className="row" style={{ gap: 6, alignItems: "stretch" }}>
                <code style={{ flex: 1, background: "var(--bg-inset)", border: "1px solid var(--line)", borderRadius: 4, padding: "7px 10px", fontSize: 12.5, color: "var(--ink)", wordBreak: "break-all" }}>
                  {spec.endpoint.method} {spec.endpoint.path}{spec.endpoint.kind === "query" && spec.endpoint.sample ? "?" + spec.endpoint.sample : ""}
                </code>
                <CopyButton value={`${spec.endpoint.method} ${spec.endpoint.path}${spec.endpoint.kind === "query" && spec.endpoint.sample ? "?" + spec.endpoint.sample : ""}`} compact title="endpoint'i kopyala" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* BANDIT-TARZI ADIM ADIM GÖREVLER — adım seti olan zafiyetlerde görünür
          (yoksa StepRunner /api/steps 404'te kendini gizler). Hedef sayfasındaki
          klasik flag gönderimine EK bir rehberli akıştır. */}
      <StepRunner
        slug={vuln.slug}
        level={level}
        onComplete={() => { if (addNote) addNote({ type: "machine", title: "Lab çözüldü", text: `${spec.name || vuln.name} (${LBL[level] || level}) — adım adım görevler tamamlandı, flag doğrulandı.` }); }}
      />
    </div>
  );
}
