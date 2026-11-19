import type { SupabaseClient, User } from '@supabase/supabase-js';

import { db } from '@/db/client';
import {
  createSupabaseRequestClient,
  getRequestCookie,
  getRequestAuthSource,
} from '@/lib/supabase-request';
import type { SupabaseAuthSource } from '@/lib/auth-source';

export interface CompanyAccess {
  company_id: string;
  role: string | null;
  source: 'hub' | 'employee';
}

export interface CompanyAccessOption {
  id: string;
  name: string;
  role: string | null;
}

interface CompanyModule {
  company_id: string;
  status: string | null;
  expires_at: string | null;
}

export interface SupabaseAuthContext {
  supabase: SupabaseClient;
  user: User | null;
  authSource: SupabaseAuthSource;
  companyAccess: CompanyAccess[];
  activeCompanyAccess: CompanyAccess | null;
}

const MODULE_KEYS = Array.from(
  new Set([
    process.env.NEXT_PUBLIC_KIMA_MODULE_KEY || 'faturas',
    'faturas',
    'facturas',
    'facturacao',
    'fatura',
    'factura',
  ])
);

function isActiveModule(status: string | null, expiresAt: string | null): boolean {
  const normalizedStatus = (status || '').trim().toLowerCase();
  if (!['ativo', 'active', 'approved', 'aprovado'].includes(normalizedStatus)) {
    return false;
  }
  if (!expiresAt) return true;

  const expiration = new Date(expiresAt).getTime();
  return Number.isFinite(expiration) && expiration >= Date.now();
}

export function isAdminRole(role: string | null): boolean {
  return ['admin', 'administrator', 'owner'].includes(
    (role || '').trim().toLowerCase()
  );
}

export async function getSupabaseAuthContext(
  request: Request,
  response?: import('next/server').NextResponse,
  authSourceOverride?: SupabaseAuthSource
): Promise<SupabaseAuthContext> {
  const authSource = authSourceOverride || getRequestAuthSource(request);
  const supabase = createSupabaseRequestClient(request, response, authSource);
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (
    authError &&
    authError.status !== 401 &&
    authError.name !== 'AuthSessionMissingError'
  ) {
    throw new Error(authError.message);
  }

  const user = authData.user;
  if (!user) {
    return {
      supabase,
      user: null,
      authSource,
      companyAccess: [],
      activeCompanyAccess: null,
    };
  }

  const membershipsResult =
    authSource === 'hub'
      ? await supabase
          .schema('public')
          .from('memberships')
          .select('company_id, role')
          .eq('user_id', user.id)
      : { data: [], error: null };
  const { data: memberships, error: membershipsError } = membershipsResult;

  if (membershipsError) {
    throw new Error(
      `Não foi possível verificar as empresas do utilizador: ${membershipsError.message}`
    );
  }

  const hubAccess = (memberships || []).map((membership: {
    company_id: string;
    role: string | null;
  }) => ({ ...membership, source: 'hub' as const }));
  const hubCompanyIds = new Set(
    hubAccess.map((membership) => membership.company_id)
  );
  const { data: employeeRecords, error: employeeError } = await db
    .from('employees')
    .select('company_id')
    .eq('user_id', user.id)
    .eq('auth_source', authSource)
    .eq('status', 'ativo');

  if (employeeError) {
    throw new Error(
      `Não foi possível verificar os acessos de funcionário: ${employeeError.message}`
    );
  }

  const employeeAccess = (employeeRecords || [])
    .filter((employee: { company_id: string }) =>
      authSource === 'faturas' || !hubCompanyIds.has(employee.company_id)
    )
    .map((employee: { company_id: string }) => ({
      company_id: employee.company_id,
      role: 'employee',
      source: 'employee' as const,
    }));
  const companyAccess = [...hubAccess, ...employeeAccess];

  const activeCompanyId = getRequestCookie(request, 'kima-company-id');
  const activeCompanyAccess = activeCompanyId
    ? companyAccess.find((access) => access.company_id === activeCompanyId) || null
    : companyAccess.length === 1
      ? companyAccess[0]
      : null;

  return { supabase, user, authSource, companyAccess, activeCompanyAccess };
}

export async function getAccessibleCompanies(
  context: SupabaseAuthContext
): Promise<CompanyAccessOption[]> {
  if (!context.user || context.companyAccess.length === 0) return [];

  const companyIds = Array.from(
    new Set(context.companyAccess.map((access) => access.company_id))
  );

  const [{ data: companies, error: companiesError }, { data: modules, error: modulesError }] =
    await Promise.all([
      db
        .schema('public')
        .from('companies')
        .select('id, name, status')
        .in('id', companyIds),
      db
        .schema('public')
        .from('company_modules')
        .select('company_id, module_key, status, expires_at')
        .in('company_id', companyIds)
        .in('module_key', MODULE_KEYS),
    ]);

  if (companiesError) {
    throw new Error(`Não foi possível carregar as empresas: ${companiesError.message}`);
  }
  if (modulesError) {
    throw new Error(`Não foi possível verificar as subscrições: ${modulesError.message}`);
  }

  const activeCompanyIds = new Set(
    (modules || [])
      .filter((module: CompanyModule) =>
        isActiveModule(module.status, module.expires_at)
      )
      .map((module: CompanyModule) => module.company_id)
  );

  const companyMap = new Map<string, { name: string; status: string | null }>(
    (companies || []).map((company: {
      id: string;
      name: string | null;
      status: string | null;
    }) => [
      company.id,
      {
        name: company.name || 'Empresa',
        status: company.status,
      },
    ] as const)
  );

  return context.companyAccess
    .filter((access) => {
      const company = companyMap.get(access.company_id);
      const status = (company?.status || '').trim().toLowerCase();
      return (
        Boolean(company) &&
        activeCompanyIds.has(access.company_id) &&
        (!status || ['ativo', 'active'].includes(status))
      );
    })
    .map((access) => {
      const company = companyMap.get(access.company_id);
      return {
        id: access.company_id,
        name: company?.name || 'Empresa',
        role: access.role,
      };
    });
}

export async function hasActiveCompanyModuleAccess(
  companyId: string
): Promise<boolean> {
  const [
    { data: company, error: companyError },
    { data: modules, error: moduleError },
  ] = await Promise.all([
    db
      .schema('public')
      .from('companies')
      .select('status')
      .eq('id', companyId)
      .maybeSingle(),
    db
      .schema('public')
      .from('company_modules')
      .select('status, expires_at')
      .eq('company_id', companyId)
      .in('module_key', MODULE_KEYS),
  ]);

  if (companyError) {
    throw new Error(`Não foi possível verificar a empresa: ${companyError.message}`);
  }
  if (moduleError) {
    throw new Error(`Não foi possível verificar a subscrição: ${moduleError.message}`);
  }
  if (!company) return false;

  const companyStatus = (company.status || '').trim().toLowerCase();
  if (companyStatus && !['ativo', 'active'].includes(companyStatus)) {
    return false;
  }

  return (modules || []).some((module: {
    status: string | null;
    expires_at: string | null;
  }) => isActiveModule(module.status, module.expires_at));
}
