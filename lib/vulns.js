// ============================================================================
//  lib/vulns.js  —  Tum zafiyet mantiginin TEK kaynagi (framework-bagimsiz).
//  Hem Next.js route'lari (app/api/.../route.js) hem test sunucusu (test/server.js)
//  ayni fonksiyonlari kullanir. Boylece test edilen kod = teslim edilen kod.
//
//  Handler imzasi:  async (ctx) => ({ status, json } | { status, text, headers })
//  ctx = { method, query, body, rawBody, headers, cookies, params, level, db, store }
// ============================================================================
const crypto = require("crypto");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

const md5 = (s) => crypto.createHash("md5").update(String(s)).digest("hex");
const J = (json, status = 200, headers) => ({ status, json, headers });
const T = (text, status = 200, headers) => ({ status, text, headers });
const DELAY = Number(process.env.LAB_DELAY_MS || 3000); // medium brute-force gecikmesi
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Statik require: webpack/Next bunlari paketleyebilsin diye (degisken require'i
// Next sunucu bundle'inda cozulemez -> null donerdi). try/catch yine de eksik
// bagimliliga toleransli (cıplak test ortami icin).
function lazy(name) {
  try {
    switch (name) {
      case "jsonwebtoken": return require("jsonwebtoken");
      case "ejs": return require("ejs");
      case "node-serialize": return require("node-serialize");
      case "isomorphic-dompurify": return require("isomorphic-dompurify");
      default: return require(name);
    }
  } catch { return null; }
}

// In-memory durum (brute counter, 2fa kodlari, vs.)
const store = {
  brute: new Map(),   // ip -> sayac
  lock: new Map(),    // username -> sayac (high lockout)
  otp: new Map(),     // user -> kod
  otpAtt: new Map(),  // user -> deneme sayisi
};

// --- Yardimcilar -------------------------------------------------------------
// #16 Open Redirect hedef hesaplama
function redirectDest(next, level) {
  if (!next) return "/";
  if (level === "high") return next.startsWith("/") && !next.startsWith("//") ? next : "/";
  if (level === "medium") return /^https?:\/\//i.test(next) ? "/" : next; // //evil.com gecer
  return next; // low: ham
}
// #11/#36 zafiyetli derin birlestirme
function merge(target, src) {
  for (const k in src) {
    if (src[k] && typeof src[k] === "object") {
      if (!target[k]) target[k] = {};
      merge(target[k], src[k]);
    } else target[k] = src[k];
  }
  return target;
}

// ============================================================================
//  A — KLASIK ZAFIYETLER
// ============================================================================

// #1 Brute Force + #22 Username Enumeration + #9 token uretimi + #16 redirect
async function login(ctx) {
  const { level, db, body, headers } = ctx;
  const { username, password, next } = body || {};
  if (body && body.reset) { store.brute.clear(); store.lock.clear(); return J({ reset: true }); } // lab: demoyu tekrar calistirmak icin

  if (level === "medium") {
    // #1 medium: hiz siniri X-Forwarded-For'a gore tutulur (SPOOFABLE anahtar).
    // Ayni XFF'den 5 basarisiz denemeden sonra 429 doner; ama saldirgan XFF'i
    // degistirince sayac sifirlanir -> rate limit atlatilir.
    const ip = headers["x-forwarded-for"] || "anon-ip";
    const n = (store.brute.get(ip) || 0) + 1;
    store.brute.set(ip, n);
    if (n > 5) return J({ error: "too many attempts (this ip)" }, 429);
  } else if (level === "high") {
    // #1 high: hesap kilitleme
    const n = (store.lock.get(username) || 0);
    if (n >= 5) return J({ error: "account locked" }, 429);
  }

  const user = await db.userByUsername(username);
  const ok = user && user.password === md5(password);

  if (!ok && level === "high") store.lock.set(username, (store.lock.get(username) || 0) + 1);

  if (!ok) {
    // #22 Username Enumeration
    if (level === "low") {
      return J({ error: user ? "Sifre yanlis" : "Kullanici bulunamadi" }, 401);
    }
    return J({ error: "Gecersiz kullanici adi veya sifre" }, 401); // generic
  }

  // #9 token: medium senaryo icin zayif secret ile imzalanir
  const jwt = lazy("jsonwebtoken");
  let token = null;
  if (jwt) token = jwt.sign({ sub: user.id, username, role: user.role }, "secret123", { algorithm: "HS256" });
  return J({ ok: true, token, role: user.role, redirect: redirectDest(next, level) });
}

// #2 Command Execution (Ping araci)
function ping(ctx) {
  const { level, body } = ctx;
  let host = (body && body.host) || "";
  if (level === "high") {
    if (!/^[a-zA-Z0-9.\-]+$/.test(host)) return Promise.resolve(J({ error: "invalid host" }, 400));
  } else if (level === "medium") {
    host = host.replace(/&&|;/g, ""); // | ve \n hala acik
  }
  return new Promise((res) => {
    exec(`ping -c1 -W1 ${host}`, { timeout: 4000 }, (err, out, errout) =>
      res(J({ output: (out || "") + (errout || ""), err: err ? String(err.code) : null }))
    );
  });
}

// #3 CSRF (Profil guncelleme)
function profile(ctx) {
  const { level, body, cookies } = ctx;
  if (level === "high") {
    // dogru: token oturum cerezindeki degerle birebir eslesmeli
    if (!body || !body.csrfToken || body.csrfToken !== cookies.csrf) {
      return J({ error: "csrf token invalid" }, 403);
    }
  } else if (level === "medium") {
    // zayif: token'in yalnizca VARLIGI yeterli; oturuma bagli mi diye bakilmaz.
    // CSRF saldirgani forma herhangi bir csrfToken degeri koyarak gecer.
    if (!body || !body.csrfToken) return J({ error: "csrf token missing" }, 403);
  }
  // low: hicbir CSRF kontrolu yok
  return J({ ok: true, updated: { bio: body && body.bio } });
}

// #4 File Inclusion / LFI
function read(ctx) {
  const { level, query } = ctx;
  let file = query.file || "";
  try {
    if (level === "high") {
      const allow = ["notes.txt", "readme.txt"];
      const base = path.basename(file);
      if (!allow.includes(base)) return J({ error: "denied" }, 403);
      return T(fs.readFileSync(path.join("safe", base), "utf8"));
    }
    if (level === "medium") {
      // naive sanitizasyon: "../" tek gecis siliniyor -> "....//" ile atlatilir
      const cleaned = file.replace(/\.\.\//g, "");
      return T(fs.readFileSync(path.join("files", cleaned), "utf8"));
    }
    return T(fs.readFileSync(file, "utf8"));        // low: ham
  } catch (e) {
    return J({ error: String(e.message || e) }, 404);
  }
}

// #5 SQL Injection — Error-Based (Urun arama)
async function product(ctx) {
  const { level, db, query } = ctx;
  let id = query.id ?? "";
  try {
    if (level === "high") {
      const n = Number(id);
      if (!Number.isInteger(n)) return J([]); // gecersiz id -> bos (enjeksiyon etkisiz)
      const r = await db.productById(n);       // guvenli parametre
      return J(r ? [r] : []);
    }
    if (level === "medium") id = String(id).replace(/'/g, "").replace(/select/g, ""); // SeLeCt gecer
    const rows = await db.rawAll(`SELECT id,name,price,stock FROM Product WHERE id=${id}`);
    return J(rows);
  } catch (e) {
    return J({ sqlError: String(e.message || e) }, 500); // low: hata ifsasi
  }
}

// #6 SQL Injection — Blind (Time-based)
async function check(ctx) {
  const { level, db, query } = ctx;
  const u = query.u ?? "";
  if (level === "high") {
    const r = await db.userByUsername(u); // parametreli
    return J({ ok: !!r });
  }
  // low/medium: girdi sorguya birlestirilir. Yanit yalnizca {ok:true|false} —
  // veri ya da hata sizmaz, ama kosul dogru/yanlis olunca cevap degisir.
  // -> boolean-based blind SQLi (ornek: admin' AND '1'='1  vs  admin' AND '1'='2)
  try {
    const rows = await db.rawAll(`SELECT id FROM User WHERE username='${u}'`);
    return J({ ok: rows.length > 0 });
  } catch {
    return J({ ok: false }); // malformed sorgu -> false (oracle korunur, hata gizli)
  }
}

// #8 XSS — Reflected/Stored
function search(ctx) {
  const { level, query } = ctx;
  let q = query.q || "";
  let html = q;
  if (level === "high") {
    const dp = lazy("isomorphic-dompurify");
    html = dp ? dp.sanitize(q) : q.replace(/</g, "&lt;");
  } else if (level === "medium") {
    html = q.replace(/<script[^>]*>.*?<\/script>/gi, ""); // onerror kalir
  }
  return T(`<div id="result">${html}</div>`, 200, { "content-type": "text/html; charset=utf-8" });
}

// ============================================================================
//  B — MODERN ZAFIYETLER
// ============================================================================

// #9 Insecure JWT / API Security
function jwtVerify(ctx) {
  const { level, body } = ctx;
  const token = (body && body.token) || "";
  const jwt = lazy("jsonwebtoken");
  if (!jwt) return J({ error: "jwt lib yok" }, 500);
  try {
    if (level === "low") {
      const decoded = jwt.decode(token, { complete: true });
      if (decoded && decoded.header && decoded.header.alg === "none") {
        return J({ valid: true, payload: decoded.payload, note: "alg:none kabul edildi!" });
      }
      return J({ valid: true, payload: jwt.verify(token, "secret123") });
    }
    if (level === "medium") return J({ valid: true, payload: jwt.verify(token, "secret123") }); // zayif secret
    return J({ valid: true, payload: jwt.verify(token, process.env.JWT_SECRET || "STRONG", { algorithms: ["HS256"] }) });
  } catch (e) {
    return J({ valid: false, error: String(e.message || e) }, 401);
  }
}

// #10 SSRF (URL'den avatar)
async function avatar(ctx) {
  const { level, body } = ctx;
  let url = (body && body.url) || "";
  if (level === "high") return J({ error: "yalnizca dis CDN'e izin var (allowlist)" }, 400);
  if (level === "medium" && /(127\.0\.0\.1|localhost)/i.test(url)) {
    return J({ error: "blocked" }, 400); // 0.0.0.0 acik kalir
  }
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(3000) });
    const text = await r.text();
    return J({ status: r.status, body: text.slice(0, 500) });
  } catch (e) {
    return J({ error: String(e.message || e) }, 502);
  }
}

