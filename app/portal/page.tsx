// app/portal/page.tsx
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function PortalPage() {
  const supabase = createServerComponentClient({ cookies });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', session.user.id)
    .single();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-lg p-8">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome back, {profile?.full_name || 'Rep'}!
            </h1>
            <p className="text-gray-600 mt-1">Role: <strong>{profile?.role || 'rep'}</strong></p>
          </div>
          <form action="/auth/signout" method="post">
            <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition">
              Sign Out
            </button>
          </form>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mt-8">
          <Link href="/portal/leads" className="block p-6 bg-blue-50 rounded-lg hover:bg-blue-100 transition">
            <h3 className="text-xl font-semibold text-blue-900">View Leads</h3>
            <p className="text-blue-700 mt-1">Manage and track your prospects</p>
          </Link>

          <Link href="/portal/reports" className="block p-6 bg-green-50 rounded-lg hover:bg-green-100 transition">
            <h3 className="text-xl font-semibold text-green-900">Run Reports</h3>
            <p className="text-green-700 mt-1">Export performance data</p>
          </Link>
        </div>

        <div className="mt-8 text-sm text-gray-500">
          Logged in as: <span className="font-mono">{session.user.email}</span>
        </div>
      </div>
    </div>
  );
}
