"use client";
// ============================================================================
//  app/ToolLabPanel.jsx — GERÇEK ARAÇ LABI paneli (type:"tool" modüllerde).
//  Dört görünüm:
//   1) noBox (Linux-101)  → kutu yok; adımlar + flag (öğrenci kendi terminalinde).
//   2) loot (john/hashcat/aircrack/theHarvester) → loot dosyası indir + flag.
//   3) box + ÜRETİM (BYO-Kali) → hedef LAN IP göster; öğrenci KENDİ Kali'sinden saldırır.
//   4) box + TEST modu (LAB_ATTACKER_MODE=test) → gömülü Kali terminali (ttyd/noVNC).
//  ⚠ Flag YOK: doğrulama sunucuda /api/flag (lib/flags.js).
// ============================================================================
import React, { useState, useEffect, useCallback, useRef } from "react";
import { TOOL_LABS } from "@/app/toolLabData";
import { toast } from "@/lib/toast";
import CopyButton from "./CopyButton";
import StepRunner from "./StepRunner";
import BridgeConnect from "./BridgeConnect";
import { portMapOf } from "@/lib/netinfo";

// İçerik gönderim bölümü: interaktif lab → Bandit-tarzı adım motoru; değilse klasik flag kutusu.
//  target = { ip, portMap } (varsa) → StepRunner komutlarına gerçek hedef adresini koyar.
function SubmitSection({ slug, tl, done, markSolved, target = null }) {
  if (tl.interactive) return <StepRunner slug={slug} target={target} onComplete={() => markSolved && markSolved(slug, "lab")} />;
  return <ToolFlagSubmit slug={slug} done={done} onSolved={() => markSolved && markSolved(slug, "lab")} flagHint={tl.flagHint} />;
}

const celebrate = () => { if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("ordek-celebrate")); };

