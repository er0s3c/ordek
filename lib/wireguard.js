// ============================================================================
//  lib/wireguard.js — TryHackMe-tarzı WireGuard erişim sunucusu (SUNUCU-ONLY).
//  Öğrenci panelden bir `.conf` indirir, KENDİ Kali VM'inde `wg-quick up` ile
//  tek sefer bağlanır → izole lab ağına (ordek_vpn) GERÇEK IP'lerle erişir:
//  `nmap -p- 10.13.37.10` tam olarak hedefin portlarını gösterir (host taraması YOK).
//
//  Mimari (iki ayrı subnet — çakışma yok):
//    • Tünel:  10.13.38.0/24  (sunucu wg0 = .1, istemciler .2+; panel atar → IP'yi BİLİR)
//    • Lab:    10.13.37.0/24  (Docker bridge `ordek_vpn`; wg konteyneri + hedefler)
//  wg konteyneri tünel istemcilerini lab ağına MASQUERADE'ler. İstemci config'i
//  AllowedIPs = lab+tünel subnet → lab trafiği tünelden gider.
//
//  ⚠ Döngüsel import yok: docker.js bu modülü import eder; bu modül kendi `dx()`
//     (execFile docker) yardımcısını kullanır, docker.js'i import ETMEZ.
//  Saf yardımcılar (allocVpnIp/clientConfText/...) `node test` ile test edilir.
// ============================================================================
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs";
import path from "node:path";

const pexec = promisify(execFile);

// ───────── yapılandırma ─────────
export const VPN_NET = process.env.LAB_VPN_NETWORK || "ordek_vpn";
export const VPN_LAB_SUBNET = process.env.LAB_VPN_LAB_SUBNET || "10.13.37.0/24";
export const VPN_LAB_GATEWAY = process.env.LAB_VPN_LAB_GATEWAY || "10.13.37.1";
export const VPN_TUN_SUBNET = process.env.LAB_VPN_TUN_SUBNET || "10.13.38.0/24";
export const VPN_SERVER_TUN_IP = process.env.LAB_VPN_SERVER_IP || "10.13.38.1";
export const VPN_PORT = parseInt(process.env.LAB_VPN_PORT, 10) || 51820;
const VPN_IMAGE = process.env.WG_IMAGE || "ordek-wg:latest";
const WG_CONTAINER = process.env.WG_CONTAINER || "ordek-wg";
// İstemci config'inde Endpoint = <host-ip>:<port>. Varsayılan VirtualBox NAT (10.0.2.2);
// panel tespit edilen LAN IP'leriyle ?endpoint= override sunar.
export const VPN_ENDPOINT_DEFAULT = process.env.LAB_VPN_ENDPOINT || "10.0.2.2";

const DATA_DIR = process.env.LAB_DATA_DIR || path.join(process.cwd(), "data");
const WG_DIR = path.join(DATA_DIR, "wireguard");
const PEERS_FILE = path.join(WG_DIR, "peers.json");
const SRV_PRIV = path.join(WG_DIR, "server.key");
const SRV_PUB = path.join(WG_DIR, "server.pub");

// Tünel /24 oktet tabanı (allocVpnIp için): "10.13.38.0/24" -> "10.13.38."
const TUN_BASE = VPN_TUN_SUBNET.replace(/\.\d+\/\d+$/, ".");

async function dx(args, timeout = 60000) {
  const { stdout } = await pexec("docker", args, { timeout });
  return stdout.trim();
}

// ════════════════════ SAF YARDIMCILAR (test edilebilir) ════════════════════

// Öğrenciye tünel IP'si tahsis et: zaten varsa koru, yoksa .2'den artan ilk boş.
//  peers = { [id]: { vpnIp, ... } }. Dönüş: "10.13.38.N" | null (dolu).
export function allocVpnIp(peers, id, base = TUN_BASE) {
  if (peers && peers[id] && peers[id].vpnIp) return peers[id].vpnIp;
  const used = new Set(Object.values(peers || {}).map((p) => p && p.vpnIp).filter(Boolean));
  for (let i = 2; i <= 254; i++) {
    const ip = base + i;
    if (!used.has(ip)) return ip;
  }
  return null;
}

