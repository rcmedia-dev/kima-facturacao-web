'use server';

import { db } from './client';
import { eq, and, sql, desc, lt, gte } from 'drizzle-orm';
import {
  empresas,
  clientes,
  artigos,
  documentos,
  fornecedores,
  movimentosStock,
  logsAuditoria,
  documentoLinhas,
} from './schema';
import { Documento, Cliente, Artigo } from '@/lib/types';
import { criarLogAuditoria, UsuarioAutenticado } from '@/lib/audit-system';

/**
 * CLIENTES
 */

export async function obterClientes(empresaId: string) {
  return await db.query.clientes.findMany({
    where: eq(clientes.empresaId, empresaId),
    orderBy: desc(clientes.criadoEm),
  });
}

export async function criarCliente(
  empresaId: string,
  cliente: Omit<Cliente, 'id' | 'dataCriacao' | 'ultimaAtualizacao'>,
  usuario?: UsuarioAutenticado
) {
  const [novo] = await db
    .insert(clientes)
    .values({
      empresaId,
      ...cliente,
    })
    .returning();

  if (usuario) {
    await db.insert(logsAuditoria).values({
      empresaId,
      ...criarLogAuditoria(
        'CRIAR',
        'Cliente',
        novo.id,
        usuario,
        undefined,
        cliente
      ),
    });
  }

  return novo;
}

export async function atualizarCliente(
  id: string,
  cliente: Partial<Cliente>,
  usuario?: UsuarioAutenticado
) {
  const anterior = await db.query.clientes.findFirst({
    where: eq(clientes.id, id),
  });

  const [atualizado] = await db
    .update(clientes)
    .set({
      ...cliente,
      atualizadoEm: new Date(),
    })
    .where(eq(clientes.id, id))
    .returning();

  if (usuario && anterior) {
    await db.insert(logsAuditoria).values({
      empresaId: anterior.empresaId,
      ...criarLogAuditoria('ATUALIZAR', 'Cliente', id, usuario, anterior, cliente),
    });
  }

  return atualizado;
}

export async function deletarCliente(id: string, usuario?: UsuarioAutenticado) {
  const anterior = await db.query.clientes.findFirst({
    where: eq(clientes.id, id),
  });

  const [deletado] = await db
    .delete(clientes)
    .where(eq(clientes.id, id))
    .returning();

  if (usuario && anterior) {
    await db.insert(logsAuditoria).values({
      empresaId: anterior.empresaId,
      ...criarLogAuditoria('DELETAR', 'Cliente', id, usuario, anterior, undefined),
    });
  }

  return deletado;
}

/**
 * ARTIGOS
 */

export async function obterArtigos(empresaId: string) {
  return await db.query.artigos.findMany({
    where: eq(artigos.empresaId, empresaId),
    with: {
      fornecedor: true,
    },
    orderBy: desc(artigos.criadoEm),
  });
}

export async function criarArtigo(
  empresaId: string,
  artigo: Omit<Artigo, 'id' | 'dataCriacao' | 'ultimaAtualizacao'>,
  usuario?: UsuarioAutenticado
) {
  const [novo] = await db
    .insert(artigos)
    .values({
      empresaId,
      ...artigo,
      preco: String(artigo.preco),
    })
    .returning();

  if (usuario) {
    await db.insert(logsAuditoria).values({
      empresaId,
      ...criarLogAuditoria('CRIAR', 'Artigo', novo.id, usuario, undefined, artigo),
    });
  }

  return novo;
}

/**
 * DOCUMENTOS
 */

export async function obterDocumentos(empresaId: string, tipo?: string) {
  const where =
    tipo !== undefined
      ? and(eq(documentos.empresaId, empresaId), eq(documentos.tipo, tipo as any))
      : eq(documentos.empresaId, empresaId);

  return await db.query.documentos.findMany({
    where,
    with: {
      cliente: true,
      linhas: {
        with: {
          artigo: true,
        },
      },
    },
    orderBy: desc(documentos.criadoEm),
  });
}

export async function obterDocumentoPorId(empresaId: string, id: string) {
  return await db.query.documentos.findFirst({
    where: and(
      eq(documentos.empresaId, empresaId),
      eq(documentos.id, id)
    ),
    with: {
      cliente: true,
      linhas: {
        with: {
          artigo: true,
        },
      },
    },
  });
}

export async function obterDocumentosPorPeriodo(
  empresaId: string,
  dataInicio: Date,
  dataFim: Date
) {
  return await db.query.documentos.findMany({
    where: and(
      eq(documentos.empresaId, empresaId),
      gte(documentos.dataEmissao, dataInicio),
      lt(documentos.dataEmissao, dataFim)
    ),
    with: {
      cliente: true,
      linhas: true,
    },
    orderBy: desc(documentos.dataEmissao),
  });
}

