// app/api/documents/list/route.ts
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  // Auth user from cookies
  const server = createServerClient(
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

  const { data: userData } = await server.auth.getUser();
  if (!userData?.user) return Response.json([], { status: 200 });

  const userId = userData.user.id;

  // Use service role for signed URLs
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: rows, error } = await admin
    .from("documents")
    .select("doc_type, storage_path, created_at")
    .eq("user_id", userId)
    .eq("status", "signed")
    .order("created_at", { ascending: false });

  if (error || !rows) return Response.json([], { status: 200 });

  const results: { name: string; url: string; created_at: string }[] = [];

  for (const r of rows) {
    const { data: signed, error: urlErr } = await admin
      .storage
      .from("rep-docs")
      .createSignedUrl(r.storage_path, 3600); // 1 hour

    if (!urlErr && signed?.signedUrl) {
      const name = r.doc_type === "w9" ? "W-9" : "Direct Seller Agreement";
      results.push({ name, url: signed.signedUrl, created_at: r.created_at });
    }
  }

  return Response.json(results);
}
