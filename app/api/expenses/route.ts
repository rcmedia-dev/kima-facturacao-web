import { NextResponse } from "next/server";
import { despesaSchema } from "@/lib/schemas";
import { obterDespesas, criarDespesa } from "@/db/queries";
import { requireCompanyId } from "@/lib/company";

export async function GET(request: Request) {
  try {
    const companyId = requireCompanyId(request);
    const despesas = await obterDespesas(companyId);
    return NextResponse.json({ success: true, data: despesas });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao obter despesas" },
      { status: error.status || 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const companyId = requireCompanyId(request);
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
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json(
        { success: false, error: "Dados inválidos", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao criar despesa" },
      { status: 500 }
    );
  }
}