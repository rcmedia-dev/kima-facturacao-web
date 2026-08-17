import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

/**
 * Formata um valor numérico para a moeda de Angola (Kwanza) no padrão `1.234.567,00 Kz`.
 * Separador de milhares: `.` | Separador decimal: `,`
 */
export function formatMoedaAOA(valor: number): string {
  const v = isNaN(valor) ? 0 : valor;
  const negativo = v < 0;
  const partes = Math.abs(v).toFixed(2).split(".");
  const inteiro = partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const decimal = partes[1] ?? "00";
  const formatado = `${negativo ? "-" : ""}${inteiro},${decimal}`;
  return `${formatado} Kz`;
}

/**
 * Alias para formatMoedaAOA para uso conciso em componentes
 */
export const formatAOA = formatMoedaAOA;

export function formatData(data: Date | string): string {
  const d = typeof data === "string" ? new Date(data) : data;
  if (isNaN(d.getTime())) return "-";
  const dia = format(d, "dd", { locale: ptBR });
  const mesFormatado = format(d, "MMMM", { locale: ptBR });
  const ano = format(d, "yyyy", { locale: ptBR });
  const mes = mesFormatado.charAt(0).toUpperCase() + mesFormatado.slice(1);
  return `${dia} de ${mes} de ${ano}`;
}

/**
 * Alias para formatData (mantido por compatibilidade)
 */
export function formatDataCompleta(data: Date | string): string {
  return formatData(data);
}

export function formatDataHora(data: Date | string): string {
  const d = typeof data === "string" ? new Date(data) : data;
  if (isNaN(d.getTime())) return "-";
  const dataParte = formatData(d);
  const hora = format(d, "HH:mm", { locale: ptBR });
  return `${dataParte}, ${hora}`;
}

export function parseData(dataStr: string): Date {
  const [dia, mes, ano] = dataStr.split("/").map(Number);
  return new Date(ano, mes - 1, dia);
}

// ─── NÚMEROS POR EXTENSO (Kwanzas) ──────────────────────────────────────────

const UNIDADES = [
  "", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove",
  "dez", "onze", "doze", "treze", "catorze", "quinze", "dezasseis", "dezassete",
  "dezoito", "dezanove",
];

const DEZENAS = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];

const CENTENAS: Record<number, string> = {
  1: "cento", 2: "duzentos", 3: "trezentos", 4: "quatrocentos", 5: "quinhentos",
  6: "seiscentos", 7: "setecentos", 8: "oitocentos", 9: "novecentos",
};

function centenasPorExtenso(n: number): string {
  if (n === 0) return "";
  if (n === 100) return "cem";
  const c = Math.floor(n / 100);
  const r = n % 100;
  const parte = CENTENAS[c];
  const resto = r === 0 ? "" : ` e ${dezenasPorExtenso(r)}`;
  return `${parte}${resto}`;
}

function dezenasPorExtenso(n: number): string {
  if (n === 0) return "";
  if (n < 20) return UNIDADES[n];
  const d = Math.floor(n / 10);
  const u = n % 10;
  const parte = DEZENAS[d];
  const resto = u === 0 ? "" : ` e ${UNIDADES[u]}`;
  return `${parte}${resto}`;
}

function grupoPorExtenso(n: number): string {
  if (n === 0) return "";
  if (n < 100) return dezenasPorExtenso(n);
  return centenasPorExtenso(n);
}

/**
 * Escreve um valor monetário por extenso em Kwanzas (Art. 10º, alínea d — DP 71/25).
 * Ex: 1234567.89 → "um milhão duzentos e trinta e quatro mil quinhentos e sessenta e sete Kwanzas e oitenta e nove cêntimos"
 */
export function valorPorExtenso(valor: number): string {
  if (isNaN(valor)) return "";
  const v = Math.abs(valor);
  const inteiro = Math.floor(v);
  const centimos = Math.round((v - inteiro) * 100);

  const milhoes = Math.floor(inteiro / 1_000_000);
  const milhares = Math.floor((inteiro % 1_000_000) / 1000);
  const unidades = inteiro % 1000;

  const palavras: string[] = [];

  if (milhoes > 0) {
    palavras.push(milhoes === 1 ? "um milhão" : `${grupoPorExtenso(milhoes)} milhões`);
  }
  if (milhares > 0) {
    palavras.push(milhares === 1 ? "mil" : `${grupoPorExtenso(milhares)} mil`);
  }
  if (unidades > 0) {
    palavras.push(grupoPorExtenso(unidades));
  }

  let texto = palavras.length > 0 ? palavras.join(" e ") : "zero";

  // "milhões duzentos e trinta e quatro mil" (sem "e" entre milhões e milhares,
  // mas com "e" antes das unidades)
  if (milhoes > 0 && milhares > 0 && unidades > 0) {
    texto = `${palavras[0]} ${palavras[1]} e ${palavras[2]}`;
  }

  texto = `${texto} Kwanzas`;

  if (centimos > 0) {
    texto += ` e ${grupoPorExtenso(centimos)} cêntimos`;
  }

  return `${valor < 0 ? "menos " : ""}${texto}`;
}
