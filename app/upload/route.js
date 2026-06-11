// FILE UPLOAD (Webshell) HEDEF MAKINESI
// GET /upload            -> yükleme formu + yüklenenler
// GET /upload?file=ad    -> yüklenen dosyayı servis et (webshell)
// POST /upload           -> dosya yükleme (uzantı/MIME doğrulaması seviyeye göre)
import { getLevel } from "@/lib/level";
import { FLAGS } from "@/lib/flags";
import { page, flagBanner, esc, html } from "@/lib/machine-ui";
import crypto from "crypto";

export const dynamic = "force-dynamic";
const FLAG = FLAGS["file-upload"];

// In-memory (deep-freeze: konteyner kapanınca sıfırlanır)
let uploads = []; // { name, type, content }
let shellUploaded = false;

const EXEC = /\.(js|php|sh|jsp|aspx|cgi|py|rb|phtml)$/i;
const isImageMagic = (hex) => hex.startsWith("89504e47") || hex.startsWith("ffd8ff");

function render(level, msg = null) {
  const body = `
    ${shellUploaded ? flagBanner({ value: FLAG, sub: "Çalıştırılabilir dosya (webshell) yüklendi ve servis edildi." }) : ""}
    <div class="panel"><div class="panel-b col" style="display:flex;flex-direction:column;gap:14px">
      <h2 style="margin:0;font-size:19px">🖼️ Profil Fotoğrafı Yükle</h2>
      <p class="sub" style="margin:0">Bir görsel yükle. <b>Hedef:</b> resim yerine çalıştırılabilir bir dosya (webshell, örn. <code>shell.js</code>) yükle.</p>
      ${msg ? `<div class="note">${esc(msg)}</div>` : ""}
      <form method="post" action="/upload" enctype="multipart/form-data" style="display:flex;flex-direction:column;gap:12px">
        <div class="input-group"><label>Dosya</label><input type="file" name="file" required></div>
        <div class="input-group"><label>Bildirilen İçerik Türü (Burp ile değiştirilebilir)</label><input type="text" name="declaredType" value="image/png"></div>
        <button class="btn primary block" type="submit">Yükle</button>
      </form>
      ${uploads.length ? `<div><div class="faint mono" style="font-size:11px;margin-bottom:6px">YÜKLENENLER</div>${uploads.map((u) => `<div class="note" style="margin-bottom:6px"><a href="/upload?file=${encodeURIComponent(u.name)}" target="_blank">${esc(u.name)}</a> <span class="sub">(${esc(u.type)})</span></div>`).join("")}</div>` : ""}
      <button class="btn" style="align-self:flex-start" onclick="fetch('/upload?reset=1',{method:'POST'}).then(()=>location.href='/upload')">Sıfırla</button>
    </div></div>`;
  return page({ title: "ördek // File Upload", level, subtitle: "profile-upload", body });
}

export async function GET(req) {
  const level = getLevel(req.headers);
  const url = new URL(req.url);
  const fileName = url.searchParams.get("file");
  if (fileName) {
    const u = uploads.find((x) => x.name === fileName);
    if (!u) return html(render(level, "Dosya bulunamadı."), 404);
    // Webshell "servis edilir" — lab güvenliği için text/plain (gerçekte çalıştırılabilirdi)
    return new Response(u.content, { status: 200, headers: { "content-type": "text/plain; charset=utf-8" } });
  }
  return html(render(level));
}

export async function POST(req) {
  const level = getLevel(req.headers);
  const url = new URL(req.url);
  if (url.searchParams.get("reset")) { uploads = []; shellUploaded = false; return html(render(level, "Sıfırlandı.")); }

  let form;
  try { form = await req.formData(); } catch { return html(render(level, "Geçersiz form."), 400); }
  const file = form.get("file");
  const declaredType = String(form.get("declaredType") || "");
  if (!file || typeof file.arrayBuffer !== "function") return html(render(level, "Dosya gerekli."), 400);

  const name = file.name || "dosya";
  const buf = Buffer.from(await file.arrayBuffer());

  if (level === "high") {
    const hex = buf.slice(0, 4).toString("hex");
    if (!isImageMagic(hex)) return html(render(level, "Reddedildi: yalnızca gerçek PNG/JPEG (magic-byte) kabul edilir."), 400);
    const safe = crypto.randomUUID() + ".img";
    uploads.push({ name: safe, type: "image/*", content: "[binary image]" });
    return html(render(level, "Görsel kabul edildi (UUID isim, çalıştırılamaz)."));
  }

  if (level === "medium") {
    if (!declaredType.startsWith("image/")) return html(render(level, "Reddedildi: yalnızca image/* içerik türü kabul edilir (istemci kontrolü)."), 400);
    // MIME bypass: declaredType image/png ama uzantı .js
    uploads.push({ name, type: declaredType, content: buf.toString("utf-8").slice(0, 2000) });
    if (EXEC.test(name)) shellUploaded = true;
    return html(render(level, EXEC.test(name) ? "Yüklendi — MIME kontrolü atlatıldı!" : "Yüklendi."));
  }

  // low: hiç kontrol yok
  uploads.push({ name, type: declaredType || "application/octet-stream", content: buf.toString("utf-8").slice(0, 2000) });
  if (EXEC.test(name)) shellUploaded = true;
  return html(render(level, EXEC.test(name) ? "Webshell yüklendi!" : "Dosya yüklendi."));
}
