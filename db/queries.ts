'use server';

import { db } from './client';
import {
  Cliente,
  Fornecedor,
  Artigo,
  FaturaLinha,
  Documento,
  MovimentoStock,
  LogAuditoria,
  ConfiguracaoEmpresa,
  SerieNumeracao,
  Despesa,
} from '@/lib/types';
import { usuarioAtual } from '@/lib/session';
import { SOFTWARE_NOME, SOFTWARE_CERTIFICACAO_AGT } from '@/lib/constants';

/**
 * CAMADA DE DADOS — Kima Facturação
 * Consome apenas o Supabase (schema `kima_facturas`) via PostgREST.
 * Toda consulta é isolada por `company_id` (multiempresa/multitenant).
 * Os registos são devolvidos como "DTOs" no formato usado pela UI
 * (camelCase, números como `number`, datas como `Date`).
 */

const publicDb = db.schema('public');

// ─── Mapeadores (DB snake_case → UI camelCase) ───────────────────────────────

type LinhaRow = {
  id: string;
  artigo_id: string | null;
  descricao: string;
  quantidade: string | number;
  preco: string | number;
  taxa_iva: number;
  unidade_medida: string;
  total: string | number;
};

function mapearLinha(r: LinhaRow): FaturaLinha {
  return {
    id: r.id,
    artigoId: r.artigo_id || undefined,
    descricao: r.descricao,
    quantidade: Number(r.quantidade),
    preco: Number(r.preco),
    taxaIVA: Number(r.taxa_iva) as 0 | 7 | 14,
    unidadeMedida: r.unidade_medida as FaturaLinha['unidadeMedida'],
    total: Number(r.total),
  };
}

function mapearCliente(r: any): Cliente {
  return {
    id: r.id,
    nome: r.nome,
    tipo: r.tipo,
    nif: r.nif,
    morada: r.morada || '',
    telefone: r.telefone || '',
    email: r.email || '',
    responsavel: r.responsavel || undefined,
    inscricaoSocial: r.inscricao_social || undefined,
    dataCriacao: new Date(r.created_at),
    ultimaAtualizacao: new Date(r.updated_at || r.created_at),
    ativo: r.ativo,
  };
}

function mapearFornecedor(r: any): Fornecedor {
  return {
    id: r.id,
    nome: r.nome,
    nif: r.nif,
    morada: r.morada || '',
    telefone: r.telefone || '',
    email: r.email || '',
    bancaria: r.bancaria || undefined,
    dataCriacao: new Date(r.created_at),
    ultimaAtualizacao: new Date(r.updated_at || r.created_at),
    ativo: r.ativo,
  };
}

function mapearDespesa(r: any): Despesa {
  return {
    id: r.id,
    descricao: r.descricao,
    fornecedorId: r.fornecedor_id || undefined,
    categoria: r.categoria || 'Geral',
    valor: Number(r.valor),
    taxaIVA: Number(r.taxa_iva) as Despesa['taxaIVA'],
    total: Number(r.total),
    data: new Date(r.data),
    formaPagamento: r.forma_pagamento,
    estado: r.estado,
    observacoes: r.observacoes || undefined,
    dataCriacao: new Date(r.created_at),
    ultimaAtualizacao: new Date(r.updated_at || r.created_at),
  };
}

function mapearArtigo(r: any): Artigo {
  return {
    id: r.id,
    codigo: r.codigo,
    descricao: r.descricao,
    categoria: r.categoria || 'Geral',
    unidadeMedida: r.unidade_medida,
    preco: Number(r.preco),
    taxaIVA: Number(r.taxa_iva) as Artigo['taxaIVA'],
    stock: Number(r.stock ?? 0),
    stockMinimo: Number(r.stock_minimo ?? 0),
    fornecedorId: r.fornecedor_id || undefined,
    dataCriacao: new Date(r.created_at),
    ultimaAtualizacao: new Date(r.updated_at || r.created_at),
    ativo: r.ativo,
    tipo: r.tipo || 'Produto',
  };
}

function mapearDocumento(r: any): Documento {
  return {
    id: r.id,
    tipo: r.tipo,
    serie: r.serie,
    numero: String(r.numero),
    numeroCompleto: r.numero_completo,
    clienteId: r.cliente_id || undefined,
    fornecedorId: r.fornecedor_id || undefined,
    dataEmissao: new Date(r.data_emissao),
    dataVencimento: new Date(r.data_vencimento),
    formaPagamento: r.forma_pagamento,
    status: r.status,
    linhas: (r.linhas || []).map(mapearLinha),
    observacoes: r.observacoes || '',
    subtotal: Number(r.subtotal),
    totalIVA: Number(r.total_iva),
    total: Number(r.total),
    dataPagamento: r.data_pagamento ? new Date(r.data_pagamento) : undefined,
    hash: r.hash || undefined,
    hashAnterior: r.hash_anterior || undefined,
    assinaturaJWS: r.assinatura_jws || undefined,
    qrPayload: r.qr_payload || undefined,
    assinadoPor: r.assinado_por || undefined,
    certAgtNumero: r.cert_agt_numero || undefined,
    motivoIsencaoIVA: r.motivo_isencao_iva || undefined,
    dataOperacao: r.data_operacao ? new Date(r.data_operacao) : undefined,
    criadoPor: r.created_by || undefined,
    atualizadoPor: r.updated_by || undefined,
    dataAtualizacao: new Date(r.updated_at || r.created_at),
    documentoReferenciado: r.documento_referenciado || undefined,
    motivo: r.motivo || undefined,
    transporteViatura: r.transporte_viatura || undefined,
    transporteMatricula: r.transporte_matricula || undefined,
    transporteMotorista: r.transporte_motorista || undefined,
    statusAGT: r.status_agt || undefined,
    erroAGT: r.erro_agt || undefined,
    tentativasAGT: r.tentativas_agt || undefined,
    dataTransmissaoAGT: r.data_transmissao_agt ? new Date(r.data_transmissao_agt) : undefined,
  };
}

