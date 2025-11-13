// app/login/page.tsx
'use client'

import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const LOCAL_WHITELIST = new Set([
  'noahcasel@marketing-ark.com',
  'hudsoncrist@marketing-ark.com',
  'alexanderkormeluk@marketing-ark.com',
])

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setSent(false)

    const norm = email.trim().toLowerCase()

    // 1) Server pre-check
    let status: string | undefined
    try {
      const res = await fetch('/api/auth/check-email?email=' + encodeURIComponent(norm))
      const j = await res.json()
      status = j.status
    } catch {
      status = undefined
    }

    // 2) Allow if approved OR locally whitelisted (belt & suspenders)
    const allow = status === 'approved' || LOCAL_WHITELIST.has(norm)

    if (!allow) {
      if (status === 'inactive') {
        setInfo('This account is no longer active. If this is incorrect, please contact your manager.')
      } else if (status === 'pending') {
        setInfo('This email is pending approval.')
      } else {
        setInfo('This email is not recognized in our database.')
      }
      return
    }

    // 3) Ensure user exists in Supabase Auth (handles "signups disabled" cases)
    const seedRes = await fetch('/api/auth/seed-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: norm })
    })
    if (!seedRes.ok) {
      const j = await seedRes.json().catch(() => ({}))
      setError(j.error || 'Unable to prepare account for login.')
      return
    }

    // 4) Send magic link (do NOT attempt to create new user here)
    setSending(true)
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin
    const { error: otpErr } = await supabase.auth.signInWithOtp({
      email: norm,
      options: {
        emailRedirectTo: `${siteUrl}/auth/callback`,
        shouldCreateUser: false
      }
    })
    setSending(false)

    if (otpErr) {
      // Surface exact Supabase error (e.g., redirect allow-list issue)
      setError(otpErr.message)
    } else {
      setSent(true)
    }
  }

  return (
    <main style={{ maxWidth: 520, margin: '64px auto' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 12 }}>Rep login</h1>
      {sent ? (
        <p>Check your email for the sign-in link.</p>
      ) : (
        <form onSubmit={onSubmit} className="card" style={{ padding: 20, display: 'grid', gap: 16 }}>
          <input
            type="email"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            required
            style={{ height: 46, paddingInline: 12, borderRadius: 10 }}
          />
          {info && <p style={{ color: '#94a3b8', fontSize: 14 }}>{info}</p>}
          {error && <p style={{ color: '#ef4444', fontSize: 14 }}>{error}</p>}
          <button type="submit" disabled={sending} className="btn" style={{ width: 'fit-content', padding: '10px 16px', borderRadius: 10, fontWeight: 600 }}>
            {sending ? 'Sending…' : 'Send magic link'}
          </button>
        </form>
      )}
    </main>
  )
}
