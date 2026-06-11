// Next.js Request -> ortak ctx -> Response donusturucu.
// Tum app/api/.../route.js dosyalari bunu kullanir; gercek mantik lib/vulns.js'tedir.
const { getLevel } = require("./level");
const { db } = require("./db");

function headersToObj(h) {
  const o = {};
  h.forEach((v, k) => { o[k.toLowerCase()] = v; });
  return o;
}
function parseCookies(str) {
  const o = {};
  (str || "").split(";").forEach((p) => {
    const i = p.indexOf("=");
    if (i > -1) o[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return o;
}

function makeHandler(fn) {
  return async function (req, context) {
    const url = new URL(req.url);
    const query = Object.fromEntries(url.searchParams.entries());
    const headers = headersToObj(req.headers);
    const cookies = parseCookies(headers.cookie || "");
    let rawBody = "";
    let body = {};
    if (req.method !== "GET" && req.method !== "HEAD") {
      rawBody = await req.text().catch(() => "");
      try { body = rawBody ? JSON.parse(rawBody) : {}; } catch { body = {}; }
    }
    const level = getLevel(req.headers);
    const params = (context && context.params) || {};
    const ctx = { method: req.method, query, body, rawBody, headers, cookies, params, level, db };
    const r = await fn(ctx);
    const h = r.headers || {};
    if (r.text != null) {
      return new Response(r.text, { status: r.status || 200, headers: { "content-type": "text/plain; charset=utf-8", ...h } });
    }
    return new Response(JSON.stringify(r.json), { status: r.status || 200, headers: { "content-type": "application/json", ...h } });
  };
}

module.exports = { makeHandler };
