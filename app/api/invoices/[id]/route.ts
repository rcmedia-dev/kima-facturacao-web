import { normalizarErro } from "@/lib/utils";
import { NextResponse } from "next/server";
import { obterDocumentoPorId, atualizarDocumento, deletarDocumento } from "@/db/queries";
import { requireCompanyId } from "@/lib/company";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const companyId = requireCompanyId(request);
    const { id } = await params;
    const documento = await obterDocumentoPorId(companyId, id);

    if (!documento) {
      return NextResponse.json(
        { success: false, error: "Documento não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: documento });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: normalizarErro(error).mensagem || "Erro ao obter detalhes do documento" },
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

    const documentoAtualizado = await atualizarDocumento(companyId, id, {
      status: body.status,
      formaPagamento: body.formaPagamento,
      observacoes: body.observacoes,
      dataPagamento: body.dataPagamento ? new Date(body.dataPagamento) : undefined,
      motivo: body.motivo,
      dataVencimento: body.dataVencimento ? new Date(body.dataVencimento) : undefined,
    });

    return NextResponse.json({ success: true, data: documentoAtualizado });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: normalizarErro(error).mensagem || "Erro ao atualizar documento" },
      { status: normalizarErro(error).status || 500 }
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
    await deletarDocumento(companyId, id);

    return NextResponse.json({
      success: true,
      message: "Documento removido com sucesso",
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: normalizarErro(error).mensagem || "Erro ao deletar documento" },
      { status: 500 }
    );
  }
}