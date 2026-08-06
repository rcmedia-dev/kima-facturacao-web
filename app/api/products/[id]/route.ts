import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { eq } from "drizzle-orm";
import { artigos } from "@/db/schema";
import { artigoSchemaInput } from "@/lib/schemas";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const artigo = await db.query.artigos.findFirst({
      where: eq(artigos.id, id),
      with: {
        fornecedor: true,
      },
    });

    if (!artigo) {
      return NextResponse.json(
        { success: false, error: "Artigo não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: artigo });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao buscar artigo" },
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
    const validatedData = artigoSchemaInput.partial().parse(body);

    const updatePayload: any = {
      ...validatedData,
      atualizadoEm: new Date(),
    };

    if (validatedData.preco !== undefined) {
      updatePayload.preco = String(validatedData.preco);
    }
    if (validatedData.taxaIVA !== undefined) {
      updatePayload.taxaIVA = parseInt(validatedData.taxaIVA);
    }

    const [artigoAtualizado] = await db
      .update(artigos)
      .set(updatePayload)
      .where(eq(artigos.id, id))
      .returning();

    return NextResponse.json({ success: true, data: artigoAtualizado });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json(
        { success: false, error: "Dados inválidos", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao atualizar artigo" },
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
    const [artigoDeletado] = await db
      .delete(artigos)
      .where(eq(artigos.id, id))
      .returning();

    return NextResponse.json({
      success: true,
      message: "Artigo removido com sucesso",
      data: artigoDeletado,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao deletar artigo" },
      { status: 500 }
    );
  }
}
