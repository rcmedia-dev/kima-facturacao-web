"use client";

import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
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
  TipoCliente,
  TipoDocumento,
} from "./types";
import { STORAGE_KEYS, getStorage, setStorage, clearStorage } from "./storage";
import { loadMockData } from "./mock-data";

function generateId(): string {
  return uuidv4();
}

interface AppStore {
  // Clientes
  clientes: Cliente[];
  addCliente: (cliente: Omit<Cliente, "id" | "dataCriacao" | "ultimaAtualizacao">) => void;
  updateCliente: (id: string, cliente: Partial<Omit<Cliente, "id" | "dataCriacao">>) => void;
  deleteCliente: (id: string) => void;
  getClientePorId: (id: string) => Cliente | undefined;

  // Artigos
  artigos: Artigo[];
  addArtigo: (artigo: Omit<Artigo, "id" | "dataCriacao" | "ultimaAtualizacao">) => void;
  updateArtigo: (id: string, artigo: Partial<Omit<Artigo, "id" | "dataCriacao">>) => void;
  deleteArtigo: (id: string) => void;
  getArtigoPorId: (id: string) => Artigo | undefined;

  // Fornecedores
  fornecedores: Fornecedor[];
  addFornecedor: (fornecedor: Omit<Fornecedor, "id" | "dataCriacao" | "ultimaAtualizacao">) => void;
  updateFornecedor: (id: string, fornecedor: Partial<Omit<Fornecedor, "id" | "dataCriacao">>) => void;
  deleteFornecedor: (id: string) => void;
  getFornecedorPorId: (id: string) => Fornecedor | undefined;

  // Documentos
  documentos: Documento[];
  addDocumento: (documento: Omit<Documento, "numeroCompleto" | "dataAtualizacao"> & { id?: string; numeroCompleto?: string }) => Documento;
  updateDocumento: (id: string, documento: Partial<Documento>) => void;
  deleteDocumento: (id: string) => void;
  getDocumentoPorId: (id: string) => Documento | undefined;
  registrarPagamento: (
    id: string,
    data: Date,
    formaPagamento?: "Numerário" | "Transferência" | "Multicaixa" | "POS" | "Cheque" | "Crédito",
    valorPago?: number
  ) => void;
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

  // Gestão de Dados Mockados & Storage
  loadFromStorage: () => void;
  seedMockData: () => void;
  clearAllData: () => void;

  // Aliases de Faturas (para compatibilidade)
  faturas: Fatura[];
  addFatura: (fatura: Omit<Fatura, "numeroCompleto" | "dataAtualizacao"> & { id?: string; numeroCompleto?: string }) => Fatura;
  updateFatura: (id: string, fatura: Partial<Fatura>) => void;
  deleteFatura: (id: string) => void;
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
  addCliente: (cliente) =>
    set((state) => {
      const novoCliente: Cliente = {
        ...cliente,
        id: generateId(),
        dataCriacao: new Date(),
        ultimaAtualizacao: new Date(),
      };
      const updated = [...state.clientes, novoCliente];
      setStorage(STORAGE_KEYS.CLIENTES, updated);
      return { clientes: updated };
    }),

  updateCliente: (id, cliente) =>
    set((state) => {
      const updated = state.clientes.map((c) =>
        c.id === id ? { ...c, ...cliente, id, ultimaAtualizacao: new Date() } : c
      );
      setStorage(STORAGE_KEYS.CLIENTES, updated);
      return { clientes: updated };
    }),

  deleteCliente: (id) =>
    set((state) => {
      const updated = state.clientes.filter((c) => c.id !== id);
      setStorage(STORAGE_KEYS.CLIENTES, updated);
      return { clientes: updated };
    }),

  getClientePorId: (id) => get().clientes.find((c) => c.id === id),

  // Artigos
  addArtigo: (artigo) =>
    set((state) => {
      const novoArtigo: Artigo = {
        ...artigo,
        id: generateId(),
        dataCriacao: new Date(),
        ultimaAtualizacao: new Date(),
      };
      const updated = [...state.artigos, novoArtigo];
      setStorage(STORAGE_KEYS.ARTIGOS, updated);
      return { artigos: updated };
    }),

  updateArtigo: (id, artigo) =>
    set((state) => {
      const updated = state.artigos.map((a) =>
        a.id === id ? { ...a, ...artigo, id, ultimaAtualizacao: new Date() } : a
      );
      setStorage(STORAGE_KEYS.ARTIGOS, updated);
      return { artigos: updated };
    }),

