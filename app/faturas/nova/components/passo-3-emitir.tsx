"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store";
import { Cliente, FaturaLinha } from "@/lib/types";
import { Card } from "@/components/ui/card";
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
import { formatMoedaAOA, formatData } from "@/lib/formatters";
import { FORMAS_PAGAMENTO, DIAS_VENCIMENTO_DEFAULT } from "@/lib/constants";
import { addDays } from "date-fns";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, ArrowLeft, Send, Loader2, FileText } from "lucide-react";

import { TipoDocumento } from "@/lib/types";

interface Passo3EmitirProps {
  clienteSelecionado: Cliente | null;
  linhas: FaturaLinha[];
  subtotal: number;
  totalIVA: number;
  total: number;
  tipoDocumento: TipoDocumento;
  onBack: () => void;
}

export function Passo3Emitir({
  clienteSelecionado,
  linhas,
  subtotal,
  totalIVA,
  total,
  tipoDocumento,
  onBack,
}: Passo3EmitirProps) {
  const store = useAppStore();
  const router = useRouter();
  const [formaPagamento, setFormaPagamento] = useState<string>("Transferência");
  const [observacoes, setObservacoes] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [faturaCriada, setFaturaCriada] = useState<boolean>(false);

  const dataVencimento = addDays(new Date(), DIAS_VENCIMENTO_DEFAULT);

  const handleEmitir = async () => {
    if (!clienteSelecionado || linhas.length === 0) return;

    setLoading(true);
    try {
      // 1. Tentar salvar no Backend via POST /api/invoices
      let apiData: any = null;
      try {
        const response = await fetch("/api/invoices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tipo: tipoDocumento,
            clienteId: clienteSelecionado.id,
            linhas: linhas.map((l) => ({
              artigoId: l.artigoId,
              quantidade: l.quantidade,
              descricao: l.descricao,
              preco: l.preco,
              taxaIVA: String(l.taxaIVA) as "0" | "7" | "14",
            })),
            formaPagamento,
            observacoes,
          }),
        });

        if (response.ok) {
          const resData = await response.json();
          if (resData.data?.id) {
            apiData = resData.data;
          }
        }
      } catch (err) {
        console.warn("Servidor backend offline ou falhou, salvando no localStorage...", err);
      }

      // 2. Salvar no Zustand store local para disponibilidade instantânea e persistência em localStorage
      const proximoNumeroNum = store.documentos.length + 1;

      const faturaLocal = store.addFatura({
        id: apiData?.id,
        tipo: tipoDocumento,
        serie: apiData?.serie || "A",
        numero: apiData?.numero || String(proximoNumeroNum),
        numeroCompleto: apiData?.numeroCompleto,
        clienteId: clienteSelecionado.id,
        dataEmissao: apiData?.dataEmissao ? new Date(apiData.dataEmissao) : new Date(),
        dataVencimento: apiData?.dataVencimento ? new Date(apiData.dataVencimento) : dataVencimento,
        formaPagamento: formaPagamento as any,
        status: "Pendente",
        linhas,
        observacoes,
        subtotal,
        totalIVA,
        total,
      });

      const finalId = faturaLocal.id;

      setFaturaCriada(true);

      // Redirecionar para os detalhes da fatura
      setTimeout(() => {
        router.push(`/faturas/${finalId}`);
      }, 1200);
    } finally {
      setLoading(false);
    }
  };

  if (faturaCriada) {
    return (
      <div className="space-y-4 text-center py-12 animate-in zoom-in-95">
        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">{tipoDocumento} Emitido com Sucesso!</h2>
        <p className="text-sm text-gray-600">
          O {tipoDocumento} foi gravado e o documento PDF foi gerado. A redirecionar...
        </p>
        <div className="flex justify-center pt-2">
          <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">
          Passo 3: Revisão e Emissão do {tipoDocumento}
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          Confira os detalhes finais antes de emitir o {tipoDocumento}
        </p>

        {/* Resumo do Cliente */}
        <Card className="p-4 mb-6 bg-blue-50/70 border-blue-200 rounded-xl">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-700">Cliente Destinatário</span>
              <h3 className="text-base font-bold text-gray-900 mt-0.5">{clienteSelecionado?.nome}</h3>
              <p className="text-xs text-gray-600 mt-1">NIF: <strong className="font-mono text-gray-800">{clienteSelecionado?.nif}</strong></p>
            </div>
            <Badge variant="outline" className="bg-white border-blue-300 text-blue-800">
              Passo Final
            </Badge>
          </div>
        </Card>

        {/* Resumo das Linhas */}
        <Card className="p-4 mb-6 border-gray-200 rounded-xl shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600" />
            Itens da Fatura ({linhas.length})
          </h3>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-gray-50">
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
                      <TableCell className="text-xs font-medium text-gray-900">{linha.descricao}</TableCell>
                      <TableCell className="text-center text-xs font-mono">{linha.quantidade}</TableCell>
                      <TableCell className="text-right text-xs font-mono">{formatMoedaAOA(linha.preco)}</TableCell>
                      <TableCell className="text-center text-xs font-mono">{linha.taxaIVA}%</TableCell>
                      <TableCell className="text-right text-xs font-bold font-mono">{formatMoedaAOA(totalLinhaComIVA)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>

        {/* Resumo de Valores Totais */}
        <Card className="bg-slate-900 text-white p-5 mb-6 rounded-xl shadow-md">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-slate-300">
              <span>Subtotal Imponível:</span>
              <span className="font-mono">{formatMoedaAOA(subtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Total IVA:</span>
              <span className="font-mono">{formatMoedaAOA(totalIVA)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold text-white border-t border-slate-700 pt-3 mt-2">
              <span>TOTAL A PAGAR:</span>
              <span className="font-mono text-blue-400">{formatMoedaAOA(total)}</span>
            </div>
          </div>
        </Card>

        {/* Condições de Pagamento e Observações */}
        <Card className="p-5 mb-6 space-y-4 rounded-xl border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                Forma de Pagamento <span className="text-red-500">*</span>
              </label>
              <Select value={formaPagamento} onValueChange={(v) => setFormaPagamento(v ?? "Transferência")}>
                <SelectTrigger className="bg-white border-gray-300">
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

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                Data de Vencimento
              </label>
              <div className="px-3 py-2 bg-gray-100 border border-gray-200 rounded-md text-xs font-medium text-gray-700">
                {formatData(dataVencimento)} <span className="text-gray-400 font-normal">({DIAS_VENCIMENTO_DEFAULT} dias)</span>
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1.5">
              Observações / Notas no Documento (opcional)
            </label>
            <Textarea
              placeholder="Adicione observações ou instruções bancárias adicionais para o cliente..."
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              className="h-20 text-xs border-gray-300"
            />
          </div>
        </Card>
      </div>

      {/* Botões de Ação */}
      <div className="flex gap-3 justify-between pt-4 border-t">
        <Button variant="outline" onClick={onBack} disabled={loading}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar para Linhas
        </Button>
        <div className="flex gap-3">
          <Link href="/faturas">
            <Button variant="ghost" disabled={loading} className="text-gray-600">
              Cancelar
            </Button>
          </Link>
          <Button
            onClick={handleEmitir}
            disabled={loading || !clienteSelecionado || linhas.length === 0}
            className="min-w-48 bg-green-600 hover:bg-green-700 text-white font-semibold"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Emitindo {tipoDocumento}...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Emitir {tipoDocumento} Agora
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
