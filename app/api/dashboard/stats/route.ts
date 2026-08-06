import { NextResponse } from "next/server";
import { obterDocumentos, obterClientes } from "@/db/queries";

const EMPRESA_ID_DEFAULT = "e1000000-0000-0000-0000-000000000001";

export async function GET() {
  try {
    const documentos = await obterDocumentos(EMPRESA_ID_DEFAULT, "Fatura");
    const clientes = await obterClientes(EMPRESA_ID_DEFAULT);

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
        error: "Erro ao carregar estatísticas do dashboard",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
