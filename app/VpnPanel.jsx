"use client";
// ============================================================================
//  app/VpnPanel.jsx — TryHackMe-tarzı WireGuard VPN bağlantı paneli.
//  Akış: config indir → KENDİ Kali VM'inde `wg-quick up` → BİR KEZ bağlan → tüm
//  zafiyetli hedeflere gerçek IP'leriyle eriş. Panel atanan VPN IP'sini + bağlı
//  durumunu otomatik gösterir (el sıkışma yoklaması). `kali-kurulum` modülünde render.
// ============================================================================
import React, { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "@/lib/toast";
import CopyButton from "./CopyButton";

const codeBox = { background: "var(--bg-inset)", border: "1px solid var(--line)", borderRadius: 4, padding: "9px 12px", fontSize: 13.5, color: "var(--ink)", wordBreak: "break-all" };

export default function VpnPanel() {
  const [st, setSt] = useState(null);       // { vpnIp, connected, provisioned, candidates[], port, endpointDefault }
  const [ep, setEp] = useState("");          // seçili endpoint (host IP)
  const [busy, setBusy] = useState(false);
  const epTouched = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const r = await fetch("/api/vpn?action=status");
      const d = await r.json();
      setSt(d);
      if (!epTouched.current && !ep) setEp(d.endpointDefault || (d.candidates && d.candidates[0] && d.candidates[0].ip) || "10.0.2.2");
    } catch {}
  }, [ep]);

  useEffect(() => { refresh(); }, [refresh]);
  // Bağlı durumunu canlı izle (el sıkışma 5 sn'de bir).
  useEffect(() => {
    const t = setInterval(refresh, 5000);
    return () => clearInterval(t);
  }, [refresh]);

  const download = async () => {
    setBusy(true);
    try {
      const r = await fetch(`/api/vpn?action=config&endpoint=${encodeURIComponent(ep)}`);
      const ct = r.headers.get("content-type") || "";
      if (!r.ok || ct.includes("application/json")) {
        const d = await r.json().catch(() => ({}));
        toast(d.message || "VPN config alınamadı (sunucu hazır değil)", "warn");
      } else {
        const blob = await r.blob();
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob); a.download = "ordek-vpn.conf";
        document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(a.href);
        toast("✓ WireGuard config indirildi (ordek-vpn.conf)", "ok");
        refresh();
      }
    } catch (e) { toast("İndirme hatası: " + (e.message || e), "err"); }
    setBusy(false);
  };

  const candidates = (st && st.candidates) || [];
  const connected = !!(st && st.connected);
  const vpnIp = st && st.vpnIp;
  const upCmd = "sudo wg-quick up ./ordek-vpn.conf";

  return (
    <div className="panel" style={{ marginTop: 18 }}>
      <div className="panel-h">
        <span style={{ color: "var(--green-bright)" }}>🔒 VPN ile laba bağlan (WireGuard)</span>
        <span style={{ flex: 1 }} />
        {st && st.provisioned && (
          <span className="tag" style={{ color: connected ? "var(--green-bright)" : "var(--amber)", gap: 7 }}>
            <span className={"dotstat " + (connected ? "run" : "boot")} />{connected ? "bağlı" : "bağlı değil"}
          </span>
        )}
      </div>
      <div className="panel-b col" style={{ gap: 14 }}>
        <div className="muted" style={{ fontSize: 14, lineHeight: 1.55 }}>
          TryHackMe gibi: <b>bir kez</b> VPN'e bağlan, sonra tüm zafiyetli makinelere <b>gerçek IP'leriyle</b>
          doğrudan eriş. Artık host'a port yayımı / IP tahmini yok — <code>nmap -p- &lt;hedef-ip&gt;</code> tam
          olarak hedefin portlarını gösterir.
        </div>

        {/* 1) ağ modu / endpoint seçimi */}
        <div className="col" style={{ gap: 5 }}>
          <span className="faint mono" style={{ fontSize: 11 }}>1) VM AĞ MODUNA GÖRE HOST ADRESİ (endpoint)</span>
          <div className="row wrap" style={{ gap: 8, alignItems: "center" }}>
            <select className="input" style={{ maxWidth: 360 }} value={ep}
              onChange={(e) => { epTouched.current = true; setEp(e.target.value); }}>
              {candidates.map((c, i) => <option key={i} value={c.ip}>{c.ip} — {c.label}</option>)}
              {!candidates.some((c) => c.ip === ep) && ep && <option value={ep}>{ep} (özel)</option>}
            </select>
            <span className="faint" style={{ fontSize: 11.5 }}>VirtualBox <b>NAT</b> kullanıyorsan <code>10.0.2.2</code>; bridged ise host'un LAN IP'si.</span>
          </div>
        </div>

        {/* 2) config indir */}
        <div className="col" style={{ gap: 5 }}>
          <span className="faint mono" style={{ fontSize: 11 }}>2) CONFIG'İ İNDİR</span>
          <button className="kbtn primary" disabled={busy} onClick={download} style={{ alignSelf: "flex-start", fontSize: 15, padding: "11px 22px" }}>
            {busy ? "Hazırlanıyor…" : "⬇ WireGuard config indir (ordek-vpn.conf)"}
          </button>
        </div>

        {/* 3) Kali'de bağlan */}
        <div className="col" style={{ gap: 5 }}>
          <span className="faint mono" style={{ fontSize: 11 }}>3) KALİ'DE BAĞLAN (config aynı klasörde)</span>
          <div className="row" style={{ gap: 6, alignItems: "stretch" }}>
            <code style={{ flex: 1, ...codeBox, color: "var(--green-bright)" }}>{upCmd}</code>
            <CopyButton value={upCmd} compact title="komutu kopyala" />
          </div>
          <span className="faint" style={{ fontSize: 11 }}>WireGuard kurulu değilse: <code>sudo apt update &amp;&amp; sudo apt install -y wireguard</code>. Kapatmak için <code>sudo wg-quick down ./ordek-vpn.conf</code>.</span>
        </div>

        {/* atanan VPN IP + bağlı durumu */}
        <div className="col" style={{ gap: 6 }}>
          <span className="faint mono" style={{ fontSize: 11 }}>SENİN VPN IP'N (otomatik)</span>
          <div className="row" style={{ gap: 8, alignItems: "center" }}>
            <code style={{ ...codeBox, fontSize: 15, fontWeight: 700, color: vpnIp ? "var(--green-bright)" : "var(--ink-dim)" }}>
              {vpnIp || "(config indirince atanır)"}
            </code>
            {vpnIp && <CopyButton value={vpnIp} compact title="IP'yi kopyala" />}
          </div>
          {st && st.provisioned && (
            connected
              ? <div className="callout cc-ok"><span className="ci">✅</span><span><b>Bağlısın!</b> Artık araç laboratuvarlarında hedef başlat → panelde çıkan hedef IP'sine doğrudan saldır.</span></div>
              : <div className="callout" style={{ borderLeftColor: "var(--amber)" }}><span className="ci" style={{ color: "var(--amber)" }}>⏳</span><span>Config indirildi ama el sıkışma yok. Kali'de <code>wg-quick up</code> çalıştır; bağlanınca burası <b>yeşile</b> döner. Endpoint adresinin VM ağ moduna uyduğundan emin ol.</span></div>
          )}
        </div>

        <div className="faint mono" style={{ fontSize: 11 }}>⚠ VPN birincil erişim yöntemidir. Sunucu kurulamazsa sistem otomatik olarak host port-yayımı (bridge) moduna düşer.</div>
      </div>
    </div>
  );
}