// #11 Prototype Pollution
function settings(ctx) {
  const { level, body } = ctx;
  if (level === "high") {
    // guvenli: birlestirme yok, tehlikeli anahtarlar reddedilir
    return J({ ok: true, polluted: false, note: "tehlikeli anahtarlar reddedildi" });
  }
  const src = body || {};
  // medium: yalnizca __proto__ reddedilir -> constructor.prototype ile atlatilir
  if (level === "medium" && Object.prototype.hasOwnProperty.call(src, "__proto__")) {
    delete src.__proto__;
  }
  const before = new Set(Object.getOwnPropertyNames(Object.prototype));
  const cfg = {};
  try { merge(cfg, src); } catch {} // low: ham birlestirme -> kirlenir
  const leaked = Object.getOwnPropertyNames(Object.prototype).filter((k) => !before.has(k));
  const polluted = leaked.length > 0 || {}.isAdmin === true;
  // temizlik: prototype'i eski haline dondur (sonraki istekleri kirletmemek icin)
  leaked.forEach((k) => { try { delete Object.prototype[k]; } catch {} });
  delete Object.prototype.isAdmin;
  return J({ ok: true, polluted, leakedKeys: leaked });
}

// #12 Bilgi Ifsasi — 2FA kodu
function twofa(ctx) {
  const { level, body } = ctx;
  const user = (body && body.user) || "anon";
  const code = String(Math.floor(100000 + Math.random() * 900000));
  store.otp.set(user, code);
  // high: yeni kod istemek deneme sayacini SIFIRLAMAZ (hesap-bagli limit).
  // low/medium: yeni kod sayaci sifirlar -> medium'da kilit boylece atlatilir.
  if (level !== "high") store.otpAtt.set(user, 0);
  if (level === "low") return J({ sent: true, code });                                  // ifsa!
  if (level === "medium") return J({ sent: true, c: Buffer.from(code).toString("base64") }); // anahtar bundle'da
  return J({ sent: true }); // high
}

