import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function RegionPage() {
  const supabase = createServerComponentClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/login');

  const { data: pending } = await supabase
    .from('pending_reps')
    .select('id, legal_first_name, legal_last_name, region_code')
    .order('created_at', { ascending: false });

  return (
    <div className="p-6 text-white">
      <h1 className="text-2xl font-bold mb-6">Pending Reps (Region View)</h1>
      {pending?.length ? (
        <div className="space-y-4">
          {pending.map((rep) => (
            <div key={rep.id} className="bg-gray-800 p-4 rounded-lg flex justify-between items-center">
              <div>
                <p className="font-medium">{rep.legal_first_name} {rep.legal_last_name}</p>
                <p className="text-sm text-gray-400">Region: {rep.region_code}</p>
              </div>
              <form action={`/portal/api/reps/approve?id=${rep.id}`} method="post">
                <button className="bg-green-600 px-4 py-2 rounded hover:bg-green-700 transition">
                  Approve
                </button>
              </form>
            </div>
          ))}
        </div>
      ) : (
        <p>No pending reps.</p>
      )}
    </div>
  );
}
