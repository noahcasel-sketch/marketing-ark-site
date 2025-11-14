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

  // Redirect to login if not authenticated
  if (!session) {
    redirect('/login');
  }

  // Fetch user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', session.user.id)
    .single();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-8 mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Welcome back, {profile?.full_name || 'Rep'}!
              </h1>
              <p className="text-lg text-gray-600 mt-1">
                Role: <span className="font-semibold text-indigo-600">{profile?.role || 'rep'}</span>
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Logged in as: <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{session.user.email}</span>
              </p>
            </div>

            {/* Secure Sign Out Button */}
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="px-5 py-2.5 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition duration-150 shadow-md hover:shadow-lg"
              >
                Sign Out
              </button>
            </form>
          </div>
        </div>

        {/* Action Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          <Link
            href="/portal/leads"
            className="block p-6 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl shadow hover:shadow-xl transition transform hover:-translate-y-1"
          >
            <h3 className="text-xl font-bold">View Leads</h3>
            <p className="mt-1 opacity-90">Browse, filter, and manage your prospects</p>
          </Link>

          <Link
            href="/portal/reports"
            className="block p-6 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl shadow hover:shadow-xl transition transform hover:-translate-y-1"
          >
            <h3 className="text-xl font-bold">Run Reports</h3>
            <p className="mt-1 opacity-90">Export performance and analytics data</p>
          </Link>
        </div>

        {/* Footer Note */}
        <div className="mt-12 text-center text-sm text-gray-500">
          <p>Marketing ARK Rep Portal — Secure & Powered by Supabase + Vercel</p>
        </div>
      </div>
    </div>
  );
}
