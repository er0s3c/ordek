// ============================================================================
//  lib/toolLabs.js — SUNUCU-ONLY gerçek-araç labı ORKESTRASYON manifesti.
//  Her tool lab = saldırgan kutusu (ordek-attacker) + 0..n izole hedef, oturuma
//  özel iç ağda. docker.js bu manifeste göre konteynerleri/ağı kurar.
//
//  ⚠ Flag YOK (lib/flags.js'te). Burada yalnız "hangi imaj, hangi hostname,
//     hangi cap, flag nereye enjekte edilecek" bilgisi var.
//
//  Konvansiyon:
//   • Saldırgana DAİMA LAB_FLAG + LAB_SCENARIO env geçilir (loot labları flag'i
//     bundan üretir: john/hashcat hash'i, theHarvester sonucu, vb.).
//   • Her hedefe LAB_FLAG + LAB_SCENARIO geçilir; hedef senaryoya göre flag'i
//     uygun yere koyar (DB satırı, gizli dosya, TXT kaydı, login parolası…).
//   • victim-bot'a ayrıca VICTIM_TARGET geçilir: "target" (hedefe saldırır) ya da
//     "attacker" (saldırganın barındırdığı sahte sayfaya/hook'a girer).
// ============================================================================
// Relative + .js: hem Next (webpack) hem düz node (test/units.mjs) import edebilsin.
import { FLAGS } from "./flags.js";
import { TOOL_LAB_SLUGS, TOOL_LABS as TOOL_LABS_UI } from "../app/toolLabData.js";

export const ATTACKER_IMAGE = process.env.ATTACKER_IMAGE || "ordek-attacker:latest";

// Hedef imaj kısaltmaları → gerçek imaj adı (compose ile build/pull edilir).
const IMG = {
  web: process.env.TARGET_WEB_IMAGE || "ordek-target-web:latest",
  victim: process.env.TARGET_VICTIM_IMAGE || "ordek-victim-bot:latest",
  cve: process.env.TARGET_CVE_IMAGE || "ordek-target-cve:latest",
  smb: process.env.TARGET_SMB_IMAGE || "ordek-target-smb:latest",
  dns: process.env.TARGET_DNS_IMAGE || "ordek-target-dns:latest",
  wp: process.env.TARGET_WP_IMAGE || "ordek-target-wp:latest",
  linux: process.env.TARGET_LINUX_IMAGE || "ordek-target-linux:latest",
  tls: process.env.TARGET_TLS_IMAGE || "ordek-target-tls:latest",
};

// ── Hedef imajların YAYIMLANACAK servis portları (bridge modu) ──
//  bridge modunda hedefin servis portları HOST'a (0.0.0.0) yayımlanır; öğrenci
//  KENDİ VirtualBox/VMware Kali VM'inden Windows host IP'sine bu portlardan bağlanır.
//  (macvlan/test modunda kullanılmaz — orada gerçek/iç IP'ler vardır.)
//  victim-bot dinlenen port AÇMAZ (yalnız giden trafik üretir) → listede yok.
const P = (port, label, proto) => ({ port, label, proto: proto || "tcp" });
export const TARGET_PORTS = {
  [process.env.TARGET_WEB_IMAGE || "ordek-target-web:latest"]: [P(80, "http"), P(31337, "gizli http")],
  [process.env.TARGET_WP_IMAGE || "ordek-target-wp:latest"]: [P(80, "http (WordPress)")],
  [process.env.TARGET_CVE_IMAGE || "ordek-target-cve:latest"]: [P(21, "ftp"), P(6200, "vsftpd backdoor")],
  [process.env.TARGET_SMB_IMAGE || "ordek-target-smb:latest"]: [P(445, "smb"), P(139, "netbios-ssn")],
  [process.env.TARGET_DNS_IMAGE || "ordek-target-dns:latest"]: [P(53, "dns/tcp", "tcp"), P(53, "dns/udp", "udp")],
  [process.env.TARGET_LINUX_IMAGE || "ordek-target-linux:latest"]: [P(22, "ssh")],
  [process.env.TARGET_TLS_IMAGE || "ordek-target-tls:latest"]: [P(443, "https / tls")],
};
export function targetPorts(image) { return TARGET_PORTS[image] || []; }

// Kısa yardımcılar
const t = (image, hostname, extra) => ({ image, hostname, ...(extra || {}) });