  deleteArtigo: (id) =>
    set((state) => {
      const updated = state.artigos.filter((a) => a.id !== id);
      setStorage(STORAGE_KEYS.ARTIGOS, updated);
      return { artigos: updated };
    }),

  getArtigoPorId: (id) => get().artigos.find((a) => a.id === id),

  // Fornecedores
  addFornecedor: (fornecedor) =>
    set((state) => {
      const novoFornecedor: Fornecedor = {
        ...fornecedor,
        id: generateId(),
        dataCriacao: new Date(),
        ultimaAtualizacao: new Date(),
      };
      const updated = [...state.fornecedores, novoFornecedor];
      setStorage(STORAGE_KEYS.FORNECEDORES, updated);
      return { fornecedores: updated };
    }),

  updateFornecedor: (id, fornecedor) =>
    set((state) => {
      const updated = state.fornecedores.map((f) =>
        f.id === id
          ? { ...f, ...fornecedor, id, ultimaAtualizacao: new Date() }
          : f
      );
      setStorage(STORAGE_KEYS.FORNECEDORES, updated);
      return { fornecedores: updated };
    }),

  deleteFornecedor: (id) =>
    set((state) => {
      const updated = state.fornecedores.filter((f) => f.id !== id);
      setStorage(STORAGE_KEYS.FORNECEDORES, updated);
      return { fornecedores: updated };
    }),

  getFornecedorPorId: (id) => get().fornecedores.find((f) => f.id === id),

  // Documentos
  addDocumento: (documento) => {
    const numInt = parseInt(documento.numero, 10) || 1;
    const numeroCompleto =
      documento.numeroCompleto ||
      `${documento.serie}/${String(numInt).padStart(6, "0")}`;

    const novoDocumento: Documento = {
      ...documento,
      id: documento.id || generateId(),
      numeroCompleto,
      dataAtualizacao: new Date(),
    };
    set((state) => {
      const updated = [...state.documentos, novoDocumento];
      setStorage(STORAGE_KEYS.DOCUMENTOS, updated);
      return { documentos: updated };
    });
    return novoDocumento;
  },

  updateDocumento: (id, documento) =>
    set((state) => {
      const updated = state.documentos.map((d) =>
        d.id === id
          ? { ...d, ...documento, dataAtualizacao: new Date() }
          : d
      );
      setStorage(STORAGE_KEYS.DOCUMENTOS, updated);
      return { documentos: updated };
    }),

  deleteDocumento: (id) =>
    set((state) => {
      const updated = state.documentos.filter((d) => d.id !== id);
      setStorage(STORAGE_KEYS.DOCUMENTOS, updated);
      return { documentos: updated };
    }),

  getDocumentoPorId: (id) => get().documentos.find((d) => d.id === id),

  registrarPagamento: (id, data, formaPagamento, valorPago) => {
    const doc = get().getDocumentoPorId(id);
    if (doc) {
      const novosDados: Partial<Documento> = {
        status: "Pago",
        dataPagamento: data,
      };
      if (formaPagamento) {
        novosDados.formaPagamento = formaPagamento;
      }
      get().updateDocumento(id, novosDados);
      get().addLog({
        usuario: "Operador",
        acao: `Pagamento de ${valorPago ? valorPago : doc.total} AOA registado via ${formaPagamento || doc.formaPagamento}`,
        entidade: "Documento",
        entidadeId: id,
        timestamp: new Date(),
      });
    }
  },

  cancelarDocumento: (id, motivo) => {
    const doc = get().getDocumentoPorId(id);
    if (doc) {
      get().updateDocumento(id, {
        status: "Cancelado",
        motivo,
      });
    }
  },

  // Stock & Logs
  addMovimentoStock: (movimento) =>
    set((state) => {
      const novoMovimento: MovimentoStock = {
        ...movimento,
        id: generateId(),
      };
      const updated = [...state.movimentosStock, novoMovimento];
      setStorage(STORAGE_KEYS.MOVIMENTOS_STOCK, updated);
      return { movimentosStock: updated };
    }),

