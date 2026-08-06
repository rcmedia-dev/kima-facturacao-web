"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Cliente } from "@/lib/types";
import { clienteSchema, ClienteFormData, ClienteFormInput } from "@/lib/schemas";
import { validarNIFAngolano } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useToastContext } from "@/components/ui/toast";
import { useAppStore } from "@/lib/store";

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
    resolver: zodResolver(clienteSchema) as any,
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

  const onSubmit = (data: ClienteFormInput) => {
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
        store.updateCliente(cliente.id, clienteData);
        success("Sucesso", "Cliente atualizado com sucesso.");
      } else {
        store.addCliente(clienteData);
        success("Sucesso", "Cliente criado com sucesso.");
      }
      onSave();
    } catch (e) {
      error("Erro", "Falha ao salvar cliente.");
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {cliente ? "Editar Cliente" : "Novo Cliente"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Tipo</label>
              <Select
                value={tipo}
                onValueChange={(v) => setValue("tipo", v as "PF" | "PJ")}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PJ">Pessoa Jurídica</SelectItem>
                  <SelectItem value="PF">Pessoa Física</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">NIF Angolano</label>
              <Input
                {...register("nif")}
                placeholder={tipo === "PJ" ? "Ex: 5417001234 (10 dígitos)" : "Ex: 005432198LA042 (BI)"}
                className="mt-1"
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

          <div>
            <label className="text-sm font-medium">Nome</label>
            <Input
              {...register("nome")}
              placeholder="Nome do cliente"
              className="mt-1"
            />
            {errors.nome && (
              <p className="text-red-500 text-sm mt-1">{errors.nome.message}</p>
            )}
          </div>

          {tipo === "PJ" && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Responsável</label>
                <Input
                  {...register("responsavel")}
                  placeholder="Nome do responsável"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Inscrição Social</label>
                <Input
                  {...register("inscricaoSocial")}
                  placeholder="IS-2024-001"
                  className="mt-1"
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-sm font-medium">Morada</label>
            <Input
              {...register("morada")}
              placeholder="Morada do cliente"
              className="mt-1"
            />
            {errors.morada && (
              <p className="text-red-500 text-sm mt-1">{errors.morada.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Telefone</label>
              <Input
                {...register("telefone")}
                placeholder="+244 923 000 000"
                className="mt-1"
              />
              {errors.telefone && (
                <p className="text-red-500 text-sm mt-1">{errors.telefone.message}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium">Email</label>
              <Input
                {...register("email")}
                type="email"
                placeholder="email@empresa.ao"
                className="mt-1"
              />
              {errors.email && (
                <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
              )}
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <Button disabled={isSaving} variant="outline" type="button" onClick={onClose}>
              Cancelar
            </Button>
            <Button disabled={isSaving} type="submit">
              {isSaving ? "Salvando..." : cliente ? "Atualizar" : "Criar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
