"use client";

import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Truck, UserPlus, Phone, Tag, Landmark } from "lucide-react";
import { Fornecedor } from "@/lib/types";
import { fornecedorSchema, FornecedorFormInput } from "@/lib/schemas";
import { validarNIFAngolano } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useToastContext } from "@/components/ui/toast";
import { useAppStore } from "@/lib/store";

interface FornecedorFormModalProps {
  fornecedor?: Fornecedor;
  onClose: () => void;
  onSave: () => void;
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