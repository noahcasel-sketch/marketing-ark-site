// app/api/reps/approve/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";
import { supabaseServer } from "../../../../lib/supabaseServer";

export const runtime = "nodejs";

/* ---------------------------- small helpers ---------------------------- */

function titleFromEmail(email?: string | null) {
  if (!email) return "Manager";
  const local = (email || "").split("@")[0] || "manager";
  return local.replace(/[._-]+/g, " ").replace(/\b\w/g, (m) => m.toUpperCase()).trim();
}

function splitFullName(v?: string | null) {
  const s = (v || "").trim();
  if (!s) return { first: "", last: "" };
  const parts = s.split(/\s+/);
  if (parts.length === 1) return { first: parts[0], last: "" };
  return { first: parts[0], last: parts.slice(1).join(" ") };
}

// Probe whether a column exists by doing a no-op select
async function columnExists(table: string, col: string): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin.from(table).select(col).limit(0);
    return !error;
  } catch {
    return false;
  }
}

// Figure out which email column your reps table uses
async function pickEmailColumn(table: string): Promise<string | null> {
  const candidates = ["email", "rep_email", "user_email", "contact_email"];
  for (const c of candidates) if (await columnExists(table, c)) return c;
  return null;
}

type PendingRow = Record<string, any>;
type FallbackCtx = {
  pending: PendingRow;
  approverEmail: string;
  regionCode: string | null;
};

function guessFallback(col: string, ctx: FallbackCtx): any {
  const p = ctx.pending;
  const email =
    (p.email ?? p.rep_email ?? p.user_email ?? p.contact_email ?? "").toString().toLowerCase();

  const byName = (keys: string[]) => {
    for (const k of keys) {
      const v = p[k];
      if (v !== undefined && v !== null && v !== "") return v;
    }
    return undefined;
  };

  const lower = col.toLowerCase();

  // email-ish
  if (lower.includes("email")) {
    return email ? email : "unknown@marketing-ark.com";
  }

  // names
  if (lower.includes("first_name")) {
    const v = byName(["legal_first_name", "first_name", "fname", "given_name"]);
    if (v !== undefined) return v;
    const split = splitFullName(byName(["full_name", "name"]) as string | undefined);
    return split.first ? split.first : "Unknown";
  }

  if (lower.includes("last_name")) {
    const v = byName(["legal_last_name", "last_name", "lname", "surname"]);
    if (v !== undefined) return v;
    const split = splitFullName(byName(["full_name", "name"]) as string | undefined);
    return split.last ? split.last : "Unknown";
  }

  if (lower === "name") {
    const n = byName(["name", "full_name"]);
    const base = n !== undefined ? n : email;
    return base ? base : "Unknown";
  }

  if (lower === "manager_name") {
    const m = byName(["manager_name"]);
    return m !== undefined ? m : titleFromEmail(ctx.approverEmail);
  }

  // region
  if (lower === "region_code" || lower === "region") {
    return ctx.regionCode ? ctx.regionCode : "ARK";
  }

  // status-like
  if (lower === "status") return "active";

  // timestamps / dates
  if (lower.endsWith("_at") || lower.includes("timestamp")) return new Date().toISOString();
  if (lower.includes("date")) return new Date().toISOString().slice(0, 10);

  // boolean-ish
  if (lower.startsWith("is_") || lower.includes("enabled") || lower.includes("active_flag")) return false;

  // numeric-ish
  if (lower.includes("count") || lower.includes("qty") || lower.includes("number")) return 0;

  // phones/addresses
  if (lower.includes("phone")) {
    const v = byName(["phone", "mobile", "phone_number"]);
    return v !== undefined ? v : "0000000000";
  }
  if (lower.includes("zip") || lower.includes("postal")) {
    const v = byName(["zip", "postal_code"]);
    return v !== undefined ? v : "00000";
  }
  if (lower.includes("city")) {
    const v = byName(["city"]);
    return v !== undefined ? v : "N/A";
  }
  if (lower.includes("state")) {
    const v = byName(["state", "province"]);
    return v !== undefined ? v : "N/A";
  }
  if (lower.includes("address")) {
    const v = byName(["address", "street", "street1"]);
    return v !== undefined ? v : "N/A";
  }

  // audit-ish
  if (lower === "approved_by") return ctx.approverEmail;
  if (lower === "approved_at") return new Date().toISOString();

  // default text fallback
  return "N/A";
}

function coerceByTypeHint(current: any, msg: string): any {
  const m = msg.toLowerCase();
  if (m.includes("type boolean")) return false;
  if (m.includes("type integer") || m.includes("type bigint") || m.includes("type numeric") || m.includes("type double"))
    return 0;
  if (m.includes("timestamp") || m.includes("timestamptz")) return new Date().toISOString();
  if (m.includes("type date")) return new Date().toISOString().slice(0, 10);
  return current ?? "N/A";
}

/**
 * Try insert; on NOT NULL errors, add a value for the offending column and retry.
 * On type errors, coerce and retry.
 */
