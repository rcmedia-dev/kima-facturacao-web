"use client";

import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Truck, UserPlus, Phone, Tag, Landmark, Check, Loader2 } from "lucide-react";
import { Fornecedor } from "@/lib/types";
import { fornecedorSchema, FornecedorFormInput } from "@/lib/schemas";
import { validarNIFAngolano } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useToastContext } from "@/components/ui/toast";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";

interface FornecedorFormModalProps {
  fornecedor?: Fornecedor;
  onClose: () => void;
  onSave: () => void;
}

function getInitials(nome: string): string {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function FornecedorFormModal({
  fornecedor,
  onClose,
  onSave,
}: FornecedorFormModalProps) {
  const store = useAppStore();
  const [isSaving, setIsSaving] = useState(false);
  const { success, error } = useToastContext();
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    setError,
    clearErrors,
  } = useForm<FornecedorFormInput>({
    resolver: zodResolver(fornecedorSchema) as Resolver<FornecedorFormInput>,
    defaultValues: fornecedor
      ? {
          nome: fornecedor.nome,
          nif: fornecedor.nif,
          morada: fornecedor.morada,
          telefone: fornecedor.telefone,
          email: fornecedor.email,
          bancaria: fornecedor.bancaria,
          ativo: fornecedor.ativo ?? true,
        }
      : {
          ativo: true,
        },
  });

  const nif = watch("nif");
  // Valores controlados do mobile (evita duplo register mobile+desktop)
  const nomeValor = watch("nome") ?? "";
  const nifValor = watch("nif") ?? "";
  const telefoneValor = watch("telefone") ?? "";
  const emailValor = watch("email") ?? "";
  const moradaValor = watch("morada") ?? "";
  const bancariaValor = watch("bancaria") ?? "";
  const ativoValor = watch("ativo") ?? true;

  const setCampo = (campo: "nome" | "nif" | "telefone" | "email" | "morada" | "bancaria", valor: string) => {
    setValue(campo, valor, { shouldValidate: true, shouldDirty: true });
  };

  useEffect(() => {
    if (nif) {
      const validacao = validarNIFAngolano(nif);
      if (!validacao.valido) {
        setError("nif", { type: "manual", message: validacao.mensagem || "NIF inválido" });
      } else {
        clearErrors("nif");
      }
    }
  }, [nif, setError, clearErrors]);

  const onSubmit = async (data: FornecedorFormInput) => {
    setIsSaving(true);
    const fornecedorData = {
      nome: data.nome ?? "",
      nif: data.nif ?? "",
      morada: data.morada ?? "",
      telefone: data.telefone ?? "",
      email: data.email ?? "",
      bancaria: data.bancaria,
      ativo: data.ativo ?? true,
    };
    try {
      if (fornecedor) {
        await store.updateFornecedor(fornecedor.id, fornecedorData);
        success("Sucesso", "Fornecedor atualizado com sucesso.");
      } else {
        await store.addFornecedor(fornecedorData);
        success("Sucesso", "Fornecedor criado com sucesso.");
      }
      onSave();
    } catch (e) {
      error("Erro", `Falha ao salvar fornecedor: ${(e as Error).message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const isEditing = !!fornecedor;
  const titulo = isEditing ? "Editar Fornecedor" : "Novo Fornecedor";
  const subtitulo = `Preencha os dados abaixo para ${isEditing ? "atualizar" : "registar"} o fornecedor.`;

  const CardHeader = ({ icon, label }: { icon: React.ReactNode; label: string }) => (
    <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/60 px-4 py-2.5 dark:border-slate-800 dark:bg-slate-800/40">
      <span className="text-blue-600 dark:text-blue-400">{icon}</span>
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

        {/* ═══ MOBILE: V2-STYLE BOTTOM SHEET (fiel ao form de artigos) ═══ */}
        <DialogPrimitive.Popup
          className="fixed inset-x-0 bottom-0 top-auto z-50 mx-auto flex max-h-[92vh] w-full max-w-[420px] flex-col bg-white shadow-[0_-4px_16px_rgba(0,0,0,0.06)] outline-none transition-transform duration-300 ease-out translate-y-full data-open:translate-y-0 data-closed:translate-y-full rounded-t-[16px] sm:hidden dark:bg-slate-900 dark:shadow-[0_-4px_16px_rgba(0,0,0,0.3)]"
          aria-label={titulo}
        >
          {/* Handle + Header */}
          <div className="shrink-0 rounded-t-[16px] bg-white px-4 pb-4 pt-3 dark:bg-slate-900">
            <div className="mx-auto mb-3 h-1 w-9 rounded-[2px] bg-slate-300 dark:bg-slate-600" />
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-[17px] font-extrabold text-slate-900 dark:text-white">{titulo}</p>
                <p className="mt-0.5 truncate text-[11px] text-slate-400 dark:text-slate-500">{subtitulo}</p>
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
          <form id="fornecedor-form-mobile" onSubmit={handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto px-4 pb-4 pt-1">
              {/* Identity hero */}
              <div
                className="rounded-[16px] p-5 text-white"
                style={{ background: "linear-gradient(135deg, #3b82f6, #6366f1)", boxShadow: "0 4px 16px rgba(59,130,246,0.3)" }}
              >
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-[1px] opacity-70">Fornecedor</p>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/25 bg-white/15 text-[15px] font-extrabold">
                    {getInitials(nomeValor) || "?"}
                  </div>
                  <p className="min-w-0 flex-1 truncate text-[19px] font-extrabold leading-snug">
                    {nomeValor || (isEditing ? "Editar fornecedor" : "Novo fornecedor")}
                  </p>
                </div>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  <span className={cn(
                    "rounded-md px-2.5 py-1 text-[11px] font-semibold",
                    ativoValor ? "bg-emerald-500/40" : "bg-red-500/40"
                  )}>
                    {ativoValor ? "Ativo" : "Inativo"}
                  </span>
                  <span className="rounded-md bg-white/20 px-2.5 py-1 font-mono text-[11px] font-semibold">
                    {nifValor || "NIF"}
                  </span>
                </div>
              </div>

              {/* All fields — one flat iOS card */}
              <div className="mt-3.5 overflow-hidden rounded-[16px] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)] dark:bg-slate-900 dark:shadow-[0_1px_3px_rgba(0,0,0,0.3)]">
                <div className="flex min-h-[48px] items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5 dark:border-slate-800/80">
                  <label className="shrink-0 text-[14px] font-medium text-slate-900 dark:text-slate-100">Nome</label>
                  <Input
                    value={nomeValor}
                    onChange={(e) => setCampo("nome", e.target.value)}
                    placeholder="Nome do fornecedor"
                    className="h-auto w-auto max-w-[200px] border-0 bg-transparent p-0 text-right font-[inherit] text-[14px] text-slate-500 shadow-none focus:ring-0 dark:text-slate-400"
                  />
                </div>
                {errors.nome && (
                  <div className="border-b border-slate-100 px-4 py-2 dark:border-slate-800/80">
                    <p className="text-right text-[11px] text-red-500">{errors.nome.message}</p>
                  </div>
                )}
                <div className="flex min-h-[48px] items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5 dark:border-slate-800/80">
                  <label className="shrink-0 text-[14px] font-medium text-slate-900 dark:text-slate-100">NIF</label>
                  <Input
                    value={nifValor}
                    onChange={(e) => setCampo("nif", e.target.value)}
                    placeholder="10 dígitos"
                    inputMode="numeric"
                    className="h-auto w-auto max-w-[170px] border-0 bg-transparent p-0 text-right font-mono text-[14px] text-slate-500 shadow-none focus:ring-0 dark:text-slate-400"
                  />
                </div>
                {errors.nif ? (
                  <div className="border-b border-slate-100 px-4 py-2 dark:border-slate-800/80">
                    <p className="text-right text-[11px] text-red-500">{errors.nif.message}</p>
                  </div>
                ) : (
                  <div className="border-b border-slate-100 px-4 py-2 dark:border-slate-800/80">
                    <p className="text-right text-[10px] text-slate-400 dark:text-slate-500">10 dígitos numéricos</p>
                  </div>
                )}
                <div className="flex min-h-[48px] items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5 dark:border-slate-800/80">
                  <label className="shrink-0 text-[14px] font-medium text-slate-900 dark:text-slate-100">Telefone</label>
                  <Input
                    value={telefoneValor}
                    onChange={(e) => setCampo("telefone", e.target.value)}
                    placeholder="+244 923 000 000"
                    inputMode="tel"
                    className="h-auto w-auto max-w-[170px] border-0 bg-transparent p-0 text-right font-[inherit] text-[14px] text-slate-500 shadow-none focus:ring-0 dark:text-slate-400"
                  />
                </div>
                {errors.telefone && (
                  <div className="border-b border-slate-100 px-4 py-2 dark:border-slate-800/80">
                    <p className="text-right text-[11px] text-red-500">{errors.telefone.message}</p>
                  </div>
                )}
                <div className="flex min-h-[48px] items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5 dark:border-slate-800/80">
                  <label className="shrink-0 text-[14px] font-medium text-slate-900 dark:text-slate-100">Email</label>
                  <Input
                    value={emailValor}
                    onChange={(e) => setCampo("email", e.target.value)}
                    type="email"
                    placeholder="email@fornecedor.ao"
                    className="h-auto w-auto max-w-[190px] border-0 bg-transparent p-0 text-right font-[inherit] text-[13px] text-slate-500 shadow-none focus:ring-0 dark:text-slate-400"
                  />
                </div>
                {errors.email && (
                  <div className="border-b border-slate-100 px-4 py-2 dark:border-slate-800/80">
                    <p className="text-right text-[11px] text-red-500">{errors.email.message}</p>
                  </div>
                )}
                <div className="flex min-h-[48px] items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5 dark:border-slate-800/80">
                  <label className="shrink-0 text-[14px] font-medium text-slate-900 dark:text-slate-100">Morada</label>
                  <Input
                    value={moradaValor}
                    onChange={(e) => setCampo("morada", e.target.value)}
                    placeholder="Morada do fornecedor"
                    className="h-auto w-auto max-w-[190px] border-0 bg-transparent p-0 text-right font-[inherit] text-[13px] text-slate-500 shadow-none focus:ring-0 dark:text-slate-400"
                  />
                </div>
                {errors.morada && (
                  <div className="border-b border-slate-100 px-4 py-2 dark:border-slate-800/80">
                    <p className="text-right text-[11px] text-red-500">{errors.morada.message}</p>
                  </div>
                )}
                <div className="flex min-h-[48px] items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5 dark:border-slate-800/80">
                  <label className="shrink-0 text-[14px] font-medium text-slate-900 dark:text-slate-100">Conta / IBAN</label>
                  <Input
                    value={bancariaValor}
                    onChange={(e) => setCampo("bancaria", e.target.value)}
                    placeholder="AO06.0040..."
                    className="h-auto w-auto max-w-[170px] border-0 bg-transparent p-0 text-right font-mono text-[12px] text-slate-500 shadow-none focus:ring-0 dark:text-slate-400"
                  />
                </div>
                <div className="flex min-h-[48px] items-center justify-between gap-3 px-4 py-3.5">
                  <label className="shrink-0 text-[14px] font-medium text-slate-900 dark:text-slate-100">Ativo</label>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={ativoValor}
                    onClick={() => setValue("ativo", !ativoValor, { shouldDirty: true })}
                    className={cn(
                      "relative h-7 w-12 shrink-0 rounded-full transition-colors",
                      ativoValor ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-700"
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all",
                        ativoValor ? "left-6" : "left-1"
                      )}
                    />
                  </button>
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
                {isSaving ? (
                  <><Loader2 size={16} className="animate-spin" /> A guardar...</>
                ) : (
                  <><Check size={16} strokeWidth={2.5} /> {isEditing ? "Guardar" : "Criar"} Fornecedor</>
                )}
              </button>
            </div>
          </form>
        </DialogPrimitive.Popup>

        {/* ═══ DESKTOP: EXISTING RIGHT DRAWER (inalterado) ═══ */}
        <DialogPrimitive.Popup
          className="hidden sm:flex fixed right-0 top-0 z-50 h-full w-full max-w-lg flex-col bg-white dark:bg-slate-900 shadow-2xl outline-none transition-transform duration-300 ease-in-out translate-x-full data-open:translate-x-0 data-closed:translate-x-full"
          aria-label={fornecedor ? "Editar Fornecedor" : "Novo Fornecedor"}
        >
          {/* Cabeçalho */}
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 px-6 py-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 shrink-0">
                {fornecedor ? (
                  <Truck size={18} className="text-blue-600 dark:text-blue-400" />
                ) : (
                  <UserPlus size={18} className="text-blue-600 dark:text-blue-400" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-base font-bold text-slate-900 dark:text-white">
                  {fornecedor ? "Editar Fornecedor" : "Novo Fornecedor"}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  Preencha os dados abaixo para {fornecedor ? "atualizar" : "registar"} o fornecedor.
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Fechar">
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Corpo scrollável */}
          <form id="fornecedor-form" onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-6 space-y-3.5">
            {/* Identificação */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
              <CardHeader icon={<Tag size={15} />} label="Identificação" />
              <div className="grid grid-cols-2 gap-4 p-4">
                <div className="space-y-1.5 col-span-2">
                  <Label required>Nome</Label>
                  <Input
                    {...register("nome")}
                    placeholder="Nome da empresa ou fornecedor"
                    className="h-10"
                  />
                  {errors.nome && (
                    <p className="text-red-500 text-sm mt-1">{errors.nome.message}</p>
                  )}
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label required>NIF</Label>
                  <Input
                    {...register("nif")}
                    placeholder="Ex: 5417001234 (10 dígitos)"
                    className="h-10"
                  />
                  {errors.nif ? (
                    <p className="text-red-500 text-xs mt-1">{errors.nif.message}</p>
                  ) : (
                    <p className="text-gray-400 text-xs mt-1">
                      Fornecedor: 10 dígitos numéricos
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Contactos */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
              <CardHeader icon={<Phone size={15} />} label="Contactos" />
              <div className="grid grid-cols-2 gap-4 p-4">
                <div className="space-y-1.5">
                  <Label required>Telefone</Label>
                  <Input
                    {...register("telefone")}
                    placeholder="+244 923 000 000"
                    className="h-10"
                  />
                  {errors.telefone && (
                    <p className="text-red-500 text-sm mt-1">{errors.telefone.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label required>Email</Label>
                  <Input
                    {...register("email")}
                    type="email"
                    placeholder="email@fornecedor.ao"
                    className="h-10"
                  />
                  {errors.email && (
                    <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
                  )}
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label required>Morada</Label>
                  <Input
                    {...register("morada")}
                    placeholder="Morada do fornecedor"
                    className="h-10"
                  />
                  {errors.morada && (
                    <p className="text-red-500 text-sm mt-1">{errors.morada.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Dados Bancários */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
              <CardHeader icon={<Landmark size={15} />} label="Dados Bancários" />
              <div className="grid grid-cols-2 gap-4 p-4">
                <div className="space-y-1.5 col-span-2">
                  <Label>Conta Bancária / IBAN</Label>
                  <Input
                    {...register("bancaria")}
                    placeholder="Ex: AO06.0040.0000.1234.5678.9012.3"
                    className="h-10"
                  />
                </div>
              </div>
            </div>

            {/* Estado */}
            <div className="flex items-center gap-3 px-1">
              <input
                id="fornecedor-ativo"
                type="checkbox"
                {...register("ativo")}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 accent-blue-600 focus:ring-2 focus:ring-blue-500/30 focus:ring-offset-0 cursor-pointer"
              />
              <label htmlFor="fornecedor-ativo" className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                Fornecedor ativo
              </label>
            </div>
          </form>

          {/* Rodapé */}
          <footer className="flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800 px-6 py-4">
            <Button disabled={isSaving} variant="outline" type="button" onClick={onClose}>
              Cancelar
            </Button>
            <Button disabled={isSaving} type="submit" form="fornecedor-form">
              {isSaving ? "Salvando..." : fornecedor ? "Salvar Alterações" : "Criar Fornecedor"}
            </Button>
          </footer>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
