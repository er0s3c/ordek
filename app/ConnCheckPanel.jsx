"use client";
// ============================================================================
//  app/ConnCheckPanel.jsx — "Kali VM laba erişebiliyor mu?" bağlantı testi.
//  Akış: hedef başlat (bridge) → öğrenci KENDİ Kali'sinden host IP:port/token'ı
//  curl'ler → token'ı yapıştırır → /api/conncheck doğrular (HMAC, sunucu-only).
//  Yalnız Kali modülünde (kali-kurulum) render edilir; ilerlemeye yazmaz.
// ============================================================================
import React, { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "@/lib/toast";
import CopyButton from "./CopyButton";
import BridgeConnect from "./BridgeConnect";

const celebrate = () => { if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("ordek-celebrate")); };

const TSHOOT = [
  ["VM ağ modu", "VirtualBox: Settings ▸ Network ▸ Attached to = NAT (en kolay) veya Bridged. Değiştirdiysen VM'i yeniden başlat."],
  ["Host IP doğru mu?", "NAT'ta host = 10.0.2.2. Bridged'de Windows'ta ipconfig → IPv4 Address. Yukarıdaki tabloyu kullan."],
  ["Port doğru mu?", "Yukarıda 'YAYIMLANAN SERVİSLER' altında gösterilen host portunu kullan (her başlatışta değişebilir)."],
  ["Windows güvenlik duvarı", "Docker Desktop / portu engelliyor olabilir. Aynı portu host tarayıcısında dene: http://localhost:<port>/token"],
];

