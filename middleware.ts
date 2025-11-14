import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';

export async function middleware(req) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  const { data: { session } } = await supabase.auth.getSession();

  const pathname = req.nextUrl.pathname;

  if (session && pathname === '/login') {
    return NextResponse.redirect(new URL('/portal', req.url));
  }

  if ((pathname.startsWith('/portal') || pathname.startsWith('/portal/reps')) && !session) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return res;
}

export const config = {
  matcher: ['/login', '/auth/callback', '/portal/:path*'],
};
