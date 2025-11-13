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
    const type = params.get('type') // e.g., 'recovery', 'invite', 'magiclink'
    const access_token = params.get('access_token')
    const refresh_token = params.get('refresh_token')

    async function run() {
      // Store tokens so session is active in either branch
      if (access_token && refresh_token) {
        await supabase.auth.setSession({ access_token, refresh_token }).catch(() => {})
      }

      if (type === 'recovery' || type === 'invite') {
        // Go to reset screen and keep the tokens in the hash
        window.location.replace('/reset-password' + window.location.hash)
      } else {
        // Normal magic link / email login
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
