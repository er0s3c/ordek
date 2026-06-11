import { NextResponse } from "next/server";

// --- ZAFIYET #27 / #30: Yetkilendirme SADECE middleware'de yapilirsa (Low/Medium) ---
// Egitim notu: Next.js'in yamalanmamis surumlerinde "x-middleware-subrequest"
// basligi ile middleware tamamen atlatilabilir (CVE-2025-29927 sinifi).
// High dogru yaklasim: yetkiyi her route handler / server action icinde TEKRAR dogrulayin.
export function middleware(req) {
  const { pathname } = req.nextUrl;
  const machine = process.env.LAB_MACHINE;

  if (machine) {
    if (machine === "mfa-bypass") {
      if (pathname === "/" || pathname === "/login" || pathname === "/mfa" || pathname === "/dashboard") {
        return NextResponse.rewrite(new URL("/mfa-router", req.url)); 
      }
    } else if (machine === "insecure-randomness") {
      if (pathname === "/" || pathname === "/reset" || pathname === "/verify" || pathname === "/outbox" || pathname === "/success") {
        return NextResponse.rewrite(new URL("/insecure-router", req.url));
      }
    } else if (machine === "ssrf") {
      if (pathname === "/") {
        return NextResponse.rewrite(new URL("/ssrf-router", req.url));
      }
    } else if (machine === "prototype-pollution") {
      if (pathname === "/") {
        return NextResponse.rewrite(new URL("/prototype-router", req.url));
      }
    } else if (pathname === "/") {
      if (machine === "brute-force") return NextResponse.rewrite(new URL("/brute", req.url));
      if (machine === "command-injection") return NextResponse.rewrite(new URL("/cmd", req.url));
      if (machine === "csrf") return NextResponse.rewrite(new URL("/csrf", req.url));
      if (machine === "file-inclusion") return NextResponse.rewrite(new URL("/lfi", req.url));
      if (machine === "sql-injection") return NextResponse.rewrite(new URL("/sqli", req.url));
      if (machine === "sql-injection-blind") return NextResponse.rewrite(new URL("/sqli-blind", req.url));
      if (machine === "xss-reflected") return NextResponse.rewrite(new URL("/xss-ref", req.url));
      if (machine === "xss-stored") return NextResponse.rewrite(new URL("/xss-stored", req.url));
      if (machine === "insecure-jwt") return NextResponse.rewrite(new URL("/jwt", req.url));
      if (machine === "cors-misconfig") return NextResponse.rewrite(new URL("/cors", req.url));
      if (machine === "mass-assignment") return NextResponse.rewrite(new URL("/mass", req.url));
      if (machine === "idor-bola") return NextResponse.rewrite(new URL("/idor", req.url));
      if (machine === "server-side-pp-gadget") return NextResponse.rewrite(new URL("/pp-gadget", req.url));
      if (machine === "ssti") return NextResponse.rewrite(new URL("/ssti", req.url));
      if (machine === "insecure-deserialization") return NextResponse.rewrite(new URL("/insecure-deserialization", req.url));
      if (machine === "open-redirect") return NextResponse.rewrite(new URL("/open-redirect", req.url));
      if (machine === "host-header-poisoning") return NextResponse.rewrite(new URL("/host-header", req.url));
      if (machine === "race-condition") return NextResponse.rewrite(new URL("/race-condition", req.url));
      if (machine === "business-logic") return NextResponse.rewrite(new URL("/business-logic", req.url));
      if (machine === "redos") return NextResponse.rewrite(new URL("/redos", req.url));
    }
  }

  if (pathname.startsWith("/admin")) {
    const role = req.cookies.get("role")?.value;
    if (role !== "admin") {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/mfa",
    "/dashboard",
    "/reset",
    "/verify",
    "/outbox",
    "/success",
    "/admin/:path*"
  ]
};
