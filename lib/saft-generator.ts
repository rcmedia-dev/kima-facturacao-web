'use client';

import { Documento, LogAuditoria } from './types';
import { Cliente, Fornecedor, Artigo } from './types';

/**
 * SAF-T (Ficheiro de Auditoria Informatizado)
 * Exportação de dados conformes com requisitos fiscais em Angola
 */

export interface SAFTData {
  periodo: {
    mes: number;
    ano: number;
  };
  empresa: {
    nif: string;
    nome: string;
  };
  documentos: {
    tipo: string;
    serie: string;
    quantidade: number;
    total: number;
  }[];
  totalIVA: {
    taxa0: number;
    taxa7: number;
    taxa14: number;
    total: number;
  };
  clientes: {
    nif: string;
    nome: string;
    montante: number;
  }[];
  documentosDetalhe?: {
    numeroCompleto: string;
    data: string;
    tipo: string;
    serie: string;
    nifCliente?: string;
    subtotal: number;
    totalIVA: number;
    total: number;
  }[];
  movimentos: LogAuditoria[];
  artigos?: {
    codigo: string;
    descricao: string;
    unidadeMedida: string;
    preco: number;
    taxaIVA: number;
  }[];
  tabelaImpostos?: {
    codigo: string;
    taxa: number;
  }[];
}

/**
 * Gera resumo SAF-T para um período
 */
export function gerarResumoSAFT(
  documentos: Documento[],
  clientes: Cliente[],
  logs: LogAuditoria[],
  empresa: { nif: string; nome: string },
  mes: number,
  ano: number,
  artigos: Artigo[] = []
): SAFTData {
  // Filtrar documentos do período
  const docsPeriodo = documentos.filter((d) => {
    const data = new Date(d.dataEmissao);
    return data.getMonth() + 1 === mes && data.getFullYear() === ano;
  });

  // Agrupar por tipo
  const porTipo: Record<string, { quantidade: number; total: number }> = {};
  docsPeriodo.forEach((d) => {
    if (!porTipo[d.tipo]) {
      porTipo[d.tipo] = { quantidade: 0, total: 0 };
    }
    porTipo[d.tipo].quantidade++;
    porTipo[d.tipo].total += d.total;
  });

  // Calcular IVA por taxa
  const totalIVA = {
    taxa0: 0,
    taxa7: 0,
    taxa14: 0,
    total: 0,
  };

  docsPeriodo.forEach((d) => {
    const iva7 = d.linhas
      .filter((l) => l.taxaIVA === 7)
      .reduce((sum, l) => sum + (l.total * 7) / 100, 0);
    const iva14 = d.linhas
      .filter((l) => l.taxaIVA === 14)
      .reduce((sum, l) => sum + (l.total * 14) / 100, 0);

    if (iva7) totalIVA.taxa7 += iva7;
    if (iva14) totalIVA.taxa14 += iva14;
  });

  totalIVA.total = totalIVA.taxa0 + totalIVA.taxa7 + totalIVA.taxa14;

  // Clientes que tiveram faturas no período
  const clientesPeriodo = new Map<
    string,
    { nif: string; nome: string; montante: number }
  >();
  docsPeriodo.forEach((d) => {
    if (d.clienteId) {
      const cliente = clientes.find((c) => c.id === d.clienteId);
      if (cliente) {
        const key = cliente.nif;
        if (!clientesPeriodo.has(key)) {
          clientesPeriodo.set(key, {
            nif: cliente.nif,
            nome: cliente.nome,
            montante: 0,
          });
        }
        const current = clientesPeriodo.get(key)!;
        current.montante += d.total;
      }
    }
  });

  // Logs relevantes
  const logsRelevantes = logs.filter((l) => {
    const data = new Date(l.timestamp);
    return data.getMonth() + 1 === mes && data.getFullYear() === ano;
  });

  // Artigos usados no período (MasterFiles/Products — T3.1)
  const artigosPeriodo = new Map<
    string,
    {
      codigo: string;
      descricao: string;
      unidadeMedida: string;
      preco: number;
      taxaIVA: number;
    }
  >();

  let contadorArtigos = 1;

  docsPeriodo.forEach((d) => {
    d.linhas.forEach((l) => {
      const artigo = l.artigoId ? artigos.find((a) => a.id === l.artigoId) : undefined;
      const key = l.artigoId || (l.descricao ? l.descricao.trim().toLowerCase() : `item-${contadorArtigos}`);

      if (!artigosPeriodo.has(key)) {
        const prefix = (artigo?.tipo === 'Serviço' || (l.descricao && /servi[çc]o/i.test(l.descricao))) ? 'SERV' : 'PROD';
        const fallbackCodigo = `${prefix}-${String(contadorArtigos++).padStart(3, '0')}`;
        const codigo = (artigo?.codigo && artigo.codigo.trim()) ? artigo.codigo.trim() : fallbackCodigo;

        artigosPeriodo.set(key, {
          codigo,
          descricao: artigo?.descricao || l.descricao || 'Item Faturado',
          unidadeMedida: artigo?.unidadeMedida || l.unidadeMedida || 'UN',
          preco: artigo?.preco !== undefined ? artigo.preco : (l.preco || 0),
          taxaIVA: (artigo?.taxaIVA !== undefined ? artigo.taxaIVA : l.taxaIVA) || 0,
        });
      }
    });
  });

  // Tabela de impostos com as taxas efetivamente usadas no período (MasterFiles/TaxTable)
  const taxasUsadas = new Set<number>();
  docsPeriodo.forEach((d) => {
    d.linhas.forEach((l) => taxasUsadas.add(Number(l.taxaIVA)));
  });
  [0, 7, 14].forEach((taxa) => {
    if (taxasUsadas.has(taxa)) taxasUsadas.add(taxa);
  });
  const tabelaImpostos = [0, 7, 14]
    .filter((taxa) => taxasUsadas.has(taxa))
    .map((taxa) => ({ codigo: `IVA-${taxa}`, taxa }));

  const documentosDetalhe = docsPeriodo.map((d) => {
    const cliente = d.clienteId ? clientes.find((c) => c.id === d.clienteId) : undefined;
    return {
      numeroCompleto: d.numeroCompleto || `${d.serie}/${String(d.numero).padStart(6, '0')}`,
      data: new Date(d.dataEmissao).toISOString(),
      tipo: d.tipo,
      serie: d.serie || 'A',
      nifCliente: cliente?.nif,
      subtotal: d.subtotal,
      totalIVA: d.totalIVA,
      total: d.total,
    };
  });

  return {
    periodo: { mes, ano },
    empresa,
    documentos: Object.entries(porTipo).map(([tipo, dados]) => ({
      tipo,
      serie: 'A', // Default serie
      quantidade: dados.quantidade,
      total: dados.total,
    })),
    totalIVA,
    clientes: Array.from(clientesPeriodo.values()),
    documentosDetalhe,
    movimentos: logsRelevantes,
    artigos: Array.from(artigosPeriodo.values()),
    tabelaImpostos,
  };
}

