#!/bin/sh
# ===========================================================================
#  ordek-wg entrypoint — wg0 tünelini kur + tünel istemcilerini lab ağına NAT'la.
#  Env (panel `lib/wireguard.js` verir):
#    WG_PRIV       sunucu özel anahtarı (base64)
#    WG_PORT       dinleme portu (51820)
#    WG_TUN_ADDR   sunucu tünel adresi + maske (10.13.38.1/24)
#    WG_LAB_SUBNET hedeflerin bulunduğu Docker ağı (10.13.37.0/24) — bilgi amaçlı
#    WG_PEERS      yeniden başlatmada geri yüklenen eşler: "pub1=ip1,pub2=ip2"
#  Yeni eşler çalışırken `wg set wg0 peer ...` ile eklenir (panel docker exec).
# ===========================================================================
set -e
umask 077
mkdir -p /etc/wireguard

TUN_NET="${WG_TUN_ADDR%/*}/24"     # 10.13.38.1/24 -> 10.13.38.0/24 (maske 24 varsayımı)
TUN_NET="$(echo "$TUN_NET" | sed 's#\.[0-9]*/#.0/#')"

# wg0.conf üret
{
  echo "[Interface]"
  echo "Address = ${WG_TUN_ADDR}"
  echo "ListenPort = ${WG_PORT}"
  echo "PrivateKey = ${WG_PRIV}"
} > /etc/wireguard/wg0.conf

# Yeniden başlatmada bilinen eşleri geri yükle (WG_PEERS = "pub=ip,pub=ip")
if [ -n "$WG_PEERS" ]; then
  OLDIFS="$IFS"; IFS=','
  for p in $WG_PEERS; do
    pub="${p%%=*}"; ip="${p##*=}"
    if [ -n "$pub" ] && [ -n "$ip" ]; then
      {
        echo "[Peer]"
        echo "PublicKey = ${pub}"
        echo "AllowedIPs = ${ip}/32"
      } >> /etc/wireguard/wg0.conf
    fi
  done
  IFS="$OLDIFS"
fi

# Çıkış arayüzü (lab ağına = ordek_vpn üzerindeki eth0)
OUT_IF="$(ip route | awk '/default/{print $5; exit}')"
[ -z "$OUT_IF" ] && OUT_IF="eth0"

wg-quick up wg0

# Tünel istemcilerini lab ağına maskele (hedefler yanıtı wg konteynerine döner)
iptables -t nat -C POSTROUTING -s "$TUN_NET" -o "$OUT_IF" -j MASQUERADE 2>/dev/null \
  || iptables -t nat -A POSTROUTING -s "$TUN_NET" -o "$OUT_IF" -j MASQUERADE

# FORWARD: varsayılan olarak tünel<->lab serbest (sınıf izolasyonu panel tarafından
# ek kurallarla daraltılır; bireysel modda bu kurallar yeterli).
iptables -C FORWARD -i wg0 -j ACCEPT 2>/dev/null || iptables -A FORWARD -i wg0 -j ACCEPT
iptables -C FORWARD -o wg0 -j ACCEPT 2>/dev/null || iptables -A FORWARD -o wg0 -j ACCEPT

echo "[ordek-wg] wg0 hazır: ${WG_TUN_ADDR} :${WG_PORT}/udp -> ${OUT_IF} (lab ${WG_LAB_SUBNET})"
wg show wg0 || true

term() { wg-quick down wg0 2>/dev/null || true; exit 0; }
trap term TERM INT

# Canlı kal
while true; do sleep 3600; done
