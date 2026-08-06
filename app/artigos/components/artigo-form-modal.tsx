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
import { Artigo } from "@/lib/types";
import { artigoSchemaInput, ArtigoFormInput } from "@/lib/schemas";
import { useState } from "react";
import { useToastContext } from "@/components/ui/toast";
import { useAppStore } from "@/lib/store";

interface ArtigoFormModalProps {
  artigo?: Artigo;
  onClose: () => void;
  onSave: () => void;
}

export function ArtigoFormModal({
  artigo,
  onClose,
  onSave,
}: ArtigoFormModalProps) {
  const store = useAppStore();
  const [isSaving, setIsSaving] = useState(false);
  const { success, error } = useToastContext();
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<ArtigoFormInput>({
    resolver: zodResolver(artigoSchemaInput),
    defaultValues: artigo
      ? {
          codigo: artigo.codigo,
          descricao: artigo.descricao,
          preco: artigo.preco,
          taxaIVA: String(artigo.taxaIVA) as "0" | "7" | "14",
          categoria: artigo.categoria || "Geral",
          unidadeMedida: artigo.unidadeMedida || "UN",
          stock: artigo.stock || 0,
          stockMinimo: artigo.stockMinimo || 0,
          ativo: artigo.ativo ?? true,
        }
      : {
          taxaIVA: "14" as const,
          categoria: "Geral",
          unidadeMedida: "UN" as const,
          stock: 0,
          stockMinimo: 0,
          ativo: true,
        },
  });

  const taxaIVA = watch("taxaIVA");

  const onSubmit = (data: ArtigoFormInput) => {
    setIsSaving(true);
    const artigoData = {
      codigo: data.codigo,
      descricao: data.descricao,
      preco: data.preco,
      taxaIVA: parseInt(data.taxaIVA) as 0 | 7 | 14,
      categoria: data.categoria ?? "Geral",
      unidadeMedida: (data.unidadeMedida ?? "UN") as "UN" | "KG" | "M" | "M2" | "L" | "H" | "DIA" | "MES",
      stock: data.stock ?? 0,
      stockMinimo: data.stockMinimo ?? 0,
      ativo: data.ativo ?? true,
    };
    try {
      if (artigo) {
        store.updateArtigo(artigo.id, artigoData);
        success("Sucesso", "Artigo atualizado com sucesso.");
      } else {
        store.addArtigo(artigoData);
        success("Sucesso", "Artigo criado com sucesso.");
      }
      onSave();
    } catch (e) {
      error("Erro", "Falha ao salvar artigo.");
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {artigo ? "Editar Artigo" : "Novo Artigo"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Código</label>
              <Input
                {...register("codigo")}
                placeholder="Ex: PROD-001"
                className="mt-1"
              />
              {errors.codigo && (
                <p className="text-red-500 text-sm mt-1">{errors.codigo.message}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium">Categoria</label>
              <Input
                {...register("categoria")}
                placeholder="Ex: Serviços"
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Descrição</label>
            <Input
              {...register("descricao")}
              placeholder="Descrição do artigo"
              className="mt-1"
            />
            {errors.descricao && (
              <p className="text-red-500 text-sm mt-1">{errors.descricao.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Preço (AOA)</label>
              <Input
                {...register("preco", { valueAsNumber: true })}
                type="number"
                placeholder="0.00"
                step="0.01"
                min="0"
                className="mt-1"
              />
              {errors.preco && (
                <p className="text-red-500 text-sm mt-1">{errors.preco.message}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium">Taxa de IVA (%)</label>
              <Select
                value={taxaIVA}
                onValueChange={(value) => setValue("taxaIVA", value as "0" | "7" | "14")}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">0% (Isento)</SelectItem>
                  <SelectItem value="7">7%</SelectItem>
                  <SelectItem value="14">14%</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Stock Atual</label>
              <Input
                {...register("stock", { valueAsNumber: true })}
                type="number"
                min="0"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Stock Mínimo</label>
              <Input
                {...register("stockMinimo", { valueAsNumber: true })}
                type="number"
                min="0"
                className="mt-1"
              />
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <Button disabled={isSaving} variant="outline" type="button" onClick={onClose}>
              Cancelar
            </Button>
            <Button disabled={isSaving} type="submit">
              {isSaving ? "Salvando..." : artigo ? "Atualizar" : "Criar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
