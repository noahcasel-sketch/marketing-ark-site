import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Search } from 'lucide-react';
import { ApproveButton, DeactivateButton, ResendResetButton } from '../_components';

export const dynamic = 'force-dynamic';

const OWNER_EMAIL = 'noahcasel@marketing-ark.com';

type Rep = {
  id: string;
  legal_first_name: string;
  legal_last_name: string;
  email: string;
  phone: string;
  region_code: string;
  status: 'active' | 'inactive';
  approved_at: string | null;
  regions: { name: string };
};

export default async function CompanyPortal({
  searchParams,
}: {
  searchParams: { q?: string; region?: string; status?: string };
}) {
  const supabase = createServerComponentClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/login');

  if (session.user.email !== OWNER_EMAIL) {
    redirect('/portal?error=unauthorized');
  }

  let query = supabase
    .from('reps')
    .select('*, regions!inner(name)')
    .order('created_at', { ascending: false });

  if (searchParams.q) {
    const term = searchParams.q.toLowerCase();
    query = query.or(
      `legal_first_name.ilike.%${term}%,legal_last_name.ilike.%${term}%,email.ilike.%${term}%`
    );
  }
  if (searchParams.region) query = query.eq('region_code', searchParams.region);
  if (searchParams.status) query = query.eq('status', searchParams.status);

  const { data: reps, error } = await query;

  const { data: regionList } = await supabase.from('regions').select('code, name');

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow p-6">
        <h1 className="text-2xl font-bold mb-4">Company‑Wide Reps (Owner View)</h1>

        <form className="grid sm:grid-cols-4 gap-3 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <input
              name="q"
              placeholder="Search name / email"
              defaultValue={searchParams.q ?? ''}
              className="pl-10 w-full px-4 py-2 border rounded-lg"
            />
          </div>

          <select
            name="region"
            defaultValue={searchParams.region ?? ''}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="">All Regions</option>
            {regionList?.map((r) => (
              <option key={r.code} value={r.code}>
                {r.name}
              </option>
            ))}
          </select>

          <select
            name="status"
            defaultValue={searchParams.status ?? ''}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700">
            Apply
          </button>
        </form>

        {error ? (
          <p className="text-red-600">Error: {error.message}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Region</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reps?.map((rep: Rep) => (
                  <tr key={rep.id}>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {rep.legal_first_name} {rep.legal_last_name}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{rep.email}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{rep.regions.name}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          rep.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {rep.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm flex gap-2">
                      {rep.status === 'inactive' ? (
                        <ApproveButton repId={rep.id} />
                      ) : (
                        <>
                          <DeactivateButton repId={rep.id} />
                          <ResendResetButton email={rep.email} />
                        </>
                      )}
                    </td>
                  </tr>
                )) || []}
              </tbody>
            </table>

            {(!reps || reps.length === 0) && (
              <p className="text-center py-8 text-gray-500">
                No representatives match the current filters.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
