"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppStore } from "@/lib/store";
import { Cliente, TipoDocumento } from "@/lib/types";
import { Plus, UserCheck, ArrowRight, UserPlus, Info, FileSpreadsheet, ReceiptText } from "lucide-react";
import { ClienteFormModal } from "@/app/clientes/components/cliente-form-modal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface Passo1ClienteProps {
  clienteSelecionado: Cliente | null;
  onSelectCliente: (cliente: Cliente | null) => void;
  tipoDocumento: TipoDocumento;
  setTipoDocumento: (tipo: TipoDocumento) => void;
  documentoReferenciado?: string;
  setDocumentoReferenciado?: (ref: string) => void;
  onImportLinhas?: (linhas: any[]) => void;
  motivo?: string;
  setMotivo?: (motivo: string) => void;
  onNext: () => void;
}

const TIPOS_OPCOES: { value: TipoDocumento; label: string; desc: string; color: string }[] = [
  {
    value: "Fatura",
    label: "Factura",
    color: "blue",
    desc: "Documento comercial que formaliza e comprova a transmissão onerosa de bens ou prestação de serviços, com valor a ser liquidado no vencimento (Art. 3º f — DP 71/25).",
  },
  {
    value: "FaturaRecibo",
    label: "Factura-Recibo",
    color: "emerald",
    desc: "Documento 2-em-1 (Factura + Recibo). Prova a venda e a liquidação no mesmo instante (Pronto-pagamento) (Art. 3º k — DP 71/25).",
  },
  {
    value: "Simplificada",
    label: "Talão de Venda ou Prestação de Serviço",
    color: "amber",
    desc: "Documento que comprova a transmissão de bens e prestação de serviços, bem como o seu pagamento — comércio a retalho e balcão. Cliente é opcional (Art. 3º p — DP 71/25).",
  },
  {
    value: "NotaCredito",
    label: "Nota de Crédito",
    color: "rose",
    desc: "Documento comercial de anulação ou rectificação de factura emitida, sempre que a operação económica deixa de ter lugar ou o respectivo valor seja reduzido (Art. 3º l — DP 71/25).",
  },
  {
    value: "NotaDebito",
    label: "Nota de Débito",
    color: "orange",
    desc: "Documento comercial que suporta situações de débito quando haja obrigação de emissão de factura, no qual não deve haver liquidação de imposto (Art. 3º m — DP 71/25).",
  },
  {
    value: "Orcamento",
    label: "Factura pro-forma",
    color: "violet",
    desc: "Proposta comercial prévia, considerada factura para efeitos fiscais (Art. 4º, nº 9, alínea b — DP 71/25).",
  },
  {
    value: "GuiaRemessa",
    label: "Guia de Remessa ou Transporte",
    color: "slate",
    desc: "Documento considerado factura que acompanha a transmissão/transporte de mercadorias (Art. 4º, nº 9, alínea c — DP 71/25).",
  },
  {
    value: "AvisoCobrancaRecibo",
    label: "Aviso de Cobrança-Recibo",
    color: "cyan",
    desc: "Documento emitido por empresas seguradoras que formaliza e comprova os serviços prestados (Art. 3º d — DP 71/25).",
  },
  {
    value: "FaturaGenerica",
    label: "Factura Genérica",
    color: "teal",
    desc: "Factura única com periodicidade mensal, emitida por instituições financeiras, que compreende todos os serviços cobrados ao cliente nesse período (Art. 3º i — DP 71/25).",
  },
  {
    value: "FaturaGlobal",
    label: "Factura Global",
    color: "gray",
    desc: "Documento com periodicidade máxima mensal que engloba todas as transmissões de bens e prestações de serviços do período, suportado por documentos que as individualizam (Art. 3º j — DP 71/25).",
  },
  {
    value: "FaturaAdiantamento",
    label: "Factura Adiantamento",
    color: "indigo",
    desc: "Documento comercial que comprova financeiramente quaisquer adiantamentos ou antecipações de pagamento referentes a uma operação futura de transmissão de bens ou prestação de serviços (Art. 3º g — DP 71/25).",
  },
  {
    value: "Recibo",
    label: "Recibo",
    color: "emerald",
    desc: "Documento comercial que comprova o pagamento parcial ou total do bem ou serviço facturado. Emitido sempre que haja pagamento de uma factura (Art. 3º o e Art. 6º — DP 71/25).",
  },
];

