// Seed: zayif (MD5) parolalar -> sqlmap + rockyou + hashcat pratigi icin.
const { PrismaClient } = require("@prisma/client");
const crypto = require("crypto");
const db = new PrismaClient();
const md5 = (s) => crypto.createHash("md5").update(s).digest("hex");

async function main() {
  // 'password' rockyou.txt icinde vardir -> MD5: 5f4dcc3b5aa765d61d8327deb882cf99
  await db.user.upsert({
    where: { username: "admin" },
    update: {},
    create: { email: "admin@lab.local", username: "admin", password: md5("password"), role: "admin" },
  });
  await db.user.upsert({
    where: { username: "eren" },
    update: {},
    create: { email: "eren@lab.local", username: "eren", password: md5("123456"), role: "user" },
  });

  const count = await db.product.count();
  if (count === 0) {
    await db.product.createMany({
      data: [
        { name: "Laptop", price: 1500 },
        { name: "Telefon", price: 900 },
        { name: "Kulaklik", price: 120 },
      ],
    });
  }

  await db.coupon.upsert({
    where: { code: "WELCOME50" },
    update: { used: 0 },
    create: { code: "WELCOME50", value: 50, used: 0 },
  });

  const oc = await db.order.count();
  if (oc === 0) {
    await db.order.createMany({
      data: [
        { userId: 1, item: "Laptop", total: 1500, secret: "FLAG{idor_admin_order_7c1a}" },
        { userId: 2, item: "Telefon", total: 900, secret: "siparis-eren-ozel-not" },
      ],
    });
  }

  console.log("seed tamam");
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
