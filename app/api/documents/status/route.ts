// app/api/documents/status/route.ts
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function GET() {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookies().get(name)?.value; },
        set() {},
        remove() {},
      },
    }
  );

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) {
    return new Response(JSON.stringify({ contractSigned: false, w9Signed: false, total: 0 }), { status: 200 });
  }

  const userId = userData.user.id;

  const { data: rows, error } = await supabase
    .from("documents")
    .select("doc_type,status,created_at")
    .eq("user_id", userId)
    .eq("status", "signed");

  if (error) {
    return new Response(JSON.stringify({ contractSigned: false, w9Signed: false, total: 0 }), { status: 200 });
  }

  const contractSigned = rows?.some(r => r.doc_type === "contract") ?? false;
  const w9Signed = rows?.some(r => r.doc_type === "w9") ?? false;
  const total = (contractSigned ? 1 : 0) + (w9Signed ? 1 : 0);

  return Response.json({ contractSigned, w9Signed, total });
}
