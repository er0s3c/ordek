#!/bin/bash
set -u
FLAG="${LAB_FLAG:-ordek{lab}}"
# Flag'i zone dosyasına göm (TXT kaydı)
sed "s/__LAB_FLAG__/${FLAG//\//\\/}/" /etc/bind/db.ordek.lab.tmpl > /etc/bind/db.ordek.lab
# named.conf.local'ı dahil et (bind9 paketi options'ı zaten içerir)
grep -q 'named.conf.local' /etc/bind/named.conf 2>/dev/null || true
exec /usr/sbin/named -g -c /etc/bind/named.conf -u bind