  addLog: (log) =>
    set((state) => {
      const novoLog: LogAuditoria = {
        ...log,
        id: generateId(),
      };
      const updated = [...state.logs, novoLog];
      setStorage(STORAGE_KEYS.LOGS_AUDITORIA, updated);
      return { logs: updated };
    }),

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
    setStorage(STORAGE_KEYS.EMPRESA, empresa);
    set({ empresa });
  },

  // População com Mock Data
  seedMockData: () => {
    const mock = loadMockData();
    setStorage(STORAGE_KEYS.EMPRESA, mock.empresa);
    setStorage(STORAGE_KEYS.CLIENTES, mock.clientes);
    setStorage(STORAGE_KEYS.ARTIGOS, mock.artigos);
    setStorage(STORAGE_KEYS.FORNECEDORES, mock.fornecedores);
    setStorage(STORAGE_KEYS.DOCUMENTOS, mock.documentos);
    setStorage(STORAGE_KEYS.MOVIMENTOS_STOCK, mock.movimentosStock);

    set({
      empresa: mock.empresa,
      clientes: mock.clientes,
      artigos: mock.artigos,
      fornecedores: mock.fornecedores,
      documentos: mock.documentos,
      movimentosStock: mock.movimentosStock,
    });
  },

  // Limpeza de todos os dados do localStorage e do estado
  clearAllData: () => {
    clearStorage();
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

  // Inicialização a partir do Storage local
  loadFromStorage: () => {
    if (typeof window === "undefined") return;

    try {
      const empresa = getStorage<ConfiguracaoEmpresa>(STORAGE_KEYS.EMPRESA);
      const clientes = getStorage<Cliente[]>(STORAGE_KEYS.CLIENTES);
      const artigos = getStorage<Artigo[]>(STORAGE_KEYS.ARTIGOS);
      const fornecedores = getStorage<Fornecedor[]>(STORAGE_KEYS.FORNECEDORES);
      const documentos = getStorage<Documento[]>(STORAGE_KEYS.DOCUMENTOS) || getStorage<Fatura[]>(STORAGE_KEYS.FATURAS);
      const movimentosStock = getStorage<MovimentoStock[]>(STORAGE_KEYS.MOVIMENTOS_STOCK);
      const logs = getStorage<LogAuditoria[]>(STORAGE_KEYS.LOGS_AUDITORIA);

      // Se o localStorage não contiver dados, auto-popula com os dados mockados de lib/mock-data.ts
      if (!clientes || clientes.length === 0) {
        get().seedMockData();
        return;
      }

      // Converter strings de datas em instâncias Date reais
      const clientesProcessados = (clientes || []).map((c) => ({
        ...c,
        dataCriacao: new Date(c.dataCriacao),
        ultimaAtualizacao: new Date(c.ultimaAtualizacao),
      }));

      const artigosProcessados = (artigos || []).map((a) => ({
        ...a,
        dataCriacao: new Date(a.dataCriacao),
        ultimaAtualizacao: new Date(a.ultimaAtualizacao),
      }));

      const fornecedoresProcessados = (fornecedores || []).map((f) => ({
        ...f,
        dataCriacao: new Date(f.dataCriacao),
        ultimaAtualizacao: new Date(f.ultimaAtualizacao),
      }));

      const documentosProcessados = (documentos || []).map((d) => ({
        ...d,
        dataEmissao: new Date(d.dataEmissao),
        dataVencimento: new Date(d.dataVencimento),
        dataAtualizacao: new Date(d.dataAtualizacao),
        dataPagamento: d.dataPagamento ? new Date(d.dataPagamento) : undefined,
      }));

      const movimentosProcessados = (movimentosStock || []).map((m) => ({
        ...m,
        data: new Date(m.data),
      }));

      const logsProcessados = (logs || []).map((l) => ({
        ...l,
        timestamp: new Date(l.timestamp),
      }));

      set({
        empresa: empresa ? { ...empresa, criadoEm: new Date(empresa.criadoEm), ultimaAtualizacao: new Date(empresa.ultimaAtualizacao) } : null,
        clientes: clientesProcessados,
        artigos: artigosProcessados,
        fornecedores: fornecedoresProcessados,
        documentos: documentosProcessados,
        movimentosStock: movimentosProcessados,
        logs: logsProcessados,
      });
    } catch (error) {
      console.error("Erro ao carregar dados do localStorage:", error);
    }
  },
}));

// ─── Inicialização imediata ──────────────────────────────────────────────────
// Carrega dados do localStorage antes de qualquer render React,
// garantindo que o store nunca começa vazio quando existem dados guardados.
if (typeof window !== "undefined") {
  useAppStore.getState().loadFromStorage();
}

