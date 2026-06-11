// Oturum/mod durumu — panel açılışta buradan { mode, needsSetup, user } okur.
import { getSession } from "@/lib/session";
import { getUserById, teacherExists, publicUser, getClassById } from "@/lib/accounts";

export const dynamic = "force-dynamic";

const mode = () => (process.env.LAB_MODE === "class" ? "class" : "individual");

function withClass(user) {
  if (user && user.classId) {
    const c = getClassById(user.classId);
    user.className = c ? c.name : null;
  }
  return user;
}

export async function GET(req) {
  const m = mode();
  if (m !== "class") {
    return Response.json({ mode: m, needsSetup: false, user: null });
  }
  const sess = getSession(req);
  let user = null;
  if (sess) {
    const u = getUserById(sess.userId);
    if (u) user = withClass(publicUser(u));
  }
  return Response.json({ mode: m, needsSetup: !teacherExists(), user });
}
