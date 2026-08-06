import { NextResponse } from "next/server";
import { empresaSchema } from "@/lib/schemas";
import { obterEmpresa, atualizarEmpresa } from "@/db/queries";

const EMPRESA_ID_DEFAULT = "e1000000-0000-0000-0000-000000000001";

export async function GET() {
  try {
    const empresa = await obterEmpresa(EMPRESA_ID_DEFAULT);
    return NextResponse.json({
      success: true,
      data: empresa || {
        id: EMPRESA_ID_DEFAULT,
        nome: "Kima Tecnologias & Serviços Lda",
        nif: "5417082910",
        morada: "Av. 4 de Fevereiro, Edifício Luanda Tower, 7º Andar, Luanda",
        telefone: "+244 923 000 111",
        email: "contacto@kima.co.ao",
        logoUrl: null,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao obter dados da empresa" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const validatedData = empresaSchema.parse(body);

    const empresaAtualizada = await atualizarEmpresa(EMPRESA_ID_DEFAULT, {
      nome: validatedData.nomeEmpresa,
      nif: validatedData.nif,
      morada: validatedData.morada,
      telefone: validatedData.telefone,
      email: validatedData.email,
      logoUrl: validatedData.logoUrl,
    });

    return NextResponse.json({
      success: true,
      data: empresaAtualizada || {
        id: EMPRESA_ID_DEFAULT,
        ...validatedData,
      },
    });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json(
        { success: false, error: "Dados inválidos", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao atualizar empresa" },
      { status: 500 }
    );
  }
}
