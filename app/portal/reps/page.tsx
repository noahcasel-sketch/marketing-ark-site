import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function RepDashboard() {
  const supabase = createServerComponentClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/login');

  const { data: rep } = await supabase
    .from('reps')
    .select('id')
    .eq('id', session.user.id)
    .single();

  if (!rep) redirect('/login');

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Rep Dashboard</h1>
      <p>Welcome! Your leads will appear here.</p>
    </div>
  );
}
