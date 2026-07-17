# ordek-target-smb — anonim (guest) erişimli Samba paylaşımı.
# enum4linux / smbclient -L / smbmap GERÇEKTEN çalışır; flag 'public' paylaşımında.
FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends samba samba-common-bin \
    && rm -rf /var/lib/apt/lists/*
COPY smb.conf /etc/samba/smb.conf
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh && mkdir -p /srv/public
ENV LAB_FLAG="ordek{lab}" LAB_SCENARIO=""
EXPOSE 139 445
CMD ["/usr/local/bin/entrypoint.sh"]
