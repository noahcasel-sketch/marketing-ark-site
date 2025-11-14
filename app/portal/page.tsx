import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function PortalHome() {
  const supabase = createServerComponentClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/login');

  // Check if owner
  const { data: staff } = await supabase
    .from('staff')
    .select('role')
    .eq('email', session.user.email)
    .single();

  if (!staff || staff.role !== 'owner') {
    return (
      <div className="p-6 text-white">
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p>You do not have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="p-6 text-white">
      <h1 className="text-3xl font-bold mb-6">Owner Dashboard</h1>
      <p className="mb-8">Welcome back! Use the buttons below to manage reps.</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link href="/region" className="block p-6 bg-indigo-600 rounded-lg text-center hover:bg-indigo-700 transition">
          <h2 className="text-xl font-semibold">Manage Regions</h2>
          <p className="mt-2">View and assign reps by region</p>
        </Link>

        <Link href="/company" className="block p-6 bg-teal-600 rounded-lg text-center hover:bg-teal-700 transition">
          <h2 className="text-xl font-semibold">Manage Companies</h2>
          <p className="mt-2">Approve pending reps and manage teams</p>
        </Link>

        <Link href="/portal/contract" className="block p-6 bg-purple-600 rounded-lg text-center hover:bg-purple-700 transition">
          <h2 className="text-xl font-semibold">Contract Templates</h2>
          <p className="mt-2">View and send rep contracts</p>
        </Link>
      </div>
    </div>
  );
}
