// app/logout/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "../../lib/supabaseServer";

export const runtime = "nodejs";

async function doSignOut() {
  const supabase = supabaseServer();
  await supabase.auth.signOut();
}

export async function GET() {
  await doSignOut();
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return NextResponse.redirect(new URL("/", base));
}

export async function POST() {
  await doSignOut();
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return NextResponse.redirect(new URL("/", base));
}
