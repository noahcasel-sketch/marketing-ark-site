import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token_hash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type');

  if (token_hash && type === 'magiclink') {
    const supabase = createRouteHandlerClient({ cookies });
    
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash,
      type: 'magiclink'
    });

    if (error) {
      console.error('Magic link error:', error);
      return NextResponse.redirect(new URL('/login?error=magic_link_failed', url.origin));
    }

    // Force session refresh
    await supabase.auth.getSession();
  }

  return NextResponse.redirect(new URL('/portal', url.origin));
}
