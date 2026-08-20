import { normalizarErro } from "@/lib/utils";
import { NextResponse } from "next/server";
import { obterArtigoPorId } from "@/db/queries";
import { atualizarArtigo, deletarArtigo } from "@/db/queries";
import { artigoSchemaInput } from "@/lib/schemas";
import { requireCompanyId } from "@/lib/company";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const companyId = requireCompanyId(request);
    const { id } = await params;
    const artigo = await obterArtigoPorId(companyId, id);

    if (!artigo) {
      return NextResponse.json(
        { success: false, error: "Artigo não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: artigo });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: normalizarErro(error).mensagem || "Erro ao buscar artigo" },
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
    const validatedData = artigoSchemaInput.partial().parse(body);

    const artigoAtualizado = await atualizarArtigo(companyId, id, {
      codigo: validatedData.codigo,
      descricao: validatedData.descricao,
      tipo: validatedData.tipo,
      preco: validatedData.preco,
      taxaIVA: validatedData.taxaIVA !== undefined
        ? (Number(validatedData.taxaIVA) as 0 | 7 | 14)
        : undefined,
      categoria: validatedData.categoria,
      unidadeMedida: validatedData.unidadeMedida,
      stock: validatedData.stock,
      stockMinimo: validatedData.stockMinimo,
      ativo: validatedData.ativo,
    });

    return NextResponse.json({ success: true, data: artigoAtualizado });
  } catch (error: unknown) {
    if (normalizarErro(error).nome === "ZodError") {
      return NextResponse.json(
        { success: false, error: "Dados inválidos", details: normalizarErro(error).detalhes },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: normalizarErro(error).mensagem || "Erro ao atualizar artigo" },
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
    await deletarArtigo(companyId, id);

    return NextResponse.json({
      success: true,
      message: "Artigo removido com sucesso",
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: normalizarErro(error).mensagem || "Erro ao deletar artigo" },
      { status: 500 }
    );
  }
}