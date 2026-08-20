import { jsPDF } from 'jspdf';
import type { Documento, Cliente, ConfiguracaoEmpresa, TipoDocumento } from './types';
import { formatMoedaAOA, formatData, valorPorExtenso } from './formatters';
import { gerarMatrizQR } from './qrcode';
import { formatarHash } from './fiscal-hash';
import {
  gerarHashEncadeado,
  construirPayloadQRDeFatura,
  resumoAssinaturaJWS,
} from './crypto-engine';
import { getTituloDocumento } from './pdf-generator';
import { SOFTWARE_NOME, SOFTWARE_CERTIFICACAO_AGT } from './constants';

/**
 * Gerador de PDF — FASE 1 · Conformidade AGT (T1.6)
 *
 * Layout A4 com todos os elementos de conformidade do Decreto Presidencial
 * n.º 71/25 incorporados no impresso:
 *  - R5/R8 · QR Code regulamentar com o payload de validação
 *  - R5/R9 · Assinatura digital JWS (resumo seguro)
 *  - R5/R12 · Hash de integridade SHA-256 e hash anterior (cadeia)
 *  - R5/R15 · N.º de certificação AGT do software
 *  - R14 · utilizador que emitiu/assinou o documento
 */

export interface OpcoesPDFAGT {
  via?: 'original' | '2via';
  semChaves?: boolean; // quando não há chave/assinatura (pré-visualização)
}

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN = 14;

function corBanda(tipo: string): [number, number, number] {
  switch (tipo) {
    case 'FaturaRecibo':
      return [16, 185, 129];
    case 'Simplificada':
      return [217, 119, 6];
    case 'NotaCredito':
      return [225, 29, 72];
    case 'NotaDebito':
      return [234, 88, 12];
    case 'Orcamento':
      return [124, 58, 237];
    case 'GuiaRemessa':
      return [2, 132, 199];
    default:
      return [37, 99, 235];
  }
}

function quebraLinha(texto: string, maxWidth: number): string[] {
  const linhas: string[] = [];
  let atual = '';
  for (const palavra of texto.split(' ')) {
    const teste = atual ? `${atual} ${palavra}` : palavra;
    if (teste.length * 1.55 > maxWidth && atual) {
      linhas.push(atual);
      atual = palavra;
    } else {
      atual = teste;
    }
  }
  if (atual) linhas.push(atual);
  return linhas;
}

function desenharQR(doc: jsPDF, matriz: boolean[][], x: number, y: number, moduloMm: number) {
  const n = matriz.length;
  doc.setFillColor(0, 0, 0);
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (matriz[r][c]) doc.rect(x + c * moduloMm, y + r * moduloMm, moduloMm, moduloMm, 'F');
    }
  }
}

/**
 * Gera o PDF A4 do documento com os elementos de conformidade AGT.
 * Compatível com a assinatura de `gerarPDFFatura` (mesma invocação).
 */
