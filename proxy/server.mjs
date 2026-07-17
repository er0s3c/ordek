// ============================================================================
//  proxy/server.mjs — Kimlik-doğrulamalı HEDEF MAKİNE proxy'si (ayrı kapı :3001).
//  Makineler host'a port yayınlamaz; yalnız iç ağda ad ile erişilir. Bu proxy her
//  tarayıcıyı SAHİBİ olduğu makineye imzalı bir cookie ile "sabitler".
//
//  İki makine türü (cookie'deki kind ile ayrılır):
//   • vuln → tek konteyner; köke (ordek-m-<token>:3000) stream-proxy.
//   • tool → gerçek-araç labı saldırgan kutusu:
//        /            → ttyd  (ordek-a-<token>:7681)  tarayıcı terminali (WebSocket)
//        /desktop/*   → noVNC (ordek-a-<token>:6080)  GUI araçlar (Wireshark/Burp/BeEF)
//
//  Akış:
//   • Panel (:3000) /api/machines/open?token=… → sahipliği doğrular, imzalı
//     `ordek_target` cookie'si (token + kind) set eder ve buraya yönlendirir.
//   • /__open/<token> → araçlar (Burp/curl) için token-yeteneği (yalnız vuln).
//   • /api/flag* → panele iletilir (öğrenci oturum çerezi taşınır).
//   • diğer her şey → cookie'deki makineye stream-proxy (HTTP + WebSocket).
//  GÜVENLİK: proxy'nin docker.sock'u YOKTUR; yalnız ağ üzerinden konuşur.
// ============================================================================
import http from "node:http";
import pkg from "../lib/target-cookie.js";
const { COOKIE, MAXAGE_S, TOKEN_RE, signTarget, verifyTarget } = pkg;

const PORT = parseInt(process.env.PROXY_PORT || "3001", 10);
const PANEL = process.env.PANEL_INTERNAL || "http://app:3000";
const SECRET = process.env.LAB_SESSION_SECRET || "ordek-lab-dev-session-secret-change-me";

const TTYD_PORT = 7681;
const VNC_PORT = 6080;

function parseCookies(raw) {
  const out = {};
  (raw || "").split(/; */).forEach((p) => {
    const i = p.indexOf("="); if (i < 0) return;
    out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1));
  });
  return out;
}

const HOP = new Set(["connection", "keep-alive", "proxy-authenticate", "proxy-authorization",
  "te", "trailer", "transfer-encoding", "upgrade", "host"]);

function page(res, status, title, msg) {
  const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#171a16;color:#dde3d2;
font-family:system-ui,sans-serif}.c{max-width:440px;text-align:center;padding:28px}.c h1{font-size:42px;margin:0 0 6px}
.c p{color:#9aa389;line-height:1.6}.c a{color:#b6f24a}</style>
<div class="c"><h1>🦆</h1><h2>${title}</h2><p>${msg}</p></div>`;
  res.writeHead(status, { "content-type": "text/html; charset=utf-8" });
  res.end(html);
}

// throttle: token başına en fazla 30sn'de bir panele heartbeat
const lastBeat = new Map();
function heartbeat(token) {
  const now = Date.now();
  if (now - (lastBeat.get(token) || 0) < 30000) return;
  lastBeat.set(token, now);
  try {
    const u = new URL("/api/proxy/heartbeat", PANEL);
    const data = JSON.stringify({ token });
    const r = http.request({ hostname: u.hostname, port: u.port, path: u.pathname, method: "POST",
      headers: { "content-type": "application/json", "x-proxy-secret": SECRET, "content-length": Buffer.byteLength(data) } });
    r.on("error", () => {}); r.end(data);
  } catch { /* yok say */ }
}

// Cookie'deki {t, k} + istek yolundan üst-akış makineyi seç.
// → { base, path } : base = "http://host:port", path = iletilecek yol+sorgu.
function routeFor(kind, token, reqUrl) {
  let pathname; try { pathname = new URL(reqUrl, "http://x").pathname; } catch { pathname = reqUrl; }
  if (kind === "tool") {
    if (pathname === "/desktop" || pathname.startsWith("/desktop/")) {
      const stripped = reqUrl.replace(/^\/desktop/, "") || "/";
      return { base: `http://ordek-a-${token}:${VNC_PORT}`, path: stripped };
    }
    return { base: `http://ordek-a-${token}:${TTYD_PORT}`, path: reqUrl };
  }
  return { base: `http://ordek-m-${token}:3000`, path: reqUrl };
}

