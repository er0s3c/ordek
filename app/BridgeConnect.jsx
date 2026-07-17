"use client";
// ============================================================================
//  app/BridgeConnect.jsx — BRIDGE (BYO-VM) bağlantı kartı (paylaşılan).
//  Host'a yayımlanan portlar + VM ağ rehberi + animasyonlu Kali VM→Host→hedef
//  topolojisi + OTOMATİK AĞ KEŞFİ (Kali'de tek-satır → sistem doğru adresi öğrenir).
//  ToolLabPanel (araç labları) ve ConnCheckPanel (bağlantı testi) ortak kullanır.
// ============================================================================
import React from "react";
import CopyButton from "./CopyButton";
import { discoveryScript } from "@/lib/netinfo";

// Yayımlanan bir porta göre öğrenciye gösterilecek örnek bağlantı komutu.
export function exampleCmd(tl, ip, p) {
  const port = p.host, c = p.container;
  if ((tl && tl.ssh) || c === 22) return `ssh ordek@${ip} -p ${port}`;
  if (c === 443) return `curl -ik https://${ip}:${port}/`;
  if (c === 80 || c === 31337) return `curl -i http://${ip}:${port}/`;
  if (c === 21) return `ftp ${ip} ${port}`;
  if (c === 445 || c === 139) return `smbclient -L //${ip} -p ${port} -N`;
  // DNS: TCP portu → AXFR (zone transfer, TCP); UDP portu → normal sorgu.
  if (c === 53) return p.proto === "udp" ? `dig @${ip} -p ${port} ordek.lab` : `dig +tcp @${ip} -p ${port} ordek.lab AXFR`;
  return `nmap -p ${port} ${ip}`;
}

const codeBox = { background: "var(--bg-inset)", border: "1px solid var(--line)", borderRadius: 4, padding: "9px 12px", fontSize: 14, color: "var(--ink)", wordBreak: "break-all" };

