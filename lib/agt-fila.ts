'use server';

/**
 * T2.2 · Motor de fila assíncrona (Queue & Retry) para comunicação AGT.
 *
 * Fluxo (independente da API real):
 *   1. Lê documentos pendentes/erro com `proxima_tentativa <= agora`;
 *   2. Monta o payload fiscal (hash, assinatura JWS, QR, totais);
 *   3. Envia através do adapter escolhido em `lib/agt-client.ts`
 *      (simulação local OU cliente HTTP real, quando configurado);
 *   4. Em caso de falha: incrementa tentativas e agenda retry com backoff
 *      exponencial (T2.2); após `max_tentativas` marca como erro (T2.3).
 *
 * Apenas para código de servidor.
 */

import { obterClienteAGT } from './agt-client';
import {
  atualizarItemFilaAGT,
  atualizarStatusDocumentoAGT,
  obterDadosFiscaisDocumentoAGT,
  obterPendentesEnvioAGT,
} from './queries-agt-fase2';

const BACKOFF_BASE_MS = 30_000; // 30s na primeira falha

function calcularProximaTentativa(tentativas: number, maxTentativas: number): string | null {
  if (tentativas >= maxTentativas) return null; // fim de linha (T2.3)
  const atraso = BACKOFF_BASE_MS * Math.pow(2, tentativas - 1); // 30s, 1m, 2m, 4m...
  return new Date(Date.now() + Math.min(atraso, 3600_000)).toISOString(); // máx 1h
}

const MAX_TENTATIVAS = Number(process.env.AGT_MAX_TENTATIVAS || 5);

/**
 * Processa um lote de documentos pendentes de envio para a AGT.
 * Devolve um resumo do processamento (para API/painel).
 */
export async function processarProximosEnviosAGT(companyId: string, limite = 10) {
  const pendentes = await obterPendentesEnvioAGT(companyId, limite);
  let processados = 0;
  let aceites = 0;
  let falhas = 0;

  for (const { documentoId, numeroCompleto } of pendentes) {
    try {
      const dados = await obterDadosFiscaisDocumentoAGT(companyId, documentoId);
      if (!dados) {
        await atualizarItemFilaAGT(documentoId, 'Erro', MAX_TENTATIVAS, null, 'Documento não encontrado');
        falhas++;
        continue;
      }

      const clienteAGT = obterClienteAGT();
      const resposta = await clienteAGT.transmitir(dados as any);

      if (resposta.aceite) {
        await atualizarStatusDocumentoAGT(companyId, documentoId, 'Transmitido', null);
        await atualizarItemFilaAGT(documentoId, 'Transmitido', 1, null, null);
        aceites++;
      } else {
        // obter tentativas actuais para calcular o retry
        const { obterTentativasAtuais } = await import('./queries-agt-fase2');
        const tentativas = await obterTentativasAtuais(documentoId);
        const proxima = calcularProximaTentativa(tentativas, MAX_TENTATIVAS);
        const estado = proxima ? 'Pendente' : 'Erro';
        await atualizarStatusDocumentoAGT(companyId, documentoId, estado, resposta.mensagem);
        await atualizarItemFilaAGT(documentoId, estado, tentativas, proxima, resposta.mensagem);
        falhas++;
      }
      processados++;
    } catch (e: any) {
      await atualizarItemFilaAGT(documentoId, 'Erro', MAX_TENTATIVAS, null, e?.message || 'Erro interno');
      falhas++;
    }
  }

  return { processados, aceites, falhas, restantes: Math.max(0, 0) };
}