// #13 Mass Assignment
async function userUpdate(ctx) {
  const { level, db, body } = ctx;
  if (body && body.reset) { await db.updateUser(body.id, { role: "user" }); return J({ reset: true }); } // lab: rolu sifirla
  const data = level === "low"
    ? { ...(body || {}) }                                  // tum alanlar (role dahil!)
    : { username: body.username, avatarUrl: body.avatarUrl }; // medium/high: allowlist
  const u = await db.updateUser(body.id, data);
  return J({ id: u.id, username: u.username, role: u.role });
}

// #14 SSTI
function template(ctx) {
  const { level, body } = ctx;
  const ejs = lazy("ejs");
  if (!ejs) return J({ error: "ejs yok" }, 500);
  let tpl = (body && body.tpl) || "";
  try {
    if (level === "high") return J({ out: ejs.render("Merhaba <%= name %>", { name: tpl }) });
    if (level === "medium") tpl = tpl.replace(/process|require|child_process/g, "");
    return J({ out: ejs.render(tpl) }); // low: RCE
  } catch (e) {
    return J({ error: String(e.message || e) }, 500);
  }
}

// #16 Open Redirect (bagimsiz endpoint)
function redirect(ctx) {
  const { level, query } = ctx;
  return J({ redirect: redirectDest(query.next, level) });
}

