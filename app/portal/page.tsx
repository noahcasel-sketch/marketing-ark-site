// app/portal/page.tsx
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function PortalPage() {
  const supabase = createServerComponentClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) redirect('/login');

  // Get staff or rep info
  const { data: staff } = await supabase
    .from('staff')
    .select('role, regions')
    .eq('email', session.user.email)
    .single();

  const { data: rep } = await supabase
    .from('reps')
    .select('legal_first_name, legal_last_name, region_code, status')
    .eq('id', session.user.id)
    .single();

  const isStaff = !!staff;
  const isApprovedRep = rep?.status === 'active';

  if (!isStaff && !isApprovedRep) {
    redirect('/login?error=unauthorized');
  }

  const name = isStaff
    ? session.user.email
    : `${rep?.legal_first_name} ${rep?.legal_last_name}`;

  const role = isStaff
    ? `${staff.role} (${staff.regions.join(', ')})`
    : 'Approved Rep';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm p-8 mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Welcome back, {name}!</h1>
              <p className="text-lg text-gray-600 mt-1">Role: <span className="font-semibold text-indigo-600">{role}</span></p>
              <p className="text-sm text-gray-500 mt-2">Email: {session.user.email}</p>
            </div>
            <form action="/auth/signout" method="post">
              <button className="px-5 py-2.5 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition">
                Sign Out
              </button>
            </form>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Link href="/portal/reps" className="block p-6 bg-blue-600 text-white rounded-xl shadow hover:shadow-xl transition">
            <h3 className="text-xl font-bold">Manage Reps</h3>
            <p className="mt-1 opacity-90">View, approve, or deactivate reps</p>
          </Link>

          <Link href="/portal/documents" className="block p-6 bg-green-600 text-white rounded-xl shadow hover:shadow-xl transition">
            <h3 className="text-xl font-bold">Documents</h3>
            <p className="mt-1 opacity-90">View uploaded IDs, W-9s, etc.</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
