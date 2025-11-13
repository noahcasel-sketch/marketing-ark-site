// app/portal/contract/page.tsx
import { supabaseServer } from "../../../lib/supabaseServer";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type AnyRow = Record<string, any>;
const CANDIDATE_TABLES = [
  "documents",
  "w9_submissions",
  "docuseal_submissions",
  "docuseal_documents",
  "docuseal_responses",
  "docuseal_results",
  "agreements",
  "contracts",
  "submissions",
  "files",
  "uploads",
];

function isObj(v: any): v is Record<string, any> {
  return v && typeof v === "object" && !Array.isArray(v);
}
function containsEmailDeep(row: AnyRow, email: string, depth = 0): boolean {
  if (!row || depth > 6) return false;
  const target = email.trim().toLowerCase();
  for (const [, v] of Object.entries(row)) {
    if (typeof v === "string") {
      const val = v.trim().toLowerCase();
      if (val === target || val.includes(target)) return true;
    } else if (Array.isArray(v)) {
      for (const item of v) {
        if (typeof item === "string") {
          const val = item.trim().toLowerCase();
          if (val === target || val.includes(target)) return true;
        } else if (isObj(item) && containsEmailDeep(item, email, depth + 1)) return true;
      }
    } else if (isObj(v) && containsEmailDeep(v, email, depth + 1)) {
      return true;
    }
  }
  return false;
}
function toEpoch(val: any): number | null {
  if (!val) return null;
  if (typeof val === "number") return val > 1e12 ? val : val > 1e9 ? val * 1000 : null;
  if (typeof val === "string") {
    const t = Date.parse(val);
    return Number.isNaN(t) ? null : t;
  }
  return null;
}
function pickDateEpoch(r: AnyRow): number | null {
  const preferred = [
    "created_at","updated_at","submitted_at","uploaded_at","signed_at",
    "timestamp","created","updated","completed_at","finished_at",
  ];
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
    if (isObj(v)) {
      const e = pickDateEpoch(v);
      if (e) return e;
    }
  }
  return null;
}
function firstUrlDeep(r: AnyRow): string | null {
  const urlKeys = [
    "public_url","file_url","url","pdf_url","signed_pdf_url","s3_url",
    "download_url","document_url","link","hosted_url","document_download_url",
  ];
  for (const k of urlKeys) {
    if (typeof r[k] === "string" && r[k].startsWith("http")) return r[k] as string;
  }
  const stack: any[] = [r];
  let guard = 0;
  while (stack.length && guard++ < 5000) {
    const cur = stack.pop();
    if (typeof cur === "string" && cur.startsWith("http")) return cur;
    if (Array.isArray(cur)) stack.push(...cur);
    else if (isObj(cur)) stack.push(...Object.values(cur));
  }
  return null;
}
function pickTitle(r: AnyRow): string {
  const candidates = ["title","document_title","name","file_name","doc_type","type","code","form_name","template_name"];
  for (const c of candidates) {
    if (typeof r[c] === "string" && r[c]) return r[c] as string;
  }
  if (typeof r["document_id"] === "string") return `Document ${r["document_id"]}`;
  if (typeof r["id"] === "string" || typeof r["id"] === "number") return `Document #${r["id"]}`;
  return "Document";
}

export default async function ContractPage({
  searchParams,
}: {
  searchParams: { email?: string };
}) {
  const sb = supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();

  const sessionEmail = user?.email?.toLowerCase() || null;
  const qpEmail = (searchParams.email || "").trim().toLowerCase();
  const targetEmail = qpEmail || sessionEmail || "";

  // collect rows from many likely tables
  const collected: { table: string; rows: AnyRow[] }[] = [];
  for (const table of CANDIDATE_TABLES) {
    try {
      const { data, error } = await supabaseAdmin.from(table).select("*").limit(1000);
      if (!error && data?.length) collected.push({ table, rows: data });
    } catch {
      // ignore missing/forbidden tables
    }
  }

  const items =
    targetEmail
      ? collected
          .flatMap(({ table, rows }) =>
            rows
              .filter((r) => containsEmailDeep(r, targetEmail))
              .map((r) => ({
                source: table,
                kind: table.toLowerCase().includes("w9") ? ("W-9" as const) : ("Document" as const),
                title: pickTitle(r),
                url: firstUrlDeep(r),
                epoch: pickDateEpoch(r),
              })),
          )
          .sort((a, b) => (b.epoch ?? 0) - (a.epoch ?? 0))
      : [];

  const serviceKeyMissing =
    !process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY.trim().length < 20;

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
            style={{
              flex: 1,
              height: 44,
              padding: "0 12px",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.15)",
              background: "rgba(255,255,255,0.03)",
            }}
          />
          <button
            type="submit"
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              fontWeight: 700,
              background: "#60a5fa",
              color: "#0b1220",
            }}
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

      {/* Hints if nothing shows */}
      {targetEmail && items.length === 0 && (
        <div style={{ marginBottom: 16, color: "#f59e0b" }}>
          No agreements found for <strong>{targetEmail}</strong>.
          {serviceKeyMissing && (
            <>
              {" "}
              It looks like your <code>SUPABASE_SERVICE_ROLE_KEY</code> is not set on Vercel,
              so the page can’t read DocuSeal rows. Add it in your Project → Settings → Environment Variables,
              redeploy, and try again.
            </>
          )}
        </div>
      )}

      <section
        style={{
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 14,
          padding: 16,
          background: "rgba(255,255,255,0.03)",
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: 12 }}>Results</h2>

        {!targetEmail && (
          <div style={{ color: "#6b7280" }}>Enter your email above to search.</div>
        )}

        {items.length > 0 && (
          <div style={{ display: "grid", gap: 10 }}>
            {items.map((it, idx) => (
              <div
                key={idx}
                style={{ padding: 12, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10 }}
              >
                <div style={{ fontWeight: 700 }}>
                  {it.kind}: {it.title}
                </div>
                {it.epoch && (
                  <div style={{ fontSize: 13, opacity: 0.7 }}>
                    {new Date(it.epoch).toLocaleString()}
                  </div>
                )}
                <div style={{ fontSize: 12, opacity: 0.7 }}>Source: {it.source}</div>
                {it.url ? (
                  <div style={{ marginTop: 6 }}>
                    <a href={it.url} target="_blank" rel="noreferrer">
                      Open
                    </a>
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
