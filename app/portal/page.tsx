// app/portal/page.tsx
import { supabaseServer } from "../../lib/supabaseServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type AnyRow = Record<string, any>;

export default async function PortalPage() {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user?.email) {
    return (
      <main style={{ maxWidth: 980, margin: "48px auto" }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Rep Portal</h1>
        <p>Please <a href="/login">log in</a> to view this page.</p>
      </main>
    );
  }

  // --- Agreements/Data -------------------------------------------------------
  // documents: store anything your webhook saved for the rep
  const { data: documents, error: docErr } = await supabase
    .from("documents")
    .select("*")
    .ilike("rep_email", user.email)              // adjust if your column is named differently
    .order("created_at", { ascending: false });

  // w9_submissions: show latest W-9 PDFs if present
  const { data: w9s, error: w9Err } = await supabase
    .from("w9_submissions")
    .select("*")
    .ilike("email", user.email)
    .order("created_at", { ascending: false });

  // small helper to guess a link field
  function pickUrl(r: AnyRow) {
    return r.public_url || r.file_url || r.url || r.pdf_url || null;
  }
  function pickTitle(r: AnyRow) {
    return r.title || r.name || r.code || "Document";
  }

  return (
    <main style={{ maxWidth: 980, margin: "48px auto" }}>
      <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>Rep Portal</h1>
      <p style={{ marginBottom: 20 }}>Welcome, <strong>{user.email}</strong>.</p>

      <section style={{ border: "1px solid #1f2937", borderRadius: 14, padding: 16, marginBottom: 20, background: "#0b1220" }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Today</h2>
        <ul style={{ lineHeight: 1.8 }}>
          <li>Territory: TBD</li>
          <li>Installs scheduled: 0</li>
          <li>My orders this week: 0</li>
        </ul>
      </section>

      <section style={{ border: "1px solid #1f2937", borderRadius: 14, padding: 16, background: "#0b1220" }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Agreements</h2>

        {docErr && <p style={{ color: "#ef4444" }}>Error loading documents: {docErr.message}</p>}
        {w9Err && <p style={{ color: "#ef4444" }}>Error loading W-9 submissions: {w9Err.message}</p>}

        <div style={{ display: "grid", gap: 10 }}>
          {(documents ?? []).map((r: AnyRow) => {
            const href = pickUrl(r)
            return (
              <div key={`doc-${r.id ?? Math.random()}`} style={{ padding: 10, border: "1px solid #1f2937", borderRadius: 10 }}>
                <div style={{ fontWeight: 700 }}>{pickTitle(r)}</div>
                <div style={{ fontSize: 13, color: "#94a3b8" }}>{r.created_at ? new Date(r.created_at).toLocaleString() : ""}</div>
                {href ? <div style={{ marginTop: 6 }}><a href={href} target="_blank" rel="noreferrer">Open</a></div> : <div style={{ marginTop: 6, color: "#94a3b8" }}>No link available</div>}
              </div>
            )
          })}

          {(w9s ?? []).map((r: AnyRow) => {
            const href = pickUrl(r)
            return (
              <div key={`w9-${r.id ?? Math.random()}`} style={{ padding: 10, border: "1px solid #1f2937", borderRadius: 10 }}>
                <div style={{ fontWeight: 700 }}>{pickTitle(r) || "W-9"}</div>
                <div style={{ fontSize: 13, color: "#94a3b8" }}>{r.created_at ? new Date(r.created_at).toLocaleString() : ""}</div>
                {href ? <div style={{ marginTop: 6 }}><a href={href} target="_blank" rel="noreferrer">Open</a></div> : <div style={{ marginTop: 6, color: "#94a3b8" }}>No link available</div>}
              </div>
            )
          })}

          {(documents?.length ?? 0) + (w9s?.length ?? 0) === 0 && (
            <div style={{ color: "#6b7280" }}>No agreements yet.</div>
          )}
        </div>
      </section>
    </main>
  );
}
