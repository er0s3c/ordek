// /api/tool-loot — offline (loot) araç labları için indirilebilir artefakt.
// BYO-Kali: öğrenci dosyayı indirir, KENDİ Kali/Linux'unda kırar, çıkan değeri flag gönderir.
// Artefakt FLAGS[slug]'tan SUNUCUDA üretilir (node crypto → platformdan bağımsız).
//   tool-hashcat / tool-john → md5(flag) hash dosyası  (+ ?part=wordlist → sözlük)
//   tool-theharvester        → OSINT sonuç metni (flag içinde)
//   tool-aircrack            → docker/attacker/loot/handshake.cap (operatör sağlar) + sözlük
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { FLAGS } from "@/lib/flags";

export const dynamic = "force-dynamic";

const md5 = (s) => crypto.createHash("md5").update(String(s)).digest("hex");

function file(name, body, type = "text/plain; charset=utf-8") {
  const data = typeof body === "string" ? Buffer.from(body) : body;
  return new Response(data, {
    status: 200,
    headers: { "content-type": type, "content-disposition": `attachment; filename="${name}"`, "content-length": String(data.length) },
  });
}
const notFound = (msg) => new Response(msg, { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });

// Sözlük: flag + çeldiriciler (lab kolaylığı; asıl öğrenme aracı doğru çalıştırmak).
function wordlist(flag) {
  const decoys = ["123456", "password", "qwerty", "admin", "letmein", "dragon", "monkey",
    "iloveyou", "welcome", "ninja", "abc123", "sunshine", "princess", "football", "ordek",
    "kali2024", "root", "toor", "changeme", "hunter2"];
  const all = [...decoys.slice(0, 10), flag, ...decoys.slice(10)];
  return all.join("\n") + "\n";
}

export async function GET(req) {
  const url = new URL(req.url);
  const slug = url.searchParams.get("slug") || "";
  const part = url.searchParams.get("part") || "";
  const flag = FLAGS[slug];
  if (!flag) return notFound("bilinmeyen lab");

  if (part === "wordlist") return file("wordlist.txt", wordlist(flag));

  switch (slug) {
    case "tool-hashcat":
      return file("hash.txt", md5(flag) + "\n");               // hashcat -m 0
    case "tool-john":
      return file("hashes.txt", md5(flag) + "\n");             // john --format=Raw-MD5
    case "tool-theharvester":
      return file("osint.txt",
        "# theHarvester (ördek.lab) — toplanan kayıtlar\n[emails]\nadmin@ordek.lab\nit@ordek.lab\n" +
        "[hosts]\nwww.ordek.lab\nmail.ordek.lab\nvpn.ordek.lab\n" + flag + ".ordek.lab\n");
    case "tool-aircrack": {
      const cap = path.join(process.cwd(), "docker", "attacker", "loot", "handshake.cap");
      try { return file("handshake.cap", fs.readFileSync(cap), "application/octet-stream"); }
      catch { return notFound("handshake.cap sağlanmadı (operatör docker/attacker/loot/handshake.cap eklemeli; passphrase=flag)."); }
    }
    default:
      return notFound("bu lab loot dosyası sunmaz");
  }
}
