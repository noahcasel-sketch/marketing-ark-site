// app/auth/callback/route.ts
export const runtime = 'nodejs';

import { NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(req: Request) {
  const url = new URL(req.url);

  // What params are we actually getting back from Supabase?
  const code       = url.searchParams.get("code");
  const token      = url.searchParams.get("token");
  const token_hash = url.searchParams.get("token_hash");
  const type       = url.searchParams.get("type");

  // Build a redirect to /whoami that shows the inbound params
  const debug = new URL("/whoami", url);
  if (code)       debug.searchParams.set("seen_code", code.slice(0, 8));
  if (token)      debug.searchParams.set("seen_token", token.slice(0, 8));
  if (token_hash) debug.searchParams.set("seen_token_hash", token_hash.slice(0, 8));
  if (type)       debug.searchParams.set("seen_type", type);

  // Bind auth cookies to this response
  const res = NextResponse.redirect(debug);

  // Try both exchange paths:
  // 1) OAuth/email links that provide ?code=...
  if (code) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (name: string) => cookies().get(name)?.value,
          set: (name: string, value: string, options: CookieOptions) =>
            res.cookies.set({ name, value, ...options }),
          remove: (name: string, options: CookieOptions) =>
            res.cookies.set({ name, value: "", ...options }),
        },
      }
    );
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return res;
  }

  // 2) Older/alternate magic-link style that returns token/token_hash
  //    For best coverage, fall back to verifyOtp with type=magiclink.
  //    verifyOtp('magiclink') requires the email in some versions.
  //    If you know the email domain is fixed, you can pass it; otherwise we’ll just skip.
  // NOTE: If this branch fails silently, we'll still hit /whoami and see params.
  // (We won’t block here—goal is to observe first.)

  return res;
}
