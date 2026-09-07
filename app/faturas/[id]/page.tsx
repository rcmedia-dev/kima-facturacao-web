"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAppStore } from "@/lib/store";
import { Documento, FaturaLinha, FormaPagamento, TipoCliente } from "@/lib/types";
import { formatMoedaAOA, formatData, formatDataCompleta } from "@/lib/formatters";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Download, Printer, CreditCard, CheckCircle2, Share2 } from "lucide-react";
import Link from "next/link";
import { gerarPDFFatura } from "@/lib/pdf-generator";
import { gerarHashFiscal, formatarHash } from "@/lib/fiscal-hash";
import { LABELS_DOCUMENTO } from "@/lib/constants";
import { PagamentoModal } from "./components/pagamento-modal";

type FaturaApi = Documento & {
  cliente?: {
    id: string;
    nome: string;
    nif: string;
    tipo?: string;
    morada?: string;
    telefone?: string;
    email?: string;
    ativo?: boolean;
    dataCriacao?: string;
    ultimaAtualizacao?: string;
  };
};

export default function FaturaDetailPage() {
  const params = useParams();
  const store = useAppStore();
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  const [apiFatura, setApiFatura] = useState<FaturaApi | null>(null);
  const [loadingApi, setLoadingApi] = useState(() =>
    Boolean(params.id && !store.getFaturaPorId(params.id as string))
  );
  const [showPagamentoModal, setShowPagamentoModal] = useState(false);
  const [hashFiscal, setHashFiscal] = useState<string | null>(null);

  const faturaLocal = params.id ? store.getFaturaPorId(params.id as string) : null;
  const fatura = faturaLocal || apiFatura;

  const clienteLocal = fatura && fatura.clienteId ? store.getClientePorId(fatura.clienteId) : null;
  const cliente = clienteLocal || (fatura?.cliente ? {
    id: fatura.cliente.id,
    nome: fatura.cliente.nome,
    nif: fatura.cliente.nif,
    tipo: (fatura.cliente.tipo || "Empresa") as TipoCliente,
    morada: fatura.cliente.morada || "",
    telefone: fatura.cliente.telefone || "",
    email: fatura.cliente.email || "",
    ativo: fatura.cliente.ativo ?? true,
    dataCriacao: fatura.cliente.dataCriacao ? new Date(fatura.cliente.dataCriacao) : new Date(),
    ultimaAtualizacao: fatura.cliente.ultimaAtualizacao ? new Date(fatura.cliente.ultimaAtualizacao) : new Date(),
  } : null);

  useEffect(() => {
    if (params.id && !store.getFaturaPorId(params.id as string)) {
      fetch(`/api/invoices/${params.id}`)
        .then((res) => {
          if (!res.ok) return null;
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            return res.json();
          }
          return null;
        })
        .then((data) => {
          if (data && data.success && data.data) {
            setApiFatura({
              ...data.data,
              dataEmissao: new Date(data.data.dataEmissao),
              dataVencimento: new Date(data.data.dataVencimento),
              linhas: data.data.linhas?.map((l: FaturaLinha) => ({
                ...l,
                quantidade: Number(l.quantidade),
                preco: Number(l.preco),
                taxaIVA: Number(l.taxaIVA),
                total: Number(l.total),
              })) || [],
            });
          }
        })
        .catch((err) => console.error("Erro ao buscar fatura da API:", err))
        .finally(() => setLoadingApi(false));
    }
  }, [params.id]);

  const hashExistente = fatura?.hash;

  // Hash fiscal determinístico para exibição (Art. 10º j — DP 71/25)
  useEffect(() => {
    if (!fatura || hashExistente) return;
    gerarHashFiscal({
      tipo: fatura.tipo,
      serie: fatura.serie,
      numero: String(fatura.numero),
      numeroCompleto: fatura.numeroCompleto || `${fatura.serie}/${String(fatura.numero).padStart(6, "0")}`,
      dataEmissao: fatura.dataEmissao,
      clienteNif: cliente?.nif,
      subtotal: fatura.subtotal,
      totalIVA: fatura.totalIVA,
      total: fatura.total,
      formaPagamento: fatura.formaPagamento,
      linhas: fatura.linhas || [],
    })
      .then(setHashFiscal)
      .catch(() => setHashFiscal(null));
  }, [fatura, hashExistente, cliente?.nif]);

  if (!mounted || loadingApi) {
    return <div className="max-w-6xl mx-auto px-4 py-8 animate-pulse text-slate-500">Carregando fatura...</div>;
  }

  if (!fatura || !cliente) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <p className="text-red-500 text-lg font-semibold">Fatura não encontrada</p>
        <p className="text-slate-500 text-sm mt-1 mb-4">A fatura solicitada não existe ou foi removida.</p>
        <Link href="/faturas">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl">Voltar para Faturas</Button>
        </Link>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Pago":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 size={12} />
            Pago
          </span>
        );
      case "Pendente":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
            Pendente
          </span>
        );
      case "Cancelado":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-400 border border-red-200 dark:border-red-800">
            Cancelado
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {status}
          </span>
        );
    }
  };

  const handleDownloadPDF = async (via: "original" | "2via" = "original") => {
    try {
      const pdf = await gerarPDFFatura(fatura, cliente, store.empresa, { via });
      const fileName = `${fatura.tipo || "Documento"}_${fatura.numeroCompleto || fatura.numero}.pdf`.replace(/[\/\\?%*:|"<>]/g, "_");
      pdf.save(fileName);
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleConfirmPagamento = async (data: Date, formaPagamento: string, valor: number) => {
    if (faturaLocal) {
      try {
        await store.updateFatura(faturaLocal.id, {
          status: "Pago",
          dataPagamento: data,
          formaPagamento: formaPagamento as FormaPagamento,
        });
      } catch (e) {
        console.error("Erro ao atualizar fatura:", e);
      }
    }
    setShowPagamentoModal(false);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Variação 2: Tela Dividida (Sidebar de Ações & Resumo + Canvas do PDF) */}
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 items-start">

        {/* Sidebar de Ações & Resumo (Coluna Esquerda) */}
        <aside className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-5">
          {/* Voltar */}
          <Link href="/faturas" className="block">
            <Button variant="outline" className="w-full justify-start rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar à lista de faturas
            </Button>
          </Link>

          {/* Cabeçalho da fatura na sidebar */}
          <div>
            <div className="mb-2">{getStatusBadge(fatura.status)}</div>
            <h1 className="text-xl font-bold font-mono text-slate-900 dark:text-white">
              {fatura.numeroCompleto || `${fatura.serie}/${fatura.numero}`}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Emitido a {formatData(new Date(fatura.dataEmissao))}
            </p>
          </div>

          {/* Card Escuro de Valor Total */}
          <div className="bg-slate-900 dark:bg-slate-800 text-white rounded-xl p-4 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Valor Total
            </p>
            <p className="text-2xl font-bold font-mono text-blue-400 mt-1">
              {formatMoedaAOA(fatura.total)}
            </p>
            <p className="text-xs text-slate-300 mt-1">
              {fatura.status === "Pago" ? (
                <>
                  Liquidado a {formatData(new Date(fatura.dataPagamento || fatura.dataEmissao))}
                </>
              ) : (
                <>Vence a {formatData(new Date(fatura.dataVencimento))}</>
              )}
            </p>
          </div>

          {/* Ação Principal: Baixar PDF */}
          <Button
            onClick={() => handleDownloadPDF("original")}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl shadow-sm text-sm"
          >
            <Download className="w-4 h-4 mr-2" />
            Baixar Documento
          </Button>

          {/* Ação Secundária: Imprimir */}
          <Button
            variant="outline"
            onClick={handlePrint}
            className="w-full rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300"
          >
            <Printer className="w-4 h-4 mr-2" />
            Imprimir Documento
          </Button>

          {/* Registar Pagamento (se não estiver pago) */}
          {fatura.status !== "Pago" && (
            <Button
              onClick={() => setShowPagamentoModal(true)}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-xl text-xs shadow-sm"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Registar Pagamento
            </Button>
          )}

          {/* Dados resumidos do cliente */}
          <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-1.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Cliente
            </p>
            <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
              {cliente.nome}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              NIF: <span className="font-mono">{cliente.nif}</span>
            </p>
            {cliente.telefone && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tel: {cliente.telefone}
              </p>
            )}
            {cliente.email && (
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                Email: {cliente.email}
              </p>
            )}
          </div>
        </aside>

        {/* Canvas Principal da Fatura (Coluna Direita) */}
        <main className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
          {/* Cabeçalho do documento */}
          <div className="flex justify-between items-start border-b border-slate-200 dark:border-slate-800 pb-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 bg-blue-600 text-white rounded-lg flex items-center justify-center font-bold text-xs">
                  K
                </div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  {store.empresa?.nomeEmpresa || "KIMA SOLUÇÕES, LDA"}
                </h2>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                NIF: {store.empresa?.nif || "5417082910"} · Luanda, Angola
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                {(LABELS_DOCUMENTO[fatura.tipo] || fatura.tipo || "FATURA").toUpperCase()}
              </span>
              <p className="text-base font-bold font-mono text-slate-900 dark:text-white mt-0.5">
                {fatura.numeroCompleto || `${fatura.serie}/${fatura.numero}`}
              </p>
            </div>
          </div>

          {/* Dados do cliente & datas */}
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <p className="font-bold text-slate-400 uppercase tracking-wider text-[10px] mb-1">
                Faturado a
              </p>
              <p className="font-bold text-slate-900 dark:text-white text-sm">{cliente.nome}</p>
              <p className="text-slate-500 mt-0.5">
                NIF: <strong className="font-mono">{cliente.nif}</strong>
              </p>
              {cliente.morada && <p className="text-slate-500">{cliente.morada}</p>}
            </div>

            <div>
              <p className="font-bold text-slate-400 uppercase tracking-wider text-[10px] mb-1">
                Detalhes da Emissão
              </p>
              <p className="text-slate-600 dark:text-slate-300">
                Data de Emissão: <strong>{formatData(new Date(fatura.dataEmissao))}</strong>
              </p>
              <p className="text-slate-600 dark:text-slate-300 mt-0.5">
                Data de Vencimento: <strong>{formatData(new Date(fatura.dataVencimento))}</strong>
              </p>
              <p className="text-slate-600 dark:text-slate-300 mt-0.5">
                Forma de Pagamento: <strong>{fatura.formaPagamento}</strong>
              </p>
              {fatura.documentoReferenciado && (
                <p className="text-slate-600 dark:text-slate-300 mt-0.5">
                  {fatura.tipo === "Recibo" ? "Fatura Liquidada: " : "Fatura de Origem: "}
                  <strong className="font-mono">{fatura.documentoReferenciado}</strong>
                </p>
              )}
              {fatura.dataPagamento && (
                <p className="text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                  Pago a: {formatData(new Date(fatura.dataPagamento))}
                </p>
              )}
            </div>
          </div>

          {/* Tabela de itens */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
                <TableRow>
                  <TableHead className="text-xs font-semibold">Descrição</TableHead>
                  <TableHead className="text-center text-xs font-semibold">Qtd</TableHead>
                  <TableHead className="text-right text-xs font-semibold">Preço Unit.</TableHead>
                  <TableHead className="text-center text-xs font-semibold">IVA</TableHead>
                  <TableHead className="text-right text-xs font-semibold">Total c/ IVA</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fatura.linhas?.map((linha: FaturaLinha) => {
                  const totalLinhaComIVA = linha.total + (linha.total * linha.taxaIVA) / 100;
                  return (
                    <TableRow key={linha.id}>
                      <TableCell className="font-medium text-xs text-slate-900 dark:text-white">
                        {linha.descricao}
                      </TableCell>
                      <TableCell className="text-center text-xs font-mono">{linha.quantidade}</TableCell>
                      <TableCell className="text-right text-xs font-mono">{formatMoedaAOA(linha.preco)}</TableCell>
                      <TableCell className="text-center text-xs font-mono">{linha.taxaIVA}%</TableCell>
                      <TableCell className="text-right text-xs font-bold font-mono">
                        {formatMoedaAOA(totalLinhaComIVA)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Totais resumidos */}
          <div className="flex justify-end pt-2">
            <div className="w-full sm:w-64 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>Subtotal (sem IVA):</span>
                <span className="font-mono font-medium">{formatMoedaAOA(fatura.subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>Total IVA:</span>
                <span className="font-mono font-medium">{formatMoedaAOA(fatura.totalIVA)}</span>
              </div>
              <div className="flex justify-between items-center text-sm font-bold text-slate-900 dark:text-white border-t border-slate-200 dark:border-slate-700 pt-2.5 mt-1">
                <span>TOTAL A PAGAR:</span>
                <span className="font-mono text-base text-blue-600 dark:text-blue-400">
                  {formatMoedaAOA(fatura.total)}
                </span>
              </div>
            </div>
          </div>

          {/* Observações se existirem */}
          {fatura.observacoes && (
            <div className="border-t border-slate-100 dark:border-slate-800 pt-4 text-xs text-slate-600 dark:text-slate-400">
              <p className="font-bold text-slate-700 dark:text-slate-300 mb-1">Observações:</p>
              <p className="whitespace-pre-wrap">{fatura.observacoes}</p>
            </div>
          )}

          {/* Rodapé técnico certificação AGT */}
          <div className="border-t border-dashed border-slate-200 dark:border-slate-800 pt-4 flex flex-col sm:flex-row justify-between items-center text-[11px] text-slate-400 gap-1">
            <p>
              Processado por {store.empresa?.softwareNome || "Kima Fatura"} · Certificação AGT{" "}
              {store.empresa?.softwareCertificacaoNumero || "não definido"}
            </p>
            {(hashFiscal || hashExistente) && (
              <p className="font-mono text-[10px]">Hash: {formatarHash(hashFiscal || hashExistente, 4, 8)}</p>
            )}
          </div>
        </main>
      </div>

      {/* Modal de confirmação de pagamento */}
      {showPagamentoModal && (
        <PagamentoModal
          faturaTotal={fatura.total}
          formaPagamentoInicial={fatura.formaPagamento}
          onClose={() => setShowPagamentoModal(false)}
          onConfirm={handleConfirmPagamento}
        />
      )}
    </div>
  );
}
