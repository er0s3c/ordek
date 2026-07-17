# Docker CLI'yi resmi imajdan al (panel rolu makine baslatmak icin kullanir)
FROM docker:27-cli AS dockercli

FROM node:20-bullseye
WORKDIR /app

# ping (command-injection makinesi gercek cikti versin) + docker client binarisi
# python3 make g++ better-sqlite3 native derleme icin gerekli; libcap2-bin = setcap
RUN apt-get update && apt-get install -y --no-install-recommends iputils-ping python3 make g++ libcap2-bin \
    && rm -rf /var/lib/apt/lists/*
# /bin/ping'in cap_net_raw=ep DOSYA YETENEGINI KALDIR: --cap-drop ALL + no-new-privileges
# altinda dosya yetenekli binary exec'i EPERM verir ("operation not permitted"). Yetenegi
# silince ping, kernel'in YETKISIZ ICMP datagram soketini (net.ipv4.ping_group_range sysctl'i
# docker.js'te acik) kullanir → command-injection "ping" araci GERCEKTEN cevap doner, sandbox bozulmaz.
RUN setcap cap_net_raw-ep /bin/ping 2>/dev/null || setcap -r /bin/ping 2>/dev/null || true
COPY --from=dockercli /usr/local/bin/docker /usr/local/bin/docker

COPY package*.json ./
RUN npm install
COPY . .

# Prisma client + BUILD-TIME tohumlu DB: hedef makineler boot'ta seed YAPMAZ
# (anlik + ucuz acilis, "boot firtinasi" yok). Tohum /app/seed-dev.db'de saklanir;
# entrypoint runtime'da yazilabilir /app/prisma/dev.db'ye kopyalar (read-only uyumlu).
RUN npx prisma generate \
 && npx prisma db push --skip-generate --accept-data-loss \
 && node prisma/seed.js \
 && cp prisma/dev.db /app/seed-dev.db

# Uretim derlemesi: HEDEF makineler `next start` ile ~3-4x daha az RAM kullanir
# (60 ogrenci / 16GB icin kritik). Panel yine dev modunda kosar (entrypoint'te ayrisir).
RUN npm run build

# CRLF'e karsi guvenli + calistirilabilir entrypoint
RUN sed -i 's/\r$//' docker-entrypoint-ordek.sh && chmod +x docker-entrypoint-ordek.sh

EXPOSE 3000
# Panel VE makine ayni imaj; rol entrypoint icinde LAB_MACHINE'e gore ayrisir:
#   LAB_MACHINE set -> hedef makine (next start / prod) ; degilse -> panel (next dev).
ENTRYPOINT ["/app/docker-entrypoint-ordek.sh"]
