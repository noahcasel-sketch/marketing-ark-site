// app/api/reps/set-status/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";
import { supabaseServer } from "../../../../lib/supabaseServer";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { repId, status } = await req.json() as { repId?: string; status?: "active" | "inactive" };
    if (!repId || !status) return NextResponse.json({ error: "Missing repId or status" }, { status: 400 });

    const supabase = supabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.email) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const caller = user.email.toLowerCase();

    // who is caller?
    const { data: staff } = await supabaseAdmin
      .from("staff")
      .select("role, regions")
      .eq("email", caller)
      .maybeSingle();
    if (!staff) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

    // load rep to check region
    const { data: rep, error: rErr } = await supabaseAdmin
      .from("reps")
      .select("id, region_code")
      .eq("id", repId)
      .maybeSingle();
    if (rErr || !rep) return NextResponse.json({ error: "Rep not found" }, { status: 404 });

    const allowed =
      staff.role === "owner" ||
      (Array.isArray(staff.regions) && staff.regions.includes(rep.region_code));
    if (!allowed) return NextResponse.json({ error: "Not authorized for this region" }, { status: 403 });

    const { error: uErr } = await supabaseAdmin
      .from("reps")
      .update({ status })
      .eq("id", repId);
    if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
