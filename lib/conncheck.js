// ============================================================================
//  lib/conncheck.js — BAĞLANTI TESTİ token'ı (SUNUCU-ONLY, saf — yalnız node:crypto).
//  Öğrenci kendi Kali VM'inden hedefe ulaşıp bu token'ı getirir → ağ ispatı.
//  DURUMSUZ: token = HMAC(LAB_SESSION_SECRET, "conncheck:"+machineToken). Sunucu
//  start'ta hedefe enjekte eder, doğrulamada machineToken'dan yeniden hesaplar
//  (harita yok, restart'ta bozulmaz). İstemci secret olmadan üretemez.
//  Bağımsız modül: hem Next (docker.js) hem düz node (test/units.mjs) import edebilsin.
// ============================================================================
import crypto from "node:crypto";

// lib/session.js ile aynı fallback (env yoksa oturumlar/token bozulmasın).
function secret() { return process.env.LAB_SESSION_SECRET || "ordek-lab-dev-session-secret-change-me"; }

export function connToken(machineToken) {
  const h = crypto.createHmac("sha256", secret()).update("conncheck:" + String(machineToken)).digest("base64url");
  return "ordek-net{" + h.replace(/[^A-Za-z0-9]/g, "").slice(0, 12) + "}";
}

// Pasted değeri beklenen token ile sabit-zamanlı karşılaştır.
export function verifyConn(machineToken, value) {
  if (!machineToken || value == null) return false;
  const a = Buffer.from(connToken(machineToken));
  const b = Buffer.from(String(value).trim());
  if (a.length !== b.length) return false;
  try { return crypto.timingSafeEqual(a, b); } catch { return false; }
}
