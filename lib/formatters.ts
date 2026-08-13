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
