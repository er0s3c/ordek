/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,

  // better-sqlite3 native modulu Next.js bundle'a alinmamali
  // (Next 14.2.x: experimental.serverComponentsExternalPackages; v15'te serverExternalPackages)
  experimental: {
    serverComponentsExternalPackages: ["better-sqlite3"],
  },

  // Flag izolasyonu: kaynak haritalari client'a flag/sunucu kodu sizdirmesin diye kapali.
  productionBrowserSourceMaps: false,

  // --- ZAFIYET #31: Image Optimization SSRF (Low: cok genis allowlist) ---
  images: {
    remotePatterns: [{ protocol: "http", hostname: "**" }],
    // High icin: remotePatterns: [{ protocol: "https", hostname: "cdn.lab.local" }]
  },

  async headers() {
    // --- ZAFIYET #19: Clickjacking ---
    // Low: hicbir frame korumasi dondurme (asagidaki bloku yorum yap).
    // High icin asagidakini aktif edin:
    // return [{ source: "/(.*)", headers: [
    //   { key: "X-Frame-Options", value: "DENY" },
    //   { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
    // ]}];
    return [];
  },
};
module.exports = nextConfig;
