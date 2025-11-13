// app/api/staff/me/route.ts
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export const runtime = "nodejs";

export async function GET() {
  // session (for current user email)
  const sb = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookies().get(name)?.value },
        set() {},
        remove() {},
      },
    }
  );
  const { data: { user } } = await sb.auth.getUser();
  if (!user?.email) return NextResponse.json({ email: null, role: null, regions: [] });

  // admin (service role) to read staff table
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // must be set in Vercel env
  );

  const { data, error } = await admin
    .from('staff')
    .select('role, regions')
    .eq('email', user.email.toLowerCase())
    .maybeSingle();

  if (error || !data) return NextResponse.json({ email: user.email, role: null, regions: [] });
  return NextResponse.json({ email: user.email, role: data.role, regions: data.regions || [] });
}
