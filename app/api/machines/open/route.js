// Makineyi AÇ — sahipliği doğrula, hedef proxy çerezini imzala, :3001 kapısına yönlendir.
// Sınıf modunda öğrenci yalnız KENDİ makinesini açabilir; başkasınınkine eğlenceli mesaj.
import { getSession } from "@/lib/session";
import { getUserById } from "@/lib/accounts";
import { listMachines } from "@/lib/docker";
import { logEvent } from "@/lib/events";
import { targetCookie, TOKEN_RE } from "@/lib/target-cookie";

export const dynamic = "force-dynamic";

const PROXY_PORT = process.env.PROXY_PUBLIC_PORT || "3001";
const safeLabel = (s) => String(s || "").replace(/[^a-zA-Z0-9_.-]/g, "_").slice(0, 64);

function html(status, title, body) {
  return new Response(
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#171a16;color:#dde3d2;
font-family:system-ui,sans-serif}.c{max-width:460px;text-align:center;padding:28px}.c .e{font-size:54px}.c h2{margin:.3em 0}
.c p{color:#9aa389;line-height:1.6}.c a{color:#b6f24a;text-decoration:none}</style><div class="c">${body}</div>`,
    { status, headers: { "content-type": "text/html; charset=utf-8" } }
  );
}

function proxyOrigin(req) {
  const host = (req.headers.get("host") || "localhost:3000").split(":")[0];
  const proto = (req.headers.get("x-forwarded-proto") || "http").split(",")[0];
  return `${proto}://${host}:${PROXY_PORT}`;
}

export async function GET(req) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") || "";
  if (!TOKEN_RE.test(token)) {
    return html(400, "ördek", `<div class="e">🦆</div><h2>Geçersiz bağlantı</h2><p>Makine bağlantısı hatalı görünüyor. Panele dön ve tekrar dene.</p>`);
  }

  // Makine türünü (vuln/tool) ve sahibini öğren (cookie'ye kind yazılır → proxy doğru yönlenir).
  let kind = "vuln";
  let machines = null;
  try { machines = await listMachines(); } catch { /* docker okunamadı */ }
  const mInfo = machines ? machines.find((x) => x.token === token) : null;
  if (mInfo && mInfo.kind) kind = mInfo.kind;

  // Sahiplik (yalnız sınıf modu + öğrenci oturumu için zorunlu)
  if (process.env.LAB_MODE === "class") {
    const sess = getSession(req);
    if (sess && sess.role === "student") {
      const owner = mInfo ? mInfo.studentId : null;
      if (owner && owner !== safeLabel(sess.userId)) {
        const me = getUserById(sess.userId);
        logEvent({ userId: sess.userId, type: "blocked", detail: token });
        return html(403, "ördek",
          `<div class="e">🦆🚫</div><h2>Burası senin ördeğin değil!</h2>
           <p>Bu makine başka bir öğrenciye ait. Herkes kendi izole ördeğini sömürür 😉<br>
           <b>${me ? me.displayName || me.username : "Sen"}</b>, kendi makineni panelden <b>"Makineyi Başlat"</b> ile aç.</p>
           <p><a href="/">← Panele dön</a></p>`);
      }
    }
  }

  // İmzalı sabitleme çerezi (token + kind) + ayrı kapıya yönlendir
  return new Response(null, {
    status: 302,
    headers: { "set-cookie": targetCookie(token, kind), location: proxyOrigin(req) + "/" },
  });
}
