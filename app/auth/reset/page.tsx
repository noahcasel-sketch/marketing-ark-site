import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const supabase = createServerComponentClient({ cookies });
  const formData = await request.formData();
  const password = formData.get('password') as string;

  if (!password) return new Response('Missing password', { status: 400 });

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return new Response(error.message, { status: 500 });

  redirect('/portal');
}

export default async function ResetPassword() {
  const supabase = createServerComponentClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/login');

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full">
        <h1 className="text-2xl font-bold mb-4">Set Your Password</h1>
        <form action="/auth/reset" method="post" className="space-y-4">
          <input
            type="password"
            name="password"
            placeholder="Enter new password"
            required
            minLength={6}
            className="w-full px-4 py-2 border rounded-lg"
          />
          <button
            type="submit"
            className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700"
          >
            Save Password
          </button>
        </form>
      </div>
    </div>
  );
}
