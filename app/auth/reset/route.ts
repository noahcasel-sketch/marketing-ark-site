import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  const formData = await request.formData();
  const password = formData.get('password') as string;

  if (!password || password.length < 6) {
    return new Response('Password too short', { status: 400 });
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return new Response(error.message, { status: 500 });

  return NextResponse.redirect(new URL('/portal', request.url));
}
