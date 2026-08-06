"use client";

import { useAppStore } from "@/lib/store";
import { Plus, FileText } from "lucide-react";
import Link from "next/link";
import { FaturaFilters } from "./components/fatura-filters";
import { FaturaTable } from "./components/fatura-table";
import { useState } from "react";

export default function FaturasPage() {
  // Seletores individuais para garantir reatividade correcta no Zustand
  const documentos = useAppStore((s) => s.documentos);
  const getClientePorId = useAppStore((s) => s.getClientePorId);

  const [dataInicio, setDataInicio] = useState<Date | null>(null);
  const [dataFim, setDataFim] = useState<Date | null>(null);
  const [statusFiltro, setStatusFiltro] = useState<string>("Todos");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Calcular faturas diretamente de documentos (evita o bug do getter Zustand)
  const todasFaturas = documentos.filter(
    (d) => d.tipo === "Fatura" || d.tipo === "FaturaRecibo" || d.tipo === "Simplificada"
  );

  const filteredFaturas = todasFaturas.filter((fatura) => {
    if (statusFiltro !== "Todos" && fatura.status !== statusFiltro) return false;

    if (dataInicio && new Date(fatura.dataEmissao) < dataInicio) return false;

    if (dataFim) {
      const fim = new Date(dataFim);
      fim.setHours(23, 59, 59, 999);
      if (new Date(fatura.dataEmissao) > fim) return false;
    }

    if (searchTerm.trim() !== "") {
      const term = searchTerm.toLowerCase();
      const cliente = fatura.clienteId ? getClientePorId(fatura.clienteId) : undefined;
      const numCompleto = (fatura.numeroCompleto || `${fatura.serie}/${String(fatura.numero).padStart(6, "0")}`).toLowerCase();
      const matchNum = numCompleto.includes(term) || String(fatura.numero).includes(term);
      const matchCliente = (cliente?.nome || "").toLowerCase().includes(term) || (cliente?.nif || "").toLowerCase().includes(term);
      if (!matchNum && !matchCliente) return false;
    }

    return true;
  });

  const faturasOrdenadas = [...filteredFaturas].sort(
    (a, b) => new Date(b.dataEmissao).getTime() - new Date(a.dataEmissao).getTime()
  );

  return (
    <div className="max-w-7xl mx-auto px-2 py-2 space-y-5 animate-slide-up">

      {/* ── HEADER ──────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30">
            <FileText size={20} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Faturas & Documentos</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {todasFaturas.length} {todasFaturas.length === 1 ? "documento emitido" : "documentos emitidos"}
            </p>
          </div>
        </div>

        <Link href="/faturas/nova">
          <button id="faturas-btn-nova" className="btn-primary">
            <Plus size={16} />
            Nova Fatura
          </button>
        </Link>
      </div>

      {/* ── FILTROS ──────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
        <FaturaFilters
          statusFiltro={statusFiltro}
          onStatusChange={setStatusFiltro}
          dataInicio={dataInicio}
          onDataInicioChange={setDataInicio}
          dataFim={dataFim}
          onDataFimChange={setDataFim}
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
        />
      </div>

      {/* ── TABELA ───────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <FaturaTable faturas={faturasOrdenadas} itemsPerPage={10} />
      </div>

    </div>
  );
}
