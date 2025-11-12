// app/region/page.tsx
import ApproveButton from "./ApproveButton";
import { supabaseServer } from "../../lib/supabaseServer";
import { supabaseAdmin } from "../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

export default async function RegionApprovalsPage() {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return (
      <main style={{ maxWidth: 980, margin: "48px auto" }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Region Approvals</h1>
        <p>Please <a href="/login">log in</a> to view this page.</p>
      </main>
    );
  }

  // Who is the caller?
  const caller = user.email.toLowerCase();
  const { data: staff, error: staffErr } = await supabaseAdmin
    .from("staff")
    .select("role, regions")
    .eq("email", caller)
    .maybeSingle();

  if (staffErr) {
    return (
      <main style={{ maxWidth: 980, margin: "48px auto" }}>
        <p>Error loading permissions: {staffErr.message}</p>
      </main>
    );
  }
  if (!staff) {
    return (
      <main style={{ maxWidth: 980, margin: "48px auto" }}>
        <p>Not authorized.</p>
      </main>
    );
  }

  const canSee = (code: RegionCode) =>
    staff.role === "owner" || (Array.isArray(staff.regions) && staff.regions.includes(code));

  const visibleRegions = (["ARK", "AKM", "HC"] as RegionCode[]).filter(canSee);

  // Helper to sign URLs for ID images
  async function withSigned(rows: RepRow[] | null) {
    const out: (RepRow & { id_url: string | null })[] = [];
    for (const r of rows || []) {
      let id_url: string | null = null;
      if (r.id_photo_path) {
        const { data } = await supabaseAdmin
          .storage
          .from("id-photos")
          .createSignedUrl(r.id_photo_path, 60 * 5);
        id_url = data?.signedUrl ?? null;
      }
      out.push({ ...r, id_url });
    }
    return out;
  }

  type Section = {
    code: RegionCode;
    name: string;
    pending: (RepRow & { id_url: string | null })[];
    approved: (RepRow & { id_url: string | null })[];
  };

  const sections: Section[] = [];
  for (const code of visibleRegions) {
    // Pending
    const { data: pending_ } = await supabaseAdmin
      .from("pending_reps")
      .select(
        "id, created_at, region_code, legal_first_name, legal_last_name, email, phone, address, id_photo_path"
      )
      .eq("region_code", code)
      .order("submitted_at", { ascending: false });

    // Approved
    const { data: approved_ } = await supabaseAdmin
      .from("reps")
      .select(
        "id, created_at, region_code, legal_first_name, legal_last_name, email, phone, address, id_photo_path"
      )
      .eq("region_code", code)
      .order("created_at", { ascending: false });

    sections.push({
      code,
      name: REGION_NAMES[code],
      pending: await withSigned((pending_ as RepRow[]) || []),
      approved: await withSigned((approved_ as RepRow[]) || []),
    });
  }

  return (
    <main style={{ maxWidth: 980, margin: "48px auto" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 16 }}>Region Approvals</h1>

      {sections.length === 0 ? (
        <p>No regions available for your account.</p>
      ) : (
        sections.map((sec) => (
          <section key={sec.code} style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
              {sec.name} ({sec.code})
            </h2>

            {/* Pending */}
            <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, marginBottom: 16 }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>Pending approvals</div>
              {sec.pending.length === 0 ? (
                <div style={{ color: "#6b7280" }}>None</div>
              ) : (
                <div style={{ display: "grid", gap: 12 }}>
                  {sec.pending.map((r) => (
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
                          {r.legal_first_name} {r.legal_last_name}
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
            </div>

            {/* Approved */}
            <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16 }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>Approved reps</div>
              {sec.approved.length === 0 ? (
                <div style={{ color: "#6b7280" }}>None</div>
              ) : (
                <div style={{ display: "grid", gap: 12 }}>
                  {sec.approved.map((r) => (
                    <div
                      key={r.id}
                      style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 }}
                    >
                      <div style={{ fontWeight: 600 }}>
                        {r.legal_first_name} {r.legal_last_name}
                      </div>
                      <div style={{ fontSize: 14 }}>{r.email}{r.phone ? ` · ${r.phone}` : ""}</div>
                      {r.address && <div style={{ fontSize: 14 }}>{r.address}</div>}
                      {r.id_url && (
                        <div style={{ marginTop: 6 }}>
                          <a href={r.id_url} target="_blank" rel="noreferrer">View ID</a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        ))
      )}
    </main>
  );
}
