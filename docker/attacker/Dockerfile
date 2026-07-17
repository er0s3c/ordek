# ============================================================================
#  ordek-attacker — gerçek-araç labı SALDIRGAN KUTUSU (Kali tabanlı).
#  Tarayıcı terminali (ttyd :7681) + GUI masaüstü (noVNC :6080) + gerçek araçlar.
#  ⚠ BÜYÜK İMAJ (birkaç GB). Tüm tool labları bu tek imajı paylaşır.
#  Host'a port YAYINLAMAZ; yalnız proxy (:3001) üzerinden erişilir.
# ============================================================================
FROM kalilinux/kali-rolling

ENV DEBIAN_FRONTEND=noninteractive \
    LANG=C.UTF-8 \
    HOME=/root

# Wireshark setuid postinst'i build içinde başarısız olur (setcap izinleri yok).
# root olarak çalıştığımız için setuid'e gerek yok → false ile postinst'i sorunsuz geç.
RUN echo "wireshark-common wireshark-common/install-setuid boolean false" | debconf-set-selections

# 1) Çekirdek CLI araçları (bu katman BAŞARILI olmalı)
RUN apt-get update && apt-get install -y --no-install-recommends \
      bash ca-certificates curl wget git python3 python3-pip iproute2 iputils-ping \
      nmap netcat-traditional tcpdump tshark dnsutils dnsrecon dnsenum \
      hydra john hashcat sqlmap nikto whatweb \
      smbclient enum4linux ffuf gobuster wordlists exploitdb \
      responder aircrack-ng net-tools vim less \
    && rm -rf /var/lib/apt/lists/*

# 2) Çatılar + ek araçlar (best-effort: biri yoksa build çökmesin)
RUN apt-get update && (apt-get install -y --no-install-recommends \
      metasploit-framework set bettercap wpscan smbmap theharvester || true) \
    && rm -rf /var/lib/apt/lists/*

# 2b) FAZ 2 — yeni araçlar (best-effort; Kali repolarında paketli). Biri yoksa build çökmesin.
#     gobuster + whatweb zaten (1) katmanında. netexec yeni adı; eski crackmapexec'e düş.
RUN apt-get update && (apt-get install -y --no-install-recommends \
      nuclei sslscan impacket-scripts gitleaks subfinder commix dalfox || true) \
    && (apt-get install -y --no-install-recommends netexec || apt-get install -y --no-install-recommends crackmapexec || true) \
    && rm -rf /var/lib/apt/lists/*
# nxc kısayolu (netexec/crackmapexec hangisi geldiyse)
RUN if [ ! -e /usr/bin/nxc ]; then ln -sf "$(command -v netexec || command -v crackmapexec || echo /bin/true)" /usr/local/bin/nxc 2>/dev/null || true; fi

# 3a) KRİTİK: supervisor (apt) + ttyd (Kali apt'te YOK → statik binary). Başarısız olursa build ÇÖKSÜN.
RUN apt-get update && apt-get install -y --no-install-recommends supervisor \
    && rm -rf /var/lib/apt/lists/*
RUN curl -fsSL -o /usr/local/bin/ttyd \
      https://github.com/tsl0922/ttyd/releases/download/1.7.7/ttyd.x86_64 \
    && chmod +x /usr/local/bin/ttyd && /usr/local/bin/ttyd --version

# 3b) noVNC GUI yığını (Wireshark/Burp/BeEF için — best-effort)
RUN apt-get update && (apt-get install -y --no-install-recommends \
      xvfb x11vnc fluxbox novnc websockify \
      wireshark firefox-esr burpsuite beef-xss || true) \
    && rm -rf /var/lib/apt/lists/*

# 3c) hashcat CPU backend (PoCL) — AYRI best-effort katman (GUI'yi düşürmesin).
# NOT: Bazı Kali snapshot'larında pocl-opencl-icd repolarda bulunmaz (no candidate).
# Bulunamazsa hashcat çalışır ama OpenCL backend olmadan kıramaz → hash kırma
# pedagojisi 'john' labında zaten gerçek olarak karşılanır. PoCL gelirse otomatik aktif.
RUN apt-get update && (apt-get install -y --no-install-recommends pocl-opencl-icd || true) \
    && rm -rf /var/lib/apt/lists/*

# 4) Evilginx3 (apt'te yok → GitHub release; egress build sırasında host'tan gelir)
RUN set -e; cd /opt; \
    (curl -fsSL -o evilginx.tar.gz https://github.com/kgretzky/evilginx2/releases/download/v3.3.0/evilginx-v3.3.0-linux-64bit.tar.gz \
      && tar xzf evilginx.tar.gz && rm -f evilginx.tar.gz \
      && ln -sf "$(find /opt -maxdepth 2 -name evilginx -type f | head -1)" /usr/local/bin/evilginx) \
    || echo "evilginx indirilemedi (lab içinde elle kurulabilir)"

# rockyou'yu aç (wordlists paketi .gz koyar)
RUN [ -f /usr/share/wordlists/rockyou.txt.gz ] && gunzip -f /usr/share/wordlists/rockyou.txt.gz || true

COPY supervisor.conf /etc/supervisor/conf.d/ordek.conf
COPY entrypoint.sh /usr/local/bin/ordek-entrypoint.sh
# (opsiyonel) aircrack labı için gerçek handshake: docker/attacker/loot/handshake.cap koyarsan kopyalanır
COPY loot/ /root/loot/
RUN chmod +x /usr/local/bin/ordek-entrypoint.sh && mkdir -p /root/loot /opt/harvest

EXPOSE 7681 6080
ENTRYPOINT ["/usr/local/bin/ordek-entrypoint.sh"]
