import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { error: 'Use o login do Kima Hub ou as credenciais partilhadas do Supabase Auth.' },
    { status: 410 }
  );
}
