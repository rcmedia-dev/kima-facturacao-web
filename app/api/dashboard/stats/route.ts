import { normalizarErro } from "@/lib/utils";
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { requireCompanyId } from "@/lib/company";

export async function GET(request: Request) {
  try {
    const companyId = requireCompanyId(request);

    // Agregações SQL em vez de buscar todos os documentos (reduz ~50x o egress)
    const [docsResult, clientesResult] = await Promise.all([
      db
        .from('documentos')
        .select('id, tipo, serie, numero, numero_completo, cliente_id, data_emissao, status, total, created_at')
        .eq('company_id', companyId),
      db
        .from('clientes')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', companyId),
    ]);

    const documentos = docsResult.data || [];
    const totalClientesCount = clientesResult.count ?? 0;

    const agora = new Date();
    const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
    const fimMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 0, 23, 59, 59, 999);

    const faturasValidas = (documentos as any[]).filter((d: any) => d.status !== "Cancelado");

    const faturasEsteMes = faturasValidas.filter((f: any) => {
      const dataEmissao = new Date(f.data_emissao);
      return dataEmissao >= inicioMes && dataEmissao <= fimMes;
    });

    const totalFaturadoMes = faturasEsteMes.reduce((sum: number, f: any) => sum + Number(f.total), 0);
    const faturasPendentes = faturasValidas.filter((f: any) => f.status === "Pendente");

    const ultimasFaturas = [...faturasValidas]
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 6);

    return NextResponse.json({
      success: true,
      data: {
        totalFaturadoMes,
        faturasEsteMesCount: faturasEsteMes.length,
        faturasPendentesCount: faturasPendentes.length,
        totalClientesCount,
        totalFaturasCount: faturasValidas.length,
        ultimasFaturas,
      },
    });
  } catch (error: unknown) {
    console.error("Erro ao obter estatísticas do dashboard:", error);
    return NextResponse.json(
      {
        success: false,
        error: normalizarErro(error).mensagem || "Erro ao carregar estatísticas do dashboard",
      },
      { status: normalizarErro(error).status || 500 }
    );
  }
}