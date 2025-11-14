// route.ts  (POST /api/admin/resend-reset)
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // keep server-only

const supabaseAdmin = createClient(url, serviceKey);

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ error: "Missing email" }, { status: 400 });
    }

    const cleaned = String(email).trim().toLowerCase();
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email: cleaned,
      options: {
        // Make sure this callback is in Auth → URL Configuration → Additional Redirect URLs
        redirectTo: "https://www.marketing-ark.com/auth/callback",
      },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true, meta: { email: cleaned, type: data?.properties?.type } });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
