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
import { X, PackagePlus, Boxes, Tag, Coins, Box, Wrench, Check, Loader2 } from "lucide-react";
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

const CATEGORIAS_PRODUTO = [
  "Geral",
  "Alimentos e Bebidas",
  "Electrónica",
  "Vestuário",
  "Material de Escritório",
  "Consumíveis",
  "Construção e Ferramentas",
  "Saúde e Higiene",
  "Automóvel",
  "Combustíveis",
  "Matérias-Primas",
  "Tecnologia",
  "Personalizado",
];

const CATEGORIAS_SERVICO = [
  "Geral",
  "Consultoria",
  "Manutenção",
  "Transporte",
  "Formação",
  "Serviços Profissionais",
  "Telecomunicações",
  "Serviços Gerais",
  "Personalizado",
];

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
  const descricaoValor = watch("descricao") ?? "";
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
  const [categoriaPersonalizada, setCategoriaPersonalizada] = useState<string>(() => {
    const cat = artigo?.categoria || "Geral";
    const cats = (artigo?.tipo ?? "Produto") === "Serviço" ? CATEGORIAS_SERVICO : CATEGORIAS_PRODUTO;
    return cats.includes(cat) ? "" : cat;
  });

  const isEditing = !!artigo;
  const titulo = `${isEditing ? "Editar" : "Novo"} ${tipo}`;
  const subtitulo = `Preencha os dados abaixo para ${isEditing ? "atualizar" : "registar"} o ${tipo.toLowerCase()}.`;

  const unidadesDisponiveis = tipo === "Serviço" ? SERVICO_UNIDADES : PRODUTO_UNIDADES;
  const categoriasDisponiveis = tipo === "Serviço" ? CATEGORIAS_SERVICO : CATEGORIAS_PRODUTO;

  const categoriaAtual = watch("categoria") ?? "Geral";
  const isPersonalizado = categoriaAtual === "Personalizado";

  const mudarTipo = (novoTipo: TipoArtigo) => {
    if (novoTipo === tipo) return;
    setValue("tipo", novoTipo, { shouldValidate: false });
    if (novoTipo === "Serviço" && !SERVICO_UNIDADES.includes(unidadeMedida)) {
      setValue("unidadeMedida", "MES");
    }
    if (novoTipo === "Produto" && !PRODUTO_UNIDADES.includes(unidadeMedida)) {
      setValue("unidadeMedida", "UN");
    }
    const cats = novoTipo === "Serviço" ? CATEGORIAS_SERVICO : CATEGORIAS_PRODUTO;
    if (!cats.includes(categoriaAtual)) {
      setValue("categoria", "Geral");
      setCategoriaPersonalizada("");
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
      categoria: (data.categoria === "Personalizado" && categoriaPersonalizada) ? categoriaPersonalizada : (data.categoria ?? "Geral"),
      unidadeMedida: (data.unidadeMedida ?? "UN") as UnidadeMedida,
      stock: stockTexto === "" ? 0 : parseInt(stockTexto, 10) || 0,
      stockMinimo: stockMinimoTexto === "" ? 0 : parseInt(stockMinimoTexto, 10) || 0,
      ativo: data.ativo ?? true,
      codigo: (artigo?.codigo && artigo.codigo.trim()) || "",
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
    <div className="flex items-center gap-2 border-b border-blue-100 bg-blue-50/70 px-4 py-2.5 dark:border-slate-800 dark:bg-slate-800/40">
      <span className="text-blue-600 dark:text-blue-400">{icon}</span>
      <span className="text-[12.5px] font-bold text-blue-700 dark:text-blue-200">{label}</span>
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

        {/* ═══ MOBILE: V2 BOTTOM SHEET ═══ */}
        <DialogPrimitive.Popup
          className="fixed inset-x-0 bottom-0 top-auto z-50 flex flex-col bg-white dark:bg-slate-900 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_16px_rgba(0,0,0,0.3)] outline-none translate-y-full data-open:translate-y-0 data-closed:translate-y-full transition-transform duration-300 ease-out rounded-t-[16px] max-h-[92vh]
            sm:hidden"
          aria-label={titulo}
        >
          {/* Handle + Header + Segmented — all inside the sheet header */}
          <div className="shrink-0 bg-white dark:bg-slate-900 rounded-t-[16px] px-4 pt-3 pb-0">
            {/* Handle */}
            <div className="w-9 h-1 rounded-[2px] bg-slate-300 dark:bg-slate-600 mx-auto mb-3" />

            {/* Title row */}
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-[17px] font-extrabold text-slate-900 dark:text-white">{titulo}</p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">{subtitulo}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center border-0 cursor-pointer"
              >
                <X size={14} className="text-slate-500 dark:text-slate-400" />
              </button>
            </div>

            {/* Segmented Tabs */}
            <div className="flex gap-1.5 mb-4">
              <button
                type="button"
                onClick={() => mudarTipo("Produto")}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-[10px] py-2.5 px-2 text-[12px] font-bold border-[1.5px] transition-all font-[inherit]",
                  tipo === "Produto"
                    ? "bg-blue-600 text-white border-blue-600 shadow-[0_2px_8px_rgba(59,130,246,0.25)]"
                    : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                )}
              >
                <Box size={13} /> Produto
              </button>
              <button
                type="button"
                onClick={() => mudarTipo("Serviço")}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-[10px] py-2.5 px-2 text-[12px] font-bold border-[1.5px] transition-all font-[inherit]",
                  tipo === "Serviço"
                    ? "bg-blue-600 text-white border-blue-600 shadow-[0_2px_8px_rgba(59,130,246,0.25)]"
                    : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                )}
              >
                <Wrench size={13} /> Serviço
              </button>
            </div>
          </div>

          {/* Scrollable content */}
          <form id="artigo-form-mobile" onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-4 pt-1 pb-4">
            {/* Price Hero Card — exactly as V2: gradient, no section wrapper */}
            <div className="rounded-[16px] p-5 mb-3.5 text-white" style={{ background: "linear-gradient(135deg, #3b82f6, #6366f1)", boxShadow: "0 4px 16px rgba(59,130,246,0.3)" }}>
              <p className="text-[10px] font-semibold uppercase tracking-[1px] opacity-70 mb-1">Preço de Venda</p>
              <div className="flex items-baseline gap-1">
                <span className="text-[32px] font-black tracking-tight leading-none">{precoTexto || "0"}</span>
                <span className="text-[13px] font-semibold opacity-70">AOA</span>
              </div>
              <div className="flex gap-2 mt-2.5">
                <span className="bg-white/20 px-2.5 py-1 rounded-md text-[11px] font-semibold">IVA {taxaIVA}%</span>
                <span className="bg-white/20 px-2.5 py-1 rounded-md text-[11px] font-semibold">{tipo}</span>
              </div>
              {errors.preco && (
                <p className="text-[11px] text-red-200 mt-1.5">{errors.preco.message}</p>
              )}
            </div>

            {/* All fields — ONE flat iOS card, no section headers */}
            <div className="bg-white dark:bg-slate-900 rounded-[16px] shadow-[0_1px_3px_rgba(0,0,0,0.06)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.3)] overflow-hidden mb-3">
              <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 dark:border-slate-800/80 min-h-[48px]">
                <label className="text-[14px] text-slate-900 dark:text-slate-100 font-medium">Unidade</label>
                <select
                  value={unidadeMedida}
                  onChange={(e) => setValue("unidadeMedida", e.target.value as UnidadeMedida)}
                  className="w-auto border-0 outline-none text-[14px] text-slate-500 dark:text-slate-400 bg-transparent p-0 text-right font-[inherit] appearance-none cursor-pointer"
                >
                  {unidadesDisponiveis.map((u) => (
                    <option key={u} value={u}>{UNIDADE_MEDIDA_LABEL[u]} ({u})</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 dark:border-slate-800/80 min-h-[48px]">
                <label className="text-[14px] text-slate-900 dark:text-slate-100 font-medium shrink-0">Descrição</label>
                <Input
                  value={descricaoValor}
                  onChange={(e) => setValue("descricao", e.target.value, { shouldValidate: true, shouldDirty: true })}
                  placeholder="Descrição do artigo"
                  className="w-auto max-w-[200px] border-0 bg-transparent p-0 h-auto text-[14px] text-slate-500 dark:text-slate-400 shadow-none focus:ring-0 text-right font-[inherit]"
                />
              </div>
              {errors.descricao && (
                <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800/80">
                  <p className="text-red-500 text-[11px] text-right">{errors.descricao.message}</p>
                </div>
              )}
              <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 dark:border-slate-800/80 min-h-[48px]">
                <label className="text-[14px] text-slate-900 dark:text-slate-100 font-medium">Categoria</label>
                <select
                  value={isPersonalizado ? "Personalizado" : categoriaAtual}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (!value) return;
                    if (value === "Personalizado") {
                      setValue("categoria", categoriaPersonalizada || "Personalizado");
                    } else {
                      setValue("categoria", value);
                      setCategoriaPersonalizada("");
                    }
                  }}
                  className="w-auto border-0 outline-none text-[14px] text-slate-500 dark:text-slate-400 bg-transparent p-0 text-right font-[inherit] appearance-none cursor-pointer max-w-[140px] truncate"
                >
                  {categoriasDisponiveis.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              {isPersonalizado && (
                <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800/80">
                  <Input
                    value={categoriaPersonalizada}
                    onChange={(e) => setCategoriaPersonalizada(e.target.value)}
                    placeholder="Digite a categoria"
                    className="h-11 border border-slate-200 dark:border-slate-700 rounded-xl text-[13px] bg-slate-50 dark:bg-slate-800/60 px-3 focus-visible:ring-blue-500"
                  />
                </div>
              )}
              <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 dark:border-slate-800/80 min-h-[48px]">
                <label className="text-[14px] text-slate-900 dark:text-slate-100 font-medium">Preço (AOA)</label>
                <input
                  inputMode="decimal"
                  value={precoTexto}
                  onChange={onPrecoChange}
                  placeholder="0"
                  className="w-auto border-0 outline-none text-[14px] font-semibold text-slate-500 dark:text-slate-400 bg-transparent p-0 text-right font-mono"
                />
              </div>
              <div className="flex items-center justify-between px-4 py-3.5 min-h-[48px]">
                <label className="text-[14px] text-slate-900 dark:text-slate-100 font-medium">Taxa IVA</label>
                <select
                  value={taxaIVA}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (!value) return;
                    setValue("taxaIVA", value as "0" | "7" | "14");
                  }}
                  className="w-auto border-0 outline-none text-[14px] text-slate-500 dark:text-slate-400 bg-transparent p-0 text-right font-[inherit] appearance-none cursor-pointer"
                >
                  <option value="0">0%</option>
                  <option value="7">7%</option>
                  <option value="14">14%</option>
                </select>
              </div>
            </div>

            {/* Stock — separate iOS card, only for Produto */}
            {tipo === "Produto" ? (
              <div className="bg-white dark:bg-slate-900 rounded-[16px] shadow-[0_1px_3px_rgba(0,0,0,0.06)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.3)] overflow-hidden mb-3">
                <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 dark:border-slate-800/80 min-h-[48px]">
                  <label className="text-[14px] text-slate-900 dark:text-slate-100 font-medium">Stock Atual</label>
                  <input
                    inputMode="numeric"
                    value={stockTexto}
                    onChange={(e) => onStockChange(e, "stock")}
                    className="w-[60px] border-0 outline-none text-[14px] font-semibold text-slate-500 dark:text-slate-400 bg-transparent p-0 text-right"
                  />
                </div>
                <div className="flex items-center justify-between px-4 py-3.5 min-h-[48px]">
                  <label className="text-[14px] text-slate-900 dark:text-slate-100 font-medium">Stock Mínimo</label>
                  <input
                    inputMode="numeric"
                    value={stockMinimoTexto}
                    onChange={(e) => onStockChange(e, "stockMinimo")}
                    className="w-[60px] border-0 outline-none text-[14px] font-semibold text-slate-500 dark:text-slate-400 bg-transparent p-0 text-right"
                  />
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2.5 rounded-[16px] border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-400 mb-3">
                <Wrench size={15} className="shrink-0 text-teal-600 dark:text-teal-400" />
                Serviços não controlam stock.
              </div>
            )}
          </div>

            {/* Fixed bottom button inside form */}
            <div className="shrink-0 px-4 pt-3 pb-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <button
                type="submit"
                disabled={isSaving}
                className="w-full py-3.5 rounded-[14px] bg-blue-600 hover:bg-blue-700 text-white text-[14px] font-bold border-0 cursor-pointer shadow-[0_4px_12px_rgba(59,130,246,0.3)] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 font-[inherit]"
              >
                {isSaving ? (
                  <><Loader2 size={16} className="animate-spin" /> A guardar...</>
                ) : (
                  <><Check size={16} strokeWidth={2.5} /> Guardar {tipo}</>
                )}
              </button>
            </div>
          </form>
        </DialogPrimitive.Popup>

        {/* ═══ DESKTOP: EXISTING RIGHT DRAWER ═══ */}
        <DialogPrimitive.Popup
          className="hidden sm:flex fixed right-0 top-0 z-50 h-full w-full max-w-lg flex-col bg-white dark:bg-slate-900 shadow-2xl outline-none transition-transform duration-300 ease-in-out translate-x-full data-open:translate-x-0 data-closed:translate-x-full"
          aria-label={titulo}
        >
          {/* Cabeçalho */}
          <div className="flex items-center justify-between gap-3 border-b border-blue-100 dark:border-slate-800 px-6 py-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 shrink-0">
                {isEditing ? (
                  <Boxes size={18} className="text-blue-700 dark:text-blue-300" />
                ) : (
                  <PackagePlus size={18} className="text-blue-700 dark:text-blue-300" />
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
          <div className="border-b border-blue-100 dark:border-slate-800 px-6 pt-4 pb-0">
            <div className="flex gap-1 rounded-xl bg-blue-50 p-1 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => mudarTipo("Produto")}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-bold transition-all",
                  tipo === "Produto"
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-200 dark:shadow-blue-900/40"
                    : "text-slate-500 hover:text-blue-700 dark:text-slate-400 dark:hover:text-slate-200"
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
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-200 dark:shadow-blue-900/40"
                    : "text-slate-500 hover:text-blue-700 dark:text-slate-400 dark:hover:text-slate-200"
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
                    <SelectTrigger className="h-10 border-blue-200 bg-blue-50/40 text-slate-900 shadow-sm hover:border-blue-300 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100">
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
                    className="h-10 border-blue-200 bg-blue-50/40 focus-visible:ring-blue-500"
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
              <div className="space-y-4 p-4">
                <div className="space-y-1.5">
                  <Label required>Categoria</Label>
                  <Select
                    value={isPersonalizado ? "Personalizado" : categoriaAtual}
                    onValueChange={(value) => {
                      if (!value) return;
                      if (value === "Personalizado") {
                        setValue("categoria", categoriaPersonalizada || "Personalizado");
                      } else {
                        setValue("categoria", value);
                        setCategoriaPersonalizada("");
                      }
                    }}
                  >
                    <SelectTrigger className="h-10 w-full border-blue-200 bg-blue-50/40 text-slate-900 shadow-sm hover:border-blue-300 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100">
                      <SelectValue placeholder="Selecionar categoria" />
                    </SelectTrigger>
                    <SelectContent side="bottom" align="start">
                      {categoriasDisponiveis.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {isPersonalizado && (
                    <Input
                      value={categoriaPersonalizada}
                      onChange={(e) => {
                        setCategoriaPersonalizada(e.target.value);
                      }}
                      placeholder="Digite a categoria"
                      className="h-10 mt-2 border-blue-200 bg-blue-50/40 focus-visible:ring-blue-500"
                    />
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label required>Preço (AOA)</Label>
                    <Input
                      inputMode="decimal"
                      value={precoTexto}
                      onChange={onPrecoChange}
                      placeholder="Ex: 185.000 ou 185.000,50"
                      className="h-10 border-blue-200 bg-blue-50/40 text-right font-mono focus-visible:ring-blue-500"
                    />
                    {errors.preco && (
                      <p className="text-red-500 text-sm mt-1">{errors.preco.message}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label required>Taxa de IVA</Label>
                    <Select
                      value={taxaIVA}
                      onValueChange={(value) => {
                        if (!value) return;
                        setValue("taxaIVA", value as "0" | "7" | "14");
                      }}
                    >
                      <SelectTrigger className="h-10 border-blue-200 bg-blue-50/40 text-slate-900 shadow-sm hover:border-blue-300 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent side="bottom" align="start">
                        <SelectItem value="0">0% (Isento)</SelectItem>
                        <SelectItem value="7">7%</SelectItem>
                        <SelectItem value="14">14%</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            {/* Stock */}
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
                      className="h-10 border-blue-200 bg-blue-50/40 focus-visible:ring-blue-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Stock Mínimo</Label>
                    <Input
                      inputMode="numeric"
                      value={stockMinimoTexto}
                      onChange={(e) => onStockChange(e, "stockMinimo")}
                      className="h-10 border-blue-200 bg-blue-50/40 focus-visible:ring-blue-500"
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

          {/* Desktop Footer */}
          <footer className="flex items-center justify-end gap-3 border-t border-blue-100 dark:border-slate-800 px-6 py-4">
            <Button disabled={isSaving} variant="outline" type="button" onClick={onClose}>
              Cancelar
            </Button>
            <Button disabled={isSaving} type="submit" form="artigo-form">
              {isSaving ? "A guardar..." : isEditing ? "Guardar alterações" : "Guardar"}
            </Button>
          </footer>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
