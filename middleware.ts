// middleware.ts
import { createMiddlewareClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const url = req.nextUrl;

  // Skip static / next internals
  if (url.pathname.startsWith('/_next') || url.pathname.startsWith('/favicon.ico')) {
    return res;
  }

  // Not logged in → go to login
  if (!session && url.pathname.startsWith('/portal')) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Logged in → check role
  if (session && url.pathname.startsWith('/portal')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    const allowed = ['regional', 'owner', 'approved_rep'];
    if (!profile?.role || !allowed.includes(profile.role)) {
      await supabase.auth.signOut();
      return NextResponse.redirect(
        new URL('/login?error=unauthorized', req.url)
      );
    }
  }

  return res;
}

export const config = {
  matcher: ['/portal/:path*'],
};
