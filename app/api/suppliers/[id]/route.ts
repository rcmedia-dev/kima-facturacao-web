import { normalizarErro } from "@/lib/utils";
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
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: normalizarErro(error).mensagem || "Erro ao buscar fornecedor" },
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
  } catch (error: unknown) {
    if (normalizarErro(error).nome === "ZodError") {
      return NextResponse.json(
        { success: false, error: "Dados inválidos", details: normalizarErro(error).detalhes },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: normalizarErro(error).mensagem || "Erro ao atualizar fornecedor" },
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
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: normalizarErro(error).mensagem || "Erro ao deletar fornecedor" },
      { status: 500 }
    );
  }
}