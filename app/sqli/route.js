// SQL Injection HEDEF MAKINESI — gerçek "E-Ticaret Ürün Kataloğu" sayfası.
// GET /sqli      -> ürün vitrini
// GET /sqli?id=1 -> ürün detayı (Error-Based + UNION SQLi'ye açık)
import { getLevel } from "@/lib/level";
import { FLAGS } from "@/lib/flags";
import { page, flagBanner, esc, html } from "@/lib/machine-ui";
import Database from "better-sqlite3";
import fs from "fs";
import crypto from "node:crypto";

export const dynamic = "force-dynamic";
const md5 = (s) => crypto.createHash("md5").update(String(s)).digest("hex");
const FLAG = FLAGS["sql-injection"];
const DB_PATH = "/tmp/sqli_lab.db";

const PRODUCT_VISUALS = {
  1: { emoji: "💻", grad: "linear-gradient(135deg,#1a2a3a,#0d1f2d)", accent: "#6fb3d9" },
  2: { emoji: "⌨️", grad: "linear-gradient(135deg,#26221a,#1a160d)", accent: "#e0a32e" },
  3: { emoji: "🖥️", grad: "linear-gradient(135deg,#1a2a1a,#0d200d)", accent: "#8fcf3f" },
  4: { emoji: "🖱️", grad: "linear-gradient(135deg,#2a2a1a,#20200d)", accent: "#e0a32e" },
  5: { emoji: "🔌", grad: "linear-gradient(135deg,#2a1a1a,#200d0d)", accent: "#d9512c" },
};
const DEFAULT_VIS = { emoji: "📦", grad: "linear-gradient(135deg,#21251f,#161916)", accent: "#8fcf3f" };

function getDb() {
  if (!fs.existsSync(DB_PATH)) {
    const db = new Database(DB_PATH);
    db.exec(`
      CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY, name TEXT NOT NULL, price REAL NOT NULL, stock INTEGER DEFAULT 100, description TEXT);
      CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, username TEXT NOT NULL, password TEXT NOT NULL, role TEXT DEFAULT 'user', email TEXT);
    `);
    const ins = db.prepare("INSERT OR IGNORE INTO products (id, name, price, stock, description) VALUES (?, ?, ?, ?, ?)");
    ins.run(1, "Gaming Laptop", 14999.99, 25, "Yüksek performanslı oyuncu dizüstü. RTX 4090, 32GB RAM, 1TB NVMe SSD.");
    ins.run(2, "Mekanik Klavye", 899.50, 150, "Cherry MX Blue anahtarlı, RGB aydınlatmalı mekanik klavye.");
    ins.run(3, "27\" 4K Monitör", 6499.00, 40, "IPS panel, %100 sRGB, USB-C, 144Hz profesyonel monitör.");
    ins.run(4, "Kablosuz Mouse", 349.90, 200, "Ergonomik, 20.000 DPI sensör, 70 saat pil ömrü.");
    ins.run(5, "USB-C Hub", 279.00, 300, "7-in-1: HDMI 4K@60, USB 3.0 x3, SD, microSD, PD 100W.");
    const uins = db.prepare("INSERT OR IGNORE INTO users (id, username, password, role, email) VALUES (?, ?, ?, ?, ?)");
    uins.run(1, "admin", md5("password"), "admin", "admin@ordek-lab.local");
    uins.run(2, "eren", md5("123456"), "user", "eren@ordek-lab.local");
    uins.run(3, "duck", md5("quack"), "moderator", "duck@ordek-lab.local");
    uins.run(4, "flag", FLAG, "flag", "flag@ordek-lab.local"); // UNION dump ile çıkar
    db.close();
  }
  return new Database(DB_PATH, { readonly: false });
}

