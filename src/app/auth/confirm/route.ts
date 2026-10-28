import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { siteURL } from '@/lib/supabase/config';
export async function GET(request: NextRequest) {
  const token_hash = request.nextUrl.searchParams.get('token_hash');
  const type = request.nextUrl.searchParams.get('type');
  if (token_hash && (type === 'signup' || type === 'recovery' || type === 'email')) {
    const db = await createClient();
    const { error } = await db.auth.verifyOtp({ type, token_hash });
    if (!error)
      return NextResponse.redirect(
        new URL(type === 'recovery' ? '/redefinir-senha' : '/painel', siteURL()),
      );
  }
  return NextResponse.redirect(new URL('/entrar?authError=1', siteURL()));
}
