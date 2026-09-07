import { normalizarErro } from "@/lib/utils";
import { NextResponse } from "next/server";
import { empresaSchema } from "@/lib/schemas";
import { obterEmpresa, atualizarEmpresa } from "@/db/queries";
import { requireCompanyMembership } from "@/lib/company";

export async function GET(request: Request) {
  try {
    const companyId = await requireCompanyMembership(request);
    const empresa = await obterEmpresa(companyId);
    return NextResponse.json({
      success: true,
      data: empresa || null,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: normalizarErro(error).mensagem || "Erro ao obter dados da empresa" },
      { status: normalizarErro(error).status || 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const companyId = await requireCompanyMembership(request);
    const body = await request.json();
    const validatedData = empresaSchema.parse(body);

    const empresaAtualizada = await atualizarEmpresa(companyId, {
      nomeEmpresa: validatedData.nomeEmpresa,
      nif: validatedData.nif,
      morada: validatedData.morada,
      telefone: validatedData.telefone,
      email: validatedData.email,
      logoUrl: validatedData.logoUrl || undefined,
      softwareNome: validatedData.softwareNome || undefined,
      softwareCertificacaoNumero: validatedData.softwareCertificacaoNumero || undefined,
    });

    return NextResponse.json({ success: true, data: empresaAtualizada });
  } catch (error: unknown) {
    if (normalizarErro(error).nome === "ZodError") {
      return NextResponse.json(
        { success: false, error: "Dados inválidos", details: normalizarErro(error).detalhes },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: normalizarErro(error).mensagem || "Erro ao atualizar empresa" },
      { status: 500 }
    );
  }
}