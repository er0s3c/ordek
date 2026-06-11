// Command Injection HEDEF MAKINESI — gerçek "Ping Aracı" sayfası.
// GET /cmd  -> giriş formu (HTML)
// POST /cmd -> form-encoded ping işlemi (Command Injection'a açık)
import { exec } from "node:child_process";
import { promisify } from "node:util";
import fs from "fs";
import { getLevel } from "@/lib/level";
import { FLAGS } from "@/lib/flags";
import { cardPage, flagBanner, esc, html } from "@/lib/machine-ui";

const execAsync = promisify(exec);
export const dynamic = "force-dynamic";
const FLAG = FLAGS["command-injection"];

// Konteyner-içi hedef dosya (saldırgan okumaya çalışacak).
// Windows'ta /tmp yoktur; build/dev'i çökertmemek için guard'lı (Docker/Linux'ta çalışır).
try {
  if (!fs.existsSync("/tmp/flag.txt")) fs.writeFileSync("/tmp/flag.txt", "Gizli flag'i buldun!\n" + FLAG + "\n");
} catch {}

function render(level, { output = "", showFlag = false } = {}) {
  const body = `
    <div class="brand"><img src="/ordek.png" alt="ördek"><div class="t">ördek <span>// net-tools</span></div></div>
    <p class="sub" style="text-align:center;margin-bottom:18px">Ağ bağlantısını test etmek için bir IP adresi veya alan adı girin.</p>
    <form method="post" action="/cmd">
      <div class="input-group"><label>IP Adresi / Hostname</label><input name="ip" autofocus placeholder="127.0.0.1"></div>
      <button class="btn primary block" type="submit">Ping At</button>
    </form>
    ${output ? `<div class="out" style="margin-top:14px">${output}</div>` : ""}
    ${showFlag ? `<div style="margin-top:14px">${flagBanner({ value: FLAG, sub: "Sunucuda komut çalıştırdın (RCE)." })}</div>` : ""}
    <p class="sub" style="text-align:center;margin-top:14px;font-size:11px;color:var(--ink-faint)">ördek net-tools v1.2 · level: ${esc(level)}</p>
  `;
  return cardPage({ title: "ördek // Ağ Araçları", level, cardTitle: `// internal network tools &nbsp; (level: ${level.toUpperCase()})`, body, width: 520 });
}

export async function GET(req) {
  return html(render(getLevel(req.headers)));
}

export async function POST(req) {
  const level = getLevel(req.headers);
  let ip = "";
  try { const f = await req.formData(); ip = String(f.get("ip") || ""); } catch {}

  if (!ip) {
    return html(render(level, { output: `<span class="err">Hata: Lütfen bir IP adresi girin.</span>` }), 400);
  }

  // Güvenlik seviyesi filtreleri
  let target = ip;
  if (level === "medium") {
    target = target.replace(/&&/g, "").replace(/;/g, ""); // | ve ` ` hâlâ açık
  } else if (level === "high") {
    target = target.replace(/ /g, ""); // boşluk yasak; $IFS ile atlatma denenebilir
  }
  // low: filtre yok

  let outputResult = "";
  try {
    const { stdout, stderr } = await execAsync(`ping -c 2 ${target}`, { timeout: 5000 });
    outputResult = stdout || stderr;
  } catch (error) {
    outputResult = error.stdout || error.stderr || error.message;
  }

  const showFlag = outputResult.includes("ordek{") || outputResult.includes("root:");
  return html(render(level, { output: esc(outputResult), showFlag }));
}
