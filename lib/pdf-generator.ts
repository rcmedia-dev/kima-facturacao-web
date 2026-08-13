import { jsPDF } from "jspdf";
import type { Documento, Cliente, ConfiguracaoEmpresa, TipoDocumento } from "./types";
import { formatMoedaAOA, formatData } from "./formatters";

/**
 * Retorna o título oficial do documento de acordo com as normas comerciais da AGT em Angola.
 */
export function getTituloDocumento(tipo: TipoDocumento): string {
  switch (tipo) {
    case "Fatura":
      return "FATURA";
    case "FaturaRecibo":
      return "FACTURA-RECIBO";
    case "Simplificada":
      return "FATURA SIMPLIFICADA";
    case "NotaCredito":
      return "NOTA DE CRÉDITO";
    case "NotaDebito":
      return "NOTA DE DÉBITO";
    case "Orcamento":
      return "ORÇAMENTO";
    case "GuiaRemessa":
      return "GUIA DE REMESSA";
    default:
      return "DOCUMENTO COMMERCIAL";
  }
}

/**
 * Serviço de Geração de PDF profissional para todos os tipos de documentos comerciais no Kima Facturação.
 */
export function gerarPDFFatura(
  fatura: Documento,
  cliente: Cliente | null,
  empresa: ConfiguracaoEmpresa | null,
  options?: { formato?: "a4" | "pos80" }
) {
  const isThermal = options?.formato === "pos80";

  if (isThermal) {
    return gerarPDFTermico80mm(fatura, cliente, empresa);
  }

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = 20;

  // 1. Faixa de cor no topo por tipo de documento
  let barColor = [37, 99, 235]; // azul padrão (Fatura)
  if (fatura.tipo === "FaturaRecibo" || fatura.status === "Pago") {
    barColor = [16, 185, 129]; // verde (Fatura Recibo)
  } else if (fatura.tipo === "Simplificada") {
    barColor = [217, 119, 6]; // âmbar (Simplificada)
  } else if (fatura.tipo === "NotaCredito") {
    barColor = [225, 29, 72]; // rosa/vermelho (Nota Crédito)
  } else if (fatura.tipo === "NotaDebito") {
    barColor = [234, 88, 12]; // laranja (Nota Débito)
  } else if (fatura.tipo === "Orcamento") {
    barColor = [124, 58, 237]; // violeta (Orçamento)
  } else if (fatura.tipo === "GuiaRemessa") {
    barColor = [71, 85, 105]; // slate (Guia de Remessa)
  }

  doc.setFillColor(barColor[0], barColor[1], barColor[2]);
  doc.rect(0, 0, pageWidth, 5, "F");

  // 2. Logotipo ou Nome da Empresa
  const logoSrc = empresa?.logoUrl;
  let logoDrawn = false;

  if (logoSrc && logoSrc.startsWith("data:image")) {
    try {
      const fmt = logoSrc.startsWith("data:image/png") ? "PNG"
        : logoSrc.startsWith("data:image/jpeg") ? "JPEG"
        : "PNG";
      doc.addImage(logoSrc, fmt, 15, y - 4, 32, 18);
      logoDrawn = true;
    } catch (_) {
      logoDrawn = false;
    }
  }

  if (!logoDrawn) {
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(37, 99, 235);
    doc.text(empresa?.nomeEmpresa || "KIMA FACTURAÇÃO", 15, y + 6);
  }

  // Título do documento à direita
  const tituloDoc = getTituloDocumento(fatura.tipo);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59);
  doc.text(tituloDoc, pageWidth - 15, y + 2, { align: "right" });

  doc.setFontSize(9.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  const numCompleto = fatura.numeroCompleto || `${fatura.serie}/${String(fatura.numero).padStart(6, "0")}`;
  doc.text(`Nº: ${numCompleto}`, pageWidth - 15, y + 8, { align: "right" });

  y += 22;

  // 3. Linha divisória
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(15, y, pageWidth - 15, y);
  y += 8;

  // 4. Dados do Emissor | Dados do Cliente
  const col1 = 15;
  const col2 = pageWidth / 2 + 5;

  const writeInfoBlock = (
    label: string,
    name: string,
    lines: string[],
    x: number,
    startY: number
  ) => {
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(barColor[0], barColor[1], barColor[2]);
    doc.text(label.toUpperCase(), x, startY);

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.text(name, x, startY + 5);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    lines.forEach((line, i) => {
      doc.text(line, x, startY + 10 + i * 5);
    });
  };

  writeInfoBlock(
    "Emissor",
    empresa?.nomeEmpresa || "Empresa Não Configurada",
    [
      `NIF: ${empresa?.nif || "N/A"}`,
      `${empresa?.morada || "N/A"}`,
      `Tel: ${empresa?.telefone || "N/A"} | ${empresa?.email || "N/A"}`,
    ],
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

  y += 35;

  // Se for Nota de Crédito ou Nota de Débito, insere caixa de retificação/referência
  if ((fatura.tipo === "NotaCredito" || fatura.tipo === "NotaDebito") && (fatura.documentoReferenciado || fatura.motivo)) {
    const isNC = fatura.tipo === "NotaCredito";
    doc.setFillColor(isNC ? 254 : 255, isNC ? 242 : 247, isNC ? 242 : 237);
    doc.setDrawColor(isNC ? 254 : 255, isNC ? 202 : 237, isNC ? 202 : 213);
    doc.roundedRect(15, y, pageWidth - 30, 14, 2, 2, "FD");

    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(isNC ? 185 : 154, isNC ? 28 : 52, isNC ? 28 : 18);
    doc.text(`DOCUMENTO DE RETIFICAÇÃO REFERENTE À FATURA: ${fatura.documentoReferenciado || "N/A"}`, 20, y + 5);
    
    doc.setFont("helvetica", "normal");
    doc.setTextColor(isNC ? 127 : 124, isNC ? 29 : 45, isNC ? 29 : 18);
    const labelMotivo = isNC ? "Motivo da Retificação" : "Motivo do Débito";
    doc.text(`${labelMotivo}: ${fatura.motivo || fatura.observacoes || "Retificação Comercial"}`, 20, y + 10);

    y += 18;
  }

  // 5. Caixa de metadados (Emissão / Vencimento / Pagamento / Status)
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(15, y, pageWidth - 30, 11, 2, 2, "F");

  const dataEmissao = fatura.dataEmissao ? formatData(new Date(fatura.dataEmissao)) : "—";
  const dataVenc = fatura.dataVencimento ? formatData(new Date(fatura.dataVencimento)) : "—";

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text(`Emissão: ${dataEmissao}`, 20, y + 7.5);
  
  if (fatura.tipo === "FaturaRecibo" || fatura.tipo === "Simplificada") {
    doc.text(`Liquidação: Pronto-Pagamento`, pageWidth / 2, y + 7.5, { align: "center" });
  } else if (fatura.tipo === "Orcamento") {
    doc.text(`Validade da Proposta: ${dataVenc}`, pageWidth / 2, y + 7.5, { align: "center" });
  } else {
    doc.text(`Vencimento: ${dataVenc}`, pageWidth / 2, y + 7.5, { align: "center" });
  }
  
  doc.text(`Forma Pagamento: ${fatura.formaPagamento || "—"}`, pageWidth - 20, y + 7.5, { align: "right" });

  y += 17;

  // Se for Fatura-Recibo, Simplificada ou status PAGO, insere carimbo de liquidação
  if (fatura.tipo === "FaturaRecibo" || fatura.tipo === "Simplificada" || fatura.status === "Pago") {
    doc.setDrawColor(16, 185, 129);
    doc.setFillColor(236, 253, 245);
    doc.roundedRect(pageWidth - 60, y - 2, 45, 8, 2, 2, "FD");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(5, 150, 105);
    doc.text("PAGO / LIQUIDADO", pageWidth - 37.5, y + 3.5, { align: "center" });
  }

  // 6. Tabela de linhas
  doc.setFillColor(barColor[0], barColor[1], barColor[2]);
  doc.rect(15, y, pageWidth - 30, 7, "F");

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("Descrição", 18, y + 5);
  doc.text("Qtd", 112, y + 5, { align: "center" });
  doc.text("Preço Unit.", 143, y + 5, { align: "right" });
  doc.text("IVA", 158, y + 5, { align: "center" });
  doc.text("Total c/ IVA", pageWidth - 17, y + 5, { align: "right" });

  y += 7;

  const linhas = fatura.linhas || [];

  doc.setTextColor(30, 41, 59);
  linhas.forEach((linha, i) => {
    if (i % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(15, y, pageWidth - 30, 7, "F");
    }

    const totalLinhaComIVA = linha.total + (linha.total * linha.taxaIVA) / 100;

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.text(
      linha.descricao.length > 44 ? linha.descricao.substring(0, 44) + "…" : linha.descricao,
      18,
      y + 5
    );
    doc.text(String(linha.quantidade), 112, y + 5, { align: "center" });
    doc.text(formatMoedaAOA(linha.preco), 143, y + 5, { align: "right" });
    doc.text(`${linha.taxaIVA}%`, 158, y + 5, { align: "center" });
    doc.text(formatMoedaAOA(totalLinhaComIVA), pageWidth - 17, y + 5, { align: "right" });

    y += 7;
  });

  // Linha de separação após itens
  doc.setDrawColor(226, 232, 240);
  doc.line(15, y + 2, pageWidth - 15, y + 2);
  y += 10;

  // 7. Bloco de Totais (à direita)
  const totaisX = pageWidth - 90;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);

  doc.text("Subtotal Imponível (sem IVA):", totaisX, y);
  doc.text(formatMoedaAOA(fatura.subtotal), pageWidth - 17, y, { align: "right" });
  y += 6;

  doc.text("Total IVA Calculado:", totaisX, y);
  doc.text(formatMoedaAOA(fatura.totalIVA), pageWidth - 17, y, { align: "right" });
  y += 8;

  // Linha divisória antes do total
  doc.setDrawColor(226, 232, 240);
  doc.line(totaisX, y - 2, pageWidth - 15, y - 2);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(barColor[0], barColor[1], barColor[2]);

  let labelTotal = "TOTAL A PAGAR (AOA):";
  if (fatura.tipo === "FaturaRecibo" || fatura.tipo === "Simplificada" || fatura.status === "Pago") {
    labelTotal = "TOTAL PAGO (AOA):";
  } else if (fatura.tipo === "NotaCredito") {
    labelTotal = "TOTAL A CREDITAR (AOA):";
  } else if (fatura.tipo === "NotaDebito") {
    labelTotal = "TOTAL A DEBITAR (AOA):";
  } else if (fatura.tipo === "Orcamento") {
    labelTotal = "TOTAL ESTIMADO (AOA):";
  } else if (fatura.tipo === "GuiaRemessa") {
    labelTotal = "TOTAL MERCADORIA (AOA):";
  }

  doc.text(labelTotal, totaisX, y + 4);
  doc.text(formatMoedaAOA(fatura.total), pageWidth - 17, y + 4, { align: "right" });

  y += 16;

  // 8. Observações (se existirem)
  if (fatura.observacoes && fatura.observacoes.trim()) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(71, 85, 105);
    doc.text("Observações:", 15, y);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    const obsLines = doc.splitTextToSize(fatura.observacoes, pageWidth - 30) as string[];
    obsLines.forEach((line, i) => {
      doc.text(line, 15, y + 5 + i * 5);
    });
  }

  // 9. Rodapé legal certificado AGT
  doc.setFillColor(barColor[0], barColor[1], barColor[2]);
  doc.rect(0, pageHeight - 8, pageWidth, 8, "F");

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(255, 255, 255);
  doc.text(
    "Processado por programa certificado nº 999/AGT/2026 · Kima Facturação · Documento emitido eletronicamente",
    pageWidth / 2,
    pageHeight - 3.5,
    { align: "center" }
  );

  return doc;
}

