#!/bin/bash
set -u
mkdir -p /srv/public
echo "${LAB_FLAG:-ordek{lab}}" > /srv/public/flag.txt
cat > /srv/public/NOT.txt <<EOF
IT departmanı notu: bu paylaşım yanlışlıkla herkese açık bırakıldı.
flag.txt dosyasını okuyabilirsin.
EOF
chmod -R 0755 /srv/public
nmbd -D 2>/dev/null || true
exec smbd --foreground --no-process-group
