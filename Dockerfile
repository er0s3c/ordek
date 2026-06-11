# Docker CLI'yi resmi imajdan al (panel rolu makine baslatmak icin kullanir)
FROM docker:27-cli AS dockercli

FROM node:20-bullseye
WORKDIR /app

# ping (command-injection makinesi gercek cikti versin) + docker client binarisi
# python3 make g++ better-sqlite3 native derleme icin gerekli
RUN apt-get update && apt-get install -y --no-install-recommends iputils-ping python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
COPY --from=dockercli /usr/local/bin/docker /usr/local/bin/docker

COPY package*.json ./
RUN npm install
COPY . .
RUN npx prisma generate

EXPOSE 3000
# Panel VE makine ayni imaj. Makine modunda LAB_MACHINE + LAB_FORCE_LEVEL env ile gelir.
# Her container baslayisinda DB yeniden kurulur+seed (deep-freeze: taze baslangic).
CMD sh -c "npx prisma db push --skip-generate --accept-data-loss; node prisma/seed.js; npm run dev"
