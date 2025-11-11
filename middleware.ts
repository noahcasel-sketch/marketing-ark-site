// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const CANONICAL_HOST = "www.marketing-ark.com";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ✅ Allow all API routes and webhooks to pass through (no redirects)
  if (
    pathname.startsWith("/api/") || 
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // ✅ Redirect apex domain (marketing-ark.com) → canonical (www.marketing-ark.com)
  if (req.nextUrl.hostname === "marketing-ark.com") {
    const url = req.nextUrl.clone();
    url.hostname = CANONICAL_HOST;
    return NextResponse.redirect(url, 308);
  }

  // Default: just continue
  return NextResponse.next();
}

// Apply to all routes
export const config = {
  matcher: ["/:path*"],
};
