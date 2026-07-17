// ============================================================================
//  app/api/netinfo — AĞ KEŞFİ geri-bildirim & sorgu API'si.
//   POST {token, kaliIp, hostIp, port}  → Kali VM'deki keşif script'i bildirir
//                                          (host'a hangi adresten ulaştı + Kali IP).
//   GET  ?token=                         → panel öğrenilen bilgiyi okur (poll).
//  Not: POST kimlik-doğrulamasız (Kali curl'ü oturum çerezi taşımaz). Token tahmin
//  edilemez (base64url, 9 bayt) ve yalnız ÇALIŞAN bir makineye aitse kabul edilir;
//  veri yalnız o token'ı bilen panele geri gösterilir → kötüye kullanım yüzeyi dar.
// ============================================================================
import { recordNet, getNet } from "@/lib/netlearn";
import { resolveTarget } from "@/lib/docker";
import { TOKEN_RE } from "@/lib/target-cookie";

export const dynamic = "force-dynamic";

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });

export async function POST(req) {
  let body = {};
  try { body = await req.json(); } catch {}
  const token = String(body.token || "");
  if (!TOKEN_RE.test(token)) return json({ ok: false, error: "gecersiz token" }, 400);
  // Token gerçekten çalışan bir makineye mi ait? (uydurma token'ları ele)
  let live = null;
  try { live = await resolveTarget(token); } catch { live = null; }
  if (!live) return json({ ok: false, error: "makine bulunamadi" }, 404);
  const rec = recordNet(token, { kaliIp: body.kaliIp, hostIp: body.hostIp, port: body.port });
  return json({ ok: true, learned: rec && { kaliIp: rec.kaliIp, hostIp: rec.hostIp, port: rec.port } });
}

export async function GET(req) {
  const token = new URL(req.url).searchParams.get("token") || "";
  if (!TOKEN_RE.test(token)) return json({ learned: null });
  return json({ learned: getNet(token) });
}
