// app/whoami/page.tsx
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { createClient } from '../../lib/supabaseServer';

export default async function WhoAmI({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  return (
    <pre style={{ padding: 24, fontSize: 14 }}>
{JSON.stringify({
  email: user?.email ?? null,
  error: error?.message ?? null,
  seen_code: searchParams.seen_code ?? null,
  seen_token: searchParams.seen_token ?? null,
  seen_token_hash: searchParams.seen_token_hash ?? null,
  seen_type: searchParams.seen_type ?? null
}, null, 2)}
    </pre>
  );
}
