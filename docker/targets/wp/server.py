#!/usr/bin/env python3
# ordek-target-wp — WPScan için WordPress benzeri mock (stdlib, bağımlılıksız).
import os, json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

FLAG = os.environ.get("LAB_FLAG", "ordek{lab}")
PORT = int(os.environ.get("PORT", "80"))
PLUGIN = "ordek-vuln"

HOME = """<!doctype html><html><head><meta charset=utf-8>
<meta name="generator" content="WordPress 5.8.1">
<title>ördek blog</title>
<link rel='stylesheet' href='/wp-content/plugins/%s/style.css?ver=1.0'>
<script src='/wp-content/plugins/%s/script.js?ver=1.0'></script>
</head><body><h1>ördek blog</h1><p>WordPress ile.</p>
<a href="/?author=1">yazar</a></body></html>""" % (PLUGIN, PLUGIN)

README = ("=== Ordek Vuln Plugin ===\n"
          "Contributors: admin\n"
          "Stable tag: 1.0\n"
          "Tested up to: 5.8\n\n"
          "Bu eklenti kasitli zafiyetlidir (egitim).\n"
          "NOT (sizdi): %s\n" % FLAG)

class H(BaseHTTPRequestHandler):
    server_version = "Apache/2.4.41"
    def log_message(self, *a): pass
    def _s(self, code, body, ctype="text/html; charset=utf-8", extra=None):
        data = body.encode() if isinstance(body, str) else body
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        if extra:
            for k, v in extra.items(): self.send_header(k, v)
        self.end_headers(); self.wfile.write(data)
    def do_GET(self):
        p = self.path
        if p.startswith("/?author=1") or p == "/?author=1":
            return self._s(301, "", extra={"Location": "/author/admin/"})
        if p.startswith("/author/admin"):
            return self._s(200, "<!doctype html><title>admin</title><h1>admin, yazar</h1>")
        if p == "/readme.html":
            return self._s(200, "<h1>WordPress</h1><br>Version 5.8.1")
        if p.startswith("/wp-json/wp/v2/users"):
            return self._s(200, json.dumps([{"id": 1, "name": "admin", "slug": "admin"}]), "application/json")
        if p.startswith("/wp-content/plugins/%s/readme.txt" % PLUGIN):
            return self._s(200, README, "text/plain")
        if p.startswith("/wp-content/plugins/%s" % PLUGIN):
            return self._s(200, "ordek-vuln plugin dir")
        if p.startswith("/wp-content/plugins/"):
            return self._s(404, "yok")
        if p.startswith("/wp-login.php"):
            return self._s(200, "<title>Log In</title><form id=loginform></form>")
        return self._s(200, HOME)

if __name__ == "__main__":
    print("[ordek-target-wp] :%d plugin=%s" % (PORT, PLUGIN), flush=True)
    ThreadingHTTPServer(("0.0.0.0", PORT), H).serve_forever()
