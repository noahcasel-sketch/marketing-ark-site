// app/api/debug/check/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export const runtime = "nodejs";

/**
 * GET /api/debug/check?email=foo@bar.com
 * Returns where this email exists: staff / reps (with status) / pending_reps
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email")?.trim().toLowerCase();

  if (!email) {
    return NextResponse.json({ error: "Missing ?email=" }, { status: 400 });
  }

  try {
    const out: any = { email };

    // staff
    const { data: staff, error: staffErr } = await supabaseAdmin
      .from("staff")
      .select("email, role, regions")
      .ilike("email", email)
      .maybeSingle();
    if (staffErr) out.staff_error = staffErr.message;
    out.staff = staff || null;

    // reps
    const { data: rep, error: repErr } = await supabaseAdmin
      .from("reps")
      .select("email, status, region_code")
      .ilike("email", email)
      .maybeSingle();
    if (repErr) out.reps_error = repErr.message;
    out.reps = rep || null;

    // pending
    const { data: pend, error: pendErr } = await supabaseAdmin
      .from("pending_reps")
      .select("email, region_code")
      .ilike("email", email)
      .maybeSingle();
    if (pendErr) out.pending_error = pendErr.message;
    out.pending = pend || null;

    return NextResponse.json(out);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

