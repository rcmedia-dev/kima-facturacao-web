'use client';

import { Documento, Cliente, Artigo, Fornecedor } from './types';

/**
 * Motor de Relatórios Avançados para Kima Financeiro
 * Gera KPIs, análises de vendas, envelhecimento de clientes, etc.
 */

export interface KPIs {
  totalFaturado: number;
  totalFaturadoMes: number;
  faturasPendentes: number;
  valorPendente: number;
  totalClientes: number;
  clientesAtivos: number;
  ticketMedio: number;
  taxaCobranca: number; // percentual
  diasMedioRecebimento: number;
}

export interface RelatorioVendas {
  periodo: { dataInicio: Date; dataFim: Date };
  totalVendas: number;
  quantidadeDocumentos: number;
  vendedorMes: { mes: number; vendas: number }[];
  topClientes: {
    nome: string;
    nif: string;
    totalGasto: number;
    quantidadeCompras: number;
  }[];
  topProdutos: {
    codigo: string;
    descricao: string;
    quantidade: number;
    valor: number;
  }[];
}

export interface RelatorioIVA {
  periodo: { mes: number; ano: number };
  porTaxa: {
    taxa: 0 | 7 | 14;
    baseImponivel: number;
    impostoDevido: number;
  }[];
  totalBaseImponivel: number;
  totalImposto: number;
}

export interface AgingClientes {
  cliente: {
    nome: string;
    nif: string;
  };
  faturasVencidas: {
    numero: string;
    dataVencimento: Date;
    diasVencido: number;
    montante: number;
  }[];
  totalDevido: number;
  diasMedioAtraso: number;
}

/**
 * Calcula KPIs gerenciais
 */
export function calcularKPIs(
  documentos: Documento[],
  clientes: Cliente[]
): KPIs {
  const agora = new Date();
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
  const fimMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 0);

  // Documentos do tipo fatura/recibo
  const faturas = documentos.filter(
    (d) =>
      d.tipo === 'Fatura' ||
      d.tipo === 'FaturaRecibo'
  );

  const faturasMes = faturas.filter(
    (f) => f.dataEmissao >= inicioMes && f.dataEmissao <= fimMes
  );

  const totalFaturado = faturas.reduce((sum, f) => sum + f.total, 0);
  const totalFaturadoMes = faturasMes.reduce((sum, f) => sum + f.total, 0);

  const faturasNaoPagas = faturas.filter((f) => f.status !== 'Pago');
  const faturasPendentes = faturasNaoPagas.length;
  const valorPendente = faturasNaoPagas.reduce((sum, f) => sum + f.total, 0);

  const clientesAtivos = new Set(faturas.map((f) => f.clienteId)).size;

  // Ticket médio
  const ticketMedio =
    faturas.length > 0 ? totalFaturado / faturas.length : 0;

  // Taxa de cobrança
  const faturasRecebidas = faturas.filter((f) => f.status === 'Pago').length;
  const taxaCobranca =
    faturas.length > 0
      ? (faturasRecebidas / faturas.length) * 100
      : 0;

  // Dias médio de recebimento
  const faturasComPagamento = faturas.filter(
    (f) => f.dataPagamento && f.dataEmissao
  );
  const diasRecebimento = faturasComPagamento.map((f) => {
    const diff =
      f.dataPagamento!.getTime() - f.dataEmissao.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  });
  const diasMedioRecebimento =
    diasRecebimento.length > 0
      ? diasRecebimento.reduce((a, b) => a + b, 0) /
        diasRecebimento.length
      : 0;

  return {
    totalFaturado,
    totalFaturadoMes,
    faturasPendentes,
    valorPendente,
    totalClientes: clientes.length,
    clientesAtivos,
    ticketMedio,
    taxaCobranca,
    diasMedioRecebimento: Math.ceil(diasMedioRecebimento),
  };
}

/**
 * Gera relatório de vendas detalhado
 */
