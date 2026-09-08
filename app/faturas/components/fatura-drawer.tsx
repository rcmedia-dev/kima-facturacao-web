"use client";

import { useState } from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { X, Download } from "lucide-react";
import { Fatura } from "@/lib/types";
import { formatMoedaAOA, formatDataCompleta } from "@/lib/formatters";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { gerarPDFFatura } from "@/lib/pdf-generator";
import { LABELS_DOCUMENTO } from "@/lib/constants";

interface FaturaDrawerProps {
  fatura: Fatura | null;
  onClose: () => void;
}

const statusColor: Record<string, string> = {
  Pago: "bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-400 border border-teal-200 dark:border-teal-800",
  Pendente: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800",
  Parcial: "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200 dark:border-blue-800",
  Cancelado: "bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-400 border border-red-200 dark:border-red-800",
};

const sidebarBadge: Record<string, string> = {
  Pago: "bg-emerald-500/25 text-white ring-1 ring-emerald-300/40 border border-emerald-400/30",
  Pendente: "bg-amber-500/25 text-white ring-1 ring-amber-300/40 border border-amber-400/30",
  Parcial: "bg-white/20 text-white ring-1 ring-white/40 border border-white/30",
  Cancelado: "bg-red-500/25 text-white ring-1 ring-red-300/40 border border-red-400/30",
};

function obterRotuloDocumento(tipo?: string, numeroCompleto?: string, serie?: string): string {
  if (tipo) {
    if (LABELS_DOCUMENTO[tipo]) return LABELS_DOCUMENTO[tipo];
    const norm = tipo.toLowerCase().replace(/[_\s-]/g, "");
    if (norm === "fatura" || norm === "factura") return "Factura";
    if (norm === "faturarecibo" || norm === "facturarecibo") return "Factura-Recibo";
    if (norm === "notacredito" || norm === "notadecredito") return "Nota de Crédito";
    if (norm === "notadebito" || norm === "notadedebito") return "Nota de Débito";
    if (norm === "orcamento" || norm === "proforma" || norm === "faturaproforma" || norm === "facturaproforma") return "Factura pro-forma";
    if (norm === "recibo") return "Recibo";
  }

  // Fallback baseado na série / prefixo se tipo for genérico
  const s = (serie || "").toUpperCase();
  const nc = (numeroCompleto || "").toUpperCase();
  if (s.startsWith("RC") || nc.startsWith("RC") || s.startsWith("REC")) return "Recibo";
  if (s.startsWith("FR") || nc.startsWith("FR") || s.startsWith("FACREC")) return "Factura-Recibo";
  if (s.startsWith("NC") || nc.startsWith("NC")) return "Nota de Crédito";
  if (s.startsWith("ND") || nc.startsWith("ND")) return "Nota de Débito";
  if (s.startsWith("FP") || nc.startsWith("FP") || s.startsWith("ORC") || s.startsWith("PRO")) return "Factura pro-forma";
  if (s.startsWith("FT") || nc.startsWith("FT") || s.startsWith("FAC")) return "Factura";

  return tipo || "Factura";
}

