import { NextResponse } from "next/server";
import { artigoSchema } from "@/lib/schemas";
import { obterArtigos, criarArtigo } from "@/db/queries";
import { requireCompanyId } from "@/lib/company";

export async function GET(request: Request) {
  try {
    const companyId = requireCompanyId(request);
    const artigos = await obterArtigos(companyId);
    return NextResponse.json({ success: true, data: artigos });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao obter artigos" },
      { status: error.status || 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const companyId = requireCompanyId(request);
    const body = await request.json();
    const validatedData = artigoSchema.parse(body);

    const novoArtigo = await criarArtigo(companyId, {
      codigo: validatedData.codigo || "",
      descricao: validatedData.descricao,
      tipo: validatedData.tipo,
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
      const msg = (error.errors || [])
        .map((e: any) => `${e.path.join(".") || "dados"}: ${e.message}`)
        .join("; ");
      return NextResponse.json(
        { success: false, error: `Dados inválidos (${msg})`, details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao criar artigo" },
      { status: 500 }
    );
  }
}