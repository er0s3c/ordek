// Sınıf yönetimi — listele / oluştur / yeniden adlandır / arşivle / kod yenile / sil.
import { getSession } from "@/lib/session";
import { listClasses, getClassById, createClass, updateClass, deleteClass, studentsOfClass } from "@/lib/accounts";

export const dynamic = "force-dynamic";

function gate(req) {
  if (process.env.LAB_MODE !== "class") return null;
  const s = getSession(req);
  return s && s.role === "teacher" ? s : null;
}

export async function GET(req) {
  const sess = gate(req);
  if (!sess) return Response.json({ error: "yetkisiz" }, { status: 403 });
  const classes = listClasses(sess.userId).map((c) => ({ ...c, studentCount: studentsOfClass(c.id).length }));
  return Response.json({ classes });
}

export async function POST(req) {
  const sess = gate(req);
  if (!sess) return Response.json({ error: "yetkisiz" }, { status: 403 });
  let body = {}; try { body = await req.json(); } catch {}
  const action = body.action;

  if (action === "create") {
    const cls = createClass({ name: body.name, teacherId: sess.userId });
    return Response.json({ ok: true, class: cls });
  }

  // mutasyonlar için: sınıf bu öğretmene mi ait?
  const cls = getClassById(body.id);
  if (!cls || cls.teacherId !== sess.userId) return Response.json({ ok: false, error: "sınıf bulunamadı" }, { status: 404 });

  if (action === "rename") return Response.json({ ok: true, class: updateClass(cls.id, { name: body.name }) });
  if (action === "archive") return Response.json({ ok: true, class: updateClass(cls.id, { archived: !!body.archived }) });
  if (action === "regenerate") return Response.json({ ok: true, class: updateClass(cls.id, { regenerateCode: true }) });
  if (action === "delete") { deleteClass(cls.id); return Response.json({ ok: true, deleted: cls.id }); }

  return Response.json({ ok: false, error: "bilinmeyen aksiyon" }, { status: 400 });
}
