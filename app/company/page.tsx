// app/company/page.tsx
import ApproveButton from "../region/ApproveButton";
import { supabaseServer } from "../../lib/supabaseServer";
import { supabaseAdmin } from "../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const OWNER_EMAIL = "noahcasel@marketing-ark.com";

type RegionCode = "ARK" | "AKM" | "HC";
type RepRow = {
  id: string;
  created_at: string;
  region_code: RegionCode;
  legal_first_name: string;
  legal_last_name: string;
  email: string;
  phone: string | null;
  address: string | null;
  id_photo_path: string | null;
};

const REGION_NAMES: Record<RegionCode, string> = {
  ARK: "ARK",
  AKM: "AK Marketing",
  HC: "HC",
};

export default async function CompanyAdminPage() {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return (
      <main style={{ maxWidth: 980, margin: "48px auto" }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Company — Pending Approvals</h1>
        <p>Please <a href="/login">log in</a> to view this page.</p>
      </main>
    );
  }

  if (user.email.toLowerCase() !== OWNER_EMAIL) {
    return (
      <main style={{ maxWidth: 980, margin: "48px auto" }}>
        <p>Not authorized.</p>
      </main>
    );
  }

  // load all pending
  const { data: pending, error } = await supabaseAdmin
    .from("pending_reps")
    .select(
      "id, created_at, region_code, legal_first_name, legal_last_name, email, phone, address, id_photo_path"
    )
    .order("submitted_at", { ascending: false });

  if (error) {
    return (
      <main style={{ maxWidth: 980, margin: "48px auto" }}>
        <p>Error loading pending reps: {error.message}</p>
      </main>
    );
  }

  // sign ID URLs
  const enriched: (RepRow & { id_url: string | null })[] = [];
  for (const r of (pending || []) as RepRow[]) {
    let id_url: string | null = null;
    if (r.id_photo_path) {
      const { data } = await supabaseAdmin
        .storage
        .from("id-photos")
        .createSignedUrl(r.id_photo_path, 60 * 5);
      id_url = data?.signedUrl ?? null;
    }
    enriched.push({ ...r, id_url });
  }

  return (
    <main style={{ maxWidth: 980, margin: "48px auto" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 16 }}>Company — Pending Approvals</h1>

      {(enriched || []).length === 0 ? (
        <p>No pending reps.</p>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {enriched.map((r) => (
            <div
              key={r.id}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                padding: 12,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div>
                <div style={{ fontWeight: 600 }}>
                  {r.legal_first_name} {r.legal_last_name} ({REGION_NAMES[r.region_code]})
                </div>
                <div style={{ fontSize: 14 }}>{r.email}{r.phone ? ` · ${r.phone}` : ""}</div>
                {r.address && <div style={{ fontSize: 14 }}>{r.address}</div>}
                {r.id_url && (
                  <div style={{ marginTop: 6 }}>
                    <a href={r.id_url} target="_blank" rel="noreferrer">View ID</a>
                  </div>
                )}
              </div>
              <ApproveButton id={r.id} />
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