// slug → { caps?, gui?, loot?, targets:[{image,hostname,victimTarget?}] }
export const TOOL_LABS = {
  // ── Temel ──
  // SSH'li Linux hedefi: öğrenci KENDİ VM'inden `ssh ordek@<ip>` ile bağlanır (BYO/LAN).
  "tool-linux": { ssh: true, targets: [t(IMG.linux, "target")] },

  // ── Keşif ──
  "tool-nmap": { caps: ["NET_RAW"], targets: [t(IMG.web, "target")] },
  "tool-dnsrecon": { targets: [t(IMG.dns, "target")] },
  "tool-theharvester": { loot: true, targets: [] },
  "tool-ffuf": { targets: [t(IMG.web, "target")] },
  "tool-nikto": { targets: [t(IMG.web, "target")] },
  "tool-smb": { targets: [t(IMG.smb, "target")] },
  "tool-wpscan": { targets: [t(IMG.wp, "target")] },

  // ── Trafik / MITM ──
  // Docker bridge "switched"tir → pasif sniff için kurban trafiği saldırgan ÜZERİNDEN
  // yönlendirilir (victimRoute). bettercap aktif ARP-spoof yapar (yönlendirme yok);
  // responder LLMNR broadcast'i bridge'de zaten herkese ulaşır.
  "tool-wireshark": { caps: ["NET_RAW"], gui: true, targets: [t(IMG.web, "target"), t(IMG.victim, "victim", { victimTarget: "target", victimRoute: true })] },
  "tool-tcpdump": { caps: ["NET_RAW"], targets: [t(IMG.web, "target"), t(IMG.victim, "victim", { victimTarget: "target", victimRoute: true })] },
  "tool-bettercap": { caps: ["NET_RAW", "NET_ADMIN"], targets: [t(IMG.web, "target"), t(IMG.victim, "victim", { victimTarget: "target" })] },
  "tool-responder": { caps: ["NET_RAW", "NET_ADMIN"], targets: [t(IMG.victim, "victim", { victimTarget: "attacker" })] },

  // ── Web sömürü ──
  "tool-burp": { gui: true, targets: [t(IMG.web, "target")] },
  "tool-sqlmap": { targets: [t(IMG.web, "target")] },
  "tool-beef": { gui: true, targets: [t(IMG.victim, "victim", { victimTarget: "attacker" })] },

  // ── Parola (loot: artefakt saldırgan kutusunda; flag = kırılan sır) ──
  "tool-hydra": { targets: [t(IMG.web, "target")] },
  "tool-john": { loot: true, targets: [] },
  "tool-hashcat": { loot: true, targets: [] },
  "tool-aircrack": { loot: true, targets: [] },

  // ── Exploit ──
  "tool-metasploit": { targets: [t(IMG.cve, "target")] },
  "tool-searchsploit": { targets: [t(IMG.cve, "target")] },
  "tool-msfvenom": { targets: [t(IMG.cve, "target")] },

  // ── Sosyal mühendislik (saldırgan sahte sayfayı barındırır; victim ona girer) ──
  "tool-setoolkit": { targets: [t(IMG.web, "target"), t(IMG.victim, "victim", { victimTarget: "attacker" })] },
  "tool-evilginx": { targets: [t(IMG.web, "target"), t(IMG.victim, "victim", { victimTarget: "attacker" })] },

  // ── FAZ 2: 10 yeni araç ──
  "tool-nuclei": { targets: [t(IMG.web, "target")] },
  "tool-gobuster": { targets: [t(IMG.web, "target")] },
  "tool-whatweb": { targets: [t(IMG.web, "target")] },
  "tool-sslscan": { targets: [t(IMG.tls, "target")] },
  "tool-netexec": { targets: [t(IMG.smb, "target")] },
  "tool-impacket": { targets: [t(IMG.smb, "target")] },
  "tool-gitleaks": { loot: true, targets: [] },
  "tool-subfinder": { targets: [t(IMG.dns, "target")] },
  "tool-commix": { targets: [t(IMG.web, "target")] },
  "tool-dalfox": { targets: [t(IMG.web, "target")] },
};

export const TOOL_SLUGS = Object.keys(TOOL_LABS);

export function isToolLab(slug) { return Object.prototype.hasOwnProperty.call(TOOL_LABS, slug); }
export function toolFlag(slug) { return FLAGS[slug] || null; }

// Geliştirme-zamanı tutarlılık kontrolü (test/units.mjs de doğrular):
// her tool slug'ı flags.js + toolLabData.js + bu manifestte bulunmalı.
export function toolLabConsistency() {
  const missing = [];
  for (const slug of TOOL_LAB_SLUGS) {
    const ui = TOOL_LABS_UI[slug] || {};
    // noBox (içerik-only) lablar Docker manifesti gerektirmez; yalnız flag şart.
    if (!ui.noBox && !isToolLab(slug)) missing.push(`manifest:${slug}`);
    if (!FLAGS[slug]) missing.push(`flag:${slug}`);
  }
  return missing;
}
