// Nmap Servis Keşfi HEDEF MAKINESI — port/servis enümerasyonu.
// GET /nmap-recon            -> varsayılan tarama (yaygın portlar)
// GET /nmap-recon?ports=all  -> tüm portlar (nmap -p-) → gizli 31337 servisi
// GET /nmap-recon?port=31337 -> tek port doğrudan
// Seviye davranışı: low=gizli port varsayılanda görünür · medium=yalnız -p-/direct ·
//                   high=firewall ile filtered (hiç erişilemez).
import { getLevel } from "@/lib/level";
import { FLAGS } from "@/lib/flags";
import { page, flagBanner, esc, html } from "@/lib/machine-ui";

export const dynamic = "force-dynamic";
const FLAG = FLAGS["nmap-recon"];
const HIDDEN_PORT = 31337;

const SERVICES = {
  22: "OpenSSH 8.9p1 Ubuntu",
  80: "nginx 1.24.0",
  443: "nginx 1.24.0 (TLS)",
  3000: "ördek-store http (Node.js)",
  8080: "Apache Tomcat/9.0 (manager)",
  [HIDDEN_PORT]: "ordek-secret-svc :: " + FLAG,
};
const COMMON = [22, 80, 443, 3000, 8080];

// Gizli servisin görünürlüğü/tarama sonucu seviyeye + tarama moduna göre.
function scan(level, { port, all }) {
  const mode = port ? "direct" : all ? "all" : "default";
  const rows = [];
  let flag = false;

  const candidates = mode === "direct"
    ? [port]
    : mode === "all"
      ? Object.keys(SERVICES).map(Number)
      : [...COMMON];

  for (const p of candidates) {
    if (p === HIDDEN_PORT) continue; // gizli portu ayrı ele al
    if (SERVICES[p]) rows.push({ port: p, state: "open", banner: SERVICES[p] });
    else rows.push({ port: p, state: "closed", banner: "—" });
  }

  const attemptHidden =
    (mode === "default" && level === "low") ||
    mode === "all" ||
    (mode === "direct" && port === HIDDEN_PORT);

  if (attemptHidden) {
    if (level === "high") rows.push({ port: HIDDEN_PORT, state: "filtered", banner: "filtered by firewall" });
    else { rows.push({ port: HIDDEN_PORT, state: "open", banner: SERVICES[HIDDEN_PORT] }); flag = true; }
  }

  rows.sort((a, b) => a.port - b.port);
  return { rows, flag, mode };
}

function render(level, scanned, { rawPort = "", all = false } = {}) {
  const modeLabel = scanned ? (scanned.mode === "all" ? "tüm portlar (-p-)" : scanned.mode === "direct" ? "tek port" : "varsayılan (yaygın portlar)") : "";
  const tbody = scanned
    ? (scanned.rows.map((r) =>
        `<tr><td><code>${r.port}/tcp</code></td><td><span class="nm-${r.state}">${r.state}</span></td><td>${esc(r.banner)}</td></tr>`).join("")
        || `<tr><td colspan="3" class="sub">Açık port bulunamadı.</td></tr>`)
    : "";

  const form = `<div class="panel"><div class="panel-h">// nmap-style port/servis taraması</div><div class="panel-b">
    <p class="sub" style="margin:0 0 10px">Hedef host'un açık servislerini keşfet. Varsayılan tarama yaygın portları listeler; <b>tüm portları tara</b> = <code>nmap -p- &lt;host&gt;</code> (65535 port).</p>
    <form method="get" action="/nmap-recon" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
      <input class="input" name="port" placeholder="tek port (örn. 31337)" value="${esc(rawPort)}" style="flex:1;min-width:170px">
      <label class="sub" style="display:flex;gap:6px;align-items:center;white-space:nowrap"><input type="checkbox" name="ports" value="all"${all ? " checked" : ""}> tüm portları tara (-p-)</label>
      <button class="btn primary" type="submit">▸ Tara</button>
    </form>
  </div></div>`;

  const results = scanned ? `<div class="panel"><div class="panel-h">// nmap sonucu &nbsp; <span class="sub">(${esc(modeLabel)})</span></div><div class="panel-b">
    <table class="nmap-tbl" style="width:100%;border-collapse:collapse;font-size:13px">
      <thead><tr><th style="text-align:left;padding:4px 8px">PORT</th><th style="text-align:left;padding:4px 8px">STATE</th><th style="text-align:left;padding:4px 8px">SERVICE / BANNER</th></tr></thead>
      <tbody>${tbody}</tbody>
    </table>
  </div></div>` : "";

  const banner = scanned && scanned.flag
    ? `<div style="margin-top:14px">${flagBanner({ value: FLAG, sub: "Gizli servisi (31337) keşfettin — banner'da flag." })}</div>` : "";

  return page({
    title: "ördek // Nmap Servis Keşfi",
    level,
    subtitle: "net-recon",
    body: form + results + banner,
  });
}

export async function GET(req) {
  const level = getLevel(req.headers);
  const url = new URL(req.url);
  const rawPort = url.searchParams.get("port") || "";
  const all = url.searchParams.get("ports") === "all" || url.searchParams.has("all");
  const port = /^\d+$/.test(rawPort) ? parseInt(rawPort, 10) : null;
  const didScan = !!(rawPort || all || url.searchParams.has("scan") || url.search.length > 0);
  const scanned = didScan ? scan(level, { port, all }) : scan(level, {}); // ilk açılışta da varsayılan tarama göster
  return html(render(level, scanned, { rawPort, all }));
}
