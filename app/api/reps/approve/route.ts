// app/api/reps/approve/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import { supabaseServer } from "../../../lib/supabaseServer";

export const runtime = "nodejs";

// Derive a readable name if we only have an email
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

    // Accept common param names so UI variations don't break
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

    // Who is approving?
    const sb = supabaseServer();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user?.email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const approverEmail = user.email.toLowerCase();

    // Check staff role & regions
    const { data: staff } = await supabaseAdmin
      .from("staff")
      .select("role, regions")
      .eq("email", approverEmail)
      .maybeSingle();

    const role = (staff?.role as "owner" | "regional") || null;
    const approverRegions: string[] = Array.isArray(staff?.regions)
      ? (staff!.regions as string[])
      : [];

    if (!role) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Load the pending rep row
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

    // Resolve region code (UI may provide, else use what's on the row)
    const code =
      regionCode ||
      pending.region ||
      pending.region_code ||
      pending.team ||
      null;

    // Region manager / approver
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
      managerEmail = approverEmail;
    }

    // Regional can only approve within assigned regions (when a code exists)
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

    // Compose SAFE minimal insert (only columns that should exist everywhere)
    const repName =
      pending.name ||
      pending.full_name ||
      `${pending.first_name ?? ""} ${pending.last_name ?? ""}`.trim() ||
      pending.email;

    const baseInsert: Record<string, any> = {
      // core identity
      name: repName,
      email: (pending.email as string).toLowerCase(),

      // org placement
      region: code ?? null,
      status: "active",

      // management / audit
      manager_email: managerEmail ?? approverEmail,
      manager_name:
        pending.manager_name ||
        (managerEmail ? nameFromEmail(managerEmail) : nameFromEmail(approverEmail)),
      approved_by: approverEmail,
      approved_at: new Date().toISOString(),
    };

    // 🚫 DO NOT include address/phone/city/zip here — your table doesn't have them.
    // If you later add those columns, we can extend this safely.

    // Insert the new rep
    const { error: insErr } = await supabaseAdmin.from("reps").insert(baseInsert);
    if (insErr) {
      return NextResponse.json({ error: insErr.message }, { status: 400 });
    }

    // Remove from pending
    await supabaseAdmin.from("pending_reps").delete().eq("id", pendingId);

    // Send password-set email (nice-to-have; ignores failure if disabled)
    try {
      // @ts-ignore - admin is available on service client
      await supabaseAdmin.auth.admin.inviteUserByEmail(baseInsert.email, {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.marketing-ark.com"}/reset-password`,
      });
    } catch {
      /* ignore */
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}
