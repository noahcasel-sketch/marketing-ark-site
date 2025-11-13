// app/components/Header.tsx
'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type StaffInfo = { email: string | null; role: 'owner' | 'regional' | null; regions: string[] }

export default function Header() {
  const [email, setEmail] = useState<string | null>(null)
  const [staff, setStaff] = useState<StaffInfo>({ email: null, role: null, regions: [] })

  useEffect(() => {
    let mounted = true

    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return
      const e = data.user?.email ?? null
      setEmail(e)
      if (e) {
        fetch('/api/staff/me')
          .then((r) => r.json())
          .then((j) => mounted && setStaff(j as StaffInfo))
          .catch(() => {})
      }
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const e = session?.user?.email ?? null
      setEmail(e)
      if (e) {
        fetch('/api/staff/me')
          .then((r) => r.json())
          .then((j) => setStaff(j as StaffInfo))
          .catch(() => {})
      } else {
        setStaff({ email: null, role: null, regions: [] })
      }
    })

    return () => {
      mounted = false
      sub.subscription?.unsubscribe?.()
    }
  }, [])

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

  const canSeeRegion = staff.role === 'owner' || staff.role === 'regional'
  const canSeeCompany = staff.role === 'owner'

  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 40, background: 'transparent' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64, padding: '0 20px' }}>
        {/* LEFT: brand + nav */}
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

        {/* RIGHT: identity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {email ? (
            <>
              <span style={{ color: '#94a3b8', fontSize: 14 }}>{email}</span>
              <Link href="/logout" style={{ color: '#e5e7eb', fontWeight: 700, textDecoration: 'none' }}>Logout</Link>
            </>
          ) : (
            chip('/login', 'Rep Login')
          )}
        </div>
      </div>
    </header>
  )
}