export default function ConnCheckPanel() {
  const [machine, setMachine] = useState(null);
  const [busy, setBusy] = useState("");
  const [ready, setReady] = useState(false);
  const [val, setVal] = useState("");
  const [result, setResult] = useState(null); // {ok} | null
  const [err, setErr] = useState(null);
  const [learned, setLearned] = useState(null); // /api/netinfo: { kaliIp, hostIp, port }
  const post = async (body) => (await fetch("/api/conncheck", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })).json();

  // Mevcut çalışan conncheck hedefini kurtar (panel yeniden açılırsa).
  const recover = useCallback(async () => {
    try {
      const r = await fetch("/api/machines");
      const d = await r.json();
      if (Array.isArray(d.machines)) { const m = d.machines.find((x) => x.slug === "conncheck"); if (m) { setMachine(m); setReady(true); } }
    } catch {}
  }, []);
  useEffect(() => { recover(); }, [recover]);

  // Başladıktan ~3 sn sonra hedefi hazır say (konteyner servis vermeye başlasın).
  useEffect(() => { if (machine && !ready) { const t = setTimeout(() => setReady(true), 3000); return () => clearTimeout(t); } }, [machine, ready]);

  // Test sırasında reaper'a yem olmasın (keepalive).
  useEffect(() => {
    if (!machine || !machine.token) return;
    const t = setInterval(() => { fetch("/api/machines/keepalive", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token: machine.token }) }).catch(() => {}); }, 120000);
    return () => clearInterval(t);
  }, [machine && machine.token]);

  // AĞ KEŞFİ: Kali script'i panele hangi adresten ulaştığını bildirdiyse oku (poll).
  useEffect(() => {
    setLearned(null);
    if (!machine || !machine.token) return;
    let stop = false;
    const tick = async () => {
      try {
        const r = await fetch(`/api/netinfo?token=${encodeURIComponent(machine.token)}`);
        const d = await r.json();
        if (stop) return;
        if (d.learned && d.learned.hostIp) { setLearned(d.learned); return; }
      } catch {}
      if (!stop) setTimeout(tick, 5000);
    };
    tick();
    return () => { stop = true; };
  }, [machine && machine.token]);

  const start = async () => {
    setBusy("start"); setErr(null); setResult(null); setReady(false);
    const d = await post({ action: "start" }).catch((e) => ({ error: String(e) }));
    if (d.error) { setErr(d.message || d.error); toast(d.message || "Test başlatılamadı", d.error === "full" ? "warn" : "err"); }
    else { setMachine(d); toast("✓ Bağlantı testi hedefi başlatıldı", "ok"); }
    setBusy("");
  };
  const stop = async () => {
    if (!machine) return; setBusy("stop");
    await post({ action: "stop", id: machine.id }).catch(() => {});
    setMachine(null); setReady(false); setResult(null); setVal(""); setBusy(""); toast("■ Test hedefi durduruldu", "warn");
  };
  const verify = async () => {
    if (!val.trim() || !machine) return; setBusy("verify");
    const d = await post({ action: "verify", machineToken: machine.token, value: val.trim() }).catch(() => ({ ok: false }));
    setResult({ ok: !!d.ok });
    if (d.ok) { celebrate(); toast("✅ Bağlantı doğrulandı!", "ok"); }
    else toast("Token eşleşmedi — sorun giderme adımlarına bak", "warn");
    setBusy("");
  };

  // curl komutu: yayımlanan port + örnek host IP (tespit edilen / NAT varsayılanı).
  const port = machine && (machine.ports || []).find((p) => p && p.host);
  const sampleIp = (machine && (machine.hostHints || {}).detected || [])[0] || "10.0.2.2";
  const curlCmd = port ? `curl http://${sampleIp}:${port.host}/token` : "";

  return (
    <div className="panel" style={{ marginTop: 18 }}>
      <div className="panel-h">
        <span style={{ color: "var(--green-bright)" }}>🔌 bağlantı testi</span>
        <span style={{ flex: 1 }} />
        {machine && <span className="tag" style={{ color: ready ? "var(--green-bright)" : "var(--amber)", gap: 7 }}><span className={"dotstat " + (ready ? "run" : "boot")} />{ready ? "hazır" : "başlatılıyor"}</span>}
      </div>
      <div className="panel-b col" style={{ gap: 14 }}>
        <div className="muted" style={{ fontSize: 14, lineHeight: 1.55 }}>
          VM ağını ayarladıktan sonra <b>gerçekten erişebiliyor musun?</b> Hemen test et: aşağıdan bir
          hedef başlat, <b>KENDİ Kali VM'inin terminalinden</b> token'ı çek ve yapıştır.
        </div>

        {!machine && (
          <button className="kbtn primary" disabled={busy === "start"} onClick={start} style={{ alignSelf: "flex-start", fontSize: 15, padding: "11px 22px" }}>
            {busy === "start" ? "Başlatılıyor…" : "▸ Bağlantı testini başlat"}
          </button>
        )}

        {machine && (
          <>
            <BridgeConnect machine={machine} ready={ready} learned={learned} />

            <div className="col" style={{ gap: 4 }}>
              <span className="faint mono" style={{ fontSize: 11 }}>1) KALI TERMİNALİNDE ÇALIŞTIR (host IP'ni yaz)</span>
              <div className="row" style={{ gap: 6, alignItems: "stretch" }}>
                <code style={{ flex: 1, background: "var(--bg-inset)", border: "1px solid var(--line)", borderRadius: 4, padding: "9px 12px", fontSize: 14, color: "var(--green-bright)", wordBreak: "break-all" }}>{curlCmd || "(port atanıyor…)"}</code>
                {curlCmd && <CopyButton value={curlCmd} compact title="komutu kopyala" />}
              </div>
            </div>

            <div className="col" style={{ gap: 4 }}>
              <span className="faint mono" style={{ fontSize: 11 }}>2) ÇIKAN TOKEN'I YAPIŞTIR</span>
              <div className="row" style={{ gap: 8 }}>
                <input className="input" style={{ flex: 1 }} placeholder="ordek-net{...}" value={val}
                  onChange={(e) => { setVal(e.target.value); setResult(null); }} onKeyDown={(e) => e.key === "Enter" && verify()} />
                <button className="kbtn primary" onClick={verify} disabled={busy === "verify" || !val.trim()}>{busy === "verify" ? "…" : "Doğrula"}</button>
              </div>
            </div>

            {result && (result.ok
              ? <div className="callout cc-ok"><span className="ci">✅</span><span><b>Harika!</b> Kali VM'in laba erişebiliyor. Artık araç laboratuvarlarına geçebilirsin.</span></div>
              : <div className="col" style={{ gap: 8 }}>
                  <div className="callout" style={{ borderLeftColor: "var(--red)" }}><span className="ci" style={{ color: "var(--red-bright)" }}>✗</span><span>Token eşleşmedi. Büyük olasılıkla Kali VM'in hedefe ulaşamadı. Şunları kontrol et:</span></div>
                  <div className="tshoot">
                    {TSHOOT.map(([t, d], i) => (
                      <div key={i} className="ts-row"><span className="ts-n">{i + 1}</span><div><b>{t}</b><div className="muted" style={{ fontSize: 13 }}>{d}</div></div></div>
                    ))}
                  </div>
                </div>)}

            <div className="row wrap" style={{ gap: 8 }}>
              <button className="kbtn" disabled={busy === "start"} onClick={start}>{busy === "start" ? "…" : "⟳ Yeni hedef"}</button>
              <button className="kbtn danger" disabled={busy === "stop"} onClick={stop}>{busy === "stop" ? "Durduruluyor…" : "■ Durdur"}</button>
            </div>
            <div className="faint mono" style={{ fontSize: 11 }}>⚠ Bu yalnız bir bağlantı testidir; ilerlemene işlenmez. Durdurunca hedef silinir.</div>
          </>
        )}

        {err && <div className="console err" style={{ color: "var(--red-bright)" }}>⚠ {err}</div>}
      </div>
    </div>
  );
}
