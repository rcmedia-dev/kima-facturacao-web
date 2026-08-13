/**
 * Helper para extrair o contexto da empresa ativa do cookie global do Kima Hub.
 * O cookie `kima-company-id` é definido pela rota de callback SSO e garante que
 * cada empresa/pessoa só acessa os próprios dados.
 */

export function getCompanyId(request: Request): string | null {
  try {
    const nextReq = request as any;
    const fromApi = nextReq?.cookies?.get?.('kima-company-id')?.value;
    if (fromApi) return fromApi;

    const cookieHeader = request.headers.get('cookie') || '';
    const match = /(?:^|;\s*)kima-company-id=([^;]+)/i.exec(cookieHeader);
    if (match) return decodeURIComponent(match[1]);

    // Fallback dev/standalone: usado quando o app roda isolado do Kima Hub
    // (sem cookie de SSO). Definido apenas em .env.local — não usar em produção.
    return process.env.NEXT_PUBLIC_KIMA_FALLBACK_COMPANY_ID || null;
  } catch {
    return process.env.NEXT_PUBLIC_KIMA_FALLBACK_COMPANY_ID || null;
  }
}

export function requireCompanyId(request: Request): string {
  const companyId = getCompanyId(request);
  if (!companyId) {
    throw new Error('Sem empresa ativa no contexto. Faça login no Kima Hub.');
  }
  return companyId;
}