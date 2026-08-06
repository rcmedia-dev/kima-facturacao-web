"use client";

import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { useAppStore } from "@/lib/store";
import { Cliente, FaturaLinha, TipoDocumento } from "@/lib/types";
import { Passo1Cliente } from "./components/passo-1-cliente";
import { Passo2Linhas } from "./components/passo-2-linhas";
import { Passo3Emitir } from "./components/passo-3-emitir";
import { FaturaLivePreview } from "./components/fatura-live-preview";

export default function NovaFaturaPage() {
  const store = useAppStore();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState("passo1");
  
  // Estado da fatura
  const [tipoDocumento, setTipoDocumento] = useState<TipoDocumento>("Fatura");
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);
  const [linhas, setLinhas] = useState<FaturaLinha[]>([]);

  useEffect(() => {
    setMounted(true);
    store.loadFromStorage();
  }, []);

  if (!mounted) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 animate-pulse">Carregando...</div>
    );
  }

  const canGoPasso2 = clienteSelecionado !== null;
  const canGoPasso3 = canGoPasso2 && linhas.length > 0;

  // Calcular totais
  const subtotal = linhas.reduce((sum, linha) => sum + linha.total, 0);
  const totalIVA = linhas.reduce((sum, linha) => {
    const baseIVA = linha.quantidade * linha.preco;
    return sum + (baseIVA * linha.taxaIVA) / 100;
  }, 0);
  const total = subtotal + totalIVA;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Nova {tipoDocumento}</h1>
        <p className="text-gray-600 mt-2">Preencha os dados abaixo para emitir {tipoDocumento === "Orcamento" ? "um orçamento" : "uma " + tipoDocumento.toLowerCase()}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Coluna Esquerda: Wizard de Emissão */}
        <div className="lg:col-span-7 xl:col-span-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="passo1">1. Cliente</TabsTrigger>
              <TabsTrigger value="passo2" disabled={!canGoPasso2}>
                2. Linhas
              </TabsTrigger>
              <TabsTrigger value="passo3" disabled={!canGoPasso3}>
                3. Emitir
              </TabsTrigger>
            </TabsList>

            <Card className="mt-6 p-6 shadow-md border-slate-200">
              {/* Passo 1: Cliente */}
              <TabsContent value="passo1" className="mt-0">
                <Passo1Cliente
                  clienteSelecionado={clienteSelecionado}
                  onSelectCliente={setClienteSelecionado}
                  tipoDocumento={tipoDocumento}
                  setTipoDocumento={setTipoDocumento}
                  onNext={() => setActiveTab("passo2")}
                />
              </TabsContent>

              {/* Passo 2: Linhas */}
              <TabsContent value="passo2" className="mt-0">
                <Passo2Linhas
                  linhas={linhas}
                  onUpdateLinhas={setLinhas}
                  clienteSelecionado={clienteSelecionado}
                  onBack={() => setActiveTab("passo1")}
                  onNext={() => setActiveTab("passo3")}
                />
              </TabsContent>

               {/* Passo 3: Emitir */}
               <TabsContent value="passo3" className="mt-0">
                 <Passo3Emitir
                   clienteSelecionado={clienteSelecionado}
                   linhas={linhas}
                   subtotal={subtotal}
                   totalIVA={totalIVA}
                   total={total}
                   tipoDocumento={tipoDocumento}
                   onBack={() => setActiveTab("passo2")}
                 />
               </TabsContent>
            </Card>
          </Tabs>
        </div>

        {/* Coluna Direita: Live Invoice Preview Flutuante */}
        <div className="lg:col-span-5 xl:col-span-4 sticky top-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Pré-visualização ao Vivo
              </span>
              <span className="text-[11px] text-slate-400 font-medium">Atualiza em tempo real</span>
            </div>
            <FaturaLivePreview
              tipoDocumento={tipoDocumento}
              clienteSelecionado={clienteSelecionado}
              linhas={linhas}
              subtotal={subtotal}
              totalIVA={totalIVA}
              total={total}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
