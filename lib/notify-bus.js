// ============================================================================
//  lib/notify-bus.js — SUNUCU-ONLY süreç-içi yayın/abone (pub/sub) otobüsü.
//  Gerçek-zamanlı bildirim (SSE) için: bir kanala (genelde userId) abone olan
//  bağlantılara anlık olay iter. Depo/secret YOK — yalnızca bellek-içi fan-out.
//
//  ⚠ Tek-süreç varsayımı (next dev / next start). Çok-worker prod'da kanallar
//    worker'lar arası fan-out etmez → istemci mevcut 4 sn poll'a düşer (fallback).
// ============================================================================

// channel(string) -> Set<fn(payload)>
const channels = new Map();

// Bir kanala abone ol. Geriye aboneliği iptal eden fonksiyon döner.
export function subscribe(channel, fn) {
  if (!channel || typeof fn !== "function") return () => {};
  let set = channels.get(channel);
  if (!set) { set = new Set(); channels.set(channel, set); }
  set.add(fn);
  return () => {
    const s = channels.get(channel);
    if (!s) return;
    s.delete(fn);
    if (s.size === 0) channels.delete(channel);
  };
}

// Tek kanala olay yayınla. Dinleyici yoksa sessiz geçer.
export function publish(channel, payload) {
  if (!channel) return 0;
  const set = channels.get(channel);
  if (!set || set.size === 0) return 0;
  let n = 0;
  for (const fn of set) {
    try { fn(payload); n++; } catch { /* kopuk bağlantı — yoksay */ }
  }
  return n;
}

// Birden çok kanala aynı olayı yayınla (ör. sınıf duyurusu → tüm öğrenciler).
export function publishMany(channels_, payload) {
  let n = 0;
  for (const c of channels_ || []) n += publish(c, payload);
  return n;
}

// Tanı/test için: bir kanaldaki aktif dinleyici sayısı.
export function subscriberCount(channel) {
  const set = channels.get(channel);
  return set ? set.size : 0;
}
