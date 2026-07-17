#!/bin/bash
# ============================================================================
#  ordek-attacker entrypoint — loot provisioning (LAB_FLAG'tan) + supervisord.
#  Loot lablarında (john/hashcat/theharvester/responder/aircrack) flag, çalışma
#  anında LAB_FLAG'tan üretilir → sunucudaki kanonik flag ile birebir tutar.
# ============================================================================
set -u
mkdir -p /root/loot /opt/harvest
WL=/usr/share/wordlists/ordek.txt
touch "$WL"

FLAG="${LAB_FLAG:-ordek{lab}}"

case "${LAB_SCENARIO:-}" in
  tool-john)
    # sha512-crypt'li shadow satırı; parola = FLAG (ordek.txt'e eklenir → kırılır)
    HASH="$(openssl passwd -6 "$FLAG" 2>/dev/null)"
    echo "ducky:${HASH}:19000:0:99999:7:::" > /root/loot/shadow.txt
    echo "$FLAG" >> "$WL"
    ;;
  tool-hashcat)
    printf '%s' "$FLAG" | md5sum | awk '{print $1}' > /root/loot/hash.txt
    echo "$FLAG" >> "$WL"
    ;;
  tool-responder)
    # Responder ile yakalanan NetNTLM hash'i bu sözlükle kırılır (parola=FLAG).
    echo "$FLAG" >> "$WL"
    ;;
  tool-theharvester)
    cat > /opt/harvest/results.txt <<EOF
# theHarvester (yerel OSINT aynası) — ordek.lab
[emails]
admin@ordek.lab
it-support@ordek.lab
[hosts]
www.ordek.lab
mail.ordek.lab
vpn.ordek.lab
${FLAG}.ordek.lab
EOF
    ;;
  tool-aircrack)
    if [ -f /root/loot/handshake.cap ]; then
      echo "$FLAG" >> "$WL"
    else
      echo "handshake.cap sağlanmadı. Operatör docker/attacker/loot/handshake.cap (passphrase=flag) eklemeli." > /root/loot/README-eksik.txt
    fi
    ;;
  tool-gitleaks)
    # Geçmişe sızıp sonra 'silinen' bir sır içeren git deposu (gitleaks TÜM geçmişi tarar).
    REPO=/root/loot/ordek-repo
    mkdir -p "$REPO"
    ( cd "$REPO" && git init -q && git config user.email dev@ordek.lab && git config user.name dev \
      && echo "# ördek-store backend" > README.md && git add README.md && git commit -qm "ilk commit" \
      && printf 'AWS_ACCESS_KEY_ID=AKIA000\nAWS_SECRET_ACCESS_KEY=%s\n' "$FLAG" > config.py \
      && git add config.py && git commit -qm "prod config eklendi" \
      && echo "AWS_SECRET_ACCESS_KEY=__ROTATED__" > config.py && git add config.py && git commit -qm "sır kaldırıldı (geç!)" ) 2>/dev/null
    ;;
esac

# Hoş geldin notu (terminale düşünce görünür)
cat > /root/.hello <<EOF
== ördek // ${LAB_SCENARIO:-tool} saldırgan kutusu ==
Hedeflere ağ adlarıyla eriş:  target , victim
Araç labı görevleri için sol paneldeki GÖREVLER + İPUCU bölümüne bak.
EOF
grep -qF 'cat /root/.hello' /root/.bashrc 2>/dev/null || echo '[ -f /root/.hello ] && cat /root/.hello' >> /root/.bashrc

exec /usr/bin/supervisord -c /etc/supervisor/conf.d/ordek.conf
