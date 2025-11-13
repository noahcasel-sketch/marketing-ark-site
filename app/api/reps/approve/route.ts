// app/api/reps/approve/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";
import { supabaseServer } from "../../../../lib/supabaseServer";

export const runtime = "nodejs";

// Make a readable name from an email if needed
function nameFromEmail(email?: string | null) {
  if (!email) return "Manager";
  const local = (email || "").split("@")[0] || "";
  return (
    local
      .replace(/[._-]+/g, " ")
      .replace(/\b\w/g, (m) => m.toUpperCase())
      .trim() || "Manager"
  );
}

/**
 * Check which columns exist in a table by probing SELECTs.
 * Returns a subset of `values` containing only existing columns.
 */
async function keepExistingColumns(
  table: string,
  values: Record<string, any>
): Promise<Record<string, any>> {
  const result: Record<string, any> = {};
  for (const col of Object.keys(values)) {
    try {
      // If the column doesn't exist, PostgREST will error here.
      const { error } = await supabaseAdmin.from(table).select(col).limit(0);
      if (!error) result[col] = values[col];
    } catch {
      // ignore and skip this column
    }
  }
  return result;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      id?: string | number;
      pending_id?: string | number;
      pendingId?: string | number;
      pid?: string | number;
      region?: string;
      region_code?: string;
      regionCode?: string;
    };

    const pendingId =
      body.id ?? body.pending_id ?? body.pendingId ?? body.pid ?? null;
    if (!pendingId) {
      return NextResponse.json(
        { error: "Missing pending rep id" },
        { status: 400 }
      );
    }

    const sb = supabaseServer();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user?.email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const approverEmail = user.email.toLowerCase();

    // Role + allowed regions
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

    // Load pending row
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
    const inputCode =
      body.region ?? body.region_code ?? body.regionCode ?? null;
    const code =
      inputCode ||
      pending.region ||
      pending.region_code ||
      pending.team ||
      null;

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

    // Try to resolve a manager email from regions (if table/column exists)
    let managerEmail: string | null = null;
    if (code) {
      try {
        const { data: region } = await supabaseAdmin
          .from("regions")
          .select("manager_email, code")
          .eq("code", code)
          .maybeSingle();
        managerEmail =
          (region?.manager_email as string | null) ??
          (role === "regional" ? approverEmail : null);
      } catch {
        managerEmail = role === "regional" ? approverEmail : null;
      }
    } else if (role === "regional") {
      managerEmail = approverEmail;
    }

    // Candidate values to insert (we will prune to only existing columns)
    const repName =
      pending.name ||
      pending.full_name ||
      `${pending.first_name ?? ""} ${pending.last_name ?? ""}`.trim() ||
      pending.email;

    const candidate: Record<string, any> = {
      // common identity
      email: String(pending.email || "").toLowerCase(),
      name: repName, // will be dropped if 'name' column doesn't exist

      // placement
      region: code ?? null,
      status: "active",

      // mgmt/audit (will be kept only if columns exist)
      manager_name:
        pending.manager_name ||
        nameFromEmail(managerEmail || approverEmail),
      approved_by: approverEmail,
      approved_at: new Date().toISOString(),
    };

    // Only keep columns that truly exist in public.reps
    const payload = await keepExistingColumns("reps", candidate);

    // Ensure at least 'email' exists in payload; otherwise we can't insert.
    if (!("email" in payload)) {
      return NextResponse.json(
        {
          error:
            "Your 'reps' table does not have an 'email' column. Please tell me which email column it uses (e.g., rep_email), and I’ll update the code.",
        },
        { status: 400 }
      );
    }

    // Insert
    const { error: insErr } = await supabaseAdmin.from("reps").insert(payload);
    if (insErr) {
      return NextResponse.json({ error: insErr.message }, { status: 400 });
    }

    // Remove from pending
    await supabaseAdmin.from("pending_reps").delete().eq("id", pendingId);

    // Send password-set email (best-effort)
    try {
      // @ts-ignore - admin is available on service client
      await supabaseAdmin.auth.admin.inviteUserByEmail(payload.email, {
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
