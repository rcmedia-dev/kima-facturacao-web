"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppStore } from "@/lib/store";
import { Cliente, FaturaLinha } from "@/lib/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatMoedaAOA } from "@/lib/formatters";
import { Plus, Trash2, ArrowLeft, ArrowRight, Package, CheckCircle2, ClipboardList, PackagePlus } from "lucide-react";
import { ArtigoFormModal } from "@/app/artigos/components/artigo-form-modal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { TipoDocumento } from "@/lib/types";

interface Passo2LinhasProps {
  linhas: FaturaLinha[];
  onUpdateLinhas: (linhas: FaturaLinha[]) => void;
  clienteSelecionado: Cliente | null;
  tipoDocumento?: TipoDocumento;
  documentoReferenciado?: string;
  onBack: () => void;
  onNext: () => void;
}

export function Passo2Linhas({
  linhas,
  onUpdateLinhas,
  clienteSelecionado,
  tipoDocumento,
  documentoReferenciado,
  onBack,
  onNext,
}: Passo2LinhasProps) {
  const store = useAppStore();
  const [artigoId, setArtigoId] = useState<string>("");
  const [quantidade, setQuantidade] = useState<string>("1");
  const [showArtigoModal, setShowArtigoModal] = useState(false);

  const isRetificacao = tipoDocumento === "NotaCredito" || tipoDocumento === "NotaDebito";

  const quantidadeNumerica = parseInt(quantidade, 10) || 0;

  const handleAddLinha = () => {
    if (!artigoId || quantidadeNumerica <= 0) return;

    const artigo = store.getArtigoPorId(artigoId);
    if (!artigo) return;

    const novaLinha: FaturaLinha = {
      id: `linha-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      artigoId: artigo.id,
      descricao: artigo.descricao,
      quantidade: quantidadeNumerica,
      preco: artigo.preco,
      taxaIVA: artigo.taxaIVA,
      unidadeMedida: artigo.unidadeMedida || "UN",
      total: quantidadeNumerica * artigo.preco,
    };

    onUpdateLinhas([...linhas, novaLinha]);
    setArtigoId("");
    setQuantidade("1");
  };

  const handleDeleteLinha = (id: string) => {
    onUpdateLinhas(linhas.filter((l) => l.id !== id));
  };

  const subtotal = linhas.reduce((sum, l) => sum + l.total, 0);
  const totalIVA = linhas.reduce((sum, l) => {
    return sum + (l.total * l.taxaIVA) / 100;
  }, 0);
  const total = subtotal + totalIVA;

  const artigoSelecionado = artigoId ? store.getArtigoPorId(artigoId) : null;

  return (
    <div className="space-y-5">
      {/* Título do passo */}
      <div>
        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          2 · {isRetificacao ? "Ajustar artigos da retificação" : "Adicionar artigos"}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Componha o documento para{" "}
          <strong className="text-slate-700 dark:text-slate-300">
            {clienteSelecionado?.nome || "Consumidor Final"}
          </strong>
          .
        </p>
      </div>

      {/* Banner de Orientação para Nota de Crédito / Débito */}
      {isRetificacao && documentoReferenciado && (
        <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-xs text-amber-900 dark:text-amber-200 space-y-1">
          <p className="font-bold flex items-center gap-1.5">
            <ClipboardList className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" />
            Itens importados da Fatura de Origem: <span className="font-mono text-amber-700 dark:text-amber-300 font-extrabold">{documentoReferenciado}</span>
          </p>
          <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">
            Os artigos da fatura original foram carregados abaixo. Pode <strong>remover linhas</strong> (clicando no ícone do lixo), <strong>alterar quantidades/itens</strong> ou adicionar novos artigos que pretende {tipoDocumento === "NotaCredito" ? "creditar" : "debitar"}.
          </p>
        </div>
      )}

      {/* Form de adição de linha */}
      <div className="rounded-[14px] border border-slate-200 bg-white p-3 sm:p-4 dark:border-slate-800 dark:bg-slate-900">
        <label className="mb-2 block text-xs font-semibold text-slate-700 dark:text-slate-300">
          Que artigo ou serviço quer incluir? <span className="text-red-500">*</span>
        </label>

        {store.artigos.length === 0 ? (
          /* ── EMPTY STATE: sem artigos ─────────────────── */
          <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 py-10 text-center dark:border-slate-700 dark:bg-slate-800/50">
            <PackagePlus className="mx-auto mb-3 h-10 w-10 text-slate-400" />
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
              Ainda não tem artigos registados
            </p>
            <p className="mt-1 mb-5 text-xs text-slate-400">
              Adicione o primeiro artigo ou serviço para incluir no documento.
            </p>
            <Button
              onClick={() => setShowArtigoModal(true)}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Artigo
            </Button>
          </div>
        ) : (
          <>
            <div className="w-full">
              <Select value={artigoId} onValueChange={(v) => setArtigoId(v ?? "")}>
                <SelectTrigger className="h-11 w-full border-slate-300 bg-white text-sm dark:border-slate-700 dark:bg-slate-950">
                  <SelectValue placeholder="Escolha um artigo ou serviço...">
                    {artigoId ? (() => {
                      const a = store.getArtigoPorId(artigoId);
                      return a ? a.descricao : undefined;
                    })() : undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent
                  className="w-[var(--radix-select-trigger-width)] min-w-[280px] sm:min-w-[480px]"
                  sideOffset={4}
                >
                  {store.artigos.map((artigo) => (
                    <SelectItem key={artigo.id} value={artigo.id} className="py-2.5">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-slate-900 dark:text-white">
                          <span className="mr-1.5 font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                            {artigo.codigo}
                          </span>
                          {artigo.descricao}
                        </span>
                        <span className="mt-0.5 text-xs text-slate-400">
                          {formatMoedaAOA(artigo.preco)} · IVA {artigo.taxaIVA}%
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <button
              onClick={() => setShowArtigoModal(true)}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 py-2.5 text-xs font-semibold text-slate-500 transition-colors hover:border-blue-500 hover:bg-blue-50/30 hover:text-blue-600 dark:border-slate-700 dark:text-slate-400 dark:hover:border-blue-400 dark:hover:bg-blue-950/20 dark:hover:text-blue-400"
            >
              <Plus className="h-3.5 w-3.5" />
              Não encontrou? Adicionar novo artigo
            </button>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Quantidade
                </label>
                <Input
                  inputMode="numeric"
                  value={quantidade}
                  onChange={(e) => setQuantidade(e.target.value.replace(/\D/g, ""))}
                  className="h-11 border-slate-300 bg-white text-sm dark:border-slate-700 dark:bg-slate-950"
                />
              </div>

              <Button
                onClick={handleAddLinha}
                disabled={!artigoId || quantidadeNumerica <= 0}
                className="h-11 whitespace-nowrap bg-blue-600 text-white hover:bg-blue-700"
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Adicionar Linha
              </Button>
            </div>

            {artigoSelecionado && (
              <div className="mt-3 flex flex-col gap-2 border-t border-slate-100 pt-3 text-xs font-medium text-slate-600 dark:border-slate-800 dark:text-slate-400 sm:flex-row sm:items-center sm:justify-between">
                <span>
                  Preço unit.:{" "}
                  <strong className="text-slate-800 dark:text-slate-200">
                    {formatMoedaAOA(artigoSelecionado.preco)}
                  </strong>{" "}
                  · IVA:{" "}
                  <strong className="text-slate-800 dark:text-slate-200">
                    {artigoSelecionado.taxaIVA}%
                  </strong>
                </span>
                <span>
                  Subtotal da linha:{" "}
                  <strong className="text-slate-800 dark:text-slate-200">
                    {formatMoedaAOA(artigoSelecionado.preco * quantidadeNumerica)}
                  </strong>
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Tabela de linhas adicionadas */}
      {linhas.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 py-10 text-center dark:border-slate-700 dark:bg-slate-800/50">
          <Package className="mx-auto mb-2 h-8 w-8 text-slate-400" />
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
            Nenhuma linha adicionada ainda
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Escolha um artigo acima e clique em &quot;Adicionar Linha&quot;.
          </p>
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 md:block">
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
                <TableRow>
                  <TableHead className="text-xs font-semibold">Descrição</TableHead>
                  <TableHead className="text-center text-xs font-semibold">Qtd</TableHead>
                  <TableHead className="text-right text-xs font-semibold">Preço Unit.</TableHead>
                  <TableHead className="text-center text-xs font-semibold">IVA</TableHead>
                  <TableHead className="text-right text-xs font-semibold">Total c/ IVA</TableHead>
                  <TableHead className="w-14 text-center text-xs font-semibold" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {linhas.map((linha) => {
                  const totalLinhaComIVA = linha.total + (linha.total * linha.taxaIVA) / 100;
                  return (
                    <TableRow key={linha.id} className="hover:bg-blue-50/20 dark:hover:bg-blue-950/20">
                      <TableCell className="text-sm font-medium text-slate-900 dark:text-white">
                        {linha.descricao}
                      </TableCell>
                      <TableCell className="text-center font-mono text-sm">{linha.quantidade}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{formatMoedaAOA(linha.preco)}</TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="secondary"
                          className={`text-xs font-mono ${
                            linha.taxaIVA === 0
                              ? "border border-slate-100 bg-slate-100 text-slate-600 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-400"
                              : linha.taxaIVA === 7
                              ? "border border-amber-100 bg-amber-50 text-amber-600 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-400"
                              : "border border-blue-100 bg-blue-50 text-blue-600 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-400"
                          }`}
                        >
                          {linha.taxaIVA}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm font-bold text-slate-900 dark:text-white">
                        {formatMoedaAOA(totalLinhaComIVA)}
                      </TableCell>
                      <TableCell className="text-center">
                        <button
                          onClick={() => handleDeleteLinha(linha.id)}
                          className="rounded p-1 text-red-400 transition-colors hover:text-red-600 dark:hover:text-red-400"
                          title="Remover linha"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="space-y-3 md:hidden">
            {linhas.map((linha) => {
              const totalLinhaComIVA = linha.total + (linha.total * linha.taxaIVA) / 100;
              return (
                <div key={linha.id} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{linha.descricao}</p>
                      <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                        <span>Qtd: {linha.quantidade}</span>
                        <span>·</span>
                        <span>{formatMoedaAOA(linha.preco)} / uni</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteLinha(linha.id)}
                      className="rounded p-1.5 text-red-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20 dark:hover:text-red-400"
                      title="Remover linha"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">IVA</span>
                      <Badge
                        variant="secondary"
                        className={`text-[10px] font-mono ${
                          linha.taxaIVA === 0
                            ? "border border-slate-100 bg-slate-100 text-slate-600 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-400"
                            : linha.taxaIVA === 7
                            ? "border border-amber-100 bg-amber-50 text-amber-600 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-400"
                            : "border border-blue-100 bg-blue-50 text-blue-600 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-400"
                        }`}
                      >
                        {linha.taxaIVA}%
                      </Badge>
                    </div>
                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                      {formatMoedaAOA(totalLinhaComIVA)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Totais — alinhados à direita */}
      {linhas.length > 0 && (
        <div className="flex justify-end">
          <div className="w-full sm:w-64 space-y-1 text-sm">
            <div className="flex justify-between text-slate-500 dark:text-slate-400">
              <span>Subtotal</span>
              <span className="font-mono">{formatMoedaAOA(subtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-500 dark:text-slate-400">
              <span>IVA</span>
              <span className="font-mono">{formatMoedaAOA(totalIVA)}</span>
            </div>
            <div className="flex justify-between font-bold text-base text-slate-900 dark:text-white border-t border-slate-200 dark:border-slate-700 pt-2 mt-1">
              <span>TOTAL</span>
              <span className="font-mono text-blue-600 dark:text-blue-400">
                {formatMoedaAOA(total)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Navegação */}
      <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="outline" onClick={onBack} className="w-full text-sm sm:w-auto">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para Cliente
        </Button>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
          {linhas.length > 0 && (
            <span className="hidden items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 sm:flex">
              <CheckCircle2 className="h-4 w-4" />
              {linhas.length} linha(s) adicionada(s)
            </span>
          )}
          <Button
            onClick={onNext}
            disabled={linhas.length === 0}
            className="w-full bg-blue-600 px-5 text-sm text-white hover:bg-blue-700 sm:w-auto"
          >
            Próximo: Rever e Emitir
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Modal: Adicionar Artigo */}
      {showArtigoModal && (
        <ArtigoFormModal
          onClose={() => setShowArtigoModal(false)}
          onSave={() => {
            if (store.loadArtigos) {
              store.loadArtigos();
            } else {
              store.loadAll();
            }
            setShowArtigoModal(false);
          }}
        />
      )}
    </div>
  );
}
