// TEST-ONLY DB adaptoru: node:sqlite ile (Prisma engine indirilemediginde).
// lib/db.js ile AYNI metot arayuzunu saglar; lib/vulns.js degismeden calisir.
const { DatabaseSync } = require("node:sqlite");
const crypto = require("crypto");
const md5 = (s) => crypto.createHash("md5").update(String(s)).digest("hex");

const d = new DatabaseSync(":memory:");
d.exec(`
  CREATE TABLE User (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT, username TEXT,
                     password TEXT, role TEXT DEFAULT 'user', avatarUrl TEXT, twofaCode TEXT);
  CREATE TABLE Product (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, price REAL, stock INTEGER DEFAULT 100);
  CREATE TABLE Coupon (id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT, used INTEGER DEFAULT 0, value REAL);
  CREATE TABLE "Order" (id INTEGER PRIMARY KEY AUTOINCREMENT, userId INTEGER, item TEXT, total REAL, secret TEXT);
`);
d.prepare("INSERT INTO User (email,username,password,role) VALUES (?,?,?,?)").run("admin@lab.local", "admin", md5("password"), "admin");
d.prepare("INSERT INTO User (email,username,password,role) VALUES (?,?,?,?)").run("eren@lab.local", "eren", md5("123456"), "user");
d.prepare("INSERT INTO Product (name,price) VALUES (?,?)").run("Laptop", 1500);
d.prepare("INSERT INTO Product (name,price) VALUES (?,?)").run("Telefon", 900);
d.prepare("INSERT INTO Product (name,price) VALUES (?,?)").run("Kulaklik", 120);
d.prepare("INSERT INTO Coupon (code,used,value) VALUES (?,?,?)").run("WELCOME50", 0, 50);
d.prepare('INSERT INTO "Order" (userId,item,total,secret) VALUES (?,?,?,?)').run(1, "Laptop", 1500, "FLAG{idor_admin_order_7c1a}");
d.prepare('INSERT INTO "Order" (userId,item,total,secret) VALUES (?,?,?,?)').run(2, "Telefon", 900, "siparis-eren-ozel-not");

const KNOWN = ["email", "username", "password", "role", "avatarUrl", "twofaCode"];

const db = {
  rawAll: (sql) => d.prepare(sql).all(),                                  // UNSAFE (SQLi)
  userByUsername: (u) => d.prepare("SELECT * FROM User WHERE username=?").get(u) || null,
  userById: (id) => d.prepare("SELECT * FROM User WHERE id=?").get(Number(id)) || null,
  updateUser: (id, data) => {
    const keys = Object.keys(data || {}).filter((k) => KNOWN.includes(k) && data[k] !== undefined);
    if (keys.length) {
      const set = keys.map((k) => `${k}=?`).join(",");
      d.prepare(`UPDATE User SET ${set} WHERE id=?`).run(...keys.map((k) => data[k]), Number(id));
    }
    return d.prepare("SELECT * FROM User WHERE id=?").get(Number(id));
  },
  productById: (id) => d.prepare("SELECT * FROM Product WHERE id=?").get(Number(id)) || null,
  couponByCode: (c) => d.prepare("SELECT * FROM Coupon WHERE code=?").get(c) || null,
  setCouponUsed: (c) => d.prepare("UPDATE Coupon SET used=1 WHERE code=?").run(c),
  couponReset: (c) => d.prepare("UPDATE Coupon SET used=0 WHERE code=?").run(c),
  couponUseAtomic: (c) => d.prepare("UPDATE Coupon SET used=1 WHERE code=? AND used=0").run(c).changes,
  orderById: (id) => d.prepare('SELECT * FROM "Order" WHERE id=?').get(Number(id)) || null,
  orderByIdAndUser: (id, uid) => d.prepare('SELECT * FROM "Order" WHERE id=? AND userId=?').get(Number(id), Number(uid)) || null,
};

module.exports = { db };
