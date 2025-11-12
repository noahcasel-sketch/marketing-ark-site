// app/company/page.tsx
import { supabaseServer } from '../../lib/supabaseServer'
import { supabaseAdmin } from '../../lib/supabaseAdmin'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const OWNER_EMAIL = 'noahcasel@marketing-ark.com'

type Rep = {
  id: string
  created_at: string
  region_code: string
  legal_first_name: string
  legal_last_name: string
  email: string
  phone: string
  address: string
  id_photo_path: string | null
}

type Region = {
  code: string
  name: string
}

export default async function CompanyPage() {
  const supabase = supabaseServer()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user?.email) {
    return (
      <div className="container" style={{ paddingTop: 48 }}>
        Please sign in.
      </div>
    )
  }
  if (user.email !== OWNER_EMAIL) {
    return (
      <div className="container" style={{ paddingTop: 48 }}>
        Access denied.
      </div>
    )
  }

  // Fetch all reps (RLS allows owner to see all)
  const { data: reps, error: repsErr } = await supabase
    .from('reps')
    .select('*')
    .order('created_at', { ascending: false })

  if (repsErr) {
    return (
      <div className="container" style={{ paddingTop: 48 }}>
        Error loading reps: {repsErr.message}
      </div>
    )
  }

  // Fetch regions and build a code->name map (owner can read all regions)
  const { data: regions } = await supabase
    .from('regions')
    .select('code,name')

  const regionNameByCode: Record<string, string> = {}
  for (const r of (regions || []) as Region[]) {
    regionNameByCode[r.code] = r.name
  }

  // Create signed URLs for ID photos
  const withSigned: (Rep & { id_url: string | null; region_name: string })[] = []
  for (const r of (reps || []) as Rep[]) {
    let id_url: string | null = null
    if (r.id_photo_path) {
      const { data } = await supabaseAdmin
        .storage
        .from('id-photos')
        .createSignedUrl(r.id_photo_path, 60 * 5)
      id_url = data?.signedUrl ?? null
    }
    withSigned.push({
      ...r,
      id_url,
      region_name: regionNameByCode[r.region_code] || r.region_code,
    })
  }

  return (
    <div className="container" style={{ paddingTop: 48 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 16 }}>
        Company View (All Regions)
      </h1>

      {withSigned.length === 0 ? (
        <p>No reps yet.</p>
      ) : (
        <div className="grid">
          {withSigned.map((rep) => (
            <div key={rep.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ fontWeight: 600 }}>
                  {rep.legal_first_name} {rep.legal_last_name}
                </div>
                <div style={{ opacity: 0.7, fontSize: 12 }}>
                  {new Date(rep.created_at).toLocaleString()}
                </div>
              </div>

              <div style={{ fontSize: 14, marginBottom: 4 }}>
                <b>Region:</b> {rep.region_name} ({rep.region_code})
              </div>
              <div style={{ fontSize: 14, marginBottom: 4 }}>
                <b>Email:</b> {rep.email}
              </div>
              <div style={{ fontSize: 14, marginBottom: 4 }}>
                <b>Phone:</b> {rep.phone}
              </div>
              <div style={{ fontSize: 14, marginBottom: 4 }}>
                <b>Address:</b> {rep.address}
              </div>

              {rep.id_url && (
                <div style={{ marginTop: 8 }}>
                  <a href={rep.id_url} target="_blank" rel="noreferrer">View ID</a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
