// app/login/page.tsx
'use client'

import { useMemo, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Mode = 'email' | 'password'

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('email')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  const normEmail = useMemo(() => email.trim().toLowerCase(), [email])

  async function precheck(emailLower: string): Promise<'approved'|'pending'|'inactive'|'not_found'|undefined> {
    try {
      const res = await fetch('/api/auth/check-email?email=' + encodeURIComponent(emailLower))
      const j = await res.json()
      return j.status
    } catch {
      return undefined
    }
  }

  // Email link mode
  async function onSubmitEmail(e: React.FormEvent) {
    e.preventDefault()
    setError(null); setInfo(null); setSent(false)

    const status = await precheck(normEmail)
    if (status === 'inactive') { setInfo('This account is no longer active. If this is incorrect, please contact your manager.'); return }
    if (status === 'pending') { setInfo('This email is pending approval.'); return }
    if (status !== 'approved') { setInfo('This email is not recognized in our database.'); return }

    // ensure user exists
    const seedRes = await fetch('/api/auth/seed-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: normEmail })
    })
    if (!seedRes.ok) {
      const j = await seedRes.json().catch(() => ({}))
      setError(j.error || 'Unable to prepare account for login.')
      return
    }

    setSending(true)
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin
    const { error: otpErr } = await supabase.auth.signInWithOtp({
      email: normEmail,
      options: { emailRedirectTo: `${siteUrl}/auth/callback`, shouldCreateUser: false }
    })
    setSending(false)
    if (otpErr) setError(otpErr.message); else setSent(true)
  }

  // Password mode (for any approved rep/staff)
  async function onSubmitPassword(e: React.FormEvent) {
    e.preventDefault()
    setError(null); setInfo(null)

    const status = await precheck(normEmail)
    if (status === 'inactive') { setInfo('This account is no longer active. If this is incorrect, please contact your manager.'); return }
    if (status !== 'approved') { setInfo('This email is not recognized in our database.'); return }

    setSending(true)
    const { error: pwErr } = await supabase.auth.signInWithPassword({
      email: normEmail, password
    })
    setSending(false)
    if (pwErr) { setError(pwErr.message); return }
    window.location.href = '/portal'
  }

  const tabStyle = (active: boolean) => ({
    padding: '10px 16px',
    borderRadius: 999,
    border: '2px solid #60a5fa',
    background: active ? '#60a5fa' : 'transparent',
    color: active ? '#0b1220' : '#e5e7eb',
    fontWeight: 800,
  } as const)

  const btnStyle = {
    background: '#60a5fa',
    color: '#0b1220',
    borderRadius: 12,
    padding: '12px 18px',
    fontWeight: 800,
    boxShadow: '0 6px 18px rgba(96,165,250,0.25)',
  } as const

  return (
    <main style={{ maxWidth: 560, margin: '64px auto' }}>
      <h1 style={{ fontSize: 32, fontWeight: 900, marginBottom: 16 }}>Sign in</h1>

      {/* mode switch */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <button type="button" onClick={() => setMode('email')} style={tabStyle(mode === 'email')}>Email link</button>
        <button type="button" onClick={() => setMode('password')} style={tabStyle(mode === 'password')}>Password</button>
      </div>

      {mode === 'email' ? (
        sent ? (
          <p>Check your email for the sign-in link.</p>
        ) : (
          <form onSubmit={onSubmitEmail} style={{ display: 'grid', gap: 16, padding: 20 }}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              required
              style={{ height: 52, paddingInline: 14, borderRadius: 12, border: '1px solid #334155', color: '#e5e7eb', background: '#0b1220' }}
            />
            {info && <p style={{ color: '#94a3b8', fontSize: 14 }}>{info}</p>}
            {error && <p style={{ color: '#ef4444', fontSize: 14 }}>{error}</p>}
            <button type="submit" disabled={sending} style={btnStyle}>
              {sending ? 'Sending…' : 'Send magic link'}
            </button>
          </form>
        )
      ) : (
        <form onSubmit={onSubmitPassword} style={{ display: 'grid', gap: 16, padding: 20 }}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            required
            style={{ height: 52, paddingInline: 14, borderRadius: 12, border: '1px solid #334155', color: '#e5e7eb', background: '#0b1220' }}
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
            style={{ height: 52, paddingInline: 14, borderRadius: 12, border: '1px solid #334155', color: '#e5e7eb', background: '#0b1220' }}
          />
          {info && <p style={{ color: '#94a3b8', fontSize: 14 }}>{info}</p>}
          {error && <p style={{ color: '#ef4444', fontSize: 14 }}>{error}</p>}
          <button type="submit" disabled={sending} style={btnStyle}>
            {sending ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      )}
    </main>
  )
}
