import { normalizarErro } from "@/lib/utils";
import { NextResponse } from "next/server";
import { obterDespesaPorId } from "@/db/queries";
import { atualizarDespesa, deletarDespesa } from "@/db/queries";
import { despesaSchemaInput } from "@/lib/schemas";
import { requireCompanyId } from "@/lib/company";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const companyId = requireCompanyId(request);
    const { id } = await params;
    const despesa = await obterDespesaPorId(companyId, id);

    if (!despesa) {
      return NextResponse.json(
        { success: false, error: "Despesa não encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: despesa });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: normalizarErro(error).mensagem || "Erro ao buscar despesa" },
      { status: normalizarErro(error).status || 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const companyId = requireCompanyId(request);
    const { id } = await params;
    const body = await request.json();
    const validatedData = despesaSchemaInput.partial().parse(body);

    const despesaAtualizada = await atualizarDespesa(companyId, id, {
      descricao: validatedData.descricao,
      fornecedorId: validatedData.fornecedorId,
      categoria: validatedData.categoria,
      valor: validatedData.valor,
      taxaIVA:
        validatedData.taxaIVA !== undefined
          ? (parseInt(validatedData.taxaIVA, 10) as 0 | 7 | 14)
          : undefined,
      data: validatedData.data ? new Date(validatedData.data) : undefined,
      formaPagamento: validatedData.formaPagamento,
      estado: validatedData.estado,
      observacoes: validatedData.observacoes,
    });

    return NextResponse.json({ success: true, data: despesaAtualizada });
  } catch (error: unknown) {
    if (normalizarErro(error).nome === "ZodError") {
      return NextResponse.json(
        { success: false, error: "Dados inválidos", details: normalizarErro(error).detalhes },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: normalizarErro(error).mensagem || "Erro ao atualizar despesa" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const companyId = requireCompanyId(request);
    const { id } = await params;
    await deletarDespesa(companyId, id);

    return NextResponse.json({
      success: true,
      message: "Despesa removida com sucesso",
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: normalizarErro(error).mensagem || "Erro ao deletar despesa" },
      { status: 500 }
    );
  }
}