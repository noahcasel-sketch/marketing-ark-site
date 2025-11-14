import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  const url = new URL(req.url);
  const id = url.searchParams.get('id');

  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  // 1. Get pending rep
  const { data: pending, error: fetchErr } = await supabase
    .from('pending_reps')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchErr || !pending) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // 2. Create user in auth + insert into reps
  const { data: user, error: authErr } = await supabase.auth.admin.createUser({
    email: pending.email,
    email_confirm: true,
    user_metadata: { full_name: `${pending.legal_first_name} ${pending.legal_last_name}` }
  });

  if (authErr) return NextResponse.json({ error: authErr.message }, { status: 500 });

  const { error: insertErr } = await supabase
    .from('reps')
    .insert({
      id: user.user.id,
      legal_first_name: pending.legal_first_name,
      legal_last_name: pending.legal_last_name,
      email: pending.email,
      phone: pending.phone,
      region_code: pending.region_code,
      status: 'active',
      approved_at: new Date().toISOString()
    });

  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

  // 3. Delete from pending
  await supabase.from('pending_reps').delete().eq('id', id);

  // 4. Send password reset
  await supabase.auth.resetPasswordForEmail(pending.email, {
    redirectTo: 'https://www.marketing-ark.com/auth/reset'
  });

  return NextResponse.redirect(new URL(req.headers.get('referer') ?? '/portal', req.url));
}
