#!/bin/bash
# Kurban botu: senaryoya göre yakalanacak GERÇEK trafik üretir.
T="${VICTIM_TARGET:-target}"
F="${LAB_FLAG:-ordek{lab}}"
S="${LAB_SCENARIO:-}"
sleep 6   # menzilin ayağa kalkmasını bekle
echo "[victim] scenario=$S target=$T" >&2

# Pasif sniff labları: Docker bridge switched → hedefe SALDIRGAN üzerinden yönlen
# (in-path capture). Saldırgan ip_forward ile paketleri hedefe iletir.
if [ -n "${VICTIM_ROUTE_VIA:-}" ]; then
  for i in 1 2 3 4 5; do
    GW=$(getent hosts "$VICTIM_ROUTE_VIA" 2>/dev/null | awk '{print $1}' | head -1)
    TG=$(getent hosts target 2>/dev/null | awk '{print $1}' | head -1)
    if [ -n "$GW" ] && [ -n "$TG" ]; then
      ip route replace "$TG/32" via "$GW" 2>/dev/null && echo "[victim] route $TG via $GW" >&2 && break
    fi
    sleep 2
  done
fi
while true; do
  case "$S" in
    tool-wireshark|tool-tcpdump|tool-bettercap)
      # HTTP (düz metin) login → parola tel üstünde görünür (= flag)
      curl -s -m 5 -d "username=admin&password=${F}" "http://${T}/login" >/dev/null 2>&1 ;;
    tool-setoolkit)
      # Saldırganın klonladığı sahte login sayfasına kurban giriş yapar
      curl -s -m 5 -d "username=victim&password=${F}" "http://${T}/login" >/dev/null 2>&1 ;;
    tool-evilginx)
      # Lure/proxy sayfasını ziyaret + giriş (oturum çerezi taşınır)
      curl -sk -m 6 -c /tmp/jar -b /tmp/jar -d "username=victim&password=${F}" "http://${T}/login" >/dev/null 2>&1 ;;
    tool-responder)
      # Var olmayan dosya sunucusuna SMB auth → LLMNR/NBT-NS yayını (Responder yakalar)
      smbclient "//ORDEK-FILESRV/data" -U "victim%${F}" -c 'ls' >/dev/null 2>&1 || true ;;
    tool-beef)
      # NOT: gerçek hook JS yürütme ister (curl JS çalıştırmaz) — sayfayı yine de gez
      curl -s -m 5 "http://${T}/" >/dev/null 2>&1 ;;
    *)
      curl -s -m 5 "http://${T}/" >/dev/null 2>&1 ;;
  esac
  sleep 9
done
