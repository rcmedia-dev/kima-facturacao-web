import { NextResponse } from "next/server";
import { obterFornecedorPorId } from "@/db/queries";
import { atualizarFornecedor, deletarFornecedor } from "@/db/queries";
import { fornecedorSchema } from "@/lib/schemas";
import { requireCompanyId } from "@/lib/company";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const companyId = requireCompanyId(request);
    const { id } = await params;
    const fornecedor = await obterFornecedorPorId(companyId, id);

    if (!fornecedor) {
      return NextResponse.json(
        { success: false, error: "Fornecedor não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: fornecedor });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao buscar fornecedor" },
      { status: error.status || 500 }
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
    const validatedData = fornecedorSchema.partial().parse(body);

    const fornecedorAtualizado = await atualizarFornecedor(companyId, id, {
      nome: validatedData.nome,
      nif: validatedData.nif,
      morada: validatedData.morada,
      telefone: validatedData.telefone,
      email: validatedData.email,
      bancaria: validatedData.bancaria,
      ativo: validatedData.ativo,
    });

    return NextResponse.json({ success: true, data: fornecedorAtualizado });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json(
        { success: false, error: "Dados inválidos", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao atualizar fornecedor" },
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
    await deletarFornecedor(companyId, id);

    return NextResponse.json({
      success: true,
      message: "Fornecedor removido com sucesso",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao deletar fornecedor" },
      { status: 500 }
    );
  }
}