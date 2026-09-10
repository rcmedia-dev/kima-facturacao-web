import { normalizarErro } from "@/lib/utils";
import { NextResponse } from "next/server";
import { fornecedorSchema } from "@/lib/schemas";
import { obterFornecedores, criarFornecedor } from "@/db/queries";
import { requireCompanyId } from "@/lib/company";

export async function GET(request: Request) {
  try {
    const companyId = requireCompanyId(request);
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 200);
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const result = await obterFornecedores(companyId, { limit, offset });
    return NextResponse.json({ success: true, data: result.data, total: result.total });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: normalizarErro(error).mensagem || "Erro ao obter fornecedores" },
      { status: normalizarErro(error).status || 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const companyId = requireCompanyId(request);
    const body = await request.json();
    const validatedData = fornecedorSchema.parse(body);

    const novoFornecedor = await criarFornecedor(companyId, {
      nome: validatedData.nome,
      nif: validatedData.nif,
      morada: validatedData.morada,
      telefone: validatedData.telefone,
      email: validatedData.email,
      bancaria: validatedData.bancaria,
      ativo: validatedData.ativo,
    });

    return NextResponse.json({ success: true, data: novoFornecedor }, { status: 201 });
  } catch (error: unknown) {
    if (normalizarErro(error).nome === "ZodError") {
      return NextResponse.json(
        { success: false, error: "Dados inválidos", details: normalizarErro(error).detalhes },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: normalizarErro(error).mensagem || "Erro ao criar fornecedor" },
      { status: 500 }
    );
  }
}