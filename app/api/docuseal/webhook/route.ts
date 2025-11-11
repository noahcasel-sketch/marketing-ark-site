// app/api/docuseal/webhook/route.ts
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supa = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

export async function POST(req: Request) {
  try {
    const payload = await req.json();

    // Support both DocuSeal shapes
    const eventType =
      payload?.event_type || // ← your payload has this
      payload?.type ||
      payload?.event ||
      null;

    if (eventType !== "form.completed") {
      // Log and ignore other events
      console.log("DocuSeal webhook ignored event:", eventType);
      return NextResponse.json({ ok: true, ignored: eventType ?? "unknown" });
    }

    // Extract data per your sample
    const data = payload?.data ?? {};
    const documents: Array<{ name?: string; url: string }> = data.documents || [];
    const signerEmail: string | null =
      data.email ||
      data.submission?.submitters?.[0]?.email ||
      null;

    if (!documents.length) {
      throw new Error("No documents in webhook payload.");
    }
    if (!signerEmail) {
      throw new Error("Missing signer email in webhook payload.");
    }

    const admin = supa();

    // Resolve the Supabase user_id by email
    // (Use profiles table if you have one; otherwise listUsers is fine for your volume.)
    let userId: string | null = null;
    // Try first page (increase pages if you have many users)
    const { data: list1, error: listErr1 } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    if (listErr1) throw listErr1;
    userId =
      list1?.users?.find(
        (u: any) => u?.email?.toLowerCase() === signerEmail.toLowerCase()
      )?.id || null;

    if (!userId) {
      throw new Error(`No Supabase auth user found for email ${signerEmail}`);
    }

    // Download each signed PDF and save to Storage + DB
    for (const d of documents) {
      const res = await fetch(d.url, { cache: "no-store" });
      if (!res.ok) throw new Error(`Failed to download PDF: ${await res.text()}`);
      const bytes = new Uint8Array(await res.arrayBuffer());

      // Store inside the 'rep-docs' bucket at `${user_id}/...`
      const safeName = (d.name || "signed").replace(/[^\w.\-]+/g, "_");
      const path = `${userId}/${safeName}-${Date.now()}.pdf`;

      const { error: upErr } = await admin.storage
        .from("rep-docs")
        .upload(path, bytes, { contentType: "application/pdf", upsert: true });
      if (upErr) throw upErr;

      const { error: dbErr } = await admin.from("documents").upsert({
        user_id: userId,
        doc_type: safeName.toLowerCase().includes("w9") ? "w9" : "contract",
        storage_path: path, // path INSIDE bucket (no bucket prefix)
        status: "signed",
      });
      if (dbErr) throw dbErr;

      console.log("Saved signed PDF:", { userId, path, name: d.name });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("DocuSeal webhook error:", e?.message, e);
    return NextResponse.json({ error: e?.message || "Webhook error" }, { status: 500 });
  }
}
