// app/api/auth/check-email/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Missing email" }, { status: 400 });
    }
    const norm = email.trim().toLowerCase();

    // 1) Staff are always approved (owner + regionals)
    const { data: staff } = await supabaseAdmin
      .from("staff")
      .select("email")
      .eq("email", norm)
      .maybeSingle();

    if (staff) return NextResponse.json({ status: "approved" });

    // 2) Approved reps?
    const { data: rep } = await supabaseAdmin
      .from("reps")
      .select("email")
      .eq("email", norm)
      .maybeSingle();

    if (rep) return NextResponse.json({ status: "approved" });

    // 3) Pending?
    const { data: pend } = await supabaseAdmin
      .from("pending_reps")
      .select("email")
      .eq("email", norm)
      .maybeSingle();

    if (pend) return NextResponse.json({ status: "pending" });

    // 4) Not found
    return NextResponse.json({ status: "not_found" });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
