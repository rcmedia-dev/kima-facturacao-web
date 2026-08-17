"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, Wallet, ReceiptText, Coins, CalendarDays, Landmark, Tag } from "lucide-react";
import { Despesa } from "@/lib/types";
import { despesaSchemaInput, DespesaFormInput } from "@/lib/schemas";
import { useState } from "react";
import { useToastContext } from "@/components/ui/toast";
import { useAppStore } from "@/lib/store";

interface DespesaFormModalProps {
  despesa?: Despesa;
  onClose: () => void;
  onSave: () => void;
}

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

function toDateInputValue(d: Date): string {
  const dt = new Date(d);
  const offset = dt.getTimezoneOffset();
  return new Date(dt.getTime() - offset * 60000).toISOString().slice(0, 10);
}

export function DespesaFormModal({
  despesa,
  onClose,
  onSave,
}: DespesaFormModalProps) {
  const store = useAppStore();
  const [isSaving, setIsSaving] = useState(false);
  const { success, error } = useToastContext();

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<DespesaFormInput>({
    resolver: zodResolver(despesaSchemaInput) as any,
    defaultValues: despesa
      ? {
          descricao: despesa.descricao,
          fornecedorId: despesa.fornecedorId || undefined,
          categoria: despesa.categoria || "Geral",
          valor: despesa.valor,
          taxaIVA: String(despesa.taxaIVA) as "0" | "7" | "14",
          data: toDateInputValue(despesa.data),
          formaPagamento: despesa.formaPagamento,
          estado: despesa.estado,
          observacoes: despesa.observacoes || "",
        }
      : {
          categoria: "Geral",
          valor: 0,
          taxaIVA: "14" as const,
          data: toDateInputValue(new Date()),
          formaPagamento: "Numerário",
          estado: "Paga",
          observacoes: "",
        },
  });

  const taxaIVA = watch("taxaIVA") ?? "14";
  const valor = watch("valor");
  const [valorTexto, setValorTexto] = useState<string>(() =>
    valor && valor > 0 ? formatarValorInput(String(valor).replace(".", ",")) : ""
  );
  const totalPreview = (parseValor(valorTexto) * (1 + parseInt(taxaIVA, 10) / 100)) || 0;

  const onValorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const el = e.target;
    const cursorAntes = el.selectionStart ?? el.value.length;
    const textoAntesCursor = el.value.slice(0, cursorAntes);
    const digitosAntesCursor = textoAntesCursor.replace(/\D/g, "");
    const raw = el.value.replace(/[^\d,]/g, "");
    const formatado = formatarValorInput(raw);
    setValorTexto(formatado);
    setValue("valor", parseValor(formatado), { shouldValidate: true });
    requestAnimationFrame(() => {
      const novoCursor = posCaretPosDigitos(formatado, digitosAntesCursor.length);
      el.setSelectionRange(novoCursor, novoCursor);
    });
  };

  const onSubmit = async (data: DespesaFormInput) => {
    setIsSaving(true);
    const despesaData = {
      descricao: data.descricao,
      fornecedorId: data.fornecedorId || undefined,
      categoria: data.categoria ?? "Geral",
      valor: data.valor ?? (valorTexto === "" ? 0 : parseValor(valorTexto)),
      taxaIVA: parseInt(data.taxaIVA ?? "0", 10) as 0 | 7 | 14,
      data: data.data ? new Date(data.data) : new Date(),
      formaPagamento: data.formaPagamento ?? "Numerário",
      estado: data.estado ?? "Paga",
      observacoes: data.observacoes || undefined,
    };
    try {
      if (despesa) {
        await store.updateDespesa(despesa.id, despesaData);
        success("Sucesso", "Despesa atualizada com sucesso.");
      } else {
        await store.addDespesa(despesaData);
        success("Sucesso", "Despesa criada com sucesso.");
      }
      onSave();
    } catch (e) {
      error("Erro", `Falha ao salvar despesa: ${(e as Error).message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const CardHeader = ({ icon, label }: { icon: React.ReactNode; label: string }) => (
    <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/60 px-4 py-2.5 dark:border-slate-800 dark:bg-slate-800/40">
      <span className="text-red-500 dark:text-red-400">{icon}</span>
      <span className="text-[12.5px] font-bold text-slate-700 dark:text-slate-200">{label}</span>
    </div>
  );

  const Label = ({ children, required }: { children: React.ReactNode; required?: boolean }) => (
    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
      {children}
      {required && <span className="text-red-500"> *</span>}
    </label>
  );

  return (
    <DialogPrimitive.Root open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
          onClick={onClose}
        />
        <DialogPrimitive.Popup
          className="fixed right-0 top-0 z-50 flex h-full w-full max-w-lg flex-col bg-white dark:bg-slate-900 shadow-2xl outline-none transition-transform duration-300 ease-in-out translate-x-full data-open:translate-x-0 data-closed:translate-x-full"
          aria-label={despesa ? "Editar Despesa" : "Nova Despesa"}
        >
          {/* Cabeçalho */}
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 px-6 py-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/30 shrink-0">
                <Wallet size={18} className="text-red-500 dark:text-red-400" />
              </div>
              <div className="min-w-0">
                <p className="text-base font-bold text-slate-900 dark:text-white">
                  {despesa ? "Editar Despesa" : "Nova Despesa"}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  Preencha os dados abaixo para {despesa ? "atualizar" : "registar"} a despesa.
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Fechar">
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Corpo scrollável */}
          <form id="despesa-form" onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-6 space-y-3.5">
            {/* Identificação */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
              <CardHeader icon={<ReceiptText size={15} />} label="Identificação" />
              <div className="grid grid-cols-2 gap-4 p-4">
                <div className="space-y-1.5 col-span-2">
                  <Label required>Descrição</Label>
                  <Input
                    {...register("descricao")}
                    placeholder="Ex: Compra de material de escritório"
                    className="h-10"
                  />
                  {errors.descricao && (
                    <p className="text-red-500 text-sm mt-1">{errors.descricao.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>Fornecedor</Label>
                  <Select
                    value={watch("fornecedorId") || ""}
                    onValueChange={(v) => setValue("fornecedorId", v ? v : undefined)}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Sem fornecedor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Sem fornecedor</SelectItem>
                      {store.fornecedores.filter((f) => f.ativo).map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label required>Categoria</Label>
                  <Input
                    {...register("categoria")}
                    placeholder="Ex: Escritório, Transporte..."
                    className="h-10"
                  />
                  {errors.categoria && (
                    <p className="text-red-500 text-sm mt-1">{errors.categoria.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Valor & IVA */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
              <CardHeader icon={<Coins size={15} />} label="Valor & IVA" />
              <div className="grid grid-cols-3 gap-4 p-4">
                <div className="space-y-1.5 col-span-1">
                  <Label required>Valor (AOA)</Label>
                  <Input
                    inputMode="decimal"
                    value={valorTexto}
                    onChange={onValorChange}
                    placeholder="Ex: 185.000,00"
                    className="h-10 text-right font-mono"
                  />
                  {errors.valor && (
                    <p className="text-red-500 text-sm mt-1">{errors.valor.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label required>Taxa de IVA</Label>
                  <Select
                    value={taxaIVA}
                    onValueChange={(value) => setValue("taxaIVA", value as "0" | "7" | "14")}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0% (Isento)</SelectItem>
                      <SelectItem value="7">7%</SelectItem>
                      <SelectItem value="14">14%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Total</Label>
                  <div
                    className="flex h-10 items-center justify-end rounded-xl bg-slate-50 px-3.5 font-mono text-sm font-bold text-slate-800 dark:bg-slate-800/40 dark:text-slate-200"
                  >
                    {new Intl.NumberFormat("pt-AO", { minimumFractionDigits: 2 }).format(totalPreview)}
                  </div>
                </div>
              </div>
            </div>

            {/* Pagamento */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
              <CardHeader icon={<CalendarDays size={15} />} label="Pagamento" />
              <div className="grid grid-cols-2 gap-4 p-4">
                <div className="space-y-1.5">
                  <Label required>Data</Label>
                  <Input
                    type="date"
                    {...register("data")}
                    className="h-10"
                  />
                  {errors.data && (
                    <p className="text-red-500 text-sm mt-1">{errors.data.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label required>Forma de Pagamento</Label>
                  <Select
                    value={watch("formaPagamento")}
                    onValueChange={(value) => setValue("formaPagamento", value as Despesa["formaPagamento"])}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Numerário">Numerário</SelectItem>
                      <SelectItem value="Transferência">Transferência</SelectItem>
                      <SelectItem value="Multicaixa">Multicaixa</SelectItem>
                      <SelectItem value="POS">POS</SelectItem>
                      <SelectItem value="Cheque">Cheque</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label required>Estado</Label>
                  <Select
                    value={watch("estado")}
                    onValueChange={(value) => setValue("estado", value as Despesa["estado"])}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Paga">Paga</SelectItem>
                      <SelectItem value="Pendente">Pendente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Observações */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
              <CardHeader icon={<Landmark size={15} />} label="Observações" />
              <div className="p-4">
                <textarea
                  {...register("observacoes")}
                  rows={3}
                  placeholder="Notas adicionais sobre a despesa (opcional)"
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-400">
              <Tag size={15} className="shrink-0 text-red-500 dark:text-red-400" />
              O total é calculado automaticamente somando o IVA ao valor indicado.
            </div>
          </form>

          {/* Rodapé */}
          <footer className="flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800 px-6 py-4">
            <Button disabled={isSaving} variant="outline" type="button" onClick={onClose}>
              Cancelar
            </Button>
            <Button disabled={isSaving} type="submit" form="despesa-form">
              {isSaving ? "Salvando..." : despesa ? "Salvar Alterações" : "Criar Despesa"}
            </Button>
          </footer>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}