// app/api/debug/env/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || null;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  // Try to extract the project ref from the URL:
  // https://<project-ref>.supabase.co
  let projectRef: string | null = null;
  if (supabaseUrl) {
    const m = supabaseUrl.match(/https:\/\/([a-z0-9-]+)\.supabase\.co/i);
    projectRef = m?.[1] ?? null;
  }

  return NextResponse.json({
    supabase_url_prefix: supabaseUrl ? supabaseUrl.slice(0, 36) : null,
    supabase_project_ref_guess: projectRef,
    anon_key_present: Boolean(anon),
    service_role_present: Boolean(service),
    site_url: process.env.NEXT_PUBLIC_SITE_URL || null,
    vercel_env: process.env.VERCEL_ENV || null,
  });
}