const HEAD = `<style>
  .shop-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:16px}
  .p-card{background:var(--bg-1);border:1px solid var(--line);border-radius:10px;overflow:hidden;cursor:pointer;transition:transform .2s,border-color .2s;text-decoration:none;color:inherit;display:block}
  .p-card:hover{transform:translateY(-4px);border-color:var(--green-deep)}
  .p-card-img{height:150px;display:flex;align-items:center;justify-content:center;font-size:60px}
  .p-card-b{padding:13px 15px}
  .p-card-b .pn{font-weight:700;font-size:14px;margin-bottom:6px}
  .p-card-b .pr{display:flex;justify-content:space-between;align-items:center}
  .p-card-b .pp{font-family:var(--font-mono);font-size:15px;font-weight:800}
  .p-card-b .ps{font-family:var(--font-mono);font-size:11px;color:var(--ink-faint);padding:3px 8px;background:var(--bg-inset);border-radius:3px}
  .detail-img{height:200px;display:flex;align-items:center;justify-content:center;font-size:76px;border-radius:8px;margin-bottom:14px}
  .back-link{display:inline-flex;align-items:center;gap:6px;font-family:var(--font-mono);font-size:12px;color:var(--ink-faint);margin-bottom:14px;padding:6px 12px;border:1px solid var(--line);border-radius:4px}
  .back-link:hover{border-color:var(--green-deep);color:var(--green)}
  table{width:100%;border-collapse:collapse;font-size:13px}
  th{text-align:left;font-family:var(--font-mono);font-size:10px;letter-spacing:.5px;text-transform:uppercase;color:var(--ink-faint);padding:8px 10px;border-bottom:2px solid var(--line)}
  td{padding:8px 10px;border-bottom:1px solid var(--line-soft);color:var(--ink);font-family:var(--font-mono);font-size:12px}
  .role-admin{color:var(--red-bright);font-weight:600}.role-flag{color:var(--amber);font-weight:600}
  .err-box{background:#1a0f0d;border:1px solid #5a2c1f;border-radius:8px;overflow:hidden}
  .err-h{background:#271812;padding:10px 14px;border-bottom:1px solid #5a2c1f;font-family:var(--font-mono);font-size:11px;text-transform:uppercase;color:var(--red-bright)}
  .err-c{padding:14px 16px;font-family:var(--font-mono);font-size:12.5px;line-height:1.7;color:#e8a090;white-space:pre-wrap;overflow-x:auto}
  .err-c .ql{color:var(--red-bright);font-weight:700}
  .err-c .qq{color:#d4836f;background:rgba(0,0,0,.3);display:block;padding:8px 12px;border-radius:4px;margin:8px 0;border-left:3px solid var(--red-bright)}
  .empty{text-align:center;padding:30px 20px;color:var(--ink-faint);font-family:var(--font-mono);font-size:13px}
</style>`;

function productCards(db) {
  const rows = db.prepare("SELECT id, name, price, stock FROM products").all();
  if (!rows.length) return '<div class="empty">📦 Mağazada ürün yok.</div>';
  return '<div class="shop-grid">' + rows.map((r) => {
    const v = PRODUCT_VISUALS[r.id] || DEFAULT_VIS;
    return `<a href="/sqli?id=${r.id}" class="p-card">
      <div class="p-card-img" style="background:${v.grad}">${v.emoji}</div>
      <div class="p-card-b"><div class="pn">${esc(r.name)}</div>
        <div class="pr"><div class="pp" style="color:${v.accent}">₺${Number(r.price).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</div>
          <div class="ps">${r.stock} stok</div></div></div></a>`;
  }).join("") + "</div>";
}

function productDetail(row) {
  const v = PRODUCT_VISUALS[row.id] || DEFAULT_VIS;
  return `<a href="/sqli" class="back-link">← Tüm ürünler</a>
  <div class="panel"><div class="panel-b">
    <div class="detail-img" style="background:${v.grad}">${v.emoji}</div>
    <h2 style="margin:0 0 8px">${esc(row.name)}</h2>
    <div style="font-family:var(--font-mono);font-size:22px;font-weight:800;color:${v.accent};margin-bottom:12px">₺${Number(row.price).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</div>
    <div class="sub" style="margin-bottom:14px">${esc(row.description || "")}</div>
    <span class="tag">📦 Stok: ${row.stock}</span>
  </div></div>`;
}

function resultTable(rows) {
  if (!rows || !rows.length) return '<div class="empty">🔍 Bu ID ile eşleşen ürün bulunamadı.</div>';
  const cols = Object.keys(rows[0]);
  const isDump = cols.some((c) => ["username", "password", "role", "email"].includes(c));
  if (!isDump && rows.length === 1) return productDetail(rows[0]);
  let t = '<a href="/sqli" class="back-link">← Tüm ürünler</a><div class="panel"><div class="panel-b" style="overflow-x:auto">';
  t += "<table><thead><tr>" + cols.map((c) => `<th>${esc(String(c))}</th>`).join("") + "</tr></thead><tbody>";
  for (const row of rows) {
    t += "<tr>" + cols.map((c) => {
      let val = esc(String(row[c] ?? "NULL"));
      if (c === "role" && row[c] === "admin") val = `<span class="role-admin">${val}</span>`;
      if (c === "role" && row[c] === "flag") val = `<span class="role-flag">${val}</span>`;
      return `<td>${val}</td>`;
    }).join("") + "</tr>";
  }
  return t + "</tbody></table></div></div>";
}

