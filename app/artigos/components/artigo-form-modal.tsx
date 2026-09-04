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
import { X, PackagePlus, Boxes, Tag, Coins, Box, Wrench } from "lucide-react";
import { Artigo, TipoArtigo, UnidadeMedida } from "@/lib/types";
import { artigoSchemaInput, ArtigoFormInput } from "@/lib/schemas";
import { useState } from "react";
import { useToastContext } from "@/components/ui/toast";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";

interface ArtigoFormModalProps {
  artigo?: Artigo;
  onClose: () => void;
  onSave: () => void;
}

const UNIDADE_MEDIDA_LABEL: Record<string, string> = {
  UN: "Unidade",
  KG: "Kilogramas",
  M: "Metros",
  M2: "Metros Quadrados",
  L: "Litros",
  H: "Horas",
  DIA: "Dias",
  MES: "Meses",
};

const PRODUTO_UNIDADES: UnidadeMedida[] = ["UN", "KG", "M", "M2", "L"];
const SERVICO_UNIDADES: UnidadeMedida[] = ["UN", "H", "DIA", "MES"];

function parsePreco(texto: string): number {
  const normalizado = texto.replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  const valor = parseFloat(normalizado);
  return isNaN(valor) ? 0 : valor;
}

function formatarPrecoInput(raw: string): string {
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
          tipo: artigo.tipo ?? "Produto",
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
          tipo: "Produto" as const,
          preco: 0,
          taxaIVA: "14" as const,
          categoria: "Geral",
          unidadeMedida: "UN" as const,
          stock: 0,
          stockMinimo: 0,
          ativo: true,
        },
  });

  const tipo = watch("tipo") ?? "Produto";
  const taxaIVA = watch("taxaIVA") ?? "14";
  const unidadeMedida = watch("unidadeMedida") ?? "UN";
  const preco = watch("preco");
  const [precoTexto, setPrecoTexto] = useState<string>(() =>
    preco && preco > 0 ? formatarPrecoInput(String(preco).replace(".", ",")) : ""
  );
  const [stockTexto, setStockTexto] = useState<string>(() =>
    String(artigo?.stock ?? 0)
  );
  const [stockMinimoTexto, setStockMinimoTexto] = useState<string>(() =>
    String(artigo?.stockMinimo ?? 0)
  );

  const isEditing = !!artigo;
  const titulo = `${isEditing ? "Editar" : "Novo"} ${tipo}`;
  const subtitulo = `Preencha os dados abaixo para ${isEditing ? "atualizar" : "registar"} o ${tipo.toLowerCase()}.`;

  const unidadesDisponiveis = tipo === "Serviço" ? SERVICO_UNIDADES : PRODUTO_UNIDADES;

  const mudarTipo = (novoTipo: TipoArtigo) => {
    if (novoTipo === tipo) return;
    setValue("tipo", novoTipo, { shouldValidate: false });
    if (novoTipo === "Serviço" && !SERVICO_UNIDADES.includes(unidadeMedida)) {
      setValue("unidadeMedida", "MES");
    }
    if (novoTipo === "Produto" && !PRODUTO_UNIDADES.includes(unidadeMedida)) {
      setValue("unidadeMedida", "UN");
    }
  };

  const onPrecoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const el = e.target;
    const cursorAntes = el.selectionStart ?? el.value.length;
    const textoAntesCursor = el.value.slice(0, cursorAntes);
    const digitosAntesCursor = textoAntesCursor.replace(/\D/g, "");
    const raw = el.value.replace(/[^\d,]/g, "");
    const formatado = formatarPrecoInput(raw);
    setPrecoTexto(formatado);
    setValue("preco", parsePreco(formatado), { shouldValidate: true });
    requestAnimationFrame(() => {
      const novoCursor = posCaretPosDigitos(formatado, digitosAntesCursor.length);
      el.setSelectionRange(novoCursor, novoCursor);
    });
  };

  const onStockChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    campo: "stock" | "stockMinimo"
  ) => {
    const raw = e.target.value.replace(/\D/g, "");
    if (campo === "stock") {
      setStockTexto(raw);
      setValue("stock", raw === "" ? 0 : parseInt(raw, 10), { shouldValidate: true });
    } else {
      setStockMinimoTexto(raw);
      setValue("stockMinimo", raw === "" ? 0 : parseInt(raw, 10), { shouldValidate: true });
    }
  };

  const onSubmit = async (data: ArtigoFormInput) => {
    setIsSaving(true);
    const artigoData = {
      tipo: data.tipo ?? "Produto",
      descricao: data.descricao,
      preco:
        data.preco ?? (precoTexto === "" ? 0 : parsePreco(precoTexto)),
      taxaIVA: parseInt(data.taxaIVA) as 0 | 7 | 14,
      categoria: data.categoria ?? "Geral",
      unidadeMedida: (data.unidadeMedida ?? "UN") as UnidadeMedida,
      stock: stockTexto === "" ? 0 : parseInt(stockTexto, 10) || 0,
      stockMinimo: stockMinimoTexto === "" ? 0 : parseInt(stockMinimoTexto, 10) || 0,
      ativo: data.ativo ?? true,
    };
    try {
      if (artigo) {
        await store.updateArtigo(artigo.id, artigoData);
        success("Sucesso", `${tipo} atualizado com sucesso.`);
      } else {
        await store.addArtigo(artigoData);
        success("Sucesso", `${tipo} criado com sucesso.`);
      }
      onSave();
    } catch (e) {
      error("Erro", `Falha ao salvar ${tipo.toLowerCase()}: ${(e as Error).message}`);
    } finally {
        setIsSaving(false);
    }
  };

  const CardHeader = ({ icon, label }: { icon: React.ReactNode; label: string }) => (
    <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/60 px-4 py-2.5 dark:border-slate-800 dark:bg-slate-800/40">
      <span className="text-teal-600 dark:text-teal-400">{icon}</span>
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
          aria-label={titulo}
        >
          {/* Cabeçalho */}
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 px-6 py-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-900/30 shrink-0">
                {isEditing ? (
                  <Boxes size={18} className="text-teal-600 dark:text-teal-400" />
                ) : (
                  <PackagePlus size={18} className="text-teal-600 dark:text-teal-400" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-base font-bold text-slate-900 dark:text-white">{titulo}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{subtitulo}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Fechar">
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Abas Produto / Serviço */}
          <div className="border-b border-slate-100 dark:border-slate-800 px-6 pt-4 pb-0">
            <div className="flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => mudarTipo("Produto")}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-bold transition-all",
                  tipo === "Produto"
                    ? "bg-white text-teal-700 shadow-sm dark:bg-slate-900 dark:text-teal-300"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                )}
              >
                <Box size={15} /> Produto
              </button>
              <button
                type="button"
                onClick={() => mudarTipo("Serviço")}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-bold transition-all",
                  tipo === "Serviço"
                    ? "bg-white text-teal-700 shadow-sm dark:bg-slate-900 dark:text-teal-300"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                )}
              >
                <Wrench size={15} /> Serviço
              </button>
            </div>
          </div>

          {/* Corpo scrollável */}
          <form id="artigo-form" onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-6 space-y-3.5">
            {/* Identificação */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
              <CardHeader icon={<Tag size={15} />} label="Identificação" />
              <div className="grid grid-cols-2 gap-4 p-4">
                <div className="space-y-1.5 col-span-2">
                  <Label required>Unidade</Label>
                  <Select
                    value={unidadeMedida}
                    onValueChange={(value) => setValue("unidadeMedida", value as UnidadeMedida)}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {unidadesDisponiveis.map((u) => (
                        <SelectItem key={u} value={u}>
                          {UNIDADE_MEDIDA_LABEL[u]} ({u})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label required>Descrição</Label>
                  <Input
                    {...register("descricao")}
                    placeholder="Descrição do artigo ou serviço"
                    className="h-10"
                  />
                  {errors.descricao && (
                    <p className="text-red-500 text-sm mt-1">{errors.descricao.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Preço & IVA */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
              <CardHeader icon={<Coins size={15} />} label="Preço & IVA" />
              <div className="grid grid-cols-3 gap-4 p-4">
                <div className="space-y-1.5">
                  <Label required>Categoria</Label>
                  <Input
                    {...register("categoria")}
                    placeholder={tipo === "Serviço" ? "Ex: Serviços" : "Ex: Consumíveis"}
                    className="h-10"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label required>Preço (AOA)</Label>
                  <Input
                    inputMode="decimal"
                    value={precoTexto}
                    onChange={onPrecoChange}
                    placeholder="Ex: 185.000 ou 185.000,50"
                    className="h-10 text-right font-mono"
                  />
                  {errors.preco && (
                    <p className="text-red-500 text-sm mt-1">{errors.preco.message}</p>
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
              </div>
            </div>

            {/* Serviços não controlam stock */}
            {tipo === "Produto" ? (
              <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
                <CardHeader icon={<Boxes size={15} />} label="Stock" />
                <div className="grid grid-cols-2 gap-4 p-4">
                  <div className="space-y-1.5">
                    <Label>Stock Atual</Label>
                    <Input
                      inputMode="numeric"
                      value={stockTexto}
                      onChange={(e) => onStockChange(e, "stock")}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Stock Mínimo</Label>
                    <Input
                      inputMode="numeric"
                      value={stockMinimoTexto}
                      onChange={(e) => onStockChange(e, "stockMinimo")}
                      className="h-10"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2.5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-400">
                <Wrench size={15} className="shrink-0 text-teal-600 dark:text-teal-400" />
                Serviços não controlam stock — apenas produtos possuem controlo de inventário.
              </div>
            )}
          </form>

          {/* Rodapé */}
          <footer className="flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800 px-6 py-4">
            <Button disabled={isSaving} variant="outline" type="button" onClick={onClose}>
              Cancelar
            </Button>
            <Button disabled={isSaving} type="submit" form="artigo-form">
              {isSaving ? "Salvando..." : isEditing ? "Salvar Alterações" : `Criar ${tipo}`}
            </Button>
          </footer>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
