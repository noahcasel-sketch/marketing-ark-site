import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function Portal() {
  const supabase = createServerComponentClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/login');

  const { data: staff } = await supabase
    .from('staff')
    .select('role, regions')
    .eq('email', session.user.email)
    .single()
    .catch(() => ({ data: null }));

  const { data: rep } = await supabase
    .from('reps')
    .select('legal_first_name, legal_last_name')
    .eq('id', session.user.id)
    .single()
    .catch(() => ({ data: null }));

  const name = staff
    ? session.user.email
    : `${rep?.legal_first_name ?? ''} ${rep?.legal_last_name ?? ''}`.trim() || session.user.email;

  const role = staff
    ? `${staff.role} (${staff.regions?.join(', ') || 'none'})`
    : 'Approved Rep';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow p-8 mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold">Welcome, {name}!</h1>
              <p className="text-lg text-indigo-600">Role: {role}</p>
            </div>
            <form action="/auth/signout" method="post">
              <button className="px-5 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition">
                Sign Out
              </button>
            </form>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* ==== REPS MANAGEMENT ==== */}
          {staff?.role === 'owner' && (
            <Link href="/portal/reps/company" className="p-6 bg-purple-600 text-white rounded-xl shadow hover:shadow-xl transition">
              <h3 className="text-xl font-bold">Company Reps</h3>
              <p className="opacity-90">All regions – owner only</p>
            </Link>
          )}
          {(staff?.role === 'regional' || staff?.role === 'owner') && (
            <Link href="/portal/reps/region" className="p-6 bg-blue-600 text-white rounded-xl shadow hover:shadow-xl transition">
              <h3 className="text-xl font-bold">My Region Reps</h3>
              <p className="opacity-90">Your assigned regions</p>
            </Link>
          )}

          {/* Documents Card (keep your existing one or add this) */}
          <Link href="/portal/documents" className="p-6 bg-green-600 text-white rounded-xl shadow hover:shadow-xl transition">
            <h3 className="text-xl font-bold">Documents</h3>
            <p className="opacity-90">ID, W-9, submissions</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
