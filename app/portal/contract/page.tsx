import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function ContractPage() {
  const supabase = createServerComponentClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/login');

  return (
    <div className="p-6 text-white">
      <h1 className="text-2xl font-bold mb-6">Contract Templates</h1>
      <p>Contract sending coming soon. Use Resend Reset for now.</p>
    </div>
  );
}
