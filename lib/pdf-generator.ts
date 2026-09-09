import { jsPDF } from "jspdf";
import type { Documento, Cliente, ConfiguracaoEmpresa, TipoDocumento } from "./types";
import { formatMoedaAOA, formatData, valorPorExtenso } from "./formatters";
import { gerarHashFiscal, formatarHash } from "./fiscal-hash";
import { SOFTWARE_NOME, SOFTWARE_CERTIFICACAO_AGT } from "./constants";

/**
 * Retorna o título oficial do documento de acordo com o Decreto Presidencial nº 71/25
 * (Art. 3º e Art. 4º, nº 9).
 */
export function getTituloDocumento(tipo: TipoDocumento): string {
  switch (tipo) {
    case "Fatura":
      return "FACTURA";
    case "FaturaRecibo":
      return "FACTURA-RECIBO";
    case "NotaCredito":
      return "NOTA DE CRÉDITO";
    case "NotaDebito":
      return "NOTA DE DÉBITO";
    case "Orcamento":
      return "FACTURA PRO-FORMA";
    case "Recibo":
      return "RECIBO";
    default:
      return "DOCUMENTO COMMERCIAL";
  }
}

export function hexToRgb(hex?: string, fallback: [number, number, number] = [37, 99, 235]): [number, number, number] {
  if (!hex) return fallback;
  const clean = hex.replace("#", "").trim();
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    return isNaN(r) || isNaN(g) || isNaN(b) ? fallback : [r, g, b];
  }
  if (clean.length === 6) {
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    return isNaN(r) || isNaN(g) || isNaN(b) ? fallback : [r, g, b];
  }
  return fallback;
}

function calcularBaseLinha(linha: Pick<Documento["linhas"][number], "quantidade" | "preco"> & { desconto?: number }): number {
  const quantidade = Number(linha.quantidade ?? 0);
  const preco = Number(linha.preco ?? 0);
  const desconto = Number(linha.desconto ?? 0);
  return Math.max(0, quantidade * preco - desconto);
}

function calcularTotalLinhaComIVA(linha: Pick<Documento["linhas"][number], "quantidade" | "preco" | "taxaIVA"> & { desconto?: number }): number {
  const base = calcularBaseLinha(linha);
  const taxaIVA = Number(linha.taxaIVA ?? 0);
  return Number((base + (base * taxaIVA) / 100).toFixed(2));
}

function calcularTotaisItens(linhas: Array<Pick<Documento["linhas"][number], "quantidade" | "preco" | "taxaIVA"> & { desconto?: number }>): {
  subtotal: number;
  totalIVA: number;
  total: number;
} {
  const subtotal = linhas.reduce((acc, linha) => acc + calcularBaseLinha(linha), 0);
  const total = linhas.reduce((acc, linha) => acc + calcularTotalLinhaComIVA(linha), 0);
  return {
    subtotal: Number(subtotal.toFixed(2)),
    totalIVA: Number((total - subtotal).toFixed(2)),
    total: Number(total.toFixed(2)),
  };
}

/**
 * Serviço de Geração de PDF profissional para todos os tipos de documentos comerciais no Kima Facturação.
 * Inclui requisitos fiscais do Decreto Presidencial nº 71/25: hash, identificação do software AGT,
 * valor por extenso, menção Original / 2.ª via, e suporte a 8 modelos visuais modernos inspirados
 * nas melhores referências de design corporativo e editorial.
 */