export function gerarRelatorioVendas(
  documentos: Documento[],
  clientes: Cliente[],
  artigos: Artigo[],
  dataInicio: Date,
  dataFim: Date
): RelatorioVendas {
  const faturas = documentos.filter(
    (d) =>
      (d.tipo === 'Fatura' ||
        d.tipo === 'FaturaRecibo') &&
      d.dataEmissao >= dataInicio &&
      d.dataEmissao <= dataFim
  );

  // Top clientes
  const vendidosPorCliente = new Map<
    string,
    { nome: string; nif: string; total: number; qtd: number }
  >();
  faturas.forEach((f) => {
    if (f.clienteId) {
      const cliente = clientes.find((c) => c.id === f.clienteId);
      if (cliente) {
        const key = cliente.id;
        if (!vendidosPorCliente.has(key)) {
          vendidosPorCliente.set(key, {
            nome: cliente.nome,
            nif: cliente.nif,
            total: 0,
            qtd: 0,
          });
        }
        const current = vendidosPorCliente.get(key)!;
        current.total += f.total;
        current.qtd++;
      }
    }
  });

  const topClientes = Array.from(vendidosPorCliente.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 10)
    .map((c) => ({
      nome: c.nome,
      nif: c.nif,
      totalGasto: c.total,
      quantidadeCompras: c.qtd,
    }));

  // Top produtos
  const vendidosPorProduto = new Map<
    string,
    { codigo: string; descricao: string; qtd: number; valor: number }
  >();
  faturas.forEach((f) => {
    f.linhas.forEach((l) => {
      if (l.artigoId) {
        const artigo = artigos.find((a) => a.id === l.artigoId);
        if (artigo) {
          const key = artigo.id;
          if (!vendidosPorProduto.has(key)) {
            vendidosPorProduto.set(key, {
              codigo: artigo.codigo,
              descricao: artigo.descricao,
              qtd: 0,
              valor: 0,
            });
          }
          const current = vendidosPorProduto.get(key)!;
          current.qtd += l.quantidade;
          current.valor += l.total;
        }
      }
    });
  });

  const topProdutos = Array.from(vendidosPorProduto.values())
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 10)
    .map((p) => ({
      codigo: p.codigo,
      descricao: p.descricao,
      quantidade: p.qtd,
      valor: p.valor,
    }));

  return {
    periodo: { dataInicio, dataFim },
    totalVendas: faturas.reduce((sum, f) => sum + f.total, 0),
    quantidadeDocumentos: faturas.length,
    vendedorMes: [], // Implementar se houver campo de vendedor
    topClientes,
    topProdutos,
  };
}

/**
 * Gera relatório de IVA por período
 */
export function gerarRelatorioIVA(
  documentos: Documento[],
  mes: number,
  ano: number
): RelatorioIVA {
  const faturas = documentos.filter((d) => {
    const data = new Date(d.dataEmissao);
    return (
      data.getMonth() + 1 === mes &&
      data.getFullYear() === ano &&
      (d.tipo === 'Fatura' ||
        d.tipo === 'FaturaRecibo')
    );
  });

  const porTaxa: Record<0 | 7 | 14, { base: number; imposto: number }> = {
    0: { base: 0, imposto: 0 },
    7: { base: 0, imposto: 0 },
    14: { base: 0, imposto: 0 },
  };

  faturas.forEach((f) => {
    f.linhas.forEach((l) => {
      const taxa = l.taxaIVA as 0 | 7 | 14;
      const baseImponivel = l.total / (1 + taxa / 100);
      const imposto = l.total - baseImponivel;

      porTaxa[taxa].base += baseImponivel;
      porTaxa[taxa].imposto += imposto;
    });
  });

  const resultado = Object.entries(porTaxa).map(([taxa, dados]) => ({
    taxa: parseInt(taxa) as 0 | 7 | 14,
    baseImponivel: dados.base,
    impostoDevido: dados.imposto,
  }));

  const totalBase = Object.values(porTaxa).reduce(
    (sum, d) => sum + d.base,
    0
  );
  const totalImp = Object.values(porTaxa).reduce(
    (sum, d) => sum + d.imposto,
    0
  );

  return {
    periodo: { mes, ano },
    porTaxa: resultado,
    totalBaseImponivel: totalBase,
    totalImposto: totalImp,
  };
}

/**
 * Gera relatório de aging de clientes (dívidas vencidas)
 */
export function gerarAgingClientes(
  documentos: Documento[],
  clientes: Cliente[]
): AgingClientes[] {
  const agora = new Date();
  const dividas = new Map<string, AgingClientes>();

  // Agrupar faturas não pagas por cliente
  documentos
    .filter((d) => d.status !== 'Pago' && d.clienteId)
    .forEach((d) => {
      const cliente = clientes.find((c) => c.id === d.clienteId);
      if (cliente) {
        if (!dividas.has(cliente.id)) {
          dividas.set(cliente.id, {
            cliente: { nome: cliente.nome, nif: cliente.nif },
            faturasVencidas: [],
            totalDevido: 0,
            diasMedioAtraso: 0,
          });
        }

        const diasVencido = Math.ceil(
          (agora.getTime() - d.dataVencimento.getTime()) /
            (1000 * 60 * 60 * 24)
        );

        if (diasVencido > 0) {
          const entry = dividas.get(cliente.id)!;
          entry.faturasVencidas.push({
            numero: d.numeroCompleto,
            dataVencimento: d.dataVencimento,
            diasVencido,
            montante: d.total,
          });
          entry.totalDevido += d.total;
        }
      }
    });

  // Calcular dias médio de atraso
  dividas.forEach((entry) => {
    if (entry.faturasVencidas.length > 0) {
      const diasTotal = entry.faturasVencidas.reduce(
        (sum, f) => sum + f.diasVencido,
        0
      );
      entry.diasMedioAtraso = Math.ceil(
        diasTotal / entry.faturasVencidas.length
      );
    }
  });

  // Retornar apenas clientes com débitos vencidos
  return Array.from(dividas.values())
    .filter((a) => a.faturasVencidas.length > 0)
    .sort((a, b) => b.totalDevido - a.totalDevido);
}