/** Tipos em que o cliente é OBRIGATÓRIO */
const CLIENTE_OBRIGATORIO: TipoDocumento[] = [
  "Fatura",
  "FaturaRecibo",
  "NotaCredito",
  "NotaDebito",
  "Orcamento",
  "GuiaRemessa",
  "AvisoCobrancaRecibo",
  "FaturaGenerica",
  "FaturaGlobal",
  "FaturaAdiantamento",
  "Recibo",
];

const RETIFICACAO: TipoDocumento[] = ["NotaCredito", "NotaDebito"];

/** Tipos que exigem referência a uma fatura de origem (retificações e recibos) */
const REFERENCIA_FATURA: TipoDocumento[] = ["NotaCredito", "NotaDebito", "Recibo"];

const CHIP_ACTIVE: Record<string, string> = {
  blue: "bg-blue-600 border-blue-600 text-white shadow-sm shadow-blue-200 dark:shadow-blue-900/40",
  emerald: "bg-emerald-600 border-emerald-600 text-white shadow-sm shadow-emerald-200 dark:shadow-emerald-900/40",
  amber: "bg-amber-500 border-amber-500 text-white shadow-sm shadow-amber-200 dark:shadow-amber-900/40",
  rose: "bg-rose-600 border-rose-600 text-white shadow-sm shadow-rose-200 dark:shadow-rose-900/40",
  orange: "bg-orange-500 border-orange-500 text-white shadow-sm shadow-orange-200 dark:shadow-orange-900/40",
  violet: "bg-violet-600 border-violet-600 text-white shadow-sm shadow-violet-200 dark:shadow-violet-900/40",
  slate: "bg-slate-600 border-slate-600 text-white shadow-sm shadow-slate-200 dark:shadow-slate-900/40",
  cyan: "bg-cyan-600 border-cyan-600 text-white shadow-sm shadow-cyan-200 dark:shadow-cyan-900/40",
  teal: "bg-teal-600 border-teal-600 text-white shadow-sm shadow-teal-200 dark:shadow-teal-900/40",
  gray: "bg-gray-600 border-gray-600 text-white shadow-sm shadow-gray-200 dark:shadow-gray-900/40",
  indigo: "bg-indigo-600 border-indigo-600 text-white shadow-sm shadow-indigo-200 dark:shadow-indigo-900/40",
};

const CALLOUT_BG: Record<string, string> = {
  blue: "bg-blue-50/70 dark:bg-blue-950/30 border-blue-100 dark:border-blue-900 text-blue-950 dark:text-blue-200",
  emerald: "bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900 text-emerald-950 dark:text-emerald-200",
  amber: "bg-amber-50/70 dark:bg-amber-950/30 border-amber-100 dark:border-amber-900 text-amber-950 dark:text-amber-200",
  rose: "bg-rose-50/70 dark:bg-rose-950/30 border-rose-100 dark:border-rose-900 text-rose-950 dark:text-rose-200",
  orange: "bg-orange-50/70 dark:bg-orange-950/30 border-orange-100 dark:border-orange-900 text-orange-950 dark:text-orange-200",
  violet: "bg-violet-50/70 dark:bg-violet-950/30 border-violet-100 dark:border-violet-900 text-violet-950 dark:text-violet-200",
  slate: "bg-slate-50/70 dark:bg-slate-800/30 border-slate-100 dark:border-slate-700 text-slate-700 dark:text-slate-300",
  cyan: "bg-cyan-50/70 dark:bg-cyan-950/30 border-cyan-100 dark:border-cyan-900 text-cyan-950 dark:text-cyan-200",
  teal: "bg-teal-50/70 dark:bg-teal-950/30 border-teal-100 dark:border-teal-900 text-teal-950 dark:text-teal-200",
  gray: "bg-gray-50/70 dark:bg-gray-800/30 border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-300",
  indigo: "bg-indigo-50/70 dark:bg-indigo-950/30 border-indigo-100 dark:border-indigo-900 text-indigo-950 dark:text-indigo-200",
};

