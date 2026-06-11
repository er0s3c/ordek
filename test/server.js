const http = require("http");
const { ROUTES } = require("../lib/vulns");
const { db } = process.env.LAB_TEST_SQLITE ? require("./db.sqlite") : require("../lib/db");
const { getLevel } = require("../lib/level");

function parseCookies(s) {
  const o = {};
  (s || "").split(";").forEach((p) => {
    const i = p.indexOf("=");
    if (i > -1) o[p.slice(0, i).trim()] = p.slice(i + 1).trim();
  });
  return o;
}
function matchRoute(method, pathname) {
  for (const r of ROUTES) {
    if (r.method !== method) continue;
    if (r.path.includes(":")) {
      const names = (r.path.match(/:[^/]+/g) || []).map((s) => s.slice(1));
      const re = new RegExp("^" + r.path.replace(/:[^/]+/g, "([^/]+)") + "$");
      const m = pathname.match(re);
      if (m) { const params = {}; names.forEach((n, i) => (params[n] = m[i + 1])); return { r, params }; }
    } else if (r.path === pathname) return { r, params: {} };
  }
  return null;
}
const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, "http://localhost");
  const query = Object.fromEntries(u.searchParams.entries());
  const headers = req.headers;
  const cookies = parseCookies(headers.cookie || "");
  let rawBody = "";
  for await (const c of req) rawBody += c;
  let body = {};
  try { body = rawBody ? JSON.parse(rawBody) : {}; } catch { body = {}; }
  const level = getLevel(headers);
  const match = matchRoute(req.method, u.pathname);
  if (!match) { res.writeHead(404, { "content-type": "application/json" }); return res.end(JSON.stringify({ error: "no route" })); }
  const ctx = { method: req.method, query, body, rawBody, headers, cookies, params: match.params, level, db };
  try {
    const out = await match.r.fn(ctx);
    const h = out.headers || {};
    if (out.text != null) { res.writeHead(out.status || 200, { "content-type": "text/plain; charset=utf-8", ...h }); res.end(out.text); }
    else { res.writeHead(out.status || 200, { "content-type": "application/json", ...h }); res.end(JSON.stringify(out.json)); }
  } catch (e) {
    res.writeHead(500, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: String((e && e.message) || e) }));
  }
});
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log("test server on :" + PORT));
