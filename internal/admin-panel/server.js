// Izole ic admin paneli — host'a port ACILMAZ. SSRF/Command Exec ile erisilir.
const http = require("http");
const FLAG = process.env.FLAG || "FLAG{ssrf_internal_panel_pwned}";
http.createServer((req, res) => {
  if (req.url === "/flag") { res.end(FLAG + "\n"); return; }
  res.end("Internal Admin Panel — yetkisiz. /flag dener misin?\n");
}).listen(3000, () => console.log("internal-admin-panel :3000"));
