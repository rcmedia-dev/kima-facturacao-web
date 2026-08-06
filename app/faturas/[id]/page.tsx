"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAppStore } from "@/lib/store";
import { formatMoedaAOA, formatData, formatDataCompleta } from "@/lib/formatters";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Download, CheckCircle, Trash2 } from "lucide-react";
import Link from "next/link";
import { PagamentoModal } from "./components/pagamento-modal";
import { ConfirmModal } from "@/components/confirm-modal";
import { gerarPDFFatura } from "@/lib/pdf-generator";

export default function FaturaDetailPage() {
  const params = useParams();
  const router = useRouter();
  const store = useAppStore();
  const [mounted, setMounted] = useState(false);
  const [apiFatura, setApiFatura] = useState<any>(null);
  const [loadingApi, setLoadingApi] = useState(false);
  const [showPagamentoModal, setShowPagamentoModal] = useState(false);
  const [cancelarId, setCancelarId] = useState<string | null>(null);

  const faturaLocal = params.id ? store.getFaturaPorId(params.id as string) : null;
  const fatura = faturaLocal || apiFatura;

  const clienteLocal = fatura && fatura.clienteId ? store.getClientePorId(fatura.clienteId) : null;
  const cliente = clienteLocal || (fatura?.cliente ? {
    id: fatura.cliente.id,
    nome: fatura.cliente.nome,
    nif: fatura.cliente.nif,
    morada: fatura.cliente.morada || "",
    telefone: fatura.cliente.telefone || "",
    email: fatura.cliente.email || "",
  } : null);

  useEffect(() => {
    setMounted(true);

    if (params.id && !store.getFaturaPorId(params.id as string)) {
      setLoadingApi(true);
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
              linhas: data.data.linhas?.map((l: any) => ({
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

  if (!mounted || loadingApi) {
    return <div className="max-w-4xl mx-auto px-4 py-8 animate-pulse">Carregando fatura...</div>;
  }

  if (!fatura || !cliente) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center">
        <p className="text-red-500 text-lg font-semibold">Fatura não encontrada</p>
        <p className="text-gray-500 text-sm mt-1 mb-4">A fatura solicitada não existe ou foi removida.</p>
        <Link href="/faturas">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">Voltar para Faturas</Button>
        </Link>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      Pago: "bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-400 border border-teal-200 dark:border-teal-800",
      Pendente: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800",
      Parcial: "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200 dark:border-blue-800",
      Cancelado: "bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-400 border border-red-200 dark:border-red-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const handlePagamento = (data: Date, formaPagamento: any, valor: number) => {
    store.registrarPagamento(fatura.id, data, formaPagamento, valor);
    setShowPagamentoModal(false);

    fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        invoiceId: fatura.id,
        amount: valor,
        paymentDate: data.toISOString(),
        method: formaPagamento,
      }),
    }).catch((err) => console.warn("API payments sync skipped:", err));
  };

  const handleCancelar = () => {
    store.cancelarFatura(fatura.id);
    router.push("/faturas");
  };

  const handleDownloadPDF = () => {
    try {
      const pdf = gerarPDFFatura(fatura, cliente, store.empresa);
      const fileName = `Fatura_${fatura.numeroCompleto || fatura.numero}.pdf`.replace(/[\/\\?%*:|"<>]/g, "_");
      pdf.save(fileName);
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/faturas">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{fatura.numeroCompleto || fatura.numero}</h1>
            <div className="flex gap-2 mt-2">
              <Badge className={getStatusColor(fatura.status)}>
                {fatura.status}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 mb-3">Cliente</h3>
          <div className="space-y-2 text-sm">
            <p><span className="text-gray-600">Nome:</span> <span className="font-medium">{cliente.nome}</span></p>
            <p><span className="text-gray-600">NIF:</span> <span className="font-medium">{cliente.nif}</span></p>
            <p><span className="text-gray-600">Morada:</span> <span className="font-medium">{cliente.morada}</span></p>
            <p><span className="text-gray-600">Telefone:</span> <span className="font-medium">{cliente.telefone}</span></p>
            <p><span className="text-gray-600">Email:</span> <span className="font-medium">{cliente.email}</span></p>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 mb-3">Informações</h3>
          <div className="space-y-2 text-sm">
            <p><span className="text-gray-600">Série/Número:</span> <span className="font-medium">{fatura.serie}/{fatura.numero}</span></p>
            <p><span className="text-gray-600">Data de Emissão:</span> <span className="font-medium">{formatDataCompleta(new Date(fatura.dataEmissao))}</span></p>
            <p><span className="text-gray-600">Data de Vencimento:</span> <span className="font-medium">{formatData(new Date(fatura.dataVencimento))}</span></p>
            <p><span className="text-gray-600">Forma de Pagamento:</span> <span className="font-medium">{fatura.formaPagamento}</span></p>
            {fatura.dataPagamento && (
              <p><span className="text-gray-600">Data de Pagamento:</span> <span className="font-medium">{formatData(new Date(fatura.dataPagamento))}</span></p>
            )}
          </div>
        </Card>
      </div>

      <Card className="p-6 mb-6">
        <h3 className="font-semibold text-gray-900 mb-4">Linhas da Fatura</h3>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrição</TableHead>
                <TableHead className="text-center">Qtd</TableHead>
                <TableHead className="text-right">Preço Unit.</TableHead>
                <TableHead className="text-center">IVA</TableHead>
                <TableHead className="text-right">Total c/ IVA</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fatura.linhas?.map((linha: any) => {
                const totalLinhaComIVA = linha.total + (linha.total * linha.taxaIVA) / 100;
                return (
                  <TableRow key={linha.id}>
                    <TableCell className="font-medium">{linha.descricao}</TableCell>
                    <TableCell className="text-center font-mono">{linha.quantidade}</TableCell>
                    <TableCell className="text-right font-mono">{formatMoedaAOA(linha.preco)}</TableCell>
                    <TableCell className="text-center font-mono">{linha.taxaIVA}%</TableCell>
                    <TableCell className="text-right font-bold font-mono">{formatMoedaAOA(totalLinhaComIVA)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Card className="p-6 mb-6 bg-slate-900 text-white rounded-2xl">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center sm:text-right">
          <div>
            <p className="text-slate-400 text-xs sm:text-sm">Subtotal (sem IVA)</p>
            <p className="text-lg sm:text-xl font-bold font-mono text-slate-200">{formatMoedaAOA(fatura.subtotal)}</p>
          </div>
          <div>
            <p className="text-slate-400 text-xs sm:text-sm">Total IVA</p>
            <p className="text-lg sm:text-xl font-bold font-mono text-slate-200">{formatMoedaAOA(fatura.totalIVA)}</p>
          </div>
          <div>
            <p className="text-slate-400 text-xs sm:text-sm">Total a Pagar</p>
            <p className="text-2xl sm:text-3xl font-bold font-mono text-blue-400">{formatMoedaAOA(fatura.total)}</p>
          </div>
        </div>
      </Card>

      {fatura.observacoes && (
        <Card className="p-6 mb-6">
          <h3 className="font-semibold text-gray-900 mb-2">Observações</h3>
          <p className="text-gray-700 whitespace-pre-wrap">{fatura.observacoes}</p>
        </Card>
      )}

      <Card className="p-6 bg-blue-50/80 border-blue-200 rounded-2xl">
        <div className="flex flex-col sm:flex-row gap-3">
          {fatura.status === "Pendente" && (
            <>
              <Button
                onClick={() => setShowPagamentoModal(true)}
                className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Registrar Pagamento
              </Button>
              <Button
                onClick={() => setCancelarId(fatura.id)}
                variant="destructive"
                className="w-full sm:w-auto"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Cancelar Fatura
              </Button>
            </>
          )}
          <Button onClick={handleDownloadPDF} variant="outline" className="bg-white border-blue-300 text-blue-800 hover:bg-blue-100 w-full sm:w-auto">
            <Download className="w-4 h-4 mr-2 text-blue-600" />
            Baixar PDF
          </Button>
        </div>
      </Card>

      {showPagamentoModal && (
        <PagamentoModal
          faturaTotal={fatura.total}
          formaPagamentoInicial={fatura.formaPagamento}
          onClose={() => setShowPagamentoModal(false)}
          onConfirm={handlePagamento}
        />
      )}

      {cancelarId && (
        <ConfirmModal
          title="Cancelar Fatura"
          description="Tem certeza de que deseja cancelar esta fatura? Esta ação não pode ser revertida."
          requireInputLabel="Motivo do cancelamento"
          inputPlaceholder="Ex: Erro na emissão"
          confirmText="Confirmar Cancelamento"
          variant="danger"
          onClose={() => setCancelarId(null)}
          onConfirm={() => {
            handleCancelar();
            setCancelarId(null);
          }}
        />
      )}
    </div>
  );
}
