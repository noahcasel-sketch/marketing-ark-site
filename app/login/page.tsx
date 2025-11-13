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

  return (
    <main style={{ maxWidth: 520, margin: '64px auto' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 12 }}>Sign in</h1>

      {/* mode switch */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button
          type="button"
          onClick={() => setMode('email')}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb', background: mode === 'email' ? '#f1f5f9' : 'transparent', fontWeight: 600 }}
        >
          Email link
        </button>
        <button
          type="button"
          onClick={() => setMode('password')}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb', background: mode === 'password' ? '#f1f5f9' : 'transparent', fontWeight: 600 }}
        >
          Password
        </button>
      </div>

      {mode === 'email' ? (
        sent ? (
          <p>Check your email for the sign-in link.</p>
        ) : (
          <form onSubmit={onSubmitEmail} style={{ display: 'grid', gap: 16, padding: 20 }}>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" required style={{ height: 46, paddingInline: 12, borderRadius: 10 }} />
            {info && <p style={{ color: '#94a3b8', fontSize: 14 }}>{info}</p>}
            {error && <p style={{ color: '#ef4444', fontSize: 14 }}>{error}</p>}
            <button type="submit" disabled={sending} style={{ width: 'fit-content', padding: '10px 16px', borderRadius: 10, fontWeight: 600 }}>
              {sending ? 'Sending…' : 'Send magic link'}
            </button>
          </form>
        )
      ) : (
        <form onSubmit={onSubmitPassword} style={{ display: 'grid', gap: 16, padding: 20 }}>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" required style={{ height: 46, paddingInline: 12, borderRadius: 10 }} />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required style={{ height: 46, paddingInline: 12, borderRadius: 10 }} />
          {info && <p style={{ color: '#94a3b8', fontSize: 14 }}>{info}</p>}
          {error && <p style={{ color: '#ef4444', fontSize: 14 }}>{error}</p>}
          <button type="submit" disabled={sending} style={{ width: 'fit-content', padding: '10px 16px', borderRadius: 10, fontWeight: 600 }}>
            {sending ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      )}
    </main>
  )
}