// İstemci WireGuard config metni (.conf). PersistentKeepalive: VirtualBox NAT arkasında şart.
export function clientConfText({ clientPriv, vpnIp, serverPub, endpoint, port = VPN_PORT, labSubnet = VPN_LAB_SUBNET, tunSubnet = VPN_TUN_SUBNET } = {}) {
  return [
    "[Interface]",
    `PrivateKey = ${clientPriv}`,
    `Address = ${vpnIp}/32`,
    "",
    "[Peer]",
    `PublicKey = ${serverPub}`,
    `Endpoint = ${endpoint}:${port}`,
    `AllowedIPs = ${labSubnet}, ${tunSubnet}`,
    "PersistentKeepalive = 25",
    "",
  ].join("\n");
}

// Eşleri entrypoint env'ine çevir: { id:{vpnIp,clientPub} } -> "pub=ip,pub=ip".
export function peersEnvString(peers) {
  return Object.values(peers || {})
    .filter((p) => p && p.clientPub && p.vpnIp)
    .map((p) => `${p.clientPub}=${p.vpnIp}`)
    .join(",");
}

// `wg show wg0 latest-handshakes` çıktısını ayrıştır: "pub\tepoch" -> { pub: epochSec }.
export function parseHandshakes(out) {
  const m = {};
  for (const line of String(out || "").split("\n")) {
    const [pub, ts] = line.trim().split(/\s+/);
    if (pub && ts != null && /^\d+$/.test(ts)) m[pub] = parseInt(ts, 10);
  }
  return m;
}

// Son el sıkışma "bağlı" sayılır mı? (180 sn içinde)
export function isConnected(epochSec, nowSec = Math.floor(Date.now() / 1000)) {
  return !!epochSec && nowSec - epochSec < 180;
}

// Bireysel modda tek sabit kimlik (oturum yoksa).
export function peerKey(studentId) {
  return studentId ? String(studentId) : "solo";
}

// ════════════════════ DEPO (kalıcı, data/wireguard) ════════════════════
function loadPeers() {
  try {
    const j = JSON.parse(fs.readFileSync(PEERS_FILE, "utf-8"));
    return j && typeof j === "object" ? j : {};
  } catch { return {}; }
}
function savePeers(peers) {
  try { fs.mkdirSync(WG_DIR, { recursive: true }); fs.writeFileSync(PEERS_FILE, JSON.stringify(peers, null, 2)); } catch {}
}

// ════════════════════ DOCKER'A DOKUNAN (sunucu çalışma zamanı) ════════════════════

// wg anahtar çifti üret (wg ikilisi konteynerde; panel host'unda wg yok).
async function wgGenKeypair() {
  try {
    // ⚠ İmajın ENTRYPOINT'i (entrypoint.sh) var → komutu --entrypoint ile override
    //   ETMEZSEK `sh -lc ...` entrypoint'e ARGÜMAN olur (anahtar üretmez, wg-quick dener).
    const out = await dx(["run", "--rm", "--entrypoint", "sh", VPN_IMAGE, "-lc",
      'priv=$(wg genkey); pub=$(printf "%s" "$priv" | wg pubkey); printf "%s\\n%s\\n" "$priv" "$pub"'], 30000);
    const [priv, pub] = out.split("\n").map((s) => s.trim());
    if (priv && pub) return { priv, pub };
  } catch {}
  return null;
}

// Sunucu anahtar çiftini oku/oluştur (kalıcı → restart'ta istemci config'leri bozulmaz).
async function ensureServerKeys() {
  try {
    const priv = fs.readFileSync(SRV_PRIV, "utf-8").trim();
    const pub = fs.readFileSync(SRV_PUB, "utf-8").trim();
    if (priv && pub) return { priv, pub };
  } catch {}
  const kp = await wgGenKeypair();
  if (!kp) return null;
  try { fs.mkdirSync(WG_DIR, { recursive: true }); fs.writeFileSync(SRV_PRIV, kp.priv); fs.writeFileSync(SRV_PUB, kp.pub); } catch {}
  return kp;
}

