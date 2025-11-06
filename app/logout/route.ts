// app/logout/route.ts
import { NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

async function signOutAndRedirect(req: Request) {
  const url = new URL(req.url);
  const res = NextResponse.redirect(new URL("/", url));

  // Bind cookie writes to THIS response so auth cookies are cleared on redirect
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookies().get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          res.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          res.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  await supabase.auth.signOut();
  return res;
}

export async function POST(req: Request) {
  return signOutAndRedirect(req);
}

export async function GET(req: Request) {
  return signOutAndRedirect(req);
}
