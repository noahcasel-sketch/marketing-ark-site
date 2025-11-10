export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  try {
    const { access_token, refresh_token } = await req.json();

    if (!access_token || !refresh_token) {
      return NextResponse.json({ error: 'missing_tokens' }, { status: 400 });
    }

    // Bind cookie writes to this response
    const res = NextResponse.json({ ok: true });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (name: string) => cookies().get(name)?.value,
          set: (name: string, value: string, options: CookieOptions) =>
            res.cookies.set({ name, value, ...options }),
          remove: (name: string, options: CookieOptions) =>
            res.cookies.set({ name, value: '', ...options }),
        },
      }
    );

    // Commit the session to server cookies
    const { error } = await supabase.auth.setSession({ access_token, refresh_token });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    return res; // returns {ok:true} with cookies attached
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'server_error' }, { status: 500 });
  }
}