/**
 * Exporta SAF-T em formato XML
 */
export function exportarSAFTXML(data: SAFTData): string {
  const xmlHeader = `<?xml version="1.0" encoding="UTF-8"?>
<SAF-T xmlns="urn:DGCI:SAF-T:1.0">`;

  const headerXml = `
  <Header>
    <AuditFileVersion>1.0</AuditFileVersion>
    <CompanyID>${escapeXml(data.empresa.nif)}</CompanyID>
    <CompanyName>${escapeXml(data.empresa.nome)}</CompanyName>
    <FiscalYear>${data.periodo.ano}</FiscalYear>
    <StartDate>${new Date(data.periodo.ano, data.periodo.mes - 1, 1).toISOString().split('T')[0]}</StartDate>
    <EndDate>${new Date(data.periodo.ano, data.periodo.mes, 0).toISOString().split('T')[0]}</EndDate>
    <DateCreated>${new Date().toISOString()}</DateCreated>
  </Header>`;

  // MasterFiles — Tabela de Impostos + Artigos (T3.1)
  const tabelaImpostosXml = data.tabelaImpostos && data.tabelaImpostos.length > 0
    ? `
    <TaxTable>
      ${data.tabelaImpostos
        .map(
          (t) => `
      <Tax>
        <TaxType>IVA</TaxType>
        <TaxCode>${escapeXml(t.codigo)}</TaxCode>
        <TaxRate>${t.taxa}</TaxRate>
      </Tax>`
        )
        .join('')}
    </TaxTable>`
    : '';

  const artigosXml = data.artigos && data.artigos.length > 0
    ? `
    <Products>
      ${data.artigos
        .map(
          (a) => `
      <Product>
        <ProductCode>${escapeXml(a.codigo)}</ProductCode>
        <ProductDescription>${escapeXml(a.descricao)}</ProductDescription>
        <UnitOfMeasure>${escapeXml(a.unidadeMedida || 'UN')}</UnitOfMeasure>
        <UnitPrice>${a.preco.toFixed(2)}</UnitPrice>
        <TaxCode>IVA-${a.taxaIVA}</TaxCode>
      </Product>`
        )
        .join('')}
    </Products>`
    : '';

  const masterFilesXml = `
  <MasterFiles>
${tabelaImpostosXml}${artigosXml}  </MasterFiles>`;

  const documentosXml = `
  <Documents>
    ${data.documentos
      .map(
        (d) => `
    <Document>
      <Type>${escapeXml(d.tipo)}</Type>
      <Series>${escapeXml(d.serie)}</Series>
      <Quantity>${d.quantidade}</Quantity>
      <Total>${d.total.toFixed(2)}</Total>
    </Document>`
      )
      .join('')}
  </Documents>`;

  const ivaXml = `
  <TaxSummary>
    <Rate0>${data.totalIVA.taxa0.toFixed(2)}</Rate0>
    <Rate7>${data.totalIVA.taxa7.toFixed(2)}</Rate7>
    <Rate14>${data.totalIVA.taxa14.toFixed(2)}</Rate14>
    <Total>${data.totalIVA.total.toFixed(2)}</Total>
  </TaxSummary>`;

  const clientesXml = `
  <Customers>
    ${data.clientes
      .map(
        (c) => `
    <Customer>
      <NIF>${escapeXml(c.nif)}</NIF>
      <Name>${escapeXml(c.nome)}</Name>
      <Amount>${c.montante.toFixed(2)}</Amount>
    </Customer>`
      )
      .join('')}
  </Customers>`;

  const detalheXml = data.documentosDetalhe && data.documentosDetalhe.length > 0
    ? `
  <SalesInvoices>
    ${data.documentosDetalhe
      .map(
        (d) => `
    <Invoice>
      <InvoiceNo>${escapeXml(d.numeroCompleto)}</InvoiceNo>
      <InvoiceDate>${d.data}</InvoiceDate>
      <InvoiceType>${escapeXml(d.tipo)}</InvoiceType>
      <Series>${escapeXml(d.serie)}</Series>
      <CustomerID>${escapeXml(d.nifCliente || 'Consumidor Final')}</CustomerID>
      <Subtotal>${d.subtotal.toFixed(2)}</Subtotal>
      <TaxPayable>${d.totalIVA.toFixed(2)}</TaxPayable>
      <Total>${d.total.toFixed(2)}</Total>
    </Invoice>`
      )
      .join('')}
  </SalesInvoices>`
    : '';

  const xmlFooter = `
</SAF-T>`;

  return (
    xmlHeader +
    headerXml +
    masterFilesXml +
    documentosXml +
    ivaXml +
    clientesXml +
    detalheXml +
    xmlFooter
  );
}

