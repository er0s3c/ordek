// Bağlantı Testi API — öğrenci kendi Kali VM'inden laba erişebiliyor mu?
//  POST {action:"start"}                         → hafif hedef başlat (bridge), bağlantı bilgisi döner
//  POST {action:"verify", machineToken, value}   → Kali'den alınan token'ı doğrula → {ok}
//  POST {action:"stop", id}                       → hedefi durdur
//  ⚠ Beklenen token SUNUCU-ONLY (HMAC, lib/docker.js verifyConn); istemciye GÖNDERİLMEZ.
import { startConnCheck, verifyConn, stopMachine, friendlyDockerError } from "@/lib/docker";
import { getSession } from "@/lib/session";
import { getUserById } from "@/lib/accounts";

export const dynamic = "force-dynamic";

function dockerErr(e) {
  const friendly = friendlyDockerError(e);
  if (friendly) return Response.json({ error: "docker", message: friendly, detail: String((e && e.stderr) || (e && e.message) || e) }, { status: 400 });
  return Response.json(
    { error: "docker calistirilamadi (panel docker.sock erisimine sahip mi?)", detail: String((e && e.stderr) || (e && e.message) || e) },
    { status: 500 }
  );
}

// Sınıf modunda makine oturumdaki öğrenciye etiketlenir (öğretmen takibi).
function student(req) {
  if (process.env.LAB_MODE !== "class") return null;
  const s = getSession(req);
  return s && s.role === "student" ? s : null;
}

export async function POST(req) {
  let body = {};
  try { body = await req.json(); } catch {}
  const action = body.action || "start";

  if (action === "verify") {
    return Response.json({ ok: verifyConn(body.machineToken, body.value) });
  }

  if (action === "stop") {
    if (!body.id) return Response.json({ error: "id gerekli" }, { status: 400 });
    try { return Response.json(await stopMachine(body.id)); }
    catch (e) { return dockerErr(e); }
  }

  // start (varsayılan)
  const sess = student(req);
  const studentId = sess ? sess.userId : null;
  const studentName = sess ? (getUserById(sess.userId) || {}).username || sess.userId : null;
  try {
    return Response.json(await startConnCheck({ studentId, studentName }));
  } catch (e) {
    if (e && e.full) return Response.json({ error: "full", message: e.userMessage }, { status: 429 });
    return dockerErr(e);
  }
}
