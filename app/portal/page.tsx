// app/portal/page.tsx
import { supabaseServer } from "../../lib/supabaseServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type AnyRow = Record<string, any>;

function isObject(v: any) {
  return v && typeof v === "object" && !Array.isArray(v);
}

function looksLikeEmailKey(k: string) {
  const low = k.toLowerCase();
  // very permissive: anything containing "email"
  return low.includes("email");
}

function rowHasEmail(row: AnyRow, email: string, depth = 0): boolean {
  if (!row || depth > 4) return false;
  const target = email.trim().toLowerCase();

  for (const [k, v] of Object.entries(row)) {
    // direct string fields (match if key suggests email OR exact string equals email)
    if (typeof v === "string") {
      if (looksLikeEmailKey(k) && v.trim().toLowerCase() === target) return true;
      if (v.trim().toLowerCase() === target) return true;
    }
    // arrays: scan them
    if (Array.isArray(v)) {
      for (const item of v) {
        if (typeof item === "string" && item.trim().toLowerCase() === target) return true;
        if (isObject(item) && rowHasEmail(item, target, depth + 1)) return true;
      }
    }
    // nested objects / JSON
    if (isObject(v) && rowHasEmail(v, target, depth + 1)) return true;
  }
  return false;
}

function pickUrl(r: AnyRow) {
  const candidates = [
    "public_url",
    "file_url",
    "url",
    "pdf_url",
    "signed_pdf_url",
    "s3_url",
    "download_url",
    "document_url",
    "link",
  ];
  for (const c of candidates) {
    if (typeof r[c] === "string" && r[c]) return r[c] as string;
  }
  return null;
}

function pickTitle(r: AnyRow) {
  const candidates = ["title", "document_title", "name", "file_name", "doc_type", "type", "code"];
  for (const c of candidates) {
    if (typeof r[c] === "string" && r[c]) return r[c] as string;
  }
  return "Document";
}

function toEpoch(val: any): number | null {
  if (!val) return null;

  // ISO/date string?
  if (typeof val === "string") {
    const t = Date.parse(val);
    if (!Number.isNaN(t)) return t;
  }
  // numeric epoch: seconds or millis
  if (typeof val === "number") {
    if (val > 1e12) return val;        // ms
    if (val > 1e9) return val * 1000;  // s
  }
  return null;
}

function pickDateEpoch(r: AnyRow): number | null {
  // Try common names first
  const primary = [
    "created_at",
    "updated_at",
    "submitted_at",
    "uploaded_at",
    "signed_at",
    "timestamp",
    "created",
    "updated",
  ];
  for (const p of primary) {
    const e = toEpoch(r[p]);
    if (e) return e;
  }
  // Fallback: any *_at field
  for (const [k, v] of Object.entries(r)) {
    if (k.toLowerCase().endsWith("_at")) {
      const e = toEpoch(v);
      if (e) return e;
    }
  }
  // Last resort: recurse shallowly for nested timestamps
  for (const v of Object.values(r)) {
    if (isObject(v)) {
      const e = pickDateEpoch(v);
      if (e) return e;
    }
  }
  return null;
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

  // Fetch without ORDER BY (some tables don't have created_at)
  const [docsRes, w9Res] = await Promise.all([
    supabase.from("documents").select("*").limit(500),
    supabase.from("w9_submissions").select("*").limit(500),
  ]);

  const docErr = docsRes.error;
  const w9Err = w9Res.error;
  const docs = docsRes.data ?? [];
  const w9s = w9Res.data ?? [];

  // Keep only rows that clearly belong to this user (any email-like field equals auth email)
  const myDocs = docs.filter((r) => rowHasEmail(r, user.email!));
  const myW9s = w9s.filter((r) => rowHasEmail(r, user.email!));

  // Merge + sort newest first by any date-like field we can find
  const items = [
    ...myDocs.map((r) => ({ kind: "Document", r })),
    ...myW9s.map((r) => ({ kind: "W-9", r })),
  ].sort((a, b) => {
    const ea = pickDateEpoch(a.r) ?? 0;
    const eb = pickDateEpoch(b.r) ?? 0;
    return eb - ea;
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
            const epoch = pickDateEpoch(r);
            const when = epoch ? new Date(epoch).toLocaleString() : "";

            return (
              <div
                key={`${kind}-${r.id ?? idx}`}
                style={{ padding: 10, border: "1px solid #1f2937", borderRadius: 10 }}
              >
                <div style={{ fontWeight: 700 }}>
                  {kind}: {title}
                </div>
                <div style={{ fontSize: 13, color: "#94a3b8" }}>{when}</div>
                {href ? (
                  <div style={{ marginTop: 6 }}>
                    <a href={href} target="_blank" rel="noreferrer">
                      Open
                    </a>
                  </div>
                ) : (
                  <div style={{ marginTop: 6, color: "#94a3b8" }}>No link available</div>
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
