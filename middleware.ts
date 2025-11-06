// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const CANONICAL_HOST = "www.marketing-ark.com";

export function middleware(req: NextRequest) {
  // If someone hits the apex (no www), 308 redirect to www
  if (req.nextUrl.hostname === "marketing-ark.com") {
    const url = req.nextUrl.clone();
    url.hostname = CANONICAL_HOST;
    return NextResponse.redirect(url, 308);
  }
  return NextResponse.next();
}

// apply to all routes
export const config = { matcher: "/:path*" };
