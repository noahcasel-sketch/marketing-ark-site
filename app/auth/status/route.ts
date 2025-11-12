// app/auth/status/route.ts
import { NextResponse } from 'next/server'
import { supabaseServer } from '../../../lib/supabaseServer'

export async function GET() {
  const supabase = supabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  return NextResponse.json({ email: user?.email ?? null })
}
