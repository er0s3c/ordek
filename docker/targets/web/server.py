#!/usr/bin/env python3
# ===========================================================================
#  ordek-target-web — çok amaçlı GERÇEK zafiyetli web hedefi (yalnız izole lab).
#  Tek dosya, bağımlılık yok (Python stdlib). LAB_SCENARIO'ya göre davranır:
#    tool-sqlmap          -> /product?id=  GERÇEK SQLi (sqlite), secrets tablosu
#    tool-ffuf            -> robots.txt + gizli /admin/flag.txt
#    tool-nikto           -> 'x-ordek-flag' uncommon header (nikto raporlar)
#    tool-nmap            -> 31337 portunda banner içinde flag
#    tool-hydra           -> /login admin/ducky (rockyou) -> başarıda flag
#    tool-wireshark/...   -> /login (kurban düz metin password=FLAG yollar)
#    tool-setoolkit       -> klonlanacak login portalı (kurban FLAG'i yollar)
#    tool-evilginx        -> başarılı login'de session cookie = FLAG
#    tool-burp            -> /buy fiyat sunucuda doğrulanmaz -> price<=1 ise flag
# ===========================================================================
import os, socket, threading, sqlite3, html, urllib.parse, subprocess
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

FLAG = os.environ.get("LAB_FLAG", "ordek{lab}")
SCEN = os.environ.get("LAB_SCENARIO", "")
PORT = int(os.environ.get("PORT", "80"))
HIDDEN_PORT = 31337
# conncheck senaryosu: öğrencinin Kali VM'inden erişimini ispatlayan oturuma özel token.
CONN_TOKEN = os.environ.get("CONN_TOKEN", FLAG)
HYDRA_USER, HYDRA_PASS = "admin", "ducky"   # ducky rockyou'da vardır

# tool-commix: shell'den okunacak flag dosyası
if SCEN == "tool-commix":
    try:
        with open("/tmp/ci_flag.txt", "w") as f: f.write(FLAG + "\n")
    except Exception: pass

# tool-whatweb: geliştiricinin unuttuğu generator meta'sında flag (whatweb MetaGenerator raporlar)
# ⚠ PAGE.format() çağrıldığı için flag'in {} süslü parantezleri kaçırılmalı ({{ }} → çıktıda { }).
GEN_META = (('<meta name="generator" content="%s">' % html.escape(FLAG)).replace("{", "{{").replace("}", "}}")) if SCEN == "tool-whatweb" else ""

PAGE = """<!doctype html><meta charset=utf-8><title>ördek-store</title>""" + GEN_META + """
<body style="font-family:system-ui;background:#12150f;color:#dde3d2;max-width:680px;margin:40px auto;padding:0 16px">
<h1>🦆 ördek-store</h1>{body}</body>"""

def page(body): return PAGE.format(body=body)

def db():
    cx = sqlite3.connect(":memory:")
    cx.executescript(
      "CREATE TABLE products(id INTEGER,name TEXT,price INTEGER);"
      "INSERT INTO products VALUES (1,'Ordek Sticker',10),(2,'Hoodie',300),(3,'Mug',60);"
      "CREATE TABLE secrets(id INTEGER,flag TEXT);")
    cx.execute("INSERT INTO secrets VALUES (1,?)", (FLAG,))
    return cx

LOGIN_FORM = """
<h2>Giriş</h2>
<form method=POST action=/login>
  <p>Kullanıcı: <input name=username></p>
  <p>Parola: <input name=password type=password></p>
  <button>Giriş</button>
</form>
<p style="color:#7a8369">⚠ Bu site HTTP (şifresiz) — trafik dinlenebilir.</p>"""

