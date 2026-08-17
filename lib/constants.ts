export const FORMAS_PAGAMENTO = ["Numerário", "Transferência", "Multicaixa", "POS", "Cheque", "Crédito"] as const;

export const TIPOS_DOCUMENTO = {
  FATURA: "Fatura",
  FATURA_RECIBO: "FaturaRecibo",
  SIMPLIFICADA: "Simplificada",
  NOTA_CREDITO: "NotaCredito",
  NOTA_DEBITO: "NotaDebito",
  ORCAMENTO: "Orcamento",
  GUIA_REMESSA: "GuiaRemessa",
  AVISO_COBRANCA_RECIBO: "AvisoCobrancaRecibo",
  FATURA_GENERICA: "FaturaGenerica",
  FATURA_GLOBAL: "FaturaGlobal",
  FATURA_ADIANTAMENTO: "FaturaAdiantamento",
  RECIBO: "Recibo",
} as const;

/** Rótulos oficiais dos documentos conforme o Decreto Presidencial nº 71/25 (Art. 3º e Art. 4º, nº 9) */
export const LABELS_DOCUMENTO: Record<string, string> = {
  Fatura: "Factura",
  FaturaRecibo: "Factura-Recibo",
  Simplificada: "Talão de Venda ou Prestação de Serviço",
  NotaCredito: "Nota de Crédito",
  NotaDebito: "Nota de Débito",
  Orcamento: "Factura pro-forma",
  GuiaRemessa: "Guia de Remessa ou Transporte",
  AvisoCobrancaRecibo: "Aviso de Cobrança-Recibo",
  FaturaGenerica: "Factura Genérica",
  FaturaGlobal: "Factura Global",
  FaturaAdiantamento: "Factura Adiantamento",
  Recibo: "Recibo",
};

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
