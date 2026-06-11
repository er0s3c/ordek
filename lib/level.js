// security_level: makine modunda LAB_FORCE_LEVEL > header (x-security-level) > cookie > 'low'
function getHeader(headers, name) {
  if (!headers) return null;
  if (typeof headers.get === "function") return headers.get(name);
  return headers[name] || headers[name.toLowerCase()] || null;
}
function normalize(v) {
  v = String(v || "").toLowerCase();
  return ["low", "medium", "high"].includes(v) ? v : "low";
}
function getLevel(headers) {
  if (typeof process !== "undefined" && process.env && process.env.LAB_FORCE_LEVEL) {
    return normalize(process.env.LAB_FORCE_LEVEL);
  }
  const h = getHeader(headers, "x-security-level");
  if (h) return normalize(h);
  const cookie = getHeader(headers, "cookie") || "";
  const m = cookie.match(/security_level=(low|medium|high)/i);
  return m ? normalize(m[1]) : "low";
}
module.exports = { getLevel, normalize };
