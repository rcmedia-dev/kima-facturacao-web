export const FORMAS_PAGAMENTO = ["Numerário", "Transferência", "Multicaixa", "POS", "Cheque", "Crédito"] as const;

export const TIPOS_DOCUMENTO = {
  FATURA: "Fatura",
  FATURA_RECIBO: "FaturaRecibo",
  SIMPLIFICADA: "Simplificada",
  NOTA_CREDITO: "NotaCredito",
  NOTA_DEBITO: "NotaDebito",
  ORCAMENTO: "Orcamento",
  GUIA_REMESSA: "GuiaRemessa",
} as const;

export const STATUS_DOCUMENTO = {
  PAGO: "Pago",
  PENDENTE: "Pendente",
  CANCELADO: "Cancelado",
  PROCESSADO: "Processado",
  RASCUNHO: "Rascunho",
} as const;

export const TIPOS_CLIENTE = {
  PF: "PF",
  PJ: "PJ",
} as const;

export const UNIDADES_MEDIDA = ["UN", "KG", "M", "M2", "L", "H", "DIA", "MES"] as const;

export const TIPOS_MOVIMENTO_STOCK = ["Entrada", "Saída", "Ajuste"] as const;

export const TAXAS_IVA = [0, 7, 14] as const;

export const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  Pago: { bg: "bg-green-100", text: "text-green-800" },
  Pendente: { bg: "bg-amber-100", text: "text-amber-800" },
  Cancelado: { bg: "bg-red-100", text: "text-red-800" },
  Processado: { bg: "bg-blue-100", text: "text-blue-800" },
  Rascunho: { bg: "bg-gray-100", text: "text-gray-800" },
};

export const DIAS_VENCIMENTO_DEFAULT = 30;
