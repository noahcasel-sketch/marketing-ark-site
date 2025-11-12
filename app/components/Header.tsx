import Link from 'next/link'
import { supabaseServer } from '../../lib/supabaseServer'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const OWNER_EMAIL = 'noahcasel@marketing-ark.com'

export default async function Header() {
  const supabase = supabaseServer()
  const { data: { user } } = await supabase.auth.getUser()

  let hasRegion = false
  if (user?.email) {
    const { data: region } = await supabase
      .from('regions')
      .select('code')
      .eq('manager_email', user.email)
      .maybeSingle()
    hasRegion = !!region
  }

  const canSeeRegion = !!user?.email && (hasRegion || user.email === OWNER_EMAIL)
  const canSeeCompany = user?.email === OWNER_EMAIL

  return (
    <header>
      <div className="container">
        <div className="nav">
          <div className="brand">
            <span className="logo" />
            <Link href="/">Marketing-ARK</Link>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Link href="/onboarding">Onboarding</Link>
            {canSeeRegion && <Link href="/region">Region</Link>}
            {canSeeCompany && <Link href="/company">Company</Link>}

            {!user?.email ? (
              <Link href="/login" className="btn">Rep Login</Link>
            ) : (
              <>
                <span style={{ opacity: 0.8, fontSize: 14 }}>{user.email}</span>
                <form action="/logout" method="post" style={{ display: 'inline' }}>
                  <button type="submit" className="btn">Logout</button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
