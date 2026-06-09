// =====================================================
// Proxy — Maintenance Mode Gate
// Next.js 16 (replaces deprecated middleware.ts)
//
// Jika MAINTENANCE_MODE=true, semua request halaman
// akan di-rewrite ke /maintenance.
// API routes, static assets, dan admin bypass dikecualikan.
// =====================================================

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const maintenanceMode = process.env.MAINTENANCE_MODE;

  // Jika maintenance mode tidak aktif, lanjutkan normal
  if (maintenanceMode !== "true") {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  // ── Pengecualian: jangan intercept path berikut ────
  // 1. API routes (cron, telegram webhook, maintenance API)
  // 2. Static assets (_next/static, _next/image)
  // 3. Favicon, robots, sitemap
  // 4. Maintenance page sendiri (hindari infinite loop)
  const excludedPaths = [
    "/api",
    "/_next",
    "/favicon.ico",
    "/robots.txt",
    "/sitemap.xml",
    "/maintenance",
  ];

  if (excludedPaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // ── Cek admin bypass ──────────────────────────────
  const bypassSecret = process.env.MAINTENANCE_BYPASS_SECRET;
  const bypassQuery = request.nextUrl.searchParams.get("bypass_maintenance");
  const bypassCookie = request.cookies.get("maintenance_bypass")?.value;

  // Jika bypass via query param → set cookie & lanjutkan
  if (bypassSecret && bypassQuery === bypassSecret) {
    const response = NextResponse.next();
    response.cookies.set("maintenance_bypass", bypassSecret, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24 jam
      path: "/",
    });
    return response;
  }

  // Jika sudah punya bypass cookie → lanjutkan normal
  if (bypassSecret && bypassCookie === bypassSecret) {
    return NextResponse.next();
  }

  // ── Rewrite ke halaman maintenance ────────────────
  const maintenanceUrl = new URL("/maintenance", request.url);
  return NextResponse.rewrite(maintenanceUrl);
}

export const config = {
  matcher: [
    /*
     * Match semua request kecuali:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, sitemap.xml, robots.txt
     */
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
