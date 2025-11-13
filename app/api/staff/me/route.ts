// app/api/staff/me/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "../../../../lib/supabaseServer";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export const runtime = "nodejs";

export async function GET() {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user?.email) return NextResponse.json({ email: null, role: null, regions: [] });

  const email = user.email.toLowerCase();
  const { data, error } = await supabaseAdmin
    .from("staff")
    .select("role, regions")
    .eq("email", email)
    .maybeSingle();

  if (error || !data) return NextResponse.json({ email, role: null, regions: [] });
  return NextResponse.json({ email, role: data.role, regions: data.regions || [] });
}
