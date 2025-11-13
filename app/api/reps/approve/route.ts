// app/api/reps/approve/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";
import { supabaseServer } from "../../../../lib/supabaseServer";

export const runtime = "nodejs";

// Pretty name from email if needed
function nameFromEmail(email?: string | null) {
  if (!email) return "Manager";
  const local = (email || "").split("@")[0];
  return (local || "Manager")
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase())
    .trim();
}

/** Probe table for a column; returns true if it exists. */
async function columnExists(table: string, col: string): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin.from(table).select(col).limit(0);
    return !error;
  } catch {
    return false;
  }
}

/** Return first email-ish column that exists on table (and its name). */
async function pickEmailColumn(table: string): Promise<string | null> {
  const candidates = ["email", "rep_email", "user_email", "contact_email"];
  for (const c of candidates) {
    if (await columnExists(table, c)) return c;
  }
  return null;
}

/** Keep only keys that exist as columns on table. */
async function keepExistingColumns(
  table: string,
  values: Record<string, any>
): Promise<Record<string, any>> {
  const out: Record<string, any> = {};
  for (const k of Object.keys(values)) {
    if (await columnExists(table, k)) out[k] = values[k];
  }
  return out;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const pendingId =
      body.id ?? body.pending_id ?? body.pendingId ?? body.pid ?? null;
    if (!pendingId) {
      return NextResponse.json({ error: "Missing pending rep id" }, { status: 400 });
    }

    // Who is approving?
    const sb = supabaseServer();
    const { data: { user } } = await sb.auth.getUser();
    if (!user?.email) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const approverEmail = user.email.toLowerCase();

    // Staff role/regions
    const { data: staff } = await supabaseAdmin
      .from("staff")
      .select("role, regions")
      .eq("email", approverEmail)
      .maybeSingle();

    const role = (staff?.role as "owner" | "regional") || null;
    const approverRegions: string[] = Array.isArray(staff?.regions) ? staff!.regions : [];
    if (!role) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // Pending row
    const { data: pending, error: pErr } = await supabaseAdmin
      .from("pending_reps")
      .select("*")
      .eq("id", pendingId)
      .maybeSingle();
    if (pErr || !pending) {
      return NextResponse.json({ error: pErr?.message || "Pending rep not found" }, { status: 404 });
    }

    // Figure out region code (required by your reps.region_code NOT NULL)
    let code: string | null =
      (body.region ?? body.region_code ?? body.regionCode)?.toString() ??
      pending.region_code ??
      pending.region ??
      pending.team ??
      null;

    // If regional approver and no code provided, default to their single region if exactly one
    if (!code && role === "regional" && approverRegions.length === 1) {
      code = approverRegions[0];
    }

    if (
      role === "regional" &&
      code &&
      approverRegions.length > 0 &&
      !approverRegions.includes(code)
    ) {
      return NextResponse.json(
        { error: `Region ${code} not allowed for this approver` },
        { status: 403 }
      );
    }

    // If your reps table has NOT NULL region_code and we still don't have one, stop now with a clear message
    const repsNeedsRegionCode = await columnExists("reps", "region_code");
    if (repsNeedsRegionCode && !code) {
      return NextResponse.json(
        {
          error:
            "This project requires a region_code. Set a region on the pending rep or pass { regionCode: 'ARK' | 'AKM' | 'HC' } in the approve request.",
        },
        { status: 400 }
      );
    }

    // Email value from pending
    const pendingEmail: string =
      (pending.email ?? pending.rep_email ?? pending.user_email ?? "").toString().toLowerCase();
    if (!pendingEmail) {
      return NextResponse.json(
        { error: "Pending rep has no email column/value" },
        { status: 400 }
      );
    }

    // Choose the correct email column on reps
    const emailCol = await pickEmailColumn("reps");
    if (!emailCol) {
      return NextResponse.json(
        {
          error:
            "No email-like column found on 'reps'. Add one (email/rep_email/user_email) or tell me its exact name.",
        },
        { status: 400 }
      );
    }

    // Build candidate values; we’ll prune by existing columns next.
    const repName =
      pending.name ||
      pending.full_name ||
      `${pending.first_name ?? ""} ${pending.last_name ?? ""}`.trim() ||
      pendingEmail;

    const candidates: Record<string, any> = {
      // email column (dynamic)
      [emailCol]: pendingEmail,

      // region columns (support either schema)
      region_code: code ?? null,
      region: code ?? null,

      // common admin fields if they exist
      status: "active",
      name: repName,
      manager_name: pending.manager_name || nameFromEmail(approverEmail),
      approved_by: approverEmail,
      approved_at: new Date().toISOString(),
    };

    // Keep only columns that exist
    let payload = await keepExistingColumns("reps", candidates);

    // Hard-require region_code when that column exists (NOT NULL on your DB)
    if (await columnExists("reps", "region_code")) {
      if (!payload.region_code) payload.region_code = code; // ensure it's present
      if (!payload.region_code) {
        return NextResponse.json(
          { error: "region_code is required by reps and is missing." },
          { status: 400 }
        );
      }
    }

    // Insert
    const { error: insErr } = await supabaseAdmin.from("reps").insert(payload);
    if (insErr) {
      return NextResponse.json({ error: insErr.message }, { status: 400 });
    }

    // Delete from pending
    await supabaseAdmin.from("pending_reps").delete().eq("id", pendingId);

    // Send invite to set password (best-effort)
    try {
      // @ts-ignore
      await supabaseAdmin.auth.admin.inviteUserByEmail(pendingEmail, {
        redirectTo: `${
          process.env.NEXT_PUBLIC_SITE_URL || "https://www.marketing-ark.com"
        }/reset-password`,
      });
    } catch {
      /* ignore */
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
