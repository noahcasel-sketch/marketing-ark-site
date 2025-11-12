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

    // Load pending rep (to check region + map fields)
    const { data: pending, error: pErr } = await supabaseAdmin
      .from("pending_reps")
      .select(
        "id, region_code, legal_first_name, legal_last_name, email, phone, address, id_photo_path"
      )
      .eq("id", pendingId)
      .maybeSingle();

    if (pErr) {
      return NextResponse.json({ error: pErr.message }, { status: 500 });
    }
    if (!pending) {
      return NextResponse.json({ error: "Pending rep not found" }, { status: 404 });
    }

    // Region authorization (owner can approve any; regional limited to their regions)
    const allowed =
      staff.role === "owner" ||
      (Array.isArray(staff.regions) && staff.regions.includes(pending.region_code));
    if (!allowed) {
      return NextResponse.json({ error: "Not authorized for this region" }, { status: 403 });
    }

    // Try insert with approval stamps first…
    const payloadWithStamps = {
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
      .insert(payloadWithStamps)
      .select("id")
      .maybeSingle();

    // …If the reps table doesn't have approved_* columns yet, retry without them.
    if (insErr && /approved_at|approved_by/i.test(insErr.message)) {
      const minimalPayload = {
        region_code: pending.region_code,
        legal_first_name: pending.legal_first_name,
        legal_last_name: pending.legal_last_name,
        email: pending.email,
        phone: pending.phone,
        address: pending.address,
        id_photo_path: pending.id_photo_path,
      };
      const retry = await supabaseAdmin
        .from("reps")
        .insert(minimalPayload)
        .select("id")
        .maybeSingle();
      ins = retry.data as typeof ins;
      insErr = retry.error as typeof insErr;
    }

    if (insErr) {
      return NextResponse.json({ error: insErr.message }, { status: 500 });
    }

    // Remove from pending
    const { error: delErr } = await supabaseAdmin
      .from("pending_reps")
      .delete()
      .eq("id", pendingId);

    if (delErr) {
      return NextResponse.json({ error: delErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, id: ins?.id });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
