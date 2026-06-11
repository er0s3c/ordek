#!/usr/bin/env node
// ============================================================================
//  setup.mjs — ördek-lab kurulum sihirbazı (bağımlılıksız, Node yerleşik).
//  GitHub'dan kurarken çalıştır:  npm run setup   (veya: node setup.mjs)
//  Sorar: BİREYSEL mi, SINIF mı? → .env'e LAB_MODE + LAB_SESSION_SECRET yazar,
//  data/ klasörünü oluşturur ve sonraki adımları yazdırır.
//  Sınıf modunda öğretmen hesabı, panel İLK AÇILDIĞINDA tarayıcı sihirbazıyla kurulur.
// ============================================================================
import readline from "node:readline";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const ENV_PATH = path.join(ROOT, ".env");
const DATA_DIR = path.join(ROOT, "data");

const C = { g: "\x1b[32m", c: "\x1b[36m", y: "\x1b[33m", d: "\x1b[2m", b: "\x1b[1m", r: "\x1b[0m" };
const log = (s = "") => console.log(s);

// Mevcut .env'i (varsa) anahtar=değer olarak oku — secret'ı koru.
function readEnv() {
  const out = {};
  try {
    for (const line of fs.readFileSync(ENV_PATH, "utf-8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) out[m[1]] = m[2];
    }
  } catch {}
  return out;
}

function writeEnv(env) {
  const order = ["LAB_MODE", "LAB_SESSION_SECRET"];
  const keys = [...order, ...Object.keys(env).filter((k) => !order.includes(k))];
  const body =
    "# ördek-lab — setup.mjs tarafından üretildi. Bu dosyayı paylaşmayın (secret içerir).\n" +
    keys.filter((k) => env[k] !== undefined).map((k) => `${k}=${env[k]}`).join("\n") + "\n";
  fs.writeFileSync(ENV_PATH, body);
}

function argMode() {
  const a = process.argv.slice(2).join(" ");
  const m = a.match(/--mode[= ](class|individual|sinif|bireysel)/i);
  if (!m) return null;
  const v = m[1].toLowerCase();
  return v === "class" || v === "sinif" ? "class" : "individual";
}

function ask(rl, q) { return new Promise((res) => rl.question(q, (a) => res(a.trim()))); }

async function main() {
  log("");
  log(`${C.g}${C.b}🦆 ördek-lab — Kurulum Sihirbazı${C.r}`);
  log(`${C.g}${C.d}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${C.r}`);
  log(`${C.d}Eğitim amaçlı, kasıtlı zafiyetli web güvenliği laboratuvarı.${C.r}`);
  log("");

  const env = readEnv();
  let mode = argMode();

  if (!mode) {
    if (!process.stdin.isTTY) {
      mode = "individual";
      log(`${C.y}! Etkileşimli terminal yok; varsayılan: BİREYSEL. (Sınıf için: node setup.mjs --mode class)${C.r}`);
    } else {
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      log(`Kurulum türünü seç:`);
      log(`  ${C.c}[1]${C.r} ${C.b}Bireysel${C.r}  ${C.d}— tek kişi, yerel kullanım. Basit giriş (admin/password).${C.r}`);
      log(`  ${C.c}[2]${C.r} ${C.b}Sınıf${C.r}     ${C.d}— öğretmen + öğrenciler. Sınıf kodu, kayıt, canlı takip paneli.${C.r}`);
      log("");
      let ans = "";
      while (!["1", "2"].includes(ans)) {
        ans = (await ask(rl, `Seçimin [1/2]: `)).trim();
        if (!["1", "2"].includes(ans)) log(`${C.y}Lütfen 1 ya da 2 gir.${C.r}`);
      }
      rl.close();
      mode = ans === "2" ? "class" : "individual";
    }
  }

  env.LAB_MODE = mode;
  if (!env.LAB_SESSION_SECRET || env.LAB_SESSION_SECRET.length < 16) {
    env.LAB_SESSION_SECRET = crypto.randomBytes(32).toString("hex");
  }

  fs.mkdirSync(DATA_DIR, { recursive: true });
  writeEnv(env);

  log("");
  log(`${C.g}✓ Kurulum tamam.${C.r}  Mod: ${C.b}${mode === "class" ? "SINIF" : "BİREYSEL"}${C.r}`);
  log(`${C.d}  .env yazıldı (LAB_MODE, LAB_SESSION_SECRET) · data/ hazır.${C.r}`);
  log("");
  log(`${C.b}Sonraki adımlar:${C.r}`);
  log(`  ${C.c}docker compose up -d --build${C.r}   ${C.d}# panel → http://localhost:3000${C.r}`);
  log(`  ${C.d}(Docker'sız geliştirme: npm install && npm run dev)${C.r}`);
  log("");
  if (mode === "class") {
    log(`${C.b}👩‍🏫 Sınıf modu — sırada ne var?${C.r}`);
    log(`  ${C.c}1.${C.r} Paneli ilk açtığında ${C.b}öğretmen hesabı sihirbazı${C.r} (adım adım) seni karşılar.`);
    log(`  ${C.c}2.${C.r} Öğretmen panelinde bir ${C.b}sınıf${C.r} oluştur → üretilen ${C.b}sınıf kodunu${C.r} öğrencilerine ver.`);
    log(`  ${C.c}3.${C.r} Öğrenciler "Kayıt ol" → kodu girerek katılır.`);
    log(`  ${C.c}4.${C.r} İlerleme + aktiviteyi ${C.b}canlı${C.r} izle (matris, zaman çizelgesi, makineler).`);
    log("");
    log(`  ${C.y}⚠ Kasıtlı zafiyetli paylaşımlı sunucu — YALNIZCA izole sınıf/LAN ağında çalıştır.${C.r}`);
  } else {
    log(`${C.b}🧑‍💻 Bireysel mod:${C.r} panele ${C.b}admin / password${C.r} ile gir, zafiyetleri çözmeye başla.`);
    log(`${C.d}  (Öğretmen/sınıf moduna geçmek istersen: ${C.r}node setup.mjs --mode class${C.d} ya da panelde "Başlarken" rehberi.)${C.r}`);
  }
  log("");
}

main().catch((e) => { console.error(e); process.exit(1); });