export default function ToolLabPanel({ slug, solved = [], markSolved, addNote, autoClose = true }) {
  const tl = TOOL_LABS[slug] || {};
  const done = solved.includes("lab");

  // 1) İçerik-only lab (Linux-101): kutu yok, adım adım kendi terminalinde.
  if (tl.noBox) {
    return (
      <div className="col" style={{ gap: 16 }}>
        <ScenarioCard tl={tl} hideTargets />
        {Array.isArray(tl.steps) && tl.steps.length > 0 && (
          <div className="panel">
            <div className="panel-h">// adım adım (kendi terminalinde)</div>
            <div className="panel-b col" style={{ gap: 10 }}>
              {tl.steps.map((s, i) => (
                <div key={i} className="col" style={{ gap: 3 }}>
                  <div className="row" style={{ gap: 8, alignItems: "stretch" }}>
                    <span className="faint mono" style={{ width: 22, textAlign: "right", color: "var(--green)" }}>{i + 1}.</span>
                    <code style={{ flex: 1, background: "var(--bg-inset)", border: "1px solid var(--line)", borderRadius: 4, padding: "7px 10px", fontSize: 12.5, color: "var(--ink)", wordBreak: "break-all" }}>{s.cmd}</code>
                    <CopyButton value={s.cmd} compact title="komutu kopyala" />
                  </div>
                  <div className="muted" style={{ fontSize: 12.5, paddingLeft: 30 }}>{s.desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        <SubmitSection slug={slug} tl={tl} done={done} markSolved={markSolved} />
        <HintsCard tl={tl} />
      </div>
    );
  }

  // 2) Loot lab: loot dosyası indir, kendi makinende kır.
  if (tl.loot) {
    return (
      <div className="col" style={{ gap: 16 }}>
        <div className="panel">
          <div className="panel-h"><span style={{ color: "var(--green-bright)" }}>⬇ loot dosyası</span></div>
          <div className="panel-b col" style={{ gap: 12 }}>
            <div className="muted" style={{ fontSize: 14 }}>
              Bu lab offline'dır: loot dosyasını indir, KENDİ Kali/Linux makinende kır, çıkan değeri flag olarak gönder.
            </div>
            <div className="row wrap" style={{ gap: 8 }}>
              <a className="kbtn primary" href={`/api/tool-loot?slug=${encodeURIComponent(slug)}`}>⬇ Loot dosyasını indir</a>
              {slug !== "tool-theharvester" && (
                <a className="kbtn" href={`/api/tool-loot?slug=${encodeURIComponent(slug)}&part=wordlist`}>⬇ Sözlük (wordlist.txt)</a>
              )}
            </div>
            <div className="faint mono" style={{ fontSize: 11 }}>İndirdikten sonra aşağıdaki örnek komutlarla kendi makinende kır.</div>
          </div>
        </div>
        <ScenarioCard tl={tl} hideTargets />
        <SubmitSection slug={slug} tl={tl} done={done} markSolved={markSolved} />
        <HintsCard tl={tl} />
      </div>
    );
  }

  // 3/4) Kutu lab (hedef makineli).
  return <BoxLab slug={slug} tl={tl} solved={solved} done={done} markSolved={markSolved} addNote={addNote} autoClose={autoClose} />;
}

function BoxLab({ slug, tl, solved, done, markSolved, addNote, autoClose }) {
  const [machine, setMachine] = useState(null);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState(null);
  const [ready, setReady] = useState(false);
  const [learned, setLearned] = useState(null); // /api/netinfo: { kaliIp, hostIp, port }
  const [vpnIp, setVpnIp] = useState(null);      // /api/vpn: öğrencinin atanan VPN IP'si
  const notifiedReady = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const r = await fetch("/api/machines");
      const d = await r.json();
      if (d.machines) { const m = d.machines.find((x) => x.slug === slug); setMachine(m || null); if (!m) setReady(false); }
      else if (d.error) setErr(d.error);
    } catch {}
  }, [slug]);
  useEffect(() => { setMachine(null); setReady(false); setErr(null); refresh(); }, [refresh]);

  const bridge = !!(machine && machine.mode === "bridge");
  const vpn = !!(machine && machine.mode === "vpn");
  // VPN, prod (macvlan) ile aynı UI: gerçek hedef IP'si gösterilir, terminal yok.
  const prod = !!(machine && (machine.mode === "prod" || vpn || (machine.targetIp && !machine.token)));
  const testMode = !!(machine && machine.token && machine.mode !== "prod" && machine.mode !== "bridge" && !vpn);

  // AĞ KEŞFİ (bridge): Kali script'i panele hangi adresten ulaştığını bildirir → öğren + göster.
  useEffect(() => {
    setLearned(null);
    if (!bridge || !machine || !machine.token) return;
    let stop = false;
    const tick = async () => {
      try {
        const r = await fetch(`/api/netinfo?token=${encodeURIComponent(machine.token)}`);
        const d = await r.json();
        if (stop) return;
        if (d.learned && d.learned.hostIp) { setLearned(d.learned); return; } // öğrenildi → dur
      } catch {}
      if (!stop) setTimeout(tick, 5000);
    };
    tick();
    return () => { stop = true; };
  }, [bridge, machine && machine.token]);

  // VPN: öğrencinin atanan VPN IP'si (provisyonluysa). Makineden BAĞIMSIZ → her tool
  //  modülünün topolojisinde "kali" düğümü öğrencinin gerçek VPN IP'sini gösterir.
  useEffect(() => {
    let stop = false;
    const tick = async () => {
      try {
        const r = await fetch("/api/vpn?action=status");
        const d = await r.json();
        if (!stop && d && d.vpnIp) setVpnIp(d.vpnIp);
      } catch {}
      if (!stop) setTimeout(tick, 15000);
    };
    tick();
    return () => { stop = true; };
  }, []);

  // StepRunner komutlarına konacak hedef adresi (moda göre):
  //  bridge → öğrenilen/aday host IP + yayımlanan port haritası
  //  prod   → gerçek LAN IP (portlar gerçek) · test → 10.13.37.10 (iç IP çalışır)
  const stepTarget = (() => {
    if (!machine) return null;
    if (bridge) {
      const cand = (machine.connect && machine.connect.candidates) || [];
      const ip = (learned && learned.hostIp) || (cand[0] && cand[0].ip)
        || ((machine.hostHints && machine.hostHints.detected) || [])[0] || "10.0.2.2";
      return { ip, portMap: portMapOf(machine.ports) };
    }
    if (prod) return machine.targetIp ? { ip: machine.targetIp, portMap: {} } : null;
    if (testMode) return { ip: "10.13.37.10", portMap: {} };
    return null;
  })();

  // ── Topoloji düğümleri: ÇALIŞAN makinenin moduna göre, komutlarla TUTARLI adresler ──
  //  vpn  → kali = öğrencinin VPN IP'si · hedef = gerçek targetIp/victimIp
  //  bridge → kali = keşifle öğrenilen VM IP'si · hedef = host adresi (komutlarla aynı, ör. 10.0.2.2)
  //  test → statik menzil (10.13.37.5 / .10 / .20) · makine yoksa → statik (placeholder)
  //  ⚠ vpnIp YALNIZ vpn modunda kullanılır; lab bridge'e düştüyse VPN IP'si gösterilmez
  //     (yoksa komut 10.0.2.2 derken topoloji VPN der → tutarsızlık).
  const topoKaliIp = vpn ? vpnIp : bridge ? ((learned && learned.kaliIp) || null) : testMode ? "10.13.37.5" : null;
  const topoTargetIps = (() => {
    const m = {};
    const hostIp = stepTarget && stepTarget.ip;
    const primaryPort = bridge && machine && Array.isArray(machine.ports) ? machine.ports.find((p) => p && p.host) : null;
    for (const tg of (tl.targets || [])) {
      if (vpn || prod) m[tg.host] = (tg.host === "victim" ? machine && machine.victimIp : machine && machine.targetIp) || null;
      else if (bridge) {
        // Bridge: hedef host:port'tan erişilir (komutlarla aynı). Birincil hedefe portu ekle.
        m[tg.host] = hostIp ? (primaryPort && tg.host === machine.targetHost ? `${hostIp}:${primaryPort.host}` : hostIp) : null;
      } else if (testMode) m[tg.host] = tg.host === "victim" ? "10.13.37.20" : "10.13.37.10";
      else m[tg.host] = null;
    }
    return m;
  })();
  const topoMode = vpn ? "vpn" : bridge ? "bridge" : testMode ? "test" : prod ? "prod" : null;

  // Test modunda terminal hazır mı? (ÜRETİMDE macvlan → panel hedefe erişemez, atla)
  useEffect(() => {
    if (!testMode || !machine || !machine.token) { return; }
    let stop = false;
    const tick = async () => {
      try {
        const r = await fetch(`/api/machines/ready?token=${encodeURIComponent(machine.token)}`);
        const d = await r.json();
        if (stop) return;
        if (d.ready) {
          setReady(true);
          if (!notifiedReady.current) { notifiedReady.current = true; toast(`✅ ${tl.name || slug} hazır`, "ok"); }
        } else setTimeout(tick, 3000);
      } catch { if (!stop) setTimeout(tick, 3000); }
    };
    tick();
    return () => { stop = true; };
  }, [testMode, machine && machine.token]);

  // Üretim/bridge: hedef başlayınca ~ birkaç sn içinde hazır say (panel hedefe erişmez).
  useEffect(() => { if ((prod || bridge) && machine) { const t = setTimeout(() => setReady(true), 6000); return () => clearTimeout(t); } }, [prod, bridge, machine && machine.id]);

  // Panel açıkken canlı tut
  useEffect(() => {
    if (!machine || !machine.token) return;
    const t = setInterval(() => { fetch("/api/machines/keepalive", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token: machine.token }) }).catch(() => {}); }, 300000);
    return () => clearInterval(t);
  }, [machine && machine.token]);

  const post = async (url, body) => (await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })).json();
  const start = async () => {
    setBusy("start"); setErr(null); setReady(false); notifiedReady.current = false;
    const d = await post("/api/machines", { slug }).catch((e) => ({ error: String(e) }));
    if (d.error) { setErr(d.message || d.error); toast(d.message || "Lab başlatılamadı", d.error === "full" ? "warn" : "err"); }
    else { setMachine(d); toast("✓ Hedef başlatıldı", "ok"); }
    setBusy("");
  };
  const restart = async () => {
    if (!machine) return; setBusy("restart"); setErr(null); setReady(false); notifiedReady.current = false;
    const d = await post(`/api/machines/${machine.id}`, { action: "restart", slug }).catch((e) => ({ error: String(e) }));
    if (d.error) { setErr(d.error); toast("Sıfırlanamadı", "err"); } else { setMachine(d); toast("⟳ Hedef sıfırlandı", "ok"); }
    setBusy("");
  };
  const stop = async () => {
    if (!machine) return; setBusy("stop");
    await post(`/api/machines/${machine.id}`, { action: "stop" }).catch(() => {});
    setMachine(null); setReady(false); setBusy(""); toast("■ Hedef durduruldu", "warn");
  };

  const termSrc = machine && machine.token ? `/api/machines/open?token=${machine.token}` : "";
  const proxyBase = typeof window !== "undefined" ? `${window.location.protocol}//${window.location.hostname}:3001` : "";
  const desktopUrl = machine && machine.token ? `${proxyBase}/desktop/vnc.html?path=desktop/websockify&autoconnect=1&resize=remote` : "";

  return (
    <div className="col" style={{ gap: 16 }}>
      <div className="panel">
        <div className="panel-h">
          <span style={{ color: "var(--green-bright)" }}>🎯 hedef makine</span>
          <span style={{ flex: 1 }} />
          {machine && <span className="tag" style={{ color: ready ? "var(--green-bright)" : "var(--amber)", gap: 7 }}><span className={"dotstat " + (ready ? "run" : "boot")} />{ready ? "çalışıyor" : "başlatılıyor"}</span>}
        </div>
        <div className="panel-b">
          {!machine && (
            <div className="col" style={{ gap: 14, alignItems: "flex-start" }}>
              <div className="muted" style={{ fontSize: 14 }}>
                Bu araç için izole bir <b>zafiyetli hedef makine</b> başlatılır ve servis portları otomatik
                yayımlanır. Saldırıyı <b>KENDİ VirtualBox/VMware Kali VM'inden</b> yaparsın — ağ ayarı gerekmez,
                bağlantı bilgisi açılınca panelde gösterilir.
              </div>
              <button className="kbtn primary" disabled={busy === "start"} onClick={start} style={{ fontSize: 15, padding: "11px 22px" }}>
                {busy === "start" ? "Başlatılıyor…" : "▸ Hedefi Başlat"}
              </button>
            </div>
          )}
          {machine && (
            <div className="col" style={{ gap: 12 }}>
              {/* BRIDGE (BYO-VM): host'a yayımlanan portlar — kendi Kali VM'inden bağlan */}
              {bridge && <BridgeConnect machine={machine} tl={tl} ready={ready} learned={learned} />}

              {/* VPN (WireGuard) / ÜRETİM (macvlan): gerçek hedef IP — kendi Kali'nden saldır */}
              {prod && (
                <>
                  <div className="callout" style={{ borderLeftColor: "var(--green)" }}>
                    <span className="ci" style={{ color: "var(--green)" }}>{vpn ? "🔒" : "🎯"}</span>
                    {vpn
                      ? <span><b>VPN üzerinden bağlısın</b> — hedef gerçek IP'siyle erişilebilir. Komutlardaki <code>target</code>/<code>10.13.37.10</code> yerine aşağıdaki IP'yi kullan. <code>nmap -p- {machine.targetIp || "<ip>"}</code> tam olarak <b>hedefin</b> portlarını gösterir. (VPN'e henüz bağlanmadıysan <b>Kali VM Kurulumu</b> modülünden config'i indir.)</span>
                      : tl.ssh
                      ? <span>Hedef hazır. <b>Kendi sanal makinenden (Kali/Linux)</b> aşağıdaki IP'ye <b>SSH</b> ile bağlan, sonra adım adım görevleri çöz.</span>
                      : <span>Hedef hazır. <b>Kendi Kali VM'inden</b> (aynı yerel ağ) aşağıdaki IP'ye saldır. Komutlardaki <code>target</code> yerine bu IP'yi yaz.</span>}
                  </div>
                  <div className="col" style={{ gap: 4 }}>
                    <span className="faint mono" style={{ fontSize: 11 }}>HEDEF IP ({vpn ? "VPN" : "LAN"})</span>
                    <div className="row" style={{ gap: 6, alignItems: "stretch" }}>
                      <code style={{ flex: 1, background: "var(--bg-inset)", border: "1px solid var(--line)", borderRadius: 4, padding: "9px 12px", fontSize: 15, color: "var(--green-bright)", fontWeight: 700 }}>{machine.targetIp || "(atanıyor…)"}</code>
                      {machine.targetIp && <CopyButton value={machine.targetIp} compact title="IP'yi kopyala" />}
                    </div>
                    {machine.victimIp && <span className="faint mono" style={{ fontSize: 11 }}>kurban (victim) IP: <b style={{ color: "var(--ink)" }}>{machine.victimIp}</b> — MITM/sniff için</span>}
                  </div>
                  {tl.ssh && (
                    <div className="col" style={{ gap: 4 }}>
                      <span className="faint mono" style={{ fontSize: 11 }}>SSH BAĞLANTISI (parola: <b style={{ color: "var(--ink)" }}>ordek</b>)</span>
                      <div className="row" style={{ gap: 6, alignItems: "stretch" }}>
                        <code style={{ flex: 1, background: "var(--bg-inset)", border: "1px solid var(--line)", borderRadius: 4, padding: "9px 12px", fontSize: 14, color: "var(--ink)", wordBreak: "break-all" }}>ssh ordek@{machine.targetIp || "<IP>"}</code>
                        {machine.targetIp && <CopyButton value={`ssh ordek@${machine.targetIp}`} compact title="komutu kopyala" />}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* TEST modu: gömülü Kali terminali */}
              {testMode && (
                <>
                  <div className="callout" style={{ borderLeftColor: ready ? "var(--green)" : "var(--amber)" }}>
                    <span className="ci" style={{ color: ready ? "var(--green)" : "var(--amber)" }}>{ready ? "✓" : "⏳"}</span>
                    <span>{ready ? <>Saldırgan kutusu hazır — terminalde aracı çalıştır.</> : <>Menzil açılıyor… (~20-60 sn).</>}</span>
                  </div>
                  {ready && <iframe title="terminal" src={termSrc} style={{ width: "100%", height: 440, border: "1px solid var(--line)", borderRadius: 6, background: "#000" }} />}
                  {!ready && <div className="shimmer" style={{ height: 12, width: "55%" }} />}
                </>
              )}

              <div className="row wrap" style={{ gap: 8 }}>
                {testMode && <a className="kbtn primary" href={termSrc} target="_blank" rel="noreferrer" style={ready ? {} : { opacity: 0.55 }}>↗ Terminali yeni sekmede aç</a>}
                {testMode && tl.gui && <a className="kbtn" href={desktopUrl} target="_blank" rel="noreferrer" style={ready ? {} : { opacity: 0.55 }}>🖥 Masaüstü (noVNC)</a>}
                <button className="kbtn" disabled={busy === "restart"} onClick={restart}>{busy === "restart" ? "Sıfırlanıyor…" : "⟳ Yeniden Başlat"}</button>
                <button className="kbtn danger" disabled={busy === "stop"} onClick={stop}>{busy === "stop" ? "Durduruluyor…" : "■ Durdur"}</button>
              </div>
              <div className="faint mono" style={{ fontSize: 11 }}>⚠ Durdurunca hedef ve verisi silinir (deep-freeze).</div>
            </div>
          )}
          {err && <div className="console err mt12" style={{ color: "var(--red-bright)" }}>⚠ {err}</div>}
        </div>
      </div>

      <ScenarioCard tl={tl} kaliIp={topoKaliIp} targetIps={topoTargetIps} mode={topoMode} />
      <SubmitSection slug={slug} tl={tl} done={done} markSolved={markSolved} target={stepTarget} />
      <HintsCard tl={tl} />
    </div>
  );
}

function ScenarioCard({ tl, hideTargets, kaliIp = null, targetIps = null, mode = null }) {
  return (
    <div className="panel">
      <div className="panel-h">// senaryo · {tl.name}</div>
      <div className="panel-b col" style={{ gap: 12 }}>
        <div className="muted" style={{ fontSize: 14, lineHeight: 1.55 }}>{tl.story}</div>
        {tl.objectives && (
          <div className="col" style={{ gap: 6 }}>
            <span className="faint mono" style={{ fontSize: 11 }}>GÖREVLER</span>
            {tl.objectives.map((o, i) => (
              <div key={i} className="row" style={{ gap: 8, fontSize: 13.5 }}><span style={{ color: "var(--green)" }}>▸</span><span className="muted">{o}</span></div>
            ))}
          </div>
        )}
        {!hideTargets && Array.isArray(tl.targets) && tl.targets.length > 0 && (
          <div className="col" style={{ gap: 6 }}>
            <span className="faint mono" style={{ fontSize: 11 }}>HEDEF(LER)</span>
            {tl.targets.map((tg, i) => (
              <div key={i} className="row" style={{ gap: 8, fontSize: 13 }}>
                <code style={{ color: "var(--green-bright)" }}>{tg.host}</code>
                {tg.ip && <code className="mono" style={{ color: "var(--green)", fontSize: 12 }}>{tg.ip}</code>}
                <span className="muted">— {tg.note}</span>
              </div>
            ))}
            {/* menzil topolojisi: ÇALIŞAN makinenin moduyla TUTARLI adresler (komutlarla aynı).
                vpn → senin VPN IP'n + hedefin gerçek IP'si · bridge → host adresi · değilse statik. */}
            <div className="topo" style={{ marginTop: 4 }}>
              <div className="node atk">
                <span>🖥️ kali{kaliIp ? " (sen)" : ""}</span>
                <span className="ip">{kaliIp || "10.13.37.5"}</span>
                <span className="nl">{mode === "vpn" ? "VPN" : mode === "bridge" ? "Kali VM" : "attacker"}</span>
              </div>
              {tl.targets.map((tg, i) => {
                const live = targetIps && targetIps[tg.host];
                const ip = live || tg.ip || (tg.host === "victim" ? "10.13.37.20" : "10.13.37.10");
                const nl = mode === "bridge" ? "host:port" : live ? "hedef (canlı)" : "target";
                return (
                  <React.Fragment key={i}>
                    <div className="link" />
                    <div className="node tgt"><span>🎯 {tg.host}</span><span className="ip">{ip}</span><span className="nl">{nl}</span></div>
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )}
        {Array.isArray(tl.cmds) && tl.cmds.length > 0 && (
          <div className="col" style={{ gap: 4 }}>
            <span className="faint mono" style={{ fontSize: 11 }}>ÖRNEK KOMUTLAR</span>
            {tl.cmds.map((c, i) => <div key={i} className="lesson-cmd" style={{ whiteSpace: "pre-wrap" }}>{c}</div>)}
          </div>
        )}
      </div>
    </div>
  );
}

function HintsCard({ tl }) {
  if (!tl.hints && !tl.solution) return null;
  return (
    <div className="panel">
      <div className="panel-h">// ipucu &amp; çözüm</div>
      <div className="panel-b col" style={{ gap: 8 }}>
        {(tl.hints || []).map((h, i) => (
          <details key={i} style={{ border: "1px solid var(--line)", borderRadius: 4, background: "var(--bg-2)" }}>
            <summary style={{ cursor: "pointer", padding: "8px 11px", fontFamily: "var(--font-mono)", fontSize: 12.5, color: "var(--ink-dim)" }}>İpucu {i + 1}</summary>
            <div className="muted" style={{ padding: "0 11px 11px", fontSize: 13.5, lineHeight: 1.55 }}>{h}</div>
          </details>
        ))}
        {tl.solution && (
          <details style={{ border: "1px solid var(--line)", borderRadius: 4, background: "var(--bg-2)" }}>
            <summary style={{ cursor: "pointer", padding: "8px 11px", fontFamily: "var(--font-mono)", fontSize: 12.5, color: "var(--amber)" }}>Çözümü göster</summary>
            <div className="muted" style={{ padding: "0 11px 11px", fontSize: 13.5, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{tl.solution}</div>
          </details>
        )}
      </div>
    </div>
  );
}

// Flag gönderme — /api/flag (level:"lab").
function ToolFlagSubmit({ slug, done, onSolved, flagHint }) {
  const [val, setVal] = useState("");
  const [state, setState] = useState(null);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!val.trim()) return;
    setBusy(true); setState(null);
    try {
      const r = await fetch("/api/flag", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ slug, level: "lab", flag: val.trim() }) });
      const d = await r.json();
      if (d.ok) { setState({ ok: true, msg: "Doğru flag — araç labı tamamlandı.", flag: val.trim() }); onSolved && onSolved(); toast("⚑ Doğru flag! Lab çözüldü", "ok"); celebrate(); }
      else setState({ ok: false, msg: d.error || "Flag eşleşmedi." });
    } catch (e) { setState({ ok: false, msg: String(e.message || e) }); }
    setBusy(false);
  };
  return (
    <div className="panel">
      <div className="panel-h">
        <span style={{ color: "var(--green)" }}>⚑ flag gönder</span>
        <span style={{ flex: 1 }} />
        {done && <span className="tag solved">çözüldü ✓</span>}
      </div>
      <div className="panel-b col" style={{ gap: 10 }}>
        <div className="muted" style={{ fontSize: 13 }}>{flagHint || "Yakaladığın flag'i buraya yapıştır ve doğrula."}</div>
        <div className="row" style={{ gap: 8 }}>
          <input className="input" style={{ flex: 1 }} placeholder="ordek{...}" value={val} onChange={(e) => { setVal(e.target.value); setState(null); }} onKeyDown={(e) => e.key === "Enter" && submit()} />
          <button className="kbtn primary" onClick={submit} disabled={busy}>{busy ? "…" : "Doğrula"}</button>
        </div>
        {state && (state.ok
          ? <div className="flag-banner"><span style={{ fontSize: 18 }}>⚑</span><div className="col" style={{ gap: 2, flex: 1 }}><span className="lbl">{state.msg}</span></div><CopyButton value={state.flag} compact title="flag'i kopyala" /></div>
          : <div className="console" style={{ color: "var(--red-bright)" }}>{state.msg}</div>)}
      </div>
    </div>
  );
}
