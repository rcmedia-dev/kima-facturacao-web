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
  movimentos: LogAuditoria[];
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
  ano: number
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
    movimentos: logsRelevantes,
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

  const xmlFooter = `
</SAF-T>`;

  return (
    xmlHeader +
    headerXml +
    documentosXml +
    ivaXml +
    clientesXml +
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
      erros.push(`Linha ${idx + 1}: Taxa de IVA inválida (deve ser 0, 7 ou 14)`);
    }
  });

  return {
    valido: erros.length === 0,
    erros,
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
