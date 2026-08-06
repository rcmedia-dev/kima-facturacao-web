import { NextResponse } from "next/server";
import { clienteSchema } from "@/lib/schemas";
import { obterClientes, criarCliente } from "@/db/queries";

// ID fixo da empresa default do MVP
const EMPRESA_ID_DEFAULT = "e1000000-0000-0000-0000-000000000001";

export async function GET() {
  try {
    const clientes = await obterClientes(EMPRESA_ID_DEFAULT);
    return NextResponse.json({ success: true, data: clientes });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao obter clientes" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validatedData = clienteSchema.parse(body);

    const novoCliente = await criarCliente(EMPRESA_ID_DEFAULT, {
      nome: validatedData.nome,
      nif: validatedData.nif,
      morada: validatedData.morada,
      telefone: validatedData.telefone,
      email: validatedData.email,
      tipo: validatedData.tipo,
      ativo: validatedData.ativo,
      responsavel: validatedData.responsavel,
      inscricaoSocial: validatedData.inscricaoSocial,
    });

    return NextResponse.json({ success: true, data: novoCliente }, { status: 201 });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json(
        { success: false, error: "Dados inválidos", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao criar cliente" },
      { status: 500 }
    );
  }
}
