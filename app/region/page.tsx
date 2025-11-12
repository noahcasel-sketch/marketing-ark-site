import { supabaseServer } from '../../lib/supabaseServer'
import { supabaseAdmin } from '../../lib/supabaseAdmin'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type Rep = {
  id: string
  created_at: string
  legal_first_name: string
  legal_last_name: string
  email: string
  phone: string
  address: string
  id_photo_path: string | null
  region_code: string
}

export default async function RegionPage() {
  const supabase = supabaseServer()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user?.email) {
    return (
      <div className="container" style={{ paddingTop: 48 }}>
        Please sign in to view your region.
      </div>
    )
  }

  // Determine the region managed by this email
  const { data: region } = await supabase
    .from('regions')
    .select('*')
    .eq('manager_email', user.email)
    .single()

  if (!region) {
    return (
      <div className="container" style={{ paddingTop: 48 }}>
        No region is associated with <b>{user.email}</b>.
      </div>
    )
  }

  // RLS will restrict to this region automatically
  const { data: reps } = await supabase.from('reps').select('*')

  // Create short-lived signed URLs for private ID images
  const withSigned: (Rep & { id_url: string | null })[] = []
  if (reps && reps.length > 0) {
    for (const r of reps as Rep[]) {
      let id_url: string | null = null
      if (r.id_photo_path) {
        const { data } = await supabaseAdmin
          .storage
          .from('id-photos')
          .createSignedUrl(r.id_photo_path, 60 * 5)
        id_url = data?.signedUrl ?? null
      }
      withSigned.push({ ...(r as Rep), id_url })
    }
  }

  return (
    <div className="container" style={{ paddingTop: 48 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 16 }}>
        Region: {region.name} ({region.code})
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
              <div style={{ fontSize: 14, marginBottom: 4 }}><b>Email:</b> {rep.email}</div>
              <div style={{ fontSize: 14, marginBottom: 4 }}><b>Phone:</b> {rep.phone}</div>
              <div style={{ fontSize: 14, marginBottom: 4 }}><b>Address:</b> {rep.address}</div>
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