/**
 * Valida documento para requisitos SAF-T
 */
export function validarDocumentoSAFT(documento: Documento): { valido: boolean; erros: string[] } {
  const erros: string[] = [];

  // Campos obrigatórios
  if (!documento.numeroCompleto) erros.push('Número do documento é obrigatório');
  if (!documento.clienteId && !documento.fornecedorId) {
    erros.push('Cliente ou fornecedor é obrigatório');
  }
  if (!documento.dataEmissao) erros.push('Data de emissão é obrigatória');
  if (!documento.linhas || documento.linhas.length === 0) {
    erros.push('Documento deve ter pelo menos uma linha');
  }

  // Validar linhas
  documento.linhas.forEach((linha, idx) => {
    if (!linha.descricao) erros.push(`Linha ${idx + 1}: Descrição obrigatória`);
    if (linha.quantidade <= 0) erros.push(`Linha ${idx + 1}: Quantidade deve ser maior que 0`);
    if (linha.preco < 0) erros.push(`Linha ${idx + 1}: Preço não pode ser negativo`);
    if (![0, 7, 14].includes(linha.taxaIVA)) {
      erros.push(`Linha ${idx + 1}: Taxa de IVA inválida para Angola (use 0, 7 ou 14)`);
    }
  });

  return {
    valido: erros.length === 0,
    erros,
  };
}

/**
 * T3.3 · Validador de Esquema e Integridade SAF-T contra requisitos AGT
 */
