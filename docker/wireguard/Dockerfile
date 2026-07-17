# ordek-wg — TryHackMe-tarzı WireGuard erişim sunucusu (izole lab ağına tünel).
#  Öğrenci KENDİ Kali VM'inden host:51820/udp'ye bağlanır → tünelden lab ağına
#  (ordek_vpn, 10.13.37.0/24) gerçek IP'lerle erişir: `nmap -p- <hedef-ip>` tam çalışır.
#  Küçük alpine + wireguard-tools + iptables. Çekirdek WG modülü Docker Desktop
#  (LinuxKit) çekirdeğinde mevcut; yoksa wg-quick patlar → panel bridge'e düşer.
FROM alpine:3.20

RUN apk add --no-cache wireguard-tools iptables ip6tables iproute2

COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# 51820/udp: istemci tüneli. (Panel host'a yayımlar.)
EXPOSE 51820/udp
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
