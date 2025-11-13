// app/api/auth/seed-user/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export const runtime = "nodejs";

const WHITELIST = new Set([
  "noahcasel@marketing-ark.com",
  "hudsoncrist@marketing-ark.com",
  "alexanderkormeluk@marketing-ark.com",
]);

export async function POST(req: Request) {
  try {
    const { email } = (await req.json()) as { email?: string };
    const norm = (email || "").trim().toLowerCase();
    if (!norm) return NextResponse.json({ error: "Missing email" }, { status: 400 });

    // Gate: allowed if staff, whitelisted admin, or active rep
    let allowed = WHITELIST.has(norm);

    if (!allowed) {
      const { data: staff } = await supabaseAdmin
        .from("staff")
        .select("email")
        .ilike("email", norm)
        .maybeSingle();
      allowed = !!staff;
    }

    if (!allowed) {
      const { data: rep } = await supabaseAdmin
        .from("reps")
        .select("email, status")
        .ilike("email", norm)
        .maybeSingle();
      if (rep && (rep as any).status !== "inactive") allowed = true;
    }

    if (!allowed) {
      return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    }

    // Ensure user exists in Supabase Auth
    const admin = (supabaseAdmin as any).auth.admin;

    // 1) Prefer checking first (avoids noisy create errors)
    try {
      if (admin?.getUserByEmail) {
        const { data, error } = await admin.getUserByEmail(norm);
        if (error) {
          // fall through to createUser path
          // (Some client versions throw for unknown users — we'll create below.)
        } else if (data?.user) {
          // Already exists -> we're done
          return NextResponse.json({ ok: true, existed: true });
        }
      }
    } catch {
      // Safe to ignore — we’ll try createUser next.
    }

    // 2) Create if missing (ignore any "already ... registered" variants)
    const { error } = await admin.createUser({
      email: norm,
      email_confirm: true,
    });

    if (error) {
      // Normalize known duplicate message variants:
      // e.g. "User already registered", "A user with this email address has already been registered"
      const msg = String(error.message || "").toLowerCase();
      const isAlready =
        /already\s*registered/.test(msg) || /already\s*been\s*registered/.test(msg);
      if (!isAlready) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
