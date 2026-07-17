// ============================================================================
//  lib/target-cookie.js — HEDEF proxy "sabitleme" çerezi (panel + proxy ORTAK).
//  Panel (:3000) sahipliği doğrulayıp imzalar; proxy (:3001) doğrular. HMAC-SHA256.
//  Değer: base64url(JSON {t:token, exp}) "." base64url(HMAC). httpOnly cookie.
//  CommonJS — hem Next (panel) hem düz node (proxy .mjs) named-import edebilsin.
// ============================================================================
const crypto = require("node:crypto");

const COOKIE = "ordek_target";
const MAXAGE_S = 60 * 60 * 12; // 12 saat
const TOKEN_RE = /^[A-Za-z0-9_-]{6,64}$/;
// lib/session.js ile AYNI fallback → setup yapılmadan dev'de de imzalar tutar.
const secret = () => process.env.LAB_SESSION_SECRET || "ordek-lab-dev-session-secret-change-me";

const b64u = (buf) => Buffer.from(buf).toString("base64url");
const hmac = (data) => crypto.createHmac("sha256", secret()).update(data).digest();

// kind: "vuln" (tek konteyner :3000) | "tool" (saldırgan kutusu ttyd/noVNC).
function signTarget(token, kind) {
  const k = kind === "tool" ? "tool" : "vuln";
  const body = b64u(JSON.stringify({ t: token, k, exp: Date.now() + MAXAGE_S * 1000 }));
  return `${body}.${b64u(hmac(body))}`;
}

// Doğrulanmış { t, k } döner (eski/yalın cookie'lerde k varsayılan "vuln"). Geçersizse null.
function verifyTarget(value) {
  if (!value || typeof value !== "string") return null;
  const dot = value.indexOf(".");
  if (dot < 1) return null;
  const body = value.slice(0, dot), sig = value.slice(dot + 1);
  let expected; try { expected = b64u(hmac(body)); } catch { return null; }
  if (sig.length !== expected.length) return null;
  try { if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null; } catch { return null; }
  let obj; try { obj = JSON.parse(Buffer.from(body, "base64url").toString("utf-8")); } catch { return null; }
  if (!obj || typeof obj !== "object" || !TOKEN_RE.test(obj.t || "")) return null;
  if (obj.exp && Date.now() > obj.exp) return null;
  return { t: obj.t, k: obj.k === "tool" ? "tool" : "vuln" };
}

// Set-Cookie değeri (path=/, host-scoped → :3001'e de gider).
function targetCookie(token, kind) {
  return `${COOKIE}=${signTarget(token, kind)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAXAGE_S}`;
}

module.exports = { COOKIE, MAXAGE_S, TOKEN_RE, signTarget, verifyTarget, targetCookie };
