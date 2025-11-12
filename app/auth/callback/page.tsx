'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

function parseHashTokens(hash: string) {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash
  const p = new URLSearchParams(raw)
  const access_token = p.get('access_token')
  const refresh_token = p.get('refresh_token')
  const error_description = p.get('error_description')
  return { access_token, refresh_token, error_description }
}

export default function AuthCallbackPage() {
  const router = useRouter()
  const [msg, setMsg] = useState('Signing you in…')

  useEffect(() => {
    const run = async () => {
      try {
        const url = new URL(window.location.href)

        // 1) HASH FLOW (#access_token=...&refresh_token=...)
        if (window.location.hash && window.location.hash.length > 1) {
          const { access_token, refresh_token, error_description } = parseHashTokens(window.location.hash)
          if (error_description) throw new Error(error_description)
          if (!access_token || !refresh_token) throw new Error('Missing tokens in callback hash')

          const resp = await fetch('/api/auth/set-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ access_token, refresh_token }),
            cache: 'no-store',
          })
          if (!resp.ok) throw new Error(await resp.text())

          router.replace('/portal') // change to '/region' or '/' if you prefer
          return
        }

        // 2) PKCE FLOW (?code=...)
        const code = url.searchParams.get('code')
        if (code) {
          const resp = await fetch('/api/auth/exchange-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code }),
            cache: 'no-store',
          })
          if (!resp.ok) throw new Error(await resp.text())

          router.replace('/portal')
          return
        }

        // 3) If neither present, see if we already have a cookie session:
        const status = await fetch('/auth/status', { cache: 'no-store' })
        const j = await status.json().catch(() => ({}))
        if (j?.email) {
          router.replace('/portal')
          return
        }

        // 4) Nothing worked → go to login
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
