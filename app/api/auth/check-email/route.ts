// app/api/auth/check-email/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export const runtime = "nodejs";

// Safety net so owners/regionals can always get in even if DB/envs are misaligned.
const WHITELIST = new Set([
  "noahcasel@marketing-ark.com",
  "hudsoncrist@marketing-ark.com",
  "alexanderkormeluk@marketing-ark.com",
]);

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Missing email" }, { status: 400 });
    }
    const norm = email.trim().toLowerCase();

    // ---- Whitelist (owner + regionals) ----
    if (WHITELIST.has(norm)) {
      console.log("[check-email] WHITELIST hit:", norm);
      return NextResponse.json({ status: "approved" });
    }

    // ---- Staff (DB) ----
    const { data: staff, error: staffErr } = await supabaseAdmin
      .from("staff")
      .select("email")
      .ilike("email", norm) // case-insensitive
      .maybeSingle();

    if (staffErr) console.error("[check-email] staffErr:", staffErr.message);
    if (staff) {
      console.log("[check-email] Found staff:", norm);
      return NextResponse.json({ status: "approved" });
    }

    // ---- Reps (DB) ----
    const { data: rep, error: repErr } = await supabaseAdmin
      .from("reps")
      .select("email, status")
      .ilike("email", norm)
      .maybeSingle();

    if (repErr) console.error("[check-email] repErr:", repErr.message);
    if (rep) {
      console.log("[check-email] Found rep:", norm, "status:", rep.status);
      if ((rep as any).status === "inactive") {
        return NextResponse.json({ status: "inactive" });
      }
      return NextResponse.json({ status: "approved" });
    }

    // ---- Pending (DB) ----
    const { data: pend, error: pendErr } = await supabaseAdmin
      .from("pending_reps")
      .select("email")
      .ilike("email", norm)
      .maybeSingle();

    if (pendErr) console.error("[check-email] pendErr:", pendErr.message);
    if (pend) {
      console.log("[check-email] Found pending:", norm);
      return NextResponse.json({ status: "pending" });
    }

    // ---- Not found ----
    console.log("[check-email] Not found:", norm);
    return NextResponse.json({ status: "not_found" });
  } catch (e: any) {
    console.error("[check-email] exception:", e?.message);
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
