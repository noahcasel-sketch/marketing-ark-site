// app/auth/signout/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const POST = async () => {
  const supabase = createRouteHandlerClient({ cookies });
  
  // This signs out the user
  await supabase.auth.signOut();

  // Redirect to login (or home)
  return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'));
};
