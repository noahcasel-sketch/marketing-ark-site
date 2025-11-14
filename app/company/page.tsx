import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function CompanyPage() {
  const supabase = createServerComponentClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/login');

  const { data: pending } = await supabase
    .from('pending_reps')
    .select('id, name, company')  // <-- Use 'name'
    .order('company');

  return (
    <div className="p-6 text-white">
      <h1 className="text-2xl font-bold mb-6">Pending Reps by Company</h1>
      {pending?.length ? (
        <div className="space-y-4">
          {pending.map((rep) => (
            <div key={rep.id} className="bg-gray-800 p-4 rounded-lg flex justify-between items-center">
              <div>
                <p><strong>{rep.name}</strong> – {rep.company}</p>
              </div>
              <button className="bg-green-600 px-4 py-2 rounded hover:bg-green-700">Approve</button>
            </div>
          ))}
        </div>
      ) : (
        <p>No pending reps.</p>
      )}
    </div>
  );
}
