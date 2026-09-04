import { normalizarErro } from "@/lib/utils";
import { NextResponse } from "next/server";
import { atualizarCliente, deletarCliente } from "@/db/queries";
import { obterClientePorId } from "@/db/queries";
import { clienteSchema } from "@/lib/schemas";
import { requireCompanyMembership } from "@/lib/company";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const companyId = await requireCompanyMembership(request);
    const { id } = await params;
    const cliente = await obterClientePorId(companyId, id);

    if (!cliente) {
      return NextResponse.json(
        { success: false, error: "Cliente não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: cliente });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: normalizarErro(error).mensagem || "Erro ao buscar cliente" },
      { status: normalizarErro(error).status || 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const companyId = await requireCompanyMembership(request);
    const { id } = await params;
    const body = await request.json();
    const validatedData = clienteSchema.partial().parse(body);

    const clienteAtualizado = await atualizarCliente(companyId, id, validatedData);

    return NextResponse.json({ success: true, data: clienteAtualizado });
  } catch (error: unknown) {
    if (normalizarErro(error).nome === "ZodError") {
      return NextResponse.json(
        { success: false, error: "Dados inválidos", details: normalizarErro(error).detalhes },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: normalizarErro(error).mensagem || "Erro ao atualizar cliente" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const companyId = await requireCompanyMembership(request);
    const { id } = await params;
    await deletarCliente(companyId, id);

    return NextResponse.json({
      success: true,
      message: "Cliente removido com sucesso",
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: normalizarErro(error).mensagem || "Erro ao deletar cliente" },
      { status: 500 }
    );
  }
}