// ============================================================================
//  lib/netlearn.js — ÖĞRENİLEN ağ bilgisi deposu (SUNUCU-ONLY, bellek-içi, TTL'li).
//  Kali VM'deki keşif script'i /api/netinfo'ya hangi host adresinden ulaştığını ve
//  kendi IP'sini bildirir → panel bunu okuyup (poll) öğrenciye gösterir ve
//  komutlara doğru adresi yerleştirir. machineToken'a göre anahtarlanır.
//
//  Kalıcı değil (lastSeen gibi): süreç yeniden başlarsa öğrenci scripti tekrar
//  çalıştırır. TTL ile eski kayıtlar temizlenir (sızıntı/şişme olmasın).
// ============================================================================
const STORE = new Map(); // token -> { kaliIp, hostIp, port, at }
const TTL_MS = 30 * 60 * 1000; // 30 dk

function prune() {
  const now = Date.now();
  for (const [k, v] of STORE) if (!v || now - v.at > TTL_MS) STORE.delete(k);
}

export function recordNet(token, { kaliIp, hostIp, port } = {}) {
  if (!token) return null;
  prune();
  const rec = {
    kaliIp: clean(kaliIp),
    hostIp: clean(hostIp),
    port: Number.isFinite(+port) ? +port : null,
    at: Date.now(),
  };
  STORE.set(token, rec);
  return rec;
}

export function getNet(token) {
  if (!token) return null;
  prune();
  const r = STORE.get(token);
  return r ? { kaliIp: r.kaliIp, hostIp: r.hostIp, port: r.port, at: r.at } : null;
}

export function clearNet(token) { if (token) STORE.delete(token); }

// IP/host alanlarını güvenli karaktere indir (script'ten gelen değer; XSS/şişme önle).
function clean(v) {
  const s = String(v == null ? "" : v).trim().slice(0, 45);
  return /^[A-Za-z0-9_.:-]*$/.test(s) ? s : "";
}
