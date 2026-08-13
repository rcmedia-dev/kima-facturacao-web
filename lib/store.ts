"use client";

import { create } from "zustand";
import {
  Cliente,
  Artigo,
  Fatura,
  FaturaLinha,
  ConfiguracaoEmpresa,
  Fornecedor,
  Documento,
  MovimentoStock,
  LogAuditoria,
  TipoDocumento,
} from "./types";

async function apiFetch<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) {
    throw new Error(json?.error || `Erro ao aceder ${url}`);
  }
  return json.data as T;
}

// Normaliza datas vindas da API (strings ISO → Date)
function normalizarCliente(c: any): Cliente {
  return {
    ...c,
    dataCriacao: new Date(c.dataCriacao),
    ultimaAtualizacao: new Date(c.ultimaAtualizacao),
  };
}

function normalizarArtigo(a: any): Artigo {
  return {
    ...a,
    preco: Number(a.preco),
    taxaIVA: Number(a.taxaIVA),
    stock: Number(a.stock),
    stockMinimo: Number(a.stockMinimo),
    dataCriacao: new Date(a.dataCriacao),
    ultimaAtualizacao: new Date(a.ultimaAtualizacao),
  };
}

function normalizarFornecedor(f: any): Fornecedor {
  return {
    ...f,
    dataCriacao: new Date(f.dataCriacao),
    ultimaAtualizacao: new Date(f.ultimaAtualizacao),
  };
}

function normalizarDocumento(d: any): Documento {
  return {
    ...d,
    numero: String(d.numero),
    dataEmissao: new Date(d.dataEmissao),
    dataVencimento: new Date(d.dataVencimento),
    dataPagamento: d.dataPagamento ? new Date(d.dataPagamento) : undefined,
    dataAtualizacao: new Date(d.dataAtualizacao),
    linhas: (d.linhas || []).map((l: any) => ({
      ...l,
      quantidade: Number(l.quantidade),
      preco: Number(l.preco),
      taxaIVA: Number(l.taxaIVA),
      total: Number(l.total),
    })),
  };
}

interface AppStore {
  // Clientes
  clientes: Cliente[];
  addCliente: (cliente: Omit<Cliente, "id" | "dataCriacao" | "ultimaAtualizacao">) => Promise<Cliente>;
  updateCliente: (id: string, cliente: Partial<Omit<Cliente, "id" | "dataCriacao">>) => Promise<Cliente>;
  deleteCliente: (id: string) => Promise<void>;
  getClientePorId: (id: string) => Cliente | undefined;

  // Artigos
  artigos: Artigo[];
  addArtigo: (artigo: Omit<Artigo, "id" | "dataCriacao" | "ultimaAtualizacao">) => Promise<Artigo>;
  updateArtigo: (id: string, artigo: Partial<Omit<Artigo, "id" | "dataCriacao">>) => Promise<Artigo>;
  deleteArtigo: (id: string) => Promise<void>;
  getArtigoPorId: (id: string) => Artigo | undefined;

  // Fornecedores
  fornecedores: Fornecedor[];
  addFornecedor: (fornecedor: Omit<Fornecedor, "id" | "dataCriacao" | "ultimaAtualizacao">) => Promise<Fornecedor>;
  updateFornecedor: (id: string, fornecedor: Partial<Omit<Fornecedor, "id" | "dataCriacao">>) => Promise<Fornecedor>;
  deleteFornecedor: (id: string) => Promise<void>;
  getFornecedorPorId: (id: string) => Fornecedor | undefined;

  // Documentos
  documentos: Documento[];
  addDocumento: (documento: Omit<Documento, "numeroCompleto" | "dataAtualizacao"> & { id?: string; numeroCompleto?: string }) => Documento;
  updateDocumento: (id: string, documento: Partial<Documento>) => Promise<Documento>;
  deleteDocumento: (id: string) => Promise<void>;
  getDocumentoPorId: (id: string) => Documento | undefined;
  registrarPagamento: (
    id: string,
    data: Date,
    formaPagamento?: "Numerário" | "Transferência" | "Multicaixa" | "POS" | "Cheque" | "Crédito",
    valorPago?: number
  ) => Promise<void>;
  cancelarDocumento: (id: string, motivo: string) => void;

  // Movimentos de Stock
  movimentosStock: MovimentoStock[];
  addMovimentoStock: (movimento: Omit<MovimentoStock, "id">) => void;

  // Logs de Auditoria
  logs: LogAuditoria[];
  addLog: (log: Omit<LogAuditoria, "id">) => void;

  // Configuração
  empresa: ConfiguracaoEmpresa | null;
  setEmpresa: (empresa: ConfiguracaoEmpresa) => void;

