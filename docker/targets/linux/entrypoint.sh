#!/bin/bash
# ordek-target-linux boot: SSH kullanıcısı + deterministik ev dizini + flag seed.
# Sorular (lib/steps.js → tool-linux) bu seed'e GÖRE sabit cevaplıdır:
#   whoami=ordek · pwd=/home/ordek · düz `ls`=4 öğe · ipucu→'veriler' · gizli.b64 → base64 -d = FLAG
set -u
FLAG="${LAB_FLAG:-ordek{lab}}"
USER_NAME="ordek"
USER_PASS="ordek"
HOME_DIR="/home/${USER_NAME}"

# 1) Kullanıcı + parola
id "$USER_NAME" >/dev/null 2>&1 || useradd -m -s /bin/bash "$USER_NAME"
echo "${USER_NAME}:${USER_PASS}" | chpasswd

# 2) Deterministik ev dizini (düz `ls` = TAM 4 öğe: okubeni.txt + notlar + veriler + araclar)
rm -rf "${HOME_DIR}/notlar" "${HOME_DIR}/veriler" "${HOME_DIR}/araclar" "${HOME_DIR}/okubeni.txt"
mkdir -p "${HOME_DIR}/notlar" "${HOME_DIR}/veriler" "${HOME_DIR}/araclar"

cat > "${HOME_DIR}/okubeni.txt" <<'EOF'
ördek — Linux Temelleri labına hoş geldin.
Kullanacağın komutlar: pwd, ls, cd, cat, grep, base64
İpucu dosyaları seni adım adım gizli flag'e götürür. Önce 'notlar' dizinine bak.
EOF

cat > "${HOME_DIR}/notlar/ipucu.txt" <<'EOF'
Gizli (base64 kodlu) dosya 'veriler' dizininin içinde saklı.
Bak:  ls veriler    sonra:  base64 -d veriler/<dosya>
EOF

cat > "${HOME_DIR}/araclar/README" <<'EOF'
(bu dizin kasıtlı olarak boş — burada flag yok, yanlış iz)
EOF

# 3) Flag'i base64'leyip gizli dosyaya yaz (newline EKLEME → çözünce birebir flag çıksın)
printf '%s' "$FLAG" | base64 -w 0 > "${HOME_DIR}/veriler/gizli.b64"

# 4) Sahiplik
chown -R "${USER_NAME}:${USER_NAME}" "${HOME_DIR}"

# 5) sshd: host anahtarları + parola girişi
mkdir -p /run/sshd
ssh-keygen -A 2>/dev/null || true
sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication yes/' /etc/ssh/sshd_config 2>/dev/null || true
echo "[ordek-target-linux] ssh ready: user=${USER_NAME} (pass=${USER_PASS})" >&2
exec /usr/sbin/sshd -D -e
