import { NextResponse } from "next/server";
import { obterDocumentos, obterClientes } from "@/db/queries";
import { requireCompanyId } from "@/lib/company";

export async function GET(request: Request) {
  try {
    const companyId = requireCompanyId(request);
    const documentos = await obterDocumentos(companyId);
    const clientes = await obterClientes(companyId);

    const agora = new Date();
    const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
    const fimMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 0, 23, 59, 59, 999);

    const faturasValidas = documentos.filter((d) => d.status !== "Cancelado");

    const faturasEsteMes = faturasValidas.filter((f) => {
      const dataEmissao = new Date(f.dataEmissao);
      return dataEmissao >= inicioMes && dataEmissao <= fimMes;
    });

    const totalFaturadoMes = faturasEsteMes.reduce((sum, f) => sum + Number(f.total), 0);
    const faturasPendentes = faturasValidas.filter((f) => f.status === "Pendente");

    const ultimasFaturas = [...faturasValidas]
      .sort((a, b) => new Date(b.dataEmissao).getTime() - new Date(a.dataEmissao).getTime())
      .slice(0, 6);

    return NextResponse.json({
      success: true,
      data: {
        totalFaturadoMes,
        faturasEsteMesCount: faturasEsteMes.length,
        faturasPendentesCount: faturasPendentes.length,
        totalClientesCount: clientes.length,
        totalFaturasCount: faturasValidas.length,
        ultimasFaturas,
      },
    });
  } catch (error: any) {
    console.error("Erro ao obter estatísticas do dashboard:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Erro ao carregar estatísticas do dashboard",
      },
      { status: error.status || 500 }
    );
  }
}