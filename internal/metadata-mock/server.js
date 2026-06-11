// Cloud metadata taklidi (169.254.169.254 rolu) — SSRF #31 hedefi.
const http = require("http");
http.createServer((req, res) => {
  res.end("FLAG{ssrf_metadata_a17c}\niam/security-credentials/lab-role\n");
}).listen(80, () => console.log("metadata-mock :80"));
