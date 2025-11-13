// app/api/reps/approve/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";
import { supabaseServer } from "../../../../lib/supabaseServer";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

/* ---------------------------- helpers ---------------------------- */

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

async function columnExists(table: string, col: string): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin.from(table).select(col).limit(0);
    return !error;
  } catch {
    return false;
  }
}

async function pickEmailColumn(table: string): Promise<string | null> {
  const candidates = ["email", "rep_email", "user_email", "contact_email"];
  for (const c of candidates) if (await columnExists(table, c)) return c;
  return null;
}

type PendingRow = Record<string, any>;
type FallbackCtx = { pending: PendingRow; approverEmail: string; regionCode: string | null };

function fromPending(p: PendingRow, keys: string[]) {
  for (const k of keys) {
    const v = p?.[k];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return undefined;
}

function guessFallback(col: string, ctx: FallbackCtx): any {
  const p = ctx.pending;
  const email = String(
    fromPending(p, ["email", "rep_email", "user_email", "contact_email"]) || ""
  ).toLowerCase();
  const lower = col.toLowerCase();

  if (lower.includes("email")) return email || "unknown@marketing-ark.com";

  if (lower.includes("first_name")) {
    const direct = fromPending(p, ["legal_first_name", "first_name", "fname", "given_name"]);
    if (direct !== undefined) return direct;
    const split = splitFullName((fromPending(p, ["full_name", "name"]) as string | undefined) || "");
    return split.first || "Unknown";
  }
  if (lower.includes("last_name")) {
    const direct = fromPending(p, ["legal_last_name", "last_name", "lname", "surname"]);
    if (direct !== undefined) return direct;
    const split = splitFullName((fromPending(p, ["full_name", "name"]) as string | undefined) || "");
    return split.last || "Unknown";
  }

  if (lower === "name") {
    const n = fromPending(p, ["name", "full_name"]);
    return (n !== undefined ? n : email) || "Unknown";
  }
  if (lower === "manager_name") {
    const m = fromPending(p, ["manager_name"]);
    return m !== undefined ? m : titleFromEmail(ctx.approverEmail);
  }

  if (lower === "region_code" || lower === "region") return ctx.regionCode || "ARK";
  if (lower === "status") return "active";

  if (lower.endsWith("_at") || lower.includes("timestamp")) return new Date().toISOString();
  if (lower.includes("date")) return new Date().toISOString().slice(0, 10);

  if (lower.startsWith("is_") || lower.includes("enabled") || lower.includes("active_flag")) return false;
  if (lower.includes("count") || lower.includes("qty") || lower.includes("number")) return 0;

  if (lower.includes("phone")) return fromPending(p, ["phone", "mobile", "phone_number"]) || "0000000000";
  if (lower.includes("zip") || lower.includes("postal")) return fromPending(p, ["zip", "postal_code"]) || "00000";
  if (lower.includes("city")) return fromPending(p, ["city"]) || "N/A";
  if (lower.includes("state")) return fromPending(p, ["state", "province"]) || "N/A";
  if (lower.includes("address")) return fromPending(p, ["address", "street", "street1"]) || "N/A";

  if (lower === "approved_by") return ctx.approverEmail;
  if (lower === "approved_at") return new Date().toISOString();

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

/** Insert; on NOT NULL/type errors, add a value and retry. */
async function robustInsert(table: string, base: Record<string, any>, ctx: FallbackCtx) {
  let payload = { ...base };
  for (let i = 0; i < 20; i++) {
    const { error } = await supabaseAdmin.from(table).insert(payload);
    if (!error) return { ok: true as const, payload };
    const msg = error.message || "";

    // NOT NULL – matches both with/without: `of relation "reps"`
    let m = /null value in column "([^"]+)"(?: of relation "[^"]+")? violates not-null constraint/i.exec(msg);
    if (m) {
      const col = m[1];
      if (await columnExists(table, col)) payload[col] = guessFallback(col, ctx);
      continue;
    }

    // Column doesn’t exist
    m = /could not find the '([^']+)' column/i.exec(msg);
    if (m) {
      delete (payload as any)[m[1]];
      continue;
    }

    // Type mismatch
    m = /invalid input syntax for type ([^:]+):/i.exec(msg);
    if (m) {
      const keys = Object.keys(payload);
      const k = keys[keys.length - 1];
      payload[k] = coerceByTypeHint(payload[k], msg);
      continue;
    }

    // Check constraint (e.g., status enum)
    if (/violates check constraint/i.test(msg) && "status" in payload) {
      payload["status"] = "active";
      continue;
    }

    return { ok: false as const, error: msg };
  }
  return { ok: false as const, error: "Insert failed after multiple retries." };
}

