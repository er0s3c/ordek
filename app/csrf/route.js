// CSRF HEDEF MAKINESI — gerçek "Profil Güncelleme" sayfası.
// GET /csrf  -> profil formu (HTML)
// POST /csrf -> form-encoded güncelleme (CSRF'e açık)
import { getLevel } from "@/lib/level";
import { FLAGS } from "@/lib/flags";
import { cardPage, flagBanner, esc, html } from "@/lib/machine-ui";

export const dynamic = "force-dynamic";
const FLAG = FLAGS["csrf"];

const generateToken = () => Math.random().toString(36).substring(2, 15);

function render(level, body = "", showFlag = false, currentEmail = "admin@ordek.com") {
  const tokenField = level === "high" ? `<input type="hidden" name="csrf_token" value="${generateToken()}">` : "";
  const inner = `
    <div class="brand"><img src="/ordek.png" alt="ördek"><div class="t">ördek <span>// account</span></div></div>
    ${body}
    <form method="post" action="/csrf">
      ${tokenField}
      <div class="input-group"><label>Kayıtlı E-Posta Adresiniz</label><input name="email" value="${esc(currentEmail)}"></div>
      <button class="btn primary block" type="submit">E-postayı Güncelle</button>
    </form>
    ${showFlag ? `<div style="margin-top:14px">${flagBanner({ value: FLAG, sub: "Admin e-postası dış kaynaklı bir istekle değiştirildi." })}</div>` : ""}
    <p class="sub" style="text-align:center;margin-top:12px;font-size:11px;color:var(--ink-faint)">ördek account v1.3 · level: ${esc(level)}</p>
  `;
  return cardPage({ title: "ördek // Profil", level, cardTitle: `// profile settings &nbsp; (level: ${level.toUpperCase()})`, body: inner, width: 500 });
}

export async function GET(req) {
  return html(render(getLevel(req.headers)));
}

export async function POST(req) {
  const level = getLevel(req.headers);
  let newEmail = "";
  let providedToken = undefined;
  try {
    const f = await req.formData();
    newEmail = String(f.get("email") || "");
    if (f.has("csrf_token")) providedToken = String(f.get("csrf_token") || "");
  } catch {}

  if (!newEmail) {
    return html(render(level, `<div class="alert">Hata: E-posta adresi boş olamaz.</div>`, false));
  }

  const origin = req.headers.get("origin") || req.headers.get("referer") || "";
  const reqHost = req.headers.get("host") || "";
  const originHost = (() => { try { return new URL(origin).host; } catch { return ""; } })();
  // Gerçek same-origin: Origin host'u, isteğin kendi Host'u ile birebir aynı olmalı.
  const genuineSameOrigin = originHost !== "" && originHost === reqHost;

  let errorMsg = "";
  if (level === "medium") {
    // Zayıf Referer/Origin kontrolü: no-referrer veya 'localhost:3000' alt dizgesi içeren
    // sahte Origin (örn. http://localhost:3000.evil.com) ile atlatılır.
    const weakOk = origin === "" || origin.includes("localhost:3000") || origin.includes("127.0.0.1:3000");
    if (!weakOk) errorMsg = "Güvenlik Hatası: Geçersiz Referer/Origin.";
  } else if (level === "high") {
    // Loose-check: token YALNIZCA varsa doğrulanır → hiç göndermeyince geçer (logic flaw).
    if (providedToken !== undefined && providedToken !== "secret_server_token_123") {
      errorMsg = "Güvenlik Hatası: CSRF token geçersiz.";
    }
  }

  if (errorMsg) {
    return html(render(level, `<div class="alert">${errorMsg}</div>`, false));
  }

  // Dış kaynaklı (gerçek same-origin OLMAYAN) bir istek = başarılı CSRF.
  const isCsrfAttack = !genuineSameOrigin;
  const body = isCsrfAttack
    ? `<div class="note" style="border-left-color:var(--green);color:var(--green-bright)">E-posta güncellendi: ${esc(newEmail)}<br><br><b>DIŞ KAYNAKLI İSTEK TESPİT EDİLDİ — CSRF ZAFİYETİ!</b></div>`
    : `<div class="note" style="border-left-color:var(--green);color:var(--green-bright)">E-posta güncellendi: ${esc(newEmail)} (Normal Same-Origin istek)</div>`;

  return html(render(level, body, isCsrfAttack, newEmail));
}
