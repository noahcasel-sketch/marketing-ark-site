// middleware.ts
import { createMiddlewareClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const { data: { session } } = await supabase.auth.getSession();
  const url = req.nextUrl;

  // Skip static
  if (url.pathname.startsWith('/_next') || url.pathname.startsWith('/favicon.ico')) {
    return res;
  }

  if (url.pathname.startsWith('/portal')) {
    if (!session) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    // Check if user is staff (owner/regional)
    const { data: staff } = await supabase
      .from('staff')
      .select('role')
      .eq('email', session.user.email)
      .single();

    if (staff && ['owner', 'regional'].includes(staff.role)) {
      return res; // allowed
    }

    // Check if user is approved rep
    const { data: rep } = await supabase
      .from('reps')
      .select('status')
      .eq('id', session.user.id)
      .eq('status', 'active')
      .single();

    if (rep) {
      return res; // allowed
    }

    // Not authorized
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL('/login?error=unauthorized', req.url));
  }

  return res;
}

export const config = {
  matcher: ['/portal/:path*'],
};
