// ============================================================================
//  lib/docker.js — SUNUCU-ONLY Docker orkestrasyon yardımcıları.
//  Panel, docker.sock üzerinden her zafiyet+seviye için izole hedef konteyner
//  başlatır. Makineler ARTIK host'a port yayınlamaz: yalnızca iç ağda (ordek_internal)
//  ad ile erişilir ve kimlik-doğrulamalı proxy (:3001) üzerinden açılır.
//  Sınıf modunda her makine `ordek-lab.student=<userId>` etiketiyle başlatılır →
//  öğretmen kimin hangi makineyi çalıştırdığını görebilir; proxy sahipliği doğrular.
//
//  GÜVENLİK: hedefler kasıtlı RCE/SSRF/DoS içerir; host'u korumak için kum havuzu:
//    --cap-drop ALL, --security-opt no-new-privileges, mem/cpu/pids tavanları,
//    iç ağ (egress yok). Yoğunluk: öğrenci başına / global makine limiti + reaper.
// ============================================================================
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import crypto from "node:crypto";
import os from "node:os";
import { MACHINES, MACHINE_SLUGS } from "@/lib/machines";
import { TOOL_LABS, ATTACKER_IMAGE, isToolLab, targetPorts } from "@/lib/toolLabs";
import { FLAGS } from "@/lib/flags";
import { connToken, verifyConn } from "@/lib/conncheck";
import { hostCandidates } from "@/lib/netinfo";
import { ensureVpnServer, ensureClassIsolation, flushIsolation, allowPair, vpnIpOf, VPN_NET } from "@/lib/wireguard";

const pexec = promisify(execFile);
const IMAGE = process.env.MACHINE_IMAGE || "ordek-lab:latest";
export const LEVELS = ["low", "medium", "high"];

// ── gerçek-araç labı kaynak tavanları (saldırgan kutusu ağırdır) ──
const ATTACKER_MEM = process.env.ATTACKER_MEM || "1536m";
const ATTACKER_CPUS = process.env.ATTACKER_CPUS || "1.0";
const TARGET_MEM = process.env.TOOL_TARGET_MEM || "256m";
const TOOL_TTYD_PORT = 7681; // saldırgan: tarayıcı terminali (ttyd, WebSocket)
const TOOL_VNC_PORT = 6080;  // saldırgan: noVNC masaüstü (GUI araçlar)

// ───────── gerçekçi menzil IP'leri (gömülü/test modu) ─────────
//  Oturum ağına sabit bir subnet ve host-adına göre DETERMİNİSTİK IP veriyoruz:
//  öğrenci `nmap target` yerine `nmap 10.13.37.10` gibi GERÇEK bir IP'ye saldırır.
//  Hostname alias'ları da korunur (hem isim hem IP çözülür). Üretim (macvlan) modu
//  zaten gerçek LAN IP'leri kullanır; bu blok yalnız gömülü saldırgan (test) için.
const LAB_SUBNET = process.env.LAB_RANGE_SUBNET || "10.13.37.0/24";
const LAB_GATEWAY = process.env.LAB_RANGE_GATEWAY || "10.13.37.1";
// host adı → statik IP. Bilinmeyen host adları için ek hedefler .30'dan başlar.
export const LAB_IP_MAP = { attacker: "10.13.37.5", target: "10.13.37.10", victim: "10.13.37.20" };
let _extraHostOctet = 30;
const _extraIps = new Map();
function labIp(host) {
  if (LAB_IP_MAP[host]) return LAB_IP_MAP[host];
  if (!_extraIps.has(host)) _extraIps.set(host, `10.13.37.${_extraHostOctet++}`);
  return _extraIps.get(host);
}
// ping/ICMP cap-drop ALL altında çalışsın: yetkisiz ICMP datagram soketini aç
// (CAP_NET_RAW gerekmez, sandbox gevşemez). iputils-ping bunu otomatik kullanır.
const PING_SYSCTL = ["--sysctl", "net.ipv4.ping_group_range=0 2147483647"];

// ───────── tool lab dağıtım modu (otomatik · Windows + VM dostu) ─────────
//  "bridge" (VARSAYILAN, BYO-VM): sistemde Kali YOK. Hedefler oturuma özel bir
//          bridge ağında başlatılır ve servis portları HOST'a yayımlanır. Öğrenci
//          KENDİ VirtualBox/VMware Kali VM'inden Windows host IP'sine bağlanır.
//          → macvlan GEREKMEZ; Docker Desktop'ta sorunsuz; HİÇBİR LAN ayarı sorulmaz.
//  "macvlan" (gerçek Linux host + fiziksel LAN): hedefler paylaşılan macvlan'da
//          gerçek LAN IP'leriyle açılır. LAB_LAN_* verilmezse → bridge'e düşer (sormaz).
//  "vpn"   (VARSAYILAN, TryHackMe-tarzı): WireGuard sunucusu (ordek-wg) tüneliyle
//          öğrenci KENDİ Kali VM'inden BİR KEZ bağlanır → hedeflere gerçek IP'lerle
//          (ordek_vpn, 10.13.37.0/24) erişir. `nmap -p- <ip>` tam çalışır. WG
//          kurulamazsa (tun/modül yok) sessizce bridge'e düşer.
//  "test"  (geliştirici): gömülü Kali saldırgan kutusu + ttyd/noVNC (test scriptleri).
//  Geriye dönük: "none"/"auto"/boş → vpn.
const RAW_ATTACKER_MODE = String(process.env.LAB_ATTACKER_MODE || "vpn").toLowerCase();
const ATTACKER_MODE =
  RAW_ATTACKER_MODE === "test" ? "test" :
  RAW_ATTACKER_MODE === "macvlan" ? "macvlan" :
  RAW_ATTACKER_MODE === "bridge" ? "bridge" :
  "vpn"; // vpn (VARSAYILAN) | none | auto | "" → vpn; kurulamazsa bridge'e düşer

// bridge: yayımlanan portlar bu IP'ye bağlanır (VM erişebilsin diye 0.0.0.0).
const BRIDGE_BIND = process.env.LAB_BRIDGE_BIND || "0.0.0.0";
// AĞ KEŞFİ: Kali VM, host'a panelin bu portundan geri-bildirim yapar (/api/netinfo).
//  Akademi paneli (Next) varsayılan 3000; proxy (:3001) DEĞİL.
const PANEL_PUBLIC_PORT =
  parseInt(process.env.PANEL_PUBLIC_PORT, 10) || parseInt(process.env.PORT, 10) || 3000;
