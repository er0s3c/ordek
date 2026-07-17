# ============================================================================
#  ordek-target-tls — sslscan labı hedefi.
#  Boot'ta self-signed bir sertifika üretir; LAB_FLAG'i sertifikanın OU alanına
#  gömer ve 443'te (zayıf: SHA1 + self-signed) TLS servis eder. sslscan/openssl
#  ile sertifika konusundaki (Subject OU) flag okunur. Bağımlılık: openssl.
# ============================================================================
FROM alpine:3.20
RUN apk add --no-cache openssl
ENV LAB_FLAG="ordek{tls_lab}" LAB_SCENARIO=""
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
EXPOSE 443
ENTRYPOINT ["/entrypoint.sh"]
