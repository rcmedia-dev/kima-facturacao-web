import { NextResponse } from 'next/server';
import { requireCompanyId } from '@/lib/company';
import { obterFilaEnvioAGT, obterPendentesEnvioAGT } from '@/lib/queries-agt-fase2';
import { processarProximosEnviosAGT } from '@/lib/agt-fila';
import { agtEmSimulacao } from '@/lib/agt-client';

/** GET /api/agt/fila — lista a fila de envio e o estado de simulação. */
export async function GET(request: Request) {
  try {
    const companyId = requireCompanyId(request);
    const fila = await obterFilaEnvioAGT(companyId);

    return NextResponse.json({
      success: true,
      simulacao: agtEmSimulacao(),
      data: fila,
      resumo: {
        total: fila.length,
        pendentes: fila.filter((f) => f.estado === 'Pendente').length,
        transmitidos: fila.filter((f) => f.estado === 'Transmitido').length,
        erros: fila.filter((f) => f.estado === 'Erro' || f.estado === 'Rejeitado').length,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Erro ao obter fila AGT' },
      { status: error.status || 500 }
    );
  }
}

/** POST /api/agt/fila — processa os documentos pendentes de envio (T2.2). */
export async function POST(request: Request) {
  try {
    const companyId = requireCompanyId(request);
    const body = await request.json().catch(() => ({}));
    const limite = Math.min(Number(body?.limite) || 10, 50);

    const resultado = await processarProximosEnviosAGT(companyId, limite);

    return NextResponse.json({ success: true, ...resultado });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Erro ao processar fila AGT' },
      { status: error.status || 500 }
    );
  }
}