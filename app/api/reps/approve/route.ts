// app/api/reps/approve/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";
import { supabaseServer } from "../../../../lib/supabaseServer";

export const runtime = "nodejs";

type ColInfo = {
  column_name: string;
  data_type: string;
  is_nullable: "YES" | "NO";
  column_default: string | null;
};

// nicety: Title Case from email local-part
function nameFromEmail(email?: string | null) {
  if (!email) return "Manager";
  const local = (email || "").split("@")[0] || "manager";
  return local
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase())
    .trim();
}

function splitNameLike(v?: string | null) {
  const s = (v || "").trim();
  if (!s) return { first: "", last: "" };
  const parts = s.split(/\s+/);
  if (parts.length === 1) return { first: parts[0], last: "" };
  return { first: parts[0], last: parts.slice(1).join(" ") };
}

function typeSafeDefault(ci: ColInfo): any {
  const t = ci.data_type.toLowerCase();
  if (t.includes("timestamp")) return new Date().toISOString();
  if (t === "date") return new Date().toISOString().slice(0, 10);
  if (t.includes("int") || t === "numeric" || t === "double precision" || t === "real" || t === "bigint") return 0;
  if (t === "boolean") return false;
  if (t === "json" || t === "jsonb") return {};
  // text/char/varchar/uuid/unknown -> non-empty string
  return "N/A";
}

// Try to load public.reps columns via information_schema (service role)
async function getRepsColumns(): Promise<ColInfo[]> {
  const { data, error } = await supabaseAdmin
    .from("information_schema.columns")
    .select("column_name,data_type,is_nullable,column_default")
    .eq("table_schema", "public")
    .eq("table_name", "reps");

  if (error || !data) return [];
  return data as unknown as ColInfo[];
}

