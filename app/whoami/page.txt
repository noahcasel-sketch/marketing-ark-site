// app/whoami/page.tsx
export const dynamic = 'force-dynamic';

import { createClient } from '../../lib/supabaseServer';

export default async function WhoAmI() {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  return (
    <pre style={{ padding: 24, fontSize: 14 }}>
{JSON.stringify({ email: user?.email ?? null, error: error?.message ?? null }, null, 2)}
    </pre>
  );
}
