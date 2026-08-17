import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { obterDocumentos, criarDocumento, obterSeriePredefinida } from "@/db/queries";
import { faturaLinhaSchema } from "@/lib/schemas";
import { gerarHashFiscal } from "@/lib/fiscal-hash";
import { z } from "zod";
import { requireCompanyId } from "@/lib/company";

const criarDocumentoSchema = z.object({
  tipo: z.enum(["Fatura", "FaturaRecibo", "Simplificada", "NotaCredito", "NotaDebito", "Orcamento", "GuiaRemessa", "AvisoCobrancaRecibo", "FaturaGenerica", "FaturaGlobal", "FaturaAdiantamento", "Recibo"]).default("Fatura"),
  serie: z.string().optional(),
  clienteId: z.string().min(1, "Cliente é obrigatório").optional(),
  fornecedorId: z.string().optional(),
  linhas: z.array(faturaLinhaSchema).min(1, "O documento deve ter pelo menos 1 linha"),
  formaPagamento: z.enum(["Numerário", "Transferência", "Multicaixa", "POS", "Cheque", "Crédito"]).default("Transferência"),
  status: z.enum(["Pago", "Pendente", "Cancelado", "Processado", "Rascunho"]).optional(),
  dataVencimento: z.string().optional(),
  observacoes: z.string().optional().default(""),
  motivoIsencaoIVA: z.string().optional(),
  dataOperacao: z.string().optional(),
  documentoReferenciado: z.string().optional(),
  motivo: z.string().optional(),
});

async function proximoNumero(companyId: string, tipo: string, serie: string): Promise<number> {
  const { data: serieRow } = await db
    .from("series_numeracao")
    .select("*")
    .eq("company_id", companyId)
    .eq("serie", serie)
    .eq("tipo_documento", tipo)
    .maybeSingle();

  if (serieRow) {
    const n = serieRow.proximo_numero;
    await db
      .from("series_numeracao")
      .update({ proximo_numero: n + 1, ultimo_numero_utilizado: n })
      .eq("id", serieRow.id);
    return n;
  }

  const documentos = await obterDocumentos(companyId, tipo);
  return documentos.length + 1;
}

export async function GET(request: Request) {
  try {
    const companyId = requireCompanyId(request);
    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get("tipo") || undefined;
    const status = searchParams.get("status");
    const dataInicioStr = searchParams.get("dataInicio");
    const dataFimStr = searchParams.get("dataFim");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    let documentos = await obterDocumentos(companyId, tipo);

    if (status && status !== "Todos") {
      documentos = documentos.filter((d) => d.status.toLowerCase() === status.toLowerCase());
    }
    if (dataInicioStr) {
      const dataInicio = new Date(dataInicioStr);
      documentos = documentos.filter((d) => new Date(d.dataEmissao) >= dataInicio);
    }
    if (dataFimStr) {
      const dataFim = new Date(dataFimStr);
      dataFim.setHours(23, 59, 59, 999);
      documentos = documentos.filter((d) => new Date(d.dataEmissao) <= dataFim);
    }

    documentos.sort(
      (a, b) => new Date(b.dataEmissao).getTime() - new Date(a.dataEmissao).getTime()
    );

    const totalItems = documentos.length;
    const totalPages = Math.ceil(totalItems / limit) || 1;
    const startIndex = (page - 1) * limit;
    const paginated = documentos.slice(startIndex, startIndex + limit);

    return NextResponse.json({
      success: true,
      data: paginated,
      pagination: { totalItems, totalPages, currentPage: page, itemsPerPage: limit },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao obter documentos" },
      { status: error.status || 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const companyId = requireCompanyId(request);
    const body = await request.json();
    const validatedData = criarDocumentoSchema.parse(body);

    let subtotal = 0;
    let totalIVA = 0;

    const linhas = validatedData.linhas.map((linha) => {
      const valorBase = linha.quantidade * linha.preco;
      const valorIVA = (valorBase * linha.taxaIVA) / 100;
      const totalLinha = valorBase + valorIVA;
      subtotal += valorBase;
      totalIVA += valorIVA;

      return {
        id: crypto.randomUUID(),
        artigoId: linha.artigoId,
        descricao: linha.descricao,
        quantidade: linha.quantidade,
        preco: linha.preco,
        taxaIVA: Number(linha.taxaIVA) as 0 | 7 | 14,
        unidadeMedida: "UN" as const,
        total: totalLinha,
      };
    });

    const total = subtotal + totalIVA;

    // Série predefinida para o tipo de documento (Art. 10º b — DP 71/25)
    const seriePredefinida = await obterSeriePredefinida(companyId, validatedData.tipo);
    const serie = validatedData.serie || seriePredefinida.serie;

    const numero = await proximoNumero(companyId, validatedData.tipo, serie);

    const dataEmissao = new Date();
    const dataVencimento = validatedData.dataVencimento
      ? new Date(validatedData.dataVencimento)
      : new Date(dataEmissao.getTime() + 30 * 24 * 60 * 60 * 1000);

    const initialStatus =
      validatedData.status ||
      (validatedData.tipo === "FaturaRecibo" || validatedData.tipo === "Simplificada" || validatedData.tipo === "AvisoCobrancaRecibo" || validatedData.tipo === "FaturaAdiantamento" || validatedData.tipo === "Recibo" ? "Pago" : "Pendente");

    const numeroCompleto = `${serie}/${String(numero).padStart(6, "0")}`;

    const cliente = validatedData.clienteId
      ? await db.from("clientes").select("nif").eq("id", validatedData.clienteId).maybeSingle()
      : null;
    const fornecedor = validatedData.fornecedorId
      ? await db.from("fornecedores").select("nif").eq("id", validatedData.fornecedorId).maybeSingle()
      : null;

    const hash = await gerarHashFiscal({
      tipo: validatedData.tipo,
      serie,
      numero: String(numero),
      numeroCompleto,
      dataEmissao,
      clienteNif: cliente?.data?.nif || undefined,
      fornecedorNif: fornecedor?.data?.nif || undefined,
      subtotal,
      totalIVA,
      total,
      formaPagamento: validatedData.formaPagamento,
      linhas,
    });

    const novoDocumento = await criarDocumento(companyId, {
      tipo: validatedData.tipo,
      serie,
      numero: String(numero),
      clienteId: validatedData.clienteId,
      fornecedorId: validatedData.fornecedorId,
      dataEmissao,
      dataOperacao: validatedData.dataOperacao ? new Date(validatedData.dataOperacao) : dataEmissao,
      dataVencimento,
      formaPagamento: validatedData.formaPagamento,
      status: initialStatus,
      observacoes: validatedData.observacoes,
      subtotal,
      totalIVA,
      total,
      hash,
      motivoIsencaoIVA: validatedData.motivoIsencaoIVA,
      dataPagamento: initialStatus === "Pago" ? dataEmissao : undefined,
      documentoReferenciado: validatedData.documentoReferenciado,
      motivo: validatedData.motivo,
      linhas,
    });

    return NextResponse.json(
      { success: true, data: novoDocumento, message: "Documento emitido com sucesso" },
      { status: 201 }
    );
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json(
        { success: false, error: "Dados inválidos", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao emitir documento" },
      { status: 500 }
    );
  }
}