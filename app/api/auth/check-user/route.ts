import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { error: 'A verificação de contas é gerida pelo Kima Hub.' },
    { status: 410 }
  );
}
