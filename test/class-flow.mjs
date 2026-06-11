// ============================================================================
//  test/class-flow.mjs — SINIF MODU uçtan uca akış testi (Docker GEREKMEZ).
//  Öğretmen kurulumu → sınıf oluştur → öğrenci kayıt → flag → öğretmen takibi +
//  yetki kontrollerini doğrular.
//  Kullanım:
//    LAB_MODE=class LAB_SESSION_SECRET=test... LAB_DATA_DIR=./tmp-test \
//      npx next start -p 3010   (ayrı terminal)
//    BASE=http://localhost:3010 node test/class-flow.mjs
// ============================================================================
import { FLAGS } from "../lib/flags.js";

const BASE = process.env.BASE || "http://localhost:3010";
let pass = 0, fail = 0;
const ok = (name, cond, extra = "") => {
  if (cond) { pass++; console.log("\x1b[32mPASS\x1b[0m " + name); }
  else { fail++; console.log("\x1b[31mFAIL\x1b[0m " + name + (extra ? "  " + extra : "")); }
};

const jar = () => ({ c: {} });
const cookieHeader = (j) => Object.entries(j.c).map(([k, v]) => `${k}=${v}`).join("; ");
function store(j, res) {
  let list = [];
  try { list = res.headers.getSetCookie ? res.headers.getSetCookie() : []; } catch {}
  if (!list.length) { const one = res.headers.get("set-cookie"); if (one) list = [one]; }
  for (const line of list) { const m = line.match(/^([^=]+)=([^;]*)/); if (m) j.c[m[1]] = m[2]; }
}
async function call(j, path, { method = "GET", body } = {}) {
  const headers = {};
  if (body) headers["content-type"] = "application/json";
  const ch = cookieHeader(j); if (ch) headers.cookie = ch;
  const res = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  store(j, res);
  let data = null; try { data = await res.json(); } catch {}
  return { status: res.status, data };
}

(async () => {
  const teacher = jar();
  let r = await call(teacher, "/api/auth/session");
  ok("mod = class", r.data && r.data.mode === "class", JSON.stringify(r.data));
  ok("başlangıçta needsSetup=true", r.data && r.data.needsSetup === true);

  r = await call(teacher, "/api/auth/setup", { method: "POST", body: { username: "ogretmen", password: "sifre123", displayName: "Test Öğretmen" } });
  ok("ilk öğretmen kuruldu", r.data && r.data.ok, JSON.stringify(r.data));
  r = await call(teacher, "/api/auth/session");
  ok("öğretmen oturumu aktif", r.data && r.data.user && r.data.user.role === "teacher");

  let r2 = await call(jar(), "/api/auth/setup", { method: "POST", body: { username: "baska", password: "yyyy" } });
  ok("ikinci öğretmen reddedildi (409)", r2.status === 409, "status=" + r2.status);

  r = await call(teacher, "/api/teacher/class", { method: "POST", body: { action: "create", name: "11-A Siber" } });
  ok("sınıf oluştu + kod üretildi", r.data && r.data.ok && r.data.class && r.data.class.code, JSON.stringify(r.data));
  const code = r.data.class.code;

  const student = jar();
  r = await call(student, "/api/auth/register", { method: "POST", body: { username: "ayse", password: "abcd", displayName: "Ayşe Y", classCode: code } });
  ok("öğrenci kaydı (sınıf koduyla)", r.data && r.data.ok, JSON.stringify(r.data));
  r = await call(student, "/api/auth/session");
  ok("öğrenci oturumu (role=student)", r.data && r.data.user && r.data.user.role === "student");

  r2 = await call(jar(), "/api/auth/register", { method: "POST", body: { username: "veli", password: "abcd", classCode: "ZZZZZZ" } });
  ok("yanlış sınıf kodu reddedildi (400)", r2.status === 400, "status=" + r2.status);

  const slug = "sql-injection", flag = FLAGS[slug];
  r = await call(student, "/api/flag", { method: "POST", body: { slug, level: "low", flag } });
  ok("doğru flag kabul edildi", r.data && r.data.ok, JSON.stringify(r.data));
  r = await call(student, "/api/flag", { method: "POST", body: { slug, level: "low", flag: "ordek{yanlis}" } });
  ok("yanlış flag reddedildi", r.data && r.data.ok === false);

  r = await call(student, "/api/progress");
  ok("öğrenci ilerlemesi kişisel", r.data && r.data.solved && Array.isArray(r.data.solved[slug]) && r.data.solved[slug].includes("low"), JSON.stringify(r.data));

  r = await call(teacher, "/api/teacher/overview");
  const stu = r.data && r.data.students && r.data.students.find((s) => s.username === "ayse");
  ok("overview öğrenciyi listeliyor", !!stu);
  ok("overview total=1", stu && stu.total === 1, stu && ("total=" + stu.total));
  ok("overview başarılı flag sayıldı", stu && stu.oks >= 1);

  r = await call(teacher, "/api/teacher/student/" + (stu ? stu.id : "x"));
  ok("detay matrisi doğru", r.data && r.data.solved && r.data.solved[slug] && r.data.solved[slug].includes("low"));
  ok("detay zaman çizelgesinde flag_ok var", r.data && r.data.events && r.data.events.some((e) => e.type === "flag_ok"));

  r2 = await call(student, "/api/teacher/overview");
  ok("öğrenci teacher API'den 403", r2.status === 403, "status=" + r2.status);
  r2 = await call(jar(), "/api/teacher/overview");
  ok("anonim teacher API'den 403", r2.status === 403, "status=" + r2.status);

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("test hatası:", e); process.exit(1); });