// #17 Insecure Deserialization
function cartImport(ctx) {
  const { level, rawBody } = ctx;
  if (level === "high") {
    try { return J({ data: JSON.parse(rawBody || "{}") }); }
    catch (e) { return J({ error: String(e.message || e) }, 400); }
  }
  const ser = lazy("node-serialize");
  if (!ser) return J({ error: "node-serialize yok" }, 500);
  let raw = rawBody || "";
  if (level === "medium") raw = raw.replace(/_\$\$ND_FUNC\$\$_/g, "");
  try { return J({ data: ser.unserialize(raw) }); } // low: RCE
  catch (e) { return J({ error: String(e.message || e) }, 400); }
}

// #18 CORS Misconfiguration
function me(ctx) {
  const { level, headers } = ctx;
  const origin = headers.origin || "";
  const h = { "Access-Control-Allow-Credentials": "true" };
  if (level === "low") h["Access-Control-Allow-Origin"] = origin || "*";        // yansitma
  else if (level === "medium" && origin.endsWith("trusted.com")) h["Access-Control-Allow-Origin"] = origin;
  else if (level === "high" && origin === "https://trusted.com") h["Access-Control-Allow-Origin"] = origin;
  return J({ email: "admin@lab.local", role: "admin" }, 200, h);
}

// #21 Host Header Injection / Password Reset Poisoning
function reset(ctx) {
  const { level, headers } = ctx;
  let host;
  if (level === "high") host = process.env.APP_URL || "app.lab.local";
  else if (level === "medium") host = headers["x-forwarded-host"] || headers.host;
  else host = headers.host;
  return J({ link: `http://${host}/reset?token=` + crypto.randomBytes(4).toString("hex") });
}

// #23 Race Condition (Kupon)
async function coupon(ctx) {
  const { level, db, body } = ctx;
  const code = (body && body.code) || "";
  if (body && body.reset) { await db.couponReset(code); return J({ reset: true }); } // lab: tekrar denemek icin
  if (level === "high") {
    const n = await db.couponUseAtomic(code); // atomik
    return J({ applied: n === 1 });
  }
  const c = await db.couponByCode(code); // low: TOCTOU penceresi
  if (c && c.used === 0) {
    await sleep(40);
    await db.setCouponUsed(code);
    return J({ applied: true, value: c.value });
  }
  return J({ applied: false });
}

// #24 Business Logic — Fiyat/Miktar
async function checkout(ctx) {
  const { level, db, body } = ctx;
  const p = await db.productById(body.productId);
  const price = level === "low" ? Number(body.price) : (p ? p.price : 0);
  const qty = level === "high" ? Math.max(1, Math.floor(Math.abs(Number(body.qty || 1)))) : Number(body.qty || 1);
  return J({ productId: body.productId, price, qty, total: price * qty });
}

