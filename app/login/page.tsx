// app/login/page.tsx
'use client'

import { useMemo, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [sentReset, setSentReset] = useState(false)

  const normEmail = useMemo(() => email.trim().toLowerCase(), [email])

  async function precheck(emailLower: string): Promise<'approved'|'pending'|'inactive'|'not_found'|undefined> {
    try {
      const res = await fetch('/api/auth/check-email?email=' + encodeURIComponent(emailLower), { cache: 'no-store' })
      const j = await res.json()
      return j.status
    } catch {
      return undefined
    }
  }

  async function setServerCookieFromCurrentSession() {
    const { data } = await supabase.auth.getSession()
    const access_token = data.session?.access_token
    const refresh_token = data.session?.refresh_token
    if (access_token && refresh_token) {
      await fetch('/api/auth/set-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token, refresh_token }),
        cache: 'no-store',
      })
    }
  }

  async function onSubmitPassword(e: React.FormEvent) {
    e.preventDefault()
    setError(null); setInfo(null); setSentReset(false)

    const status = await precheck(normEmail)
    if (status === 'inactive') { setInfo('This account is no longer active. If this is incorrect, please contact your manager.'); return }
    if (status !== 'approved') { setInfo('This email is not recognized in our database.'); return }

    setSending(true)
    const { data, error: pwErr } = await supabase.auth.signInWithPassword({
      email: normEmail,
      password
    })
    setSending(false)
    if (pwErr) { setError(pwErr.message); return }

    // IMPORTANT: set server cookie so /portal SSR sees you as logged in
    if (!data.session) {
      // some environments return null immediately; fetch explicitly
      await setServerCookieFromCurrentSession()
    } else {
      const { access_token, refresh_token } = data.session
      await fetch('/api/auth/set-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token, refresh_token }),
        cache: 'no-store',
      })
    }

    window.location.href = '/portal'
  }

  async function onResetPassword(e: React.MouseEvent) {
    e.preventDefault()
    setError(null); setInfo(null); setSentReset(false)

    const status = await precheck(normEmail)
    if (status !== 'approved') { setInfo('Use the email that was approved for your account.'); return }

    const res = await fetch('/api/auth/send-reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: normEmail })
    })
    const j = await res.json().catch(() => ({}))
    if (!res.ok) { setError(j.error || 'Could not send reset email.'); return }
    setSentReset(true)
  }

  const btn = {
    background: '#60a5fa',
    color: '#0b1220',
    borderRadius: 12,
    padding: '12px 18px',
    fontWeight: 800,
    boxShadow: '0 6px 18px rgba(96,165,250,0.25)'
  } as const

  return (
    <main style={{ maxWidth: 560, margin: '64px auto' }}>
      <h1 style={{ fontSize: 32, fontWeight: 900, marginBottom: 16 }}>Sign in</h1>

      <form onSubmit={onSubmitPassword} style={{ display: 'grid', gap: 16, padding: 20 }}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@marketing-ark.com"
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
        {sentReset && <p style={{ color: '#60a5fa', fontSize: 14 }}>Password reset email sent—check your inbox.</p>}

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button type="submit" disabled={sending} style={btn}>
            {sending ? 'Signing in…' : 'Sign in'}
          </button>
          <a href="#" onClick={onResetPassword} style={{ color: '#93c5fd', fontWeight: 700 }}>Forgot password?</a>
        </div>
      </form>
    </main>
  )
}