/**
 * Geração de PDF Térmico 80mm para Faturas Simplificadas / Talões de Caixa (Retalho & Balcão).
 */
export function gerarPDFTermico80mm(
  fatura: Documento,
  cliente: Cliente | null,
  empresa: ConfiguracaoEmpresa | null
) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [80, 200], // 80mm de largura por 200mm de altura
  });

  const pageWidth = 80;
  let y = 10;

  // Nome da Empresa
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(empresa?.nomeEmpresa || "KIMA FACTURAÇÃO", pageWidth / 2, y, { align: "center" });
  y += 5;

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text(`NIF: ${empresa?.nif || "N/A"}`, pageWidth / 2, y, { align: "center" });
  y += 4;
  doc.text(`${empresa?.morada || "Luanda, Angola"}`, pageWidth / 2, y, { align: "center" });
  y += 6;

  // Linha divisória
  doc.setDrawColor(203, 213, 225);
  doc.line(5, y, 75, y);
  y += 5;

  // Título e Número
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(getTituloDocumento(fatura.tipo), pageWidth / 2, y, { align: "center" });
  y += 4;
  doc.setFontSize(8);
  doc.text(`Nº: ${fatura.numeroCompleto || fatura.numero}`, pageWidth / 2, y, { align: "center" });
  y += 5;

  // Cliente e Datas
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.text(`Cliente: ${cliente?.nome || "Consumidor Final"}`, 5, y);
  y += 4;
  doc.text(`NIF: ${cliente?.nif || "Consumidor Final"}`, 5, y);
  y += 4;
  doc.text(`Data: ${formatData(new Date(fatura.dataEmissao))}`, 5, y);
  y += 6;

  // Linha de itens
  doc.line(5, y, 75, y);
  y += 4;

  doc.setFont("helvetica", "bold");
  doc.text("Item", 5, y);
  doc.text("Qtd x Preço", 45, y);
  doc.text("Total", 75, y, { align: "right" });
  y += 4;

  fatura.linhas?.forEach((l) => {
    const totalComIVA = l.total + (l.total * l.taxaIVA) / 100;
    doc.setFont("helvetica", "normal");
    doc.text(l.descricao.substring(0, 22), 5, y);
    y += 3.5;
    doc.text(`${l.quantidade}x ${formatMoedaAOA(l.preco)}`, 5, y);
    doc.text(formatMoedaAOA(totalComIVA), 75, y, { align: "right" });
    y += 4.5;
  });

  doc.line(5, y, 75, y);
  y += 5;

  // Totais
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("TOTAL PAGO:", 5, y);
  doc.text(formatMoedaAOA(fatura.total), 75, y, { align: "right" });
  y += 5;

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.text(`Forma Pagamento: ${fatura.formaPagamento}`, 5, y);
  y += 6;

  doc.text("Processado por programa certificado nº 999/AGT/2026", pageWidth / 2, y, { align: "center" });
  y += 4;
  doc.text("Obrigado pela preferência!", pageWidth / 2, y, { align: "center" });

  return doc;
}
