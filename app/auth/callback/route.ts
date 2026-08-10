import type { NextRequest } from 'next/server';
import { handleSsoCallback } from '@rcmedia-dev/kima-sdk';

export async function GET(request: NextRequest) {
  return handleSsoCallback(request);
}
