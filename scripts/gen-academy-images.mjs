// ============================================================================
//  scripts/gen-academy-images.mjs
//  Akademi görsellerini Gemini 3 Pro Image (Nano Banana Pro) ile üretir.
//  Çıktı: public/academy/<id>.png   (idempotent — mevcut dosyayı atlar)
//
//  Kullanım:
//    node scripts/gen-academy-images.mjs            # eksik tüm görselleri üret
//    node scripts/gen-academy-images.mjs --force    # hepsini yeniden üret
//    node scripts/gen-academy-images.mjs --only=ag-modelleri
//    node scripts/gen-academy-images.mjs --test     # tek görselle anahtarı doğrula
//
//  Anahtar .env içindeki GEMINI_API_KEY'den okunur (koda gömülmez).
// ============================================================================
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT_DIR = path.join(ROOT, "public", "academy");
const MODEL_DEFAULT = "gemini-3-pro-image-preview";

// ---- .env'i elle oku (standalone node Next.js env'i yüklemez) ----
function loadEnv() {
  const env = { ...process.env };
  try {
    const txt = fs.readFileSync(path.join(ROOT, ".env"), "utf-8");
    for (const line of txt.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !line.trim().startsWith("#")) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {}
  return env;
}

const ENV = loadEnv();
const KEY = ENV.GEMINI_API_KEY;
if (!KEY) {
  console.error("✗ GEMINI_API_KEY .env içinde bulunamadı.");
  process.exit(1);
}

const args = process.argv.slice(2);
const FORCE = args.includes("--force");
const TEST = args.includes("--test");
const ONLY = (args.find((a) => a.startsWith("--only=")) || "").split("=")[1] || null;
const MODEL = (args.find((a) => a.startsWith("--model=")) || "").split("=")[1] || MODEL_DEFAULT;

// Ortak görsel stili — tüm promptlara eklenir (izometrik / neon-yeşil, temayla uyumlu).
const STYLE =
  "isometric technical illustration, phosphor green (#8fcf3f) and lime accents glowing on a dark " +
  "charcoal (#171a16) background, subtle neon glow and thin grid lines, clean modern vector-3D look, " +
  "high detail, centered composition, no text, no words, no letters, no labels, " +
  "cybersecurity / computer-networking education diagram, professional, crisp";

async function callGemini(prompt, aspect) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
  const body = {
    contents: [{ role: "user", parts: [{ text: `${prompt}. Style: ${STYLE}.` }] }],
    generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: aspect || "3:2" } },
  };
  // Anahtar tipine göre iki yetkilendirme yolu dene: x-goog-api-key, sonra Bearer (OAuth jetonu olabilir).
  const attempts = [
    { "content-type": "application/json", "x-goog-api-key": KEY },
    { "content-type": "application/json", authorization: `Bearer ${KEY}` },
  ];
  let lastErr = "";
  for (const headers of attempts) {
    let res;
    try {
      res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
    } catch (e) {
      lastErr = `ağ hatası: ${e.message}`;
      continue;
    }
    const txt = await res.text();
    if (!res.ok) {
      lastErr = `HTTP ${res.status}: ${txt.slice(0, 400)}`;
      // 401/403 → diğer yetkilendirme yolunu dene; başka hata → dur.
      if (res.status === 401 || res.status === 403) continue;
      throw new Error(lastErr);
    }
    let json;
    try { json = JSON.parse(txt); } catch { throw new Error(`yanıt JSON değil: ${txt.slice(0, 300)}`); }
    const parts = json?.candidates?.[0]?.content?.parts || [];
    const img = parts.find((p) => p.inlineData?.data || p.inline_data?.data);
    const data = img?.inlineData?.data || img?.inline_data?.data;
    if (!data) throw new Error(`yanıtta görsel yok: ${txt.slice(0, 300)}`);
    return Buffer.from(data, "base64");
  }
  throw new Error(lastErr || "bilinmeyen hata");
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  if (TEST) {
    console.log("→ Anahtar testi: tek görsel üretiliyor…");
    const buf = await callGemini(
      "An isometric diagram of the OSI 7-layer network model as a stack of seven glowing layers",
      "3:2"
    );
    const out = path.join(OUT_DIR, "_test.png");
    fs.writeFileSync(out, buf);
    console.log(`✓ Anahtar GEÇERLİ. Test görseli: ${path.relative(ROOT, out)} (${(buf.length / 1024).toFixed(0)} KB)`);
    return;
  }

  const { MANIFEST } = await import("./academy-images.manifest.mjs");
  let items = MANIFEST;
  if (ONLY) items = items.filter((m) => m.id === ONLY);

  let made = 0, skipped = 0, failed = 0;
  for (const item of items) {
    const out = path.join(OUT_DIR, `${item.id}.png`);
    if (!FORCE && fs.existsSync(out)) { skipped++; continue; }
    try {
      process.stdout.write(`→ ${item.id} … `);
      const buf = await callGemini(item.prompt, item.aspect);
      fs.writeFileSync(out, buf);
      console.log(`✓ (${(buf.length / 1024).toFixed(0)} KB)`);
      made++;
      await new Promise((r) => setTimeout(r, 1500)); // hız sınırı için nazik bekleme
    } catch (e) {
      console.log(`✗ ${e.message}`);
      failed++;
    }
  }
  console.log(`\nBitti. üretildi=${made} atlandı=${skipped} hata=${failed} toplam=${items.length}`);
}

main().catch((e) => { console.error("✗", e.message); process.exit(1); });