async function robustInsert(table: string, base: Record<string, any>, ctx: FallbackCtx) {
  let payload = { ...base };
  for (let i = 0; i < 20; i++) {
    const { error } = await supabaseAdmin.from(table).insert(payload);
    if (!error) return { ok: true as const, payload };
    const msg = error.message || "";

    // NOT NULL -> "null value in column \"X\" violates not-null constraint"
    let m = /null value in column "([^"]+)" violates not-null constraint/i.exec(msg);
    if (m) {
      const col = m[1];
      if (await columnExists(table, col)) {
        payload[col] = guessFallback(col, ctx);
      }
      continue; // retry
    }

    // Column doesn't exist (if somehow we included one)
    m = /could not find the '([^']+)' column/i.exec(msg);
    if (m) {
      delete (payload as any)[m[1]];
      continue;
    }

    // Type mismatch (e.g., "invalid input syntax for type integer: \"N/A\"")
    m = /invalid input syntax for type ([^:]+):/i.exec(msg);
    if (m) {
      const keys = Object.keys(payload);
      const k = keys[keys.length - 1];
      payload[k] = coerceByTypeHint(payload[k], msg);
      continue;
    }

    // Check constraint (e.g., status)
    if (/violates check constraint/i.test(msg) && "status" in payload) {
      payload["status"] = "active";
      continue;
    }

    return { ok: false as const, error: msg };
  }
  return { ok: false as const, error: "Insert failed after multiple retries." };
}

/* ------------------------------ main route ------------------------------ */

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const pendingId =
      body.id ?? body.pending_id ?? body.pendingId ?? body.pid ?? null;
    if (!pendingId) {
      return NextResponse.json({ error: "Missing pending rep id" }, { status: 400 });
    }

    // who is approving?
    const sb = supabaseServer();
    const { data: { user } } = await sb.auth.getUser();
    if (!user?.email) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const approverEmail = user.email.toLowerCase();

    // staff role / regions
    const { data: staff } = await supabaseAdmin
      .from("staff")
      .select("role, regions")
      .eq("email", approverEmail)
      .maybeSingle();
    const role = (staff?.role as "owner" | "regional") || null;
    const approverRegions: string[] = Array.isArray(staff?.regions) ? staff!.regions : [];
    if (!role) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // pending row
    const { data: pending, error: pErr } = await supabaseAdmin
      .from("pending_reps")
      .select("*")
      .eq("id", pendingId)
      .maybeSingle();
    if (pErr || !pending) {
      return NextResponse.json({ error: pErr?.message || "Pending rep not found" }, { status: 404 });
    }

    // resolve region code (your DB enforces NOT NULL on region_code)
    let regionCode: string | null =
      (body.region ?? body.region_code ?? body.regionCode)?.toString() ??
      (pending.region_code ?? pending.region ?? pending.team ?? null);

    if (!regionCode && role === "regional" && approverRegions.length === 1) {
      regionCode = approverRegions[0];
    }
    if (
      role === "regional" &&
      regionCode &&
      approverRegions.length > 0 &&
      !approverRegions.includes(regionCode)
    ) {
      return NextResponse.json(
        { error: `Region ${regionCode} not allowed for this approver` },
        { status: 403 }
      );
    }

    // find the reps email column
    const emailCol = await pickEmailColumn("reps");
    if (!emailCol) {
      return NextResponse.json(
        { error: "No email-like column found on 'reps' (looked for email/rep_email/user_email/contact_email)." },
        { status: 400 }
      );
    }
    const pendingEmailRaw =
      pending[emailCol] ?? pending.email ?? pending.rep_email ?? pending.user_email ?? pending.contact_email ?? "";
    const pendingEmail = String(pendingEmailRaw || "").toLowerCase();
    if (!pendingEmail) {
      return NextResponse.json(
        { error: "Pending rep has no email value. Add an email field to pending_reps." },
        { status: 400 }
      );
    }

    // Base payload: start tiny and safe
    const base: Record<string, any> = {
      [emailCol]: pendingEmail,
    };

    // include region_code / region only if those columns exist
    if (await columnExists("reps", "region_code")) {
      if (!regionCode) {
        return NextResponse.json(
          { error: "region_code is required by 'reps' and is missing. Provide it in the request or on the pending row." },
          { status: 400 }
        );
      }
      base["region_code"] = regionCode;
    }
    if (await columnExists("reps", "region")) base["region"] = regionCode ?? null;

    // nice-to-haves if columns exist (kept minimal to avoid column-not-found errors)
    if (await columnExists("reps", "status")) base["status"] = "active";
    if (await columnExists("reps", "manager_name")) base["manager_name"] = titleFromEmail(approverEmail);
    if (await columnExists("reps", "approved_by")) base["approved_by"] = approverEmail;
    if (await columnExists("reps", "approved_at")) base["approved_at"] = new Date().toISOString();

    // Try robust insert; on NOT NULL/type errors we’ll auto-fill and retry
    const ctx: FallbackCtx = { pending, approverEmail, regionCode };
    const res = await robustInsert("reps", base, ctx);
    if (!res.ok) {
      return NextResponse.json({ error: res.error }, { status: 400 });
    }

    // delete from pending
    await supabaseAdmin.from("pending_reps").delete().eq("id", pendingId);

    // send invite to set password (best-effort)
    try {
      // @ts-ignore - supabase-js v2 admin API
      await supabaseAdmin.auth.admin.inviteUserByEmail(pendingEmail, {
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
