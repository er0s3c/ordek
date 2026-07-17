// .git / Yedek Dosya İfşası HEDEF MAKINESI — sürüm kontrol & yedek sızıntısı
// GET /git-disclosure?path=/.git/config  -> sızan kaynak/yedek dosyaları servis eder
import { getLevel } from "@/lib/level";
import { FLAGS } from "@/lib/flags";
import { page, html, esc } from "@/lib/machine-ui";

export const dynamic = "force-dynamic";
const FLAG = FLAGS["git-disclosure"];

// Sahte "yanlışlıkla dağıtılan" dosyalar
const FILES = {
  "/.git/config": `[core]\n\trepositoryformatversion = 0\n[remote "origin"]\n\turl = git@github.com:ordek/store.git`,
  "/.git/HEAD": `ref: refs/heads/main`,
  "/.git/logs/HEAD": `0000000 a1b2c3d ördek <dev@ordek.com> commit: ilk sürüm (DB_PASS eklendi)`,
  "/config.php.bak": `<?php\n// YEDEK — silinmeliydi!\n$DB_HOST="db.internal";\n$DB_USER="root";\n$DB_PASS="${FLAG}";\n?>`,
  "/index.php~": `<?php include("config.php.bak"); // TODO: yedeği kaldır ?>`,
  "/.env.bak": `APP_ENV=prod\nSECRET=${FLAG}`,
};

function blocked(path, level) {
  if (level === "high") return true;                         // tüm hassas yollar engelli
  if (level === "medium") return /^\/\.git(\/|$)/.test(path); // .git kapalı; .bak/~/.env hâlâ açık
  return false;                                              // low: hiçbir şey engelli değil
}

export async function GET(req) {
  const level = getLevel(req.headers);
  const url = new URL(req.url);
  const path = url.searchParams.get("path");

  if (path) {
    if (blocked(path, level)) {
      const body = `<div class="panel"><div class="panel-b"><div class="alert">403 — '${esc(path)}' erişimi engellendi.</div></div></div>`;
      return html(page({ title: "ördek // git", level, subtitle: "git-lab", body }), 403);
    }
    const content = FILES[path];
    if (content == null) {
      const body = `<div class="panel"><div class="panel-b"><div class="alert">404 — '${esc(path)}' bulunamadı.</div></div></div>`;
      return html(page({ title: "ördek // git", level, subtitle: "git-lab", body }), 404);
    }
    const leaked = content.includes(FLAG)
      ? `<div class="flag"><span class="ic">⚑</span><div><div class="lbl">Gömülü sır ifşa oldu</div><div class="val">${esc(FLAG)}</div></div></div>` : "";
    const body = `<div class="panel"><div class="panel-b col" style="gap:10px">
      <div class="dim mono">${esc(path)}</div><div class="console"><pre class="leak" style="margin:0;white-space:pre-wrap">${esc(content)}</pre></div>${leaked}</div></div>`;
    return html(page({ title: "ördek // git", level, subtitle: "git-lab", body }));
  }

  const body = `
  <div class="panel"><div class="panel-b col" style="display:flex;flex-direction:column;gap:12px">
    <h2 style="margin:0;font-size:19px">🗂️ ördek Store — Statik Sunucu</h2>
    <p class="sub" style="margin:0">Dağıtım sırasında bazı geliştirme dosyaları siteye sızmış olabilir.<br>
      <b>Hedef:</b> Sürüm kontrol (<code>.git</code>) ve yedek (<code>.bak</code>) dosyalarından gömülü sırrı bul.</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <a class="btn" href="/git-disclosure?path=/.git/config">/.git/config</a>
      <a class="btn" href="/git-disclosure?path=/.git/logs/HEAD">/.git/logs/HEAD</a>
      <a class="btn" href="/git-disclosure?path=/config.php.bak">/config.php.bak</a>
      <a class="btn ghost" href="/git-disclosure?path=/.env.bak">/.env.bak</a></div>
  </div></div>`;
  return html(page({ title: "ördek // git", level, subtitle: "git-lab", body }));
}
