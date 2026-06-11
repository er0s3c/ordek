// XSS (Stored) HEDEF MAKINESI
// GET /xss-stored  -> yorumları (ziyaretçi defteri) listele
// POST /xss-stored -> yeni yorum ekle (kalıcı XSS'e açık)
import { getLevel } from "@/lib/level";
import { FLAGS } from "@/lib/flags";
import { page, flagBanner, esc, html } from "@/lib/machine-ui";
import Database from "better-sqlite3";
import fs from "fs";

export const dynamic = "force-dynamic";
const FLAG = FLAGS["xss-stored"];
const DB_PATH = "/tmp/xss_stored_lab.db";

function getDb() {
  if (!fs.existsSync(DB_PATH)) {
    const db = new Database(DB_PATH);
    db.exec(`CREATE TABLE IF NOT EXISTS comments (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, text TEXT NOT NULL, date TEXT NOT NULL);`);
    const ins = db.prepare("INSERT INTO comments (name, text, date) VALUES (?, ?, ?)");
    ins.run("Alice", "Bu ürün harika! Kesinlikle tavsiye ederim. 😍", "2026-06-01");
    ins.run("Bob", "Kargolama biraz gecikti ama sorunsuz teslim aldım.", "2026-06-05");
    db.close();
  }
  return new Database(DB_PATH, { readonly: false });
}

const HEAD = `<style>
  .comment{background:var(--bg-1);border:1px solid var(--line);border-radius:8px;padding:18px;margin-bottom:14px}
  .c-head{display:flex;align-items:center;gap:12px;margin-bottom:10px}
  .c-avatar{width:34px;height:34px;border-radius:50%;background:var(--green-deep);color:#0d0f0c;display:grid;place-items:center;font-weight:700}
  .c-name{font-weight:600}.c-date{color:var(--ink-faint);font-size:13px;margin-left:auto}
  .c-body{line-height:1.6}
</style>
<script>window.showFlag=function(){fetch('/api/flag/reveal?slug=xss-stored').then(function(r){return r.json();}).then(function(d){var f=document.getElementById('mk-flag');if(!f)return;if(d&&d.flag){var v=f.querySelector('.val');if(v)v.textContent=d.flag;}f.classList.remove('hidden');}).catch(function(){var f=document.getElementById('mk-flag');if(f)f.classList.remove('hidden');});};</script>`;

function renderPage(level, comments) {
  let commentsHtml = "";
  for (const c of comments) {
    const safeName = esc(c.name);
    let commentText = c.text;
    if (level === "high") commentText = esc(commentText); // çıktı encode
    commentsHtml += `<div class="comment">
      <div class="c-head"><div class="c-avatar">${safeName.charAt(0).toUpperCase()}</div><div class="c-name">${safeName}</div><div class="c-date">${esc(c.date)}</div></div>
      <div class="c-body">${commentText}</div></div>`;
  }
  const body = `
    ${flagBanner({ value: "", sub: "Kalıcı (stored) XSS tetiklendi — sayfaya giren herkes etkilenir.", hidden: true })}
    <div style="font-size:20px;font-weight:600">Ördek Gelişmiş T-Shirt</div>
    <div class="sub" style="margin-bottom:6px">Bu ürün hakkında ${comments.length} yorum yapılmış.</div>
    <div>${commentsHtml}</div>
    <div class="panel"><div class="panel-h">// yorum bırak</div><div class="panel-b">
      <form method="POST" action="/xss-stored">
        <div class="input-group"><label>İsim</label><input name="name" value="Guest" required></div>
        <div class="input-group"><label>Yorumunuz</label><textarea name="comment" placeholder="Ürün hakkında ne düşünüyorsun?" required></textarea></div>
        <button class="btn primary" type="submit">Gönder</button>
      </form>
    </div></div>
  `;
  return page({ title: "ördek // Yorumlar", level, subtitle: "product reviews", body, head: HEAD });
}

export async function GET(req) {
  const level = getLevel(req.headers);
  const db = getDb();
  const comments = db.prepare("SELECT * FROM comments ORDER BY id ASC").all();
  db.close();
  return html(renderPage(level, comments));
}

export async function POST(req) {
  const level = getLevel(req.headers);
  const formData = await req.formData();
  const name = formData.get("name") || "Guest";
  let commentText = formData.get("comment") || "";

  // medium: kaydederken <script> kara listesi (onerror/onload kalır); low/high: ham kaydet (high okurken encode eder)
  if (level === "medium") {
    commentText = commentText.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  }

  const db = getDb();
  db.prepare("INSERT INTO comments (name, text, date) VALUES (?, ?, ?)").run(name, commentText, new Date().toISOString().split("T")[0]);
  db.close();
  return new Response(null, { status: 302, headers: { Location: "/xss-stored" } });
}
