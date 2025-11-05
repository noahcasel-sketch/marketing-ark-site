import { NextResponse } from "next/server";
import { createClient } from "../../../lib/supabaseServer"; // path is correct from /app/auth/callback

export async function GET(request: Request) {
  // Supabase magic link / invite / OTP returns ?code=...
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (code) {
    // This will exchange the code for a session and set the auth cookies
    const supabase = createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  // Send them to the portal once the cookie is set
  return NextResponse.redirect(new URL("/portal", request.url));
}
