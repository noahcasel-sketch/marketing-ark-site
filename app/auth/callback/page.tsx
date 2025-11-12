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
  const [msg, setMsg] = useState('Signing you in…')

  useEffect(() => {
    const run = async () => {
      try {
        // If the URL has a hash (#access_token=...), read it and extract a session:
        if (typeof window !== 'undefined' && window.location.hash.includes('access_token')) {
          const { data, error } = await supabase.auth.getSessionFromUrl({ storeSession: false })
          if (error) throw error
          const session = data?.session
          if (!session) throw new Error('No session in callback URL')

          // Send tokens to the server to set HttpOnly cookies
          const resp = await fetch('/api/auth/set-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              access_token: session.access_token,
              refresh_token: session.refresh_token,
            }),
          })
          if (!resp.ok) throw new Error(await resp.text())

          // Good to go
          router.replace('/portal') // change to '/region' or '/' if you prefer
          return
        }

        // No hash present: if the server already has a session cookie, skip ahead.
        const status = await fetch('/auth/status', { cache: 'no-store' })
        const j = await status.json().catch(() => ({}))
        if (j?.email) {
          router.replace('/portal')
          return
        }

        // Still no session → send them to login
        setMsg('No active session found. Redirecting to login…')
        setTimeout(() => router.replace('/login?error=no_session'), 800)
      } catch (err: any) {
        setMsg(`Sign-in error: ${err?.message || String(err)}`)
      }
    }

    run()
  }, [router])

  return (
    <div className="container" style={{ paddingTop: 80 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 12 }}>{msg}</h1>
      <p>If this takes more than a couple seconds, refresh the page.</p>
    </div>
  )
}
