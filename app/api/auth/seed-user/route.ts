// app/api/auth/seed-user/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export const runtime = "nodejs";

const WHITELIST = new Set([
  "noahcasel@marketing-ark.com",
  "hudsoncrist@marketing-ark.com",
  "alexanderkormeluk@marketing-ark.com",
]);

export async function POST(req: Request) {
  try {
    const { email } = (await req.json()) as { email?: string };
    const norm = (email || "").trim().toLowerCase();
    if (!norm) return NextResponse.json({ error: "Missing email" }, { status: 400 });

    // Allow if: in whitelist OR staff OR reps(active)
    let allowed = WHITELIST.has(norm);

    if (!allowed) {
      const { data: staff } = await supabaseAdmin
        .from("staff")
        .select("email")
        .ilike("email", norm)
        .maybeSingle();
      allowed = !!staff;
    }

    if (!allowed) {
      const { data: rep } = await supabaseAdmin
        .from("reps")
        .select("email, status")
        .ilike("email", norm)
        .maybeSingle();
      if (rep && (rep as any).status !== "inactive") allowed = true;
    }

    if (!allowed) {
      return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    }

    // Ensure the user exists in Supabase Auth. If already exists, ignore the error.
    // (auth.admin.createUser will throw "User already registered" if present.)
    // Casting to any to avoid TS friction depending on your client typing.
    const admin = (supabaseAdmin as any).auth.admin;
    const { error } = await admin.createUser({
      email: norm,
      email_confirm: true, // mark as confirmed so OTP can proceed even with signups disabled
    });

    if (error && !/already registered/i.test(error.message)) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
