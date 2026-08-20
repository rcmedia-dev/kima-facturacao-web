"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import { useToastContext } from "@/components/ui/toast";
import { SerieNumeracao, TipoDocumento } from "@/lib/types";
import { Plus, Trash2, Loader2, Hash, Star, Info, Check } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { mensagemErro } from "@/lib/utils";

const TIPOS_DISPONIVEIS: { value: TipoDocumento; label: string }[] = [
  { value: "Fatura", label: "Factura" },
  { value: "FaturaRecibo", label: "Factura-Recibo" },
  { value: "NotaCredito", label: "Nota de Crédito" },
  { value: "NotaDebito", label: "Nota de Débito" },
  { value: "Orcamento", label: "Factura pro-forma" },
  { value: "Recibo", label: "Recibo" },
];

export function SeriesManager() {
  const store = useAppStore();
  const { success, error } = useToastContext();
  const [series, setSeries] = useState<SerieNumeracao[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [novaSerie, setNovaSerie] = useState("");
  const [novoTipo, setNovoTipo] = useState<TipoDocumento>("Fatura");

  const carregar = async () => {
    try {
      const res = await fetch("/api/series");
      const json = await res.json();
      if (res.ok && json.success) setSeries(json.data || []);
    } catch (err: unknown) {
      error("Erro", mensagemErro(err, "Erro ao carregar séries"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch("/api/series")
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setSeries(json.data || []);
      })
      .catch((err: unknown) => error("Erro", mensagemErro(err, "Erro ao carregar séries")))
      .finally(() => setLoading(false));
  }, []);

  const criar = async () => {
    const letra = novaSerie.trim().toUpperCase();
    if (!letra) return error("Erro", "Indique a letra da série (ex: A)");
    if (series.some((s) => s.serie === letra && s.tipoDocumento === novoTipo)) {
      return error("Erro", "Já existe uma série com esta letra para este tipo de documento");
    }
    setSaving(true);
    try {
      const res = await fetch("/api/series", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serie: letra, tipoDocumento: novoTipo, predefinida: false }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Erro ao criar série");
      success("Sucesso", `Série ${letra} criada para ${novoTipo}`);
      setNovaSerie("");
      await carregar();
      await store.loadAll();
    } catch (err: unknown) {
      error("Erro", mensagemErro(err));
    } finally {
      setSaving(false);
    }
  };

  const definirPredefinida = async (id: string) => {
    try {
      await fetch("/api/series", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, predefinida: true }),
      });
      await carregar();
      await store.loadAll();
    } catch (err: unknown) {
      error("Erro", mensagemErro(err));
    }
  };

  const atualizarNumero = async (id: string, proximoNumero: number) => {
    try {
      await fetch("/api/series", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, proximoNumero }),
      });
      await carregar();
      await store.loadAll();
    } catch (err: unknown) {
      error("Erro", mensagemErro(err));
    }
  };

  const eliminar = async (s: SerieNumeracao) => {
    if (!confirm(`Eliminar a série ${s.serie} de ${s.tipoDocumento}?`)) return;
    try {
      await fetch(`/api/series?id=${s.id}`, { method: "DELETE" });
      success("Sucesso", "Série eliminada");
      await carregar();
      await store.loadAll();
    } catch (err: unknown) {
      error("Erro", mensagemErro(err));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500 py-6">
        <Loader2 className="w-4 h-4 animate-spin" /> A carregar séries...
      </div>
    );
  }

  const seriesPorTipo = TIPOS_DISPONIVEIS.map((t) => ({
    ...t,
    items: series.filter((s) => s.tipoDocumento === t.value),
  })).filter((t) => t.items.length > 0);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
      <div className="flex items-center justify-between gap-2.5 px-6 py-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <Hash size={18} className="text-blue-600 dark:text-blue-400" />
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">Séries e Numeração</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Numeração sequencial e cronológica por tipo de documento (Art. 10º, alínea b — DP 71/25)
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-5">
        <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 text-xs text-blue-900 dark:text-blue-200">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <p>
            Cada tipo de documento pode ter uma ou mais séries. A série <strong>predefinida</strong> (★) é a usada por
            defeito ao emitir. O próximo número é incrementado automaticamente a cada emissão.
          </p>
        </div>

        {/* Formulário de nova série */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="sm:w-36">
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Letra da Série
            </label>
            <input
              value={novaSerie}
              onChange={(e) => setNovaSerie(e.target.value.toUpperCase())}
              placeholder="A"
              maxLength={4}
              className="input-kima uppercase"
            />
          </div>
          <div className="flex-1">
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Tipo de Documento
            </label>
            <Select value={novoTipo} onValueChange={(v) => setNovoTipo((v ?? "Fatura") as TipoDocumento)}>
              <SelectTrigger className="bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 h-10 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIPOS_DISPONIVEIS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <button
              onClick={criar}
              disabled={saving || !novaSerie.trim()}
              className="btn-primary h-10 px-4 text-xs w-full sm:w-auto"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Adicionar Série
            </button>
          </div>
        </div>

        {/* Listagem por tipo */}
        {seriesPorTipo.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">
            Sem séries configuradas. Ao emitir, a série &quot;A&quot; é criada automaticamente.
          </p>
        ) : (
          <div className="space-y-4">
            {seriesPorTipo.map((grupo) => (
              <div key={grupo.value} className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 text-xs font-bold text-slate-700 dark:text-slate-200">
                  {grupo.label}
                </div>
                <table className="w-full text-xs">
                  <thead className="bg-white dark:bg-slate-900">
                    <tr className="text-slate-500 dark:text-slate-400 text-[11px]">
                      <th className="text-left px-4 py-2 font-semibold">Série</th>
                      <th className="text-right px-4 py-2 font-semibold">Próximo Nº</th>
                      <th className="text-center px-4 py-2 font-semibold">Predefinida</th>
                      <th className="px-2 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                    {grupo.items.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-2 font-mono font-bold text-slate-900 dark:text-white">
                          {s.serie}
                        </td>
                        <td className="px-4 py-2 text-right">
                          <input
                            type="number"
                            min={1}
                            value={s.proximoNumero}
                            onChange={(e) => atualizarNumero(s.id!, parseInt(e.target.value, 10) || 1)}
                            className="w-20 text-right input-kima !py-1 !h-7 text-xs"
                          />
                        </td>
                        <td className="px-4 py-2 text-center">
                          <button
                            onClick={() => s.predefinida ? null : definirPredefinida(s.id!)}
                            title={s.predefinida ? "Série predefinida" : "Definir como predefinida"}
                            className={cn(
                              "inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold border transition-colors",
                              s.predefinida
                                ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800"
                                : "bg-slate-50 text-slate-400 border-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700 hover:text-amber-600 hover:border-amber-300"
                            )}
                          >
                            {s.predefinida ? <Check className="w-3 h-3" /> : <Star className="w-3 h-3" />}
                            {s.predefinida ? "Predefinida" : "Definir"}
                          </button>
                        </td>
                        <td className="px-2 py-2 text-right">
                          <button
                            onClick={() => eliminar(s)}
                            title="Eliminar série"
                            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
