import { normalizarErro } from "@/lib/utils";
import { NextResponse } from "next/server";
import { despesaSchema } from "@/lib/schemas";
import { obterDespesas, criarDespesa } from "@/db/queries";
import { requireCompanyId } from "@/lib/company";

export async function GET(request: Request) {
  try {
    const companyId = await requireCompanyId(request, 'expenses.view');
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 200);
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const result = await obterDespesas(companyId, { limit, offset });
    return NextResponse.json({ success: true, data: result.data, total: result.total });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: normalizarErro(error).mensagem || "Erro ao obter despesas" },
      { status: normalizarErro(error).status || 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const companyId = await requireCompanyId(request, 'expenses.manage');
    const body = await request.json();
    const validatedData = despesaSchema.parse(body);

    const novaDespesa = await criarDespesa(companyId, {
      descricao: validatedData.descricao,
      fornecedorId: validatedData.fornecedorId,
      categoria: validatedData.categoria,
      valor: validatedData.valor,
      taxaIVA: validatedData.taxaIVA,
      data: validatedData.data,
      formaPagamento: validatedData.formaPagamento,
      estado: validatedData.estado,
      observacoes: validatedData.observacoes,
    });

    return NextResponse.json({ success: true, data: novaDespesa }, { status: 201 });
  } catch (error: unknown) {
    if (normalizarErro(error).nome === "ZodError") {
      return NextResponse.json(
        { success: false, error: "Dados inválidos", details: normalizarErro(error).detalhes },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: normalizarErro(error).mensagem || "Erro ao criar despesa" },
      { status: normalizarErro(error).status || 500 }
    );
  }
}