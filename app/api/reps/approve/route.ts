// app/api/reps/approve/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";
import { supabaseServer } from "../../../../lib/supabaseServer";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { pendingId } = await req.json();
    if (!pendingId) {
      return NextResponse.json({ error: "Missing pendingId" }, { status: 400 });
    }

    // Who is calling?
    const supabase = supabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const caller = user.email.toLowerCase();

    // Is caller staff?
    const { data: staff, error: staffErr } = await supabaseAdmin
      .from("staff")
      .select("role, regions")
      .eq("email", caller)
      .maybeSingle();

    if (staffErr) {
      return NextResponse.json({ error: staffErr.message }, { status: 500 });
    }
    if (!staff) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    // Load pending rep
    const { data: pending, error: pErr } = await supabaseAdmin
      .from("pending_reps")
      .select(
        "id, region_code, legal_first_name, legal_last_name, email, phone, address, id_photo_path"
      )
      .eq("id", pendingId)
      .maybeSingle();

    if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });
    if (!pending) return NextResponse.json({ error: "Pending rep not found" }, { status: 404 });

    // Region authorization
    const allowed =
      staff.role === "owner" ||
      (Array.isArray(staff.regions) && staff.regions.includes(pending.region_code));
    if (!allowed) return NextResponse.json({ error: "Not authorized for this region" }, { status: 403 });

    // Insert into reps (status defaults to active)
    const payload = {
      region_code: pending.region_code,
      legal_first_name: pending.legal_first_name,
      legal_last_name: pending.legal_last_name,
      email: pending.email,
      phone: pending.phone,
      address: pending.address,
      id_photo_path: pending.id_photo_path,
      approved_at: new Date().toISOString(),
      approved_by: caller,
    };

    let { data: ins, error: insErr } = await supabaseAdmin
      .from("reps")
      .insert(payload)
      .select("id, email")
      .maybeSingle();

    if (insErr && /approved_at|approved_by/i.test(insErr.message)) {
      // Retry without stamps if table doesn't have those columns
      const retry = await supabaseAdmin
        .from("reps")
        .insert({
          region_code: pending.region_code,
          legal_first_name: pending.legal_first_name,
          legal_last_name: pending.legal_last_name,
          email: pending.email,
          phone: pending.phone,
          address: pending.address,
          id_photo_path: pending.id_photo_path,
        })
        .select("id, email")
        .maybeSingle();
      ins = retry.data as typeof ins;
      insErr = retry.error as typeof insErr;
    }
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

    // Remove from pending
    const { error: delErr } = await supabaseAdmin
      .from("pending_reps")
      .delete()
      .eq("id", pendingId);
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

    // --- Send password-setup email ---
    // Preferred landing after clicking email link:
    const redirectTo =
      `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/reset-password`;

    const admin = (supabaseAdmin as any).auth.admin;

    // If they don't yet exist in Auth, invite (sends email to set password).
    // If already exists, send a password reset email (also lets them set password).
    try {
      // Try a lightweight existence check (not all SDKs have this; safe to try)
      let exists = false;
      try {
        const { data } = await admin.getUserByEmail(pending.email);
        exists = !!data?.user;
      } catch {
        exists = false;
      }

      if (!exists) {
        // Try to send an invite (email includes password setup)
        const { error: inviteErr } = await admin.inviteUserByEmail(pending.email, { redirectTo });
        if (inviteErr) {
          // If they're already registered, fall back to reset email
          const msg = String(inviteErr.message || "").toLowerCase();
          const already = /already\s*registered|already\s*been\s*registered/.test(msg);
          if (!already) throw inviteErr;

          const { error: resetErr } = await (supabaseAdmin as any).auth.resetPasswordForEmail(
            pending.email,
            { redirectTo }
          );
          if (resetErr) throw resetErr;
        }
      } else {
        // Existing Auth user → send reset email for password setup
        const { error: resetErr } = await (supabaseAdmin as any).auth.resetPasswordForEmail(
          pending.email,
          { redirectTo }
        );
        if (resetErr) throw resetErr;
      }
    } catch (e: any) {
      // Non-fatal: approval succeeded; return a hint so you can resend if needed.
      console.error("[approve] password email error:", e?.message);
      return NextResponse.json({
        ok: true,
        id: ins?.id,
        emailNotice: "Approved, but failed to send password email. Try again from Supabase or contact support.",
      });
    }

    return NextResponse.json({ ok: true, id: ins?.id });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