function errorBlock(query, errMsg) {
  return `<a href="/sqli" class="back-link">← Tüm ürünler</a>
  <div class="err-box"><div class="err-h">⚠ Veritabanı Hatası</div>
    <div class="err-c"><span class="ql">SqliteError:</span> ${esc(errMsg)}

<span class="ql">Hatalı Sorgu:</span>
<code class="qq">${esc(query)}</code>
<span class="ql">İpucu:</span> Girdi doğrudan SQL ifadesine ekleniyor.</div></div>`;
}

function render(level, body) {
  const banner = body.includes("ordek{") ? flagBanner({ value: FLAG, sub: "UNION SQLi ile users tablosunu dump ettin." }) : "";
  const inner = `
    ${banner}
    <div class="panel"><div class="panel-b">
      <form method="get" action="/sqli" style="display:flex;gap:8px">
        <input name="id" placeholder="Ürün ID ile ara… (örn: 1)" autocomplete="off" style="flex:1">
        <button class="btn primary" type="submit">Ara</button>
      </form>
    </div></div>
    ${body}
  `;
  return page({ title: "ördek // Mağaza", level, subtitle: "mağaza", body: inner, head: HEAD });
}

export async function GET(req) {
  const level = getLevel(req.headers);
  const url = new URL(req.url);
  const db = getDb();

  if (!url.searchParams.has("id") || url.searchParams.get("id") === "") {
    const body = productCards(db); db.close();
    return html(render(level, body));
  }

  const idParam = url.searchParams.get("id");
  let bodyHtml = "";

  if (level === "low") {
    const query = `SELECT id, name, price, stock, description FROM products WHERE id = ${idParam}`;
    try { bodyHtml = resultTable(db.prepare(query).all()); }
    catch (err) { bodyHtml = errorBlock(query, err.message); }
  } else if (level === "medium") {
    const filtered = idParam.replace(/UNION/g, "").replace(/SELECT/g, "").replace(/--/g, "").replace(/#/g, "");
    const query = `SELECT id, name, price, stock, description FROM products WHERE id = ${filtered}`;
    const hint = `<div class="note" style="margin-bottom:14px">🛡️ <b>Filtre aktif:</b> <code>UNION</code>, <code>SELECT</code>, <code>--</code>, <code>#</code> engelleniyor (case-sensitive → <code>UnIoN SeLeCt</code> ile atlatılır).</div>`;
    try { bodyHtml = hint + resultTable(db.prepare(query).all()); }
    catch (err) { bodyHtml = hint + errorBlock(query, err.message); }
  } else {
    const numId = Number(idParam);
    if (!Number.isInteger(numId) || numId < 0) {
      bodyHtml = `<a href="/sqli" class="back-link">← Tüm ürünler</a>
      <div class="note" style="margin-bottom:14px">🔒 <b>Prepared Statement:</b> Girdi parametreli sorguyla işleniyor; enjeksiyon mümkün değil.</div>
      <div class="err-box"><div class="err-h">Girdi Doğrulama Hatası</div>
        <div class="err-c"><span class="ql">ValidationError:</span> Geçersiz ürün ID: "${esc(idParam)}"

Yalnızca pozitif tam sayı kabul edilir.
Sorgu: SELECT ... WHERE id = ? (parametreli — girdi SQL'e gömülmez)</div></div>`;
    } else {
      try { bodyHtml = `<div class="note" style="margin-bottom:14px">🔒 <b>Prepared Statement:</b> <code>SELECT ... WHERE id = ?</code></div>` + resultTable(db.prepare("SELECT id, name, price, stock, description FROM products WHERE id = ?").all(numId)); }
      catch (err) { bodyHtml = errorBlock("SELECT ... WHERE id = ?", err.message); }
    }
  }
  db.close();
  return html(render(level, bodyHtml));
}

export async function POST(req) { return GET(req); }
