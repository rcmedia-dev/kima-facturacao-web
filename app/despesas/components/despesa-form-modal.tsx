"use client";

import { useForm, type Resolver } from "react-hook-form";
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
import { cn } from "@/lib/utils";

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
    resolver: zodResolver(despesaSchemaInput) as Resolver<DespesaFormInput>,
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

  // Valores controlados do mobile (evita duplo register mobile+desktop)
  const descricaoValor = watch("descricao") ?? "";
  const fornecedorIdValor = watch("fornecedorId") ?? "";
  const categoriaValor = watch("categoria") ?? "";
  const dataValor = watch("data") ?? "";
  const formaPagamentoValor = watch("formaPagamento") ?? "Numerário";
  const estadoValor = watch("estado") ?? "Paga";
  const observacoesValor = watch("observacoes") ?? "";

  const setCampo = (campo: "descricao" | "fornecedorId" | "categoria" | "data" | "formaPagamento" | "estado" | "observacoes", valor: string) => {
    setValue(campo, valor as never, { shouldValidate: true, shouldDirty: true });
  };

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

  const onValorChangeMobile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^\d,]/g, "");
    const formatado = formatarValorInput(raw);
    setValorTexto(formatado);
    setValue("valor", parseValor(formatado), { shouldValidate: true });
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

        {/* ═══ MOBILE: V2-STYLE BOTTOM SHEET ═══ */}
        <DialogPrimitive.Popup
          className="fixed inset-x-0 bottom-0 top-auto z-50 mx-auto flex max-h-[92vh] w-full max-w-[420px] flex-col bg-white shadow-[0_-4px_16px_rgba(0,0,0,0.06)] outline-none transition-transform duration-300 ease-out translate-y-full data-open:translate-y-0 data-closed:translate-y-full rounded-t-[16px] sm:hidden dark:bg-slate-900 dark:shadow-[0_-4px_16px_rgba(0,0,0,0.3)]"
          aria-label={despesa ? "Editar Despesa" : "Nova Despesa"}
        >
          {/* Handle + Header */}
          <div className="shrink-0 rounded-t-[16px] bg-white px-4 pb-4 pt-3 dark:bg-slate-900">
            <div className="mx-auto mb-3 h-1 w-9 rounded-[2px] bg-slate-300 dark:bg-slate-600" />
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-[17px] font-extrabold text-slate-900 dark:text-white">
                  {despesa ? "Editar Despesa" : "Nova Despesa"}
                </p>
                <p className="mt-0.5 truncate text-[11px] text-slate-400 dark:text-slate-500">
                  {despesa ? "Atualize os dados da despesa" : "Registe uma nova despesa"}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
              >
                <X className="size-3.5" />
              </button>
            </div>
          </div>

          {/* Scroll + footer dentro do form */}
          <form id="despesa-form-mobile" onSubmit={handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto px-4 pb-4 pt-1">
              {/* Hero com total preview */}
              <div
                className="rounded-[16px] p-5 text-white"
                style={{ background: "linear-gradient(135deg, #ef4444, #dc2626)", boxShadow: "0 4px 16px rgba(239,68,68,0.3)" }}
              >
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-[1px] opacity-70">Total</p>
                <p className="font-mono text-[28px] font-black leading-none">
                  {totalPreview > 0
                    ? new Intl.NumberFormat("pt-AO", { minimumFractionDigits: 2 }).format(totalPreview)
                    : "0,00"}
                </p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  <span className={cn(
                    "rounded-md px-2.5 py-1 text-[11px] font-semibold",
                    estadoValor === "Paga" ? "bg-emerald-500/40" : "bg-amber-500/40"
                  )}>
                    {estadoValor}
                  </span>
                  <span className="rounded-md bg-white/20 px-2.5 py-1 text-[11px] font-semibold">
                    IVA {taxaIVA}%
                  </span>
                  <span className="rounded-md bg-white/20 px-2.5 py-1 font-mono text-[11px] font-semibold">
                    {formatarValorInput(String(valor ?? 0).replace(".", ",")) || "0"} AOA
                  </span>
                </div>
              </div>

              {/* All fields — one flat iOS card */}
              <div className="mt-3.5 overflow-hidden rounded-[16px] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)] dark:bg-slate-900 dark:shadow-[0_1px_3px_rgba(0,0,0,0.3)]">
                {/* Descrição */}
                <div className="flex min-h-[48px] items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5 dark:border-slate-800/80">
                  <label className="shrink-0 text-[14px] font-medium text-slate-900 dark:text-slate-100">Descrição</label>
                  <Input
                    value={descricaoValor}
                    onChange={(e) => setCampo("descricao", e.target.value)}
                    placeholder="Ex: Compra de material"
                    className="h-auto w-auto max-w-[200px] border-0 bg-transparent p-0 text-right font-[inherit] text-[14px] text-slate-500 shadow-none focus:ring-0 dark:text-slate-400"
                  />
                </div>
                {errors.descricao && (
                  <div className="border-b border-slate-100 px-4 py-2 dark:border-slate-800/80">
                    <p className="text-right text-[11px] text-red-500">{errors.descricao.message}</p>
                  </div>
                )}

                {/* Fornecedor */}
                <div className="flex min-h-[48px] items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5 dark:border-slate-800/80">
                  <label className="shrink-0 text-[14px] font-medium text-slate-900 dark:text-slate-100">Fornecedor</label>
                  <select
                    value={fornecedorIdValor}
                    onChange={(e) => setCampo("fornecedorId", e.target.value)}
                    className="h-auto w-auto max-w-[190px] appearance-none border-0 bg-transparent p-0 text-right font-[inherit] text-[13px] text-slate-500 shadow-none focus:ring-0 dark:text-slate-400"
                  >
                    <option value="">Sem fornecedor</option>
                    {store.fornecedores.filter((f) => f.ativo).map((f) => (
                      <option key={f.id} value={f.id}>{f.nome}</option>
                    ))}
                  </select>
                </div>

                {/* Categoria */}
                <div className="flex min-h-[48px] items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5 dark:border-slate-800/80">
                  <label className="shrink-0 text-[14px] font-medium text-slate-900 dark:text-slate-100">Categoria</label>
                  <Input
                    value={categoriaValor}
                    onChange={(e) => setCampo("categoria", e.target.value)}
                    placeholder="Ex: Escritório"
                    className="h-auto w-auto max-w-[170px] border-0 bg-transparent p-0 text-right font-[inherit] text-[14px] text-slate-500 shadow-none focus:ring-0 dark:text-slate-400"
                  />
                </div>
                {errors.categoria && (
                  <div className="border-b border-slate-100 px-4 py-2 dark:border-slate-800/80">
                    <p className="text-right text-[11px] text-red-500">{errors.categoria.message}</p>
                  </div>
                )}

                {/* Valor */}
                <div className="flex min-h-[48px] items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5 dark:border-slate-800/80">
                  <label className="shrink-0 text-[14px] font-medium text-slate-900 dark:text-slate-100">Valor (AOA)</label>
                  <Input
                    inputMode="decimal"
                    value={valorTexto}
                    onChange={onValorChangeMobile}
                    placeholder="0,00"
                    className="h-auto w-auto max-w-[150px] border-0 bg-transparent p-0 text-right font-mono text-[14px] text-slate-500 shadow-none focus:ring-0 dark:text-slate-400"
                  />
                </div>
                {errors.valor && (
                  <div className="border-b border-slate-100 px-4 py-2 dark:border-slate-800/80">
                    <p className="text-right text-[11px] text-red-500">{errors.valor.message}</p>
                  </div>
                )}

                {/* IVA */}
                <div className="flex min-h-[48px] items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5 dark:border-slate-800/80">
                  <label className="shrink-0 text-[14px] font-medium text-slate-900 dark:text-slate-100">IVA</label>
                  <select
                    value={taxaIVA}
                    onChange={(e) => setValue("taxaIVA", e.target.value as "0" | "7" | "14", { shouldDirty: true })}
                    className="h-auto w-auto appearance-none border-0 bg-transparent p-0 text-right font-[inherit] text-[14px] text-slate-500 shadow-none focus:ring-0 dark:text-slate-400"
                  >
                    <option value="0">0% (Isento)</option>
                    <option value="7">7%</option>
                    <option value="14">14%</option>
                  </select>
                </div>

                {/* Data */}
                <div className="flex min-h-[48px] items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5 dark:border-slate-800/80">
                  <label className="shrink-0 text-[14px] font-medium text-slate-900 dark:text-slate-100">Data</label>
                  <Input
                    type="date"
                    value={dataValor}
                    onChange={(e) => setCampo("data", e.target.value)}
                    className="h-auto w-auto max-w-[170px] border-0 bg-transparent p-0 text-right font-[inherit] text-[13px] text-slate-500 shadow-none focus:ring-0 dark:text-slate-400"
                  />
                </div>
                {errors.data && (
                  <div className="border-b border-slate-100 px-4 py-2 dark:border-slate-800/80">
                    <p className="text-right text-[11px] text-red-500">{errors.data.message}</p>
                  </div>
                )}

                {/* Forma de Pagamento */}
                <div className="flex min-h-[48px] items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5 dark:border-slate-800/80">
                  <label className="shrink-0 text-[14px] font-medium text-slate-900 dark:text-slate-100">Pagamento</label>
                  <select
                    value={formaPagamentoValor}
                    onChange={(e) => setCampo("formaPagamento", e.target.value)}
                    className="h-auto w-auto appearance-none border-0 bg-transparent p-0 text-right font-[inherit] text-[13px] text-slate-500 shadow-none focus:ring-0 dark:text-slate-400"
                  >
                    <option value="Numerário">Numerário</option>
                    <option value="Transferência">Transferência</option>
                    <option value="Multicaixa">Multicaixa</option>
                    <option value="POS">POS</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>

                {/* Estado */}
                <div className="flex min-h-[48px] items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5 dark:border-slate-800/80">
                  <label className="shrink-0 text-[14px] font-medium text-slate-900 dark:text-slate-100">Estado</label>
                  <select
                    value={estadoValor}
                    onChange={(e) => setCampo("estado", e.target.value)}
                    className="h-auto w-auto appearance-none border-0 bg-transparent p-0 text-right font-[inherit] text-[13px] text-slate-500 shadow-none focus:ring-0 dark:text-slate-400"
                  >
                    <option value="Paga">Paga</option>
                    <option value="Pendente">Pendente</option>
                  </select>
                </div>

                {/* Observações */}
                <div className="flex min-h-[48px] items-center justify-between gap-3 px-4 py-3.5">
                  <label className="shrink-0 text-[14px] font-medium text-slate-900 dark:text-slate-100">Obs.</label>
                  <Input
                    value={observacoesValor}
                    onChange={(e) => setCampo("observacoes", e.target.value)}
                    placeholder="Notas (opcional)"
                    className="h-auto w-auto max-w-[190px] border-0 bg-transparent p-0 text-right font-[inherit] text-[13px] text-slate-500 shadow-none focus:ring-0 dark:text-slate-400"
                  />
                </div>
              </div>
            </div>

            {/* Fixed bottom button inside form */}
            <div className="shrink-0 border-t border-slate-200 bg-white/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-[12px] dark:border-slate-800 dark:bg-slate-900/95">
              <button
                type="submit"
                disabled={isSaving}
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-[14px] border-0 bg-blue-600 py-3.5 font-[inherit] text-[14px] font-bold text-white shadow-[0_4px_12px_rgba(59,130,246,0.3)] transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {isSaving ? "A guardar..." : despesa ? "Guardar" : "Criar Despesa"}
              </button>
            </div>
          </form>
        </DialogPrimitive.Popup>

        {/* ═══ DESKTOP: EXISTING RIGHT PANEL (inalterado) ═══ */}
        <DialogPrimitive.Popup
          className="hidden sm:flex fixed right-0 top-0 z-50 h-full w-full max-w-lg flex-col bg-white dark:bg-slate-900 shadow-2xl outline-none transition-transform duration-300 ease-in-out translate-x-full data-open:translate-x-0 data-closed:translate-x-full"
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