// bridge: sabit standart portları (80/22/445…) dene; doluysa otomatik dinamiğe düş.
const BRIDGE_FIXED_PORTS = (process.env.LAB_BRIDGE_FIXED_PORTS || "1") === "1";

// ── BAĞLANTI TESTİ (Kali VM erişim doğrulaması) ──
//  Token mantığı saf modülde (lib/conncheck.js) → hem panel hem node testleri import eder.
const CONNCHECK_SLUG = "conncheck";
const CONNCHECK_IMAGE = process.env.TARGET_WEB_IMAGE || "ordek-target-web:latest";
export { verifyConn };

// macvlan (yalnız LAB_ATTACKER_MODE=macvlan): verilmezse bridge'e düşülür.
const LAN_NET = process.env.LAB_LAN_NETWORK || "ordek_lan";  // paylaşılan macvlan ağı
const LAN_SUBNET = process.env.LAB_LAN_SUBNET || "";          // ör. 192.168.1.0/24
const LAN_GATEWAY = process.env.LAB_LAN_GATEWAY || "";        // ör. 192.168.1.1
const LAN_PARENT = process.env.LAB_LAN_PARENT || "";          // ör. eth0
const LAN_IPRANGE = process.env.LAB_LAN_IPRANGE || "";        // DHCP-dışı blok ör. 192.168.1.200/29

// ───────── ortam ayarlı izolasyon / kaynak tavanları ─────────
const TARGET_NET = process.env.LAB_TARGET_NETWORK || ""; // compose iç ağ adı; varsa portsuz + ad ile erişim
const MEM = process.env.MACHINE_MEM || "512m";           // sert bellek tavanı (prod imajda ~192m'ye indirilebilir)
const CPUS = process.env.MACHINE_CPUS || "0.75";
const PIDS = process.env.MACHINE_PIDS || "256";
const READONLY = (process.env.MACHINE_READONLY || "0") === "1"; // yalnız prod imaj + compose ile güvenli
const num = (v, d) => { const n = parseInt(v, 10); return Number.isFinite(n) && n > 0 ? n : d; };
export const MAX_PER_STUDENT = num(process.env.MAX_MACHINES_PER_STUDENT, 1);
export const MAX_TOTAL = num(process.env.MAX_MACHINES_TOTAL, 70);
const IDLE_MS = num(process.env.MACHINE_IDLE_MINUTES, 20) * 60000;
const REAP_EVERY_MS = 60000;

export async function docker(args, timeout = 60000) {
  const { stdout } = await pexec("docker", args, { timeout });
  return stdout.trim();
}

