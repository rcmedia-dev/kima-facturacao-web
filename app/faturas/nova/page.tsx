"use client";

import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppStore } from "@/lib/store";
import { Cliente, FaturaLinha, TipoDocumento } from "@/lib/types";
import { Passo1Cliente } from "./components/passo-1-cliente";
import { Passo2Linhas } from "./components/passo-2-linhas";
import { Passo3Emitir } from "./components/passo-3-emitir";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMoedaAOA, formatData } from "@/lib/formatters";
import { DIAS_VENCIMENTO_DEFAULT } from "@/lib/constants";
import { addDays } from "date-fns";

const passos = [
  { id: "passo1", numero: 1, rotulo: "Cliente" },
  { id: "passo2", numero: 2, rotulo: "Artigos" },
  { id: "passo3", numero: 3, rotulo: "Emitir" },
];

export default function NovaFaturaPage() {
  const store = useAppStore();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState("passo1");

  // Estado da fatura
  const [tipoDocumento, setTipoDocumento] = useState<TipoDocumento>("Fatura");
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);
  const [linhas, setLinhas] = useState<FaturaLinha[]>([]);
  const [documentoReferenciado, setDocumentoReferenciado] = useState<string>("");
  const [motivo, setMotivo] = useState<string>("");
  const [dataVencimento, setDataVencimento] = useState<Date>(() =>
    addDays(new Date(), DIAS_VENCIMENTO_DEFAULT)
  );

  useEffect(() => {
    setMounted(true);
    store.loadAll();
  }, []);

  if (!mounted) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 animate-pulse">Carregando...</div>
    );
  }

  const canGoPasso2 = tipoDocumento === "Simplificada" || clienteSelecionado !== null;
  const canGoPasso3 = canGoPasso2 && linhas.length > 0;

  // Passo atual (para o indicador de progresso)
  const progressoAtual =
    activeTab === "passo1" ? 1 : activeTab === "passo2" ? 2 : 3;

  // Calcular totais
  const subtotal = linhas.reduce((sum, linha) => sum + linha.total, 0);
  const totalIVA = linhas.reduce((sum, linha) => {
    const baseIVA = linha.quantidade * linha.preco;
    return sum + (baseIVA * linha.taxaIVA) / 100;
  }, 0);
  const total = subtotal + totalIVA;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Nova {tipoDocumento}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Preencha os dados abaixo para emitir{" "}
          {tipoDocumento === "Orcamento" ? "um orçamento" : "uma " + tipoDocumento.toLowerCase()}
        </p>
      </div>

      {/* Layout: Conteúdo (main) + Resumo Sticky (aside) */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_290px] gap-5 items-start">

        {/* Coluna principal — wizard shell */}
        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-md overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">

            {/* Stepper horizontal — estilo V4 */}
            <div className="px-6 pt-5 pb-0">
              <div className="flex items-center gap-5 mb-5">
                {passos.map((passo, idx) => {
                  const ativo = progressoAtual === passo.numero;
                  const concluido = passo.numero < progressoAtual;
                  const podeIr =
                    passo.numero === 1 ? true : passo.numero === 2 ? canGoPasso2 : canGoPasso3;
                  return (
                    <div key={passo.id} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => podeIr && setActiveTab(passo.id)}
                        disabled={!podeIr}
                        className={cn(
                          "flex items-center gap-2 text-[12px] font-bold transition-colors disabled:cursor-not-allowed",
                          ativo
                            ? "text-blue-600 dark:text-blue-400"
                            : concluido
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-slate-400 dark:text-slate-600"
                        )}
                      >
                        <span
                          className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-all",
                            ativo
                              ? "bg-blue-600 text-white shadow-[0_0_0_4px_rgba(37,99,235,.15)]"
                              : concluido
                              ? "bg-emerald-500 text-white"
                              : "bg-slate-200 dark:bg-slate-800 text-slate-500"
                          )}
                        >
                          {concluido ? <Check size={11} /> : passo.numero}
                        </span>
                        {passo.rotulo}
                      </button>
                      {/* Conector entre steps */}
                      {idx < passos.length - 1 && (
                        <div
                          className={cn(
                            "w-10 h-[3px] rounded-full transition-colors",
                            concluido
                              ? "bg-emerald-400"
                              : "bg-slate-200 dark:bg-slate-700"
                          )}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="border-t border-slate-100 dark:border-slate-800" />
            </div>

            <TabsList className="sr-only">
              <TabsTrigger value="passo1">1. Cliente</TabsTrigger>
              <TabsTrigger value="passo2" disabled={!canGoPasso2}>
                2. Artigos
              </TabsTrigger>
              <TabsTrigger value="passo3" disabled={!canGoPasso3}>
                3. Emitir
              </TabsTrigger>
            </TabsList>

            {/* Passo 1: Cliente */}
            <TabsContent value="passo1" className="mt-0 p-6">
              <Passo1Cliente
                clienteSelecionado={clienteSelecionado}
                onSelectCliente={setClienteSelecionado}
                tipoDocumento={tipoDocumento}
                setTipoDocumento={setTipoDocumento}
                documentoReferenciado={documentoReferenciado}
                setDocumentoReferenciado={setDocumentoReferenciado}
                onImportLinhas={setLinhas}
                motivo={motivo}
                setMotivo={setMotivo}
                onNext={() => setActiveTab("passo2")}
              />
            </TabsContent>

            {/* Passo 2: Artigos */}
            <TabsContent value="passo2" className="mt-0 p-6">
              <Passo2Linhas
                linhas={linhas}
                onUpdateLinhas={setLinhas}
                clienteSelecionado={clienteSelecionado}
                tipoDocumento={tipoDocumento}
                documentoReferenciado={documentoReferenciado}
                onBack={() => setActiveTab("passo1")}
                onNext={() => setActiveTab("passo3")}
              />
            </TabsContent>

            {/* Passo 3: Emitir */}
            <TabsContent value="passo3" className="mt-0 p-6">
              <Passo3Emitir
                clienteSelecionado={clienteSelecionado}
                linhas={linhas}
                subtotal={subtotal}
                totalIVA={totalIVA}
                total={total}
                tipoDocumento={tipoDocumento}
                dataVencimento={dataVencimento}
                onChangeDataVencimento={setDataVencimento}
                onBack={() => setActiveTab("passo2")}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Painel Resumo Sticky — estilo V4 */}
        <aside className="lg:sticky lg:top-[90px] border border-slate-200 dark:border-slate-800 rounded-[14px] p-[18px] bg-white dark:bg-slate-950 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-[.05em] text-slate-400">
            Resumo
          </p>
          <p className="text-sm font-bold mt-1.5 text-slate-900 dark:text-white truncate">
            {clienteSelecionado?.nome || (tipoDocumento === "Simplificada" ? "Consumidor Final" : "Nenhum cliente selecionado")}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {clienteSelecionado
              ? `${tipoDocumento} · NIF ${clienteSelecionado.nif}`
              : tipoDocumento === "Simplificada"
              ? "Fatura Simplificada (sem NIF)"
              : "Selecione um cliente no passo 1."}
          </p>

          <div className="mt-3.5 space-y-1">
            <div className="flex justify-between text-[13px] text-slate-500 dark:text-slate-400 py-1">
              <span>Subtotal</span>
              <span className="font-mono">{formatMoedaAOA(subtotal)}</span>
            </div>
            <div className="flex justify-between text-[13px] text-slate-500 dark:text-slate-400 py-1">
              <span>IVA</span>
              <span className="font-mono">{formatMoedaAOA(totalIVA)}</span>
            </div>
          </div>

          {/* Caixa total escura */}
          <div className="bg-slate-900 dark:bg-slate-800 rounded-xl px-4 py-3 mt-3.5">
            <div className="flex justify-between text-white">
              <span className="text-[13px] font-semibold">TOTAL</span>
              <span className="font-mono text-[13px] text-slate-200">{formatMoedaAOA(total)}</span>
            </div>
            <p className="text-[12px] text-blue-300/80 mt-0.5">
              {linhas.length} {linhas.length === 1 ? "item" : "itens"} · vence{" "}
              {formatData(dataVencimento)}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
