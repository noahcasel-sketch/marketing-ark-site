import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Server-side Supabase client (service role bypasses RLS for backend work)
function supaAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

type DSSubmitter = { email?: string; name?: string };
type DSDocument = { url: string; name?: string };

export async function POST(req: Request) {
  // TODO: verify DocuSeal signature if you enable a webhook secret (recommended)
  const payload = await req.json().catch(() => null);

  try {
    // Expect something like: { type: 'form.completed', data: { submission: { submitters:[{email}] , metadata:{} }, documents:[{url,name}] } }
    if (!payload || payload.type !== "form.completed") {
      return NextResponse.json({ ok: true }); // ignore non-complete events
    }

    const data = payload.data || {};
    const docs: DSDocument[] = data.documents || [];
    const submitters: DSSubmitter[] =
      data.submission?.submitters || data.submitters || [];

    // Try to pull signer email from several possible fields
    const signerEmail =
      submitters?.[0]?.email ||
      data.submission?.email ||
      payload.email ||
      null;

    if (!signerEmail) {
      throw new Error("Missing signer email in webhook payload");
    }
    if (!docs.length) {
      throw new Error("No signed documents present in webhook payload");
    }

    const supa = supaAdmin();

    // ---- Resolve user_id by email ----
    // Preferred: if you have a public 'profiles' (or 'reps') table with (user_id, email), query it:
    // const { data: prof } = await supa.from("profiles").select("user_id").eq("email", signerEmail).maybeSingle();
    // const userId = prof?.user_id;

    // Fallback: use Admin API to find the auth user by email (okay for small userbases)
    let userId: string | null = null;
    let page = 1;
    const PER_PAGE = 200;

    while (!userId && page <= 5) {
      const { data: listed, error: listErr } = await supa.auth.admin.listUsers({
        page,
        perPage: PER_PAGE,
      });
      if (listErr) throw listErr;
      const found = listed?.users?.find(
        (u: any) => u?.email?.toLowerCase() === signerEmail.toLowerCase()
      );
      if (found) userId = found.id;
      page++;
    }

    if (!userId) {
      throw new Error(`No Supabase auth user found for email ${signerEmail}`);
    }

    // ---- Download each signed PDF and store in Supabase Storage ----
    for (const d of docs) {
      const res = await fetch(d.url, { cache: "no-store" });
      if (!res.ok) throw new Error(`Failed to download PDF: ${await res.text()}`);
      const bytes = new Uint8Array(await res.arrayBuffer());

      const path = `rep-docs/${userId}/contract-${Date.now()}-${d.name || "signed"}.pdf`;
      const { error: upErr } = await supa.storage
        .from("rep-docs")
        .upload(path, bytes, { contentType: "application/pdf", upsert: true });
      if (upErr) throw upErr;

      // Upsert a row in your documents table
      const { error: dbErr } = await supa.from("documents").upsert({
        user_id: userId,
        doc_type: "contract",
        storage_path: path,
        status: "signed",
      });
      if (dbErr) throw dbErr;
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Webhook error" }, { status: 500 });
  }
}
