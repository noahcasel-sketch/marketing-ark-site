// app/components/Header.tsx
'use client'

import Link from 'next/link'
import { useEffect, useState, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type StaffInfo = { email: string | null; role: 'owner' | 'regional' | null; regions: string[] }

export default function Header() {
  const pathname = usePathname()
  const [email, setEmail] = useState<string | null>(null)
  const [staff, setStaff] = useState<StaffInfo>({ email: null, role: null, regions: [] })

  // Hide header on login page
  if (pathname === '/login') {
    return null
  }

  const fetchServerSession = useCallback(async () => {
    try {
      const r = await fetch('/api/auth/me', { cache: 'no-store' })
      const j = (await r.json()) as { email: string | null }
      setEmail(j.email)
      if (j.email) {
        const s = await fetch('/api/staff/me', { cache: 'no-store' })
        const sj = (await s.json()) as StaffInfo
        setStaff(sj)
      } else {
        setStaff({ email: null, role: null, regions: [] })
      }
    } catch {
      setEmail(null)
      setStaff({ email: null, role: null, regions: [] })
    }
  }, [])

  useEffect(() => {
    fetchServerSession()
    const { data: sub } = supabase.auth.onAuthStateChange(() => fetchServerSession())
    return () => sub.subscription?.unsubscribe?.()
  }, [fetchServerSession])

  const canSeeRegion = staff.role === 'owner' || staff.role === 'regional'
  const canSeeCompany = staff.role === 'owner'

  const chip = (href: string, label: string) => (
    <Link
      href={href}
      style={{
        padding: '10px 16px',
        borderRadius: 999,
        background: '#60a5fa',
        color: '#0b1220',
        fontWeight: 800,
        textDecoration: 'none',
        boxShadow: '0 6px 18px rgba(96,165,250,0.25)'
      }}
    >
      {label}
    </Link>
  )

  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault()
    try { await supabase.auth.signOut() } catch {}
    window.location.href = '/logout'
  }

  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 40, background: 'transparent' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64, padding: '0 20px' }}>
        {/* LEFT: brand + nav (only when signed in) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: '#34d399' }} />
            <div style={{ fontWeight: 800, fontSize: 18, color: '#e5e7eb' }}>Marketing-ARK</div>
          </Link>
          {email && (
            <>
              {chip('/portal', 'Rep Portal')}
              {canSeeRegion && chip('/region', 'Region')}
              {canSeeCompany && chip('/company', 'Company')}
            </>
          )}
        </div>

        {/* RIGHT: auth controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {email ? (
            <>
              <span style={{ color: '#94a3b8', fontSize: 14 }}>{email}</span>
              <a href="/logout" onClick={handleLogout} style={{ color: '#e5e7eb', fontWeight: 700, textDecoration: 'none' }}>
                Logout
              </a>
            </>
          ) : (
            chip('/login', 'Rep Login')
          )}
        </div>
      </div>
    </header>
  )
}