// prefer first truthy of many keys on a source obj
function firstOf(obj: Record<string, any>, keys: string[]): any {
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null && obj[k] !== "") return obj[k];
  }
  return undefined;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    // Accept several id/region param shapes
    const pendingId = body.id ?? body.pending_id ?? body.pendingId ?? body.pid ?? null;
    if (!pendingId) {
      return NextResponse.json({ error: "Missing pending rep id" }, { status: 400 });
    }

    const sb = supabaseServer();
    const { data: { user } } = await sb.auth.getUser();
    if (!user?.email) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const approverEmail = user.email.toLowerCase();

    // Staff & allowed regions
    const { data: staff } = await supabaseAdmin
      .from("staff")
      .select("role, regions")
      .eq("email", approverEmail)
      .maybeSingle();

    const role = (staff?.role as "owner" | "regional") || null;
    const approverRegions: string[] = Array.isArray(staff?.regions) ? staff!.regions : [];
    if (!role) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // Load the pending row
    const { data: pending, error: pErr } = await supabaseAdmin
      .from("pending_reps")
      .select("*")
      .eq("id", pendingId)
      .maybeSingle();

    if (pErr || !pending) {
      return NextResponse.json({ error: pErr?.message || "Pending rep not found" }, { status: 404 });
    }

    // Resolve region code (we saw NOT NULL earlier)
    let regionCode: string | null =
      (body.region ?? body.region_code ?? body.regionCode)?.toString() ??
      (pending.region_code ?? pending.region ?? pending.team ?? null);

    if (!regionCode && role === "regional" && approverRegions.length === 1) {
      regionCode = approverRegions[0];
    }

    if (role === "regional" && regionCode && approverRegions.length > 0 && !approverRegions.includes(regionCode)) {
      return NextResponse.json({ error: `Region ${regionCode} not allowed for this approver` }, { status: 403 });
    }

    // pull column metadata
    const cols = await getRepsColumns();
    if (!cols.length) {
      return NextResponse.json({
        error: "Could not read public.reps columns (information_schema not accessible)."
      }, { status: 500 });
    }

    // Build initial payload from pending by intersecting column names
    const payload: Record<string, any> = {};
    for (const ci of cols) {
      const c = ci.column_name;

      // direct copy when same key exists on pending
      if (Object.prototype.hasOwnProperty.call(pending, c)) {
        payload[c] = pending[c];
        continue;
      }

      // Map common variants ahead-of-time:
      if (c === "region_code") {
        payload[c] = regionCode ?? payload[c];
        continue;
      }
      if (c === "region") {
        payload[c] = regionCode ?? payload[c];
        continue;
      }
      if (c === "status") {
        payload[c] = payload[c] ?? "active";
        continue;
      }
      if (c === "approved_by") {
        payload[c] = approverEmail;
        continue;
      }
      if (c === "approved_at") {
        payload[c] = new Date().toISOString();
        continue;
      }
      if (c === "manager_name") {
        const mgr = firstOf(pending, ["manager_name"]) ?? nameFromEmail(approverEmail);
        payload[c] = mgr;
        continue;
      }

      // Email-ish columns
      if (c === "email" || c === "rep_email" || c === "user_email" || c === "contact_email") {
        const emailVal = firstOf(pending, ["email","rep_email","user_email","contact_email"]);
        if (emailVal) payload[c] = String(emailVal).toLowerCase();
        continue;
      }

      // Legal names
      if (c === "legal_first_name") {
        const v = firstOf(pending, ["legal_first_name","first_name","given_name","fname","name_first"]);
        if (v !== undefined) payload[c] = v;
        else {
          const split = splitNameLike(firstOf(pending, ["full_name","name"]));
          if (split.first) payload[c] = split.first;
        }
        continue;
      }
      if (c === "legal_last_name") {
        const v = firstOf(pending, ["legal_last_name","last_name","surname","lname","name_last"]);
        if (v !== undefined) payload[c] = v;
        else {
          const split = splitNameLike(firstOf(pending, ["full_name","name"]));
          if (split.last) payload[c] = split.last;
        }
        continue;
      }

      // Phone
      if (c === "phone" || c === "mobile" || c === "phone_number") {
        const v = firstOf(pending, ["phone","mobile","phone_number","cell"]);
        if (v !== undefined) payload[c] = v;
        continue;
      }

      // Address-y (safe copies when present)
      if (c === "address" || c === "street" || c === "street1") {
        const v = firstOf(pending, ["address","street","street1","addr1"]);
        if (v !== undefined) payload[c] = v;
        continue;
      }
      if (c === "address2" || c === "street2") {
        const v = firstOf(pending, ["address2","street2","addr2"]);
        if (v !== undefined) payload[c] = v;
        continue;
      }
      if (c === "city") {
        const v = firstOf(pending, ["city","locality"]);
        if (v !== undefined) payload[c] = v;
        continue;
      }
      if (c === "state" || c === "region_state") {
        const v = firstOf(pending, ["state","region_state","province"]);
        if (v !== undefined) payload[c] = v;
        continue;
      }
      if (c === "zip" || c === "postal_code") {
        const v = firstOf(pending, ["zip","postal_code","postcode"]);
        if (v !== undefined) payload[c] = v;
        continue;
      }

      // Date-of-birth
      if (c === "date_of_birth" || c === "dob") {
        const v = firstOf(pending, ["date_of_birth","dob","birthdate"]);
        if (v !== undefined) payload[c] = v;
        continue;
      }

      // Anything else with same name wasn’t on pending; we’ll fill later if NOT NULL.
    }

    // Enforce region_code presence if that column exists (your DB needs it)
    const hasRegionCode = cols.some((ci) => ci.column_name === "region_code");
    if (hasRegionCode && !payload["region_code"]) {
      if (regionCode) payload["region_code"] = regionCode;
      else {
        return NextResponse.json(
          { error: "region_code is required by reps and is missing." },
          { status: 400 }
        );
      }
    }

    // Fill **every NOT NULL without default** that is still missing with a type-safe fallback.
    for (const ci of cols) {
      const c = ci.column_name;
      const hasDefault = ci.column_default != null && ci.column_default !== "";
      const isMissing = payload[c] === undefined || payload[c] === null;

      if (ci.is_nullable === "NO" && !hasDefault && isMissing) {
        // avoid overwriting region_code/email if we already guarded earlier
        payload[c] = typeSafeDefault(ci);
      }
    }

    // Final sanity for email: ensure one emailish column exists & is non-empty
    const emailCol = ["email","rep_email","user_email","contact_email"].find((k) => k in payload);
    if (!emailCol || !payload[emailCol]) {
      return NextResponse.json(
        { error: "No email value resolved for reps insert. Ensure pending_reps has an email-like field." },
        { status: 400 }
      );
    }
    payload[emailCol] = String(payload[emailCol]).toLowerCase();

    // Insert
    const { error: insErr } = await supabaseAdmin.from("reps").insert(payload);
    if (insErr) {
      return NextResponse.json({ error: insErr.message }, { status: 400 });
    }

    // Delete from pending
    await supabaseAdmin.from("pending_reps").delete().eq("id", pendingId);

    // Invite to set password (best-effort)
    try {
      // @ts-ignore
      await supabaseAdmin.auth.admin.inviteUserByEmail(payload[emailCol], {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.marketing-ark.com"}/reset-password`,
      });
    } catch {
      /* ignore */
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
