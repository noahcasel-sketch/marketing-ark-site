'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const run = async () => {
      // Parse the hash fragment from the URL
      const hash = window.location.hash; // "#access_token=...&refresh_token=..."
      const params = new URLSearchParams(hash.slice(1));

      const access_token = params.get('access_token');
      const refresh_token = params.get('refresh_token');

      if (!access_token || !refresh_token) {
        router.replace('/login?error=missing_tokens');
        return;
      }

      // Ask the server to set the Supabase auth cookies
      const res = await fetch('/api/auth/set-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token, refresh_token }),
        credentials: 'include',
      });

      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: 'server_error' }));
        router.replace(`/login?error=${encodeURIComponent(error || 'server_error')}`);
        return;
      }

      // Server cookie is set — go to the portal
      router.replace('/portal');
    };

    run();
  }, [router]);

  return (
    <main style={{ padding: 32 }}>
      <h2>Signing you in…</h2>
    </main>
  );
}
