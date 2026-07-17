// Web Cache Poisoning HEDEF MAKINESI — anahtarsız X-Forwarded-Host yansıması
// GET /cache-poison -> sayfa önbelleğe alınır (key=yol); X-Forwarded-Host unkeyed → zehirlenir
import { getLevel } from "@/lib/level";
import { FLAGS } from "@/lib/flags";
import { page, html, esc } from "@/lib/machine-ui";

export const dynamic = "force-dynamic";
const FLAG = FLAGS["web-cache-poisoning"];

// Basit "CDN" önbelleği — seviyeye göre anahtarlanır (test izolasyonu).
const CACHE = new Map();

function buildCanonical(xfh, level) {
  const raw = xfh || "ordek-store.com";
  if (level === "high") {
    // Güvenli: yalnız geçerli hostname kabul (allowlist regex) → değilse varsayılan.
    const safe = /^[a-zA-Z0-9.-]+$/.test(raw) ? raw : "ordek-store.com";
    return { value: safe, poisoned: false };
  }
  let v = raw;
  if (level === "medium") v = v.replace(/[<>]/g, ""); // naif: yalnız < > silinir, " kalır (attribute breakout)
  // canonical link attribute: href="https://VALUE/"
  const brokeOut = /["<>]/.test(v); // tırnak/tag kaçışı → zehir
  return { value: v, poisoned: brokeOut };
}

export async function GET(req) {
  const level = getLevel(req.headers);
  const url = new URL(req.url);
  if (url.searchParams.get("reset")) { CACHE.delete(level); return html(page({ title: "ördek // cache", level, subtitle: "cache-lab", body: `<div class="panel"><div class="panel-b"><div class="leak">önbellek sıfırlandı.</div></div></div>` })); }

  const xfh = req.headers.get("x-forwarded-host");
  let entry = CACHE.get(level);
  if (!entry) {
    // CACHE MISS → bu isteğin (anahtarsız) başlığından üret ve sakla.
    entry = buildCanonical(xfh, level);
    CACHE.set(level, entry);
  }
  // entry önbellekten (ilk isteyenin başlığıyla zehirlenmiş olabilir) → tüm ziyaretçilere aynısı servis edilir.
  const canonical = `<link rel="canonical" href="https://${entry.value}/">`;
  const flagBlock = entry.poisoned
    ? `<div class="flag"><span class="ic">⚑</span><div><div class="lbl">Önbellek zehirlendi — ziyaretçilere saldırgan içerik servis edildi</div><div class="val">${esc(FLAG)}</div></div></div>`
    : "";
  const body = `
  <div class="panel"><div class="panel-b col" style="gap:12px">
    <h2 style="margin:0;font-size:19px">🛍️ ördek Store — Ana Sayfa (önbellekli)</h2>
    <p class="sub" style="margin:0">Bu sayfa CDN'de önbelleğe alınır. Sayfa kaynağındaki canonical bağlantı <code>X-Forwarded-Host</code> başlığını yansıtır (anahtarsız).</p>
    <div class="console"><div class="dim">Sayfa kaynağı (head)</div><div class="leak">${esc(canonical)}</div></div>
    <p class="sub" style="margin:0">Önbellek durumu: <b>${CACHE.get(level) === entry ? (xfh ? "MISS→STORE" : "HIT") : "HIT"}</b> · değer: <code>${esc(entry.value)}</code></p>
    ${flagBlock}
    <p class="sub" style="margin:0">Dene: <code>curl -H 'X-Forwarded-Host: x"&gt;&lt;img src=x onerror=alert(1)&gt;' /cache-poison</code> ardından başlıksız tekrar iste. <a class="btn ghost sm" href="/cache-poison?reset=1">reset</a></p>
  </div></div>`;
  return html(page({ title: "ördek // cache", level, subtitle: "cache-lab", body }));
}
