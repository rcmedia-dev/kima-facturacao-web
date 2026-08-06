"use client";

export const STORAGE_KEYS = {
  CLIENTES: "kima_clientes",
  ARTIGOS: "kima_artigos",
  FORNECEDORES: "kima_fornecedores",
  FATURAS: "kima_faturas", // deprecated, use DOCUMENTOS
  DOCUMENTOS: "kima_documentos",
  MOVIMENTOS_STOCK: "kima_movimentos_stock",
  LOGS_AUDITORIA: "kima_logs_auditoria",
  EMPRESA: "kima_empresa",
  ULTIMO_NUMERO_FATURA: "kima_ultimo_numero_fatura", // deprecated
  NUMERACAO_SERIES: "kima_numeracao_series",
};

export function getStorage<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch (error) {
    console.error("Erro ao ler localStorage:", error);
    return null;
  }
}

export function setStorage<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error("Erro ao salvar em localStorage:", error);
  }
}

export function removeStorage(key: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error("Erro ao remover de localStorage:", error);
  }
}

export function clearStorage(): void {
  if (typeof window === "undefined") return;
  try {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  } catch (error) {
    console.error("Erro ao limpar localStorage:", error);
  }
}
