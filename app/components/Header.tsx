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
    <header className="header">
      <div className="header-inner">
        {/* Left: brand */}
        <div className="brand">
          <span className="logo" />
          <Link href="/">Marketing-ARK</Link>
        </div>

        {/* Right: role-aware links + auth */}
        <div className="header-actions">
          {canSeeRegion && <Link href="/region" className="header-link">Region</Link>}
          {canSeeCompany && <Link href="/company" className="header-link">Company</Link>}

          {!user?.email ? (
            <Link href="/login" className="btn btn-pill">Rep Login</Link>
          ) : (
            <>
              <span className="user-email">{user.email}</span>
              <form action="/logout" method="post" style={{ display: 'inline' }}>
                <button type="submit" className="btn btn-pill">Logout</button>
              </form>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