// BRIDGE (BYO-VM) bağlantı kartı.
//  learned: /api/netinfo'dan gelen { kaliIp, hostIp, port } (keşif yapıldıysa).
export default function BridgeConnect({ machine, tl = {}, ready, learned = null }) {
  const ports = (Array.isArray(machine.ports) ? machine.ports : []).filter((p) => p && p.host);
  const hints = machine.hostHints || {};
  const connect = machine.connect || {};
  const candidates = Array.isArray(connect.candidates) ? connect.candidates : [];
  const detected = hints.detected || [];
  const primary = ports[0];
  // Komutlarda kullanılacak en olası IP: öğrenilen > ilk aday > tespit edilen > NAT varsayılanı.
  const bestIp = (learned && learned.hostIp) || (candidates[0] && candidates[0].ip) || detected[0] || "10.0.2.2";

  // Kali'de çalıştırılacak tek-satır keşif script'i.
  const discover = primary
    ? discoveryScript({ candidates, port: primary.host, panelPort: connect.panelPort, token: machine.token })
    : "";

  return (
    <>
      <div className="callout" style={{ borderLeftColor: ready ? "var(--green)" : "var(--amber)" }}>
        <span className="ci" style={{ color: ready ? "var(--green)" : "var(--amber)" }}>{ready ? "🎯" : "⏳"}</span>
        {ready
          ? <span>Hedef hazır, portlar otomatik yayımlandı. <b>KENDİ VirtualBox/VMware Kali VM'inden</b> Windows host IP'sine aşağıdaki portlardan bağlan. En kolayı: <b>otomatik keşfi</b> çalıştır — sistem doğru adresi senin yerine bulur.</span>
          : <span>Hedef başlatılıyor ve servis portları yayımlanıyor… (~birkaç saniye)</span>}
      </div>

      {/* animasyonlu bağlantı topolojisi: Kali VM → Windows host → izole hedef */}
      <div className={"netflow" + (ready ? " live" : "")}>
        <div className="nf-node kali"><span className="nf-emo">🐉</span><span className="nf-t">Kali VM</span><span className="nf-s">{learned && learned.kaliIp ? learned.kaliIp : "VirtualBox / VMware"}</span></div>
        <div className="nf-link"><span className="nf-pkt" /><span className="nf-lbl">{learned && learned.hostIp ? learned.hostIp : "host IP"}</span></div>
        <div className="nf-node host"><span className="nf-emo">🪟</span><span className="nf-t">Windows Host</span><span className="nf-s">Docker Desktop</span></div>
        <div className="nf-link"><span className="nf-pkt d2" /><span className="nf-lbl">:port</span></div>
        <div className="nf-node tgt"><span className="nf-emo">🎯</span><span className="nf-t">{machine.targetHost || "hedef"}</span><span className="nf-s">izole konteyner</span></div>
      </div>

      {/* ÖĞRENİLDİ: keşif başarıyla geri-bildirim yaptıysa */}
      {learned && learned.hostIp && (
        <div className="callout cc-ok">
          <span className="ci">✅</span>
          <span>
            <b>Adres öğrenildi.</b> Kali VM'in (<code>{learned.kaliIp || "?"}</code>) hedefe
            {" "}<code>{learned.hostIp}</code> üzerinden ulaşıyor. Komutlarda hedef adresi olarak <b><code>{learned.hostIp}</code></b> kullan;
            servis portlarını aşağıdaki tablodan al.
          </span>
        </div>
      )}

      {/* OTOMATİK AĞ KEŞFİ — Kali'de tek satır: doğru host'u bul + sisteme öğret */}
      {discover && (
        <div className="col" style={{ gap: 5 }}>
          <span className="faint mono" style={{ fontSize: 11 }}>🔎 OTOMATİK KEŞİF — KALİ TERMİNALİNDE ÇALIŞTIR (ağ modundan bağımsız)</span>
          <div className="row" style={{ gap: 6, alignItems: "stretch" }}>
            <code style={{ flex: 1, ...codeBox, color: "var(--green-bright)" }}>{discover}</code>
            <CopyButton value={discover} compact title="keşif komutunu kopyala" />
          </div>
          <span className="faint" style={{ fontSize: 11 }}>Tüm aday adresleri ({candidates.map((c) => c.ip).join(", ") || "10.0.2.2…"}) dener, ulaşılanı bulur, Kali IP'ni saptar ve panele bildirir.</span>
        </div>
      )}

      {/* yayımlanan servisler → host portu + her biri için hazır komut */}
      <div className="col" style={{ gap: 6 }}>
        <span className="faint mono" style={{ fontSize: 11 }}>YAYIMLANAN SERVİSLER (host portu) — komutlarda bu portları kullan</span>
        <div className="row wrap" style={{ gap: 8 }}>
          {ports.length ? ports.map((p, i) => (
            <span key={i} className="port-chip" style={{ animationDelay: `${i * 0.1}s` }}>
              <b>{p.label}</b><span className="pc-arrow">→</span><code>:{p.host}{p.proto === "udp" ? "/udp" : ""}</code>
              <CopyButton value={String(p.host)} compact title="host portunu kopyala" />
            </span>
          )) : <span className="muted" style={{ fontSize: 13 }}>Portlar atanıyor…</span>}
        </div>
      </div>

      {/* her servis için kopyala-çalıştır komut (gerçek IP + gerçek yayımlanan port) */}
      {primary && (
        <div className="col" style={{ gap: 4 }}>
          <span className="faint mono" style={{ fontSize: 11 }}>HAZIR KOMUTLAR ({bestIp} için — kendi host IP'nse değiştir)</span>
          {ports.map((p, i) => {
            const cmd = exampleCmd(tl, bestIp, p);
            return (
              <div key={i} className="row" style={{ gap: 6, alignItems: "stretch" }}>
                <code style={{ flex: 1, ...codeBox, fontSize: 13 }}>{cmd}</code>
                <CopyButton value={cmd} compact title="komutu kopyala" />
              </div>
            );
          })}
        </div>
      )}

      {tl.ssh && (
        <div className="faint mono" style={{ fontSize: 11.5 }}>SSH parolası: <b style={{ color: "var(--ink)" }}>ordek</b> (kullanıcı: <b style={{ color: "var(--ink)" }}>ordek</b>)</div>
      )}

      {/* DÜRÜST UYARI: host'u -p- tarama (kendi Windows'unu tararsın) */}
      {!tl.ssh && (
        <div className="callout" style={{ borderLeftColor: "var(--amber)" }}>
          <span className="ci" style={{ color: "var(--amber)" }}>⚠</span>
          <span>
            <code>nmap -p- {bestIp}</code> ile host'un <b>tüm</b> portlarını tarama — o senin <b>Windows makinen</b>dir
            (135/445/3000/3001 gibi sistem portları çıkar), hedef değil. Hedefin servisleri yalnızca yukarıda
            listelenen <b>yayımlanan portlarda</b>dır; yalnızca onları tara: <code>nmap -p {ports.map((p) => p.host).join(",") || "<port>"} {bestIp}</code>.
          </span>
        </div>
      )}

      {/* Windows host IP — VM ağ moduna göre rehber */}
      <div className="col" style={{ gap: 6 }}>
        <span className="faint mono" style={{ fontSize: 11 }}>WINDOWS HOST IP — VM AĞ MODUNA GÖRE</span>
        <div className="hosttab">
          {(hints.vm || []).map((r, i) => (
            <div key={i} className="ht-row"><span className="ht-net">{r.net}</span><code className="ht-ip">{r.host}</code></div>
          ))}
        </div>
        {detected.length > 0 && (
          <span className="faint mono" style={{ fontSize: 11 }}>bu sunucunun IP'leri (paneli kendi makinende çalıştırıyorsan / bridged): <b style={{ color: "var(--ink)" }}>{detected.join(", ")}</b></span>
        )}
        <span className="faint" style={{ fontSize: 11.5 }}>Host IP'ni bulmak için Windows'ta <code>ipconfig</code> → IPv4 Address. En pratiği: VirtualBox + <b>NAT</b> ile <code>10.0.2.2</code>, ya da yukarıdaki otomatik keşif.</span>
      </div>
    </>
  );
}
