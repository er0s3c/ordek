// Flag reveal — YALNIZCA istemci-tetiklemeli zafiyetler için (XSS / Clickjacking).
// Bu vuln'lerde başarı sunucuda doğrulanamaz (JS tarayıcıda çalışır), bu yüzden flag
// sayfa kaynağına gömülmek yerine tetiklenince buradan çekilir. Allowlist dışı slug reddedilir.
import { FLAGS } from "@/lib/flags";

export const dynamic = "force-dynamic";

const REVEALABLE = new Set(["xss-reflected", "xss-stored", "clickjacking"]);
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
};
const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json", ...CORS } });

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

function reveal(slug) {
  if (!REVEALABLE.has(slug)) return json({ ok: false, error: "Bu zafiyet için reveal kapalı." }, 403);
  return json({ ok: true, slug, flag: FLAGS[slug] });
}

export async function GET(req) {
  const slug = new URL(req.url).searchParams.get("slug");
  return reveal(slug);
}

export async function POST(req) {
  let body = {};
  try { body = await req.json(); } catch {}
  return reveal(body.slug);
}
