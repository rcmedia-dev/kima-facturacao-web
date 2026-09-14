"use client";

import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Users, UserPlus, Building2, UserCircle2, Phone, Tag, Check, Loader2 } from "lucide-react";
import { Cliente } from "@/lib/types";
import { clienteSchema, ClienteFormData, ClienteFormInput } from "@/lib/schemas";
import { validarNIFAngolano } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useToastContext } from "@/components/ui/toast";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";

interface ClienteFormModalProps {
  cliente?: Cliente;
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

export function ClienteFormModal({
  cliente,
  onClose,
  onSave,
}: ClienteFormModalProps) {
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
  } = useForm<ClienteFormInput>({
    resolver: zodResolver(clienteSchema) as Resolver<ClienteFormInput>,
    defaultValues: cliente
      ? {
          nome: cliente.nome,
          nif: cliente.nif,
          morada: cliente.morada,
          telefone: cliente.telefone,
          email: cliente.email,
          tipo: cliente.tipo ?? "PJ",
          ativo: cliente.ativo ?? true,
          responsavel: cliente.responsavel,
        }
      : {
          tipo: "PJ",
          ativo: true,
        },
  });

  const tipo = watch("tipo");
  const nif = watch("nif");
  // Valores controlados do mobile (evita duplo register mobile+desktop)
  const nomeValor = watch("nome") ?? "";
  const nifValor = watch("nif") ?? "";
  const telefoneValor = watch("telefone") ?? "";
  const emailValor = watch("email") ?? "";
  const moradaValor = watch("morada") ?? "";
  const responsavelValor = watch("responsavel") ?? "";

  const setCampo = (campo: "nome" | "nif" | "telefone" | "email" | "morada" | "responsavel", valor: string) => {
    setValue(campo, valor, { shouldValidate: true, shouldDirty: true });
  };

  // Validação em tempo real do NIF
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

  const onSubmit = async (data: ClienteFormInput) => {
    setIsSaving(true);
    const clienteData: ClienteFormData = {
      nome: data.nome ?? "",
      nif: data.nif ?? "",
      morada: data.morada ?? "",
      telefone: data.telefone ?? "",
      email: data.email ?? "",
      tipo: data.tipo ?? "PJ",
      ativo: data.ativo ?? true,
      responsavel: data.responsavel,
    };
    try {
      if (cliente) {
        await store.updateCliente(cliente.id, clienteData);
        success("Sucesso", "Cliente atualizado com sucesso.");
      } else {
        await store.addCliente(clienteData);
        success("Sucesso", "Cliente criado com sucesso.");
      }
      onSave();
    } catch (e) {
      error("Erro", `Falha ao salvar cliente: ${(e as Error).message}`);
    } finally {
        setIsSaving(false);
    }
  };

