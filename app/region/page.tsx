import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function RegionPage() {
  const supabase = createServerComponentClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/login');

  const { data: reps } = await supabase
    .from('reps')
    .select('id, name, region')  // <-- Use 'name' or 'full_name' – NOT first_name
    .order('region');

  return (
    <div className="p-6 text-white">
      <h1 className="text-2xl font-bold mb-6">Reps by Region</h1>
      {reps?.length ? (
        <div className="space-y-4">
          {reps.map((rep) => (
            <div key={rep.id} className="bg-gray-800 p-4 rounded-lg">
              <p><strong>{rep.name || 'Unnamed Rep'}</strong> – {rep.region || 'No Region'}</p>
            </div>
          ))}
        </div>
      ) : (
        <p>No reps found.</p>
      )}
    </div>
  );
}
