#!/bin/sh
# Self-signed sertifika üret: LAB_FLAG → sertifika Subject OU alanı. Zayıf (SHA1) → sslscan raporlar.
set -e
FLAG="${LAB_FLAG:-ordek{tls_lab}}"
openssl req -x509 -newkey rsa:2048 -nodes -sha1 -days 365 \
  -keyout /tmp/key.pem -out /tmp/cert.pem \
  -subj "/C=TR/O=ordek-store/OU=${FLAG}/CN=ordek-store.local" >/dev/null 2>&1
echo "[ordek-target-tls] 443 dinleniyor; sertifika OU=flag"
# -www: basit bir HTTPS yanıtı da döndürür; sslscan sertifika/protokol/şifre enumerasyonu yapar.
exec openssl s_server -accept 443 -cert /tmp/cert.pem -key /tmp/key.pem -www -quiet