  const isEditing = !!cliente;
  const titulo = isEditing ? "Editar Cliente" : "Novo Cliente";
  const subtitulo = `Preencha os dados abaixo para ${isEditing ? "atualizar" : "registar"} o cliente.`;

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
          {/* Handle + Header + Segmented */}
          <div className="shrink-0 rounded-t-[16px] bg-white px-4 pt-3 dark:bg-slate-900">
            <div className="mx-auto mb-3 h-1 w-9 rounded-[2px] bg-slate-300 dark:bg-slate-600" />
            <div className="mb-3 flex items-center justify-between gap-3">
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
            <div className="mb-4 flex gap-1.5">
              <button
                type="button"
                onClick={() => setValue("tipo", "PJ")}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-[10px] border-[1.5px] px-2 py-2.5 font-[inherit] text-[12px] font-bold transition-all",
                  tipo === "PJ"
                    ? "border-blue-600 bg-blue-600 text-white shadow-[0_2px_8px_rgba(59,130,246,0.25)]"
                    : "border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
                )}
              >
                <Building2 size={13} /> Empresa
              </button>
              <button
                type="button"
                onClick={() => setValue("tipo", "PF")}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-[10px] border-[1.5px] px-2 py-2.5 font-[inherit] text-[12px] font-bold transition-all",
                  tipo === "PF"
                    ? "border-blue-600 bg-blue-600 text-white shadow-[0_2px_8px_rgba(59,130,246,0.25)]"
                    : "border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
                )}
              >
                <UserCircle2 size={13} /> Individual
              </button>
            </div>
          </div>

          {/* Scroll + footer dentro do form */}
          <form id="cliente-form-mobile" onSubmit={handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto px-4 pb-4 pt-1">
              {/* Identity hero */}
              <div
                className="rounded-[16px] p-5 text-white"
                style={{ background: "linear-gradient(135deg, #3b82f6, #6366f1)", boxShadow: "0 4px 16px rgba(59,130,246,0.3)" }}
              >
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-[1px] opacity-70">Cliente</p>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/25 bg-white/15 text-[15px] font-extrabold">
                    {getInitials(nomeValor) || "?"}
                  </div>
                  <p className="min-w-0 flex-1 truncate text-[19px] font-extrabold leading-snug">
                    {nomeValor || (isEditing ? "Editar cliente" : "Novo cliente")}
                  </p>
                </div>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  <span className="rounded-md bg-emerald-500/40 px-2.5 py-1 text-[11px] font-semibold">Ativo</span>
                  <span className="rounded-md bg-white/20 px-2.5 py-1 text-[11px] font-semibold">
                    {tipo === "PJ" ? "Pessoa Jurídica" : "Pessoa Física"}
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
                    placeholder={tipo === "PJ" ? "Nome da empresa" : "Nome completo"}
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
                    placeholder={tipo === "PJ" ? "10 dígitos" : "BI ou 10 dígitos"}
                    className="h-auto w-auto max-w-[170px] border-0 bg-transparent p-0 text-right font-mono text-[14px] text-slate-500 shadow-none focus:ring-0 dark:text-slate-400"
                  />
                </div>
                {errors.nif ? (
                  <div className="border-b border-slate-100 px-4 py-2 dark:border-slate-800/80">
                    <p className="text-right text-[11px] text-red-500">{errors.nif.message}</p>
                  </div>
                ) : (
                  <div className="border-b border-slate-100 px-4 py-2 dark:border-slate-800/80">
                    <p className="text-right text-[10px] text-slate-400 dark:text-slate-500">
                      {tipo === "PJ" ? "Empresa: 10 dígitos numéricos" : "PF: BI (14 chars) ou 10 dígitos"}
                    </p>
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
                    placeholder="email@empresa.ao"
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
                    placeholder="Morada do cliente"
                    className="h-auto w-auto max-w-[190px] border-0 bg-transparent p-0 text-right font-[inherit] text-[13px] text-slate-500 shadow-none focus:ring-0 dark:text-slate-400"
                  />
                </div>
                {errors.morada && (
                  <div className="border-b border-slate-100 px-4 py-2 dark:border-slate-800/80">
                    <p className="text-right text-[11px] text-red-500">{errors.morada.message}</p>
                  </div>
                )}
                {tipo === "PJ" && (
                  <div className="flex min-h-[48px] items-center justify-between gap-3 px-4 py-3.5">
                    <label className="shrink-0 text-[14px] font-medium text-slate-900 dark:text-slate-100">Responsável</label>
                    <Input
                      value={responsavelValor}
                      onChange={(e) => setCampo("responsavel", e.target.value)}
                      placeholder="Nome do responsável"
                      className="h-auto w-auto max-w-[170px] border-0 bg-transparent p-0 text-right font-[inherit] text-[13px] text-slate-500 shadow-none focus:ring-0 dark:text-slate-400"
                    />
                  </div>
                )}
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
                  <><Check size={16} strokeWidth={2.5} /> {isEditing ? "Guardar" : "Criar"} Cliente</>
                )}
              </button>
            </div>
          </form>
        </DialogPrimitive.Popup>

        {/* ═══ DESKTOP: EXISTING RIGHT DRAWER (inalterado) ═══ */}
        <DialogPrimitive.Popup
          className="hidden sm:flex fixed right-0 top-0 z-50 h-full w-full max-w-lg flex-col bg-white dark:bg-slate-900 shadow-2xl outline-none transition-transform duration-300 ease-in-out translate-x-full data-open:translate-x-0 data-closed:translate-x-full"
          aria-label={cliente ? "Editar Cliente" : "Novo Cliente"}
        >
          {/* Cabeçalho */}
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 px-6 py-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 shrink-0">
                {cliente ? (
                  <Users size={18} className="text-blue-600 dark:text-blue-400" />
                ) : (
                  <UserPlus size={18} className="text-blue-600 dark:text-blue-400" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-base font-bold text-slate-900 dark:text-white">
                  {cliente ? "Editar Cliente" : "Novo Cliente"}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  Preencha os dados abaixo para {cliente ? "atualizar" : "registar"} o cliente.
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Fechar">
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Abas PJ / PF */}
          <div className="border-b border-slate-100 dark:border-slate-800 px-6 pt-4 pb-0">
            <div className="flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
                <button
                type="button"
                onClick={() => setValue("tipo", "PJ")}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-bold transition-all",
                  tipo === "PJ"
                    ? "bg-white text-blue-700 shadow-sm dark:bg-slate-900 dark:text-blue-300"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                )}
              >
                <Building2 size={15} /> Cliente Empresa
              </button>
              <button
                type="button"
                onClick={() => setValue("tipo", "PF")}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-bold transition-all",
                  tipo === "PF"
                    ? "bg-white text-blue-700 shadow-sm dark:bg-slate-900 dark:text-blue-300"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                )}
              >
                <UserCircle2 size={15} /> Cliente Individual
              </button>
            </div>
          </div>

          {/* Corpo scrollável */}
          <form id="cliente-form" onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-6 space-y-3.5">
            {/* Identificação */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
              <CardHeader icon={<Tag size={15} />} label="Identificação" />
              <div className="grid grid-cols-2 gap-4 p-4">
                <div className="space-y-1.5 col-span-2">
                  <Label required>Nome</Label>
                  <Input
                    {...register("nome")}
                    placeholder={tipo === "PJ" ? "Nome da empresa" : "Nome completo"}
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
                    placeholder={tipo === "PJ" ? "Ex: 5417001234 (10 dígitos)" : "Ex: 005432198LA042 (BI)"}
                    className="h-10"
                  />
                  {errors.nif ? (
                    <p className="text-red-500 text-xs mt-1">{errors.nif.message}</p>
                  ) : (
                    <p className="text-gray-400 text-xs mt-1">
                      {tipo === "PJ" ? "Empresa: 10 dígitos numéricos" : "Pessoa Física: BI (14 chars) ou 10 dígitos"}
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
                    placeholder="email@empresa.ao"
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
                    placeholder="Morada do cliente"
                    className="h-10"
                  />
                  {errors.morada && (
                    <p className="text-red-500 text-sm mt-1">{errors.morada.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Dados da Empresa (apenas PJ) */}
            {tipo === "PJ" && (
              <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
                <CardHeader icon={<Building2 size={15} />} label="Dados da Empresa" />
                <div className="grid grid-cols-2 gap-4 p-4">
                  <div className="space-y-1.5 col-span-2">
                    <Label>Responsável</Label>
                    <Input
                      {...register("responsavel")}
                      placeholder="Nome do responsável"
                      className="h-10"
                    />
                  </div>
                </div>
              </div>
            )}
          </form>

          {/* Rodapé */}
          <footer className="flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800 px-6 py-4">
            <Button disabled={isSaving} variant="outline" type="button" onClick={onClose}>
              Cancelar
            </Button>
            <Button disabled={isSaving} type="submit" form="cliente-form">
              {isSaving ? "Salvando..." : cliente ? "Salvar Alterações" : "Criar Cliente"}
            </Button>
          </footer>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
