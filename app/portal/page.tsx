// app/portal/page.tsx
import { supabaseServer } from "../../lib/supabaseServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type AnyRow = Record<string, any>;

function looksLikeEmailKey(k: string) {
  // common variants we’ve seen
  const needles = ["email", "rep_email", "user_email", "contact_email", "owner_email", "submitted_email"];
  const low = k.toLowerCase();
  return needles.some((n) => low.includes(n));
}

function rowEmailMatches(row: AnyRow, email: string) {
  const target = email.trim().toLowerCase();
  for (const [k, v] of Object.entries(row)) {
    if (!looksLikeEmailKey(k)) continue;
    if (typeof v === "string" && v.trim().toLowerCase() === target) return true;
  }
  return false;
}

function pickUrl(r: AnyRow) {
  // try common link fields
  const candidates = ["public_url", "file_url", "url", "pdf_url", "signed_pdf_url", "s3_url", "download_url", "document_url"];
  for (const c of candidates) {
    if (r[c] && typeof r[c] === "string") return r[c] as string;
  }
  return null;
}

function pickTitle(r: AnyRow) {
  const candidates = ["title", "document_title", "name", "file_name", "doc_type", "type", "code"];
  for (const c of candidates) {
    if (r[c] && typeof r[c] === "string") return r[c] as string;
  }
  return "Document";
}

function pickDate(r: AnyRow) {
  // prefer created_at, then updated_at, else any *_at
  const primary = ["created_at", "updated_at", "submitted_at", "uploaded_at", "signed_at"];
  for (const p of primary) {
    if (r[p] && typeof r[p] === "string") return r[p] as string;
  }
  const anyAt = Object.keys(r).find((k) => k.endsWith("_at") && typeof r[k] === "string");
  return anyAt ? (r[anyAt] as string) : null;
}

export default async function PortalPage() {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return (
      <main style={{ maxWidth: 980, margin: "48px auto" }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Rep Portal</h1>
        <p>
          Please <a href="/login">log in</a> to view this page.
        </p>
      </main>
    );
  }

  // Fetch without column filters so we don’t error on unknown column names.
  // RLS (if present) will still limit rows appropriately.
  const [{ data: docs, error: docErr }, { data: w9s, error: w9Err }] = await Promise.all([
    supabase.from("documents").select("*").order("created_at", { ascending: false }).limit(200),
    supabase.from("w9_submissions").select("*").order("created_at", { ascending: false }).limit(200),
  ]);

  // Filter in app: keep rows that clearly belong to the signed-in rep.
  const myDocs = (docs ?? []).filter((r) => rowEmailMatches(r, user.email!));
  const myW9s = (w9s ?? []).filter((r) => rowEmailMatches(r, user.email!));

  const items = [
    ...myDocs.map((r) => ({ kind: "Document", r })),
    ...myW9s.map((r) => ({ kind: "W-9", r })),
  ].sort((a, b) => {
    const da = pickDate(a.r);
    const db = pickDate(b.r);
    return (db ? Date.parse(db) : 0) - (da ? Date.parse(da) : 0);
  });

  return (
    <main style={{ maxWidth: 980, margin: "48px auto" }}>
      <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>Rep Portal</h1>
      <p style={{ marginBottom: 20 }}>
        Welcome, <strong>{user.email}</strong>.
      </p>

      <section
        style={{
          border: "1px solid #1f2937",
          borderRadius: 14,
          padding: 16,
          marginBottom: 20,
          background: "#0b1220",
        }}
      >
        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Today</h2>
        <ul style={{ lineHeight: 1.8 }}>
          <li>Territory: TBD</li>
          <li>Installs scheduled: 0</li>
          <li>My orders this week: 0</li>
        </ul>
      </section>

      <section
        style={{
          border: "1px solid #1f2937",
          borderRadius: 14,
          padding: 16,
          background: "#0b1220",
        }}
      >
        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Agreements</h2>

        {docErr && (
          <p style={{ color: "#ef4444" }}>
            Error loading documents: {docErr.message}
          </p>
        )}
        {w9Err && (
          <p style={{ color: "#ef4444" }}>
            Error loading W-9 submissions: {w9Err.message}
          </p>
        )}

        <div style={{ display: "grid", gap: 10 }}>
          {items.map(({ kind, r }, idx) => {
            const href = pickUrl(r);
            const title = pickTitle(r);
            const dt = pickDate(r);
            return (
              <div
                key={`${kind}-${r.id ?? idx}`}
                style={{ padding: 10, border: "1px solid #1f2937", borderRadius: 10 }}
              >
                <div style={{ fontWeight: 700 }}>
                  {kind}: {title}
                </div>
                <div style={{ fontSize: 13, color: "#94a3b8" }}>
                  {dt ? new Date(dt).toLocaleString() : ""}
                </div>
                {href ? (
                  <div style={{ marginTop: 6 }}>
                    <a href={href} target="_blank" rel="noreferrer">
                      Open
                    </a>
                  </div>
                ) : (
                  <div style={{ marginTop: 6, color: "#94a3b8" }}>
                    No link available
                  </div>
                )}
              </div>
            );
          })}

          {items.length === 0 && (
            <div style={{ color: "#6b7280" }}>No agreements yet.</div>
          )}
        </div>
      </section>
    </main>
  );
}
