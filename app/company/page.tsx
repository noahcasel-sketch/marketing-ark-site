import { supabaseServer } from '@/lib/supabaseServer'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const OWNER_EMAIL = 'noahcasel@marketing-ark.com'

export default async function CompanyPage() {
  const supabase = supabaseServer()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user?.email) return <div className="max-w-3xl mx-auto py-12">Please sign in.</div>
  if (user.email !== OWNER_EMAIL) return <div className="max-w-3xl mx-auto py-12">Access denied.</div>

  const { data: reps } = await supabase
    .from('reps')
    .select('*, regions!inner(name, code)')
    .order('created_at', { ascending: false })

  const withSigned = await Promise.all((reps || []).map(async (r: any) => {
    const { data } = await supabaseAdmin.storage.from('id-photos').createSignedUrl(r.id_photo_path, 60 * 5)
    return { ...r, id_url: data?.signedUrl || null }
  }))

  return (
    <div className="max-w-6xl mx-auto py-10">
      <h1 className="text-3xl font-semibold mb-6">Company View (All Regions)</h1>
      {withSigned.length === 0 ? <p>No reps yet.</p> : (
        <table className="w-full text-sm border-separate border-spacing-y-2">
          <thead>
            <tr className="text-left">
              <th className="px-3">Created</th>
              <th className="px-3">Region</th>
              <th className="px-3">Rep</th>
              <th className="px-3">Email</th>
              <th className="px-3">Phone</th>
              <th className="px-3">ID</th>
            </tr>
          </thead>
          <tbody>
            {withSigned.map((r: any) => (
              <tr key={r.id} className="bg-white">
                <td className="px-3 py-2">{new Date(r.created_at).toLocaleString()}</td>
                <td className="px-3 py-2">{r.regions?.name} ({r.region_code})</td>
                <td className="px-3 py-2">{r.legal_first_name} {r.legal_last_name}</td>
                <td className="px-3 py-2">{r.email}</td>
                <td className="px-3 py-2">{r.phone}</td>
                <td className="px-3 py-2">{r.id_url ? <a className="underline" href={r.id_url} target="_blank">View</a> : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
