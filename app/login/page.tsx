'use client'

import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export const dynamic = 'force-dynamic'
export const revalidate = 0

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
      const siteUrl =
        process.env.NEXT_PUBLIC_SITE_URL || window.location.origin
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
    <div className="max-w-md mx-auto py-16">
      <h1 className="text-3xl font-semibold mb-4">Sign in</h1>

      {sent ? (
        <p>
          Check <b>{email}</b> for your sign-in link. (It can take a minute—
          check spam.)
        </p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              className="w-full border rounded-xl p-3"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@marketing-ark.com"
              required
            />
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={sending}
            className="px-5 py-3 rounded-xl bg-black text-white disabled:opacity-60"
          >
            {sending ? 'Sending…' : 'Send magic link'}
          </button>
        </form>
      )}
    </div>
  )
}
