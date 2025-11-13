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
    // Supabase recovery links put tokens in the hash: #access_token=...&refresh_token=...&type=recovery
    const hash = typeof window !== 'undefined' ? window.location.hash : ''
    const params = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash)
    const access_token = params.get('access_token')
    const refresh_token = params.get('refresh_token')

    async function bootstrap() {
      if (access_token && refresh_token) {
        const { error } = await supabase.auth.setSession({ access_token, refresh_token })
        if (error) setError(error.message)
      }
      setReady(true)
    }
    bootstrap()
  }, [])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError(error.message)
      return
    }
    setOk(true)
    // Small delay so they see the success
    setTimeout(() => {
      window.location.href = '/portal'
    }, 700)
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
          <button
            type="submit"
            style={{ width: 'fit-content', padding: '10px 16px', borderRadius: 10, fontWeight: 600 }}
          >
            Save password
          </button>
        </form>
      )}
    </main>
  )
}
