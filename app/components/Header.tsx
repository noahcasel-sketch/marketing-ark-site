// app/components/Header.tsx
import Link from 'next/link'
import { supabaseServer } from '../../lib/supabaseServer'

export const dynamic = 'force-dynamic'

const OWNER_EMAIL = 'noahcasel@marketing-ark.com'

export default async function Header() {
  const supabase = supabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  const email = user?.email?.toLowerCase() || null

  let hasRegion = false
  if (email) {
    const { data: region } = await supabase
      .from('regions')
      .select('code')
      .eq('manager_email', email)
      .maybeSingle()
    hasRegion = !!region
  }

  const canSeeRegion = !!email && (hasRegion || email === OWNER_EMAIL)
  const canSeeCompany = email === OWNER_EMAIL

  return (
    <header className="header">
      <div className="header-inner">
        <div className="brand">
          <span className="logo" />
          <Link href="/">Marketing-ARK</Link>
        </div>

        <div className="header-actions">
          {canSeeRegion && <Link href="/region" className="header-link">Region</Link>}
          {canSeeCompany && <Link href="/company" className="header-link">Company</Link>}

          {!email ? (
            <Link href="/login" className="btn btn-pill">Rep Login</Link>
          ) : (
            <>
              <span className="user-email">{email}</span>
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
