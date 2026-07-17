# ordek-target-web — çok amaçlı GERÇEK zafiyetli HTTP hedefi (TLS yok).
# Senaryoya göre (LAB_SCENARIO) davranır: login (sniff/hydra/SET/evilginx),
# GERÇEK SQLi (sqlmap, sqlite arka uç), gizli dizin (ffuf), uncommon header
# (nikto), gizli TCP port 31337 banner (nmap), fiyat manipülasyonu (burp).
# Flag boot'ta LAB_FLAG env'inden uygun yere yerleştirilir. Bağımlılık yok (stdlib).
FROM python:3.12-slim
WORKDIR /app
COPY server.py /app/server.py
ENV LAB_FLAG="ordek{lab}" LAB_SCENARIO="" PORT=80
EXPOSE 80 31337
CMD ["python3", "server.py"]
