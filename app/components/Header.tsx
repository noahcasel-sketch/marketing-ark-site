// app/components/Header.tsx
'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function Header() {
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    supabase.auth.getUser().then(({ data }) => {
      if (mounted) setEmail(data.user?.email ?? null)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setEmail(session?.user?.email ?? null)
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
        boxShadow: '0 6px 18px rgba(96,165,250,0.25)',
        textDecoration: 'none'
      }}
    >
      {label}
    </Link>
  )

  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 40, background: 'transparent' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64, padding: '0 20px' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: '#34d399' }} />
          <div style={{ fontWeight: 800, fontSize: 18, color: '#e5e7eb' }}>Marketing-ARK</div>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {email ? (
            <>
              {chip('/portal', 'Rep Portal')}
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