function forward(req, res, base, path, extraReqHeaders = {}) {
  let u; try { u = new URL(path || req.url, base); } catch { return page(res, 400, "Geçersiz istek", "URL çözümlenemedi."); }
  const headers = {};
  for (const [k, v] of Object.entries(req.headers)) if (!HOP.has(k.toLowerCase())) headers[k] = v;
  Object.assign(headers, extraReqHeaders);
  headers["host"] = u.host;
  const up = http.request({ hostname: u.hostname, port: u.port || 80, path: u.pathname + u.search, method: req.method, headers },
    (pres) => {
      const h = { ...pres.headers };
      delete h["transfer-encoding"];
      res.writeHead(pres.statusCode || 502, h);
      pres.pipe(res);
    });
  up.on("error", () => {
    if (res.headersSent) { try { res.end(); } catch {} return; }
    page(res, 502, "Makine hazır değil", "Hedef makine açılıyor ya da durmuş olabilir. Panelden tekrar başlatmayı dene.");
  });
  req.pipe(up);
}

const server = http.createServer((req, res) => {
  let path; try { path = new URL(req.url, "http://x").pathname; } catch { path = req.url; }

  // 1) Araç/yetenek girişi (yalnız vuln makineleri): /__open/<token> → cookie set + köke yönlendir
  if (path.startsWith("/__open/")) {
    const token = path.slice("/__open/".length).split("/")[0];
    if (!TOKEN_RE.test(token)) return page(res, 400, "Geçersiz token", "Bağlantı hatalı görünüyor.");
    res.writeHead(302, {
      "set-cookie": `${COOKIE}=${signTarget(token, "vuln")}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAXAGE_S}`,
      location: "/",
    });
    return res.end();
  }

  const cookies = parseCookies(req.headers.cookie);
  const v = verifyTarget(cookies[COOKIE]);

  // 2) Flag uçları panele (öğrenci oturum çerezi taşınır → ilerleme doğru öğrenciye)
  if (path === "/api/flag" || path === "/api/flag/detect") {
    return forward(req, res, PANEL, req.url);
  }

  // 3) Sabitlenmiş makine yoksa yönlendirici sayfa
  if (!v) {
    return page(res, 409, "Makine seçilmedi",
      'Bir hedef makineyi panelden "Aç" ile başlat. Bu kapı yalnız senin makineni gösterir.');
  }

  // 4) Hedef makineye stream-proxy (vuln kökü / tool ttyd / tool noVNC)
  heartbeat(v.t);
  const r = routeFor(v.k, v.t, req.url);
  forward(req, res, r.base, r.path);
});

// 5) WebSocket yükseltme (ttyd terminali + noVNC) — token'a göre üst-akışa tünelle.
server.on("upgrade", (req, socket, head) => {
  const cookies = parseCookies(req.headers.cookie);
  const v = verifyTarget(cookies[COOKIE]);
  if (!v) { socket.destroy(); return; }
  const r = routeFor(v.k, v.t, req.url);
  let u; try { u = new URL(r.path, r.base); } catch { socket.destroy(); return; }

  const headers = {};
  for (const [k, val] of Object.entries(req.headers)) if (!HOP.has(k.toLowerCase())) headers[k] = val;
  headers["host"] = u.host;
  headers["connection"] = "Upgrade";
  headers["upgrade"] = req.headers["upgrade"];

  const proxyReq = http.request({ hostname: u.hostname, port: u.port || 80, path: u.pathname + u.search, method: req.method, headers });
  proxyReq.on("upgrade", (proxyRes, proxySocket, proxyHead) => {
    const lines = [`HTTP/1.1 ${proxyRes.statusCode || 101} ${proxyRes.statusMessage || "Switching Protocols"}`];
    for (const [k, val] of Object.entries(proxyRes.headers)) {
      if (Array.isArray(val)) val.forEach((vv) => lines.push(`${k}: ${vv}`));
      else lines.push(`${k}: ${val}`);
    }
    socket.write(lines.join("\r\n") + "\r\n\r\n");
    if (proxyHead && proxyHead.length) socket.write(proxyHead);
    proxySocket.pipe(socket);
    socket.pipe(proxySocket);
    proxySocket.on("error", () => socket.destroy());
    socket.on("error", () => proxySocket.destroy());
  });
  proxyReq.on("error", () => socket.destroy());
  if (head && head.length) proxyReq.write(head);
  proxyReq.end();
  heartbeat(v.t);
});

server.listen(PORT, () => console.log(`[ordek-proxy] dinleniyor :${PORT} → panel ${PANEL}`));
