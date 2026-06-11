// SQL Injection (Login Bypass) HEDEF MAKINESI
// GET /sqli-blind  -> giriş formu
// POST /sqli-blind -> giriş işlemi (bypass'a açık)
import Database from "better-sqlite3";
import fs from "fs";
import { getLevel } from "@/lib/level";
import { FLAGS } from "@/lib/flags";
import { page, cardPage, flagBanner, esc, html } from "@/lib/machine-ui";

export const dynamic = "force-dynamic";
const FLAG = FLAGS["sql-injection-blind"];
const DB_PATH = "/tmp/sqli_login_lab.db";

function getDb() {
  if (!fs.existsSync(DB_PATH)) {
    const db = new Database(DB_PATH);
    db.exec(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, username TEXT NOT NULL, password TEXT NOT NULL, role TEXT DEFAULT 'user');`);
    const ins = db.prepare("INSERT OR IGNORE INTO users (id, username, password, role) VALUES (?, ?, ?, ?)");
    ins.run(1, "admin", "1v92x3_super_secret_admin_pw!_8y", "admin");
    ins.run(2, "eren", "eren_pass123", "user");
    db.close();
  }
  return new Database(DB_PATH, { readonly: false });
}

function renderLogin(level, errorMsg = "") {
  const body = `
    <div class="brand"><img src="/ordek.png" alt="ördek"><div class="t">ördek <span>// portal</span></div></div>
    <div class="note" style="text-align:center;margin-bottom:14px">Yönetici erişimi için <b>admin</b> hesabıyla giriş yap. Parola unutulduysa <i>"bypass"</i> yöntemleri denenebilir.</div>
    ${errorMsg ? `<div class="alert" style="margin-bottom:14px">❌ ${esc(errorMsg)}</div>` : ""}
    <form method="post" action="/sqli-blind">
      <div class="input-group"><label>Kullanıcı Adı</label><input name="username" value="admin" autocomplete="off" required></div>
      <div class="input-group"><label>Parola</label><input type="password" name="password" placeholder="••••••••" required></div>
      <button class="btn primary block" type="submit">Giriş Yap</button>
    </form>
    <p class="sub" style="text-align:center;margin-top:14px;font-size:11px;color:var(--ink-faint)">ördek login-portal v2.0 · level: ${esc(level)}</p>
  `;
  return cardPage({ title: "ördek // Yönetim Paneli", level, cardTitle: `// admin login &nbsp; (level: ${level.toUpperCase()})`, body, width: 400 });
}

function renderDashboard(level, queryStr) {
  const body = `
    ${flagBanner({ value: FLAG, sub: "SQL enjeksiyonu ile parola doğrulamasını atlatıp admin hesabına sızdın." })}
    <div class="panel"><div class="panel-b col" style="display:flex;flex-direction:column;gap:12px">
      <div class="row" style="display:flex;align-items:center;gap:10px">
        <span class="tag" style="color:var(--green-bright);border-color:var(--green-deep)">👤 admin</span>
        <span class="sub" style="flex:1">Yönetim paneline eriştin.</span>
        <a class="btn ghost" href="/sqli-blind">Çıkış</a>
      </div>
    </div></div>
    <div class="panel"><div class="panel-h">// çalıştırılan sorgu</div>
      <div class="panel-b"><div class="console">${esc(queryStr)}</div></div></div>
  `;
  return page({ title: "ördek // Admin Dashboard", level, subtitle: "admin", body });
}

export async function GET(req) {
  return html(renderLogin(getLevel(req.headers)));
}

export async function POST(req) {
  const level = getLevel(req.headers);
  const formData = await req.formData();
  const u = formData.get("username") || "";
  const p = formData.get("password") || "";

  const db = getDb();
  let queryStr = "", loggedIn = false, errorMsg = "";

  if (level === "low") {
    queryStr = `SELECT * FROM users WHERE username='${u}' AND password='${p}'`;
    try { if (db.prepare(queryStr).get()) loggedIn = true; else errorMsg = "Geçersiz kullanıcı adı veya parola."; }
    catch { errorMsg = "Veritabanı Hatası (Sözdizimi Bozuldu)"; }
  } else if (level === "medium") {
    const clean = (s) => s.replace(/OR/g, "").replace(/AND/g, "").replace(/UNION/g, "").replace(/--/g, "").replace(/#/g, "");
    queryStr = `SELECT * FROM users WHERE username='${clean(u)}' AND password='${clean(p)}'`;
    try { if (db.prepare(queryStr).get()) loggedIn = true; else errorMsg = "Geçersiz kullanıcı adı veya parola. (Filtre Aktif)"; }
    catch { errorMsg = "Veritabanı Hatası"; }
  } else { // high: prepared statement
    queryStr = `SELECT * FROM users WHERE username=? AND password=?`;
    try { if (db.prepare(queryStr).get(u, p)) loggedIn = true; else errorMsg = "Geçersiz kullanıcı adı veya parola."; }
    catch { errorMsg = "Sistem Hatası"; }
  }
  db.close();

  return loggedIn ? html(renderDashboard(level, queryStr)) : html(renderLogin(level, errorMsg), 401);
}
