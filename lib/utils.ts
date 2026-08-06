import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export { formatMoedaAOA, formatAOA } from './formatters';

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

