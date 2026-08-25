"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import { useToastContext } from "@/components/ui/toast";
import { SerieNumeracao, TipoDocumento } from "@/lib/types";
import { Plus, Trash2, Loader2, Hash, Star, Check } from "lucide-react";
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

const TIPO_LABELS: Record<TipoDocumento, string> = {
  Fatura: "Factura",
  FaturaRecibo: "Factura-Recibo",
  NotaCredito: "Nota de Crédito",
  NotaDebito: "Nota de Débito",
  Orcamento: "Factura pro-forma",
  Recibo: "Recibo",
};

const TIPOS_PERMITIDOS: TipoDocumento[] = [
  "Fatura",
  "FaturaRecibo",
  "NotaCredito",
  "NotaDebito",
  "Orcamento",
  "Recibo",
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
      if (res.ok && json.success) {
        const filtradas = (json.data || []).filter((s: SerieNumeracao) =>
          TIPOS_PERMITIDOS.includes(s.tipoDocumento)
        );
        setSeries(filtradas);
      }
    } catch (err: unknown) {
      error("Erro", mensagemErro(err, "Erro ao carregar séries"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ativo = true;
    fetch("/api/series")
      .then((res) => res.json())
      .then((json) => {
        if (!ativo) return;
        if (json.success) {
          const filtradas = (json.data || []).filter((s: SerieNumeracao) =>
            TIPOS_PERMITIDOS.includes(s.tipoDocumento)
          );
          setSeries(filtradas);
        }
      })
      .catch((err: unknown) => {
        if (ativo) error("Erro", mensagemErro(err, "Erro ao carregar séries"));
      })
      .finally(() => {
        if (ativo) setLoading(false);
      });
    return () => {
      ativo = false;
    };
  }, [error]);

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
      success("Sucesso", `Série ${letra} criada para ${TIPO_LABELS[novoTipo] || novoTipo}`);
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
    if (!confirm(`Eliminar a série ${s.serie} de ${TIPO_LABELS[s.tipoDocumento] || s.tipoDocumento}?`)) return;
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
      <div className="card-kima p-6 flex items-center gap-2 text-sm text-slate-500 py-6 w-full">
        <Loader2 className="w-4 h-4 animate-spin" /> A carregar séries...
      </div>
    );
  }

  return (
    <div className="card-kima p-6 space-y-5 w-full">
      <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 dark:border-slate-800">
        <Hash size={18} className="text-blue-600 dark:text-blue-400" />
        <div>
          <h3 className="font-bold text-slate-900 dark:text-white text-base">Séries e Numeração</h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Numeração sequencial e cronológica (Art. 10º, alínea b — DP 71/25)
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Barra superior limpa para adicionar nova série */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
          <div className="sm:col-span-5">
            <label className="label-kima">Tipo de Documento</label>
            <Select value={novoTipo} onValueChange={(v) => setNovoTipo((v ?? "Fatura") as TipoDocumento)}>
              <SelectTrigger className="input-kima h-10 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIPOS_DISPONIVEIS.map((t) => (
                  <SelectItem key={t.value} value={t.value} className="text-xs">
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-4">
            <label className="label-kima">Letra da Série</label>
            <input
              value={novaSerie}
              onChange={(e) => setNovaSerie(e.target.value.toUpperCase())}
              placeholder="Ex: A"
              maxLength={4}
              className="input-kima h-10 text-xs uppercase"
            />
          </div>
          <div className="sm:col-span-3">
            <button
              onClick={criar}
              disabled={saving || !novaSerie.trim()}
              className="btn-primary h-10 px-4 text-xs w-full"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Adicionar
            </button>
          </div>
        </div>

        {/* Tabela Unificada Contínua Preenchendo 100% */}
        {series.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-8">
            Sem séries configuradas. Ao emitir, a série &quot;A&quot; é criada automaticamente.
          </p>
        ) : (
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden w-full">
            <table className="w-full text-xs table-kima">
              <thead>
                <tr>
                  <th className="py-2.5 px-4 font-semibold">TIPO DE DOC.</th>
                  <th className="py-2.5 px-4 font-semibold">SÉRIE</th>
                  <th className="py-2.5 px-4 text-right font-semibold">PRÓXIMO Nº</th>
                  <th className="py-2.5 px-4 text-center font-semibold">ESTADO / PREDEFINIDA</th>
                  <th className="py-2.5 px-4 text-right font-semibold">AÇÕES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                {series.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-4 font-medium text-slate-800 dark:text-slate-200">
                      {TIPO_LABELS[s.tipoDocumento] || s.tipoDocumento}
                    </td>
                    <td className="py-2.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                      {s.serie}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                      <input
                        type="number"
                        min={1}
                        value={s.proximoNumero}
                        onChange={(e) => atualizarNumero(s.id!, parseInt(e.target.value, 10) || 1)}
                        className="w-20 text-right input-kima !py-1 !h-7 text-xs font-mono tabular-nums inline-block"
                      />
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <button
                        onClick={() => s.predefinida ? null : definirPredefinida(s.id!)}
                        title={s.predefinida ? "Série predefinida" : "Definir como predefinida"}
                        className={cn(
                          "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-colors",
                          s.predefinida
                            ? "badge-success border-emerald-200 dark:border-emerald-800"
                            : "bg-slate-50 text-slate-400 border-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700 hover:text-emerald-600 hover:border-emerald-300"
                        )}
                      >
                        {s.predefinida ? <Check className="w-3 h-3" /> : <Star className="w-3 h-3" />}
                        {s.predefinida ? "Predefinida" : "Definir"}
                      </button>
                    </td>
                    <td className="py-2.5 px-4 text-right">
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
        )}
      </div>
    </div>
  );
}