export async function gerarPDFFaturaAGT(
  fatura: Documento,
  cliente: Cliente | null,
  empresa: ConfiguracaoEmpresa | null,
  options?: OpcoesPDFAGT
): Promise<jsPDF> {
  const via = options?.via || 'original';

  // ── Hash encadeado (R12/R13) ───────────────────────────────────────────────
  let hash = fatura.hash || '';
  if (!hash) {
    const encadeado = await gerarHashEncadeado(
      {
        tipo: fatura.tipo,
        serie: fatura.serie,
        numero: String(fatura.numero),
        numeroCompleto: fatura.numeroCompleto || `${fatura.serie}/${String(fatura.numero).padStart(6, '0')}`,
        dataEmissao: fatura.dataEmissao,
        clienteNif: cliente?.nif,
        subtotal: fatura.subtotal,
        totalIVA: fatura.totalIVA,
        total: fatura.total,
        formaPagamento: fatura.formaPagamento,
        linhas: fatura.linhas || [],
      },
      fatura.hashAnterior
    );
    hash = encadeado.hash;
  }
  const hashAnterior = fatura.hashAnterior || null;

  // ── Payload e matriz do QR Code (R8) ───────────────────────────────────────
  const qrPayload =
    fatura.qrPayload ||
    construirPayloadQRDeFatura(
      {
        tipo: fatura.tipo,
        serie: fatura.serie,
        numero: fatura.numero,
        numeroCompleto: fatura.numeroCompleto,
        dataEmissao: fatura.dataEmissao,
        hash,
        subtotal: fatura.subtotal,
        totalIVA: fatura.totalIVA,
        total: fatura.total,
        formaPagamento: fatura.formaPagamento,
      },
      { nif: empresa?.nif || '', softwareCertificacaoNumero: empresa?.softwareCertificacaoNumero },
      cliente?.nif
    );

  const matrizQR = gerarMatrizQR(qrPayload);

  // ── Documento PDF ──────────────────────────────────────────────────────────
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const contentWidth = PAGE_WIDTH - MARGIN * 2;
  let y = 0;

  // 1. Faixa colorida por tipo de documento
  const [rBand, gBand, bBand] = corBanda(fatura.tipo);
  doc.setFillColor(rBand, gBand, bBand);
  doc.rect(0, 0, PAGE_WIDTH, 8, 'F');

  doc.setFillColor(rBand, gBand, bBand);
  doc.rect(0, 8, PAGE_WIDTH, 0.8, 'F');

  // 2. Título oficial do documento
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.text(getTituloDocumento(fatura.tipo), PAGE_WIDTH / 2, 16, { align: 'center' });

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Nº ${fatura.numeroCompleto || fatura.numero}`, PAGE_WIDTH / 2, 22, { align: 'center' });

  y = 30;

  // 3. Identificação da empresa + certificação AGT (R7/R15)
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(empresa?.nomeEmpresa || 'KIMA FACTURAÇÃO', MARGIN, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  if (empresa?.nif) {
    doc.text(`NIF: ${empresa.nif}`, MARGIN, y);
    y += 4;
  }
  if (empresa?.morada) {
    doc.text(empresa.morada, MARGIN, y);
    y += 4;
  }
  const contacto = [empresa?.telefone, empresa?.email].filter(Boolean).join(' · ');
  if (contacto) {
    doc.text(contacto, MARGIN, y);
    y += 4;
  }
  y += 3;

  // Bloco de certificação (software + Nº AGT)
  const numeroCert = empresa?.softwareCertificacaoNumero || SOFTWARE_CERTIFICACAO_AGT;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(
    `Processado por ${empresa?.softwareNome || SOFTWARE_NOME} · Certificado AGT Nº ${numeroCert}`,
    MARGIN,
    y
  );
  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(107, 114, 128);
  doc.text('Decreto Presidencial n.º 71/25 · Software de facturação certificado', MARGIN, y);
  y += 7;

  // 4. Dados do documento
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
  y += 5;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  const rotulos: [string, string][] = [
    ['Data de emissão', formatData(fatura.dataEmissao)],
    ['Data de vencimento', formatData(fatura.dataVencimento)],
    ['Forma de pagamento', fatura.formaPagamento],
  ];
  let colX = MARGIN;
  const colW = contentWidth / 3;
  for (const [rotulo, valor] of rotulos) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text(rotulo, colX, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(valor, colX, y + 4.5);
    colX += colW;
  }
  y += 11;

  // Status
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(fatura.status === 'Cancelado' ? 220 : 15, fatura.status === 'Pago' ? 150 : 23, fatura.status === 'Cancelado' ? 38 : 42);
  doc.text(`Estado: ${fatura.status}`, MARGIN, y);
  y += 7;

  // 5. Cliente
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('Cliente', MARGIN, y);
  y += 4.5;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(cliente?.nome || 'Consumidor Final', MARGIN, y);
  y += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`NIF: ${cliente?.nif || 'Consumidor Final'}`, MARGIN, y);
  y += 4;
  if (cliente?.morada) {
    doc.text(cliente.morada, MARGIN, y);
    y += 4;
  }
  if (fatura.documentoReferenciado) {
    doc.text(`Documento original: ${fatura.documentoReferenciado}`, MARGIN, y);
    y += 4;
  }

  // T4.3 — Dados de Transporte na Guia de Remessa
  if (fatura.tipo === 'GuiaRemessa' && (fatura.transporteViatura || fatura.transporteMatricula || fatura.transporteMotorista)) {
    const transporteLinhas = [
      fatura.transporteViatura ? `Viatura: ${fatura.transporteViatura}` : '',
      fatura.transporteMatricula ? `Matrícula: ${fatura.transporteMatricula}` : '',
      fatura.transporteMotorista ? `Motorista: ${fatura.transporteMotorista}` : '',
    ].filter(Boolean);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(2, 132, 199);
    doc.text('Dados de transporte', MARGIN, y);
    y += 4;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(transporteLinhas.join('  ·  '), MARGIN, y);
    y += 5;
  }
  y += 3;

  // 6. Tabela de linhas
  const tabelaTopo = y;
  const descricaoW = 72;
  const qtdW = 18;
  const precoW = 30;
  const ivaW = 16;
  const totalW = contentWidth - descricaoW - qtdW - precoW - ivaW;

  doc.setFillColor(241, 245, 249);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);

  let cx = MARGIN;
  const cabecalhoLinhas: [string, number][] = [
    ['Descrição', descricaoW],
    ['Qtd', qtdW],
    ['Preço', precoW],
    ['IVA %', ivaW],
    ['Total', totalW],
  ];
  doc.rect(MARGIN, tabelaTopo, contentWidth, 6.5, 'F');
  for (const [titulo, largura] of cabecalhoLinhas) {
    doc.text(titulo, cx + 2, tabelaTopo + 4.5);
    cx += largura;
  }
  y = tabelaTopo + 9;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);

  const linhasFatura = fatura.linhas || [];
  linhasFatura.forEach((linha, idx) => {
    if (y > PAGE_HEIGHT - 62) {
      doc.addPage();
      y = 22;
    }
    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(MARGIN, y - 4.5, contentWidth, 6, 'F');
    }
    cx = MARGIN;
    const totalComIVA = linha.total + (linha.total * linha.taxaIVA) / 100;
    const valores: [string, number][] = [
      [linha.descricao, descricaoW],
      [String(linha.quantidade), qtdW],
      [formatMoedaAOA(linha.preco), precoW],
      [`${linha.taxaIVA}%`, ivaW],
      [formatMoedaAOA(totalComIVA), totalW],
    ];
    valores.forEach(([valor, largura], vIdx) => {
      doc.text(
        valor.substring(0, 44),
        cx + 2,
        y,
        vIdx === 4 ? { align: 'right', maxWidth: largura - 4 } : { maxWidth: largura - 4 }
      );
      cx += largura;
    });
    y += 6;
  });

  doc.setDrawColor(203, 213, 225);
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
  y += 6;

  // 7. Totais
  const totalLargura = 90;
  const linhaTotais: [string, string, boolean][] = [
    ['Subtotal', formatMoedaAOA(fatura.subtotal), false],
    ['IVA', formatMoedaAOA(fatura.totalIVA), false],
    ['TOTAL', formatMoedaAOA(fatura.total), true],
  ];
  for (const [rotulo, valor, destaque] of linhaTotais) {
    doc.setFont('helvetica', destaque ? 'bold' : 'normal');
    doc.setFontSize(destaque ? 11 : 9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(rotulo, PAGE_WIDTH - MARGIN - totalLargura, y);
    doc.text(valor, PAGE_WIDTH - MARGIN, y, { align: 'right' });
    y += destaque ? 7 : 5.5;
  }
  y += 4;

  // Valor por extenso (Art. 10º d — DP 71/25)
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  const porExtenso = valorPorExtenso(fatura.total);
  for (const linha of quebraLinha(`Valor por extenso: ${porExtenso}`, contentWidth)) {
    doc.text(linha, MARGIN, y);
    y += 4;
  }
  y += 4;

  if (fatura.motivoIsencaoIVA) {
    doc.setFont('helvetica', 'normal');
    doc.text(`Motivo de isenção de IVA: ${fatura.motivoIsencaoIVA}`, MARGIN, y);
    y += 5;
  }
  if (fatura.observacoes) {
    doc.setFont('helvetica', 'italic');
    for (const linha of quebraLinha(`Observações: ${fatura.observacoes}`, contentWidth)) {
      doc.text(linha, MARGIN, y);
      y += 4;
    }
    y += 4;
  }

  // 8. Bloco de segurança AGT — QR Code + Hash + Assinatura (R8/R9/R12/R13)
  if (y > PAGE_HEIGHT - 62) {
    doc.addPage();
    y = 22;
  }

  doc.setFillColor(248, 250, 252);
  doc.rect(MARGIN, y, contentWidth, 54, 'F');
  y += 6;

  // QR Code (32×32 mm com margem de 2 módulos de quiet zone)
  const qrN = matrizQR.length;
  const qrMm = 0.55;
  const qrPx = qrN * qrMm;
  const qrX = MARGIN + 6;
  const qrY = y + 4;
  doc.setFillColor(255, 255, 255);
  doc.rect(qrX - 1.5, qrY - 1.5, qrPx + 3, qrPx + 3, 'F');
  desenharQR(doc, matrizQR, qrX, qrY, qrMm);

  // Dados de segurança à direita do QR
  const textX = qrX + qrPx + 8;
  const textW = PAGE_WIDTH - MARGIN - textX - 4;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('Conformidade AGT — DP 71/25', textX, y + 3);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);

  let sy = y + 8;
  const camposSeguranca: [string, string][] = [
    ['Hash (SHA-256)', formatarHash(hash, 8, 8)],
    ['Hash anterior', hashAnterior ? formatarHash(hashAnterior, 8, 6) : '—'],
    ['Assinatura digital', fatura.assinaturaJWS ? resumoAssinaturaJWS(fatura.assinaturaJWS) : '(não assinado)'],
    ['Emitido por', fatura.assinadoPor || fatura.criadoPor || 'Sistema'],
  ];
  for (const [rotulo, valor] of camposSeguranca) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text(rotulo, textX, sy);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    for (const linha of quebraLinha(valor, textW)) {
      doc.text(linha, textX, sy + 3.5);
      sy += 3.5;
    }
    sy += 4.5;
  }

  // Assinatura se presente (resumo, nunca a chave)
  if (fatura.assinaturaJWS) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(16, 185, 129);
    doc.text('✓ Documento assinado digitalmente (RS256)', textX, sy);
  }

  y += 54;
  y += 6;

  // 9. Rodapé — menção de via e software
  doc.setDrawColor(203, 213, 225);
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(
    via === '2via' ? '2.ª VIA, EM CONFORMIDADE COM A ORIGINAL' : 'ORIGINAL',
    PAGE_WIDTH / 2,
    y,
    { align: 'center' }
  );
  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(107, 114, 128);
  doc.text(
    `Gerado por ${empresa?.softwareNome || SOFTWARE_NOME} · Certificação AGT Nº ${numeroCert} · Página ${doc.getNumberOfPages()}`,
    PAGE_WIDTH / 2,
    y,
    { align: 'center' }
  );

  return doc;
}





