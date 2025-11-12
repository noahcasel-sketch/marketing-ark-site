import { supabaseServer } from '../../lib/supabaseServer'
import { supabaseAdmin } from '../../lib/supabaseAdmin'

export const dynamic = 'force-dynamic'
export const revalidate = 0

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

  // RLS limits rows to this region automatically
  const { data: reps } = await supabase.from('reps').select('*')

  const withSigned = await Promise.all(
    (reps || []).map(async (r: any) => {
      let url: string | null = null
      if (r.id_photo_path) {
        const { data } = await supabaseAdmin
          .storage
          .from('id-photos')
          .createSignedUrl(r.id_photo_path, 60 * 5)
        url = data?.signedUrl || null
      }
      return { ...r, id_url: url }
    })
  )

  return (
    <div className="container" style={{ paddingTop: 48 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 16 }}>
        Region: {region.name} ({region.code})
      </h1>

      {withSigned.length === 0 ? (
        <p>No reps yet.</p>
      ) : (
        <div className="grid">
          {withSigned.map((rep: any) => (
            <div key={rep.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ fontWeight: 600 }}>
                  {rep.legal_first_name} {rep.legal_last_name}
                </div>
                <div style={{ opacity: 0.7, fontSize: 12 }}>
                  {new Date(rep.created_at).toLocaleString()}
                </div>
              </div>
              <div className="row"><b>Email:</b> {rep.email}</div>
              <div className="row"><b>Phone:</b> {rep.phone}</div>
              <div className="row"><b>Address:</b> {rep.address}</
