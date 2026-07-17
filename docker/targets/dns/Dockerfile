# ordek-target-dns — yetkisiz zone transfer'a (AXFR) açık BIND9.
# dig @target ordek.lab AXFR / dnsrecon -t axfr GERÇEKTEN çalışır; flag TXT kaydında.
FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends bind9 dnsutils \
    && rm -rf /var/lib/apt/lists/*
COPY named.conf /etc/bind/named.conf.local
COPY db.ordek.lab /etc/bind/db.ordek.lab.tmpl
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh
ENV LAB_FLAG="ordek{lab}" LAB_SCENARIO=""
EXPOSE 53/tcp 53/udp
CMD ["/usr/local/bin/entrypoint.sh"]
