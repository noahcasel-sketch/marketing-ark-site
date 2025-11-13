// app/api/auth/check-email/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export const runtime = "nodejs";

const WHITELIST = new Set([
  "noahcasel@marketing-ark.com",
  "hudsoncrist@marketing-ark.com",
  "alexanderkormeluk@marketing-ark.com",
]);

async function checkEmailCore(norm: string) {
  // Whitelist (owner/regionals)
  if (WHITELIST.has(norm)) {
    console.log("[check-email] WHITELIST hit:", norm);
    return "approved" as const;
  }

  // Staff (DB)
  const { data: staff, error: staffErr } = await supabaseAdmin
    .from("staff")
    .select("email")
    .ilike("email", norm)
    .maybeSingle();
  if (staffErr) console.error("[check-email] staffErr:", staffErr.message);
  if (staff) {
    console.log("[check-email] Found staff:", norm);
    return "approved" as const;
  }

  // Reps (DB)
  const { data: rep, error: repErr } = await supabaseAdmin
    .from("reps")
    .select("email, status")
    .ilike("email", norm)
    .maybeSingle();
  if (repErr) console.error("[check-email] repErr:", repErr.message);
  if (rep) {
    console.log("[check-email] Found rep:", norm, "status:", (rep as any).status);
    return (rep as any).status === "inactive" ? ("inactive" as const) : ("approved" as const);
  }

  // Pending (DB)
  const { data: pend, error: pendErr } = await supabaseAdmin
    .from("pending_reps")
    .select("email")
    .ilike("email", norm)
    .maybeSingle();
  if (pendErr) console.error("[check-email] pendErr:", pendErr.message);
  if (pend) {
    console.log("[check-email] Found pending:", norm);
    return "pending" as const;
  }

  console.log("[check-email] Not found:", norm);
  return "not_found" as const;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = (body?.email ?? "").toString().trim().toLowerCase();
    if (!email) return NextResponse.json({ error: "Missing email" }, { status: 400 });
    const status = await checkEmailCore(email);
    return NextResponse.json({ status });
  } catch (e: any) {
    console.error("[check-email] exception:", e?.message);
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

// Debug-friendly GET alias: /api/auth/check-email?email=foo@bar.com
export async function GET(req: Request) {
  const url = new URL(req.url);
  const email = (url.searchParams.get("email") ?? "").trim().toLowerCase();
  if (!email) return NextResponse.json({ error: "Missing ?email=" }, { status: 400 });
  const status = await checkEmailCore(email);
  return NextResponse.json({ status });
}
