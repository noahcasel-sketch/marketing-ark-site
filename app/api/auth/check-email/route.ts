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

    // Is approved?
    const { data: rep, error: rErr } = await supabaseAdmin
      .from("reps")
      .select("email")
      .ilike("email", norm)
      .maybeSingle();

    if (rErr) console.error(rErr);
    if (rep) return NextResponse.json({ status: "approved" });

    // Is pending?
    const { data: pend, error: pErr } = await supabaseAdmin
      .from("pending_reps")
      .select("email")
      .ilike("email", norm)
      .maybeSingle();

    if (pErr) console.error(pErr);
    if (pend) return NextResponse.json({ status: "pending" });

    return NextResponse.json({ status: "not_found" });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