// ─── Auditoria ───────────────────────────────────────────────────────────────

async function registarAuditoria(
  companyId: string,
  acao: string,
  entidade: string,
  entidadeId: string,
  anteriores?: Record<string, unknown> | null,
  novas?: Record<string, unknown> | null
) {
  try {
    const user = await usuarioAtual();
    const { error } = await db.from('logs_auditoria').insert({
      company_id: companyId,
      user_id: user?.id ?? null,
      acao,
      entidade,
      entidade_id: entidadeId,
      alteracoes_anteriores: anteriores || null,
      alteracoes_novas: novas || null,
    });
    if (error) console.warn('Falha ao registar log de auditoria:', error.message);
  } catch (e) {
    console.warn('Falha ao registar log de auditoria:', e);
  }
}

// ─── CLIENTES ────────────────────────────────────────────────────────────────

export async function obterClientes(companyId: string) {
  const { data, error } = await db
    .from('clientes')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map(mapearCliente);
}

export async function obterClientePorId(companyId: string, id: string) {
  const { data, error } = await db
    .from('clientes')
    .select('*')
    .eq('company_id', companyId)
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapearCliente(data) : null;
}

export async function criarCliente(
  companyId: string,
  cliente: Omit<Cliente, 'id' | 'dataCriacao' | 'ultimaAtualizacao'>
) {
  const { data, error } = await db
    .from('clientes')
    .insert({
      company_id: companyId,
      nome: cliente.nome,
      tipo: cliente.tipo,
      nif: cliente.nif,
      morada: cliente.morada || null,
      telefone: cliente.telefone || null,
      email: cliente.email || null,
      responsavel: cliente.responsavel || null,
      inscricao_social: cliente.inscricaoSocial || null,
      ativo: cliente.ativo ?? true,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  await registarAuditoria(companyId, 'CRIAR', 'Cliente', data.id, null, data);
  return mapearCliente(data);
}

export async function atualizarCliente(
  companyId: string,
  id: string,
  cliente: Partial<Cliente>
) {
  const anteriores = await obterClientePorId(companyId, id);
  if (!anteriores) throw new Error('Cliente não encontrado');

  const { data, error } = await db
    .from('clientes')
    .update({
      nome: cliente.nome ?? anteriores.nome,
      tipo: cliente.tipo,
      nif: cliente.nif ?? anteriores.nif,
      morada: cliente.morada !== undefined ? cliente.morada || null : undefined,
      telefone: cliente.telefone !== undefined ? cliente.telefone || null : undefined,
      email: cliente.email !== undefined ? cliente.email || null : undefined,
      responsavel: cliente.responsavel !== undefined ? cliente.responsavel || null : undefined,
      inscricao_social: cliente.inscricaoSocial !== undefined ? cliente.inscricaoSocial || null : undefined,
      ativo: cliente.ativo,
    })
    .eq('company_id', companyId)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  await registarAuditoria(companyId, 'ATUALIZAR', 'Cliente', id, anteriores as any, data);
  return mapearCliente(data);
}

export async function deletarCliente(companyId: string, id: string) {
  const anteriores = await obterClientePorId(companyId, id);
  const { data, error } = await db
    .from('clientes')
    .delete()
    .eq('company_id', companyId)
    .eq('id', id);
  if (error) throw new Error(error.message);
  await registarAuditoria(companyId, 'DELETAR', 'Cliente', id, anteriores as any, null);
  return data;
}

// ─── FORNECEDORES ────────────────────────────────────────────────────────────

export async function obterFornecedores(companyId: string) {
  const { data, error } = await db
    .from('fornecedores')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map(mapearFornecedor);
}

export async function obterFornecedorPorId(companyId: string, id: string) {
  const { data, error } = await db
    .from('fornecedores')
    .select('*')
    .eq('company_id', companyId)
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapearFornecedor(data) : null;
}

export async function criarFornecedor(
  companyId: string,
  fornecedor: Omit<Fornecedor, 'id' | 'dataCriacao' | 'ultimaAtualizacao'>
) {
  const { data, error } = await db
    .from('fornecedores')
    .insert({
      company_id: companyId,
      nome: fornecedor.nome,
      nif: fornecedor.nif,
      morada: fornecedor.morada || null,
      telefone: fornecedor.telefone || null,
      email: fornecedor.email || null,
      bancaria: fornecedor.bancaria || null,
      ativo: fornecedor.ativo ?? true,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  await registarAuditoria(companyId, 'CRIAR', 'Fornecedor', data.id, null, data);
  return mapearFornecedor(data);
}

export async function atualizarFornecedor(
  companyId: string,
  id: string,
  fornecedor: Partial<Fornecedor>
) {
  const anteriores = await obterFornecedorPorId(companyId, id);
  if (!anteriores) throw new Error('Fornecedor não encontrado');

  const { data, error } = await db
    .from('fornecedores')
    .update({
      nome: fornecedor.nome ?? anteriores.nome,
      nif: fornecedor.nif ?? anteriores.nif,
      morada: fornecedor.morada !== undefined ? fornecedor.morada || null : undefined,
      telefone: fornecedor.telefone !== undefined ? fornecedor.telefone || null : undefined,
      email: fornecedor.email !== undefined ? fornecedor.email || null : undefined,
      bancaria: fornecedor.bancaria !== undefined ? fornecedor.bancaria || null : undefined,
      ativo: fornecedor.ativo,
    })
    .eq('company_id', companyId)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  await registarAuditoria(companyId, 'ATUALIZAR', 'Fornecedor', id, anteriores as any, data);
  return mapearFornecedor(data);
}

export async function deletarFornecedor(companyId: string, id: string) {
  const anteriores = await obterFornecedorPorId(companyId, id);
  const { data, error } = await db
    .from('fornecedores')
    .delete()
    .eq('company_id', companyId)
    .eq('id', id);
  if (error) throw new Error(error.message);
  await registarAuditoria(companyId, 'DELETAR', 'Fornecedor', id, anteriores as any, null);
  return data;
}

// ─── DESPESAS ────────────────────────────────────────────────────────────────

export async function obterDespesas(companyId: string) {
  const { data, error } = await db
    .from('despesas')
    .select('*')
    .eq('company_id', companyId)
    .order('data', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map(mapearDespesa);
}

export async function obterDespesaPorId(companyId: string, id: string) {
  const { data, error } = await db
    .from('despesas')
    .select('*')
    .eq('company_id', companyId)
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapearDespesa(data) : null;
}

export async function criarDespesa(
  companyId: string,
  despesa: Omit<Despesa, 'id' | 'dataCriacao' | 'ultimaAtualizacao' | 'total'>
) {
  const total = despesa.valor * (1 + despesa.taxaIVA / 100);
  const { data, error } = await db
    .from('despesas')
    .insert({
      company_id: companyId,
      descricao: despesa.descricao,
      fornecedor_id: despesa.fornecedorId || null,
      categoria: despesa.categoria || 'Geral',
      valor: String(despesa.valor),
      taxa_iva: despesa.taxaIVA,
      total: String(total),
      data: despesa.data.toISOString(),
      forma_pagamento: despesa.formaPagamento,
      estado: despesa.estado,
      observacoes: despesa.observacoes || null,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  await registarAuditoria(companyId, 'CRIAR', 'Despesa', data.id, null, data);
  return mapearDespesa(data);
}

export async function atualizarDespesa(
  companyId: string,
  id: string,
  despesa: Partial<Despesa>
) {
  const anteriores = await obterDespesaPorId(companyId, id);
  if (!anteriores) throw new Error('Despesa não encontrada');

  const valor = despesa.valor ?? anteriores.valor;
  const taxaIVA = despesa.taxaIVA ?? anteriores.taxaIVA;
  const total = valor * (1 + taxaIVA / 100);

  const { data, error } = await db
    .from('despesas')
    .update({
      descricao: despesa.descricao ?? anteriores.descricao,
      fornecedor_id: despesa.fornecedorId !== undefined ? despesa.fornecedorId || null : undefined,
      categoria: despesa.categoria !== undefined ? despesa.categoria : undefined,
      valor: despesa.valor !== undefined ? String(despesa.valor) : undefined,
      taxa_iva: despesa.taxaIVA,
      total: String(total),
      data: despesa.data ? despesa.data.toISOString() : undefined,
      forma_pagamento: despesa.formaPagamento,
      estado: despesa.estado,
      observacoes: despesa.observacoes !== undefined ? despesa.observacoes || null : undefined,
    })
    .eq('company_id', companyId)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  await registarAuditoria(companyId, 'ATUALIZAR', 'Despesa', id, anteriores as any, data);
  return mapearDespesa(data);
}

export async function deletarDespesa(companyId: string, id: string) {
  const anteriores = await obterDespesaPorId(companyId, id);
  const { data, error } = await db
    .from('despesas')
    .delete()
    .eq('company_id', companyId)
    .eq('id', id);
  if (error) throw new Error(error.message);
  await registarAuditoria(companyId, 'DELETAR', 'Despesa', id, anteriores as any, null);
  return data;
}

// ─── ARTIGOS ─────────────────────────────────────────────────────────────────

export async function obterArtigos(companyId: string) {
  const { data, error } = await db
    .from('artigos')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map(mapearArtigo);
}

export async function obterArtigoPorId(companyId: string, id: string) {
  const { data, error } = await db
    .from('artigos')
    .select('*')
    .eq('company_id', companyId)
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapearArtigo(data) : null;
}

async function gerarProximoCodigo(companyId: string, tipo: string): Promise<string> {
  const prefix = tipo === 'Serviço' ? 'SERV' : 'PROD';
  const { data } = await db
    .from('artigos')
    .select('codigo')
    .eq('company_id', companyId)
    .like('codigo', `${prefix}-%`)
    .order('codigo', { ascending: false })
    .limit(1);

  let proximoNumero = 1;
  if (data && data.length > 0) {
    const ultimoCodigo = data[0].codigo;
    const partes = ultimoCodigo.split('-');
    if (partes.length === 2) {
      const num = parseInt(partes[1], 10);
      if (!isNaN(num)) proximoNumero = num + 1;
    }
  }
  return `${prefix}-${String(proximoNumero).padStart(3, '0')}`;
}

export async function criarArtigo(
  companyId: string,
  artigo: Omit<Artigo, 'id' | 'dataCriacao' | 'ultimaAtualizacao'>
) {
  const codigo = artigo.codigo || await gerarProximoCodigo(companyId, artigo.tipo || 'Produto');
  const { data, error } = await db
    .from('artigos')
    .insert({
      company_id: companyId,
      codigo: codigo,
      descricao: artigo.descricao,
      categoria: artigo.categoria || 'Geral',
      tipo: artigo.tipo || 'Produto',
      unidade_medida: artigo.unidadeMedida || 'UN',
      preco: String(artigo.preco),
      taxa_iva: artigo.taxaIVA,
      stock: String(artigo.stock ?? 0),
      stock_minimo: String(artigo.stockMinimo ?? 0),
      fornecedor_id: artigo.fornecedorId || null,
      ativo: artigo.ativo ?? true,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  await registarAuditoria(companyId, 'CRIAR', 'Artigo', data.id, null, data);
  return mapearArtigo(data);
}

export async function atualizarArtigo(
  companyId: string,
  id: string,
  artigo: Partial<Artigo>
) {
  const anteriores = await obterArtigoPorId(companyId, id);
  if (!anteriores) throw new Error('Artigo não encontrado');

  const payload: any = {
    codigo: artigo.codigo ?? anteriores.codigo,
    descricao: artigo.descricao ?? anteriores.descricao,
    categoria: artigo.categoria !== undefined ? artigo.categoria : undefined,
    tipo: artigo.tipo,
    unidade_medida: artigo.unidadeMedida,
    preco: artigo.preco !== undefined ? String(artigo.preco) : undefined,
    taxa_iva: artigo.taxaIVA,
    stock: artigo.stock !== undefined ? String(artigo.stock) : undefined,
    stock_minimo: artigo.stockMinimo !== undefined ? String(artigo.stockMinimo) : undefined,
    fornecedor_id: artigo.fornecedorId !== undefined ? artigo.fornecedorId || null : undefined,
    ativo: artigo.ativo,
  };

  const { data, error } = await db
    .from('artigos')
    .update(payload)
    .eq('company_id', companyId)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  await registarAuditoria(companyId, 'ATUALIZAR', 'Artigo', id, anteriores as any, data);
  return mapearArtigo(data);
}

export async function deletarArtigo(companyId: string, id: string) {
  const anteriores = await obterArtigoPorId(companyId, id);
  const { data, error } = await db
    .from('artigos')
    .delete()
    .eq('company_id', companyId)
    .eq('id', id);
  if (error) throw new Error(error.message);
  await registarAuditoria(companyId, 'DELETAR', 'Artigo', id, anteriores as any, null);
  return data;
}

// ─── DOCUMENTOS ──────────────────────────────────────────────────────────────

export async function obterDocumentos(companyId: string, tipo?: string) {
  let query = db
    .from('documentos')
    .select('*, linhas:documento_linhas(*)')
    .eq('company_id', companyId);
  if (tipo) query = query.eq('tipo', tipo);
  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map(mapearDocumento);
}

export async function obterDocumentoPorId(companyId: string, id: string) {
  const { data, error } = await db
    .from('documentos')
    .select('*, cliente:clientes(*), fornecedor:fornecedores(*), linhas:documento_linhas(*)')
    .eq('company_id', companyId)
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;

  const doc = mapearDocumento(data);
  return {
    ...doc,
    cliente: data.cliente ? mapearCliente(data.cliente) : null,
    fornecedor: data.fornecedor ? mapearFornecedor(data.fornecedor) : null,
  } as Documento & { cliente: Cliente | null; fornecedor: Fornecedor | null };
}

export async function obterDocumentosPorPeriodo(
  companyId: string,
  dataInicio: Date,
  dataFim: Date
) {
  const { data, error } = await db
    .from('documentos')
    .select('*, linhas:documento_linhas(*)')
    .eq('company_id', companyId)
    .gte('data_emissao', dataInicio.toISOString())
    .lte('data_emissao', dataFim.toISOString())
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map(mapearDocumento);
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

let migrationDocRefTextAttempted = false;
async function tentarMigrarDocumentoReferenciadoText() {
  if (migrationDocRefTextAttempted) return;
  migrationDocRefTextAttempted = true;
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) return;
  try {
    await fetch('https://api.supabase.com/v1/projects/hpdesbvqqmdhxoksrvij/database/query', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: 'ALTER TABLE kima_facturas.documentos ALTER COLUMN documento_referenciado TYPE TEXT;'
      }),
    });
  } catch {
    // Ignorar se falhar
  }
}

export async function criarDocumento(
  companyId: string,
  documento: Omit<Documento, 'id' | 'numeroCompleto' | 'dataAtualizacao' | 'linhas'> & {
    linhas: FaturaLinha[];
  }
) {
  const numInt = parseInt(documento.numero, 10) || 1;
  const numeroCompleto = `${documento.serie}/${String(numInt).padStart(6, '0')}`;

  const payload: any = {
    company_id: companyId,
    tipo: documento.tipo,
    serie: documento.serie,
    numero: numInt,
    numero_completo: numeroCompleto,
    cliente_id: documento.clienteId || null,
    fornecedor_id: documento.fornecedorId || null,
    data_emissao: documento.dataEmissao.toISOString(),
    data_vencimento: documento.dataVencimento.toISOString(),
    forma_pagamento: documento.formaPagamento,
    status: documento.status,
    observacoes: documento.observacoes || null,
    subtotal: String(documento.subtotal),
    total_iva: String(documento.totalIVA),
    total: String(documento.total),
    data_pagamento: documento.dataPagamento ? documento.dataPagamento.toISOString() : null,
    documento_referenciado: documento.documentoReferenciado || null,
    motivo: documento.motivo || null,
    hash: documento.hash || null,
    hash_anterior: documento.hashAnterior || null,
    assinatura_jws: documento.assinaturaJWS || null,
    qr_payload: documento.qrPayload || null,
    assinado_por: documento.assinadoPor || null,
    cert_agt_numero: documento.certAgtNumero || null,
    motivo_isencao_iva: documento.motivoIsencaoIVA || null,
    data_operacao: documento.dataOperacao ? documento.dataOperacao.toISOString() : null,
    transporte_viatura: documento.transporteViatura || null,
    transporte_matricula: documento.transporteMatricula || null,
    transporte_motorista: documento.transporteMotorista || null,
  };

  let insertRes = await db
    .from('documentos')
    .insert(payload)
    .select()
    .single();

  // Caso o banco recuse por violação de check constraint (ex: tipo 'Recibo' não incluído na constraint antiga)
  if (insertRes.error && (insertRes.error.message.includes('check constraint') || insertRes.error.message.includes('violates check constraint'))) {
    await tentarAtualizarConstraintsTipoDocumento();
    insertRes = await db.from('documentos').insert(payload).select().single();
  }

  // Caso o banco recuse porque a coluna documento_referenciado é UUID e passamos o nº da fatura
  if (insertRes.error && insertRes.error.message.includes('invalid input syntax for type uuid')) {
    // 1. Tenta resolver o UUID da fatura referenciada
    if (documento.documentoReferenciado && !UUID_REGEX.test(documento.documentoReferenciado)) {
      const { data: docRef } = await db
        .from('documentos')
        .select('id')
        .eq('company_id', companyId)
        .eq('numero_completo', documento.documentoReferenciado)
        .maybeSingle();

      if (docRef?.id) {
        payload.documento_referenciado = docRef.id;
        insertRes = await db.from('documentos').insert(payload).select().single();
      }
    }

    // 2. Tenta alterar a coluna para TEXT via Supabase API se ainda persistir
    if (insertRes.error && insertRes.error.message.includes('invalid input syntax for type uuid')) {
      await tentarMigrarDocumentoReferenciadoText();
      insertRes = await db.from('documentos').insert(payload).select().single();
    }
  }

  if (insertRes.error) {
    console.error('Erro detalhado ao inserir documento no DB:', insertRes.error);
    throw new Error(insertRes.error.message);
  }
  const data = insertRes.data;

  if (documento.linhas && documento.linhas.length > 0) {
    const { error: linhasError } = await db.from('documento_linhas').insert(
      documento.linhas.map((l) => ({
        company_id: companyId,
        documento_id: data.id,
        artigo_id: (l.artigoId && UUID_REGEX.test(l.artigoId)) ? l.artigoId : null,
        descricao: l.descricao,
        quantidade: String(l.quantidade),
        preco: String(l.preco),
        taxa_iva: l.taxaIVA,
        unidade_medida: l.unidadeMedida || 'UN',
        total: String(l.total),
      }))
    );
    if (linhasError) throw new Error(linhasError.message);
  }

  await registarAuditoria(companyId, 'CRIAR', 'Documento', data.id, null, data);
  return obterDocumentoPorId(companyId, data.id);
}

export async function atualizarDocumento(
  companyId: string,
  id: string,
  documento: Partial<Documento>
) {
  const anteriores = await obterDocumentoPorId(companyId, id);
  if (!anteriores) throw new Error('Documento não encontrado');

  const payload: any = {
    tipo: documento.tipo,
    serie: documento.serie,
    status: documento.status,
    observacoes: documento.observacoes !== undefined ? documento.observacoes || null : undefined,
    forma_pagamento: documento.formaPagamento,
    cliente_id: documento.clienteId !== undefined ? documento.clienteId || null : undefined,
    fornecedor_id: documento.fornecedorId !== undefined ? documento.fornecedorId || null : undefined,
    data_emissao: documento.dataEmissao ? documento.dataEmissao.toISOString() : undefined,
    data_vencimento: documento.dataVencimento ? documento.dataVencimento.toISOString() : undefined,
    data_pagamento: documento.dataPagamento
      ? documento.dataPagamento.toISOString()
      : documento.status === 'Pago'
        ? new Date().toISOString()
        : undefined,
    motivo: documento.motivo !== undefined ? documento.motivo || null : undefined,
    subtotal: documento.subtotal !== undefined ? String(documento.subtotal) : undefined,
    total_iva: documento.totalIVA !== undefined ? String(documento.totalIVA) : undefined,
    total: documento.total !== undefined ? String(documento.total) : undefined,
  };

  const { data, error } = await db
    .from('documentos')
    .update(payload)
    .eq('company_id', companyId)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  await registarAuditoria(companyId, 'ATUALIZAR', 'Documento', id, anteriores as any, data);
  return mapearDocumento(data);
}

export async function deletarDocumento(companyId: string, id: string) {
  const anteriores = await obterDocumentoPorId(companyId, id);
  const { data, error } = await db
    .from('documentos')
    .delete()
    .eq('company_id', companyId)
    .eq('id', id);
  if (error) throw new Error(error.message);
  await registarAuditoria(companyId, 'DELETAR', 'Documento', id, anteriores as any, null);
  return data;
}

export async function registrarPagamento(
  companyId: string,
  documentoId: string,
  dataPagamento: Date,
  formaPagamento?: "Numerário" | "Transferência" | "Multicaixa" | "POS" | "Cheque" | "Crédito"
) {
  return atualizarDocumento(companyId, documentoId, {
    status: 'Pago',
    dataPagamento,
    formaPagamento,
  });
}

// ─── SÉRIES / NUMERAÇÃO ───────────────────────────────────────────────────────

export async function obterSeries(companyId: string): Promise<SerieNumeracao[]> {
  const { data, error } = await db
    .from('series_numeracao')
    .select('*')
    .eq('company_id', companyId)
    .order('tipo_documento', { ascending: true })
    .order('serie', { ascending: true });
  if (error) throw new Error(error.message);

  return (data || []).map((r: any): SerieNumeracao => ({
    id: r.id,
    serie: r.serie,
    tipoDocumento: r.tipo_documento,
    proximoNumero: r.proximo_numero,
    ultimoNumeroUtilizado: r.ultimo_numero_utilizado,
    ano: r.ano || undefined,
    predefinida: r.predefinida || false,
  }));
}

export async function criarSerie(
  companyId: string,
  dados: { serie: string; tipoDocumento: string; proximoNumero?: number; predefinida?: boolean }
) {
  const { data: existente } = await db
    .from('series_numeracao')
    .select('id')
    .eq('company_id', companyId)
    .eq('serie', dados.serie)
    .eq('tipo_documento', dados.tipoDocumento)
    .maybeSingle();
  if (existente) throw new Error('Já existe uma série com esta letra para este tipo de documento');

  const anoAtual = new Date().getFullYear();

  const { data, error } = await db
    .from('series_numeracao')
    .insert({
      company_id: companyId,
      serie: dados.serie,
      tipo_documento: dados.tipoDocumento,
      proximo_numero: dados.proximoNumero ?? 1,
      ultimo_numero_utilizado: 0,
      ano: anoAtual,
      predefinida: dados.predefinida ?? false,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  await registarAuditoria(companyId, 'CRIAR', 'SerieNumeracao', data.id, null, data);
  return data;
}

export async function atualizarSerie(
  companyId: string,
  id: string,
  dados: Partial<{ serie: string; tipoDocumento: string; proximoNumero: number; predefinida: boolean }>
) {
  const { data, error } = await db
    .from('series_numeracao')
    .update({
      serie: dados.serie,
      tipo_documento: dados.tipoDocumento,
      proximo_numero: dados.proximoNumero,
      predefinida: dados.predefinida,
    })
    .eq('company_id', companyId)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  await registarAuditoria(companyId, 'ATUALIZAR', 'SerieNumeracao', id, null, data);
  return data;
}

export async function deletarSerie(companyId: string, id: string) {
  const { data, error } = await db
    .from('series_numeracao')
    .delete()
    .eq('company_id', companyId)
    .eq('id', id);
  if (error) throw new Error(error.message);
  await registarAuditoria(companyId, 'DELETAR', 'SerieNumeracao', id, null, null);
  return data;
}

let migrationConstraintsAttempted = false;
async function tentarAtualizarConstraintsTipoDocumento() {
  if (migrationConstraintsAttempted) return;
  migrationConstraintsAttempted = true;
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) return;
  try {
    const res = await fetch('https://api.supabase.com/v1/projects/hpdesbvqqmdhxoksrvij/database/query', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
          ALTER TABLE kima_facturas.series_numeracao 
            DROP CONSTRAINT IF EXISTS series_numeracao_tipo_documento_check;
          ALTER TABLE kima_facturas.series_numeracao 
            ADD CONSTRAINT series_numeracao_tipo_documento_check 
            CHECK (tipo_documento IN ('Fatura', 'FaturaRecibo', 'NotaCredito', 'NotaDebito', 'Orcamento', 'Recibo'));
          
          ALTER TABLE kima_facturas.documentos 
            DROP CONSTRAINT IF EXISTS documentos_tipo_check;
          ALTER TABLE kima_facturas.documentos 
            ADD CONSTRAINT documentos_tipo_check 
            CHECK (tipo IN ('Fatura', 'FaturaRecibo', 'NotaCredito', 'NotaDebito', 'Orcamento', 'Recibo'));

          ALTER TABLE kima_facturas.documentos 
            ALTER COLUMN documento_referenciado TYPE TEXT;
        `
      }),
    });
    if (!res.ok) {
      console.warn('Falha na resposta ao atualizar constraints:', await res.text());
    }
  } catch (err) {
    console.warn('Erro ao atualizar constraints via Supabase API:', err);
  }
}

/** Série predefinida para um tipo de documento; cria a série "A" se não existir. */
export async function obterSeriePredefinida(companyId: string, tipo: string) {
  const { data: series } = await db
    .from('series_numeracao')
    .select('*')
    .eq('company_id', companyId)
    .eq('tipo_documento', tipo)
    .order('predefinida', { ascending: false })
    .order('serie', { ascending: true });

  if (series && series.length > 0) return series[0];

  let insertRes = await db
    .from('series_numeracao')
    .insert({
      company_id: companyId,
      serie: 'A',
      tipo_documento: tipo,
      proximo_numero: 1,
      ultimo_numero_utilizado: 0,
      ano: new Date().getFullYear(),
      predefinida: true,
    })
    .select()
    .single();

  if (insertRes.error && insertRes.error.message.includes('violates check constraint')) {
    await tentarAtualizarConstraintsTipoDocumento();
    insertRes = await db
      .from('series_numeracao')
      .insert({
        company_id: companyId,
        serie: 'A',
        tipo_documento: tipo,
        proximo_numero: 1,
        ultimo_numero_utilizado: 0,
        ano: new Date().getFullYear(),
        predefinida: true,
      })
      .select()
      .single();
  }

  if (insertRes.error) {
    console.warn('Série predefinida não pôde ser gravada em series_numeracao, usando fallback:', insertRes.error.message);
    return {
      id: `virtual-${tipo}-A`,
      serie: 'A',
      tipo_documento: tipo,
      proximo_numero: 1,
      ultimo_numero_utilizado: 0,
      ano: new Date().getFullYear(),
      predefinida: true,
    };
  }

  return insertRes.data;
}

// ─── MOVIMENTOS DE STOCK ─────────────────────────────────────────────────────

export async function registrarMovimentoStock(
  companyId: string,
  movimento: Omit<MovimentoStock, 'id'> & { artigoId: string }
) {
  const { data, error } = await db
    .from('movimentos_stock')
    .insert({
      company_id: companyId,
      artigo_id: movimento.artigoId,
      tipo: movimento.tipo,
      quantidade: String(movimento.quantidade),
      referencia: movimento.referencia,
      observacoes: movimento.observacoes || null,
      data: (movimento.data || new Date()).toISOString(),
    })
    .select()
    .single();
  if (error) throw new Error(error.message);

  const artigo = await obterArtigoPorId(companyId, movimento.artigoId);
  if (artigo) {
    let novoStock = artigo.stock ?? 0;
    if (movimento.tipo === 'Entrada') novoStock += Number(movimento.quantidade);
    else if (movimento.tipo === 'Saída') novoStock -= Number(movimento.quantidade);
    await db
      .from('artigos')
      .update({ stock: String(novoStock) })
      .eq('company_id', companyId)
      .eq('id', movimento.artigoId);
  }

  await registarAuditoria(companyId, 'CRIAR', 'MovimentoStock', data.id, null, data);
  return data;
}

// ─── LOGS DE AUDITORIA ───────────────────────────────────────────────────────

export async function obterLogsAuditoria(
  companyId: string,
  filtros?: { usuario?: string; entidade?: string; dataInicio?: Date; dataFim?: Date }
) {
  let query = db
    .from('logs_auditoria')
    .select('*')
    .eq('company_id', companyId);
  if (filtros?.entidade) query = query.eq('entidade', filtros.entidade);
  if (filtros?.dataInicio) query = query.gte('created_at', filtros.dataInicio.toISOString());
  if (filtros?.dataFim) query = query.lte('created_at', filtros.dataFim.toISOString());
  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw new Error(error.message);

  return (data || []).map((l: any): LogAuditoria => ({
    id: l.id,
    usuario: l.user_id || undefined,
    acao: l.acao,
    entidade: l.entidade,
    entidadeId: l.entidade_id,
    alteracoesAnteriores: l.alteracoes_anteriores || undefined,
    alteracoesNovas: l.alteracoes_novas || undefined,
    timestamp: new Date(l.created_at),
    endereco: l.endereco || undefined,
  }));
}

// ─── KPIs / RELATÓRIOS ───────────────────────────────────────────────────────

export async function obterKPIsEmpresa(companyId: string) {
  const documentos = await obterDocumentos(companyId);
  const clientes = await obterClientes(companyId);

  const faturas = documentos.filter((d) => d.status === 'Pago');
  const faturasNaoPagas = documentos.filter((d) => d.status === 'Pendente');

  return {
    totalFaturado: faturas.reduce((sum, f) => sum + Number(f.total), 0),
    faturasNaoPagasCount: faturasNaoPagas.length,
    valorNaoPago: faturasNaoPagas.reduce((sum, f) => sum + Number(f.total), 0),
    totalClientes: clientes.filter((c) => c.ativo).length,
  };
}

// ─── EMPRESA (configuração do módulo) ────────────────────────────────────────

export async function obterEmpresa(
  companyId: string
): Promise<ConfiguracaoEmpresa | null> {
  const { data: company, error } = await publicDb
    .from('companies')
    .select('*')
    .eq('id', companyId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!company) return null;

  const { data: settings } = await db
    .from('company_settings')
    .select('*')
    .eq('company_id', companyId)
    .maybeSingle();

  const { data: series } = await db
    .from('series_numeracao')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });

  const s = settings?.settings || {};

  return {
    id: company.id,
    nomeEmpresa: company.name,
    nif: company.nif || '',
    morada: s.morada || '',
    telefone: s.telefone || '',
    email: s.email || '',
    website: s.website || undefined,
    logoUrl: s.logo_url || undefined,
    contaBancaria: s.conta_bancaria || undefined,
    banco: s.banco || undefined,
    inscricaoSocial: s.inscricao_social || undefined,
    nifRegional: s.nif_regional || undefined,
    softwareNome: s.software_nome || undefined,
    softwareCertificacaoNumero: s.software_certificacao_numero || undefined,
    diasVencimentoPadrao: s.dias_vencimento_padrao || 30,
    seriesPorTipo: (series || []).map((sr: any): SerieNumeracao => ({
      id: sr.id,
      serie: sr.serie,
      tipoDocumento: sr.tipo_documento,
      proximoNumero: sr.proximo_numero,
      ultimoNumeroUtilizado: sr.ultimo_numero_utilizado,
      ano: sr.ano || undefined,
      predefinida: sr.predefinida || false,
    })),
    ultimaAtualizacao: s.updated_at ? new Date(s.updated_at) : new Date(company.created_at),
    criadoEm: new Date(company.created_at),
  };
}

export async function atualizarEmpresa(
  companyId: string,
  dados: Partial<ConfiguracaoEmpresa>
) {
  const empresa = await obterEmpresa(companyId);

  const updateCompany: any = {};
  if (dados.nomeEmpresa !== undefined) updateCompany.name = dados.nomeEmpresa;
  if (dados.nif !== undefined) updateCompany.nif = dados.nif;

  if (Object.keys(updateCompany).length > 0) {
    const { error } = await publicDb.from('companies').update(updateCompany).eq('id', companyId);
    if (error) throw new Error(error.message);
  }

  const base = empresa?.contaBancaria || undefined;
  const settings = {
    morada: dados.morada !== undefined ? dados.morada : empresa?.morada,
    telefone: dados.telefone !== undefined ? dados.telefone : empresa?.telefone,
    email: dados.email !== undefined ? dados.email : empresa?.email,
    website: dados.website !== undefined ? dados.website : empresa?.website,
    logo_url: dados.logoUrl !== undefined ? dados.logoUrl : empresa?.logoUrl,
    conta_bancaria: dados.contaBancaria !== undefined ? dados.contaBancaria : empresa?.contaBancaria || base,
    banco: dados.banco !== undefined ? dados.banco : empresa?.banco,
    inscricao_social: dados.inscricaoSocial !== undefined ? dados.inscricaoSocial : empresa?.inscricaoSocial,
    nif_regional: dados.nifRegional !== undefined ? dados.nifRegional : empresa?.nifRegional,
    // Identificação do software certificado AGT: é um valor FIXO do software
    // (certificação da Kima/AGT), não uma configuração editável da empresa.
    software_nome: dados.softwareNome !== undefined ? dados.softwareNome : SOFTWARE_NOME,
    software_certificacao_numero: dados.softwareCertificacaoNumero !== undefined ? dados.softwareCertificacaoNumero : SOFTWARE_CERTIFICACAO_AGT,
    dias_vencimento_padrao: dados.diasVencimentoPadrao !== undefined ? dados.diasVencimentoPadrao : empresa?.diasVencimentoPadrao || 30,
  };

  const { error } = await db
    .from('company_settings')
    .upsert({ company_id: companyId, settings }, { onConflict: "company_id" })
    .select()
    .single();
  if (error) throw new Error(error.message);

  return obterEmpresa(companyId);
}