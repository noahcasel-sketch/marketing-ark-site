import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token_hash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type');

  let redirectTo = '/portal';

  if (token_hash && type === 'magiclink') {
    const supabase = createRouteHandlerClient({ cookies });
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: 'email'
    });

    if (error) {
      console.error('Magic link verify error:', error);
      redirectTo = '/login?error=magic_link_failed';
    }
  }

  return NextResponse.redirect(new URL(redirectTo, url.origin));
}
