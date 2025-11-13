// app/api/reps/approve/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";
import { supabaseServer } from "../../../../lib/supabaseServer";

export const runtime = "nodejs";

// tiny helper to prettify a name from an email if we don't have one
function nameFromEmail(email?: string | null) {
  if (!email) return "Manager";
  const local = email.split("@")[0] || "";
  return local
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase())
    .trim() || "Manager";
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    // accept several common param names so UI calls don't break
    const pendingId =
      body.id ?? body.pending_id ?? body.pendingId ?? body.pid ?? null;
    const regionCode =
      (body.region ?? body.region_code ?? body.regionCode)?.toString() ?? null;

    if (!pendingId) {
      return NextResponse.json(
        { error: "Missing pending rep id" },
        { status: 400 }
      );
    }

    // who is approving?
    const sb = supabaseServer();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user?.email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const approverEmail = user.email.toLowerCase();

    // check staff role + allowed regions
    const { data: staff } = await supabaseAdmin
      .from("staff")
      .select("role, regions")
      .eq("email", approverEmail)
      .maybeSingle();

    const role = staff?.role as "owner" | "regional" | undefined;
    const approverRegions: string[] = Array.isArray(staff?.regions)
      ? (staff!.regions as string[])
      : [];

    if (!role || (role !== "owner" && role !== "regional")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // fetch pending rep row
    const { data: pending, error: pErr } = await supabaseAdmin
      .from("pending_reps")
      .select("*")
      .eq("id", pendingId)
      .maybeSingle();

    if (pErr || !pending) {
      return NextResponse.json(
        { error: pErr?.message || "Pending rep not found" },
        { status: 404 }
      );
    }

    // region to use (UI may send it; otherwise take from pending)
    const code =
      regionCode ||
      pending.region ||
      pending.region_code ||
      pending.team ||
      null;

    // region info -> manager email
    let managerEmail: string | null = null;
    if (code) {
      const { data: region } = await supabaseAdmin
        .from("regions")
        .select("manager_email, code")
        .eq("code", code)
        .maybeSingle();
      managerEmail =
        (region?.manager_email as string | null) ??
        (role === "regional" ? approverEmail : null);
    } else if (role === "regional") {
      // if no region on the row, use the approver as manager
      managerEmail = approverEmail;
    }

    // regional users can only approve their own regions (if a code exists)
    if (
      role === "regional" &&
      code &&
      approverRegions.length > 0 &&
      !approverRegions.includes(code)
    ) {
      return NextResponse.json(
        { error: "Region not allowed for this approver" },
        { status: 403 }
      );
    }

    const repName =
      pending.name ||
      pending.full_name ||
      `${pending.first_name ?? ""} ${pending.last_name ?? ""}`.trim() ||
      pending.email;

    const insertRow = {
      name: repName,
      email: (pending.email as string).toLowerCase(),
      phone: pending.phone ?? null,
      address: pending.address ?? null,
      city: pending.city ?? null,
      state: pending.state ?? null,
      zip: pending.zip ?? null,
      region: code ?? null,
      status: "active" as const,

      // ✅ Provide non-null values so NOT NULL constraints are satisfied
      manager_email: managerEmail ?? approverEmail,
      manager_name:
        pending.manager_name ||
        (managerEmail ? nameFromEmail(managerEmail) : nameFromEmail(approverEmail)),

      approved_by: approverEmail,
      approved_at: new Date().toISOString(),
    };

    // insert into reps
    const { error: insErr } = await supabaseAdmin.from("reps").insert(insertRow);
    if (insErr) {
      return NextResponse.json({ error: insErr.message }, { status: 400 });
    }

    // remove from pending
    await supabaseAdmin.from("pending_reps").delete().eq("id", pendingId);

    // (nice-to-have) send reset/invite so they can set password
    try {
      // supabase-js v2
      // @ts-ignore - admin is available on service client
      await supabaseAdmin.auth.admin.inviteUserByEmail(insertRow.email, {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.marketing-ark.com"}/reset-password`,
      });
    } catch {
      // ignore if disabled
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}
