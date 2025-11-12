import { supabaseServer } from '../../lib/supabaseServer'
import { supabaseAdmin } from '../../lib/supabaseAdmin'

export default async function RegionPage() {
  const supabase = supabaseServer()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user?.email) {
    return <div className="max-w-3xl mx-auto py-12">Please sign in to view your region.</div>
  }

  // Identify region by manager email
  const { data: region } = await supabase
    .from('regions')
    .select('*')
    .eq('manager_email', user.email)
    .single()

  if (!region) {
    return <div className="max-w-3xl mx-auto py-12">No region is associated with <b>{user.email}</b>.</div>
  }

  // RLS will auto-filter to this region for the manager
  const { data: reps } = await supabase
    .from('reps')
    .select('*')

  // Signed URLs for private ID photos (5 minutes)
  const withSigned = await Promise.all((reps || []).map(async (r: any) => {
    let url: string | null = null
    if (r.id_photo_path) {
      const { data } = await supabaseAdmin.storage.from('id-photos').createSignedUrl(r.id_photo_path, 60 * 5)
      url = data?.signedUrl || null
    }
    return { ...r, id_url: url }
  }))

  return (
    <div className="max-w-5xl mx-auto py-10">
      <h1 className="text-3xl font-semibold mb-6">Region: {region.name} ({region.code})</h1>
      {withSigned.length === 0 ? (
        <p>No reps yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {withSigned.map((rep: any) => (
            <div key={rep.id} className="border rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="font-semibold">{rep.legal_first_name} {rep.legal_last_name}</div>
                <div className="text-sm opacity-70">{new Date(rep.created_at).toLocaleString()}</div>
              </div>
              <div className="text-sm">Email: {rep.email}</div>
              <div className="text-sm">Phone: {rep.phone}</div>
              <div className="text-sm">Address: {rep.address}</div>
              {rep.id_url && (
                <div className="mt-3">
                  <a className="underline" href={rep.id_url} target="_blank">View ID</a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

