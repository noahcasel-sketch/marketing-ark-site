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

    // Approved?
    const { data: rep } = await supabaseAdmin
      .from("reps")
      .select("email")
      .ilike("email", norm)
      .maybeSingle();
    if (rep) return NextResponse.json({ status: "approved" });

    // Pending?
    const { data: pend } = await supabaseAdmin
      .from("pending_reps")
      .select("email")
      .ilike("email", norm)
      .maybeSingle();
    if (pend) return NextResponse.json({ status: "pending" });

    return NextResponse.json({ status: "not_found" });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
