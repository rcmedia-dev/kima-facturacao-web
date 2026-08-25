"use client";

import { useMemo } from "react";
import { useAppStore } from "@/lib/store";
import { formatMoedaAOA } from "@/lib/formatters";
import { BarChart3 } from "lucide-react";

const MESES_ABREV = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export function DashboardGraficoFaturacao() {
  const documentos = useAppStore((s) => s.documentos);

  const dados = useMemo(() => {
    const agora = new Date();
    const meses: { label: string; total: number }[] = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(agora.getFullYear(), agora.getMonth() - i, 1);
      const inicio = new Date(d.getFullYear(), d.getMonth(), 1);
      const fim = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);

      const totalMes = documentos
        .filter((doc) => {
          if (doc.status === "Cancelado") return false;
          if (doc.tipo !== "Fatura" && doc.tipo !== "FaturaRecibo") return false;
          const data = new Date(doc.dataEmissao);
          return data >= inicio && data <= fim;
        })
        .reduce((sum, doc) => sum + (doc.total || 0), 0);

      meses.push({
        label: MESES_ABREV[d.getMonth()],
        total: totalMes,
      });
    }

    return meses;
  }, [documentos]);

  const maximo = Math.max(...dados.map((d) => d.total), 1);

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-600 to-indigo-700 rounded-xl p-4 shadow-md">
      <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/10 rounded-full" />
      <div className="absolute -bottom-6 -left-6 w-28 h-28 bg-white/10 rounded-full" />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-bold text-white text-sm">
              Evolução de Facturação
            </h3>
            <p className="text-[11px] text-blue-100 mt-0.5">
              Últimos 6 meses
            </p>
          </div>
          <span className="w-7 h-7 rounded-lg bg-white/20 text-white flex items-center justify-center">
            <BarChart3 size={14} />
          </span>
        </div>

        <div className="flex items-end gap-2 h-24">
          {dados.map((mes, i) => {
            const altura = maximo > 0 ? (mes.total / maximo) * 100 : 0;
            const isAtual = i === dados.length - 1;

            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                {mes.total > 0 && (
                  <span className="text-[9px] font-semibold text-blue-100 whitespace-nowrap">
                    {formatMoedaAOA(mes.total)}
                  </span>
                )}
                <div className="w-full flex items-end justify-center" style={{ height: "60px" }}>
                  <div
                    className={`w-full max-w-[36px] rounded-t-sm transition-all duration-500 ease-out ${
                      isAtual
                        ? "bg-white"
                        : "bg-white/30"
                    }`}
                    style={{
                      height: `${Math.max(altura, mes.total > 0 ? 8 : 2)}%`,
                    }}
                  />
                </div>
                <span
                  className={`text-[10px] font-semibold ${
                    isAtual
                      ? "text-white"
                      : "text-blue-200"
                  }`}
                >
                  {mes.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
