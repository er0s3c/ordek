// Brute Force HEDEF MAKINESI — gerçek login sayfası (JSON API DEĞİL).
// GET /brute  -> giriş formu (HTML)
// POST /brute -> form-encoded kimlik doğrulama (Hydra/Burp http-post-form ile sömürülebilir)
import crypto from "node:crypto";
import { db } from "@/lib/db";
import { getLevel } from "@/lib/level";
import { FLAGS } from "@/lib/flags";
import { cardPage, flagBanner, esc, html } from "@/lib/machine-ui";

export const dynamic = "force-dynamic";
const md5 = (s) => crypto.createHash("md5").update(String(s)).digest("hex");
const FLAG = FLAGS["brute-force"];

// Konteyner-içi durum (deep-freeze: makine yeniden başlayınca sıfırlanır)
const fails = new Map();
const FAIL_MSG = "Gecersiz kullanici adi veya parola"; // Hydra F-string (ASCII)

const fail = (t, comment = "LOGIN_FAILED") => `<div class="alert"><!-- ${comment} -->${t}</div>`;
const okMsg = (t) => `<div class="note" style="border-left-color:var(--green);color:var(--green-bright)"><!-- LOGIN_OK -->${t}</div>`;

function render(level, body = "", showFlag = false) {
  const inner = `
    <div class="brand"><img src="/ordek.png" alt="ördek"><div class="t">ördek <span>// secure-portal</span></div></div>
    ${body}
    <form method="post" action="/brute">
      <div class="input-group"><label>Kullanıcı adı</label><input name="username" autofocus placeholder="kullanıcı"></div>
      <div class="input-group"><label>Parola</label><input name="password" type="password" placeholder="••••••••"></div>
      <button class="btn primary block" type="submit">Giriş yap</button>
    </form>
    ${showFlag ? `<div style="margin-top:14px">${flagBanner({ value: FLAG, sub: "Sözlük saldırısı (brute force) başarılı." })}</div>` : ""}
    <p class="sub" style="text-align:center;margin-top:12px;font-size:11px;color:var(--ink-faint)">ördek secure-portal v1.0 · level: ${esc(level)}</p>
  `;
  return cardPage({ title: "ördek // Giriş", level, cardTitle: `// authentication required &nbsp; (level: ${level.toUpperCase()})`, body: inner, width: 400 });
}

export async function GET(req) {
  return html(render(getLevel(req.headers)));
}

export async function POST(req) {
  const level = getLevel(req.headers);
  let username = "", password = "";
  try { const f = await req.formData(); username = String(f.get("username") || ""); password = String(f.get("password") || ""); } catch {}

  // HIGH: hesap-bazlı kilitleme; "admin " ile boşluk ekleyerek lockout-bypass denenebilir.
  if (level === "high") {
    const rawUsername = username;
    const trimUsername = username.trim();
    if ((fails.get(rawUsername) || 0) >= 5) {
      return html(render(level, fail("Hesap geçici olarak kilitlendi (çok fazla hatalı deneme).", "LOCKED")));
    }
    let ok = false, showFlag = false;
    if (trimUsername === "admin" && password === "bird") { ok = true; showFlag = true; }
    else { try { const u = await db.userByUsername(trimUsername); ok = !!u && u.password === md5(password); } catch {} }
    if (ok) {
      fails.delete(rawUsername);
      return html(render(level, okMsg("Giriş başarılı! Hoş geldin, admin."), showFlag));
    }
    fails.set(rawUsername, (fails.get(rawUsername) || 0) + 1);
    return html(render(level, fail(FAIL_MSG)));
  }

  // MEDIUM: hız sınırı X-Forwarded-For'a güvenir → spoof ile atlatılır.
  if (level === "medium") {
    const clientIp = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const ipTries = fails.get(clientIp) || 0;
    if (ipTries >= 3) {
      return html(render(level, fail(`Çok fazla deneme. Lütfen bekleyin. (IP: ${esc(clientIp)})`, "RATE_LIMITED")));
    }
    fails.set(clientIp, ipTries + 1);
    let ok = false, showFlag = false;
    if (username === "admin" && password === "bird") { ok = true; showFlag = true; }
    else { try { const u = await db.userByUsername(username); ok = !!u && u.password === md5(password); } catch {} }
    if (ok) {
      fails.delete(clientIp);
      return html(render(level, okMsg("Giriş başarılı! Hoş geldin, admin."), showFlag));
    }
    return html(render(level, fail(FAIL_MSG)));
  }

  // LOW: sınırsız deneme + user-enumeration (detaylı hata).
  let ok = false, showFlag = false, detailMsg = "";
  if (username === "admin" && password === "bird") { ok = true; showFlag = true; }
  else if (username === "admin" && password !== "bird") { detailMsg = "Parola yanlis."; }
  else {
    try {
      const u = await db.userByUsername(username);
      if (!u) detailMsg = "Boyle bir kullanici yok.";
      else if (u.password === md5(password)) ok = true;
      else detailMsg = "Parola yanlis.";
    } catch { detailMsg = "Boyle bir kullanici yok."; }
  }
  if (ok) return html(render(level, okMsg("Giriş başarılı! Hoş geldin, admin."), showFlag));
  return html(render(level, fail(detailMsg)));
}
