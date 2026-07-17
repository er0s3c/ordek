// Makine hazır mı? Panel, iç ağdan hedefe (ordek-m-<token>:3000) sunucu-taraflı yoklama yapar.
// (Öğrenci tarayıcısı makineye doğrudan erişemez; bu yüzden hazırlık panelden kontrol edilir.)
import { resolveTarget } from "@/lib/docker";
import { TOKEN_RE } from "@/lib/target-cookie";

export const dynamic = "force-dynamic";

export async function GET(req) {
  const token = new URL(req.url).searchParams.get("token") || "";
  if (!TOKEN_RE.test(token)) return Response.json({ ready: false, error: "gecersiz token" }, { status: 400 });
  let info;
  try { info = await resolveTarget(token); } catch { return Response.json({ ready: false }); }
  if (!info || !info.target) return Response.json({ ready: false, gone: true });
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 3500);
    // Herhangi bir HTTP yanıtı (derleme sırasında 500 dahi) = ağ erişilebilir → hazır.
    await fetch(info.target + "/", { signal: ctrl.signal, redirect: "manual" }).catch((e) => { throw e; });
    clearTimeout(t);
    return Response.json({ ready: true });
  } catch {
    return Response.json({ ready: false });
  }
}
