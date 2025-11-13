// app/company/page.tsx
import { supabaseServer } from "../../lib/supabaseServer";
import { supabaseAdmin } from "../../lib/supabaseAdmin";
import RepAdminList, { AdminItem } from "../components/RepAdminList";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const OWNER_EMAIL = "noahcasel@marketing-ark.com";

type RegionCode = "ARK" | "AKM" | "HC";
const ALL_REGIONS: RegionCode[] = ["ARK", "AKM", "HC"];

export default async function CompanyAdminPage() {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user?.email) {
    return (
      <main style={{ maxWidth: 980, margin: "48px auto" }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Company — Team Management</h1>
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

  const items: AdminItem[] = [];

  // Pending across all regions
  const { data: pend, error: pErr } = await supabaseAdmin
    .from("pending_reps")
    .select("id, submitted_at, region_code, legal_first_name, legal_last_name, email, phone, address, id_photo_path")
    .order("submitted_at", { ascending: false });

  if (pErr) {
    return (
      <main style={{ maxWidth: 980, margin: "48px auto" }}>
        <p>Error loading pending reps: {pErr.message}</p>
      </main>
    );
  }

  for (const r of pend || []) {
    let id_url: string | null = null;
    if (r.id_photo_path) {
      const { data } = await supabaseAdmin.storage.from("id-photos").createSignedUrl(r.id_photo_path, 60 * 5);
      id_url = data?.signedUrl ?? null;
    }
    items.push({
      id: r.id,
      status: "awaiting",
      region_code: r.region_code,
      name: `${r.legal_first_name} ${r.legal_last_name}`,
      email: r.email,
      phone: r.phone,
      address: r.address,
      submitted_at: r.submitted_at,
      id_url,
    });
  }

  // Reps across all regions
  const { data: reps } = await supabaseAdmin
    .from("reps")
    .select("id, created_at, status, region_code, legal_first_name, legal_last_name, email, phone, address, id_photo_path")
    .in("region_code", ALL_REGIONS)
    .order("created_at", { ascending: false });

  for (const r of reps || []) {
    let id_url: string | null = null;
    if (r.id_photo_path) {
      const { data } = await supabaseAdmin.storage.from("id-photos").createSignedUrl(r.id_photo_path, 60 * 5);
      id_url = data?.signedUrl ?? null;
    }
    items.push({
      id: r.id,
      status: (r.status as "active" | "inactive") ?? "active",
      region_code: r.region_code,
      name: `${r.legal_first_name} ${r.legal_last_name}`,
      email: r.email,
      phone: r.phone,
      address: r.address,
      created_at: r.created_at,
      id_url,
      is_rep: true,
    });
  }

  // newest first
  items.sort((a, b) => {
    const da = new Date(a.submitted_at || a.created_at || 0).getTime();
    const db = new Date(b.submitted_at || b.created_at || 0).getTime();
    return db - da;
  });

  return (
    <main style={{ maxWidth: 980, margin: "48px auto" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 16 }}>Company — Team Management</h1>
      <RepAdminList items={items} />
    </main>
  );
}