export function FaturaDrawer({ fatura, onClose }: FaturaDrawerProps) {
  const empresa = useAppStore((s) => s.empresa);
  const getClientePorId = useAppStore((s) => s.getClientePorId);

  // Retém a última fatura durante a animação de fecho
  const [open, setOpen] = useState(false);
  const [displayFatura, setDisplayFatura] = useState<Fatura | null>(null);
  const [prevFatura, setPrevFatura] = useState<Fatura | null>(fatura);

  if (fatura !== prevFatura) {
    setPrevFatura(fatura);
    if (fatura) {
      setDisplayFatura(fatura);
      setOpen(true);
    } else {
      setOpen(false);
    }
  }

  const cliente = displayFatura?.clienteId ? getClientePorId(displayFatura.clienteId) : undefined;
  const labelDocumento = displayFatura
    ? obterRotuloDocumento(displayFatura.tipo, displayFatura.numeroCompleto, displayFatura.serie)
    : "Documento";

  const handleDownloadPDF = async () => {
    if (!displayFatura) return;
    try {
      const pdf = await gerarPDFFatura(displayFatura, cliente || null, empresa);
      const fileName = `${labelDocumento}_${displayFatura.numeroCompleto || displayFatura.numero}.pdf`.replace(/[\/\\?%*:|"<>]/g, "_");
      pdf.save(fileName);
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
    }
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
          onClick={onClose}
        />
        <DialogPrimitive.Popup
          className="fixed right-0 top-0 z-50 flex h-full w-full max-w-[780px] bg-white dark:bg-slate-900 shadow-2xl outline-none transition-transform duration-300 ease-in-out translate-x-full data-open:translate-x-0 data-closed:translate-x-full"
          aria-label={`Detalhes de ${labelDocumento}`}
        >
          {displayFatura && (
            <div className="flex h-full">
              {/* ── Resumo fixo (painel azul igual à sidebar) ── */}
              <aside className="hidden md:flex w-[250px] shrink-0 flex-col justify-between bg-blue-600 border-r border-blue-700/60 p-5 text-white shadow-inner">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-blue-200">
                    {labelDocumento}
                  </p>
                  <p className="mt-1 truncate text-2xl font-bold font-mono text-white">
                    {displayFatura.numeroCompleto || displayFatura.numero}
                  </p>
                  <div className="mt-3">
                    <Badge className={`text-xs font-semibold ${sidebarBadge[displayFatura.status] || "bg-white/20 text-white"}`}>
                      {displayFatura.status}
                    </Badge>
                  </div>

                  <div className="mt-8 bg-blue-700/50 rounded-xl p-4 border border-blue-500/30">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-blue-200">Total a Pagar</p>
                    <div className="mt-3 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between text-blue-100">
                        <span>Subtotal</span>
                        <span className="font-mono font-medium text-white">{formatMoedaAOA(displayFatura.subtotal)}</span>
                      </div>
                      <div className="flex items-center justify-between text-blue-100">
                        <span>IVA</span>
                        <span className="font-mono font-medium text-white">{formatMoedaAOA(displayFatura.totalIVA)}</span>
                      </div>
                      <div className="mt-2 border-t border-blue-500/40 pt-2.5">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-blue-200">Total</p>
                        <p className="mt-0.5 font-mono text-xl font-bold text-white">{formatMoedaAOA(displayFatura.total)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 pt-4">
                  <Button
                    size="sm"
                    className="w-full bg-white hover:bg-blue-50 text-blue-700 font-semibold shadow-sm border border-white"
                    onClick={handleDownloadPDF}
                  >
                    <Download className="size-4 mr-1.5 text-blue-700" />
                    Baixar Documento
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={onClose}
                    className="w-full text-blue-100 hover:bg-blue-700/70 hover:text-white"
                  >
                    Fechar
                  </Button>
                </div>
              </aside>

              {/* ── Detalhes roláveis ── */}
              <div className="flex min-w-0 flex-1 flex-col">
                {/* Cabeçalho móvel */}
                <div className="flex items-center justify-between gap-3 border-b border-blue-700 px-5 py-3 md:hidden bg-blue-600 text-white">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-blue-200">
                        {labelDocumento}
                      </p>
                      <p className="truncate text-sm font-bold text-white font-mono">
                        {displayFatura.numeroCompleto || displayFatura.numero}
                      </p>
                      <Badge className="bg-white/20 text-white border border-white/30 text-[10px] mt-0.5">
                        {displayFatura.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleDownloadPDF} className="text-xs bg-white text-blue-700 border-white hover:bg-blue-50">
                      <Download className="size-3.5 mr-1" />
                      PDF
                    </Button>
                    <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Fechar" className="text-white hover:bg-blue-700">
                      <X className="size-4" />
                    </Button>
                  </div>
                </div>

                {/* Conteúdo scrollável (vertical) */}
                <div className="w-full min-w-0 flex-1 overflow-y-auto p-5 space-y-5">
                  {/* Cliente */}
                  <section className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                    <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Cliente</h3>
                    <div className="space-y-2 text-sm">
                      <p className="font-semibold text-slate-900 dark:text-white">{cliente?.nome || "Consumidor Final"}</p>
                      <p><span className="text-slate-500 dark:text-slate-400">NIF:</span> <span className="font-medium text-slate-800 dark:text-slate-200">{cliente?.nif || "-"}</span></p>
                      {cliente?.morada ? <p><span className="text-slate-500 dark:text-slate-400">Morada:</span> <span className="font-medium text-slate-800 dark:text-slate-200">{cliente.morada}</span></p> : null}
                      {cliente?.telefone ? <p><span className="text-slate-500 dark:text-slate-400">Telefone:</span> <span className="font-medium text-slate-800 dark:text-slate-200">{cliente.telefone}</span></p> : null}
                      {cliente?.email ? <p><span className="text-slate-500 dark:text-slate-400">Email:</span> <span className="font-medium text-slate-800 dark:text-slate-200">{cliente.email}</span></p> : null}
                    </div>
                  </section>

                  {/* Informações */}
                  <section className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                    <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Informações</h3>
                    <div className="space-y-2 text-sm">
                      <p><span className="text-slate-500 dark:text-slate-400">Tipo de Documento:</span> <span className="font-semibold text-slate-800 dark:text-slate-200">{labelDocumento}</span></p>
                      <p><span className="text-slate-500 dark:text-slate-400">Série/Número:</span> <span className="font-mono font-medium text-slate-800 dark:text-slate-200">{displayFatura.numeroCompleto || `${displayFatura.serie}/${displayFatura.numero}`}</span></p>
                      <p><span className="text-slate-500 dark:text-slate-400">Data de Emissão:</span> <span className="font-medium text-slate-800 dark:text-slate-200">{formatDataCompleta(new Date(displayFatura.dataEmissao))}</span></p>
                      <p><span className="text-slate-500 dark:text-slate-400">Data de Vencimento:</span> <span className="font-medium text-slate-800 dark:text-slate-200">{formatDataCompleta(new Date(displayFatura.dataVencimento))}</span></p>
                      <p><span className="text-slate-500 dark:text-slate-400">Forma de Pagamento:</span> <span className="font-medium text-slate-800 dark:text-slate-200">{displayFatura.formaPagamento}</span></p>
                      {displayFatura.documentoReferenciado && (
                        <p><span className="text-slate-500 dark:text-slate-400">{displayFatura.tipo === "Recibo" ? "Fatura Liquidada:" : "Documento de Origem:"}</span> <span className="font-mono font-medium text-slate-800 dark:text-slate-200">{displayFatura.documentoReferenciado}</span></p>
                      )}
                      {displayFatura.dataPagamento && (
                        <p><span className="text-slate-500 dark:text-slate-400">Data de Pagamento:</span> <span className="font-medium text-emerald-600 dark:text-emerald-400">{formatDataCompleta(new Date(displayFatura.dataPagamento))}</span></p>
                      )}
                    </div>
                  </section>

                  {/* Linhas */}
                  <section className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
                    <h3 className="mb-0 px-4 pt-4 text-xs font-bold uppercase tracking-wider text-slate-400">Itens / Linhas do Documento</h3>
                    <div className="min-w-0 overflow-x-auto">
                      <Table>
                        <TableHeader className="bg-slate-50 dark:bg-slate-800/60">
                          <TableRow>
                            <TableHead className="min-w-32 text-xs">Descrição</TableHead>
                            <TableHead className="w-10 text-center text-xs">Qtd</TableHead>
                            <TableHead className="w-20 text-right text-xs">Preço Unit.</TableHead>
                            <TableHead className="w-10 text-center text-xs">IVA</TableHead>
                            <TableHead className="w-24 text-right text-xs">Total c/ IVA</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {displayFatura.linhas?.map((linha) => {
                            const totalLinhaComIVA = linha.total + (linha.total * linha.taxaIVA) / 100;
                            return (
                              <TableRow key={linha.id}>
                                <TableCell className="text-xs font-medium whitespace-normal">{linha.descricao}</TableCell>
                                <TableCell className="text-center font-mono text-xs">{linha.quantidade}</TableCell>
                                <TableCell className="text-right font-mono text-xs">{formatMoedaAOA(linha.preco)}</TableCell>
                                <TableCell className="text-center font-mono text-xs">{linha.taxaIVA}%</TableCell>
                                <TableCell className="text-right font-bold font-mono text-xs">{formatMoedaAOA(totalLinhaComIVA)}</TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </section>

                  {/* Observações */}
                  {displayFatura.observacoes && (
                    <section className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                      <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Observações</h3>
                      <p className="text-sm whitespace-pre-wrap text-slate-700 dark:text-slate-300">{displayFatura.observacoes}</p>
                    </section>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
