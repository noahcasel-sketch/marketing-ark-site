// app/api/docuseal/webhook/route.ts
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function reqd(name: string) {
  const v = process.env[name];
  if (!v || !v.length) throw new Error(`Missing env: ${name}`);
  return v;
}

const supabaseUrl = () => reqd("NEXT_PUBLIC_SUPABASE_URL");
const serviceKey  = () => reqd("SUPABASE_SERVICE_ROLE_KEY");

function sanitizeName(s: string) {
  return (s || "signed").replace(/[^\w.\-]+/g, "_");
}

export async function POST(req: Request) {
  try {
    // Ensure envs exist (fail fast with a clear error in logs)
    const url = supabaseUrl();
    const key = serviceKey();

    const admin = createClient(url, key);

    const payload = await req.json();

    const eventType = payload?.event_type || payload?.type || payload?.event || null;
    if (eventType !== "form.completed") {
      console.log("DocuSeal webhook ignored event:", eventType);
      return NextResponse.json({ ok: true, ignored: eventType ?? "unknown" });
    }

    const data = payload?.data ?? {};
    const documents: Array<{ name?: string; url: string }> = data.documents || [];
    const signerEmail: string | null =
      data.email || data.submission?.submitters?.[0]?.email || null;

    if (!documents.length) throw new Error("No documents in payload.");
    if (!signerEmail) throw new Error("Missing signer email in payload.");

    console.log("DocuSeal incoming:", {
      email: signerEmail,
      docs: documents.map((d) => d?.name || "signed"),
    });

    // Try to resolve the Supabase user by email (OK if not found)
    let userId: string | null = null;
    const { data: page1, error: listErr } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    if (listErr) throw listErr;
    userId =
      page1?.users?.find(
        (u: any) => u?.email?.toLowerCase() === signerEmail.toLowerCase()
      )?.id || null;

    // Where to store if no user found (so you never lose files)
    const unmatchedFolder = `_unmatched/${signerEmail.toLowerCase()}`;

    for (const d of documents) {
      // download the signed PDF from DocuSeal
      const res = await fetch(d.url, { cache: "no-store" });
      if (!res.ok) throw new Error(`Failed to download PDF: ${await res.text()}`);
      const bytes = new Uint8Array(await res.arrayBuffer());

      const safeName = sanitizeName(d.name || "signed");
      const filename = `${safeName}-${Date.now()}.pdf`;
      const storagePath = userId ? `${userId}/${filename}` : `${unmatchedFolder}/${filename}`;

      // upload to Storage
      const { error: upErr } = await admin.storage
        .from("rep-docs")
        .upload(storagePath, bytes, {
          contentType: "application/pdf",
          upsert: true,
        });
      if (upErr) throw upErr;

      // add DB row only if we matched a user (your schema requires NOT NULL user_id)
      if (userId) {
        const docType = safeName.toLowerCase().includes("w9") ? "w9" : "contract";
        const { error: dbErr } = await admin.from("documents").upsert({
          user_id: userId,
          doc_type: docType,
          storage_path: storagePath,
          status: "signed",
        });
        if (dbErr) throw dbErr;
      } else {
        console.warn("No Supabase user matched; stored under _unmatched:", {
          email: signerEmail,
          storagePath,
        });
      }

      console.log("Saved signed PDF:", { email: signerEmail, userId, storagePath });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("DocuSeal webhook error:", e?.message);
    return NextResponse.json({ error: e?.message || "Webhook error" }, { status: 500 });
  }
}
