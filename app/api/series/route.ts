import { NextResponse } from "next/server";
import { obterSeries, criarSerie, atualizarSerie, deletarSerie } from "@/db/queries";
import { requireCompanyId } from "@/lib/company";
import { z } from "zod";

const serieSchema = z.object({
  serie: z.string().min(1, "Letra da série é obrigatória").regex(/^[A-Za-z0-9]+$/, "Use apenas letras e números (ex: A, B, C)").transform((s) => s.toUpperCase()),
  tipoDocumento: z.enum(["Fatura", "FaturaRecibo", "Simplificada", "NotaCredito", "NotaDebito", "Orcamento", "GuiaRemessa", "AvisoCobrancaRecibo", "FaturaGenerica", "FaturaGlobal", "FaturaAdiantamento", "Recibo"]),
  proximoNumero: z.number().int().min(1).optional(),
  predefinida: z.boolean().optional(),
});

export async function GET(request: Request) {
  try {
    const companyId = requireCompanyId(request);
    const series = await obterSeries(companyId);
    return NextResponse.json({ success: true, data: series });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao obter séries" },
      { status: error.status || 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const companyId = requireCompanyId(request);
    const body = await request.json();
    const dados = serieSchema.parse(body);
    const criada = await criarSerie(companyId, dados);
    return NextResponse.json({ success: true, data: criada }, { status: 201 });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json(
        { success: false, error: "Dados inválidos", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao criar série" },
      { status: error.status || 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const companyId = requireCompanyId(request);
    const body = await request.json();
    const { id, ...dados } = body;
    if (!id) throw Object.assign(new Error("ID da série é obrigatório"), { status: 400 });
    const atualizada = await atualizarSerie(companyId, id, serieSchema.parse(dados));
    return NextResponse.json({ success: true, data: atualizada });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json(
        { success: false, error: "Dados inválidos", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao atualizar série" },
      { status: error.status || 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const companyId = requireCompanyId(request);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) throw Object.assign(new Error("ID da série é obrigatório"), { status: 400 });
    await deletarSerie(companyId, id);
    return NextResponse.json({ success: true, data: { id } });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao eliminar série" },
      { status: error.status || 500 }
    );
  }
}
