'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function AuthCallbackPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const run = async () => {
      // Handle magic-link fragment: #access_token=...&refresh_token=...
      const { data, error } = await supabase.auth.getSessionFromUrl({
        storeSession: false, // we'll store it on the server instead
      })
      if (error) {
        setError(error.message)
        return
      }
      const session = data?.session
      if (!session) {
        setError('No session found in callback URL.')
        return
      }

      // Send tokens to the server to set HttpOnly cookies
      const resp = await fetch('/api/auth/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        }),
      })

      if (!resp.ok) {
        const msg = await resp.text()
        setError(msg || 'Failed to set session on server')
        return
      }

      // All good — go to your post-login page
      router.replace('/portal') // change to '/region' or '/' if you prefer
    }

    run()
  }, [router])

  return (
    <div className="container" style={{ paddingTop: 80 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 12 }}>Signing you in…</h1>
      <p>If this takes more than a couple seconds, refresh the page.</p>
      {error && <p style={{ color: '#ff6b6b', marginTop: 12 }}>{error}</p>}
    </div>
  )
}
