// app/portal/contract/page.tsx
import { supabaseServer } from "../../../lib/supabaseServer";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type AnyRow = Record<string, any>;

function isObject(v: any) {
  return v && typeof v === "object" && !Array.isArray(v);
}

function rowHasEmail(row: AnyRow, email: string, depth = 0): boolean {
  if (!row || depth > 5) return false;
  const target = email.trim().toLowerCase();

  for (const [, v] of Object.entries(row)) {
    if (typeof v === "string") {
      if (v.trim().toLowerCase() === target) return true;
    }
    if (Array.isArray(v)) {
      for (const item of v) {
        if (typeof item === "string" && item.trim().toLowerCase() === target) return true;
        if (isObject(item) && rowHasEmail(item, email, depth + 1)) return true;
      }
    }
    if (isObject(v) && rowHasEmail(v, email, depth + 1)) return true;
  }
  return false;
}

function toEpoch(val: any): number | null {
  if (!val) return null;
  if (typeof val === "string") {
    const t = Date.parse(val);
    if (!Number.isNaN(t)) return t;
  }
  if (typeof val === "number") {
    if (val > 1e12) return val;       // ms
    if (val > 1e9) return val * 1000; // s
  }
  return null;
}

function pickDateEpoch(r: AnyRow): number | null {
  const preferred = ["created_at","updated_at","submitted_at","uploaded_at","signed_at","timestamp","created","updated"];
  for (const k of preferred) {
    const e = toEpoch(r[k]);
    if (e) return e;
  }
  for (const [k, v] of Object.entries(r)) {
    if (k.toLowerCase().endsWith("_at")) {
      const e = toEpoch(v);
      if (e) return e;
    }
  }
  for (const v of Object.values(r)) {
    if (isObject(v)) {
      const e = pickDateEpoch(v);
      if (e) return e;
    }
  }
  return null;
}

function pickUrl(r: AnyRow) {
  const candidates = ["public_url","file_url","url","pdf_url","signed_pdf_url","s3_url","download_url","document_url","link"];
  for (const c of candidates) {
    if (typeof r[c] === "string" && r[c]) return r[c] as string;
  }
  return null;
}

function pickTitle(r: AnyRow) {
  const candidates = ["title","document_title","name","file_name","doc_type","type","code"];
  for (const c of candidates) {
    if (typeof r[c] === "string" && r[c]) return r[c] as string;
  }
  return "Document";
}

export default async function ContractPage({
  searchParams,
}: {
  searchParams: { email?: string }
}) {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  const sessionEmail = user?.email?.toLowerCase() || null;
  const qpEmail = (searchParams.email || "").trim().toLowerCase();
  const targetEmail = qpEmail || sessionEmail || "";

  // Load with service role, then filter by the chosen email
  let docs: AnyRow[] = [];
  let w9s: AnyRow[] = [];
  let docErrMsg: string | null = null;
  let w9ErrMsg: string | null = null;

  try {
    const { data, error } = await supabaseAdmin.from("documents").select("*").limit(1000);
    if (error) docErrMsg = error.message;
    docs = data ?? [];
  } catch (e: any) {
    docErrMsg = e?.message || "Failed to load documents";
  }

  try {
    const { data, error } = await supabaseAdmin.from("w9_submissions").select("*").limit(1000);
    if (error) w9ErrMsg = error.message;
    w9s = data ?? [];
  } catch (e: any) {
    w9ErrMsg = e?.message || "Failed to load W-9 submissions";
  }

  const myDocs = targetEmail ? docs.filter((r) => rowHasEmail(r, targetEmail)) : [];
  const myW9s  = targetEmail ? w9s.filter((r) => rowHasEmail(r, targetEmail))  : [];

  const items = [
    ...myDocs.map((r) => ({ kind: "Document" as const, title: pickTitle(r), url: pickUrl(r), epoch: pickDateEpoch(r) })),
    ...myW9s.map((r) => ({ kind: "W-9" as const,      title: pickTitle(r), url: pickUrl(r), epoch: pickDateEpoch(r) })),
  ].sort((a, b) => (b.epoch ?? 0) - (a.epoch ?? 0));

  return (
    <main style={{ maxWidth: 980, margin: "48px auto", padding: "0 16px" }}>
      <h1 style={{ marginTop: 0 }}>Your Agreements</h1>
      <p style={{ marginTop: 4, opacity: 0.9 }}>
        Enter the email you used during onboarding to view your Direct Seller Agreement and W-9.
      </p>

      {/* Email form (GET) */}
      <form method="GET" style={{ display: "grid", gap: 12, marginTop: 16, marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 10 }}>
          <input
            name="email"
            type="email"
            defaultValue={targetEmail}
            placeholder="your email"
            required
            style={{ flex: 1, height: 44, padding: "0 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.03)" }}
          />
          <button
            type="submit"
            style={{ padding: "10px 14px", borderRadius: 10, fontWeight: 700, background: "#60a5fa", color: "#0b1220" }}
          >
            View agreements
          </button>
        </div>

        {sessionEmail && sessionEmail !== targetEmail && (
          <div>
            <a
              href={`/portal/contract?email=${encodeURIComponent(sessionEmail)}`}
              style={{ fontSize: 13, color: "#93c5fd", fontWeight: 700 }}
            >
              Use my account email ({sessionEmail})
            </a>
          </div>
        )}
      </form>

      {docErrMsg && <p style={{ color: "#ef4444" }}>Documents error: {docErrMsg}</p>}
      {w9ErrMsg && <p style={{ color: "#ef4444" }}>W-9 error: {w9ErrMsg}</p>}

      <section
        style={{
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 14,
          padding: 16,
          background: "rgba(255,255,255,0.03)",
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: 12 }}>Results</h2>

        {!targetEmail && <div style={{ color: "#6b7280" }}>Enter your email above to search.</div>}

        {targetEmail && items.length === 0 && (
          <div style={{ color: "#6b7280" }}>No agreements found for <strong>{targetEmail}</strong>.</div>
        )}

        {items.length > 0 && (
          <div style={{ display: "grid", gap: 10 }}>
            {items.map((it, idx) => (
              <div key={idx} style={{ padding: 12, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10 }}>
                <div style={{ fontWeight: 700 }}>{it.kind}: {it.title}</div>
                {it.epoch && (
                  <div style={{ fontSize: 13, opacity: 0.7 }}>
                    {new Date(it.epoch).toLocaleString()}
                  </div>
                )}
                {it.url ? (
                  <div style={{ marginTop: 6 }}>
                    <a href={it.url} target="_blank" rel="noreferrer">Open</a>
                  </div>
                ) : (
                  <div style={{ marginTop: 6, opacity: 0.7 }}>No link available</div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
