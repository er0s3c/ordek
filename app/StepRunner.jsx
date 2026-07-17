"use client";
// ============================================================================
//  app/StepRunner.jsx — BANDIT-TARZI adım-adım soru/cevap UI'si (generic).
//  Öğrenci her doğru cevapla bir sonraki soruyu açar; SON soru = flag.
//  ⚠ Cevaplar SUNUCU-ONLY (lib/steps.js): burada yalnız /api/steps'in sterilize
//     (cevapsız) çıktısı kullanılır. Doğrulama POST /api/steps'te yapılır.
//  Kullanım: <StepRunner slug="tool-nmap" onComplete={() => markSolved(slug,"lab")} />
// ============================================================================
import React, { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "@/lib/toast";
import CopyButton from "./CopyButton";
import { rewriteCmd } from "@/lib/netinfo";

const celebrate = () => { if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("ordek-celebrate")); };

// target = { ip, portMap } → komutlardaki 10.13.37.10/target'ı GERÇEK adrese yaz.
//  cmd: tam (host + yayımlanan port). q/hint: yalnız host (metindeki "21/FTP" gibi
//  sayılar bozulmasın diye port remap UYGULANMAZ → boş portMap).
export default function StepRunner({ slug, level, onComplete, target = null }) {
  const ip = target && target.ip;
  const portMap = (target && target.portMap) || {};
  const fixCmd = (t) => (ip ? rewriteCmd(t, { ip, portMap }) : t);
  const fixText = (t) => (ip ? rewriteCmd(t, { ip, portMap: {} }) : t);
  return <StepRunnerInner {...{ slug, level, onComplete, fixCmd, fixText, hasTarget: !!ip, targetIp: ip }} />;
}

