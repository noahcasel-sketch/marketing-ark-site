import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';

export async function middleware(req) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  const { data: { session } } = await supabase.auth.getSession();

  // If logged in and on /login → go to portal
  if (session && req.nextUrl.pathname === '/login') {
    return NextResponse.redirect(new URL('/portal', req.url));
  }

  // Protect /portal/* – redirect to /login if no session
  if (req.nextUrl.pathname.startsWith('/portal') && !session) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return res;
}

export const config = {
  matcher: ['/login', '/auth/callback', '/portal/:path*'],
};
