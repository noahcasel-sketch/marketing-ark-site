import { NextResponse } from "next/server";
import { createClient } from "../../lib/supabaseServer";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(error.message)}`, req.url)
      );
    }
  }

  return NextResponse.redirect(new URL("/portal", req.url));
}
