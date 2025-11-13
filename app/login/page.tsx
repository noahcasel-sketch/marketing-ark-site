// app/login/page.tsx
'use client'

import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

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

    const res = await fetch('/api/auth/check-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    })
    const j = await res.json()

    if (j.status === 'approved') {
      setSending(true)
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin
      const { error: otpErr } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${siteUrl}/auth/callback` }
      })
      setSending(false)
      if (otpErr) setError(otpErr.message)
      else setSent(true)
    } else if (j.status === 'pending') {
      setInfo('This email is pending approval.')
    } else if (j.status === 'not_found') {
      setInfo('This email is not recognized in our database.')
    } else {
      setError(j.error || 'Unexpected error.')
    }
  }

  return (
    <main style={{ maxWidth: 520, margin: '64px auto' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 12 }}>Rep login</h1>

      {sent ? (
        <p>Check your email for the sign-in link.</p>
      ) : (
        <form
          onSubmit={onSubmit}
          className="card"
          style={{
            padding: 20,
            display: 'grid',
            gap: 16, // <-- adds clean spacing between input and button
            background: 'var(--surface, #0f172a00)'
          }}
        >
          <input
            type="email"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            required
            style={{ height: 44, paddingInline: 12, borderRadius: 10 }}
          />

          {info && <p style={{ color: '#94a3b8', fontSize: 14, marginTop: 4 }}>{info}</p>}
          {error && <p style={{ color: '#ef4444', fontSize: 14, marginTop: 4 }}>{error}</p>}

          <button
            type="submit"
            disabled={sending}
            className="btn"
            style={{
              width: 'fit-content',
              padding: '10px 16px',
              borderRadius: 10,
              fontWeight: 600
            }}
          >
            {sending ? 'Sending…' : 'Send magic link'}
          </button>
        </form>
      )}
    </main>
  )
}
