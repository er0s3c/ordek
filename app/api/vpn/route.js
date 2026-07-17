// ============================================================================
//  app/api/vpn — TryHackMe-tarzı WireGuard erişimi.
//   GET ?action=config[&endpoint=<host-ip>]  → öğrenciye .conf indir (provision'lar)
//   GET ?action=status                        → { vpnIp, connected, provisioned, candidates }
//   GET ?action=peers   (öğretmen, class)     → tüm öğrencilerin VPN durumu
//  Kimlik: class modunda oturum öğrencisi (userId); bireysel modda tek "solo" eş.
//  Endpoint = öğrencinin VM ağ moduna göre host IP'si (NAT 10.0.2.2 varsayılan);
//  panel tespit edilen LAN IP'lerini aday olarak sunar.
// ============================================================================
import os from "node:os";
import { provisionPeer, peerStatus, listPeers, VPN_PORT, VPN_ENDPOINT_DEFAULT } from "@/lib/wireguard";
import { hostCandidates } from "@/lib/netinfo";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });

// tool-loot deseni: tarayıcı indirmesi.
function fileDownload(name, body) {
  const data = Buffer.from(String(body));
  return new Response(data, {
    status: 200,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "content-disposition": `attachment; filename="${name}"`,
      "content-length": String(data.length),
    },
  });
}

// Oturum kimliği: class → userId; bireysel → null (lib/wireguard "solo"ya çevirir).
function whoami(req) {
  if (process.env.LAB_MODE !== "class") return { id: null, role: "solo" };
  const s = getSession(req);
  return s ? { id: s.userId, role: s.role } : { id: null, role: null };
}

// Endpoint adayları: tespit edilen LAN IP'leri + bilinen VM ağ geçitleri.
function detectedIps() {
  const out = [];
  try {
    for (const list of Object.values(os.networkInterfaces())) {
      for (const a of list || []) {
        if (a.family === "IPv4" && !a.internal &&
            !/^172\.(1[6-9]|2\d|3[01])\./.test(a.address) &&
            !a.address.startsWith("10.13.37.") && !a.address.startsWith("10.13.38.")) {
          out.push(a.address);
        }
      }
    }
  } catch {}
  return out;
}
const endpointCandidates = () => hostCandidates(detectedIps());

export async function GET(req) {
  const url = new URL(req.url);
  const action = url.searchParams.get("action") || "status";
  const me = whoami(req);
  if (me.role === null) return json({ error: "oturum gerekli" }, 401);

  if (action === "peers") {
    if (process.env.LAB_MODE === "class" && me.role !== "teacher") return json({ error: "yetki yok" }, 403);
    try { return json({ peers: await listPeers() }); }
    catch (e) { return json({ error: "vpn", detail: String((e && e.message) || e) }, 500); }
  }

  if (action === "config") {
    const endpoint = (url.searchParams.get("endpoint") || "").trim() || VPN_ENDPOINT_DEFAULT;
    try {
      const r = await provisionPeer(me.id, { endpoint });
      if (!r) return json({ error: "vpn-unavailable", message: "VPN sunucusu hazır değil (WireGuard kurulamadı). Yönetici imajı derlemeli ya da bridge modunu kullan." }, 503);
      return fileDownload("ordek-vpn.conf", r.clientConf);
    } catch (e) {
      return json({ error: "vpn", detail: String((e && e.stderr) || (e && e.message) || e) }, 500);
    }
  }

  // status (varsayılan)
  try {
    const st = await peerStatus(me.id);
    return json({ ...st, port: VPN_PORT, candidates: endpointCandidates(), endpointDefault: VPN_ENDPOINT_DEFAULT });
  } catch (e) {
    return json({ vpnIp: null, connected: false, provisioned: false, candidates: endpointCandidates(), detail: String((e && e.message) || e) });
  }
}
