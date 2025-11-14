import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function PortalHome() {
  const supabase = createServerComponentClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/login');

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
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">Marketing-ARK Portal</h1>
        <form action="/auth/signout" method="post">
          <button type="submit" className="text-sm text-red-400 hover:text-red-300 underline">
            Sign Out
          </button>
        </form>
      </header>

      <main className="p-6 max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold mb-2">Owner Dashboard</h2>
        <p className="text-gray-300 mb-10">Welcome back! Manage your team below.</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link href="/region" className="block p-6 bg-indigo-600 rounded-lg text-center hover:bg-indigo-700 transition border-2 border-indigo-500">
            <h3 className="text-xl font-semibold">Manage Regions</h3>
            <p className="mt-2 text-sm">View and assign reps by region</p>
          </Link>

          <Link href="/company" className="block p-6 bg-teal-600 rounded-lg text-center hover:bg-teal-700 transition border-2 border-teal-500">
            <h3 className="text-xl font-semibold">Manage Company</h3>
            <p className="mt-2 text-sm">Approve pending reps and manage teams</p>
          </Link>

          <Link href="/portal/contract" className="block p-6 bg-purple-600 rounded-lg text-center hover:bg-purple-700 transition border-2 border-purple-500">
            <h3 className="text-xl font-semibold">Agreements</h3>
            <p className="mt-2 text-sm">Complete W-9 Form & Direct Seller Agreement</p>
          </Link>
        </div>
      </main>
    </div>
  );
}
