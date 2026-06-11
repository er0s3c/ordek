// LFI HEDEF MAKINESI — gerçek "Dosya Görüntüleyici" sayfası.
// GET /lfi?file=xxx -> dosya okuyucu (Path Traversal / LFI'ye açık)
import fs from "fs";
import path from "path";
import { getLevel } from "@/lib/level";
import { FLAGS } from "@/lib/flags";
import { cardPage, flagBanner, esc, html } from "@/lib/machine-ui";

export const dynamic = "force-dynamic";
const FLAG = FLAGS["file-inclusion"];

// Windows'ta /tmp yoktur; build/dev'i çökertmemek için guard'lı (Docker/Linux'ta çalışır).
try {
  if (!fs.existsSync("/tmp/welcome.txt")) fs.writeFileSync("/tmp/welcome.txt", "ördek lab sistemine hoş geldin!\n\nLütfen incelemek istediğin dosyayı seç.\nBu sistem üzerinden yalnızca yetkili sunucu günlükleri okunabilir.");
} catch {}

function render(level, { fileLabel = "", output = "", showFlag = false } = {}) {
  const editor = output ? `
    <div class="panel" style="margin-bottom:14px">
      <div class="panel-h">📄 ${esc(fileLabel).slice(0, 40)}</div>
      <div class="out" style="border:0;border-radius:0;max-height:420px">${output}</div>
    </div>` : "";
  const body = `
    <div class="brand"><img src="/ordek.png" alt="ördek"><div class="t">ördek <span>// logs</span></div></div>
    <form method="get" action="/lfi" style="display:flex;gap:8px;margin-bottom:14px">
      <input name="file" value="welcome.txt" placeholder="Dosya adı..." style="flex:1">
      <button class="btn primary" type="submit" style="white-space:nowrap">Dosyayı Aç</button>
    </form>
    ${editor}
    ${showFlag ? flagBanner({ value: FLAG, sub: "Dizin atlama (path traversal) ile hassas dosya okundu." }) : ""}
    <p class="sub" style="text-align:center;margin-top:12px;font-size:11px;color:var(--ink-faint)">ördek log-viewer v2.1 · level: ${esc(level)}</p>
  `;
  return cardPage({ title: "ördek // File Reader", level, cardTitle: `// server file viewer &nbsp; (level: ${level.toUpperCase()})`, body, width: 650 });
}

export async function GET(req) {
  const level = getLevel(req.headers);
  const url = new URL(req.url);
  if (!url.searchParams.has("file")) return html(render(level));

  let filename = url.searchParams.get("file");

  // === LFI filtreleri ===
  if (level === "medium") {
    // Naif filtre: "../" tek geçişte (recursive olmadan) silinir → "....//" → "../" ile atlatılır.
    filename = filename.replace(/\.\.\//g, "");
  } else if (level === "high") {
    if (filename.startsWith("../")) {
      return html(render(level, { fileLabel: "hata.log", output: `<span class="err">Güvenlik Hatası: Geçersiz dosya yolu! Dizin atlama engellendi.</span>` }), 403);
    }
  }
  // low: filtre yok

  const targetPath = path.isAbsolute(filename) ? filename : path.join("/tmp", filename);
  let outputResult = "";
  try {
    outputResult = fs.readFileSync(targetPath, "utf-8");
    if (targetPath === "/etc/passwd" || targetPath.endsWith("etc/passwd")) {
      outputResult += "\n" + FLAG + "\n"; // izolasyon: flag yalnızca burada okununca eklenir
    }
  } catch (err) {
    outputResult = `Dosya bulunamadı veya okunamadı:\n${err.message}`;
  }

  const showFlag = outputResult.includes("ordek{");
  return html(render(level, { fileLabel: filename, output: esc(outputResult), showFlag }));
}

export async function POST(req) { return GET(req); }
