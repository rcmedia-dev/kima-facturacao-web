import { NextResponse } from "next/server";
import { atualizarCliente, deletarCliente } from "@/db/queries";
import { db } from "@/db/client";
import { eq } from "drizzle-orm";
import { clientes } from "@/db/schema";
import { clienteSchema } from "@/lib/schemas";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cliente = await db.query.clientes.findFirst({
      where: eq(clientes.id, id),
    });

    if (!cliente) {
      return NextResponse.json(
        { success: false, error: "Cliente não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: cliente });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao buscar cliente" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validatedData = clienteSchema.partial().parse(body);

    const clienteAtualizado = await atualizarCliente(id, validatedData);

    return NextResponse.json({ success: true, data: clienteAtualizado });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json(
        { success: false, error: "Dados inválidos", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao atualizar cliente" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const clienteDeletado = await deletarCliente(id);

    return NextResponse.json({
      success: true,
      message: "Cliente removido com sucesso",
      data: clienteDeletado,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao deletar cliente" },
      { status: 500 }
    );
  }
}