// #26 ReDoS  (DIKKAT: low/medium katastrofik girdiyle CPU'yu kilitler — kasitli)
function validate(ctx) {
  const { level, body } = ctx;
  const v = (body && body.v) || "";
  if (level === "high") return J({ ok: /^[a-z]+$/.test(v) }); // lineer
  const re = /^(a+)+$/;                                        // catastrophic backtracking
  return J({ ok: re.test(v) });
}

// #32 BOLA / IDOR
async function orders(ctx) {
  const { level, db, params, headers } = ctx;
  const id = params.id;
  const uid = headers["x-user-id"] || "0"; // demo: oturum kullanicisi
  if (level === "high") {
    const o = await db.orderByIdAndUser(id, uid);
    return o ? J(o) : J({ error: "not found" }, 404);
  }
  const o = await db.orderById(id); // sahiplik kontrolu yok
  return o ? J(o) : J({ error: "not found" }, 404);
}

// #33 OTP / 2FA Brute Force
function twofaVerify(ctx) {
  const { level, body } = ctx;
  const user = (body && body.user) || "anon";
  const code = (body && body.code) || "";
  if (level !== "low") {
    const n = (store.otpAtt.get(user) || 0) + 1;
    store.otpAtt.set(user, n);
    if (n > 5) return J({ error: "too many attempts" }, 429);
  }
  const ok = store.otp.get(user) === code;
  return J({ ok });
}

// #34 Insecure Randomness
function token(ctx) {
  const { level } = ctx;
  let t;
  if (level === "high") t = crypto.randomBytes(32).toString("hex");
  else t = Date.now().toString(36) + Math.random().toString(36).slice(2); // tahmin edilebilir
  return J({ resetToken: t });
}

// #36 Server-Side Prototype Pollution -> gadget
function config(ctx) {
  const { level, body } = ctx;
  if (level === "high") return J({ ok: true, gadget: "none" });
  let input = body || {};
  if (level === "medium" && input.__proto__) delete input.__proto__;
  const cfg = {};
  try { merge(cfg, body || {}); } catch {}
  // gadget: sonradan olusturulan "spawn opsiyonlari" kirlenen prototype'i miras alir
  const opts = {};
  const gadget = opts.NODE_OPTIONS || null;
  delete Object.prototype.NODE_OPTIONS;
  delete Object.prototype.isAdmin;
  return J({ ok: true, pollutedGadget: gadget });
}

// ============================================================================
//  ROUTE KAYIT DEFTERI  (test sunucusu + Next.js wrapper jeneratoru kullanir)
// ============================================================================
const ROUTES = [
  { method: "POST", path: "/api/login", fn: login },
  { method: "POST", path: "/api/ping", fn: ping },
  { method: "POST", path: "/api/profile", fn: profile },
  { method: "GET",  path: "/api/read", fn: read },
  { method: "GET",  path: "/api/product", fn: product },
  { method: "GET",  path: "/api/check", fn: check },
  { method: "GET",  path: "/api/search", fn: search },
  { method: "POST", path: "/api/jwt/verify", fn: jwtVerify },
  { method: "POST", path: "/api/avatar", fn: avatar },
  { method: "POST", path: "/api/settings", fn: settings },
  { method: "POST", path: "/api/2fa", fn: twofa },
  { method: "PUT",  path: "/api/user", fn: userUpdate },
  { method: "POST", path: "/api/template", fn: template },
  { method: "GET",  path: "/api/redirect", fn: redirect },
  { method: "POST", path: "/api/cart/import", fn: cartImport },
  { method: "GET",  path: "/api/me", fn: me },
  { method: "POST", path: "/api/reset", fn: reset },
  { method: "POST", path: "/api/coupon", fn: coupon },
  { method: "POST", path: "/api/checkout", fn: checkout },
  { method: "POST", path: "/api/validate", fn: validate },
  { method: "GET",  path: "/api/orders/:id", fn: orders },
  { method: "POST", path: "/api/2fa/verify", fn: twofaVerify },
  { method: "GET",  path: "/api/token", fn: token },
  { method: "POST", path: "/api/config", fn: config },
];

module.exports = {
  store, redirectDest, merge, ROUTES,
  login, ping, profile, read, product, check, search, jwtVerify, avatar,
  settings, twofa, userUpdate, template, redirect, cartImport, me, reset,
  coupon, checkout, validate, orders, twofaVerify, token, config,
};
