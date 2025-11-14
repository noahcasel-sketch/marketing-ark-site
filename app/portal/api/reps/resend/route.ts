import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  const url = new URL(req.url);
  const email = url.searchParams.get('email');

  if (!email) return NextResponse.json({ error: 'Missing email' }, { status: 400 });

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: 'https://www.marketing-ark.com/auth/reset'
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.redirect(new URL(req.headers.get('referer') ?? '/portal', req.url));
}
