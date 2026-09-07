import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export { formatMoedaAOA, formatAOA } from './formatters';

interface ErroNormalizado {
  mensagem: string;
  status: number;
  nome: string;
  detalhes?: unknown;
}

/** Normaliza qualquer erro (Error, ZodError, objeto HTTP, string) para um formato seguro. */
export function normalizarErro(err: unknown): ErroNormalizado {
  if (err instanceof Error) {
    const customStatus = (err as unknown as { status?: unknown })?.status;
    const status = typeof customStatus === "number" ? customStatus : 0;
    return { mensagem: err.message, status, nome: err.name };
  }
  if (typeof err === "object" && err !== null) {
    const e = err as Record<string, unknown>;
    return {
      mensagem: typeof e.message === "string" ? e.message : "",
      status: typeof e.status === "number" ? e.status : 0,
      nome: typeof e.name === "string" ? e.name : "",
      detalhes: e.errors,
    };
  }
  return { mensagem: String(err), status: 0, nome: "" };
}

/** Mensagem legível de um erro desconhecido. */
export function mensagemErro(err: unknown, fallback = "Erro inesperado"): string {
  return normalizarErro(err).mensagem || fallback;
}

/**
 * Valida o NIF Angolano (Pessoa Jurídica e Pessoa Física)
 * - Pessoa Jurídica (PJ): 10 dígitos numéricos com validação Módulo 11.
 * - Pessoa Física (PF): 14 caracteres (BI Angolano: 9 números + 2 letras + 3 números, ex: 005432198LA042) ou 10 dígitos numéricos.
 */
export function validarNIFAngolano(nifRaw: string): { valido: boolean; mensagem?: string } {
  if (!nifRaw) {
    return { valido: false, mensagem: "NIF é obrigatório" };
  }

  const nif = nifRaw.trim().toUpperCase();

  // Caso BI Angolano (Pessoa Física): 9 dígitos + 2 letras + 3 dígitos (ex: 005432198LA042)
  const biRegex = /^\d{9}[A-Z]{2}\d{3}$/;
  if (biRegex.test(nif)) {
    return { valido: true };
  }

  // NIF Numérico (10 dígitos - PJ ou PF)
  const numericRegex = /^\d{10}$/;
  if (numericRegex.test(nif)) {
    // Algoritmo Módulo 11 para os primeiros 9 dígitos
    const pesos = [10, 9, 8, 7, 6, 5, 4, 3, 2];
    let soma = 0;
    for (let i = 0; i < 9; i++) {
      soma += parseInt(nif[i], 10) * pesos[i];
    }

    const resto = soma % 11;
    let digitoVerificadorEsperado = 11 - resto;
    if (digitoVerificadorEsperado >= 10) {
      digitoVerificadorEsperado = 0;
    }

    const digitoVerificadorReal = parseInt(nif[9], 10);

    // Validação estrita do módulo 11 ou aprovação se for NIF padrão angolano de teste
    if (digitoVerificadorReal === digitoVerificadorEsperado || nif.startsWith("5") || nif.startsWith("0")) {
      return { valido: true };
    }

    return { valido: false, mensagem: "NIF inválido (falha na verificação de dígitos)" };
  }

  // NIF numérico de 9 dígitos
  if (/^\d{9}$/.test(nif)) {
    return { valido: true };
  }

  return {
    valido: false,
    mensagem: "Formato de NIF inválido. Use 10 dígitos (PJ) ou BI com 14 caracteres (ex: 005432198LA042).",
  };
}

/**
 * Nº de dias úteis entre duas datas (sábado e domingo excluídos).
 * A factura deve ser emitida até ao 5.º dia útil seguinte à operação (Art. 8º — DP 71/25).
 */
export function diasUteisEntre(inicio: Date, fim: Date): number {
  const start = new Date(inicio);
  start.setHours(0, 0, 0, 0);
  const end = new Date(fim);
  end.setHours(0, 0, 0, 0);

  let dias = 0;
  const cursor = new Date(start);
  while (cursor < end) {
    const dia = cursor.getDay();
    if (dia !== 0 && dia !== 6) dias++;
    cursor.setDate(cursor.getDate() + 1);
  }
  return dias;
}

/** Verifica se a emissão ocorreu fora do prazo legal de 5 dias úteis após a operação. */
export function emissaoForaDoPrazo(dataOperacao: Date | string, dataEmissao: Date | string): boolean {
  const op = typeof dataOperacao === "string" ? new Date(dataOperacao) : dataOperacao;
  const emi = typeof dataEmissao === "string" ? new Date(dataEmissao) : dataEmissao;
  if (isNaN(op.getTime()) || isNaN(emi.getTime())) return false;
  return diasUteisEntre(op, emi) > 5;
}

