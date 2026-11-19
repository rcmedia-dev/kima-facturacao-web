"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store";
import { Cliente, FaturaLinha, TipoDocumento, Documento } from "@/lib/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { formatMoedaAOA, formatData } from "@/lib/formatters";
import { FORMAS_PAGAMENTO, DIAS_VENCIMENTO_DEFAULT, LABELS_DOCUMENTO } from "@/lib/constants";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2,
  Send,
  Loader2,
  PencilLine,
  XCircle,
} from "lucide-react";

interface Passo3EmitirProps {
  clienteSelecionado: Cliente | null;
  linhas: FaturaLinha[];
  subtotal: number;
  totalIVA: number;
  total: number;
  tipoDocumento: TipoDocumento;
  dataVencimento: Date;
  onChangeDataVencimento: (data: Date) => void;
  documentoReferenciado?: string;
  motivo?: string;
  onBack: () => void;
}

const ROTULO_DOCUMENTO = LABELS_DOCUMENTO;

export function Passo3Emitir({
  clienteSelecionado,
  linhas,
  subtotal,
  totalIVA,
  total,
  tipoDocumento,
  dataVencimento,
  onChangeDataVencimento,
  documentoReferenciado = "",
  motivo = "",
  onBack,
}: Passo3EmitirProps) {
  const store = useAppStore();
  const router = useRouter();
  const [formaPagamento, setFormaPagamento] = useState<string>("Transferência");
  const [observacoes, setObservacoes] = useState<string>("");
  const [motivoIsencaoIVA, setMotivoIsencaoIVA] = useState<string>("");
  const [dataOperacao, setDataOperacao] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [loading, setLoading] = useState(false);
  const [faturaCriada, setFaturaCriada] = useState<boolean>(false);

  const [erroEmissao, setErroEmissao] = useState<string | null>(null);

  const rotulo = ROTULO_DOCUMENTO[tipoDocumento] || tipoDocumento;

  const TIPOS_QUE_EXIGEM_REFERENCIA = ["NotaCredito", "NotaDebito", "Recibo"];

  const handleEmitir = async () => {
    if (!clienteSelecionado || linhas.length === 0) return;

    // Validação frontend: Recibo / Nota de Crédito / Nota de Débito exigem fatura de referência
    if (TIPOS_QUE_EXIGEM_REFERENCIA.includes(tipoDocumento) && !documentoReferenciado) {
      setErroEmissao(
        `${rotulo} requer a indicação da fatura de origem. Volte ao Passo 1 e selecione a fatura a referenciar.`
      );
      return;
    }

    setLoading(true);
    setErroEmissao(null);

    try {
      // 1. Salvar no Backend via POST /api/invoices
      const response = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: tipoDocumento,
          clienteId: clienteSelecionado?.id,
          linhas: linhas.map((l) => {
            const iva = Number(l.taxaIVA);
            const taxaIVAStr = ([0, 7, 14].includes(iva) ? String(iva) : "0") as "0" | "7" | "14";
            return {
              artigoId: l.artigoId,
              quantidade: l.quantidade,
              descricao: l.descricao,
              preco: l.preco,
              taxaIVA: taxaIVAStr,
            };
          }),
          formaPagamento,
          observacoes,
          motivoIsencaoIVA,
          dataOperacao,
          documentoReferenciado: documentoReferenciado || undefined,
          motivo: motivo || undefined,
        }),
      });

      const resData = await response.json().catch(() => null);

      if (!response.ok || !resData?.success || !resData?.data) {
        const msg = resData?.error || "Erro ao emitir documento no servidor.";
        setErroEmissao(msg);
        return;
      }

      const apiData: Documento = resData.data;

      // 2. Atualizar o Zustand store
      store.addFatura(apiData);

      setFaturaCriada(true);

      setTimeout(() => {
        router.push(`/faturas/${apiData.id}`);
      }, 1000);
    } catch (err: unknown) {
      setErroEmissao(err instanceof Error ? err.message : "Ocorreu um erro inesperado.");
    } finally {
      setLoading(false);
    }
  };

  // Estado de sucesso
  if (faturaCriada) {
    return (
      <div className="space-y-4 text-center py-12 animate-in fade-in zoom-in-95 duration-300">
        <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-sm">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
          {rotulo} Emitido com Sucesso!
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          O documento foi gravado. A redirecionar...
        </p>
        <div className="flex justify-center pt-2">
          <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
        </div>
      </div>
    );
  }

  const temVencimento = tipoDocumento === "Fatura" || tipoDocumento === "Orcamento";
  const temPagamentoDireto = tipoDocumento === "FaturaRecibo" || tipoDocumento === "Recibo";
  const semIVA = totalIVA === 0 && linhas.length > 0;

  return (
    <div className="space-y-5">
      {erroEmissao && (
        <div className="p-4 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 flex items-start gap-3 animate-fade-in text-xs font-medium">
          <span className="font-bold shrink-0">Erro de Validação AGT / Backend:</span>
          <span>{erroEmissao}</span>
        </div>
      )}

      {/* Título do passo */}
      <div>
        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          3 · Rever e emitir
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Confirme os dados abaixo e emita {rotulo.toLowerCase()}.
        </p>
      </div>

      {/* Preview do documento */}
      <div className="overflow-hidden rounded-[14px] border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        {/* Cabeçalho do documento */}
        <div className="flex items-start justify-between border-b border-slate-200 bg-slate-50 p-4 sm:p-5 dark:border-slate-700 dark:bg-slate-800/50">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {rotulo}
            </p>
            <h3 className="mt-0.5 text-base font-bold text-slate-900 dark:text-white">
              {store.empresa?.nomeEmpresa || "Empresa Demonstrativa"}
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              NIF: {store.empresa?.nif || "5417082910"}
            </p>
          </div>
          <Badge
            variant="outline"
            className="border-emerald-300 bg-white text-xs text-emerald-700 dark:border-emerald-700 dark:bg-slate-900 dark:text-emerald-400"
          >
            Pré-visualização
          </Badge>
        </div>

        <div className="space-y-4 p-4 sm:p-5">
          {/* Dados do cliente e vencimento/pagamento */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Faturado a
              </p>
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                {clienteSelecionado?.nome || "Consumidor Final"}
              </p>
              <p className="text-xs text-slate-500">
                NIF: <span className="font-mono font-semibold">{clienteSelecionado?.nif || "Consumidor Final"}</span>
              </p>
            </div>
            <div>
              {temVencimento ? (
                <>
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Vencimento
                  </p>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {formatData(dataVencimento)}
                  </p>
                  <p className="text-xs text-slate-500">{DIAS_VENCIMENTO_DEFAULT} dias</p>
                </>
              ) : temPagamentoDireto ? (
                <>
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    Termos de Pagamento
                  </p>
                  <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                    Pronto-Pagamento
                  </p>
                  <p className="text-xs text-slate-500">{formaPagamento}</p>
                </>
              ) : (
                <>
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Data Emissão
                  </p>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {formatData(new Date())}
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Itens */}
          <div className="hidden overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 md:block">
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
                <TableRow>
                  <TableHead className="text-xs font-semibold">Descrição</TableHead>
                  <TableHead className="text-center text-xs font-semibold">Qtd</TableHead>
                  <TableHead className="text-right text-xs font-semibold">Preço Unit.</TableHead>
                  <TableHead className="text-center text-xs font-semibold">IVA</TableHead>
                  <TableHead className="text-right text-xs font-semibold">Total c/ IVA</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linhas.map((linha) => {
                  const totalLinhaComIVA = linha.total + (linha.total * linha.taxaIVA) / 100;
                  return (
                    <TableRow key={linha.id}>
                      <TableCell className="text-xs font-medium text-slate-900 dark:text-white">
                        {linha.descricao}
                      </TableCell>
                      <TableCell className="text-center text-xs font-mono">{linha.quantidade}</TableCell>
                      <TableCell className="text-right text-xs font-mono">{formatMoedaAOA(linha.preco)}</TableCell>
                      <TableCell className="text-center text-xs font-mono">{linha.taxaIVA}%</TableCell>
                      <TableCell className="text-right text-xs font-bold font-mono">
                        {formatMoedaAOA(totalLinhaComIVA)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="space-y-3 md:hidden">
            {linhas.map((linha) => {
              const totalLinhaComIVA = linha.total + (linha.total * linha.taxaIVA) / 100;
              return (
                <div key={linha.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/40">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{linha.descricao}</p>
                      <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                        <span>Qtd: {linha.quantidade}</span>
                        <span>·</span>
                        <span>{formatMoedaAOA(linha.preco)} / uni</span>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-slate-900 dark:text-white">{formatMoedaAOA(totalLinhaComIVA)}</span>
                  </div>

                  <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2 text-[11px] dark:border-slate-700">
                    <span className="text-slate-500 dark:text-slate-400">IVA</span>
                    <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">{linha.taxaIVA}%</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Totais */}
          <div className="flex justify-end">
            <div className="w-full space-y-1 text-sm sm:w-64">
              <div className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>Subtotal Imponível:</span>
                <span className="font-mono">{formatMoedaAOA(subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>Total IVA:</span>
                <span className="font-mono">{formatMoedaAOA(totalIVA)}</span>
              </div>
              <div className="mt-1 flex justify-between border-t border-slate-200 pt-2 text-base font-bold text-slate-900 dark:border-slate-700 dark:text-white">
                <span>TOTAL A PAGAR:</span>
                <span className="font-mono text-blue-600 dark:text-blue-400">
                  {formatMoedaAOA(total)}
                </span>
              </div>
            </div>
          </div>

          {/* Observações (se preenchidas) */}
          {observacoes && (
            <div className="border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <span className="font-semibold text-slate-600 dark:text-slate-300">Observações: </span>
              {observacoes}
            </div>
          )}
        </div>
      </div>

      {/* Condições de Pagamento e Observações */}
      <div className="space-y-4 rounded-[14px] border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:p-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {temPagamentoDireto || tipoDocumento === "Fatura" ? (
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Forma de pagamento <span className="text-red-500">*</span>
              </label>
              <Select
                value={formaPagamento}
                onValueChange={(v) => setFormaPagamento(v ?? "Transferência")}
              >
                <SelectTrigger className="h-10 border-slate-300 bg-white text-sm dark:border-slate-700 dark:bg-slate-950">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FORMAS_PAGAMENTO.map((forma) => (
                    <SelectItem key={forma} value={forma}>
                      {forma}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {temVencimento ? (
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Data de Vencimento
              </label>
              <Input
                type="date"
                value={format(dataVencimento, "yyyy-MM-dd")}
                onChange={(e) => {
                  if (e.target.value) {
                    const [y, m, d] = e.target.value.split("-").map(Number);
                    onChangeDataVencimento(new Date(y, m - 1, d));
                  }
                }}
                className="h-10 border-slate-300 bg-white text-xs font-medium text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                {formatData(dataVencimento)}
              </p>
            </div>
          ) : null}
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Observações / Notas no Documento{" "}
            <span className="font-normal text-slate-400">(opcional)</span>
          </label>
          <Textarea
            placeholder="Adicione observações ou instruções bancárias adicionais para o cliente..."
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            className="h-20 border-slate-300 text-xs dark:border-slate-700"
          />
        </div>

        {/* Data da Operação (Art. 8º — DP 71/25) */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Data da Operação{" "}
            <span className="font-normal text-slate-400">(prazo de emissão: 5 dias úteis)</span>
          </label>
          <Input
            type="date"
            value={dataOperacao}
            max={format(new Date(), "yyyy-MM-dd")}
            onChange={(e) => setDataOperacao(e.target.value)}
            className="h-10 border-slate-300 bg-white text-xs font-medium text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          />
        </div>

        {/* Motivo da não liquidação do IVA (Art. 10º, alínea f — DP 71/25) */}
        {semIVA && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3.5 dark:border-amber-900/60 dark:bg-amber-950/20">
            <label className="mb-1 block text-xs font-semibold text-amber-900 dark:text-amber-300">
              Motivo da não liquidação do IVA <span className="text-red-500">*</span>
            </label>
            <p className="mb-2 text-[11px] text-amber-800 dark:text-amber-400">
              Este documento tem IVA não liquidado. Indique o motivo justificativo e a norma legal que o fundamenta
              (obrigatório por lei — Art. 10º, alínea f).
            </p>
            <Input
              placeholder="ex: Isento ao abrigo do Art. 19º do CIVA (exportação)"
              value={motivoIsencaoIVA}
              onChange={(e) => setMotivoIsencaoIVA(e.target.value)}
              className="h-10 border-slate-300 bg-white text-xs dark:border-slate-700 dark:bg-slate-950"
            />
          </div>
        )}
      </div>

      {/* Ações finais */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
        <div className="flex gap-2">
          <Button variant="outline" onClick={onBack} disabled={loading} className="text-sm">
            <PencilLine className="w-4 h-4 mr-2" />
            Editar Itens
          </Button>
          <Link href="/faturas">
            <Button
              variant="ghost"
              disabled={loading}
              className="text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
          </Link>
        </div>

        <Button
          onClick={handleEmitir}
          disabled={loading || !clienteSelecionado || linhas.length === 0}
          className="min-w-52 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Emitindo {rotulo}...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Emitir {rotulo} Agora
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