class H(BaseHTTPRequestHandler):
    server_version = "Apache/2.2.8 (Unix)"   # eski sürüm görüntüsü (nikto/searchsploit havası)
    def log_message(self, *a): pass

    def _send(self, code, body, ctype="text/html; charset=utf-8", extra=None):
        data = body.encode() if isinstance(body, str) else body
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        # nikto: alışılmadık başlık → flag
        if SCEN == "tool-nikto":
            self.send_header("x-ordek-flag", FLAG)
        if extra:
            for k, v in extra.items(): self.send_header(k, v)
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        u = urllib.parse.urlparse(self.path)
        path, qs = u.path, urllib.parse.parse_qs(u.query)

        # ── BAĞLANTI TESTİ (Kali VM erişim doğrulaması) ──
        # Öğrenci KENDİ Kali VM'inden bu hedefe ulaşıp oturuma özel token'ı alır → panele yapıştırır.
        if SCEN == "conncheck":
            src = self.client_address[0] if self.client_address else "?"
            if path == "/token":  # script-dostu: yalnız token
                return self._send(200, CONN_TOKEN + "\n", "text/plain")
            return self._send(200, page(
                "<h2>🐉 Bağlantı Testi Hedefi</h2>"
                "<p>Tebrikler — bu sayfayı görüyorsan ağ yolun <b>çalışıyor</b>. Aşağıdaki token'ı"
                " panele yapıştır:</p>"
                "<p style='font-size:20px'><b>%s</b></p>"
                "<p style='color:#7a8369'>Sana ulaşan kaynak IP: <code>%s</code></p>"
                "<hr><p style='color:#7a8369'>İpucu: terminalden de alabilirsin →"
                " <code>curl http://&lt;host-ip&gt;:&lt;port&gt;/token</code></p>"
                % (html.escape(CONN_TOKEN), html.escape(src))))

        if path == "/robots.txt":
            return self._send(200, "User-agent: *\nDisallow: /admin\nDisallow: /config.old\n", "text/plain")
        if path == "/config.old":   # nikto/keşif: sızan yedek
            return self._send(200, "# eski yapılandırma yedeği\nADMIN_NOTE=%s\n" % FLAG, "text/plain")
        if path == "/admin" or path == "/admin/":
            return self._send(200, page("<h2>admin</h2><ul><li><a href=/admin/flag.txt>flag.txt</a></li></ul>"))
        if path == "/admin/flag.txt":
            return self._send(200, FLAG + "\n", "text/plain")

        # ── FAZ 2 araç senaryoları ──
        if path == "/.env" and SCEN == "tool-nuclei":   # nuclei: exposed-env şablonu
            return self._send(200, "APP_ENV=production\nDB_HOST=db.internal\nSECRET=%s\n" % FLAG, "text/plain")
        if path == "/search" and SCEN == "tool-dalfox":  # dalfox: yansıyan XSS + kaynakta gizli flag
            q = qs.get("q", [""])[0]
            return self._send(200, page(
                "<h2>Arama</h2><p>Sonuç: %s</p><!-- flag: %s -->"
                "<form><input name=q value=''><button>Ara</button></form>" % (q, FLAG)))  # q KAÇIRILMADAN yansır (XSS)
        if path == "/ping" and SCEN == "tool-commix":    # commix: komut enjeksiyonuna açık ping aracı
            host = qs.get("host", ["127.0.0.1"])[0]
            try:
                out = subprocess.run("ping -c1 -W1 " + host, shell=True, capture_output=True, text=True, timeout=8)
                body = (out.stdout or "") + (out.stderr or "")
            except Exception as e:
                body = str(e)
            return self._send(200, page("<h2>Ping</h2><pre>%s</pre>" % html.escape(body)))

        if path == "/login":
            return self._send(200, page(LOGIN_FORM))

        if path == "/buy":
            return self._send(200, page(
                "<h2>Satın al: Hoodie</h2>"
                "<form method=POST action=/buy>"
                "<input type=hidden name=item value=Hoodie>"
                "<input type=hidden name=price value=300>"
                "<button>Öde (300₺)</button></form>"
                "<p style='color:#7a8369'>Fiyat istemci tarafında; sunucu doğruluyor mu?</p>"))

        if path == "/product":
            # GERÇEK SQLi: kullanıcı girdisi sorguya STRING olarak gömülür.
            raw = (qs.get("id", ["1"])[0])
            cx = db()
            q = "SELECT id,name,price FROM products WHERE id=%s" % raw
            try:
                rows = cx.execute(q).fetchall()
                items = "".join("<li>%s — %s ₺</li>" % (html.escape(str(r[1])), html.escape(str(r[2]))) for r in rows)
                return self._send(200, page("<h2>Ürün(ler)</h2><ul>%s</ul>" % items))
            except Exception as e:
                # error-based SQLi: sqlite hatasını sızdır
                return self._send(500, page("<h2>DB hatası</h2><pre>%s</pre><!-- %s -->" % (html.escape(str(e)), html.escape(q))))
            finally:
                cx.close()

        # ana sayfa
        return self._send(200, page(
            "<p>Mağazaya hoş geldin.</p><ul>"
            "<li><a href=/login>Giriş</a></li>"
            "<li><a href=/product?id=1>Ürün</a></li>"
            "<li><a href=/buy>Satın al</a></li></ul>"))

    def do_POST(self):
        if self.path != "/login" and self.path != "/buy":
            return self._send(404, page("yok"))
        n = int(self.headers.get("Content-Length", "0") or 0)
        body = self.rfile.read(n).decode("utf-8", "replace")
        form = {k: v[0] for k, v in urllib.parse.parse_qs(body).items()}

        if self.path == "/buy":
            try: price = int(form.get("price", "300"))
            except ValueError: price = 300
            if price <= 1:
                return self._send(200, page("<h2>Sipariş onaylandı 🎉</h2><p>Bedavaya kaptın! flag: <b>%s</b></p>" % FLAG))
            return self._send(200, page("<h2>Ödeme alındı</h2><p>Tutar: %d ₺</p>" % price))

        # /login
        user = form.get("username", ""); pw = form.get("password", "")
        if SCEN == "tool-hydra":
            if user == HYDRA_USER and pw == HYDRA_PASS:
                return self._send(200, page("<h2>Giriş başarılı</h2><p>flag: <b>%s</b></p>" % FLAG))
            return self._send(401, page("<h2>Hatalı</h2>" + LOGIN_FORM))
        # sniff / phishing senaryoları: kurban düz metin parola yollar (flag tel üstünde)
        extra = None
        if SCEN == "tool-evilginx" and pw:
            extra = {"Set-Cookie": "session=%s; Path=/" % FLAG}   # evilginx oturum çerezini çalar
        return self._send(200, page("<h2>Giriş başarılı</h2><p>Hoş geldin, %s.</p>" % html.escape(user)), extra=extra)


def banner_server():
    # nmap labı: 31337'de banner içinde flag
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    s.bind(("0.0.0.0", HIDDEN_PORT)); s.listen(8)
    msg = ("ordek-secret-svc 1.0\r\n" + FLAG + "\r\n").encode()
    while True:
        try:
            c, _ = s.accept()
            try: c.sendall(msg)
            finally: c.close()
        except Exception:
            pass

if __name__ == "__main__":
    threading.Thread(target=banner_server, daemon=True).start()
    print("[ordek-target-web] scenario=%s port=%d" % (SCEN, PORT), flush=True)
    ThreadingHTTPServer(("0.0.0.0", PORT), H).serve_forever()