export async function criarDocumento(
  empresaId: string,
  documento: Omit<Documento, 'id' | 'numeroCompleto' | 'dataAtualizacao'>,
  usuario?: UsuarioAutenticado
) {
  const numInt = parseInt(documento.numero, 10) || 1;
  const numeroCompleto = `${documento.serie}/${String(numInt).padStart(6, '0')}`;

  const [novo] = await db
    .insert(documentos)
    .values({
      empresaId,
      tipo: documento.tipo,
      serie: documento.serie,
      numero: numInt,
      numeroCompleto,
      clienteId: documento.clienteId,
      fornecedorId: documento.fornecedorId,
      dataEmissao: documento.dataEmissao,
      dataVencimento: documento.dataVencimento,
      formaPagamento: documento.formaPagamento,
      status: documento.status,
      observacoes: documento.observacoes,
      subtotal: String(documento.subtotal),
      totalIVA: String(documento.totalIVA),
      total: String(documento.total),
      dataPagamento: documento.dataPagamento,
      criadoPor: usuario?.id,
    })
    .returning();

  // Inserir linhas
  if (documento.linhas && documento.linhas.length > 0) {
    await db.insert(documentoLinhas).values(
      documento.linhas.map((l) => ({
        documentoId: novo.id,
        artigoId: l.artigoId,
        descricao: l.descricao,
        quantidade: String(l.quantidade),
        preco: String(l.preco),
        taxaIVA: l.taxaIVA,
        unidadeMedida: l.unidadeMedida,
        total: String(l.total),
      }))
    );
  }

  if (usuario) {
    await db.insert(logsAuditoria).values({
      empresaId,
      ...criarLogAuditoria(
        'CRIAR',
        'Documento',
        novo.id,
        usuario,
        undefined,
        documento
      ),
    });
  }

  return novo;
}

export async function registrarPagamento(
  documentoId: string,
  dataPagamento: Date,
  usuario?: UsuarioAutenticado
) {
  const anterior = await db.query.documentos.findFirst({
    where: eq(documentos.id, documentoId),
  });

  const [atualizado] = await db
    .update(documentos)
    .set({
      status: 'Pago',
      dataPagamento,
      atualizadoPor: usuario?.id,
      dataAtualizacao: new Date(),
    })
    .where(eq(documentos.id, documentoId))
    .returning();

  if (usuario && anterior) {
    await db.insert(logsAuditoria).values({
      empresaId: anterior.empresaId,
      ...criarLogAuditoria(
        'PAGAMENTO',
        'Documento',
        documentoId,
        usuario,
        { status: anterior.status },
        { status: 'Pago', dataPagamento }
      ),
    });
  }

  return atualizado;
}

/**
 * MOVIMENTOS DE STOCK
 */

export async function registrarMovimentoStock(
  empresaId: string,
  movimento: Omit<(typeof movimentosStock.$inferInsert), 'id' | 'empresaId'>,
  usuario?: UsuarioAutenticado
) {
  const [novo] = await db
    .insert(movimentosStock)
    .values({
      empresaId,
      ...movimento,
      quantidade: String(movimento.quantidade),
    })
    .returning();

  // Atualizar stock do artigo
  const artigo = await db.query.artigos.findFirst({
    where: eq(artigos.id, movimento.artigoId),
  });

  if (artigo) {
    let novoStock = artigo.stock ?? 0;
    if (movimento.tipo === 'Entrada') {
      novoStock += Number(movimento.quantidade);
    } else if (movimento.tipo === 'Saída') {
      novoStock -= Number(movimento.quantidade);
    }

    await db
      .update(artigos)
      .set({ stock: novoStock })
      .where(eq(artigos.id, movimento.artigoId));
  }

  if (usuario) {
    await db.insert(logsAuditoria).values({
      empresaId,
      ...criarLogAuditoria(
        'CRIAR',
        'MovimentoStock',
        novo.id,
        usuario,
        undefined,
        movimento
      ),
    });
  }

  return novo;
}

/**
 * LOGS DE AUDITORIA
 */

export async function obterLogsAuditoria(
  empresaId: string,
  filtros?: {
    usuario?: string;
    entidade?: string;
    dataInicio?: Date;
    dataFim?: Date;
  }
) {
  const condicoes = [eq(logsAuditoria.empresaId, empresaId)];

  if (filtros?.usuario) {
    condicoes.push(eq(logsAuditoria.usuario, filtros.usuario));
  }
  if (filtros?.entidade) {
    condicoes.push(eq(logsAuditoria.entidade, filtros.entidade));
  }
  if (filtros?.dataInicio && filtros?.dataFim) {
    condicoes.push(gte(logsAuditoria.timestamp, filtros.dataInicio));
    condicoes.push(lt(logsAuditoria.timestamp, filtros.dataFim));
  }

  return await db.query.logsAuditoria.findMany({
    where: and(...condicoes),
    orderBy: desc(logsAuditoria.timestamp),
  });
}

/**
 * RELATÓRIOS
 */

export async function obterKPIsEmpresa(empresaId: string) {
  const faturas = await db.query.documentos.findMany({
    where: and(
      eq(documentos.empresaId, empresaId),
      eq(documentos.status, 'Pago')
    ),
  });

  const faturasNaoPagas = await db.query.documentos.findMany({
    where: and(
      eq(documentos.empresaId, empresaId),
      eq(documentos.status, 'Pendente')
    ),
  });

  const clientesCount = await db
    .selectDistinct()
    .from(clientes)
    .where(eq(clientes.empresaId, empresaId));

  return {
    totalFaturado: faturas.reduce(
      (sum, f) => sum + Number(f.total),
      0
    ),
    faturasNaoPagasCount: faturasNaoPagas.length,
    valorNaoPago: faturasNaoPagas.reduce(
      (sum, f) => sum + Number(f.total),
      0
    ),
    totalClientes: clientesCount.length,
  };
}

/**
 * EMPRESA
 */

export async function obterEmpresa(empresaId: string) {
  return await db.query.empresas.findFirst({
    where: eq(empresas.id, empresaId),
  });
}

export async function atualizarEmpresa(
  empresaId: string,
  dados: {
    nome?: string;
    nif?: string;
    morada?: string;
    telefone?: string;
    email?: string;
    logoUrl?: string | null;
  }
) {
  const [atualizada] = await db
    .update(empresas)
    .set({
      ...dados,
      atualizadoEm: new Date(),
    })
    .where(eq(empresas.id, empresaId))
    .returning();

  return atualizada;
}

