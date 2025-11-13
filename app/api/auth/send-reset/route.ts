// app/api/auth/send-reset/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { email } = (await req.json()) as { email?: string };
    const norm = (email || "").trim().toLowerCase();
    if (!norm) return NextResponse.json({ error: "Missing email" }, { status: 400 });

    // Only send if recognized (approved) - simple check against reps or staff
    const { data: staff } = await supabaseAdmin.from("staff").select("email").ilike("email", norm).maybeSingle();
    const { data: rep } = await supabaseAdmin.from("reps").select("email, status").ilike("email", norm).maybeSingle();

    if (!staff && !(rep && (rep as any).status !== "inactive")) {
      return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    }

    const redirectTo = `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/reset-password`;
    const { error } = (supabaseAdmin as any).auth.resetPasswordForEmail(norm, { redirectTo });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