// Docker hatasını ÖĞRENCİ-ANLAŞILIR bir mesaja çevir (genel "docker.sock?" yanıltmasın).
// Bilinen kalıp yoksa null → çağıran genel mesajı kullanır.
export function friendlyDockerError(e) {
  const s = String((e && e.stderr) || (e && e.message) || e || "");
  if (/Unable to find image|pull access denied|repository does not exist|manifest (unknown|for)|No such image/i.test(s)) {
    const img = (s.match(/image ['"]?([\w.\/-]+:[\w.-]+)['"]?/) || s.match(/for ([\w.\/-]+), repository/) || [])[1] || "hedef imajı";
    return `Hedef imajı bulunamadı (${img}). Bu lab için hedef imajlarının derlenmesi gerekir — yönetici: \`docker compose --profile build build\` çalıştırmalı.`;
  }
  if (/Cannot connect to the Docker daemon|permission denied while trying to connect|docker\.sock/i.test(s)) {
    return "Docker'a bağlanılamadı — Docker Desktop açık mı ve panel docker.sock erişimine sahip mi?";
  }
  if (/port is already allocated|address already in use/i.test(s)) {
    return "Gerekli bir host portu meşgul. Çalışan eski hedefleri durdurup tekrar dene.";
  }
  return null;
}

// Docker label/ad güvenli karakterlere indirgenir (virgül parse'ı bozulmasın).
const safeLabel = (s) => String(s || "").replace(/[^a-zA-Z0-9_.-]/g, "_").slice(0, 64);
// Konteyner adı: base64url token bazen `-`/`_` içerir → ad regex'ine uygun.
const genToken = () => crypto.randomBytes(9).toString("base64url");
const containerName = (token) => "ordek-m-" + token;

function parseLine(line) {
  const [id, ports, labels, status] = line.split("\t");
  const g = (re) => (labels.match(re) || [])[1] || null;
  const slug = g(/ordek-lab\.slug=([^,]+)/);
  const level = g(/ordek-lab\.level=([^,]+)/);
  const studentId = g(/ordek-lab\.student=([^,]+)/);
  const studentName = g(/ordek-lab\.studentname=([^,]+)/);
  const token = g(/ordek-lab\.token=([^,]+)/);
  const kind = g(/ordek-lab\.kind=([^,]+)/) || "vuln"; // "vuln" | "tool"
  const port = (ports.match(/:(\d+)->3000\/tcp/) || [])[1] || null;
  return {
    id, slug, level, studentId, studentName, token, port, status, kind,
    // url artık doğrudan değil: panel, request host'undan :3001/api/machines/open linki kurar.
    url: token ? `/api/machines/open?token=${token}` : (port ? `http://localhost:${port}` : null),
    name: slug && MACHINES[slug] ? MACHINES[slug].name : slug,
  };
}

export async function listMachines() {
  const fmt = "{{.ID}}\t{{.Ports}}\t{{.Labels}}\t{{.Status}}";
  const out = await docker(["ps", "--filter", "label=ordek-lab.machine=1", "--format", fmt], 15000);
  const machines = out ? out.split("\n").map(parseLine) : [];
  // Tool lab makinelerini mod + (moda göre) erişim bilgisiyle zenginleştir (panel reload sonrası).
  for (const m of machines) {
    if (m.kind !== "tool") continue;
    m.mode = ATTACKER_MODE === "test" ? "test" : ATTACKER_MODE === "macvlan" ? "prod" : ATTACKER_MODE === "vpn" ? "vpn" : "bridge";
    if (m.mode === "prod" && m.token) {
      m.targetIp = ((await lanIp(targetCName(m.token, "target")).catch(() => "")) || "").trim() || null;
      m.victimIp = ((await lanIp(targetCName(m.token, "victim")).catch(() => "")) || "").trim() || null;
    } else if (m.mode === "vpn" && m.token) {
      // VPN (WireGuard): hedefler ordek_vpn'de gerçek IP alır → oku.
      m.targetIp = ((await lanIp(targetCName(m.token, "target"), VPN_NET).catch(() => "")) || "").trim() || null;
      m.victimIp = ((await lanIp(targetCName(m.token, "victim"), VPN_NET).catch(() => "")) || "").trim() || null;
    } else if (m.mode === "bridge" && m.token) {
      // Yayımlanmış host portlarını (servis → host portu eşlemesi) yeniden çıkar.
      if (m.slug === CONNCHECK_SLUG) {
        m.targetHost = "target";
        m.ports = await connPublishedPort(m.id).catch(() => []);
      } else {
        const spec = TOOL_LABS[m.slug];
        const primary = spec && spec.targets && spec.targets[0];
        if (primary) {
          m.targetHost = primary.hostname;
          m.ports = await publishedPortsFor(m.id, primary.image).catch(() => []);
        }
      }
      m.hostHints = hostHints();
      m.connect = connectInfo(m.hostHints.detected);
    } else if (m.mode === "test") {
      // Gömülü modda IP'ler deterministik (LAB_IP_MAP) — panelin "menzil bilgisi"nde göster.
      m.attackerIp = LAB_IP_MAP.attacker;
      m.targetIp = LAB_IP_MAP.target;
      m.victimIp = LAB_IP_MAP.victim;
    }
  }
  return machines;
}

function runArgs({ slug, level, studentId, studentName, token }) {
  const args = [
    "run", "-d", "--rm",
    "--label", "ordek-lab.machine=1",
    "--label", `ordek-lab.slug=${slug}`,
    "--label", `ordek-lab.level=${level}`,
    "--label", `ordek-lab.token=${token}`,
    // ── kum havuzu: RCE/DoS host'a sıçramasın ──
    "--cap-drop", "ALL",
    "--security-opt", "no-new-privileges",
    // command-injection "ping" aracı GERÇEKTEN ping atsın (cap eklemeden, yetkisiz ICMP).
    ...PING_SYSCTL,
    "--pids-limit", String(PIDS),
    "--memory", MEM, "--memory-swap", MEM,
    "--cpus", String(CPUS),
    "-e", `LAB_MACHINE=${slug}`,
    "-e", `LAB_FORCE_LEVEL=${level}`,
  ];
  if (studentId) args.push("--label", `ordek-lab.student=${safeLabel(studentId)}`);
  if (studentName) args.push("--label", `ordek-lab.studentname=${safeLabel(studentName)}`);
  if (READONLY) {
    args.push("--read-only",
      "--tmpfs", "/tmp", "--tmpfs", "/run",
      "--tmpfs", "/app/.next/cache",
      "--tmpfs", "/app/uploads",
      "--tmpfs", "/app/prisma",
      "--tmpfs", "/app/data");
  }
  if (TARGET_NET) {
    // compose: ağ-izole (egress yok), HOST PORTU YOK, ad ile erişim
    args.push("--network", TARGET_NET, "--name", containerName(token));
  } else {
    // host-dev fallback: yalnız 127.0.0.1'e yayınla (LAN'a değil)
    args.push("-p", "127.0.0.1:0:3000");
  }
  args.push(IMAGE);
  return args;
}

async function hostPort(id) {
  return docker(["inspect", "--format", '{{(index (index .NetworkSettings.Ports "3000/tcp") 0).HostPort}}', id], 15000);
}

// ───────── eşzamanlılık / kaynak limiti ─────────
async function countMachines() {
  const out = await docker(["ps", "-q", "--filter", "label=ordek-lab.machine=1"], 15000);
  return out ? out.split("\n").filter(Boolean).length : 0;
}
async function studentMachineIds(studentId) {
  const out = await docker(["ps", "-q",
    "--filter", "label=ordek-lab.machine=1",
    "--filter", `label=ordek-lab.student=${safeLabel(studentId)}`], 15000);
  return out ? out.split("\n").filter(Boolean) : [];
}

// Aynı slug+level (+student) için eskisini kaldır → deep-freeze taze başlangıç
export async function startMachine({ slug, level, studentId, studentName }) {
  // Gerçek-araç labı ise çok-konteynerli menzili kur (saldırgan + hedefler).
  if (isToolLab(slug)) return startToolLab({ slug, studentId, studentName });
  // Global tavan
  if (MAX_TOTAL > 0 && (await countMachines()) >= MAX_TOTAL) {
    const e = new Error("full"); e.full = true;
    e.userMessage = "Sınıf şu an dolu (çalışan makine sınırı). Birazdan tekrar dene.";
    throw e;
  }
  // Öğrenci başına tavan: yeni makine başlatınca kendi eski makinelerini durdur
  if (studentId && MAX_PER_STUDENT > 0) {
    const mine = await studentMachineIds(studentId);
    if (mine.length >= MAX_PER_STUDENT) {
      for (const cid of mine) await docker(["rm", "-f", cid], 20000).catch(() => {});
    }
  }
  // Aynı slug+level (+student) varsa kaldır (deep-freeze)
  const filters = ["ps", "-q", "--filter", `label=ordek-lab.slug=${slug}`, "--filter", `label=ordek-lab.level=${level}`];
  if (studentId) filters.push("--filter", `label=ordek-lab.student=${safeLabel(studentId)}`);
  const existing = await docker(filters, 15000);
  if (existing) { for (const cid of existing.split("\n")) await docker(["rm", "-f", cid], 20000).catch(() => {}); }

  const token = genToken();
  const id = await docker(runArgs({ slug, level, studentId, studentName, token }), 60000);
  touch(token);
  ensureReaper();
  const port = TARGET_NET ? null : await hostPort(id).catch(() => null);
  return {
    id, slug, level, token, port, status: "starting",
    url: `/api/machines/open?token=${token}`,
    name: MACHINES[slug].name,
  };
}

export async function stopMachine(id) {
  // Tool lab ise: token'a bağlı TÜM konteynerleri + oturum ağını temizle.
  const meta = await docker(
    ["inspect", "--format", '{{index .Config.Labels "ordek-lab.token"}}\t{{index .Config.Labels "ordek-lab.kind"}}', id], 15000
  ).catch(() => "");
  const [tk, kind] = (meta || "").split("\t");
  if (kind === "tool" && tk) { await removeToolGroup(tk); return { ok: true, stopped: id, group: tk }; }
  await docker(["rm", "-f", id], 25000);
  return { ok: true, stopped: id };
}

// ─────────────────────────────────────────────────────────────────────────
//  GERÇEK ARAÇ LABI — çok-konteynerli izole menzil (saldırgan + hedefler).
//  Saldırgan: ordek-a-<token> (ttyd :7681 + noVNC :6080). Proxy buna yönlenir.
//  Hedefler: ordek-t-<token>-<host>, yalnız oturum ağında (proxy erişemez).
//  Saldırgan iki ağda: oturum ağı (hedeflere erişim) + TARGET_NET (proxy erişimi).
// ─────────────────────────────────────────────────────────────────────────
const labNet = (token) => "ordek-lab-" + token;
const attackerName = (token) => "ordek-a-" + token;
const targetCName = (token, host) => `ordek-t-${token}-${host}`;

async function removeToolGroup(token) {
  const ids = await docker(["ps", "-aq", "--filter", `label=ordek-lab.token=${token}`], 15000).catch(() => "");
  if (ids) { for (const cid of ids.split("\n").filter(Boolean)) await docker(["rm", "-f", cid], 20000).catch(() => {}); }
  await docker(["network", "rm", labNet(token)], 15000).catch(() => {});
  lastSeen.delete(token);
}

function attackerRunArgs({ slug, token, studentId, studentName }) {
  const spec = TOOL_LABS[slug] || {};
  const net = labNet(token);
  const args = [
    "run", "-d", "--rm",
    "--name", attackerName(token),
    "--hostname", "kali",
    "--label", "ordek-lab.machine=1",          // listMachines yalnız saldırganı "makine" sayar
    "--label", `ordek-lab.slug=${slug}`,
    "--label", "ordek-lab.level=lab",
    "--label", `ordek-lab.token=${token}`,
    "--label", "ordek-lab.kind=tool",
    "--label", "ordek-lab.role=attacker",
    // Saldırgan kutusu gerçek araçlar çalıştırır: nmap'in setcap'li binary'si
    // (cap_net_admin+net_raw=eip) ve MITM araçları için bu cap'ler bounding set'te
    // olmalı. no-new-privileges KULLANILMAZ → aksi halde nmap exec'te EPERM verir.
    // Kum havuzu: docker.sock YOK + egress YOK (internal ağ) + mem/cpu/pids tavanı.
    "--cap-add", "NET_RAW", "--cap-add", "NET_ADMIN",
    // In-path sniff/MITM için IP forwarding (wireshark/tcpdump kurban yönlendirmesi + bettercap).
    "--sysctl", "net.ipv4.ip_forward=1",
    ...PING_SYSCTL,
    "--pids-limit", "512",
    "--memory", ATTACKER_MEM, "--memory-swap", ATTACKER_MEM,
    "--cpus", String(ATTACKER_CPUS),
    "-e", `LAB_FLAG=${FLAGS[slug] || ""}`,
    "-e", `LAB_SCENARIO=${slug}`,
    "-e", `LAB_GUI=${spec.gui ? "1" : "0"}`,
  ];
  if (studentId) args.push("--label", `ordek-lab.student=${safeLabel(studentId)}`);
  if (studentName) args.push("--label", `ordek-lab.studentname=${safeLabel(studentName)}`);
  // Statik IP + alias: saldırgan kutusu menzilde sabit .5 adresinde durur.
  args.push("--network", net, "--ip", labIp("attacker"), "--network-alias", "attacker");
  args.push(ATTACKER_IMAGE);
  return args;
}

function targetRunArgs({ slug, token, target }) {
  const net = labNet(token);
  const victimTo = target.victimTarget === "attacker" ? "attacker" : "target";
  const args = [
    "run", "-d", "--rm",
    "--name", targetCName(token, target.hostname),
    "--label", `ordek-lab.token=${token}`,
    "--label", "ordek-lab.kind=tool",
    "--label", "ordek-lab.role=target",
    "--label", `ordek-lab.slug=${slug}`,
    "--pids-limit", "256",
    "--memory", TARGET_MEM, "--memory-swap", TARGET_MEM,
    "--cpus", "0.5",
    "-e", `LAB_FLAG=${FLAGS[slug] || ""}`,
    "-e", `LAB_SCENARIO=${slug}`,
    "-e", `VICTIM_TARGET=${victimTo}`,
  ];
  // Pasif sniff labları: kurban hedefe saldırgan ÜZERİNDEN yönlensin (in-path capture).
  if (target.victimRoute) {
    args.push("-e", "VICTIM_ROUTE_VIA=attacker", "--cap-add", "NET_ADMIN");
  } else {
    args.push("--security-opt", "no-new-privileges");
  }
  // Hedef de gerçekçi ICMP cevabı versin (ping yanıtı), cap eklemeden.
  args.push(...PING_SYSCTL);
  // Statik IP + alias: hedef menzilde sabit IP'de (ör. .10) durur → `nmap 10.13.37.10`.
  const ip = target.ip || labIp(target.hostname);
  args.push("--network", net, "--ip", ip, "--network-alias", target.hostname, target.image);
  return args;
}

// Dağıtıcı: vpn (VARSAYILAN, WireGuard) | macvlan (Linux LAN) | test (gömülü Kali) | bridge.
export async function startToolLab(args) {
  if (ATTACKER_MODE === "test") return startToolLabTest(args);
  if (ATTACKER_MODE === "macvlan") return startToolLabProd(args);
  if (ATTACKER_MODE === "vpn") return startToolLabVpn(args);
  return startToolLabBridge(args);
}

// ── VPN (WireGuard, VARSAYILAN): paylaşılan ordek_vpn ağında yalnız HEDEF(ler);
//    saldırgan YOK (öğrenci KENDİ Kali'sinden tünelle bağlanır). prod yolunun ikizi
//    ama ağ = ordek_vpn ve önce WireGuard sunucusu garanti edilir. WG kurulamazsa
//    (tun/modül/imaj yok) sessizce bridge'e düşer (kullanıcıya sorulmaz). ──
async function startToolLabVpn({ slug, studentId, studentName }) {
  const spec = TOOL_LABS[slug];
  if (!spec) { const e = new Error("unknown tool lab"); throw e; }
  if (!spec.targets || spec.targets.length === 0) {
    const e = new Error("no-box-lab"); e.userMessage = "Bu lab makine gerektirmez (loot/no-box)."; throw e;
  }
  if (MAX_TOTAL > 0 && (await countMachines()) >= MAX_TOTAL) {
    const e = new Error("full"); e.full = true;
    e.userMessage = "Sınıf şu an dolu (çalışan makine sınırı). Birazdan tekrar dene.";
    throw e;
  }
  if (studentId && MAX_PER_STUDENT > 0) {
    for (const m of await listMachines()) {
      if (m.studentId === safeLabel(studentId) && m.token) await removeToolGroup(m.token);
    }
  }
  // WireGuard sunucusu/ağı yoksa (Docker Desktop tun/modül yok vb.) bridge'e düş.
  if (!(await ensureVpnServer())) {
    console.warn("[ordek] WireGuard sunucusu yok/kurulamadı → bridge (BYO-VM) moduna düşülüyor.");
    return startToolLabBridge({ slug, studentId, studentName });
  }
  const token = genToken();
  try {
    let primaryId = null;
    const targets = spec.targets;
    for (let i = 0; i < targets.length; i++) {
      const id = await docker(prodTargetArgs({ slug, token, target: targets[i], primary: i === 0, studentId, studentName, net: VPN_NET }), 60000);
      if (i === 0) primaryId = id;
    }
    touch(token);
    ensureReaper();
    const targetIp = (((await lanIp(targetCName(token, "target"), VPN_NET).catch(() => "")) || "").trim()) || null;
    const victimIp = targets.some((t) => t.hostname === "victim")
      ? (((await lanIp(targetCName(token, "victim"), VPN_NET).catch(() => "")) || "").trim() || null) : null;
    // Sınıf izolasyonu: öğrenci yalnız KENDİ hedefine ulaşsın (self-healing senkron).
    await syncVpnIsolation().catch(() => {});
    return {
      id: primaryId, slug, level: "lab", token, kind: "tool", mode: "vpn", status: "running",
      targetIp, victimIp, name: slug,
    };
  } catch (e) {
    await removeToolGroup(token).catch(() => {});
    throw e;
  }
}

// Sınıf modunda iptables izolasyonunu çalışan VPN hedeflerine göre yeniden kur
//  (flush + her öğrencinin VPN IP'si ↔ kendi hedef IP'leri ACCEPT; gerisi DROP).
//  Self-healing: durmuş hedeflerin kuralları flush ile temizlenir.
async function syncVpnIsolation() {
  if (process.env.LAB_MODE !== "class" || ATTACKER_MODE !== "vpn") return;
  await ensureClassIsolation().catch(() => {});
  await flushIsolation().catch(() => {});
  const ms = await listMachines().catch(() => []);
  for (const m of ms) {
    if (m.mode !== "vpn" || !m.token) continue;
    const vip = vpnIpOf(m.studentId);
    if (!vip) continue;
    if (m.targetIp) await allowPair(vip, m.targetIp).catch(() => {});
    if (m.victimIp) await allowPair(vip, m.victimIp).catch(() => {});
  }
}

async function startToolLabTest({ slug, studentId, studentName }) {
  const spec = TOOL_LABS[slug];
  if (!spec) { const e = new Error("unknown tool lab"); throw e; }
  // Global tavan (saldırgan + hedefler birden çok konteyner sayılır)
  if (MAX_TOTAL > 0 && (await countMachines()) >= MAX_TOTAL) {
    const e = new Error("full"); e.full = true;
    e.userMessage = "Sınıf şu an dolu (çalışan makine sınırı). Birazdan tekrar dene.";
    throw e;
  }
  // Öğrenci başına tavan: yeni lab açınca eski makinelerini (grup dahil) durdur.
  if (studentId && MAX_PER_STUDENT > 0) {
    const mine = await listMachines();
    for (const m of mine) {
      if (m.studentId === safeLabel(studentId)) {
        if (m.kind === "tool" && m.token) await removeToolGroup(m.token);
        else await docker(["rm", "-f", m.id], 20000).catch(() => {});
      }
    }
  }

  const token = genToken();
  const net = labNet(token);
  try {
    // 1) Oturuma özel iç ağ (egress yok) — sabit subnet ki hedeflere gerçekçi statik IP verelim.
    await docker(["network", "create", "--internal", "--subnet", LAB_SUBNET, "--gateway", LAB_GATEWAY, net], 30000).catch(() => {});
    // 2) Hedefleri başlat (sabit hostname alias'larıyla)
    for (const target of (spec.targets || [])) {
      await docker(targetRunArgs({ slug, token, target }), 60000);
    }
    // 3) Saldırgan kutusunu başlat
    const id = await docker(attackerRunArgs({ slug, token, studentId, studentName }), 90000);
    // 4) Saldırganı proxy ağına da bağla (proxy ordek-a-<token>'a erişsin)
    if (TARGET_NET) await docker(["network", "connect", TARGET_NET, attackerName(token)], 30000).catch(() => {});
    touch(token);
    ensureReaper();
    return {
      id, slug, level: "lab", token, kind: "tool", status: "starting",
      url: `/api/machines/open?token=${token}`,
      name: slug,
    };
  } catch (e) {
    await removeToolGroup(token).catch(() => {});
    throw e;
  }
}

// ── macvlan (gerçek Linux LAN): paylaşılan ağda yalnız HEDEF(ler), saldırgan YOK ──
//  LAN_SUBNET+LAN_PARENT verilmemişse macvlan kurulamaz → false döner; çağıran
//  bridge moduna düşer (kullanıcıya hiçbir şey sorulmaz, hata bandı basılmaz).
async function ensureLanNetwork() {
  const out = await docker(["network", "ls", "--filter", `name=^${LAN_NET}$`, "--format", "{{.Name}}"], 15000).catch(() => "");
  if (out.split("\n").includes(LAN_NET)) return true;
  if (!LAN_SUBNET || !LAN_PARENT) return false; // → bridge fallback
  const args = ["network", "create", "-d", "macvlan", "--subnet", LAN_SUBNET];
  if (LAN_GATEWAY) args.push("--gateway", LAN_GATEWAY);
  if (LAN_IPRANGE) args.push("--ip-range", LAN_IPRANGE);
  args.push("-o", `parent=${LAN_PARENT}`, LAN_NET);
  try { await docker(args, 30000); return true; }
  catch { return false; } // macvlan desteklenmiyorsa (ör. Docker Desktop) → bridge
}

async function lanIp(name, net = LAN_NET) {
  return docker(["inspect", "--format", `{{ (index .NetworkSettings.Networks "${net}").IPAddress }}`, name], 15000).catch(() => "");
}

function prodTargetArgs({ slug, token, target, primary, studentId, studentName, net = LAN_NET }) {
  const victimTo = target.victimTarget === "attacker" ? "attacker" : "target";
  const args = [
    "run", "-d", "--rm",
    "--name", targetCName(token, target.hostname),
    "--label", `ordek-lab.token=${token}`,
    "--label", "ordek-lab.kind=tool",
    "--label", `ordek-lab.slug=${slug}`,
    "--label", primary ? "ordek-lab.machine=1" : "ordek-lab.role=target",
    "--pids-limit", "256",
    "--memory", TARGET_MEM, "--memory-swap", TARGET_MEM,
    "--cpus", "0.5",
    "-e", `LAB_FLAG=${FLAGS[slug] || ""}`,
    "-e", `LAB_SCENARIO=${slug}`,
    "-e", `VICTIM_TARGET=${victimTo}`,
  ];
  if (primary && studentId) args.push("--label", `ordek-lab.student=${safeLabel(studentId)}`);
  if (primary && studentName) args.push("--label", `ordek-lab.studentname=${safeLabel(studentName)}`);
  args.push("--network", net, "--network-alias", target.hostname, target.image);
  return args;
}

async function startToolLabProd({ slug, studentId, studentName }) {
  const spec = TOOL_LABS[slug];
  if (!spec) { const e = new Error("unknown tool lab"); throw e; }
  if (!spec.targets || spec.targets.length === 0) {
    // loot/noBox lablar üretimde konteyner gerektirmez (panel: indir / kendi terminali).
    const e = new Error("no-box-lab"); e.userMessage = "Bu lab makine gerektirmez."; throw e;
  }
  if (MAX_TOTAL > 0 && (await countMachines()) >= MAX_TOTAL) {
    const e = new Error("full"); e.full = true;
    e.userMessage = "Sınıf şu an dolu (çalışan makine sınırı). Birazdan tekrar dene.";
    throw e;
  }
  // Öğrenci başına tavan: eski grubu(nu) temizle
  if (studentId && MAX_PER_STUDENT > 0) {
    for (const m of await listMachines()) {
      if (m.studentId === safeLabel(studentId) && m.token) await removeToolGroup(m.token);
    }
  }

  // macvlan kurulamıyorsa (config yok / Docker Desktop) sessizce bridge moduna düş.
  if (!(await ensureLanNetwork())) {
    console.warn("[ordek] macvlan LAN yok/kurulamadı → bridge (BYO-VM) moduna düşülüyor.");
    return startToolLabBridge({ slug, studentId, studentName });
  }
  const token = genToken();
  try {
    let primaryId = null;
    const targets = spec.targets;
    for (let i = 0; i < targets.length; i++) {
      const id = await docker(prodTargetArgs({ slug, token, target: targets[i], primary: i === 0, studentId, studentName }), 60000);
      if (i === 0) primaryId = id;
    }
    touch(token);
    ensureReaper();
    const targetIp = await lanIp(targetCName(token, "target")).catch(() => "");
    const victimIp = targets.some(t => t.hostname === "victim") ? await lanIp(targetCName(token, "victim")).catch(() => "") : "";
    return {
      id: primaryId, slug, level: "lab", token, kind: "tool", mode: "prod", status: "running",
      targetIp: (targetIp || "").trim() || null,
      victimIp: (victimIp || "").trim() || null,
      name: slug,
    };
  } catch (e) {
    await removeToolGroup(token).catch(() => {});
    throw e;
  }
}

// ─────────────────────────────────────────────────────────────────────────
//  BRIDGE (BYO-VM) — VARSAYILAN. Windows Docker Desktop + VirtualBox/VMware Kali.
//  macvlan YOK: hedefler oturuma özel bir bridge ağında (isim çözümü açık) başlar
//  ve servis portları HOST'a (0.0.0.0) yayımlanır. Öğrenci KENDİ Kali VM'inden
//  Windows host IP'sine bu portlardan bağlanır (NAT 10.0.2.2 / bridged LAN IP /
//  host-only .1). Hiçbir LAN ayarı sorulmaz; tek tıkla otomatik kurulur.
// ─────────────────────────────────────────────────────────────────────────

// Konteyner port haritasını oku → [{label, proto, container, host}]. host=null ise atanmadı.
async function publishedPortsFor(id, image) {
  const want = targetPorts(image);
  if (!want.length) return [];
  const raw = await docker(["inspect", "--format", "{{json .NetworkSettings.Ports}}", id], 15000).catch(() => "");
  let map = {}; try { map = JSON.parse(raw || "{}"); } catch { map = {}; }
  return want.map((p) => {
    const b = (map[`${p.port}/${p.proto}`] || []).find((x) => x && x.HostPort) || null;
    return { label: p.label, proto: p.proto, container: p.port, host: b ? parseInt(b.HostPort, 10) : null };
  });
}

// Öğrenciye "hangi IP'ye bağlanayım?" rehberi: tespit edilen + bilinen VM ağ geçitleri.
function hostHints() {
  const detected = [];
  try {
    const ifs = os.networkInterfaces();
    for (const list of Object.values(ifs)) {
      for (const a of list || []) {
        // dış IPv4'ler; docker'ın iç köprü blokları (172.16-31, 10.13.37) gürültüsünü ele.
        if (a.family === "IPv4" && !a.internal && !/^172\.(1[6-9]|2\d|3[01])\./.test(a.address) && !a.address.startsWith("10.13.37.")) {
          detected.push(a.address);
        }
      }
    }
  } catch { /* yok say */ }
  return {
    detected,
    vm: [
      { net: "VirtualBox · NAT (varsayılan)", host: "10.0.2.2" },
      { net: "VirtualBox · Host-Only", host: "192.168.56.1" },
      { net: "VMware · NAT", host: "192.168.x.2" },
      { net: "Bridged (her ikisi)", host: "Windows host LAN IP (ipconfig)" },
    ],
  };
}

// AĞ KEŞFİ bağlantı bilgisi: Kali'nin deneyeceği aday host adresleri + panel portu.
//  detected = hostHints().detected. Panel bunu keşif script'ini kurmak ve
//  öğrenilen adresi göstermek için kullanır.
function connectInfo(detected) {
  return { candidates: hostCandidates(detected || []), panelPort: PANEL_PUBLIC_PORT };
}

function bridgeTargetArgs({ slug, token, target, primary, studentId, studentName, fixed }) {
  const net = labNet(token);
  const victimTo = target.victimTarget === "attacker" ? "attacker" : "target";
  const args = [
    "run", "-d", "--rm",
    "--name", targetCName(token, target.hostname),
    "--label", `ordek-lab.token=${token}`,
    "--label", "ordek-lab.kind=tool",
    "--label", `ordek-lab.slug=${slug}`,
    "--label", primary ? "ordek-lab.machine=1" : "ordek-lab.role=target",
    "--pids-limit", "256",
    "--memory", TARGET_MEM, "--memory-swap", TARGET_MEM,
    "--cpus", "0.5",
    "-e", `LAB_FLAG=${FLAGS[slug] || ""}`,
    "-e", `LAB_SCENARIO=${slug}`,
    "-e", `VICTIM_TARGET=${victimTo}`,
  ];
  if (primary && studentId) args.push("--label", `ordek-lab.student=${safeLabel(studentId)}`);
  if (primary && studentName) args.push("--label", `ordek-lab.studentname=${safeLabel(studentName)}`);
  if (target.victimRoute) args.push("-e", "VICTIM_ROUTE_VIA=attacker", "--cap-add", "NET_ADMIN");
  else args.push("--security-opt", "no-new-privileges");
  args.push(...PING_SYSCTL);
  // Servis portlarını HOST'a yayımla. fixed: host=container; değilse dinamik (ephemeral).
  for (const p of targetPorts(target.image)) {
    const hostPart = fixed ? String(p.port) : "";
    args.push("-p", `${BRIDGE_BIND}:${hostPart}:${p.port}/${p.proto}`);
  }
  args.push("--network", net, "--network-alias", target.hostname, target.image);
  return args;
}

// Sabit standart portları (80/22/445…) dene; çakışırsa otomatik dinamik porta düş.
//  İki çakışma biçimi de ele alınır:
//   1) `docker run` "port already allocated" ile patlar → dinamik portla yeniden dene.
//   2) Windows'ta 80/443/445/53 gibi SİSTEM portları: Docker Desktop run'ı patlatmaz,
//      bağlamayı SESSİZCE düşürür (host=null) → tespit edip o hedefi dinamikle yeniden kur.
async function runBridgeTarget(opts) {
  const wanted = targetPorts(opts.target.image);
  let id;
  try {
    id = await docker(bridgeTargetArgs({ ...opts, fixed: BRIDGE_FIXED_PORTS }), 60000);
  } catch (e) {
    const msg = String((e && e.stderr) || (e && e.message) || "");
    if (BRIDGE_FIXED_PORTS && /already allocated|already in use|bind/i.test(msg)) {
      return docker(bridgeTargetArgs({ ...opts, fixed: false }), 60000);
    }
    throw e;
  }
  if (BRIDGE_FIXED_PORTS && wanted.length) {
    const got = await publishedPortsFor(id, opts.target.image).catch(() => []);
    if (got.some((p) => p.host == null)) {
      await docker(["rm", "-f", id], 20000).catch(() => {});
      return docker(bridgeTargetArgs({ ...opts, fixed: false }), 60000);
    }
  }
  return id;
}

async function startToolLabBridge({ slug, studentId, studentName }) {
  const spec = TOOL_LABS[slug];
  if (!spec) { const e = new Error("unknown tool lab"); throw e; }
  if (!spec.targets || spec.targets.length === 0) {
    const e = new Error("no-box-lab"); e.userMessage = "Bu lab makine gerektirmez (loot/no-box)."; throw e;
  }
  if (MAX_TOTAL > 0 && (await countMachines()) >= MAX_TOTAL) {
    const e = new Error("full"); e.full = true;
    e.userMessage = "Sınıf şu an dolu (çalışan makine sınırı). Birazdan tekrar dene.";
    throw e;
  }
  if (studentId && MAX_PER_STUDENT > 0) {
    for (const m of await listMachines()) {
      if (m.studentId === safeLabel(studentId) && m.token) await removeToolGroup(m.token);
    }
  }

  const token = genToken();
  const net = labNet(token);
  try {
    // Oturum bridge ağı (INTERNAL DEĞİL → port yayımlanabilir + konteynerler isimle konuşur).
    await docker(["network", "create", net], 30000).catch(() => {});
    const targets = spec.targets;
    let primaryId = null;
    for (let i = 0; i < targets.length; i++) {
      const id = await runBridgeTarget({ slug, token, target: targets[i], primary: i === 0, studentId, studentName });
      if (i === 0) primaryId = id;
    }
    touch(token);
    ensureReaper();
    const ports = await publishedPortsFor(primaryId, targets[0].image).catch(() => []);
    const hh = hostHints();
    return {
      id: primaryId, slug, level: "lab", token, kind: "tool", mode: "bridge", status: "running",
      targetHost: targets[0].hostname,
      ports, hostHints: hh, connect: connectInfo(hh.detected),
      name: slug,
    };
  } catch (e) {
    await removeToolGroup(token).catch(() => {});
    throw e;
  }
}

// conncheck hedefi tek port (80) yayımlar → yalnız onu oku.
async function connPublishedPort(id) {
  const raw = await docker(["inspect", "--format", "{{json .NetworkSettings.Ports}}", id], 15000).catch(() => "");
  let map = {}; try { map = JSON.parse(raw || "{}"); } catch { map = {}; }
  const b = (map["80/tcp"] || []).find((x) => x && x.HostPort) || null;
  return [{ label: "http (bağlantı testi)", proto: "tcp", container: 80, host: b ? parseInt(b.HostPort, 10) : null }];
}

// Bağlantı testi hedefini başlat (bridge): web imajı + conncheck senaryosu, tek port dinamik.
export async function startConnCheck({ studentId, studentName } = {}) {
  if (MAX_TOTAL > 0 && (await countMachines()) >= MAX_TOTAL) {
    const e = new Error("full"); e.full = true;
    e.userMessage = "Sınıf şu an dolu (çalışan makine sınırı). Birazdan tekrar dene.";
    throw e;
  }
  // Yalnızca aynı öğrencinin önceki conncheck'ini temizle — tool labına dokunma.
  const filt = ["ps", "-aq", "--filter", `label=ordek-lab.slug=${CONNCHECK_SLUG}`];
  if (studentId) filt.push("--filter", `label=ordek-lab.student=${safeLabel(studentId)}`);
  const old = await docker(filt, 15000).catch(() => "");
  if (old) {
    for (const cid of old.split("\n").filter(Boolean)) {
      const tk = (await docker(["inspect", "--format", '{{index .Config.Labels "ordek-lab.token"}}', cid], 15000).catch(() => "") || "").trim();
      if (tk) await removeToolGroup(tk); else await docker(["rm", "-f", cid], 15000).catch(() => {});
    }
  }

  const token = genToken();
  const net = labNet(token);
  try {
    await docker(["network", "create", net], 30000).catch(() => {});
    const args = [
      "run", "-d", "--rm",
      "--name", targetCName(token, "target"),
      "--label", "ordek-lab.machine=1",
      "--label", `ordek-lab.slug=${CONNCHECK_SLUG}`,
      "--label", "ordek-lab.level=lab",
      "--label", `ordek-lab.token=${token}`,
      "--label", "ordek-lab.kind=tool",
      "--label", "ordek-lab.role=target",
      "--cap-drop", "ALL",
      "--security-opt", "no-new-privileges",
      ...PING_SYSCTL,
      "--pids-limit", "128",
      "--memory", TARGET_MEM, "--memory-swap", TARGET_MEM,
      "--cpus", "0.5",
      "-e", "LAB_SCENARIO=conncheck",
      "-e", `CONN_TOKEN=${connToken(token)}`,
    ];
    if (studentId) args.push("--label", `ordek-lab.student=${safeLabel(studentId)}`);
    if (studentName) args.push("--label", `ordek-lab.studentname=${safeLabel(studentName)}`);
    args.push("-p", `${BRIDGE_BIND}::80/tcp`);                  // tek port, dinamik → Windows çakışması yok
    args.push("--network", net, "--network-alias", "target", CONNCHECK_IMAGE);
    const id = await docker(args, 60000);
    touch(token);
    ensureReaper();
    const hh = hostHints();
    return {
      id, slug: CONNCHECK_SLUG, level: "lab", token, kind: "tool", mode: "bridge", status: "running",
      targetHost: "target",
      ports: await connPublishedPort(id).catch(() => []),
      hostHints: hh, connect: connectInfo(hh.detected),
    };
  } catch (e) {
    await removeToolGroup(token).catch(() => {});
    throw e;
  }
}

export async function restartToolLab({ slug, studentId, studentName, id }) {
  // id (saldırgan) → token bul, grubu temizle, taze kur.
  const meta = await docker(["inspect", "--format", '{{index .Config.Labels "ordek-lab.token"}}', id], 15000).catch(() => "");
  const tk = (meta || "").trim();
  if (tk) await removeToolGroup(tk);
  return startToolLab({ slug, studentId, studentName });
}

export async function restartMachine({ id, slug, level, studentId, studentName }) {
  await docker(["rm", "-f", id], 25000).catch(() => {});
  const token = genToken();
  const nid = await docker(runArgs({ slug, level, studentId, studentName, token }), 60000);
  touch(token);
  ensureReaper();
  const port = TARGET_NET ? null : await hostPort(nid).catch(() => null);
  return { id: nid, slug, level, token, port, status: "starting", url: `/api/machines/open?token=${token}` };
}

// ───────── token çözümleme (proxy bunu kullanır) ─────────
// { ownerId, target } | null. target: proxy'nin ileteceği iç adres.
export async function resolveTarget(token) {
  if (!token || !/^[A-Za-z0-9_-]{6,64}$/.test(token)) return null;
  const fmt = "{{.ID}}\t{{.Ports}}\t{{.Labels}}\t{{.Status}}";
  const out = await docker(["ps",
    "--filter", "label=ordek-lab.machine=1",
    "--filter", `label=ordek-lab.token=${token}`,
    "--format", fmt], 15000).catch(() => "");
  if (!out) return null;
  const m = parseLine(out.split("\n")[0]);
  // Tool lab: proxy saldırganın ttyd'sine (terminal) yönlenir; /desktop → noVNC.
  if (m.kind === "tool") {
    const host = attackerName(token);
    return {
      ownerId: m.studentId || null, slug: m.slug, level: m.level, kind: "tool",
      target: `http://${host}:${TOOL_TTYD_PORT}`,
      desktop: `http://${host}:${TOOL_VNC_PORT}`,
    };
  }
  const target = TARGET_NET
    ? `http://${containerName(token)}:3000`
    : (m.port ? `http://127.0.0.1:${m.port}` : null);
  if (!target) return null;
  return { ownerId: m.studentId || null, slug: m.slug, level: m.level, kind: "vuln", target };
}

// ───────── etkinlik takibi + idle reaper ─────────
const lastSeen = new Map(); // token -> ms
export function touch(token) { if (token) lastSeen.set(token, Date.now()); }

let reaperTimer = null;
function ensureReaper() {
  if (reaperTimer || !IDLE_MS) return;
  reaperTimer = setInterval(reapIdle, REAP_EVERY_MS);
  if (reaperTimer.unref) reaperTimer.unref();
}
async function reapIdle() {
  try {
    const machines = await listMachines();
    const now = Date.now();
    for (const m of machines) {
      if (!m.token) continue;
      const seen = lastSeen.get(m.token);
      // İlk görülme zamanı yoksa (panel yeniden başladı) şimdi say → bir tur daha yaşa.
      if (seen == null) { lastSeen.set(m.token, now); continue; }
      if (now - seen > IDLE_MS) {
        if (m.kind === "tool") await removeToolGroup(m.token);
        else { await docker(["rm", "-f", m.id], 20000).catch(() => {}); lastSeen.delete(m.token); }
      }
    }
  } catch { /* docker yoksa sessiz geç */ }
}

export { MACHINE_SLUGS };
