'use client'

import { useEffect, useState } from 'react'

function parseHashTokens(hash: string) {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash
  const p = new URLSearchParams(raw)
  return {
    access_token: p.get('access_token'),
    refresh_token: p.get('refresh_token'),
    error_description: p.get('error_description'),
  }
}

export default function AuthCallbackPage() {
  const [msg, setMsg] = useState('Signing you in…')

  useEffect(() => {
    const run = async () => {
      try {
        const url = new URL(window.location.href)

        // 1) HASH FLOW: #access_token=...&refresh_token=...
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

          // full reload so SSR header picks up the new cookies immediately
          window.location.replace('/portal') // change to '/region' or '/' if you prefer
          return
        }

        // 2) PKCE FLOW: ?code=...
        const code = url.searchParams.get('code')
        if (code) {
          const resp = await fetch('/api/auth/exchange-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code }),
            cache: 'no-store',
          })
          if (!resp.ok) throw new Error(await resp.text())

          window.location.replace('/portal') // full reload
          return
        }

        // 3) No hash/code: if server already has a session, continue
        const status = await fetch('/auth/status', { cache: 'no-store' })
        const j = await status.json().catch(() => ({}))
        if (j?.email) {
          window.location.replace('/portal')
          return
        }

        // 4) Otherwise send them to login
        setMsg('No active session found. Redirecting to login…')
        setTimeout(() => (window.location.href = '/login?error=no_session'), 600)
      } catch (err: any) {
        setMsg(`Sign-in error: ${err?.message || String(err)}`)
      }
    }
    run()
  }, [])

  return (
    <div className="container" style={{ paddingTop: 80 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 12 }}>{msg}</h1>
      <p>If this takes more than a couple seconds, refresh the page.</p>
    </div>
  )
}
