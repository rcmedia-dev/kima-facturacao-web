import type { NextRequest } from 'next/server';
import { createKimaMiddleware } from '@rcmedia-dev/kima-sdk';

export async function proxy(request: NextRequest) {
  return createKimaMiddleware({
    moduleKey: 'faturas',
  })(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|mmap|json|txt|xml|woff2?|ttf|eot|otf|webmanifest)$).*)',
  ],
};
