#!/bin/sh
# ördek-lab giriş noktası — tek imaj iki rol:
#   • LAB_MACHINE set ise → HEDEF MAKİNE: production (`next start`, düşük RAM).
#     Tohumlu DB build'de hazırlanır; boot'ta sadece yazılabilir yola kopyalanır (hızlı + ucuz).
#   • değilse → KONTROL PANELİ: dev modu (HMR) + DB push/seed (mevcut davranış).
set -e

if [ -n "$LAB_MACHINE" ]; then
  # read-only rootfs + tmpfs /app/prisma ile uyumlu: tohumlu DB'yi yazılabilir yere koy.
  cp -f /app/seed-dev.db /app/prisma/dev.db 2>/dev/null || true
  exec npm run start
else
  npx prisma db push --skip-generate --accept-data-loss || true
  node prisma/seed.js || true
  exec npm run dev
fi
