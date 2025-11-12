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

    // 1) pre-check with our API
    const res = await fetch('/api/auth/check-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    })
    const j = await res.json()

    if (j.status === 'approved') {
      // 2) only approved addresses receive magic link
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
        <form onSubmit={onSubmit} className="card" style={{ padding: 16 }}>
          <input
            type="email"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            required
          />
          {info && <p style={{ color: '#666', fontSize: 14 }}>{info}</p>}
          {error && <p style={{ color: '#ff6b6b', fontSize: 14 }}>{error}</p>}
          <button type="submit" disabled={sending} className="btn" style={{ width: 'fit-content' }}>
            {sending ? 'Sending…' : 'Send magic link'}
          </button>
        </form>
      )}
    </main>
  )
}