export async function gerarPDFFatura(
  fatura: Documento,
  cliente: Cliente | null,
  empresa: ConfiguracaoEmpresa | null,
  options?: { via?: "original" | "2via" }
) {
  const via = options?.via || "original";
  const modelo = empresa?.modeloDocumento || "classico";

  // Hash fiscal determinístico (Art. 10º j — DP 71/25)
  let hash = fatura.hash || "";
  if (!hash) {
    hash = await gerarHashFiscal({
      tipo: fatura.tipo,
      serie: fatura.serie,
      numero: String(fatura.numero),
      numeroCompleto: fatura.numeroCompleto || `${fatura.serie}/${String(fatura.numero).padStart(6, "0")}`,
      dataEmissao: fatura.dataEmissao,
      clienteNif: cliente?.nif,
      subtotal: fatura.subtotal,
      totalIVA: fatura.totalIVA,
      total: fatura.total,
      formaPagamento: fatura.formaPagamento,
      linhas: fatura.linhas || [],
    });
  }

  const linhasDocumento = fatura.linhas || [];
  const totaisCalculados = calcularTotaisItens(linhasDocumento);
  const subtotalSeguro = Number.isFinite(fatura.subtotal) && fatura.subtotal >= 0 ? fatura.subtotal : totaisCalculados.subtotal;
  const totalIvaSeguro = Number.isFinite(fatura.totalIVA) && fatura.totalIVA >= 0 ? fatura.totalIVA : totaisCalculados.totalIVA;
  const totalSeguro = Number.isFinite(fatura.total) && fatura.total >= 0 ? fatura.total : totaisCalculados.total;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = 18;

  // 1. Definição da Cor da Marca / Documento
  let barColor = hexToRgb(empresa?.corPrimaria, [37, 99, 235]); // Cor primária da empresa (default: azul #2563EB)
  
  // Cores de estado e tipos específicos de alerta fiscal
  if (fatura.tipo === "NotaCredito") {
    barColor = [225, 29, 72]; // Rosa/Vermelho fiscal
  } else if (fatura.tipo === "NotaDebito") {
    barColor = [234, 88, 12]; // Laranja fiscal
  }

  // ── 1. CABEÇALHO & TOPO POR MODELO ─────────────────────────────────────────
  const isDarkHeader = modelo === "bold";
  const isStudio = modelo === "studio";

  if (isStudio) {
    // Studio: Barra vertical contínua na borda esquerda da folha
    doc.setFillColor(barColor[0], barColor[1], barColor[2]);
    doc.rect(0, 0, 4, pageHeight, "F");
    y = 16;
  } else if (isDarkHeader) {
    // Bold: Bloco superior escuro / com a cor da marca
    doc.setFillColor(barColor[0], barColor[1], barColor[2]);
    doc.rect(0, 0, pageWidth, 28, "F");
    y = 10;
  } else if (modelo === "classico") {
    // Clássico: Faixa sólida de 5mm no topo
    doc.setFillColor(barColor[0], barColor[1], barColor[2]);
    doc.rect(0, 0, pageWidth, 5, "F");
    y = 18;
  } else if (modelo === "executivo") {
    // Executivo: Banner suave com fundo tint e barra de acento
    doc.setFillColor(Math.min(255, barColor[0] + 195), Math.min(255, barColor[1] + 195), Math.min(255, barColor[2] + 195));
    doc.rect(0, 0, pageWidth, 24, "F");
    doc.setFillColor(barColor[0], barColor[1], barColor[2]);
    doc.rect(0, 24, pageWidth, 1.5, "F");
    y = 12;
  } else if (modelo === "nordic") {
    // Nordic: Duas linhas finas paralelas no topo
    doc.setFillColor(barColor[0], barColor[1], barColor[2]);
    doc.rect(15, 8, pageWidth - 30, 1.2, "F");
    doc.setFillColor(226, 232, 240);
    doc.rect(15, 10.2, pageWidth - 30, 0.4, "F");
    y = 18;
  } else if (modelo === "grid") {
    // Grid: Sem barra de topo; espaçamento para cartões
    y = 15;
  } else if (modelo === "compacto") {
    // Compacto: Faixa fina de 3mm
    doc.setFillColor(barColor[0], barColor[1], barColor[2]);
    doc.rect(0, 0, pageWidth, 3, "F");
    y = 13;
  } else {
    // Moderno: Margem inicial limpa
    y = 16;
  }

  // ── 2. LOGOTIPO OU NOME DA EMPRESA ─────────────────────────────────────────
  const logoSrc = empresa?.logoUrl;
  let logoDrawn = false;
  const logoX = isStudio ? 18 : 15;

  if (logoSrc && logoSrc.startsWith("data:image")) {
    try {
      const fmt = logoSrc.startsWith("data:image/png") ? "PNG"
        : logoSrc.startsWith("data:image/jpeg") ? "JPEG"
        : "PNG";
      const logoH = modelo === "compacto" ? 13 : 17;
      const logoW = modelo === "compacto" ? 28 : 34;
      doc.addImage(logoSrc, fmt, logoX, y - (modelo === "executivo" || isDarkHeader ? 2 : 4), logoW, logoH);
      logoDrawn = true;
    } catch (_) {
      logoDrawn = false;
    }
  }

  if (!logoDrawn) {
    doc.setFontSize(modelo === "compacto" ? 13 : 16);
    doc.setFont("helvetica", "bold");
    if (isDarkHeader) {
      doc.setTextColor(255, 255, 255);
    } else {
      doc.setTextColor(barColor[0], barColor[1], barColor[2]);
    }
    doc.text(empresa?.nomeEmpresa || "KIMA FACTURAÇÃO", logoX, y + 5);
  }

  // ── 3. TÍTULO DO DOCUMENTO & NÚMERO À DIREITA ───────────────────────────────
  const tituloDoc = getTituloDocumento(fatura.tipo);
  doc.setFontSize(modelo === "compacto" ? 13 : 16);
  doc.setFont("helvetica", "bold");
  if (isDarkHeader) {
    doc.setTextColor(255, 255, 255);
  } else {
    doc.setTextColor(30, 41, 59);
  }
  doc.text(tituloDoc, pageWidth - 15, y + 2, { align: "right" });

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  if (isDarkHeader) {
    doc.setTextColor(241, 245, 249);
  } else {
    doc.setTextColor(100, 116, 139);
  }
  const numCompleto = fatura.numeroCompleto || `${fatura.serie}/${String(fatura.numero).padStart(6, "0")}`;
  doc.text(`Nº: ${numCompleto}`, pageWidth - 15, y + 7.5, { align: "right" });

  // Menção Original / 2.ª via (Art. 7º, n.ºs 4 e 5 — DP 71/25)
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  if (isDarkHeader) {
    doc.setTextColor(via === "2via" ? 203 : 241, via === "2via" ? 213 : 245, via === "2via" ? 225 : 249);
  } else {
    doc.setTextColor(via === "2via" ? 148 : 100, via === "2via" ? 163 : 116, via === "2via" ? 184 : 139);
  }
  doc.text(
    via === "2via" ? "2.ª VIA, EM CONFORMIDADE COM A ORIGINAL" : "ORIGINAL",
    pageWidth - 15,
    y + 12,
    { align: "right" }
  );

  y += (modelo === "compacto" ? 16 : isDarkHeader ? 24 : modelo === "executivo" ? 20 : 20);

  // Linhas divisórias de cabeçalho
  if (modelo === "moderno" || isStudio) {
    doc.setDrawColor(barColor[0], barColor[1], barColor[2]);
    doc.setLineWidth(0.8);
    doc.line(logoX, y, pageWidth - 15, y);
    y += 7;
  } else if (modelo === "nordic") {
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.line(15, y, pageWidth - 15, y);
    y += 7;
  } else if (!isDarkHeader && modelo !== "executivo" && modelo !== "grid") {
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.line(15, y, pageWidth - 15, y);
    y += 7;
  } else {
    y += 4;
  }

  // ── 4. DADOS DO EMISSOR & CLIENTE ──────────────────────────────────────────
  const col1 = isStudio ? 18 : 15;
  const col2 = pageWidth / 2 + (isStudio ? 5 : 4);
  const halfBoxWidth = (pageWidth / 2) - (isStudio ? 22 : 19);

  const writeInfoBlock = (
    label: string,
    name: string,
    lines: string[],
    x: number,
    startY: number
  ) => {
    if (modelo === "executivo") {
      // Executivo: Cartão com borda lateral na cor da marca
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(x, startY - 2, halfBoxWidth, 31, 1.5, 1.5, "F");
      doc.setFillColor(barColor[0], barColor[1], barColor[2]);
      doc.rect(x, startY - 2, 2.5, 31, "F");
      x += 5;
    } else if (modelo === "grid") {
      // Grid: Cartão estruturado com contorno suave
      doc.setFillColor(250, 250, 250);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(x, startY - 2, halfBoxWidth, 31, 2, 2, "FD");
      x += 4;
    }

    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(barColor[0], barColor[1], barColor[2]);
    doc.text(label.toUpperCase(), x, startY + 2);

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.text(name.length > 34 ? name.substring(0, 34) + "…" : name, x, startY + 6.5);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    lines.forEach((line, i) => {
      doc.text(line.length > 38 ? line.substring(0, 38) + "…" : line, x, startY + 11 + i * 4.2);
    });
  };

  const emissorLines = [
    `NIF: ${empresa?.nif || "N/A"}`,
    `${empresa?.morada || "N/A"}`,
    `Tel: ${empresa?.telefone || "N/A"} | ${empresa?.email || "N/A"}`,
  ];
  if (empresa?.contaBancaria) {
    emissorLines.push(`IBAN: ${empresa.contaBancaria}`);
  }

  writeInfoBlock(
    "Emissor",
    empresa?.nomeEmpresa || "Empresa Não Configurada",
    emissorLines,
    col1,
    y
  );

  writeInfoBlock(
    "Cliente / Destinatário",
    cliente?.nome || "Consumidor Final",
    [
      `NIF: ${cliente?.nif || "Consumidor Final"}`,
      `${cliente?.morada || "N/A"}`,
      `Tel: ${cliente?.telefone || "N/A"}`,
    ],
    col2,
    y
  );

  y += (modelo === "compacto" ? 26 : 29);

  // Se for Nota de Crédito ou Nota de Débito, insere caixa de retificação/referência
  const startBoxX = isStudio ? 18 : 15;
  const fullBoxWidth = pageWidth - (isStudio ? 33 : 30);

  if ((fatura.tipo === "NotaCredito" || fatura.tipo === "NotaDebito") && (fatura.documentoReferenciado || fatura.motivo)) {
    const isNC = fatura.tipo === "NotaCredito";
    doc.setFillColor(isNC ? 254 : 255, isNC ? 242 : 247, isNC ? 242 : 237);
    doc.setDrawColor(isNC ? 254 : 255, isNC ? 202 : 237, isNC ? 202 : 213);
    doc.roundedRect(startBoxX, y, fullBoxWidth, 13, 2, 2, "FD");

    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(isNC ? 185 : 154, isNC ? 28 : 52, isNC ? 28 : 18);
    doc.text(`DOCUMENTO DE RETIFICAÇÃO REFERENTE À FATURA: ${fatura.documentoReferenciado || "N/A"}`, startBoxX + 5, y + 4.5);
    
    doc.setFont("helvetica", "normal");
    doc.setTextColor(isNC ? 127 : 124, isNC ? 29 : 45, isNC ? 29 : 18);
    const labelMotivo = isNC ? "Motivo da Retificação" : "Motivo do Débito";
    doc.text(`${labelMotivo}: ${fatura.motivo || fatura.observacoes || "Retificação Comercial"}`, startBoxX + 5, y + 9);

    y += 16;
  }

  // Se for Recibo, insere caixa de referência à fatura liquidada (Art. 6º — DP 71/25)
  if (fatura.tipo === "Recibo" && fatura.documentoReferenciado) {
    doc.setFillColor(236, 253, 245);
    doc.setDrawColor(16, 185, 129);
    doc.roundedRect(startBoxX, y, fullBoxWidth, 11, 2, 2, "FD");

    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(5, 150, 105);
    doc.text(`RECIBO REFERENTE À FATURA: ${fatura.documentoReferenciado}`, startBoxX + 5, y + 4.5);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    const dataRecibo = fatura.dataPagamento
      ? formatData(new Date(fatura.dataPagamento))
      : fatura.dataEmissao
        ? formatData(new Date(fatura.dataEmissao))
        : "—";
    doc.text(`Pagamento de ${formatMoedaAOA(fatura.total)} recebido a ${dataRecibo}`, startBoxX + 5, y + 8.5);

    y += 14;
  }

  // ── 5. CAIXA DE METADADOS (Emissão / Vencimento / Pagamento) ───────────────
  if (modelo === "moderno" || isStudio || modelo === "nordic") {
    doc.setFillColor(250, 250, 250);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(startBoxX, y, fullBoxWidth, 9, 1.5, 1.5, "FD");
  } else {
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(startBoxX, y, fullBoxWidth, 9, 1.5, 1.5, "F");
  }

  const dataEmissao = fatura.dataEmissao ? formatData(new Date(fatura.dataEmissao)) : "—";
  const dataVenc = fatura.dataVencimento ? formatData(new Date(fatura.dataVencimento)) : "—";

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text(`Emissão: ${dataEmissao}`, startBoxX + 5, y + 6);
  
  if (fatura.tipo === "FaturaRecibo" || fatura.tipo === "Recibo") {
    doc.text(`Liquidação: Pronto-Pagamento`, pageWidth / 2, y + 6, { align: "center" });
  } else if (fatura.tipo === "Orcamento") {
    doc.text(`Validade da Proposta: ${dataVenc}`, pageWidth / 2, y + 6, { align: "center" });
  } else {
    doc.text(`Vencimento: ${dataVenc}`, pageWidth / 2, y + 6, { align: "center" });
  }
  
  doc.text(`Forma Pagamento: ${fatura.formaPagamento || "—"}`, pageWidth - 19, y + 6, { align: "right" });

  y += (modelo === "compacto" ? 13 : 15);

  // Carimbo de liquidação se aplicável
  if (fatura.tipo === "FaturaRecibo" || fatura.status === "Pago") {
    doc.setDrawColor(16, 185, 129);
    doc.setFillColor(236, 253, 245);
    doc.roundedRect(pageWidth - 58, y - 2, 43, 7.5, 1.5, 1.5, "FD");
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(5, 150, 105);
    doc.text("PAGO / LIQUIDADO", pageWidth - 36.5, y + 3.2, { align: "center" });
  }

  // ── 6. TABELA DE LINHAS / ARTIGOS ──────────────────────────────────────────
  const rowHeight = modelo === "compacto" ? 5.8 : 6.8;

  if (modelo === "moderno" || isStudio || modelo === "nordic") {
    // Cabeçalho moderno/studio/nordic: cinza suave com acento colorido
    doc.setFillColor(modelo === "nordic" ? 245 : 241, modelo === "nordic" ? 245 : 245, modelo === "nordic" ? 244 : 249);
    doc.rect(startBoxX, y, fullBoxWidth, 6.8, "F");
    doc.setDrawColor(barColor[0], barColor[1], barColor[2]);
    doc.setLineWidth(0.6);
    doc.line(startBoxX, y + 6.8, pageWidth - 15, y + 6.8);

    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);
  } else {
    // Cabeçalho clássico / executivo / bold / grid: barra com a cor da marca e texto branco
    doc.setFillColor(barColor[0], barColor[1], barColor[2]);
    doc.rect(startBoxX, y, fullBoxWidth, 6.8, "F");

    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
  }

  doc.text("Descrição", startBoxX + 3, y + 4.8);
  doc.text("Qtd", 112, y + 4.8, { align: "center" });
  doc.text("Preço Unit.", 143, y + 4.8, { align: "right" });
  doc.text("IVA", 158, y + 4.8, { align: "center" });
  doc.text("Total c/ IVA", pageWidth - 17, y + 4.8, { align: "right" });

  y += 6.8;

  const linhasTabela = fatura.linhas || [];
  const linhasComCalculo = linhasTabela.map((linha) => ({
    ...linha,
    desconto: Number((linha as { desconto?: number }).desconto ?? 0),
  }));

  doc.setTextColor(30, 41, 59);
  linhasComCalculo.forEach((linha, i) => {
    if (modelo === "moderno" || isStudio || modelo === "nordic") {
      if (i % 2 === 1) {
        doc.setFillColor(250, 250, 250);
        doc.rect(startBoxX, y, fullBoxWidth, rowHeight, "F");
      }
      doc.setDrawColor(241, 245, 249);
      doc.setLineWidth(0.2);
      doc.line(startBoxX, y + rowHeight, pageWidth - 15, y + rowHeight);
    } else if (i % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(startBoxX, y, fullBoxWidth, rowHeight, "F");
    }

    const descricao = String((linha as { descricao?: string }).descricao ?? (linha as { nome?: string }).nome ?? "Item");
    const totalLinhaComIVA = calcularTotalLinhaComIVA(linha);

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(descricao.length > 46 ? `${descricao.substring(0, 46)}…` : descricao, startBoxX + 3, y + (rowHeight * 0.7));
    doc.text(String(linha.quantidade ?? 0), 112, y + (rowHeight * 0.7), { align: "center" });
    doc.text(formatMoedaAOA(Number(linha.preco ?? 0)), 143, y + (rowHeight * 0.7), { align: "right" });
    doc.text(`${Number(linha.taxaIVA ?? 0)}%`, 158, y + (rowHeight * 0.7), { align: "center" });
    doc.text(formatMoedaAOA(totalLinhaComIVA), pageWidth - 17, y + (rowHeight * 0.7), { align: "right" });

    y += rowHeight;
  });

  // Linha de separação após itens
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(startBoxX, y + 2, pageWidth - 15, y + 2);
  y += 8;

  // ── 7. BLOCO DE TOTAIS (à direita) ─────────────────────────────────────────
  const totaisX = pageWidth - 90;
  const totalIvaExibivel = Number.isFinite(fatura.totalIVA) && fatura.totalIVA >= 0 ? fatura.totalIVA : totaisCalculados.totalIVA;
  const subtotalExibivel = Number.isFinite(fatura.subtotal) && fatura.subtotal >= 0 ? fatura.subtotal : totaisCalculados.subtotal;
  const totalFinalExibivel = Number.isFinite(fatura.total) && fatura.total >= 0 ? fatura.total : totaisCalculados.total;

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);

  doc.text("Subtotal Imponível (sem IVA):", totaisX, y);
  doc.text(formatMoedaAOA(subtotalExibivel), pageWidth - 17, y, { align: "right" });
  y += 5.5;

  doc.text("Total IVA Calculado:", totaisX, y);
  doc.text(formatMoedaAOA(totalIvaExibivel), pageWidth - 17, y, { align: "right" });
  y += 5.5;

  doc.text("Total Itens c/ IVA:", totaisX, y);
  doc.text(formatMoedaAOA(totaisCalculados.total), pageWidth - 17, y, { align: "right" });
  y += 7;

  // Linha divisória antes do total
  doc.setDrawColor(226, 232, 240);
  doc.line(totaisX, y - 2, pageWidth - 15, y - 2);

  let labelTotal = "TOTAL A PAGAR (AOA):";
  if (fatura.tipo === "FaturaRecibo" || fatura.status === "Pago") {
    labelTotal = "TOTAL PAGO (AOA):";
  } else if (fatura.tipo === "NotaCredito") {
    labelTotal = "TOTAL A CREDITAR (AOA):";
  } else if (fatura.tipo === "NotaDebito") {
    labelTotal = "TOTAL A DEBITAR (AOA):";
  } else if (fatura.tipo === "Orcamento") {
    labelTotal = "TOTAL ESTIMADO (AOA):";
  } else if (fatura.tipo === "Recibo") {
    labelTotal = "TOTAL RECEBIDO (AOA):";
  }

  if (modelo === "executivo" || isDarkHeader) {
    // Caixa sólida com cantos arredondados na cor da marca
    doc.setFillColor(barColor[0], barColor[1], barColor[2]);
    doc.roundedRect(totaisX - 3, y, pageWidth - totaisX + 13 - 15, 9, 1.5, 1.5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(255, 255, 255);
    doc.text(labelTotal, totaisX, y + 6);
    doc.text(formatMoedaAOA(totalFinalExibivel), pageWidth - 17, y + 6, { align: "right" });
    y += 14;
  } else if (modelo === "grid") {
    // Grid: Cartão com contorno suave
    doc.setFillColor(250, 250, 250);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(totaisX - 3, y, pageWidth - totaisX + 13 - 15, 9, 1.5, 1.5, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(barColor[0], barColor[1], barColor[2]);
    doc.text(labelTotal, totaisX, y + 6);
    doc.text(formatMoedaAOA(totalFinalExibivel), pageWidth - 17, y + 6, { align: "right" });
    y += 14;
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(barColor[0], barColor[1], barColor[2]);
    doc.text(labelTotal, totaisX, y + 3.5);
    doc.text(formatMoedaAOA(totalFinalExibivel), pageWidth - 17, y + 3.5, { align: "right" });
    y += 14;
  }

  // ── 8. VALOR POR EXTENSO & MOTIVO DE ISENÇÃO ───────────────────────────────
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  const porExtenso = valorPorExtenso(fatura.total);
  const extensoLinhas = doc.splitTextToSize(`Valor por extenso: ${porExtenso}`, fullBoxWidth) as string[];
  extensoLinhas.forEach((line, i) => {
    doc.text(line, startBoxX, y + i * 3.8);
  });
  y += extensoLinhas.length * 3.8 + 2;

  // Motivo da não liquidação do IVA (Art. 10º, alínea f — DP 71/25)
  if (fatura.motivoIsencaoIVA) {
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(120, 53, 15);
    const isencaoLinhas = doc.splitTextToSize(
      `IVA não liquidado — ${fatura.motivoIsencaoIVA}`,
      fullBoxWidth
    ) as string[];
    isencaoLinhas.forEach((line, i) => {
      doc.text(line, startBoxX, y + i * 3.8);
    });
    y += isencaoLinhas.length * 3.8 + 2;
  }

  // Observações (se existirem)
  if (fatura.observacoes && fatura.observacoes.trim()) {
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(71, 85, 105);
    doc.text("Observações:", startBoxX, y);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    const obsLines = doc.splitTextToSize(fatura.observacoes, fullBoxWidth) as string[];
    obsLines.forEach((line, i) => {
      doc.text(line, startBoxX, y + 4 + i * 4);
    });
  }

  // ── 9. RODAPÉ LEGAL CERTIFICADO AGT (Art. 10º j — DP 71/25) ────────────────
  const softwareNome = empresa?.softwareNome || SOFTWARE_NOME;
  const certNum = empresa?.softwareCertificacaoNumero || SOFTWARE_CERTIFICACAO_AGT;
  const hashCurto = formatarHash(hash, 4, 8);

  if (modelo === "moderno" || isStudio || modelo === "nordic") {
    // Rodapé moderno: linha superior sutil, fundo branco e texto discreto
    doc.setDrawColor(barColor[0], barColor[1], barColor[2]);
    doc.setLineWidth(0.6);
    doc.line(startBoxX, pageHeight - 11, pageWidth - 15, pageHeight - 11);

    doc.setFontSize(6.8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Processado por ${softwareNome} · Certificação AGT ${certNum} · Documento emitido eletronicamente`,
      pageWidth / 2,
      pageHeight - 7,
      { align: "center" }
    );
    doc.setFont("helvetica", "bold");
    doc.setTextColor(71, 85, 105);
    doc.text(`Código Hash: ${hashCurto}`, pageWidth / 2, pageHeight - 3.5, { align: "center" });
  } else {
    // Rodapé clássico/executivo/bold/grid/compacto: barra sólida com texto branco
    doc.setFillColor(barColor[0], barColor[1], barColor[2]);
    doc.rect(isStudio ? 4 : 0, pageHeight - 8, isStudio ? pageWidth - 4 : pageWidth, 8, "F");

    doc.setFontSize(6.8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(255, 255, 255);
    doc.text(
      `Processado por ${softwareNome} · Certificação AGT ${certNum} · Documento emitido eletronicamente`,
      pageWidth / 2,
      pageHeight - 5.5,
      { align: "center" }
    );
    doc.setFont("helvetica", "bold");
    doc.text(`Código Hash: ${hashCurto}`, pageWidth / 2, pageHeight - 2.2, { align: "center" });
  }

  return doc;
}

