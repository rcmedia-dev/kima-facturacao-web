import { NextResponse, type NextRequest } from 'next/server';

import {
  getAccessibleCompanies,
  getSupabaseAuthContext,
} from '@/lib/auth-context';
import {
  getRequestAuthSource,
  setAuthSourceCookie,
  setCompanyContextCookie,
} from '@/lib/supabase-request';
import type { SupabaseAuthSource } from '@/lib/auth-source';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const requestedCompanyId =
      body && typeof body === 'object' && typeof body.companyId === 'string'
        ? body.companyId
        : null;
    const requestedAuthSource =
      body &&
      typeof body === 'object' &&
      (body.authSource === 'hub' || body.authSource === 'faturas')
        ? (body.authSource as SupabaseAuthSource)
        : undefined;
    const authSource = requestedAuthSource || getRequestAuthSource(request);

    const context = await getSupabaseAuthContext(request, undefined, authSource);

    if (!context.user) {
      return NextResponse.json(
        { error: 'Inicie sessão para continuar.' },
        { status: 401 }
      );
    }

    if (context.companyAccess.length === 0) {
      const response = NextResponse.json(
        { error: 'Esta conta ainda não tem acesso a uma empresa no Kima Faturas.' },
        { status: 403 }
      );
      setAuthSourceCookie(response, request, authSource);
      return response;
    }

    const companies = await getAccessibleCompanies(context);
    if (companies.length === 0) {
      const response = NextResponse.json(
        { error: 'Nenhuma das suas empresas tem uma subscrição ativa do módulo Faturas.' },
        { status: 403 }
      );
      setAuthSourceCookie(response, request, authSource);
      return response;
    }

    const selectedCompany = requestedCompanyId
      ? companies.find((company) => company.id === requestedCompanyId)
      : companies.find(
          (company) => company.id === context.activeCompanyAccess?.company_id
        ) || (companies.length === 1 ? companies[0] : null);

    if (requestedCompanyId && !selectedCompany) {
      const response = NextResponse.json(
        { error: 'A empresa selecionada não tem acesso ativo a este módulo.' },
        { status: 403 }
      );
      setAuthSourceCookie(response, request, authSource);
      return response;
    }

    if (!selectedCompany) {
      const response = NextResponse.json({
        requiresCompanySelection: true,
        companies: companies.map(({ id, name }) => ({ id, name })),
      });
      setAuthSourceCookie(response, request, authSource);
      return response;
    }

    const response = NextResponse.json({
      success: true,
      companyId: selectedCompany.id,
      companyName: selectedCompany.name,
    });
    setCompanyContextCookie(response, request, selectedCompany.id);
    setAuthSourceCookie(response, request, authSource);
    return response;
  } catch (error: unknown) {
    console.error('[API /auth/context]', error);
    return NextResponse.json(
      { error: 'Não foi possível verificar o acesso à empresa e ao módulo.' },
      { status: 500 }
    );
  }
}
