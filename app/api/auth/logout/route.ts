import { NextResponse, type NextRequest } from 'next/server';

import {
  clearAuthSourceCookie,
  clearCompanyContextCookie,
  createSupabaseRequestClient,
} from '@/lib/supabase-request';

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ success: true });

  try {
    const supabase = createSupabaseRequestClient(request, response);
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('[API /auth/logout]', error.message);
      return NextResponse.json(
        { error: 'Não foi possível terminar a sessão.' },
        { status: 500 }
      );
    }

    clearCompanyContextCookie(response, request);
    clearAuthSourceCookie(response, request);
    return response;
  } catch (error: unknown) {
    console.error('[API /auth/logout]', error);
    return NextResponse.json(
      { error: 'Não foi possível terminar a sessão.' },
      { status: 500 }
    );
  }
}
