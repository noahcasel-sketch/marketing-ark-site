'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../../lib/supabaseBrowser';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleHash = async () => {
      const hash = window.location.hash;
      if (!hash) {
        router.replace('/login?error=no_hash');
        return;
      }

      // Convert #access_token=...&refresh_token=... into URLSearchParams
      const params = new URLSearchParams(hash.substring(1));
      const access_token = params.get('access_token');
      const refresh_token = params.get('refresh_token');

      if (!access_token || !refresh_token) {
        router.replace('/login?error=missing_tokens');
        return;
      }

      const supabase = createClient();
      await supabase.auth.setSession({
        access_token,
        refresh_token,
      });

      // Redirect to portal after saving session
      router.replace('/portal');
    };

    handleHash();
  }, [router]);

  return (
    <main style={{ padding: 32, fontFamily: 'sans-serif' }}>
      <h2>Signing you in…</h2>
    </main>
  );
}
