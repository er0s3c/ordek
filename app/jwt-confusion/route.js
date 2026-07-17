// JWT Algorithm Confusion (RS256 → HS256) HEDEF MAKINESI
// GET /jwt-confusion?action=pubkey -> sızan public key ; POST /jwt-confusion {token} -> doğrula
import { getLevel } from "@/lib/level";
import { FLAGS } from "@/lib/flags";
import { page, html, esc } from "@/lib/machine-ui";
import crypto from "crypto";

export const dynamic = "force-dynamic";
const FLAG = FLAGS["jwt-alg-confusion"];

// Sunucunun RSA anahtar çifti (public key "yanlışlıkla" sızıyor).
const { publicKey: PUB, privateKey: PRIV } = crypto.generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

function jwtLib() { try { return require("jsonwebtoken"); } catch { return null; } }
function json(obj, status = 200) { return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } }); }
function part(token, i) { try { return JSON.parse(Buffer.from(String(token).split(".")[i], "base64url").toString("utf-8")); } catch { return {}; } }
const decodeHeader = (t) => part(t, 0);
// ⚠ ZAFİYET ÇEKİRDEĞİ: 'alg' başlığına güvenip public anahtarı HMAC sırrı gibi kullanan ELLE doğrulama.
// (jsonwebtoken v9 bunu kasıtlı engeller; gerçekçi confusion için imzayı elle hesaplıyoruz.)
function hmacValid(token, keyPem) {
  const [h, p, sig] = String(token).split(".");
  if (!h || !p || sig == null) return false;
  const expected = crypto.createHmac("sha256", keyPem).update(`${h}.${p}`).digest("base64url");
  return sig === expected ? part(token, 1) : false;
}

export async function GET(req) {
  const level = getLevel(req.headers);
  const url = new URL(req.url);
  if (url.searchParams.get("action") === "pubkey") return json({ publicKey: PUB });
  if (url.searchParams.get("action") === "token") {
    const jwt = jwtLib(); if (!jwt) return json({ error: "jwt yok" }, 500);
    return json({ token: jwt.sign({ user: "guest", role: "user" }, PRIV, { algorithm: "RS256" }) });
  }
  const body = `
  <div class="panel"><div class="panel-b col" style="display:flex;flex-direction:column;gap:14px">
    <h2 style="margin:0;font-size:19px">🔐 JWT API (RS256)</h2>
    <p class="sub" style="margin:0">API, RS256 imzalı JWT bekler. Ama doğrulayıcı token'ın <code>alg</code> başlığına güvenir; public anahtar sızmış.<br>
      <b>Hedef:</b> Public anahtarı HMAC sırrı yapıp (HS256) <code>role:admin</code> token forge et.</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <a class="btn" href="/jwt-confusion?action=pubkey">public key (sızıntı)</a>
      <a class="btn ghost" href="/jwt-confusion?action=token">örnek (guest) token</a></div>
    <div class="console"><div class="dim">Sömürü</div><div class="leak">1) pubkey'i al → 2) header {alg:HS256}, payload {role:admin} → HMAC256(pubkey) ile imzala → 3) POST {token}</div></div>
  </div></div>`;
  return html(page({ title: "ördek // JWTconf", level, subtitle: "jwt-confusion-lab", body }));
}

export async function POST(req) {
  const level = getLevel(req.headers);
  const jwt = jwtLib(); if (!jwt) return json({ error: "jwt lib yok" }, 500);
  let b; try { b = await req.json(); } catch { return json({ error: "Geçersiz JSON" }, 400); }
  const token = String((b && b.token) || "");
  const alg = decodeHeader(token).alg;

  try {
    let payload = false;
    if (level === "high") {
      // Güvenli: alg RS256'ya sabit; HS256 forge edilen token RSA imza doğrulamasında düşer.
      payload = jwt.verify(token, PUB, { algorithms: ["RS256"] });
    } else if (alg === "RS256") {
      payload = jwt.verify(token, PUB, { algorithms: ["RS256"] });             // gerçek RS256 token
    } else if (alg === "none") {
      payload = level === "low" ? part(token, 1) : false;                       // medium 'none'ı reddeder
    } else { // HS256 (veya başka) → confusion: public anahtarı HMAC sırrı kabul et (ZAFİYET)
      payload = hmacValid(token, PUB);
    }
    if (payload && payload.role === "admin") return json({ valid: true, role: "admin", flag: FLAG, msg: `admin doğrulandı — ${FLAG}` });
    if (!payload) return json({ valid: false, error: "imza geçersiz" }, 401);
    return json({ valid: true, role: payload.role, note: "admin değil" });
  } catch (e) {
    return json({ valid: false, error: String(e.message || e) }, 401);
  }
}
