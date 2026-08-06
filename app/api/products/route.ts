import { NextResponse } from "next/server";
import { artigoSchema } from "@/lib/schemas";
import { obterArtigos, criarArtigo } from "@/db/queries";

const EMPRESA_ID_DEFAULT = "e1000000-0000-0000-0000-000000000001";

export async function GET() {
  try {
    const artigos = await obterArtigos(EMPRESA_ID_DEFAULT);
    return NextResponse.json({ success: true, data: artigos });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao obter artigos" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validatedData = artigoSchema.parse(body);

    const novoArtigo = await criarArtigo(EMPRESA_ID_DEFAULT, {
      codigo: validatedData.codigo,
      descricao: validatedData.descricao,
      preco: validatedData.preco,
      taxaIVA: validatedData.taxaIVA,
      categoria: validatedData.categoria,
      unidadeMedida: validatedData.unidadeMedida,
      stock: validatedData.stock,
      stockMinimo: validatedData.stockMinimo,
      ativo: validatedData.ativo,
    });

    return NextResponse.json({ success: true, data: novoArtigo }, { status: 201 });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json(
        { success: false, error: "Dados inválidos", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao criar artigo" },
      { status: 500 }
    );
  }
}
