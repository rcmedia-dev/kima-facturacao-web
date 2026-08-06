import { jsPDF } from "jspdf";
import type { Documento, Cliente, ConfiguracaoEmpresa } from "./types";
import { formatMoedaAOA, formatData } from "./formatters";

/**
 * Serviço de Geração de PDF profissional para Faturas no Kima Financeiro.
 * Usa jsPDF (named export) — compatível com Next.js App Router (Client Component).
 */
export function gerarPDFFatura(
  fatura: Documento,
  cliente: Cliente | null,
  empresa: ConfiguracaoEmpresa | null
) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = 20;

  // ──────────────────────────────────
  // 1. Faixa de cor no topo
  // ──────────────────────────────────
  doc.setFillColor(37, 99, 235); // azul institucional
  doc.rect(0, 0, pageWidth, 5, "F");

  // ──────────────────────────────────
  // 2. Logotipo ou Nome da Empresa
  // ──────────────────────────────────
  const logoSrc = empresa?.logoUrl;
  let logoDrawn = false;

  if (logoSrc && logoSrc.startsWith("data:image")) {
    try {
      // Detectar formato do base64
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
    doc.text(empresa?.nomeEmpresa || "KIMA FINANCEIRO", 15, y + 6);
  }

  // Título do documento à direita
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59);
  doc.text("FATURA", pageWidth - 15, y + 2, { align: "right" });

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  const numCompleto = fatura.numeroCompleto || `${fatura.serie}/${String(fatura.numero).padStart(6, "0")}`;
  doc.text(`Nº: ${numCompleto}`, pageWidth - 15, y + 8, { align: "right" });

  y += 22;

  // ──────────────────────────────────
  // 3. Linha divisória
  // ──────────────────────────────────
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(15, y, pageWidth - 15, y);
  y += 8;

  // ──────────────────────────────────
  // 4. Dados do Emissor | Dados do Cliente
  // ──────────────────────────────────
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
    doc.setTextColor(37, 99, 235);
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
      `NIF: ${cliente?.nif || "N/A"}`,
      `${cliente?.morada || "N/A"}`,
      `Tel: ${cliente?.telefone || "N/A"}`,
    ],
    col2,
    y
  );

  y += 35;

  // ──────────────────────────────────
  // 5. Caixa de metadados (Emissão / Vencimento / Pagamento)
  // ──────────────────────────────────
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(15, y, pageWidth - 30, 11, 2, 2, "F");

  const dataEmissao = fatura.dataEmissao ? formatData(new Date(fatura.dataEmissao)) : "—";
  const dataVenc = fatura.dataVencimento ? formatData(new Date(fatura.dataVencimento)) : "—";

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text(`Emissão: ${dataEmissao}`, 20, y + 7.5);
  doc.text(`Vencimento: ${dataVenc}`, pageWidth / 2, y + 7.5, { align: "center" });
  doc.text(`Pagamento: ${fatura.formaPagamento || "—"}`, pageWidth - 20, y + 7.5, { align: "right" });

  y += 17;

  // ──────────────────────────────────
  // 6. Tabela de linhas
  // ──────────────────────────────────
  // Cabeçalho da tabela
  doc.setFillColor(37, 99, 235);
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

  // ──────────────────────────────────
  // 7. Bloco de Totais (à direita)
  // ──────────────────────────────────
  const totaisX = pageWidth - 85;

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
  doc.setTextColor(37, 99, 235);
  doc.text("TOTAL A PAGAR (AOA):", totaisX, y + 4);
  doc.text(formatMoedaAOA(fatura.total), pageWidth - 17, y + 4, { align: "right" });

  y += 16;

  // ──────────────────────────────────
  // 8. Observações (se existirem)
  // ──────────────────────────────────
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

  // ──────────────────────────────────
  // 9. Rodapé legal
  // ──────────────────────────────────
  doc.setFillColor(37, 99, 235);
  doc.rect(0, pageHeight - 8, pageWidth, 8, "F");

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(255, 255, 255);
  doc.text(
    "Processado por programa certificado Kima Financeiro MVP · Documento emitido eletronicamente — Válido sem assinatura",
    pageWidth / 2,
    pageHeight - 3.5,
    { align: "center" }
  );

  return doc;
}
