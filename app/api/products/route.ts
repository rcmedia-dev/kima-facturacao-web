import { normalizarErro } from "@/lib/utils";
import { NextResponse } from "next/server";
import { artigoSchema } from "@/lib/schemas";
import { obterArtigos, criarArtigo } from "@/db/queries";
import { requireCompanyMembership } from "@/lib/company";

export async function GET(request: Request) {
  try {
    const companyId = await requireCompanyMembership(request);
    const artigos = await obterArtigos(companyId);
    return NextResponse.json({ success: true, data: artigos });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: normalizarErro(error).mensagem || "Erro ao obter artigos" },
      { status: normalizarErro(error).status || 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const companyId = await requireCompanyMembership(request);
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
  } catch (error: unknown) {
    if (normalizarErro(error).nome === "ZodError") {
      const detalhes = normalizarErro(error).detalhes;
      const msg = (Array.isArray(detalhes) ? detalhes : [])
        .map((e) => {
          const item = e as { path?: string[]; message?: string };
          return `${(item.path || []).join(".") || "dados"}: ${item.message || ""}`;
        })
        .join("; ");
      return NextResponse.json(
        { success: false, error: `Dados inválidos (${msg})`, details: normalizarErro(error).detalhes },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: normalizarErro(error).mensagem || "Erro ao criar artigo" },
      { status: 500 }
    );
  }
}