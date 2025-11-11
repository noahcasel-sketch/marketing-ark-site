// app/api/debug/env/route.ts
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
  const hasKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

  let storageOk = false;
  if (hasUrl && hasKey) {
    try {
      const admin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      // no-op: list buckets to validate credentials
      const { data, error } = await admin.storage.listBuckets();
      if (!error) storageOk = true;
    } catch {}
  }

  return NextResponse.json({ hasUrl, hasKey, storageOk });
}
