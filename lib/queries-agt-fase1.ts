'use server';

/**
 * Camada de dados — FASE 1 · Segurança, Criptografia & Imutabilidade (AGT)
 *
 * Corresponde às tarefas T1.4 (certificação AGT), T1.5 (user tracking &
 * auditoria avançada) e à persistência da cadeia de hashes (T1.1) e da
 * assinatura JWS / payload QR (T1.2/T1.3).
 *
 * Apenas para código de servidor (API routes / server actions).
 */

import { db } from '@/db/client';
import { usuarioAtual } from '@/lib/session';
import { SOFTWARE_CERTIFICACAO_AGT } from '@/lib/constants';

export interface CamposSegurancaDocumento {
  hashAnterior: string | null;
  assinaturaJWS: string | null;
  qrPayload: string | null;
  assinadoPor: string | null;
  certAgtNumero?: string | null;
}

/**
 * Último hash da cadeia (T1.1 — chaining) para o mesmo tipo + série.
 * Devolve o hash do documento emitido mais recentemente (imutabilidade).
 */
export async function obterUltimoHashCadeia(
  companyId: string,
  tipo: string,
  serie: string
): Promise<string | null> {
  const { data, error } = await db
    .from('documentos')
    .select('hash')
    .eq('company_id', companyId)
    .eq('tipo', tipo)
    .eq('serie', serie)
    .not('hash', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data?.hash || null;
}

/** Persiste os campos de segurança (hash anterior, JWS, QR, utilizador) no documento. */
export async function persistirCamposSegurancaDocumento(
  companyId: string,
  documentoId: string,
  campos: CamposSegurancaDocumento
): Promise<void> {
  const { error } = await db
    .from('documentos')
    .update({
      hash_anterior: campos.hashAnterior ?? null,
      assinatura_jws: campos.assinaturaJWS ?? null,
      qr_payload: campos.qrPayload ?? null,
      assinado_por: campos.assinadoPor ?? null,
      cert_agt_numero: campos.certAgtNumero ?? null,
    })
    .eq('company_id', companyId)
    .eq('id', documentoId);

  if (error) throw new Error(error.message);
}

// ─── T1.2 · Gestão de chaves de assinatura ──────────────────────────────────

/** Chaves RSA-2048 da empresa para assinatura JWS (tabela `chaves_assinatura_agt`). */
export async function obterChavesAssinatura(companyId: string): Promise<{
  privateKeyPEM: string;
  publicKeyPEM: string;
} | null> {
  const { data, error } = await db
    .from('chaves_assinatura_agt')
    .select('private_key_pem, public_key_pem')
    .eq('company_id', companyId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data?.private_key_pem || !data?.public_key_pem) return null;
  return {
    privateKeyPEM: data.private_key_pem,
    publicKeyPEM: data.public_key_pem,
  };
}

/** Garante a existência do par de chaves da empresa (cria se não existir). */
export async function garantirChavesAssinatura(companyId: string): Promise<{
  privateKeyPEM: string;
  publicKeyPEM: string;
}> {
  const existentes = await obterChavesAssinatura(companyId);
  if (existentes) return existentes;

  const { gerarParDeChavesRSA } = await import('@/lib/crypto-engine');
  const par = await gerarParDeChavesRSA();

  const { error } = await db.from('chaves_assinatura_agt').insert({
    company_id: companyId,
    private_key_pem: par.privateKeyPEM,
    public_key_pem: par.publicKeyPEM,
    alg: 'RS256',
  });

  if (error) throw new Error(error.message);
  return par;
}

// ─── T1.4 · Número de Certificação AGT ──────────────────────────────────────

/** Lê o N.º do Certificado AGT das definições da empresa (R15). */
export async function obterNumeroCertificacaoAGT(companyId: string): Promise<string | null> {
  const { data, error } = await db
    .from('company_settings')
    .select('settings')
    .eq('company_id', companyId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  const settings = (data?.settings || {}) as Record<string, unknown>;
  // O N.º de certificação é uma propriedade FIXA do software (certificação da
  // Kima/AGT). Se ainda não estiver persistido, usa a constante da aplicação.
  return typeof settings.software_certificacao_numero === 'string' && settings.software_certificacao_numero
    ? settings.software_certificacao_numero
    : SOFTWARE_CERTIFICACAO_AGT;
}

/** Guarda o N.º do Certificado AGT nas definições da empresa (merge sobre o JSON). */
export async function atualizarNumeroCertificacaoAGT(
  companyId: string,
  numero: string
): Promise<void> {
  const { data: atual } = await db
    .from('company_settings')
    .select('settings')
    .eq('company_id', companyId)
    .maybeSingle();

  const settings = {
    ...((atual?.settings as Record<string, unknown>) || {}),
    software_certificacao_numero: numero,
  };

  const { error } = await db
    .from('company_settings')
    .upsert({ company_id: companyId, settings }, { onConflict: "company_id" });

  if (error) throw new Error(error.message);
}

// ─── T1.5 · User Tracking & Auditoria Avançada ──────────────────────────────

/**
 * Regista uma ação na tabela `logs_auditoria` com o utilizador autenticado
 * (via sessão Supabase), preenchendo também o `user_id` (R14/R6).
 */
export async function registarAuditoriaAGT(
  companyId: string,
  acao: string,
  entidade: string,
  entidadeId: string,
  detalhes?: {
    anteriores?: Record<string, unknown> | null;
    novas?: Record<string, unknown> | null;
  }
): Promise<void> {
  try {
    const user = await usuarioAtual();
    const { error } = await db.from('logs_auditoria').insert({
      company_id: companyId,
      user_id: user?.id ?? null,
      acao,
      entidade,
      entidade_id: entidadeId,
      alteracoes_anteriores: detalhes?.anteriores || null,
      alteracoes_novas: detalhes?.novas || null,
    });
    if (error) console.warn('Falha ao registar log de auditoria AGT:', error.message);
  } catch (e) {
    console.warn('Falha ao registar log de auditoria AGT:', e);
  }
}


