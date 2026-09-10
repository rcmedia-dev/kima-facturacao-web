import { normalizarErro } from "@/lib/utils";
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { requireCompanyId } from "@/lib/company";

export async function GET(request: Request) {
  try {
    const companyId = requireCompanyId(request);

    const agora = new Date();
    const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
    const fimMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 0, 23, 59, 59, 999);

    const [faturadoMesResult, pendentesResult, totalResult, clientesResult, ultimasResult] = await Promise.all([
      db
        .from('documentos')
        .select('total')
        .eq('company_id', companyId)
        .neq('status', 'Cancelado')
        .gte('data_emissao', inicioMes.toISOString())
        .lte('data_emissao', fimMes.toISOString())
        .limit(500),
      db
        .from('documentos')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('status', 'Pendente'),
      db
        .from('documentos')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .neq('status', 'Cancelado'),
      db
        .from('clientes')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', companyId),
      db
        .from('documentos')
        .select('id, tipo, serie, numero, numero_completo, cliente_id, data_emissao, status, total, created_at')
        .eq('company_id', companyId)
        .neq('status', 'Cancelado')
        .order('created_at', { ascending: false })
        .limit(6),
    ]);

    const totalFaturadoMes = (faturadoMesResult.data || []).reduce((sum: number, f: any) => sum + Number(f.total), 0);

    return NextResponse.json({
      success: true,
      data: {
        totalFaturadoMes,
        faturasEsteMesCount: (faturadoMesResult.data || []).length,
        faturasPendentesCount: pendentesResult.count ?? 0,
        totalClientesCount: clientesResult.count ?? 0,
        totalFaturasCount: totalResult.count ?? 0,
        ultimasFaturas: ultimasResult.data || [],
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