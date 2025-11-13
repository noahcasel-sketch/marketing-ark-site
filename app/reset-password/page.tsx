// app/reset-password/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function ResetPasswordPage() {
  const [ready, setReady] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState(false)

  useEffect(() => {
    const hash = typeof window !== 'undefined' ? window.location.hash : ''
    const params = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash)
    const access_token = params.get('access_token')
    const refresh_token = params.get('refresh_token')

    async function bootstrap() {
      if (access_token && refresh_token) {
        await supabase.auth.setSession({ access_token, refresh_token }).catch(() => {})
        // also set server cookie upfront so we stay logged in after reset
        try {
          await fetch('/api/auth/set-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ access_token, refresh_token }),
            cache: 'no-store',
          })
        } catch {}
      }
      setReady(true)
    }
    bootstrap()
  }, [])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < 8) return setError('Password must be at least 8 characters.')
    if (password !== confirm) return setError('Passwords do not match.')

    const { error } = await supabase.auth.updateUser({ password })
    if (error) return setError(error.message)

    // refresh tokens and set server cookie one more time after password change
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

    setOk(true)
    setTimeout(() => { window.location.href = '/portal' }, 700)
  }

  if (!ready) {
    return (
      <main style={{ maxWidth: 520, margin: '64px auto' }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 12 }}>Set your password</h1>
        <p>Loading…</p>
      </main>
    )
  }

  return (
    <main style={{ maxWidth: 520, margin: '64px auto' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 12 }}>Set your password</h1>
      {ok ? (
        <p>Success! Redirecting…</p>
      ) : (
        <form onSubmit={onSubmit} style={{ display: 'grid', gap: 16, padding: 20 }}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="New password"
            required
            style={{ height: 46, paddingInline: 12, borderRadius: 10 }}
          />
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Confirm password"
            required
            style={{ height: 46, paddingInline: 12, borderRadius: 10 }}
          />
          {error && <p style={{ color: '#ef4444', fontSize: 14 }}>{error}</p>}
          <button type="submit" style={{ width: 'fit-content', padding: '10px 16px', borderRadius: 10, fontWeight: 600 }}>
            Save password
          </button>
        </form>
      )}
    </main>
  )
}
