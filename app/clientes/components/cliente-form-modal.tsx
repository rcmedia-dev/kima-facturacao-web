"use client";

import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Users, UserPlus, Building2, UserCircle2, Phone, Tag } from "lucide-react";
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
          inscricaoSocial: cliente.inscricaoSocial,
        }
      : {
          tipo: "PJ",
          ativo: true,
        },
  });

  const tipo = watch("tipo");
  const nif = watch("nif");

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
      inscricaoSocial: data.inscricaoSocial,
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
        <DialogPrimitive.Popup
          className="fixed right-0 top-0 z-50 flex h-full w-full max-w-lg flex-col bg-white dark:bg-slate-900 shadow-2xl outline-none transition-transform duration-300 ease-in-out translate-x-full data-open:translate-x-0 data-closed:translate-x-full"
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
                <Building2 size={15} /> Pessoa Jurídica
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
                <UserCircle2 size={15} /> Pessoa Física
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
                  <Label required>NIF Angolano</Label>
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
                  <div className="space-y-1.5">
                    <Label>Responsável</Label>
                    <Input
                      {...register("responsavel")}
                      placeholder="Nome do responsável"
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Inscrição Social</Label>
                    <Input
                      {...register("inscricaoSocial")}
                      placeholder="IS-2024-001"
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