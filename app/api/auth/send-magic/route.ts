// app/api/auth/send-magic/route.ts
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

    // Gate: staff, whitelisted admin, or active rep
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

    const admin = (supabaseAdmin as any).auth.admin;

    // Ensure user exists (avoid “signups disabled”/signup errors)
    let exists = false;
    try {
      const { data, error } = await admin.getUserByEmail(norm);
      if (data?.user) exists = true;
      if (error) exists = false; // fall through to create
    } catch {
      // ignore, we'll create
    }

    if (!exists) {
      const { error } = await admin.createUser({ email: norm, email_confirm: true });
      if (error) {
        const msg = String(error.message || "").toLowerCase();
        const already = /already\s*registered|already\s*been\s*registered/.test(msg);
        if (!already) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }
      }
    }

    const redirectTo =
      `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/auth/callback`;

    // Generate a server-side magic link
    const { data, error } = await admin.generateLink({
      type: "magiclink",
      email: norm,
      options: { redirectTo },
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const actionLink: string | undefined = data?.properties?.action_link;
    if (!actionLink) return NextResponse.json({ error: "No action_link returned" }, { status: 500 });

    return NextResponse.json({ ok: true, action_link: actionLink });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
