import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

/**
 * Formata um valor numérico para a moeda de Angola (Kwanza) no padrão `1.234.567,00 Kz`.
 */
export function formatMoedaAOA(valor: number): string {
  const v = isNaN(valor) ? 0 : valor;
  const formatado = new Intl.NumberFormat("pt-AO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v);
  return `${formatado} Kz`;
}

/**
 * Alias para formatMoedaAOA para uso conciso em componentes
 */
export const formatAOA = formatMoedaAOA;

export function formatData(data: Date | string): string {
  const d = typeof data === "string" ? new Date(data) : data;
  if (isNaN(d.getTime())) return "-";
  return format(d, "dd/MM/yyyy", { locale: ptBR });
}

export function formatDataCompleta(data: Date | string): string {
  const d = typeof data === "string" ? new Date(data) : data;
  if (isNaN(d.getTime())) return "-";
  return format(d, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
}

export function formatDataHora(data: Date | string): string {
  const d = typeof data === "string" ? new Date(data) : data;
  if (isNaN(d.getTime())) return "-";
  return format(d, "dd/MM/yyyy HH:mm", { locale: ptBR });
}

export function parseData(dataStr: string): Date {
  const [dia, mes, ano] = dataStr.split("/").map(Number);
  return new Date(ano, mes - 1, dia);
}