function StepRunnerInner({ slug, level, onComplete, fixCmd, fixText, hasTarget, targetIp }) {
  const [data, setData] = useState(null);   // { total, reached, done, questions }
  const [err, setErr] = useState(null);
  const [val, setVal] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);     // { ok, text }
  const celebrated = useRef(false);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/steps?slug=${encodeURIComponent(slug)}`);
      if (!r.ok) { setErr("steps-yok"); return; }
      const d = await r.json();
      setData(d);
      if (d.done && !celebrated.current) celebrated.current = true; // önceden çözülmüş: tekrar kutlama yok
    } catch { setErr("ağ hatası"); }
  }, [slug]);

  useEffect(() => { setData(null); setErr(null); setVal(""); setMsg(null); celebrated.current = false; load(); }, [load]);

  const current = data && !data.done ? (data.questions || []).find((q) => !q.solved) : null;

  const submit = async () => {
    if (!current || !val.trim()) return;
    setBusy(true); setMsg(null);
    try {
      const r = await fetch("/api/steps", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug, index: current.index, answer: val.trim(), level }),
      });
      const d = await r.json();
      if (d.ok) {
        setVal("");
        setMsg({ ok: true, text: d.done ? "Doğru! Tüm adımlar tamam — lab çözüldü." : "Doğru! Sıradaki adım açıldı." });
        if (d.done) {
          if (!celebrated.current) { celebrated.current = true; toast("⚑ Lab çözüldü!", "ok"); celebrate(); }
          onComplete && onComplete();
        } else {
          toast("✓ Doğru cevap", "ok");
        }
        await load();
      } else {
        setMsg({ ok: false, text: d.error || "Cevap yanlış." });
      }
    } catch (e) { setMsg({ ok: false, text: String(e.message || e) }); }
    setBusy(false);
  };

  if (err) return null; // adım seti yoksa hiçbir şey gösterme (panel klasik flag kutusuna döner)
  if (!data) return (
    <div className="panel"><div className="panel-b"><div className="shimmer" style={{ height: 12, width: "45%" }} /></div></div>
  );

  const total = data.total || 0;
  const reached = data.reached || 0;
  const pct = total ? Math.round((reached / total) * 100) : 0;

  return (
    <div className="panel">
      <div className="panel-h">
        <span style={{ color: "var(--green)" }}>🎯 adım adım görevler</span>
        <span style={{ flex: 1 }} />
        <span className="tag" style={{ color: data.done ? "var(--green-bright)" : "var(--amber)" }}>
          {data.done ? "tamamlandı ✓" : `görev ${Math.min(reached + 1, total)} / ${total}`}
        </span>
      </div>
      <div className="panel-b col" style={{ gap: 12 }}>
        {/* ilerleme çubuğu */}
        <div style={{ height: 7, borderRadius: 99, background: "var(--bg-inset)", border: "1px solid var(--line)", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: "var(--green)", transition: "width .35s ease" }} />
        </div>

        {/* çözülmüş sorular (kapalı, ✅) */}
        {(data.questions || []).filter((q) => q.solved).map((q) => (
          <div key={q.index} className="row" style={{ gap: 8, alignItems: "flex-start", opacity: 0.7, fontSize: 13 }}>
            <span style={{ color: "var(--green-bright)" }}>✓</span>
            <span className="muted" style={{ flex: 1, textDecoration: "line-through" }}>{fixText(q.q)}</span>
          </div>
        ))}

        {/* sıradaki soru */}
        {current && (
          <div className="col" style={{ gap: 10, borderTop: data.reached ? "1px solid var(--line)" : "none", paddingTop: data.reached ? 12 : 0 }}>
            <div className="row" style={{ gap: 8, alignItems: "flex-start" }}>
              <span className="mono" style={{ color: "var(--green)", fontWeight: 700 }}>{current.index + 1}.</span>
              <span style={{ flex: 1, fontSize: 14.5, lineHeight: 1.5, color: "var(--ink)" }}>
                {fixText(current.q)}
                {current.isFlag && <span className="tag" style={{ marginLeft: 8, color: "var(--green)" }}>⚑ flag</span>}
              </span>
            </div>

            {current.cmd && (
              <div className="col" style={{ gap: 3, paddingLeft: 22 }}>
                <div className="row" style={{ gap: 6, alignItems: "stretch" }}>
                  <code style={{ flex: 1, background: "var(--bg-inset)", border: "1px solid var(--line)", borderRadius: 4, padding: "7px 10px", fontSize: 12.5, color: "var(--ink)", wordBreak: "break-all" }}>{fixCmd(current.cmd)}</code>
                  <CopyButton value={fixCmd(current.cmd)} compact title="komutu kopyala" />
                </div>
                {hasTarget && <span className="faint" style={{ fontSize: 10.5 }}>komut hedef adresine ({targetIp}) ve yayımlanan porta göre otomatik düzeltildi</span>}
              </div>
            )}

            {current.hint && (
              <details style={{ marginLeft: 22, border: "1px solid var(--line)", borderRadius: 4, background: "var(--bg-2)" }}>
                <summary style={{ cursor: "pointer", padding: "6px 10px", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--ink-dim)" }}>İpucu</summary>
                <div className="muted" style={{ padding: "0 10px 9px", fontSize: 13, lineHeight: 1.5 }}>{fixText(current.hint)}</div>
              </details>
            )}

            <div className="row" style={{ gap: 8, paddingLeft: 22 }}>
              <input
                className="input" style={{ flex: 1 }}
                placeholder={current.isFlag ? "ordek{...}" : "cevabını yaz…"}
                value={val}
                onChange={(e) => { setVal(e.target.value); setMsg(null); }}
                onKeyDown={(e) => e.key === "Enter" && submit()}
              />
              <button className="kbtn primary" onClick={submit} disabled={busy}>{busy ? "…" : "Gönder"}</button>
            </div>
          </div>
        )}

        {/* bitti */}
        {data.done && (
          <div className="flag-banner"><span style={{ fontSize: 18 }}>⚑</span><div className="col" style={{ gap: 2, flex: 1 }}><span className="lbl">Tüm görevleri tamamladın — bu lab çözüldü.</span></div></div>
        )}

        {/* sonuç mesajı */}
        {msg && (
          <div className={msg.ok ? "console" : "console err"} style={{ marginLeft: 22, color: msg.ok ? "var(--green-bright)" : "var(--red-bright)" }}>{msg.text}</div>
        )}
      </div>
    </div>
  );
}
