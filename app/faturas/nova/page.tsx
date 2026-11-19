"use client";

import { Suspense, useState, useSyncExternalStore } from "react";
import { useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Cliente, FaturaLinha, TipoDocumento } from "@/lib/types";
import { Passo1Cliente } from "./components/passo-1-cliente";
import { Passo2Linhas } from "./components/passo-2-linhas";
import { Passo3Emitir } from "./components/passo-3-emitir";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMoedaAOA, formatData } from "@/lib/formatters";
import { DIAS_VENCIMENTO_DEFAULT, LABELS_DOCUMENTO } from "@/lib/constants";
import { addDays } from "date-fns";

const TIPOS_VALIDOS: TipoDocumento[] = [
  "Fatura",
  "FaturaRecibo",
  "NotaCredito",
  "NotaDebito",
  "Orcamento",
  "Recibo",
];

/** Tipos que obrigam a referência a uma fatura de origem (backend valida isto) */
const TIPOS_QUE_EXIGEM_REFERENCIA: TipoDocumento[] = ["NotaCredito", "NotaDebito", "Recibo"];

const passos = [
  { id: "passo1", numero: 1, rotulo: "Cliente" },
  { id: "passo2", numero: 2, rotulo: "Artigos" },
  { id: "passo3", numero: 3, rotulo: "Emitir" },
];

function NovaFaturaContent() {
  const searchParams = useSearchParams();
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  const [activeTab, setActiveTab] = useState("passo1");

  // Estado da fatura
  const [tipoDocumento, setTipoDocumento] = useState<TipoDocumento>(() => {
    const t = searchParams.get("tipo") as TipoDocumento | null;
    return t && TIPOS_VALIDOS.includes(t) ? t : "Fatura";
  });
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);
  const [linhas, setLinhas] = useState<FaturaLinha[]>([]);
  const [documentoReferenciado, setDocumentoReferenciado] = useState<string>("");
  const [motivo, setMotivo] = useState<string>("");
  const [dataVencimento, setDataVencimento] = useState<Date>(() =>
    addDays(new Date(), DIAS_VENCIMENTO_DEFAULT)
  );

  // loadAll() já é chamado pelo useStoreInit no layout

  if (!mounted) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 animate-pulse">Carregando...</div>
    );
  }

  const canGoPasso2 = clienteSelecionado !== null;
  const precisaReferencia = TIPOS_QUE_EXIGEM_REFERENCIA.includes(tipoDocumento);
  const canGoPasso3 = canGoPasso2 && linhas.length > 0 && (!precisaReferencia || !!documentoReferenciado);


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
    <div className="w-full px-0 py-0 md:max-w-5xl md:mx-auto md:px-4 md:py-8">
      {/* Header */}
      <div className="mb-4 px-4 pt-4 md:px-0 md:pt-0 md:mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Nova {LABELS_DOCUMENTO[tipoDocumento] || tipoDocumento}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Preencha os dados abaixo para emitir{" "}
          {(LABELS_DOCUMENTO[tipoDocumento] || tipoDocumento).toLowerCase()}
        </p>
      </div>

      {/* Layout: Conteúdo (main) + Resumo Sticky (aside) */}
      <div className="grid grid-cols-1 gap-4 md:gap-5 lg:grid-cols-[1fr_290px] lg:items-start">

        {/* Coluna principal — wizard shell */}
        <div className="w-full overflow-hidden border-0 bg-transparent shadow-none md:border md:rounded-2xl md:border-slate-200 md:bg-white md:dark:border-slate-800 md:dark:bg-slate-950 md:shadow-md">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">

            {/* Stepper horizontal — estilo V4 */}
            <div className="px-4 pt-3 pb-0 md:px-6 md:pt-5">
              <div className="mb-4 flex flex-wrap items-center gap-2 md:mb-5 md:gap-5">
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
                            "hidden h-[3px] w-8 rounded-full transition-colors md:block",
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
            <TabsContent value="passo1" className="mt-0 p-4 md:p-6">
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
            <TabsContent value="passo2" className="mt-0 p-4 md:p-6">
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
            <TabsContent value="passo3" className="mt-0 p-4 md:p-6">
              <Passo3Emitir
                clienteSelecionado={clienteSelecionado}
                linhas={linhas}
                subtotal={subtotal}
                totalIVA={totalIVA}
                total={total}
                tipoDocumento={tipoDocumento}
                dataVencimento={dataVencimento}
                onChangeDataVencimento={setDataVencimento}
                documentoReferenciado={documentoReferenciado}
                motivo={motivo}
                onBack={() => setActiveTab("passo2")}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Painel Resumo Sticky — estilo V4 */}
        <aside className="w-full border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 md:rounded-[14px] md:p-[18px] lg:sticky lg:top-[90px]">
          <p className="text-[11px] font-bold uppercase tracking-[.05em] text-slate-400">
            Resumo
          </p>
          <p className="mt-1.5 truncate text-sm font-bold text-slate-900 dark:text-white">
            {clienteSelecionado?.nome || "Nenhum cliente selecionado"}
          </p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {clienteSelecionado
              ? `${tipoDocumento} · NIF ${clienteSelecionado.nif}`
              : "Selecione um cliente no passo 1."}
          </p>

          <div className="mt-3.5 space-y-1">
            <div className="flex justify-between py-1 text-[13px] text-slate-500 dark:text-slate-400">
              <span>Subtotal</span>
              <span className="font-mono">{formatMoedaAOA(subtotal)}</span>
            </div>
            <div className="flex justify-between py-1 text-[13px] text-slate-500 dark:text-slate-400">
              <span>IVA</span>
              <span className="font-mono">{formatMoedaAOA(totalIVA)}</span>
            </div>
          </div>

          {/* Caixa total escura */}
          <div className="mt-3.5 rounded-xl bg-slate-900 px-4 py-3 dark:bg-slate-800">
            <div className="flex justify-between text-white">
              <span className="text-[13px] font-semibold">TOTAL</span>
              <span className="font-mono text-[13px] text-slate-200">{formatMoedaAOA(total)}</span>
            </div>
            <p className="mt-0.5 text-[12px] text-blue-300/80">
              {linhas.length} {linhas.length === 1 ? "item" : "itens"} · vence{" "}
              {formatData(dataVencimento)}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default function NovaFaturaPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-5xl mx-auto px-4 py-8 animate-pulse text-slate-500">
          Carregando...
        </div>
      }
    >
      <NovaFaturaContent />
    </Suspense>
  );
}
