'use server';

/**
 * T2.2/T2.4 · Camada de dados da Fase 2 — fila de envio AGT e status de comunicação.
 * Apenas para código de servidor (API routes / server actions).
 * A estrutura está pronta; o cliente real é seleccionado em `lib/agt-client.ts`.
 */

import { db } from '@/db/client';

export interface FilaEnvioAGT {
  id: string;
  companyId: string;
  documentoId: string;
  estado: string;
  tentativas: number;
  maxTentativas: number;
  proximaTentativa: string;
  ultimoErro?: string | null;
  processadoEm?: string | null;
  criadoEm: string;
  numeroCompleto?: string;
  tipo?: string;
  total?: number;
}

/** Insere um documento na fila de envio (T2.2). Se já existir, não duplica. */
export async function enfileirarDocumentoAGT(
  companyId: string,
  documentoId: string
): Promise<void> {
  await db
    .from('fila_envio_agt')
    .upsert(
      { company_id: companyId, documento_id: documentoId, estado: 'Pendente' },
      { onConflict: 'documento_id' }
    );
}

/** Lista a fila de envio por empresa, com dados do documento (join). */
export async function obterFilaEnvioAGT(companyId: string): Promise<FilaEnvioAGT[]> {
  const { data, error } = await db
    .from('fila_envio_agt')
    .select(
      'id, company_id, documento_id, estado, tentativas, max_tentativas, ' +
        'proxima_tentativa, ultimo_erro, processado_em, criado_em, ' +
        'documentos:documentos!inner(numero_completo, tipo, total)'
    )
    .eq('company_id', companyId)
    .order('criado_em', { ascending: false });

  if (error) throw new Error(error.message);

  return (data || []).map((r: any) => ({
    id: r.id,
    companyId: r.company_id,
    documentoId: r.documento_id,
    estado: r.estado,
    tentativas: r.tentativas,
    maxTentativas: r.max_tentativas,
    proximaTentativa: r.proxima_tentativa,
    ultimoErro: r.ultimo_erro,
    processadoEm: r.processado_em,
    criadoEm: r.criado_em,
    numeroCompleto: r.documentos?.numero_completo,
    tipo: r.documentos?.tipo,
    total: r.documentos?.total != null ? Number(r.documentos.total) : undefined,
  }));
}

/** Marca um documento com o estado de comunicação AGT (T2.4). */
export async function atualizarStatusDocumentoAGT(
  companyId: string,
  documentoId: string,
  estado: string,
  erro?: string | null
): Promise<void> {
  const atualizacao: Record<string, unknown> = {
    status_agt: estado,
    erro_agt: erro ?? null,
    data_ultima_tentativa_agt: new Date().toISOString(),
  };
  if (estado === 'Transmitido') {
    atualizacao.data_transmissao_agt = new Date().toISOString();
  }
  const { error } = await db
    .from('documentos')
    .update(atualizacao)
    .eq('company_id', companyId)
    .eq('id', documentoId);
  if (error) throw new Error(error.message);
}

/** Marca o item da fila após uma tentativa de envio (T2.2 — retry). */
export async function atualizarItemFilaAGT(
  documentoId: string,
  estado: string,
  tentativas: number,
  proximaTentativa: string | null,
  ultimoErro?: string | null
): Promise<void> {
  const fimDeLinha = estado === 'Transmitido' || estado === 'Rejeitado';
  const { error } = await db
    .from('fila_envio_agt')
    .update({
      estado,
      tentativas,
      proxima_tentativa: proximaTentativa || null,
      ultimo_erro: ultimoErro ?? null,
      processado_em: fimDeLinha ? new Date().toISOString() : null,
      fim_de_linha,
      atualizado_em: new Date().toISOString(),
    })
    .eq('documento_id', documentoId);
  if (error) throw new Error(error.message);
}

/** Documentos pendentes de envio cuja próxima tentativa já pode correr. */
export async function obterPendentesEnvioAGT(
  companyId: string,
  limite = 20
): Promise<{ documentoId: string; numeroCompleto: string }[]> {
  const agora = new Date();
  const { data, error } = await db
    .from('fila_envio_agt')
    .select('documento_id, documentos:documentos!inner(numero_completo)')
    .eq('company_id', companyId)
    .in('estado', ['Pendente', 'Erro'])
    .lte('proxima_tentativa', agora.toISOString())
    .limit(limite);

  if (error) throw new Error(error.message);
  return (data || []).map((r: any) => ({
    documentoId: r.documento_id,
    numeroCompleto: r.documentos?.numero_completo,
  }));
}

/** Obtém o nº actual de tentativas de um item da fila (para backoff). */
export async function obterTentativasAtuais(documentoId: string): Promise<number> {
  const { data, error } = await db
    .from('fila_envio_agt')
    .select('tentativas, max_tentativas')
    .eq('documento_id', documentoId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data?.tentativas ?? 1;
}

/** Obtém os dados fiscais de um documento para montar o payload de transmissão. */
export async function obterDadosFiscaisDocumentoAGT(
  companyId: string,
  documentoId: string
): Promise<Record<string, unknown> | null> {
  const { data, error } = await db
    .from('documentos')
    .select(
      'numero_completo, tipo, serie, numero, data_emissao, subtotal, total_iva, total, ' +
        'hash, hash_anterior, assinatura_jws, qr_payload, cert_agt_numero, ' +
        'cliente:clientes!left(nif)'
    )
    .eq('company_id', companyId)
    .eq('id', documentoId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return {
    numeroCompleto: data.numero_completo,
    tipo: data.tipo,
    serie: data.serie,
    numero: String(data.numero),
    dataEmissao: data.data_emissao,
    subtotal: Number(data.subtotal),
    totalIVA: Number(data.total_iva),
    total: Number(data.total),
    hash: data.hash,
    hashAnterior: data.hash_anterior,
    assinaturaJWS: data.assinatura_jws,
    qrPayload: data.qr_payload,
    certAgtNumero: data.cert_agt_numero,
    nifCliente: (data as any).cliente?.nif,
  };
}