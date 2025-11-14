import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.has('code')) {
    // Magic link landed on homepage → send to callback
    return NextResponse.redirect(new URL('/auth/callback' + url.search, url.origin));
  }
  // Normal homepage – show your public page
  return NextResponse.next();
}
