// app/auth/callback/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')

  const redirectUrl = new URL('/portal', url)
  if (!code) {
    const back = new URL('/login', url)
    back.searchParams.set('error', 'missing_code')
    return NextResponse.redirect(back)
  }

  // Create the response we'll return (cookies will be written onto this)
  const res = NextResponse.redirect(redirectUrl)

  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          res.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          res.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    const back = new URL('/login', url)
    back.searchParams.set('error', error.message)
    return NextResponse.redirect(back)
  }

  return res
}