// ordek_vpn lab bridge ağını oluştur (yoksa).
export async function ensureVpnNetwork() {
  const out = await dx(["network", "ls", "--filter", `name=^${VPN_NET}$`, "--format", "{{.Name}}"], 15000).catch(() => "");
  if (out.split("\n").includes(VPN_NET)) return true;
  try {
    await dx(["network", "create", "--subnet", VPN_LAB_SUBNET, "--gateway", VPN_LAB_GATEWAY, VPN_NET], 30000);
    return true;
  } catch { return false; }
}

// WireGuard sunucu konteynerini garanti et (çalışıyorsa yeniden kullan).
//  Başarısızsa (tun yok / imaj yok / WG modülü yok) false → çağıran bridge'e düşer.
export async function ensureVpnServer() {
  const running = await dx(["ps", "-q", "--filter", `name=^${WG_CONTAINER}$`], 15000).catch(() => "");
  if (running.trim()) return true;
  await dx(["rm", "-f", WG_CONTAINER], 15000).catch(() => {});
  if (!(await ensureVpnNetwork())) return false;
  const keys = await ensureServerKeys();
  if (!keys) return false;
  const peersEnv = peersEnvString(loadPeers());
  try {
    await dx(["run", "-d", "--name", WG_CONTAINER, "--restart", "unless-stopped",
      "--label", "ordek-lab.wg=1",
      "--cap-add", "NET_ADMIN",
      "--device", "/dev/net/tun",
      "--sysctl", "net.ipv4.ip_forward=1",
      "-p", `${VPN_PORT}:${VPN_PORT}/udp`,
      "--network", VPN_NET,
      "-e", `WG_PRIV=${keys.priv}`,
      "-e", `WG_PORT=${VPN_PORT}`,
      "-e", `WG_TUN_ADDR=${VPN_SERVER_TUN_IP}/24`,
      "-e", `WG_LAB_SUBNET=${VPN_LAB_SUBNET}`,
      "-e", `WG_PEERS=${peersEnv}`,
      VPN_IMAGE], 90000);
    // Sınıf modunda izolasyon zincirini hazırla (varsayılan: öğrenci yalnız kendi hedefine).
    if (process.env.LAB_MODE === "class") await ensureClassIsolation().catch(() => {});
    return true;
  } catch (e) {
    console.warn("[ordek] WireGuard sunucusu başlatılamadı → bridge moduna düşülecek:", String((e && e.stderr) || (e && e.message) || e));
    return false;
  }
}

// Öğrenciye eş tahsis et + çalışan sunucuya ekle; istemci config'i döndür.
//  Dönüş: { vpnIp, clientConf, serverPub, endpoint } | null.
export async function provisionPeer(studentId, { endpoint } = {}) {
  if (!(await ensureVpnServer())) return null;
  const keys = await ensureServerKeys();
  if (!keys) return null;
  const id = peerKey(studentId);
  const peers = loadPeers();
  let rec = peers[id];
  if (!rec || !rec.clientPub || !rec.vpnIp) {
    const kp = await wgGenKeypair();
    if (!kp) return null;
    const vpnIp = allocVpnIp(peers, id);
    if (!vpnIp) return null;
    rec = { vpnIp, clientPub: kp.pub, clientPriv: kp.priv, studentId: id, at: Date.now() };
    peers[id] = rec;
    savePeers(peers);
  }
  // Çalışan sunucuya eşi ekle (idempotent).
  await dx(["exec", WG_CONTAINER, "wg", "set", "wg0", "peer", rec.clientPub, "allowed-ips", `${rec.vpnIp}/32`], 20000).catch(() => {});
  const conf = clientConfText({
    clientPriv: rec.clientPriv, vpnIp: rec.vpnIp, serverPub: keys.pub,
    endpoint: endpoint || VPN_ENDPOINT_DEFAULT,
  });
  return { vpnIp: rec.vpnIp, clientConf: conf, serverPub: keys.pub, endpoint: endpoint || VPN_ENDPOINT_DEFAULT };
}

