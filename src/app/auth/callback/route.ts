import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { safeNext, siteURL } from '@/lib/supabase/config';
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  if (code) {
    const db = await createClient();
    const { error } = await db.auth.exchangeCodeForSession(code);
    if (!error)
      return NextResponse.redirect(
        new URL(safeNext(request.nextUrl.searchParams.get('next')), siteURL()),
      );
  }
  return NextResponse.redirect(new URL('/entrar?authError=1', siteURL()));
}
