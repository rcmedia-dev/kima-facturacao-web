/**
 * Helper para extrair o contexto da empresa ativa do cookie global do Kima Hub.
 * O cookie `kima-company-id` é definido pela rota de callback SSO e garante que
 * cada empresa/pessoa só acessa os próprios dados.
 */

export function getCompanyId(request: Request): string | null {
  try {
    const nextReq = request as unknown as {
      cookies?: { get?: (name: string) => { value?: string } | undefined };
    };
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

/**
 * Valida que o utilizador autenticado é membro da empresa ativa.
 * Sem isto, bastaria forjar o cookie `kima-company-id` para ler os
 * clientes/artigos de outra empresa (IDOR). Usar nas rotas de API
 * antes de qualquer query.
 */
export async function assertMembership(companyId: string): Promise<void> {
  const { usuarioAtual } = await import('@/lib/session');
  const user = await usuarioAtual();
  if (!user) {
    throw Object.assign(new Error('Não autenticado. Faça login no Kima Hub.'), { status: 401 });
  }
  const { createClient } = await import('@supabase/supabase-js');
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data, error } = await admin
    .from('memberships')
    .select('company_id')
    .eq('user_id', user.id)
    .eq('company_id', companyId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) {
    throw Object.assign(new Error('Sem acesso a esta empresa.'), { status: 403 });
  }
}

/**
 * Extrai o company_id do cookie ou resolve automaticamente pela membership real
 * do utilizador autenticado. Garante isolamento multiempresa e evita bloqueios
 * causados por cookies obsoletos ou ausentes.
 */
export async function requireCompanyMembership(request: Request): Promise<string> {
  const { usuarioAtual } = await import('@/lib/session');
  const user = await usuarioAtual();
  if (!user) {
    throw Object.assign(new Error('Não autenticado. Faça login no Kima Hub.'), { status: 401 });
  }

  const { createClient } = await import('@supabase/supabase-js');
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const cookieCompanyId = getCompanyId(request);

  // 1. Se veio um company_id no cookie, verificar se o utilizador autenticado é membro
  if (cookieCompanyId) {
    const { data: memberData } = await admin
      .from('memberships')
      .select('company_id')
      .eq('user_id', user.id)
      .eq('company_id', cookieCompanyId)
      .maybeSingle();

    if (memberData?.company_id) {
      return memberData.company_id;
    }
    // Se o cookie apontava para outra empresa (ex: resíduo de sessão anterior),
    // prossegue para resolver a empresa correta do utilizador abaixo.
  }

  // 2. Se o cookie não veio ou não pertence ao utilizador, resolve a empresa ativa do utilizador
  const { data: userMemberships, error } = await admin
    .from('memberships')
    .select('company_id')
    .eq('user_id', user.id)
    .limit(1);

  if (error) throw new Error(error.message);

  if (userMemberships && userMemberships.length > 0) {
    return userMemberships[0].company_id;
  }

  // 3. Utilizador não possui vínculo com nenhuma empresa
  throw Object.assign(
    new Error('Sem empresa associada a este utilizador. Configure a sua empresa no Kima Hub.'),
    { status: 403 }
  );
}