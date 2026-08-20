"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMoedaAOA, formatDataCompleta } from "@/lib/formatters";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Radio,
  Loader2,
  RefreshCw,
  Send,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ShieldCheck,
  XCircle,
} from "lucide-react";

interface ItemFila {
  id: string;
  numeroCompleto?: string;
  tipo?: string;
  total?: number;
  estado: string;
  tentativas: number;
  maxTentativas: number;
  ultimoErro?: string | null;
  proximaTentativa?: string | null;
  criadoEm: string;
}

export default function AGTPainel() {
  const [fila, setFila] = useState<ItemFila[]>([]);
  const [simulacao, setSimulacao] = useState(true);
  const [carregando, setCarregando] = useState(true);
  const [processando, setProcessando] = useState(false);
  const [resumo, setResumo] = useState({ total: 0, pendentes: 0, transmitidos: 0, erros: 0 });

  const carregar = async () => {
    setCarregando(true);
    try {
      const res = await fetch("/api/agt/fila");
      const json = await res.json();
      if (json.success) {
        setFila(json.data || []);
        setSimulacao(json.simulacao !== false);
        setResumo(json.resumo || { total: 0, pendentes: 0, transmitidos: 0, erros: 0 });
      }
    } catch {
      // backend indisponível
    } finally {
      setCarregando(false);
    }
  };

  const processar = async () => {
    setProcessando(true);
    try {
      const res = await fetch("/api/agt/fila", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limite: 10 }),
      });
      const json = await res.json();
      if (json.success) {
        alert(`Processados ${json.processados} · Aceites ${json.aceites} · Falhas ${json.falhas}`);
      }
      await carregar();
    } finally {
      setProcessando(false);
    }
  };

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const badgeEstado = (estado: string) => {
    const config: Record<string, { label: string; cls: string; Icon: any }> = {
      Transmitido: { label: "Transmitido", cls: "bg-emerald-50 text-emerald-700 border-emerald-200", Icon: CheckCircle2 },
      Pendente: { label: "Pendente", cls: "bg-amber-50 text-amber-700 border-amber-200", Icon: Clock },
      Erro: { label: "Erro", cls: "bg-rose-50 text-rose-700 border-rose-200", Icon: AlertTriangle },
      Rejeitado: { label: "Rejeitado", cls: "bg-rose-50 text-rose-700 border-rose-200", Icon: XCircle },
    };
    const c = config[estado];
    if (!c) return <Badge variant="outline">{estado}</Badge>;
    return (
      <Badge variant="outline" className={`gap-1 ${c.cls}`}>
        <c.Icon className="w-3 h-3" /> {c.label}
      </Badge>
    );
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40">
            <Radio size={20} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Painel AGT — Comunicação</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Fase 2 · Fila de envio de documentos (T2.2) e status de transmissão (T2.4)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={
              simulacao
                ? "bg-amber-50 text-amber-700 border-amber-200 gap-1"
                : "bg-emerald-50 text-emerald-700 border-emerald-200 gap-1"
            }
          >
            <ShieldCheck className="w-3 h-3" />
            {simulacao ? "Modo simulação (sem API AGT)" : "API AGT real"}
          </Badge>
        </div>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total na fila", valor: resumo.total, cor: "text-slate-900" },
          { label: "Pendentes", valor: resumo.pendentes, cor: "text-amber-600" },
          { label: "Transmitidos", valor: resumo.transmitidos, cor: "text-emerald-600" },
          { label: "Erros/Rejeitados", valor: resumo.erros, cor: "text-rose-600" },
        ].map((r) => (
          <div key={r.label} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{r.label}</p>
            <p className={`text-2xl font-extrabold mt-1 ${r.cor}`}>{r.valor}</p>
          </div>
        ))}
      </div>

      {simulacao && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/60 dark:bg-amber-950/20 p-4 text-xs text-amber-900 dark:text-amber-200">
          <strong>Modo simulação activo.</strong> A API oficial da AGT ainda não está configurada
          (<code>AGT_BASE_URL</code>). Os envios são simulados localmente; quando a especificação
          oficial chegar, basta configurar as variáveis de ambiente — o fluxo de fila/retry/UI já
          estará funcional.
        </div>
      )}

      {/* Ações */}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={carregar} disabled={carregando}>
          <RefreshCw className={`w-4 h-4 mr-1 ${carregando ? "animate-spin" : ""}`} /> Atualizar
        </Button>
        <Button size="sm" onClick={processar} disabled={processando}>
          {processando ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Send className="w-4 h-4 mr-1" />}
          Processar fila
        </Button>
      </div>

      {/* Fila de envio (T2.2) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Documento</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-center">Tentativas</TableHead>
              <TableHead>Próxima tentativa</TableHead>
              <TableHead>Erro</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {carregando ? (
              <TableRow>
                <TableCell colSpan={7} className="py-6 text-center text-sm text-slate-400">
                  A carregar…
                </TableCell>
              </TableRow>
            ) : fila.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-6 text-center text-sm text-slate-400">
                  Fila vazia — nenhum documento pendente de envio AGT.
                </TableCell>
              </TableRow>
            ) : (
              fila.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-xs">{item.numeroCompleto || "—"}</TableCell>
                  <TableCell className="text-sm">{item.tipo || "—"}</TableCell>
                  <TableCell className="text-right text-sm whitespace-nowrap">
                    {item.total != null ? formatMoedaAOA(item.total!) : "—"}
                  </TableCell>
                  <TableCell>{badgeEstado(item.estado)}</TableCell>
                  <TableCell className="text-center text-sm">
                    {item.tentativas}/{item.maxTentativas}
                  </TableCell>
                  <TableCell className="text-sm text-slate-500 whitespace-nowrap">
                    {item.proximaTentativa ? formatDataCompleta(item.proximaTentativa) : "—"}
                  </TableCell>
                  <TableCell className="text-xs text-slate-400 max-w-[240px] truncate">
                    {item.ultimoErro || "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}