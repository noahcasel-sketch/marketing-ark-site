// app/auth/callback/route.ts
export const runtime = 'nodejs';

import { NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code       = url.searchParams.get("code");
  const token      = url.searchParams.get("token")      ?? url.searchParams.get("token_hash");
  const type       = url.searchParams.get("type")       ?? "magiclink";

  // After login, send to /portal
  const res = NextResponse.redirect(new URL("/portal", url));

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

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, url));
    }
    return res;
  }

  // Fallback for magic links that return token (no code)
  if (token) {
    // If your magic-link template includes the user's email as a param, pass it here.
    // Otherwise, Supabase can infer in some cases; if not, we’ll still get a clear error.
    const { error } = await supabase.auth.verifyOtp({
      type: "magiclink",
      token_hash: token,
      // email: '<OPTIONAL: if your template adds &email=>, pass it here>'
    } as any);

    if (error) {
      return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, url));
    }
    return res;
  }

  // Nothing to exchange — go back to login
  return NextResponse.redirect(new URL("/login?error=missing_code_or_token", url));
}
