import { NextResponse } from "next/server";
import { fornecedorSchema } from "@/lib/schemas";
import { obterFornecedores, criarFornecedor } from "@/db/queries";
import { requireCompanyId } from "@/lib/company";

export async function GET(request: Request) {
  try {
    const companyId = requireCompanyId(request);
    const fornecedores = await obterFornecedores(companyId);
    return NextResponse.json({ success: true, data: fornecedores });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao obter fornecedores" },
      { status: error.status || 500 }
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
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json(
        { success: false, error: "Dados inválidos", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao criar fornecedor" },
      { status: 500 }
    );
  }
}