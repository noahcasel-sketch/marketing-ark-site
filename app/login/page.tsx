// app/login/page.tsx
'use client'

import { useMemo, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// admins allowed to use password login
const ADMIN_WHITELIST = new Set([
  'noahcasel@marketing-ark.com',
  'hudsoncrist@marketing-ark.com',
  'alexanderkormeluk@marketing-ark.com',
])

type Mode = 'email' | 'admin'

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('email')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  const normEmail = useMemo(() => email.trim().toLowerCase(), [email])
  const isAdminEmail = ADMIN_WHITELIST.has(normEmail)

  async function precheck(emailLower: string): Promise<'approved'|'pending'|'inactive'|'not_found'|undefined> {
    try {
      const res = await fetch('/api/auth/check-email?email=' + encodeURIComponent(emailLower))
      const j = await res.json()
      return j.status
    } catch {
      return undefined
    }
  }

  async function onSubmitEmail(e: React.FormEvent) {
    e.preventDefault()
    setError(null); setInfo(null); setSent(false)

    const status = await precheck(normEmail)
    if (status === 'inactive') {
      setInfo('This account is no longer active. If this is incorrect, please contact your manager.')
      return
    }
    if (status === 'pending') {
      setInfo('This email is pending approval.')
      return
    }
    if (status !== 'approved') {
      setInfo('This email is not recognized in our database.')
      return
    }

    // ensure user exists (handles “signups disabled”)
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

    // send magic link (no auto-create)
    setSending(true)
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin
    const { error: otpErr } = await supabase.auth.signInWithOtp({
      email: normEmail,
      options: {
        emailRedirectTo: `${siteUrl}/auth/callback`,
        shouldCreateUser: false
      }
    })
    setSending(false)
    if (otpErr) setError(otpErr.message)
    else setSent(true)
  }

  async function onSubmitAdmin(e: React.FormEvent) {
    e.preventDefault()
    setError(null); setInfo(null); setSent(false)

    // only the 3 admins can use password login
    if (!isAdminEmail) {
      setInfo('Password login is only available to admin accounts.')
      return
    }

    // admin must still be recognized (staff or approved rep)
    const status = await precheck(normEmail)
    if (status === 'inactive') {
      setInfo('This account is no longer active. If this is incorrect, please contact your manager.')
      return
    }
    if (status !== 'approved') {
      setInfo('This email is not recognized in our database.')
      return
    }

    setSending(true)
    const { error: pwErr } = await supabase.auth.signInWithPassword({
      email: normEmail,
      password
    })
    setSending(false)
    if (pwErr) {
      setError(pwErr.message)  // e.g., "Invalid login credentials"
      return
    }
    // success → go to portal (change if another landing is preferred)
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
          style={{
            padding: '8px 12px',
            borderRadius: 8,
            border: '1px solid #e5e7eb',
            background: mode === 'email' ? '#f1f5f9' : 'transparent',
            fontWeight: 600
          }}
        >
          Email link
        </button>
        <button
          type="button"
          onClick={() => setMode('admin')}
          style={{
            padding: '8px 12px',
            borderRadius: 8,
            border: '1px solid #e5e7eb',
            background: mode === 'admin' ? '#f1f5f9' : 'transparent',
            fontWeight: 600
          }}
        >
          Password (admins)
        </button>
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
              style={{ height: 46, paddingInline: 12, borderRadius: 10 }}
            />
            {info && <p style={{ color: '#94a3b8', fontSize: 14 }}>{info}</p>}
            {error && <p style={{ color: '#ef4444', fontSize: 14 }}>{error}</p>}
            <button
              type="submit"
              disabled={sending}
              style={{ width: 'fit-content', padding: '10px 16px', borderRadius: 10, fontWeight: 600 }}
            >
              {sending ? 'Sending…' : 'Send magic link'}
            </button>
          </form>
        )
      ) : (
        <form onSubmit={onSubmitAdmin} style={{ display: 'grid', gap: 16, padding: 20 }}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@marketing-ark.com"
            required
            style={{ height: 46, paddingInline: 12, borderRadius: 10 }}
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
            style={{ height: 46, paddingInline: 12, borderRadius: 10 }}
          />
          {!isAdminEmail && (
            <p style={{ color: '#94a3b8', fontSize: 13 }}>
              Password login is only for admin accounts (Noah, Hudson, Alexander).
            </p>
          )}
          {info && <p style={{ color: '#94a3b8', fontSize: 14 }}>{info}</p>}
          {error && <p style={{ color: '#ef4444', fontSize: 14 }}>{error}</p>}
          <button
            type="submit"
            disabled={sending}
            style={{ width: 'fit-content', padding: '10px 16px', borderRadius: 10, fontWeight: 600 }}
          >
            {sending ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      )}
    </main>
  )
}
