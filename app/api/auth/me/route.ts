// app/api/auth/me/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "../../../../lib/supabaseServer";

export const runtime = "nodejs";

export async function GET() {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  return NextResponse.json({ email: user?.email ?? null });
}
