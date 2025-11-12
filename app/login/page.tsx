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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSending(true)

    try {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin
      const redirectTo = `${siteUrl}/auth/callback`

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo },
      })
      if (error) setError(error.message)
      else setSent(true)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="container" style={{ paddingTop: 64 }}>
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 16 }}>Sign in</h1>

      {sent ? (
        <p>
          Check <b>{email}</b> for your sign-in link. (It can take a minute—check spam.)
        </p>
      ) : (
        <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12, maxWidth: 480 }}>
          <label className="label" htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your email"
            required
          />

          {error && <p style={{ color: '#ff6b6b', fontSize: 14 }}>{error}</p>}

          <button type="submit" disabled={sending} className="btn" style={{ width: 'fit-content' }}>
            {sending ? 'Sending…' : 'Send magic link'}
          </button>
        </form>
      )}
    </div>
  )
}
