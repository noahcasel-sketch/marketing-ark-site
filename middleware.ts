// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Force everything to www so auth cookies are always on the same host
const CANONICAL_HOST = 'www.marketing-ark.com'

export function middleware(req: NextRequest) {
  const { hostname } = req.nextUrl
  if (hostname !== CANONICAL_HOST) {
    const url = req.nextUrl.clone()
    url.hostname = CANONICAL_HOST
    return NextResponse.redirect(url, 308)
  }
  return NextResponse.next()
}

export const config = { matcher: '/:path*' }
