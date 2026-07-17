# ordek-target-cve — vsftpd 2.3.4 backdoor (CVE-2011-2523) emülasyonu.
# Metasploit exploit/unix/ftp/vsftpd_234_backdoor + searchsploit 49757 GERÇEKTEN çalışır:
#   USER ...:)  → 6200 portunda kök kabuk açılır → /root/flag.txt okunur.
FROM python:3.12-slim
WORKDIR /app
COPY server.py /app/server.py
ENV LAB_FLAG="ordek{lab}" LAB_SCENARIO=""
EXPOSE 21 6200
CMD ["python3", "server.py"]
