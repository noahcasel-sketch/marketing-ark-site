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
      <header className="bg-gray-800 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-lg">A</span>
          </div>
          <h1 className="text-xl font-bold">Marketing-ARK</h1>
        </div>
        <form action="/auth/signout" method="post">
          <button className="bg-blue-600 text-white px-6 py-2 rounded-full hover:bg-blue-700 transition shadow-md font-medium">
            Sign Out
          </button>
        </form>
      </header>

      <main className="p-6 max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold mb-2">Owner Dashboard</h2>
        <p className="text-gray-300 mb-10">Welcome back! Manage your team below.</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link href="/region" className="block p-6 bg-white rounded-xl shadow-md hover:shadow-lg transition border border-gray-200">
            <h3 className="text-xl font-semibold text-gray-900">Manage Regions</h3>
            <p className="mt-2 text-sm text-gray-600">View and assign reps by region</p>
          </Link>

          <Link href="/company" className="block p-6 bg-white rounded-xl shadow-md hover:shadow-lg transition border border-gray-200">
            <h3 className="text-xl font-semibold text-gray-900">Manage Company</h3>
            <p className="mt-2 text-sm text-gray-600">Approve pending reps and manage teams</p>
          </Link>

          <Link href="/portal/contract" className="block p-6 bg-white rounded-xl shadow-md hover:shadow-lg transition border border-gray-200">
            <h3 className="text-xl font-semibold text-gray-900">Agreements</h3>
            <p className="mt-2 text-sm text-gray-600">Complete W-9 Form & Direct Seller Agreement</p>
          </Link>
        </div>
      </main>
    </div>
  );
}
