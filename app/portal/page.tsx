import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function PortalHome() {
  const supabase = createServerComponentClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/login');

  // Optional: check if owner
  const { data: staff } = await supabase
    .from('staff')
    .select('role')
    .eq('email', session.user.email)
    .single();

  if (staff?.role === 'owner') {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold">Owner Dashboard</h1>
        <p>Welcome back! Use the menu to manage reps.</p>
      </div>
    );
  }

  // Rep or regional
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Rep Dashboard</h1>
      <p>Welcome! Your leads will appear here.</p>
    </div>
  );
}
