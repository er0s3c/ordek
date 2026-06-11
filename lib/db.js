// Prisma tabanli DB adaptoru (Next.js calisma zamani).
// Test ortami ayni isimli metotlari node:sqlite ile saglar (test/db.sqlite.js).
const { PrismaClient } = require("@prisma/client");

const g = globalThis;
const prisma = g.__prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") g.__prisma = prisma;

const db = {
  // --- UNSAFE: SQL injection demolari icin (#5, #6) ---
  rawAll: (sql) => prisma.$queryRawUnsafe(sql),

  // --- Guvenli parametreli erisimler ---
  userByUsername: (username) => prisma.user.findUnique({ where: { username } }),
  userById: (id) => prisma.user.findUnique({ where: { id: Number(id) } }),

  // #13 Mass assignment: data objesi oldugu gibi gecer (Low). id korunur.
  updateUser: (id, data) => {
    const d = { ...data };
    delete d.id;
    return prisma.user.update({ where: { id: Number(id) }, data: d });
  },

  productById: (id) => prisma.product.findUnique({ where: { id: Number(id) } }),

  couponByCode: (code) => prisma.coupon.findUnique({ where: { code } }),
  setCouponUsed: (code) => prisma.coupon.update({ where: { code }, data: { used: 1 } }),
  couponReset: (code) => prisma.coupon.update({ where: { code }, data: { used: 0 } }), // lab: race demosunu tekrar calistirabilmek icin
  // #23 High: atomik kosullu update -> etkilenen satir sayisi
  couponUseAtomic: async (code) => {
    const r = await prisma.coupon.updateMany({ where: { code, used: 0 }, data: { used: 1 } });
    return r.count;
  },

  orderById: (id) => prisma.order.findUnique({ where: { id: Number(id) } }),
  orderByIdAndUser: (id, userId) =>
    prisma.order.findFirst({ where: { id: Number(id), userId: Number(userId) } }),
};

module.exports = { db, prisma };