const ICON_COLOR: Record<string, string> = {
  blue: "text-blue-600 dark:text-blue-400",
  emerald: "text-emerald-600 dark:text-emerald-400",
  amber: "text-amber-500 dark:text-amber-400",
  rose: "text-rose-600 dark:text-rose-400",
  orange: "text-orange-500 dark:text-orange-400",
  violet: "text-violet-600 dark:text-violet-400",
  slate: "text-slate-600 dark:text-slate-400",
  cyan: "text-cyan-600 dark:text-cyan-400",
  teal: "text-teal-600 dark:text-teal-400",
  gray: "text-gray-600 dark:text-gray-400",
  indigo: "text-indigo-600 dark:text-indigo-400",
};

export function Passo1Cliente({
  clienteSelecionado,
  onSelectCliente,
  tipoDocumento,
  setTipoDocumento,
  documentoReferenciado = "",
  setDocumentoReferenciado,
  onImportLinhas,
  motivo = "",
  setMotivo,
  onNext,
}: Passo1ClienteProps) {
  const store = useAppStore();
  const [showModal, setShowModal] = useState(false);
  const [clientesDisponiveis] = useState(store.clientes);

  const handleSelectClienteId = (id: string | null) => {
    if (!id || id === "__none__") {
      onSelectCliente(null);
      return;
    }
    const cliente = clientesDisponiveis.find((c) => c.id === id);
    if (cliente) onSelectCliente(cliente);
  };

  const handleSelectDocumentoOrigem = (refVal: string | null) => {
    if (!refVal) return;
    setDocumentoReferenciado && setDocumentoReferenciado(refVal);

    // Buscar documento original para auto-preenchimento inteligente
    const docOrigem = store.documentos.find(
      (d) => (d.numeroCompleto || d.numero || d.id) === refVal
    );

    if (docOrigem) {
      // 1. Auto-selecionar o cliente da fatura original
      if (docOrigem.clienteId) {
        const cli = store.clientes.find((c) => c.id === docOrigem.clienteId);
        if (cli) onSelectCliente(cli);
      }

      // 2. Importar as linhas da fatura original para alteração no Passo 2
      if (docOrigem.linhas && docOrigem.linhas.length > 0 && onImportLinhas) {
        const linhasCopiadas = docOrigem.linhas.map((l) => ({
          ...l,
          id: `linha-retif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        }));
        onImportLinhas(linhasCopiadas);
      }
    }
  };

  const tipoAtualInfo = TIPOS_OPCOES.find((t) => t.value === tipoDocumento);
  const isRetificacao = RETIFICACAO.includes(tipoDocumento);
  const isRecibo = tipoDocumento === "Recibo";
  const precisaReferencia = REFERENCIA_FATURA.includes(tipoDocumento);
  const clienteObrigatorio = CLIENTE_OBRIGATORIO.includes(tipoDocumento);
  const isSimplificada = tipoDocumento === "Simplificada";

  const canGoNext = clienteObrigatorio
    ? clienteSelecionado !== null && (!precisaReferencia || !!documentoReferenciado)
    : !precisaReferencia || !!documentoReferenciado;

  const cor = tipoAtualInfo?.color ?? "blue";

  return (
    <div className="space-y-5">
      {/* Título do passo */}
      <div>
        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          1 · Tipo de documento e cliente
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Selecione o tipo de documento a emitir e o cliente correspondente.
        </p>
      </div>

      {/* Tipo de Documento — botões chip/tab */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
          Que tipo de documento quer emitir?
        </label>
        <div className="flex flex-wrap gap-2 mb-3">
          {TIPOS_OPCOES.map((opcao) => {
            const ativo = tipoDocumento === opcao.value;
            return (
              <button
                key={opcao.value}
                type="button"
                onClick={() => setTipoDocumento(opcao.value)}
                className={cn(
                  "px-3.5 py-2 rounded-xl border text-xs font-semibold transition-all duration-150 select-none",
                  ativo
                    ? CHIP_ACTIVE[opcao.color]
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-400 hover:text-slate-800 dark:hover:border-slate-500 dark:hover:text-slate-200"
                )}
              >
                {opcao.label}
              </button>
            );
          })}
        </div>

        {/* Callout descritivo */}
        {tipoAtualInfo && (
          <div className={cn("flex items-start gap-2.5 p-3 rounded-xl border text-xs", CALLOUT_BG[cor])}>
            <Info className={cn("w-4 h-4 shrink-0 mt-0.5", ICON_COLOR[cor])} />
            <p className="leading-relaxed">
              <strong>{tipoAtualInfo.label}:</strong> {tipoAtualInfo.desc}
            </p>
          </div>
        )}
      </div>

      {/* Referência a fatura (Nota de Crédito / Nota de Débito / Recibo) */}
      {(isRetificacao || isRecibo) && (
        <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20 space-y-3">
          <div className="flex items-center gap-2 text-amber-900 dark:text-amber-300 font-bold text-xs">
            <FileSpreadsheet className="w-4 h-4" />
            {isRecibo ? "Dados do Recibo — AGT" : "Dados Obrigatórios de Retificação AGT"}
          </div>

          <div className={`grid grid-cols-1 gap-3 ${isRetificacao ? "sm:grid-cols-2" : ""}`}>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isRecibo ? "Fatura a liquidar (Nº da Fatura)" : "Fatura de Origem (Nº da Fatura)"}{" "}
                <span className="text-red-500">*</span>
              </label>
              <Select
                value={documentoReferenciado ?? undefined}
                onValueChange={handleSelectDocumentoOrigem}
              >
                <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 h-10 text-xs">
                  <SelectValue placeholder={isRecibo ? "Selecione a fatura a liquidar..." : "Selecione a fatura a retificar..."} />
                </SelectTrigger>
                <SelectContent sideOffset={4}>
                  {store.documentos
                    .filter((doc) => (isRecibo ? doc.tipo === "Fatura" || doc.tipo === "FaturaRecibo" : true))
                    .map((doc) => (
                      <SelectItem key={doc.id} value={doc.numeroCompleto || doc.numero || doc.id}>
                        <span className="font-mono font-bold text-slate-900 dark:text-white mr-2">
                          {doc.numeroCompleto || doc.numero}
                        </span>
                        ({doc.total ? `${doc.total} Kz` : ""})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {isRetificacao && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Motivo da Retificação <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  placeholder={
                    tipoDocumento === "NotaCredito"
                      ? "ex: Devolução de mercadoria / Erro de cálculo"
                      : "ex: Juros de mora / Frete adicional"
                  }
                  value={motivo}
                  onChange={(e) => setMotivo && setMotivo(e.target.value)}
                  className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 h-10 text-xs"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Seleção de Cliente */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
          {isSimplificada ? (
            <>Qual o cliente? <span className="text-slate-400 font-normal">(opcional)</span></>
          ) : (
            <>Qual o cliente? <span className="text-red-500">*</span></>
          )}
        </label>

        {isSimplificada && (
          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-xs text-amber-800 dark:text-amber-300 mb-3">
            <ReceiptText className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>Para o Talão de Venda ou Prestação de Serviço, o NIF do cliente é facultativo. Pode prosseguir diretamente para os artigos sem identificar o cliente.</span>
          </div>
        )}

        {clientesDisponiveis.length === 0 ? (
          <div className="text-center py-10 bg-slate-50 dark:bg-slate-800/50 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700">
            <UserPlus className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            <p className="text-slate-600 dark:text-slate-300 font-medium text-sm">
              Ainda não tem clientes registados
            </p>
            <p className="text-slate-400 text-xs mt-1 mb-5">
              Adicione o primeiro cliente para começar a faturar.
            </p>
            <Button
              onClick={() => setShowModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Cliente Manualmente
            </Button>
          </div>
        ) : (
          <div className="space-y-2.5">
            <Select
              value={clienteSelecionado?.id ?? ""}
              onValueChange={handleSelectClienteId}
            >
              <SelectTrigger className="w-full bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 h-11 text-sm">
                <SelectValue placeholder={isSimplificada ? "Consumidor Final (sem identificação)..." : "Escolha um cliente da lista..."}>
                  {clienteSelecionado?.nome}
                </SelectValue>
              </SelectTrigger>
              <SelectContent
                className="w-[var(--radix-select-trigger-width)] min-w-[420px]"
                sideOffset={4}
              >
                {isSimplificada && (
                  <SelectItem value="__none__" className="py-2.5">
                    <span className="text-sm italic text-slate-400 dark:text-slate-500">
                      Consumidor Final (sem NIF)
                    </span>
                  </SelectItem>
                )}
                {clientesDisponiveis.map((cliente) => (
                  <SelectItem key={cliente.id} value={cliente.id} className="py-2.5">
                    <div className="flex flex-col">
                      <span className="font-semibold text-sm text-slate-900 dark:text-white">
                        {cliente.nome}
                      </span>
                      <span className="text-xs text-slate-400 mt-0.5">
                        NIF: <span className="font-mono">{cliente.nif}</span>
                        {cliente.telefone && ` · ${cliente.telefone}`}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <button
              onClick={() => setShowModal(true)}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:border-blue-500 hover:text-blue-600 dark:hover:border-blue-400 dark:hover:text-blue-400 hover:bg-blue-50/30 dark:hover:bg-blue-950/20 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Não encontrou? Adicionar cliente manualmente
            </button>
          </div>
        )}
      </div>

      {/* Card de confirmação do cliente selecionado */}
      {clienteSelecionado && (
        <div className="border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl p-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-start gap-3">
            <div className="p-1.5 bg-emerald-500 text-white rounded-lg shrink-0 mt-0.5">
              <UserCheck className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                Cliente Confirmado
              </p>
              <p className="text-sm font-bold text-emerald-950 dark:text-emerald-100 mt-0.5 truncate">
                {clienteSelecionado.nome}
              </p>
              <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
                NIF: <span className="font-mono font-semibold">{clienteSelecionado.nif}</span>
                {clienteSelecionado.telefone && ` · ${clienteSelecionado.telefone}`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navegação */}
      <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-slate-800">
        <p className="text-xs text-slate-400">
          {isSimplificada
            ? clienteSelecionado
              ? "Cliente identificado. Continue para os artigos."
              : "Pode continuar sem identificar o cliente."
            : clienteSelecionado
            ? "Tudo pronto. Continue para os artigos."
            : "Selecione um cliente para continuar."}
        </p>
        <Button
          onClick={onNext}
          disabled={!canGoNext}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 text-sm"
        >
          Próximo: Artigos e Serviços
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>

      {/* Modal de Criação de Cliente */}
      {showModal && (
        <ClienteFormModal
          onClose={() => setShowModal(false)}
          onSave={() => {
            setShowModal(false);
            const lastCliente = store.clientes[store.clientes.length - 1];
            if (lastCliente) {
              onSelectCliente(lastCliente);
            }
          }}
        />
      )}
    </div>
  );
}
