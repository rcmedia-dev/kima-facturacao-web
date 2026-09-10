/**
 * Autenticação Própria — Kima Facturação
 *
 * Login com código da empresa + email + senha.
 * Sessão via cookie criptografado (kima-session).
 * Admin (owner) tem todas as permissões; Funcionário tem apenas as atribuídas.
 */

import { cookies } from 'next/headers';
import { db } from '@/db/client';
import type { Sessao, Permission, UserPermissions } from '@/lib/types';
import { ALL_PERMISSIONS } from '@/lib/permissions';

const SESSION_COOKIE = 'kima-session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 dias

// ══════════════════════════════════════════════════════════════════════════════
// CIPHER — Simples para dev (base64). Em produção usar JWT ou AES.
// ══════════════════════════════════════════════════════════════════════════════

function encrypt(data: Sessao): string {
  return Buffer.from(JSON.stringify(data)).toString('base64url');
}

function decrypt(token: string): Sessao | null {
  try {
    const json = Buffer.from(token, 'base64url').toString('utf-8');
    const data = JSON.parse(json);
    if (!data.userId || !data.companyId || !data.email) return null;
    return data as Sessao;
  } catch {
    return null;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// HASH DE SENHA — bcrypt via Web Crypto (compatível com mock)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Gera hash da senha. Em mock mode, usa hash simples para comparação.
 * Em produção, usar bcrypt via lib externa.
 */
export async function hashSenha(senha: string): Promise<string> {
  const useMock = process.env.NEXT_PUBLIC_USE_MOCK_DB === 'true';
  if (useMock) {
    // Mock: prefixo simples para identificar hashes
    return `mock:${senha}`;
  }
  // Produção: hash real com Web Crypto (SHA-256 + salt)
  const encoder = new TextEncoder();
  const data = encoder.encode(senha + process.env.AUTH_SALT || 'kima-facturacao-salt');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verifica se a senha corresponde ao hash.
 */
export async function verificarSenha(senha: string, hash: string): Promise<boolean> {
  const useMock = process.env.NEXT_PUBLIC_USE_MOCK_DB === 'true';
  if (useMock) {
    return hash === `mock:${senha}`;
  }
  const novoHash = await hashSenha(senha);
  return novoHash === hash;
}

// ══════════════════════════════════════════════════════════════════════════════
// SESSÃO — Cookie criptografado
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Cria sessão e seta cookie. Usar em API routes (tem acesso a Response).
 */
export function criarSessaoCookie(sessao: Sessao): string {
  return encrypt(sessao);
}

/**
 * Lê a sessão a partir do cookie (server-side).
 */
export async function obterSessao(): Promise<Sessao | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;
    if (!token) return null;
    return decrypt(token);
  } catch {
    return null;
  }
}

/**
 * Lê a sessão a partir de um Request (para API routes).
 */
export function obterSessaoDoRequest(request: Request): Sessao | null {
  const cookieHeader = request.headers.get('cookie') || '';
  const match = new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`).exec(cookieHeader);
  if (!match) return null;
  return decrypt(match[1]);
}

/**
 * Termina sessão (limpa cookie).
 */
export function terminarSessaoCookie(): string {
  return ''; // valor vazio para clear
}

// ══════════════════════════════════════════════════════════════════════════════
// QUERY HELPERS — Acesso à BD (mock ou real)
// ══════════════════════════════════════════════════════════════════════════════

async function getDbClient() {
  const useMock = process.env.NEXT_PUBLIC_USE_MOCK_DB === 'true';
  if (useMock) {
    const { createMockClient } = await import('@/db/mocks/mock-client');
    return createMockClient();
  }
  const { createClient } = await import('@supabase/supabase-js');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * Busca empresa por company_code.
 */
export async function buscarEmpresaPorCodigo(
  companyCode: string
): Promise<{ id: string; name: string; ownerId: string } | null> {
  const dbClient = await getDbClient();
  const { data, error } = await dbClient
    .from('companies')
    .select('id, name, owner_id')
    .eq('company_code', companyCode.toUpperCase())
    .maybeSingle();

  if (error || !data) return null;
  return { id: data.id, name: data.name, ownerId: data.owner_id };
}

/**
 * Busca utilizador por company_id + email.
 */
export async function buscarUtilizador(
  companyId: string,
  email: string
): Promise<{
  id: string;
  email: string;
  fullName: string | null;
  passwordHash: string | null;
  isOwner: boolean;
  status: string;
} | null> {
  const dbClient = await getDbClient();
  const { data, error } = await dbClient
    .from('users')
    .select('id, email, full_name, password_hash, is_owner, status')
    .eq('company_id', companyId)
    .eq('email', email.toLowerCase().trim())
    .maybeSingle();

  if (error || !data) return null;
  return {
    id: data.id,
    email: data.email,
    fullName: data.full_name,
    passwordHash: data.password_hash,
    isOwner: data.is_owner,
    status: data.status,
  };
}

/**
 * Actualiza senha de um utilizador.
 */
export async function atualizarSenha(
  userId: string,
  passwordHash: string
): Promise<boolean> {
  const dbClient = await getDbClient();
  const { error } = await dbClient
    .from('users')
    .update({ password_hash: passwordHash, status: 'ativo', updated_at: new Date().toISOString() })
    .eq('id', userId);

  return !error;
}

/**
 * Busca permissões de um utilizador.
 * Admin (isOwner) → todas as permissões.
 * Funcionário → apenas as atribuídas.
 */
export async function buscarPermissoes(
  userId: string,
  companyId: string,
  isOwner: boolean
): Promise<Permission[]> {
  if (isOwner) {
    return ALL_PERMISSIONS;
  }

  const dbClient = await getDbClient();
  const { data, error } = await dbClient
    .from('user_permissions')
    .select('permission_code')
    .eq('user_id', userId)
    .eq('company_id', companyId);

  if (error || !data) return [];
  return data.map((row: any) => row.permission_code as Permission);
}

/**
 * Devolve permissões finais de um utilizador (para API /auth/permissions).
 */
export async function obterPermissoesCompletas(
  userId: string,
  companyId: string
): Promise<UserPermissions | null> {
  const user = await buscarUtilizadorById(userId, companyId);
  if (!user) return null;

  const permissions = await buscarPermissoes(userId, companyId, user.isOwner);

  return {
    userId: user.id,
    companyId,
    isOwner: user.isOwner,
    permissions,
  };
}

/**
 * Busca utilizador por ID.
 */
async function buscarUtilizadorById(
  userId: string,
  companyId: string
): Promise<{
  id: string;
  isOwner: boolean;
} | null> {
  const dbClient = await getDbClient();
  const { data, error } = await dbClient
    .from('users')
    .select('id, is_owner')
    .eq('id', userId)
    .eq('company_id', companyId)
    .maybeSingle();

  if (error || !data) return null;
  return { id: data.id, isOwner: data.is_owner };
}
