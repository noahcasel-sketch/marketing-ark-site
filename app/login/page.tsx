'use client';

import { createClient } from '@supabase/supabase-js';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRep, setIsRep] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: 'https://www.marketing-ark.com/auth/callback'
      }
    });

    if (error) setError(error.message);
    else alert('Magic link sent! Check your email.');
    setLoading(false);
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    else router.push('/portal');
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 p-8 rounded-xl shadow-lg max-w-md w-full text-white">
        <h1 className="text-2xl font-bold mb-6 text-center">Rep Portal Login</h1>

        <div className="flex justify-center mb-6">
          <button
            onClick={() => setIsRep(false)}
            className={`px-4 py-2 rounded-l-lg ${!isRep ? 'bg-indigo-600' : 'bg-gray-700'}`}
          >
            Staff (Magic Link)
          </button>
          <button
            onClick={() => setIsRep(true)}
            className={`px-4 py-2 rounded-r-lg ${isRep ? 'bg-indigo-600' : 'bg-gray-700'}`}
          >
            Rep (Password)
          </button>
        </div>

        <form onSubmit={isRep ? handlePasswordLogin : handleMagicLink} className="space-y-4">
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-2 bg-gray-700 rounded-lg text-white"
          />
          {isRep && (
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2 bg-gray-700 rounded-lg text-white"
            />
          )}
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? 'Sending...' : isRep ? 'Login with Password' : 'Send Magic Link'}
          </button>
        </form>

        {isRep && (
          <p className="text-center mt-4 text-sm">
            Forgot password? Use the <strong>Resend Reset</strong> button in the portal.
          </p>
        )}
      </div>
    </div>
  );
}
