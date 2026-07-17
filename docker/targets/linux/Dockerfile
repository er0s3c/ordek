# ordek-target-linux — Bandit-tarzı SSH temel-Linux hedefi.
# Öğrenci KENDİ sanal makinesinden `ssh ordek@<ip>` ile bağlanır (parola: ordek).
# Home dizini deterministik seed'lenir (sorular sabit cevaplı); flag base64'lenmiş
# gizli dosyada (LAB_FLAG env'inden boot'ta yazılır). Bağımlılık minimal.
FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends \
      openssh-server coreutils grep less \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /run/sshd
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh
ENV LAB_FLAG="ordek{lab}" LAB_SCENARIO=""
EXPOSE 22
CMD ["/usr/local/bin/entrypoint.sh"]