export function validarEsquemaSAFT(data: SAFTData): { valido: boolean; erros: string[] } {
  const erros: string[] = [];

  if (!data.empresa || !data.empresa.nif) {
    erros.push('NIF da empresa emitente é obrigatório no cabeçalho SAF-T (Header/CompanyID)');
  } else if (!/^\d{9}[A-Z]{2}\d{3}$/.test(data.empresa.nif) && data.empresa.nif.length < 9) {
    erros.push('Formato do NIF da empresa inválido para os padrões da AGT');
  }

  if (!data.periodo || !data.periodo.mes || !data.periodo.ano) {
    erros.push('Período fiscal (Mês e Ano) é obrigatório para a exportação SAF-T');
  }

  // MasterFiles — TaxTable e Products (T3.1/T3.3)
  if (data.tabelaImpostos && data.tabelaImpostos.length > 0) {
    data.tabelaImpostos.forEach((t, idx) => {
      if (!t.codigo) erros.push(`TaxTable #${idx + 1}: código do imposto em falta`);
      if (![0, 7, 14].includes(t.taxa)) {
        erros.push(`TaxTable #${idx + 1}: taxa de IVA inválida (${t.taxa}) — use 0, 7 ou 14`);
      }
    });
  } else {
    erros.push('TaxTable (MasterFiles) vazia — declare as taxas de IVA usadas no período');
  }

  if (data.artigos && data.artigos.length > 0) {
    data.artigos.forEach((a, idx) => {
      if (!a.codigo) erros.push(`Products #${idx + 1}: código do artigo em falta`);
      if (!a.descricao) erros.push(`Products #${idx + 1}: descrição do artigo em falta`);
      if (a.preco < 0) erros.push(`Products #${idx + 1}: preço unitário não pode ser negativo`);
      if (![0, 7, 14].includes(a.taxaIVA)) {
        erros.push(`Products #${idx + 1}: taxa de IVA inválida (${a.taxaIVA})`);
      }
    });
  }

  if (data.documentosDetalhe) {
    data.documentosDetalhe.forEach((doc, idx) => {
      if (!doc.numeroCompleto) {
        erros.push(`Documento #${idx + 1}: Número completo (InvoiceNo) em falta`);
      }
      if (!doc.tipo) {
        erros.push(`Documento #${idx + 1}: Tipo de documento em falta`);
      }
      if (doc.total < 0) {
        erros.push(`Documento #${idx + 1}: Valor total não pode ser negativo`);
      }
    });
  }

  return {
    valido: erros.length === 0,
    erros,
  };
}

/**
 * T3.4 · Módulo de Relatórios de IVA (Balancete & Modelo DP-IVA)
 */
export interface RelatorioDPIVA {
  periodo: { mes: number; ano: number };
  incidenciaTributavel: {
    taxa0: number;
    taxa7: number;
    taxa14: number;
  };
  impostoApurado: {
    taxa7: number;
    taxa14: number;
    totalImposto: number;
  };
  totalGeral: {
    baseTributavel: number;
    imposto: number;
    faturacaoGlobal: number;
  };
}

export function gerarRelatorioDPIVA(documentos: Documento[], mes: number, ano: number): RelatorioDPIVA {
  const docsPeriodo = documentos.filter((d) => {
    const data = new Date(d.dataEmissao);
    return data.getMonth() + 1 === mes && data.getFullYear() === ano;
  });

  let base0 = 0;
  let base7 = 0;
  let base14 = 0;
  let iva7 = 0;
  let iva14 = 0;
  let faturacaoGlobal = 0;

  docsPeriodo.forEach((d) => {
    faturacaoGlobal += d.total;
    d.linhas.forEach((l) => {
      const sub = l.total;
      if (l.taxaIVA === 0) {
        base0 += sub;
      } else if (l.taxaIVA === 7) {
        base7 += sub;
        iva7 += (sub * 7) / 100;
      } else if (l.taxaIVA === 14) {
        base14 += sub;
        iva14 += (sub * 14) / 100;
      }
    });
  });

  const baseTributavel = base0 + base7 + base14;
  const totalImposto = iva7 + iva14;

  return {
    periodo: { mes, ano },
    incidenciaTributavel: {
      taxa0: base0,
      taxa7: base7,
      taxa14: base14,
    },
    impostoApurado: {
      taxa7: iva7,
      taxa14: iva14,
      totalImposto,
    },
    totalGeral: {
      baseTributavel,
      imposto: totalImposto,
      faturacaoGlobal,
    },
  };
}

/**
 * Helper para escapar caracteres XML
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
