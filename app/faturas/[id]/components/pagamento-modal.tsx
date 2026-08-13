"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatData, formatMoedaAOA } from "@/lib/formatters";
import { CreditCard, Calendar, DollarSign, CheckCircle2 } from "lucide-react";

function parseValor(texto: string): number {
  const normalizado = texto.replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  const valor = parseFloat(normalizado);
  return isNaN(valor) ? 0 : valor;
}

function formatarValorInput(raw: string): string {
  const [int, dec] = raw.split(",");
  const intLimpo = (int || "").replace(/\D/g, "");
  const intFormatado = intLimpo.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  if (!raw.includes(",")) return intFormatado;
  const decLimpo = (dec || "").replace(/\D/g, "").slice(0, 2);
  return `${intFormatado},${decLimpo}`;
}

function posCaretPosDigitos(formatado: string, numDigitos: number): number {
  let count = 0;
  for (let i = 0; i < formatado.length; i++) {
    if (/\d/.test(formatado[i])) {
      count++;
      if (count === numDigitos) return i + 1;
    }
  }
  return formatado.length;
}

type FormaPagamentoType = "Numerário" | "Transferência" | "Multicaixa" | "POS" | "Cheque" | "Crédito";

interface PagamentoModalProps {
  faturaTotal?: number;
  formaPagamentoInicial?: string;
  onClose: () => void;
  onConfirm: (data: Date, formaPagamento: FormaPagamentoType, valor: number) => void;
}

export function PagamentoModal({
  faturaTotal = 0,
  formaPagamentoInicial = "Transferência",
  onClose,
  onConfirm,
}: PagamentoModalProps) {
  const [dataPagamento, setDataPagamento] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamentoType>(
    (formaPagamentoInicial as FormaPagamentoType) || "Transferência"
  );
  const [valor, setValor] = useState<string>(
    faturaTotal > 0 ? formatarValorInput(String(faturaTotal).replace(".", ",")) : ""
  );
  const [erro, setErro] = useState<string | null>(null);

  const handleConfirm = () => {
    setErro(null);
    if (!dataPagamento) {
      setErro("Selecione uma data de pagamento válida.");
      return;
    }
    const valorNumerico = parseValor(valor);
    if (isNaN(valorNumerico) || valorNumerico <= 0) {
      setErro("O valor do pagamento deve ser maior que zero.");
      return;
    }
    if (faturaTotal > 0 && valorNumerico > faturaTotal) {
      setErro(`O valor não pode exceder o total da fatura (${formatMoedaAOA(faturaTotal)}).`);
      return;
    }

    const data = new Date(dataPagamento);
    onConfirm(data, formaPagamento, valorNumerico);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[440px] rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xl">
        <DialogHeader className="space-y-1 text-left">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={18} />
            </div>
            <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
              Registrar Pagamento
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
            Informe os detalhes da liquidação do documento.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3">
          {faturaTotal > 0 && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Valor Total da Fatura</span>
              <span className="text-sm font-bold font-mono text-slate-900 dark:text-white">
                {formatMoedaAOA(faturaTotal)}
              </span>
            </div>
          )}

          {/* Valor a Pagar */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <DollarSign size={14} className="text-slate-400" />
              Valor a Pagar (AOA)
            </Label>
            <Input
              inputMode="decimal"
              value={valor}
              onChange={(e) => {
                const el = e.target;
                const cursorAntes = el.selectionStart ?? el.value.length;
                const textoAntesCursor = el.value.slice(0, cursorAntes);
                const digitosAntesCursor = textoAntesCursor.replace(/\D/g, "");
                const raw = el.value.replace(/[^\d,]/g, "");
                const formatado = formatarValorInput(raw);
                setValor(formatado);
                requestAnimationFrame(() => {
                  const novoCursor = posCaretPosDigitos(formatado, digitosAntesCursor.length);
                  el.setSelectionRange(novoCursor, novoCursor);
                });
              }}
              placeholder="0,00"
              className="rounded-xl font-mono font-medium"
            />
          </div>

          {/* Forma de Pagamento */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <CreditCard size={14} className="text-slate-400" />
              Forma de Pagamento
            </Label>
            <select
              value={formaPagamento}
              onChange={(e) => setFormaPagamento(e.target.value as FormaPagamentoType)}
              className="w-full h-10 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Transferência">Transferência Bancária</option>
              <option value="Multicaixa">Multicaixa / TPA</option>
              <option value="Numerário">Numerário / Dinheiro</option>
              <option value="POS">POS</option>
              <option value="Cheque">Cheque</option>
              <option value="Crédito">Crédito</option>
            </select>
          </div>

          {/* Data de Pagamento */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Calendar size={14} className="text-slate-400" />
              Data do Pagamento
            </Label>
            <Input
              type="date"
              value={dataPagamento}
              onChange={(e) => setDataPagamento(e.target.value)}
              className="rounded-xl font-mono text-xs"
            />
            {dataPagamento && (
              <p className="text-[11px] text-slate-400">
                Data selecionada: {formatData(new Date(dataPagamento))}
              </p>
            )}
          </div>

          {/* Mensagem de Erro */}
          {erro && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs rounded-xl border border-red-200 dark:border-red-800 font-medium">
              {erro}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button
            variant="outline"
            onClick={onClose}
            className="rounded-xl text-xs"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            className="rounded-xl text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm"
          >
            Confirmar Pagamento
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