  // Gestão de dados (remoto via API)
  loadFromStorage: () => Promise<void>;
  loadAll: () => Promise<void>;
  seedMockData: () => void;
  clearAllData: () => void;

  // Aliases de Faturas (para compatibilidade)
  faturas: Fatura[];
  addFatura: (fatura: Omit<Fatura, "numeroCompleto" | "dataAtualizacao"> & { id?: string; numeroCompleto?: string }) => Fatura;
  updateFatura: (id: string, fatura: Partial<Fatura>) => Promise<Fatura>;
  deleteFatura: (id: string) => Promise<void>;
  getFaturaPorId: (id: string) => Fatura | undefined;
  cancelarFatura: (id: string) => void;
}

export const useAppStore = create<AppStore>((set, get) => ({
  clientes: [],
  artigos: [],
  fornecedores: [],
  documentos: [],
  movimentosStock: [],
  logs: [],
  empresa: null,

  // Clientes
  addCliente: async (cliente) => {
    const c = await apiFetch<any>("/api/clients", {
      method: "POST",
      body: JSON.stringify(cliente),
    });
    const novo = normalizarCliente(c);
    set((state) => ({ clientes: [...state.clientes, novo] }));
    return novo;
  },

  updateCliente: async (id, cliente) => {
    const c = await apiFetch<any>(`/api/clients/${id}`, {
      method: "PUT",
      body: JSON.stringify(cliente),
    });
    const atualizado = normalizarCliente(c);
    set((state) => ({
      clientes: state.clientes.map((x) => (x.id === id ? atualizado : x)),
    }));
    return atualizado;
  },

  deleteCliente: async (id) => {
    await apiFetch<any>(`/api/clients/${id}`, { method: "DELETE" });
    set((state) => ({ clientes: state.clientes.filter((c) => c.id !== id) }));
  },

  getClientePorId: (id) => get().clientes.find((c) => c.id === id),

  // Artigos
  addArtigo: async (artigo) => {
    const a = await apiFetch<any>("/api/products", {
      method: "POST",
      body: JSON.stringify({
        ...artigo,
        taxaIVA: String(artigo.taxaIVA),
      }),
    });
    const novo = normalizarArtigo(a);
    set((state) => ({ artigos: [...state.artigos, novo] }));
    return novo;
  },

  updateArtigo: async (id, artigo) => {
    const a = await apiFetch<any>(`/api/products/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        ...artigo,
        taxaIVA: artigo.taxaIVA !== undefined ? String(artigo.taxaIVA) : undefined,
      }),
    });
    const atualizado = normalizarArtigo(a);
    set((state) => ({
      artigos: state.artigos.map((x) => (x.id === id ? atualizado : x)),
    }));
    return atualizado;
  },

  deleteArtigo: async (id) => {
    await apiFetch<any>(`/api/products/${id}`, { method: "DELETE" });
    set((state) => ({ artigos: state.artigos.filter((a) => a.id !== id) }));
  },

  getArtigoPorId: (id) => get().artigos.find((a) => a.id === id),

  // Fornecedores
  addFornecedor: async (fornecedor) => {
    const f = await apiFetch<any>("/api/suppliers", {
      method: "POST",
      body: JSON.stringify(fornecedor),
    });
    const novo = normalizarFornecedor(f);
    set((state) => ({ fornecedores: [...state.fornecedores, novo] }));
    return novo;
  },

  updateFornecedor: async (id, fornecedor) => {
    const f = await apiFetch<any>(`/api/suppliers/${id}`, {
      method: "PUT",
      body: JSON.stringify(fornecedor),
    });
    const atualizado = normalizarFornecedor(f);
    set((state) => ({
      fornecedores: state.fornecedores.map((x) => (x.id === id ? atualizado : x)),
    }));
    return atualizado;
  },

  deleteFornecedor: async (id) => {
    await apiFetch<any>(`/api/suppliers/${id}`, { method: "DELETE" });
    set((state) => ({ fornecedores: state.fornecedores.filter((f) => f.id !== id) }));
  },

  getFornecedorPorId: (id) => get().fornecedores.find((f) => f.id === id),

  // Documentos
  addDocumento: (documento) => {
    const numInt = parseInt(documento.numero, 10) || 1;
    const numeroCompleto =
      documento.numeroCompleto ||
      `${documento.serie}/${String(numInt).padStart(6, "0")}`;

    const novoDocumento: Documento = {
      ...documento,
      id: documento.id || crypto.randomUUID(),
      numeroCompleto,
      dataAtualizacao: new Date(),
    };
    set((state) => ({
      documentos: [...state.documentos, novoDocumento],
    }));
    return novoDocumento;
  },

  updateDocumento: async (id, documento) => {
    const payload: any = {};
    if (documento.status) payload.status = documento.status;
    if (documento.formaPagamento) payload.formaPagamento = documento.formaPagamento;
    if (documento.observacoes !== undefined) payload.observacoes = documento.observacoes;
    if (documento.dataPagamento) payload.dataPagamento = documento.dataPagamento.toISOString();
    if (documento.dataVencimento) payload.dataVencimento = documento.dataVencimento.toISOString();
    if (documento.motivo !== undefined) payload.motivo = documento.motivo;

    const docAtualizado = await apiFetch<any>(`/api/invoices/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    const atualizado = normalizarDocumento(docAtualizado);
    set((state) => ({
      documentos: state.documentos.map((d) =>
        d.id === id ? atualizado : d
      ),
    }));
    return atualizado;
  },

  deleteDocumento: async (id) => {
    await apiFetch<any>(`/api/invoices/${id}`, { method: "DELETE" });
    set((state) => ({ documentos: state.documentos.filter((d) => d.id !== id) }));
  },

  getDocumentoPorId: (id) => get().documentos.find((d) => d.id === id),

  registrarPagamento: async (id, data, formaPagamento, valorPago) => {
    const doc = get().getDocumentoPorId(id);
    if (!doc) return;

    await apiFetch<any>(
      "/api/payments",
      {
        method: "POST",
        body: JSON.stringify({
          invoiceId: id,
          amount: valorPago || doc.total,
          paymentDate: data.toISOString(),
          method: formaPagamento || doc.formaPagamento,
        }),
      }
    );
    await get().updateDocumento(id, {
      status: "Pago",
      dataPagamento: data,
      formaPagamento,
    });
    get().addLog({
      usuario: "Operador",
      acao: `Pagamento de ${valorPago || doc.total} AOA registado via ${formaPagamento || doc.formaPagamento}`,
      entidade: "Documento",
      entidadeId: id,
      timestamp: new Date(),
    });
  },

  cancelarDocumento: (id, motivo) => {
    get().updateDocumento(id, {
      status: "Cancelado",
      motivo,
    });
  },

  // Stock & Logs
  addMovimentoStock: (movimento) => {
    set((state) => ({
      movimentosStock: [
        ...state.movimentosStock,
        { ...movimento, id: crypto.randomUUID() },
      ],
    }));
  },

  addLog: (log) => {
    set((state) => ({
      logs: [...state.logs, { ...log, id: crypto.randomUUID() }],
    }));
  },

  // Faturas aliases (compatibilidade)
  addFatura: (fatura) => get().addDocumento(fatura),
  updateFatura: (id, fatura) => get().updateDocumento(id, fatura),
  deleteFatura: (id) => get().deleteDocumento(id),
  getFaturaPorId: (id) => get().getDocumentoPorId(id),
  cancelarFatura: (id) => get().cancelarDocumento(id, "Cancelamento manual"),

  get faturas() {
    return get().documentos.filter(
      (d) => d.tipo === "Fatura" || d.tipo === "FaturaRecibo" || d.tipo === "Simplificada"
    );
  },

  // Empresa
  setEmpresa: (empresa) => {
    set({ empresa });
  },

  seedMockData: () => {
    // Remove: os dados passam a vir apenas do Supabase.
  },

  clearAllData: () => {
    set({
      empresa: null,
      clientes: [],
      artigos: [],
      fornecedores: [],
      documentos: [],
      movimentosStock: [],
      logs: [],
    });
  },

  loadFromStorage: () => get().loadAll(),

  loadAll: async () => {
    try {
      const [clientes, artigos, fornecedores, documentos, empresa] =
        await Promise.all([
          apiFetch<any[]>("/api/clients"),
          apiFetch<any[]>("/api/products"),
          apiFetch<any[]>("/api/suppliers"),
          apiFetch<any[]>("/api/invoices"),
          apiFetch<any>("/api/company"),
        ]);

      set({
        clientes: (clientes || []).map(normalizarCliente),
        artigos: (artigos || []).map(normalizarArtigo),
        fornecedores: (fornecedores || []).map(normalizarFornecedor),
        documentos: (documentos || []).map(normalizarDocumento),
        empresa: empresa || null,
      });
    } catch (error) {
      console.error("Erro ao carregar dados da API:", error);
    }
  },
}));

// Carrega dados do servidor (Supabase) ao iniciar a aplicação.
if (typeof window !== "undefined") {
  useAppStore.getState().loadAll();
}