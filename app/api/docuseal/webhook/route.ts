export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs"; // ensure Node runtime (NOT Edge)

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supa = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

function sanitizeName(s: string) {
  return (s || "signed").replace(/[^\w.\-]+/g, "_");
}

export async function POST(req: Request) {
  const admin = supa();

  try {
    const payload = await req.json();
    // TEMP: Log a compact preview (check Vercel → Deployments → Functions/Logs)
    console.log(
      "DocuSeal incoming:",
      JSON.stringify({
        event_type: payload?.event_type ?? payload?.type ?? payload?.event,
        email: payload?.data?.email,
        docs: (payload?.data?.documents || []).map((d: any) => d?.name),
      })
    );

    // Handle both shapes: event_type or type
    const eventType =
      payload?.event_type || payload?.type || payload?.event || null;
    if (eventType !== "form.completed") {
      console.log("Ignoring event:", eventType);
      return NextResponse.json({ ok: true, ignored: eventType ?? "unknown" });
    }

    const data = payload?.data ?? {};
    const documents: Array<{ name?: string; url: string }> = data.documents || [];
    const signerEmail: string | null =
      data.email ||
      data.submission?.submitters?.[0]?.email ||
      null;

    if (!documents.length) throw new Error("No documents in payload.");
    if (!signerEmail) throw new Error("Missing signer email in payload.");

    // ---- Try to find Supabase user by email
    let userId: string | null = null;

    // (A) If you have your own reps/profiles table with email → user_id mapping, prefer it:
    // const { data: prof } = await admin.from("profiles").select("user_id").eq("email", signerEmail).maybeSingle();
    // userId = prof?.user_id || null;

    // (B) Fallback to auth admin list (fine for your volume)
    if (!userId) {
      const { data: page1, error: listErr } = await admin.auth.admin.listUsers({
        page: 1,
        perPage: 200,
      });
      if (listErr) throw listErr;
      userId =
        page1?.users?.find(
          (u: any) => u?.email?.toLowerCase() === signerEmail.toLowerCase()
        )?.id || null;
    }

    const unmatchedFolder = `_unmatched/${signerEmail.toLowerCase()}`;

    for (const d of documents) {
      const res = await fetch(d.url, { cache: "no-store" });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`Failed to download PDF: ${t}`);
      }
      const bytes = new Uint8Array(await res.arrayBuffer());
      const safeName = sanitizeName(d.name || "signed");
      const filename = `${safeName}-${Date.now()}.pdf`;

      // If we couldn't find a user, store under an "_unmatched" folder so nothing is lost.
      const storagePath = userId ? `${userId}/${filename}` : `${unmatchedFolder}/${filename}`;

      // Upload to Storage (path is INSIDE the 'rep-docs' bucket)
      const { error: upErr } = await admin.storage
        .from("rep-docs")
        .upload(storagePath, bytes, {
          contentType: "application/pdf",
          upsert: true,
        });
      if (upErr) throw upErr;

      // Insert documents row only if we have a user_id (your schema requires NOT NULL)
      if (userId) {
        const docType = safeName.toLowerCase().includes("w9") ? "w9" : "contract";
        const { error: dbErr } = await admin.from("documents").upsert({
          user_id: userId,
          doc_type: docType,
          storage_path: storagePath, // do NOT include bucket prefix here
          status: "signed",
        });
        if (dbErr) throw dbErr;
      } else {
        console.warn(
          "No Supabase user matched for email; stored under _unmatched:",
          signerEmail,
          storagePath
        );
      }

      console.log("Saved signed PDF:", { email: signerEmail, userId, storagePath });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("DocuSeal webhook error:", e?.message);
    return NextResponse.json({ error: e?.message || "Webhook error" }, { status: 500 });
  }
}
