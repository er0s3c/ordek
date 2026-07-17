"use client";
import React, { useState } from "react";
import { MACHINES } from "@/lib/machines";
import CopyButton from "./CopyButton";

const LBL = { low: "Low", medium: "Medium", high: "High" };

// Ortak flag-submit — izole docker hedefinde flag panel origin'ine (localhost:3000) raporlanır.
function FlagSubmit({ slug, level, panelOrigin }) {
  const [val, setVal] = useState("");
  const [state, setState] = useState(null);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!val.trim()) return;
    setBusy(true); setState(null);
    try {
      const r = await fetch((panelOrigin || "") + "/api/flag", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ slug, level, flag: val.trim() }) });
      const d = await r.json();
      setState(d.ok ? { ok: true, flag: val.trim() } : { ok: false, msg: d.error || "Flag eşleşmedi." });
    } catch (e) { setState({ ok: false, msg: String(e.message || e) }); }
    setBusy(false);
  };
  return (
    <div className="panel" style={{ marginTop: 18 }}>
      <div className="panel-h"><span style={{ color: "var(--green)" }}>⚑ flag gönder</span></div>
      <div className="panel-b col" style={{ gap: 10 }}>
        <div className="muted" style={{ fontSize: 13 }}>Bu hedefte yakaladığın <code>ordek{"{...}"}</code> flag'ini doğrula — panel ilerlemene işlenir.</div>
        <div className="row" style={{ gap: 8 }}>
          <input className="input" style={{ flex: 1 }} placeholder="ordek{...}" value={val} onChange={(e) => { setVal(e.target.value); setState(null); }} onKeyDown={(e) => e.key === "Enter" && submit()} />
          <button className="kbtn primary" onClick={submit} disabled={busy}>{busy ? "…" : "Doğrula"}</button>
        </div>
        {state && (state.ok
          ? <>
              <div className="flag-banner"><span style={{ fontSize: 18 }}>⚑</span><div className="col" style={{ gap: 2, flex: 1 }}><span className="lbl">Doğru flag — çözüldü işaretlendi</span><span className="val">{LBL[level]}</span></div><CopyButton value={state.flag} compact title="flag'i kopyala" /></div>
              <div className="muted" style={{ fontSize: 12 }}>🎉 Tebrikler! Panelde bu makine açıksa (ve oto-kapanma açıksa) birazdan otomatik kapanacak.</div>
            </>
          : <div className="console" style={{ color: "var(--red-bright)" }}>{state.msg}</div>)}
      </div>
    </div>
  );
}

export default function MachineTarget({ slug, level, panelOrigin = "" }) {
  const spec = MACHINES[slug] || { name: slug, endpoint: { method: "GET", path: "/", kind: "query", sample: "" } };
  const ep = spec.endpoint;
  const [val, setVal] = useState(ep.sample || "");
  const [out, setOut] = useState(null);
  const [busy, setBusy] = useState(false);

  const send = async () => {
    setBusy(true); setOut(null);
    try {
      let url = ep.path, opts = { method: ep.method, headers: {} };
      if (ep.kind === "query") url = ep.path + (val ? "?" + val : "");
      else if (ep.kind === "path") url = val || ep.path;
      else if (ep.kind === "json") { opts.headers["content-type"] = "application/json"; opts.body = val; }
      else if (ep.kind === "raw") { opts.headers["content-type"] = "application/json"; opts.body = val; }
      const r = await fetch(url, opts);
      const txt = await r.text();
      setOut(`HTTP ${r.status}\n` + txt);
    } catch (e) { setOut("hata: " + String(e)); }
    setBusy(false);
  };

  return (
    <main style={{ maxWidth: 880, margin: "0 auto", padding: "28px 22px 60px" }}>
      <div className="row" style={{ gap: 12, marginBottom: 6 }}>
        <div className="brand-mark">ö</div>
        <div className="brand-name" style={{ fontSize: 18 }}><b>ördek</b> <span>// hedef makine</span></div>
        <span style={{ flex: 1 }} />
        <span className="tag" style={{ color: `var(--lvl-${level})`, borderColor: `var(--lvl-${level})` }}>{LBL[level]}</span>
      </div>
      <div className="page-h"><div className="eyebrow">// tryhackme-tarzı hedef</div><h1>{spec.name}</h1>
        <div className="sub">{spec.story}</div></div>

      <div className="grid2" style={{ gridTemplateColumns: "1.3fr 1fr", alignItems: "start" }}>
        <div className="panel">
          <div className="panel-h"><span style={{ color: `var(--lvl-${level})` }}>● {LBL[level]}</span><span>// canlı istek (gerçek backend)</span></div>
          <div className="panel-b">
            <div className="faint mono" style={{ fontSize: 12, marginBottom: 8 }}>{ep.method} {ep.path}</div>
            <div className="field"><label>{ep.kind === "json" || ep.kind === "raw" ? "Gövde (JSON)" : ep.kind === "path" ? "Yol" : "Sorgu (query)"}</label>
              {ep.kind === "json" || ep.kind === "raw"
                ? <textarea className="input" value={val} onChange={(e) => setVal(e.target.value)} />
                : <input className="input" value={val} onChange={(e) => setVal(e.target.value)} />}
            </div>
            <button className="kbtn primary" onClick={send} disabled={busy}>{busy ? "Gönderiliyor…" : "İsteği Gönder"}</button>
            {out !== null && <div className="console mt12">{out}</div>}
          </div>
        </div>
        <div className="col" style={{ gap: 16 }}>
          <div className="panel"><div className="panel-h">// görevler</div><div className="panel-b col" style={{ gap: 7 }}>
            {(spec.objectives || []).map((o, i) => <div key={i} className="row" style={{ gap: 8, fontSize: 13.5 }}><span style={{ color: "var(--green)" }}>▸</span><span className="muted">{o}</span></div>)}
          </div></div>
          <div className="panel"><div className="panel-h">// araçlarla saldır</div><div className="panel-b col" style={{ gap: 6 }}>
            <div className="muted" style={{ fontSize: 13 }}>Bu adresi kendi araçlarınla da hedefle:</div>
            <code style={{ background: "var(--bg-inset)", border: "1px solid var(--line)", borderRadius: 4, padding: "7px 10px", fontSize: 12, color: "var(--ink)", wordBreak: "break-all" }}>curl '{ep.path}{ep.kind === "query" && ep.sample ? "?" + ep.sample : ""}'</code>
          </div></div>
        </div>
      </div>
      <FlagSubmit slug={slug} level={level} panelOrigin={panelOrigin} />
      <p className="faint" style={{ fontSize: 12, marginTop: 22 }}>⚠ Kasıtlı zafiyetli izole hedef. Yalnızca eğitim. Seviye: <b>{LBL[level]}</b> (sabit, env ile).</p>
    </main>
  );
}