/* ------------------------------ main ------------------------------ */

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const pendingId = body.id ?? body.pending_id ?? body.pendingId ?? body.pid ?? null;
    if (!pendingId) return NextResponse.json({ error: "Missing pending rep id" }, { status: 400 });

    // approver
    const sb = supabaseServer();
    const { data: { user } } = await sb.auth.getUser();
    if (!user?.email) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const approverEmail = user.email.toLowerCase();

    // role / regions
    const { data: staff } = await supabaseAdmin.from("staff").select("role, regions").eq("email", approverEmail).maybeSingle();
    const role = (staff?.role as "owner" | "regional") || null;
    const approverRegions: string[] = Array.isArray(staff?.regions) ? staff!.regions : [];
    if (!role) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // pending rep
    const { data: pending, error: pErr } = await supabaseAdmin.from("pending_reps").select("*").eq("id", pendingId).maybeSingle();
    if (pErr || !pending) return NextResponse.json({ error: pErr?.message || "Pending rep not found" }, { status: 404 });

    // region code
    let regionCode: string | null =
      (body.region ?? body.region_code ?? body.regionCode)?.toString() ??
      (pending.region_code ?? pending.region ?? pending.team ?? null);
    if (!regionCode && role === "regional" && approverRegions.length === 1) regionCode = approverRegions[0];
    if (role === "regional" && regionCode && approverRegions.length > 0 && !approverRegions.includes(regionCode)) {
      return NextResponse.json({ error: `Region ${regionCode} not allowed for this approver` }, { status: 403 });
    }

    // email column + value
    const emailCol = await pickEmailColumn("reps");
    if (!emailCol) {
      return NextResponse.json({ error: "No email-like column on 'reps' (email/rep_email/user_email/contact_email)." }, { status: 400 });
    }
    const pendingEmail = String(
      fromPending(pending, [emailCol, "email", "rep_email", "user_email", "contact_email"]) || ""
    ).toLowerCase();
    if (!pendingEmail) return NextResponse.json({ error: "Pending rep has no email value." }, { status: 400 });

    // base payload (only existing columns)
    const payload: Record<string, any> = { [emailCol]: pendingEmail };
    if (await columnExists("reps", "region_code")) {
      if (!regionCode) return NextResponse.json({ error: "region_code is required by 'reps' and is missing." }, { status: 400 });
      payload["region_code"] = regionCode;
    }
    if (await columnExists("reps", "region")) payload["region"] = regionCode ?? null;
    if (await columnExists("reps", "status")) payload["status"] = "active";
    if (await columnExists("reps", "manager_name")) payload["manager_name"] = titleFromEmail(approverEmail);
    if (await columnExists("reps", "approved_by")) payload["approved_by"] = approverEmail;
    if (await columnExists("reps", "approved_at")) payload["approved_at"] = new Date().toISOString();

    // proactively fill common NOT NULL name fields
    if (await columnExists("reps", "legal_first_name")) {
      const v = fromPending(pending, ["legal_first_name", "first_name", "given_name", "fname"])
        ?? splitFullName((fromPending(pending, ["full_name", "name"]) as string | undefined) || "").first
        ?? "Unknown";
      payload["legal_first_name"] = v;
    }
    if (await columnExists("reps", "legal_last_name")) {
      const v = fromPending(pending, ["legal_last_name", "last_name", "surname", "lname"])
        ?? splitFullName((fromPending(pending, ["full_name", "name"]) as string | undefined) || "").last
        ?? "Unknown";
      payload["legal_last_name"] = v;
    }

    // copy same-named fields (e.g., id_photo_url, selfie_url) and map common variants → your reps columns
    const candidateIdCols = [
      ["id_photo_url", "id_photo_url"],
      ["id_photo", "id_photo"],
      ["gov_id_url", "id_photo_url"],
      ["government_id_url", "id_photo_url"],
      ["gov_id_front", "id_photo_url"],
      ["id_front_url", "id_photo_url"],
      ["id_image_url", "id_photo_url"],
      ["selfie_url", "selfie_url"],
      ["selfie_photo_url", "selfie_url"],
    ];
    // same-name direct copies
    for (const k of Object.keys(pending)) {
      if (payload[k] !== undefined) continue;
      if (await columnExists("reps", k)) payload[k] = pending[k];
    }
    // mapped variants
    for (const [src, dest] of candidateIdCols) {
      if (pending[src] !== undefined && (await columnExists("reps", dest)) && payload[dest] === undefined) {
        payload[dest] = pending[src];
      }
    }

    // insert robustly
    const ctx: FallbackCtx = { pending, approverEmail, regionCode };
    const res = await robustInsert("reps", payload, ctx);
    if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });

    // delete from pending
    await supabaseAdmin.from("pending_reps").delete().eq("id", pendingId);

    /* ------------------ ensure user + send / return reset link ------------------ */
    const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://www.marketing-ark.com";

    // 1) Ensure there is an auth user (create if missing, ignore "already exists")
    try {
      // @ts-ignore
      await supabaseAdmin.auth.admin.createUser({
        email: pendingEmail,
        email_confirm: false,
        user_metadata: { role: "rep", region_code: regionCode || null },
      });
    } catch (e: any) {
      // ignore duplicates
    }

    // 2) Try invite; if provider rejects (invalid/blocked), fall back to recovery + return URL
    let emailed = false;
    let recoveryUrl: string | null = null;

    try {
      // @ts-ignore
      await supabaseAdmin.auth.admin.inviteUserByEmail(pendingEmail, {
        redirectTo: `${SITE}/reset-password`,
      });
      emailed = true;
    } catch (e: any) {
      // Invite failed (common when provider flags recipient)
    }

    if (!emailed) {
      try {
        // Anonymous client to trigger recovery email (may still fail if provider blocks)
        const anon = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        await anon.auth.resend({
          type: "recovery",
          email: pendingEmail,
          options: { redirectTo: `${SITE}/reset-password` },
        });
        emailed = true;
      } catch (e: any) {
        // Final fallback: generate link and return it so you can deliver manually
        try {
          // @ts-ignore
          const { data: linkData } = await supabaseAdmin.auth.admin.generateLink({
            type: "recovery",
            email: pendingEmail,
            options: { redirectTo: `${SITE}/reset-password` },
          });
          recoveryUrl = linkData?.action_link || null;
          // Also log for safety
          console.warn(`[approve] Recovery link for ${pendingEmail}: ${recoveryUrl}`);
        } catch (e2) {
          // ignore
        }
      }
    }

    return NextResponse.json({ ok: true, emailed, recoveryUrl });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

