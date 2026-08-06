import { NextResponse } from "next/server";
import { obterDocumentoPorId } from "@/db/queries";

const EMPRESA_ID_DEFAULT = "e1000000-0000-0000-0000-000000000001";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const fatura = await obterDocumentoPorId(EMPRESA_ID_DEFAULT, id);

    if (!fatura) {
      return NextResponse.json(
        { success: false, error: "Fatura não encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: fatura });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao obter detalhes da fatura" },
      { status: 500 }
    );
  }
}
