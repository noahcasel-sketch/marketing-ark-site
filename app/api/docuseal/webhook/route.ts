import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supa = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    // TEMP LOGS (visible in Vercel → Deployments → Logs)
    console.log("DocuSeal webhook received:", JSON.stringify(payload)?.slice(0, 2000));

    if (payload?.type !== "form.completed") {
      return NextResponse.json({ ok: true, ignored: payload?.type ?? "unknown" });
    }

    const docs = payload?.data?.documents || [];
    const submitters = payload?.data?.submission?.submitters || [];
    const signerEmail = submitters?.[0]?.email || null;

    if (!docs.length) throw new Error("No documents in payload");
    if (!signerEmail) throw new Error("Missing signer email");

    // Resolve user id by email (fallback admin list)
    const admin = supa();
    let userId: string | null = null;
    const { data: page1 } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    userId =
      page1?.users?.find((u: any) => u.email?.toLowerCase() === signerEmail.toLowerCase())?.id ||
      null;
    if (!userId) throw new Error(`No user found for email ${signerEmail}`);

    for (const d of docs) {
      const res = await fetch(d.url);
      if (!res.ok) throw new Error(`Download failed: ${await res.text()}`);
      const bytes = new Uint8Array(await res.arrayBuffer());

      const path = `${userId}/contract-${Date.now()}-${d.name || "signed"}.pdf`;
      const { error: upErr } = await admin.storage
        .from("rep-docs")
        .upload(path, bytes, { contentType: "application/pdf", upsert: true });
      if (upErr) throw upErr;

      const { error: dbErr } = await admin.from("documents").upsert({
        user_id: userId,
        doc_type: "contract",
        storage_path: path,
        status: "signed",
      });
      if (dbErr) throw dbErr;

      console.log("Saved signed PDF at:", path);
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("Webhook error:", e?.message);
    return NextResponse.json({ error: e?.message || "Webhook error" }, { status: 500 });
  }
}
