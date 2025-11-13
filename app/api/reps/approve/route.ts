// app/api/reps/approve/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";
import { supabaseServer } from "../../../../lib/supabaseServer";

export const runtime = "nodejs";

// Make a readable name from an email if needed
function nameFromEmail(email?: string | null) {
  if (!email) return "Manager";
  const local = email.split("@")[0] || "";
  return (
    local
      .replace(/[._-]+/g, " ")
      .replace(/\b\w/g, (m) => m.toUpperCase())
      .trim() || "Manager"
  );
}

// Try inserting; if PostgREST says a column doesn't exist, drop it and retry.
async function insertWithPrune(table: string, row: Record<string, any>) {
  let payload = { ...row };
  for (let i = 0; i < 6; i++) {
    const { error } = await supabaseAdmin.from(table).insert(payload);
    if (!error) return { ok: true as const };

    const msg = (error.message || "").toLowerCase();

    // Example error: "Could not find the 'manager_email' column of 'reps' in the schema cache"
    const m = /could not find the '([^']+)' column/.exec(error.message || "");
    if (m && payload[m[1]] !== undefined) {
      // Drop the offending column and retry
      delete payload[m[1]];
      continue;
    }

    // NOT NULL violation hint: let the caller handle (we already set manager_name below)
    return { ok: false as const, error: error.message || "Insert failed" };
  }
  return { ok: false as const, error: "Insert failed after retries" };
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    // Accept several common param names
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

    // Approver (session)
    const sb = supabaseServer();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user?.email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const approverEmail = user.email.toLowerCase();

    // Staff role & allowed regions
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

    // Pending rep row
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

    // Region code to use
    const code =
      regionCode ||
      pending.region ||
      pending.region_code ||
      pending.team ||
      null;

    // Regional users can only approve within their regions (when a code exists)
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

    // Build a SAFE minimal insert
    const repName =
      pending.name ||
      pending.full_name ||
      `${pending.first_name ?? ""} ${pending.last_name ?? ""}`.trim() ||
      pending.email;

    // Only include fields that are common and likely to exist.
    // We purposely OMIT manager_email / address / city / zip / phone, etc.
    const insertRow: Record<string, any> = {
      name: repName,
      email: String(pending.email || "").toLowerCase(),
      region: code ?? null,
      status: "active",

      // Provide manager_name (we saw a NOT NULL earlier)
      manager_name:
        pending.manager_name || nameFromEmail(approverEmail),

      approved_by: approverEmail,
      approved_at: new Date().toISOString(),
    };

    // Insert with auto-prune of unknown columns
    const res = await insertWithPrune("reps", insertRow);
    if (!res.ok) {
      return NextResponse.json({ error: res.error }, { status: 400 });
    }

    // Remove from pending
    await supabaseAdmin.from("pending_reps").delete().eq("id", pendingId);

    // Send password-set email (best-effort)
    try {
      // @ts-ignore - admin is available on service client
      await supabaseAdmin.auth.admin.inviteUserByEmail(insertRow.email, {
        redirectTo: `${
          process.env.NEXT_PUBLIC_SITE_URL || "https://www.marketing-ark.com"
        }/reset-password`,
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
