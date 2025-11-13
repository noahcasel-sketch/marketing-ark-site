// app/auth/callback/page.tsx
'use client'

import { useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function AuthCallback() {
  useEffect(() => {
    const hash = typeof window !== 'undefined' ? window.location.hash : ''
    const params = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash)

    const type = params.get('type') // 'magiclink' | 'recovery' | 'invite' | etc.
    const access_token = params.get('access_token')
    const refresh_token = params.get('refresh_token')

    async function run() {
      // 1) Make the CLIENT aware (so header/UI updates immediately)
      if (access_token && refresh_token) {
        await supabase.auth.setSession({ access_token, refresh_token }).catch(() => {})
      }

      // 2) Make the SERVER aware (cookie) so pages like /portal see you as logged in
      if (access_token && refresh_token) {
        try {
          await fetch('/api/auth/set-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ access_token, refresh_token }),
            cache: 'no-store',
          })
        } catch {}
      }

      // 3) Route based on link type
      if (type === 'recovery' || type === 'invite') {
        // Keep the hash so /reset-password can read the tokens if needed
        window.location.replace('/reset-password' + window.location.hash)
      } else {
        window.location.replace('/portal')
      }
    }

    run()
  }, [])

  return (
    <main style={{ maxWidth: 720, margin: '48px auto' }}>
      <p>Signing you in…</p>
    </main>
  )
}
