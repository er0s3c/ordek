// Gerçek-zamanlı bildirim akışı (SSE). Oturumlu kullanıcı kendi kanalına (userId)
// abone olur: öğrenci → öğretmen mesaj/duyuruları; öğretmen → öğrenci yardım istekleri.
// İstemci EventSource ile bağlanır; kopulursa mevcut 4 sn poll fallback devreye girer.
import { getSession } from "@/lib/session";
import { subscribe } from "@/lib/notify-bus";

export const dynamic = "force-dynamic";

export async function GET(req) {
  if (process.env.LAB_MODE !== "class") return new Response("disabled", { status: 404 });
  const sess = getSession(req);
  if (!sess) return new Response("unauthorized", { status: 403 });

  const channel = sess.userId;
  const enc = new TextEncoder();
  let unsub = () => {};
  let hb = null;

  const stream = new ReadableStream({
    start(controller) {
      const send = (obj) => {
        try { controller.enqueue(enc.encode(`data: ${JSON.stringify(obj)}\n\n`)); } catch {}
      };
      const close = () => {
        try { clearInterval(hb); } catch {}
        try { unsub(); } catch {}
        try { controller.close(); } catch {}
      };
      send({ kind: "hello", ts: Date.now() });
      unsub = subscribe(channel, send);
      hb = setInterval(() => { try { controller.enqueue(enc.encode(": ping\n\n")); } catch { close(); } }, 25000);
      if (hb && hb.unref) hb.unref();
      if (req.signal) req.signal.addEventListener("abort", close);
    },
    cancel() {
      try { clearInterval(hb); } catch {}
      try { unsub(); } catch {}
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    },
  });
}
