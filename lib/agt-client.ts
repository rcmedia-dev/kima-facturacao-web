/**
 * T2.1 · Cliente de Integração API REST AGT (adapter)
 *
 * Estrutura PRONTA para receber a API oficial da AGT. Duas implementações:
 *   - ClienteAGTMock  — simulação local (funciona sem API real; útil para
 *                       desenvolver/testar o fluxo de fila/contingência/UI).
 *   - ClienteAGTHTTP  — cliente REST real; só fica activo quando as variáveis
 *                       de ambiente da AGT forem configuradas (spec oficial).
 *
 * Como a AGT ainda não publicou aqui o endpoint, o comportamento é:
 *   1) AGT_MOCK_MODE=true  (default) → usa ClienteAGTMock;
 *   2) Se AGT_BASE_URL estiver configurada → usa ClienteAGTHTTP real.
 *
 * Apenas para código de servidor (API routes / Edge Functions).
 */

export type EstadoAGT =
  | "Pendente"
  | "Processando"
  | "Transmitido"
  | "Rejeitado"
  | "Erro";

export interface AGTDocumentoTransmissao {
  numeroCompleto: string;
  tipo: string;
  serie: string;
  numero: string;
  dataEmissao: string; // ISO
  nifEmpresa: string;
  nifCliente?: string;
  subtotal: number;
  totalIVA: number;
  total: number;
  hash: string;
  hashAnterior?: string | null;
  assinaturaJWS?: string | null;
  qrPayload?: string | null;
  certAgtNumero?: string | null;
  linhas?: { descricao: string; quantidade: number; preco: number; taxaIVA: number; total: number }[];
}

export interface AGTRespostaTransmissao {
  aceite: boolean;
  idTransacao?: string;
  motivoRejeicao?: string;
  mensagem: string;
  recebidoEm: string;
}

/** Interface comum das implementações — TROQUE AQUI ao chegar a spec da AGT. */
export interface ClienteAGTAdapter {
  readonly nome: string;
  transmitir(doc: AGTDocumentoTransmissao): Promise<AGTRespostaTransmissao>;
}

/**
 * Simulação determinística — NÃO é a AGT real. Útil para testar fila/retry/UI.
 * Falha se `AGT_MOCK_TAXA_ERRO` (0–1) exceder o valor sorteado, ou se o
 * documento já tiver sido simulado como aceite (idempotência simples).
 */
export class ClienteAGTMock implements ClienteAGTAdapter {
  readonly nome = "AGT (simulação)";
  private aceites = new Set<string>();

  async transmitir(doc: AGTDocumentoTransmissao): Promise<AGTRespostaTransmissao> {
    await new Promise((r) => setTimeout(r, 50)); // latência simulada

    const taxaErro = parseFloat(process.env.AGT_MOCK_TAXA_ERRO || "0");
    const falhou = !this.aceites.has(doc.numeroCompleto) && Math.random() < Math.min(Math.max(taxaErro, 0), 1);

    if (falhou) {
      return {
        aceite: false,
        motivoRejeicao: "SIMUL-EXTERNO",
        mensagem: "Simulação: indisponibilidade temporária da AGT (retorne depois)",
        recebidoEm: new Date().toISOString(),
      };
    }

    this.aceites.add(doc.numeroCompleto);
    return {
      aceite: true,
      idTransacao: `SIM-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      mensagem: "Documento aceite (simulação local — endpoint AGT não configurado)",
      recebidoEm: new Date().toISOString(),
    };
  }
}

/** Cliente HTTP real — activo quando AGT_BASE_URL estiver definida. */
export class ClienteAGTHTTP implements ClienteAGTAdapter {
  readonly nome = "AGT (produção)";
  private readonly baseUrl = process.env.AGT_BASE_URL || "";
  private readonly clientId = process.env.AGT_CLIENT_ID || "";
  private readonly clientSecret = process.env.AGT_CLIENT_SECRET || "";
  private readonly endpoint = "documentos/transmitir"; // ← ajustar à spec oficial

  constructor() {
    if (!this.baseUrl) {
      throw new Error("AGT_BASE_URL não configurada. Impossível usar o cliente HTTP.");
    }
  }

  async transmitir(doc: AGTDocumentoTransmissao): Promise<AGTRespostaTransmissao> {
    const url = `${this.baseUrl.replace(/\/$/, "")}/${this.endpoint}`;
    const resposta = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.clientId}:${this.clientSecret}`, // ← ajustar ao método oficial
      },
      body: JSON.stringify(doc),
    });

    if (!resposta.ok) {
      const corpo = await resposta.text().catch(() => "");
      return {
        aceite: false,
        motivoRejeicao: `HTTP-${resposta.status}`,
        mensagem: corpo.slice(0, 500) || `Erro ${resposta.status} da AGT`,
        recebidoEm: new Date().toISOString(),
      };
    }

    const json = (await resposta.json()) as AGTRespostaTransmissao;
    return { ...json, recebidoEm: json.recebidoEm || new Date().toISOString() };
  }
}

/** Devolve o adapter adequado com base nas variáveis de ambiente. */
export function obterClienteAGT(): ClienteAGTAdapter {
  const baseUrl = process.env.AGT_BASE_URL;
  if (baseUrl && process.env.AGT_MOCK_MODE !== "true") {
    return new ClienteAGTHTTP();
  }
  return new ClienteAGTMock();
}

/** Indica se estamos em modo simulação (usar nas UI para avisar o utilizador). */
export function agtEmSimulacao(): boolean {
  return !process.env.AGT_BASE_URL || process.env.AGT_MOCK_MODE === "true";
}

/** Mapeia a resposta da AGT para o estado persistido no documento (T2.4). */
export function mapearEstadoDoDocumento(resposta: AGTRespostaTransmissao): EstadoAGT {
  if (resposta.aceite) return "Transmitido";
  return "Rejeitado";
}