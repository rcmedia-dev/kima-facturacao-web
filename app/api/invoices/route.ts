import { NextResponse } from "next/server";
import { obterDocumentos, criarDocumento } from "@/db/queries";
import { faturaLinhaSchema } from "@/lib/schemas";
import { z } from "zod";

const EMPRESA_ID_DEFAULT = "e1000000-0000-0000-0000-000000000001";

// Schema de validação para emissão de fatura
const criarFaturaSchema = z.object({
  clienteId: z.string().min(1, "Cliente é obrigatório"),
  linhas: z.array(faturaLinhaSchema).min(1, "A fatura deve ter pelo menos 1 linha"),
  formaPagamento: z.enum(["Numerário", "Transferência", "Multicaixa", "POS", "Cheque", "Crédito"]).default("Transferência"),
  observacoes: z.string().optional().default(""),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const dataInicioStr = searchParams.get("dataInicio");
    const dataFimStr = searchParams.get("dataFim");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    let faturas = await obterDocumentos(EMPRESA_ID_DEFAULT, "Fatura");

    // Filtrar por status
    if (status && status !== "Todos") {
      faturas = faturas.filter(
        (f) => f.status.toLowerCase() === status.toLowerCase()
      );
    }

    // Filtrar por intervalo de datas
    if (dataInicioStr) {
      const dataInicio = new Date(dataInicioStr);
      faturas = faturas.filter(
        (f) => new Date(f.dataEmissao) >= dataInicio
      );
    }
    if (dataFimStr) {
      const dataFim = new Date(dataFimStr);
      dataFim.setHours(23, 59, 59, 999);
      faturas = faturas.filter(
        (f) => new Date(f.dataEmissao) <= dataFim
      );
    }

    // Ordenar do mais recente para o mais antigo
    faturas.sort(
      (a, b) => new Date(b.dataEmissao).getTime() - new Date(a.dataEmissao).getTime()
    );

    // Paginação
    const totalItems = faturas.length;
    const totalPages = Math.ceil(totalItems / limit) || 1;
    const startIndex = (page - 1) * limit;
    const paginatedFaturas = faturas.slice(startIndex, startIndex + limit);

    return NextResponse.json({
      success: true,
      data: paginatedFaturas,
      pagination: {
        totalItems,
        totalPages,
        currentPage: page,
        itemsPerPage: limit,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao obter faturas" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validatedData = criarFaturaSchema.parse(body);

    // Calcular subtotal, IVA por linha e total geral
    let subtotal = 0;
    let totalIVA = 0;

    const linhasFormatadas = validatedData.linhas.map((linha) => {
      const valorBase = linha.quantidade * linha.preco;
      const valorIVA = (valorBase * linha.taxaIVA) / 100;
      const totalLinha = valorBase + valorIVA;

      subtotal += valorBase;
      totalIVA += valorIVA;

      return {
        id: `linha-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        artigoId: linha.artigoId,
        descricao: linha.descricao,
        quantidade: linha.quantidade,
        preco: linha.preco,
        taxaIVA: linha.taxaIVA,
        unidadeMedida: "UN" as const,
        total: totalLinha,
      };
    });

    const total = subtotal + totalIVA;

    // Buscar faturas existentes para numeração sequencial automática
    const faturasExistentes = await obterDocumentos(EMPRESA_ID_DEFAULT, "Fatura");
    const proximoNumero = faturasExistentes.length + 1;

    // Data de vencimento padrão: 30 dias após hoje
    const dataEmissao = new Date();
    const dataVencimento = new Date();
    dataVencimento.setDate(dataEmissao.getDate() + 30);

    const novaFatura = await criarDocumento(EMPRESA_ID_DEFAULT, {
      tipo: "Fatura",
      serie: "A",
      numero: String(proximoNumero),
      clienteId: validatedData.clienteId,
      dataEmissao,
      dataVencimento,
      formaPagamento: validatedData.formaPagamento,
      status: "Pendente",
      observacoes: validatedData.observacoes,
      subtotal,
      totalIVA,
      total,
      linhas: linhasFormatadas,
    });

    return NextResponse.json(
      {
        success: true,
        data: novaFatura,
        message: "Fatura emitida com sucesso",
      },
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
      { success: false, error: error.message || "Erro ao emitir fatura" },
      { status: 500 }
    );
  }
}