// Öğrencinin bağlı olup olmadığını + atanan IP'sini döndür (panel poll).
export async function peerStatus(studentId) {
  const id = peerKey(studentId);
  const peers = loadPeers();
  const rec = peers[id];
  if (!rec) return { vpnIp: null, connected: false, provisioned: false };
  let connected = false, lastHandshake = 0;
  try {
    const out = await dx(["exec", WG_CONTAINER, "wg", "show", "wg0", "latest-handshakes"], 15000);
    const hs = parseHandshakes(out);
    lastHandshake = hs[rec.clientPub] || 0;
    connected = isConnected(lastHandshake);
  } catch {}
  return { vpnIp: rec.vpnIp, connected, provisioned: true, lastHandshake };
}

// Öğretmen görünürlüğü: tüm provisyonlu eşler + bağlılık.
export async function listPeers() {
  const peers = loadPeers();
  let hs = {};
  try { hs = parseHandshakes(await dx(["exec", WG_CONTAINER, "wg", "show", "wg0", "latest-handshakes"], 15000)); } catch {}
  return Object.entries(peers).map(([id, p]) => ({
    studentId: id, vpnIp: p.vpnIp, connected: isConnected(hs[p.clientPub] || 0),
  }));
}

// ════════════════════ SINIF İZOLASYONU (Faz B) ════════════════════
//  ORDEK_ISO zinciri: wg0 → lab subnet trafiği yalnız eşleşen (öğrenci IP ↔ kendi
//  hedef IP'si) çiftlerinde ACCEPT, gerisi DROP. İstemci↔istemci zaten WG /32
//  allowed-ips ile engelli (sunucu yönlendirmez). Bireysel modda çağrılmaz.
export async function ensureClassIsolation() {
  const sh =
    "iptables -N ORDEK_ISO 2>/dev/null || true; " +
    `iptables -C FORWARD -i wg0 -d ${VPN_LAB_SUBNET} -j ORDEK_ISO 2>/dev/null || iptables -I FORWARD -i wg0 -d ${VPN_LAB_SUBNET} -j ORDEK_ISO; ` +
    "iptables -C ORDEK_ISO -j DROP 2>/dev/null || iptables -A ORDEK_ISO -j DROP";
  await dx(["exec", WG_CONTAINER, "sh", "-lc", sh], 20000).catch(() => {});
}

// İzolasyon zincirini sıfırla (flush) + kapanış DROP'u geri koy. docker.js
//  syncVpnIsolation bunu çağırıp çalışan hedeflere göre çiftleri yeniden ekler
//  (durmuş hedeflerin eski ACCEPT kuralları böylece temizlenir → self-healing).
export async function flushIsolation() {
  if (process.env.LAB_MODE !== "class") return;
  const sh = "iptables -F ORDEK_ISO 2>/dev/null || true; iptables -A ORDEK_ISO -j DROP";
  await dx(["exec", WG_CONTAINER, "sh", "-lc", sh], 20000).catch(() => {});
}

// Öğrenci VPN IP'si ↔ hedef IP'si çiftine izin ver (DROP'tan ÖNCE ekle).
export async function allowPair(vpnIp, targetIp) {
  if (!vpnIp || !targetIp) return;
  if (process.env.LAB_MODE !== "class") return; // bireysel modda izolasyon yok
  const sh = `iptables -C ORDEK_ISO -s ${vpnIp} -d ${targetIp} -j ACCEPT 2>/dev/null || iptables -I ORDEK_ISO -s ${vpnIp} -d ${targetIp} -j ACCEPT`;
  await dx(["exec", WG_CONTAINER, "sh", "-lc", sh], 20000).catch(() => {});
}

// Çiftin iznini kaldır (hedef durunca; reaper de çağırır).
export async function denyPair(vpnIp, targetIp) {
  if (!vpnIp || !targetIp) return;
  if (process.env.LAB_MODE !== "class") return;
  await dx(["exec", WG_CONTAINER, "iptables", "-D", "ORDEK_ISO", "-s", vpnIp, "-d", targetIp, "-j", "ACCEPT"], 20000).catch(() => {});
}

// docker.js'in startToolLabVpn'de kullanması için: öğrencinin (provisyonluysa) VPN IP'si.
export function vpnIpOf(studentId) {
  const rec = loadPeers()[peerKey(studentId)];
  return rec ? rec.vpnIp : null;
}
