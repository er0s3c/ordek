# ordek-victim-bot — yakalanacak GERÇEK trafik üreten kurban.
# Senaryoya göre periyodik olarak: HTTP login (sniff/SET), SMB auth (responder),
# sayfa gezme (beef/evilginx). curl + smbclient yeter.
FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends \
      curl smbclient ca-certificates iputils-ping iproute2 \
    && rm -rf /var/lib/apt/lists/*
COPY bot.sh /usr/local/bin/bot.sh
RUN chmod +x /usr/local/bin/bot.sh
ENV LAB_FLAG="ordek{lab}" LAB_SCENARIO="" VICTIM_TARGET="target"
CMD ["/usr/local/bin/bot.sh"]
