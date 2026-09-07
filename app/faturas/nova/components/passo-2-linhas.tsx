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
      <div className="border border-slate-200 dark:border-slate-800 rounded-[14px] p-4 bg-white dark:bg-slate-900">
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
          Que artigo ou serviço quer incluir? <span className="text-red-500">*</span>
        </label>

        {store.artigos.length === 0 ? (
          /* ── EMPTY STATE: sem artigos ─────────────────── */
          <div className="text-center py-10 bg-slate-50 dark:bg-slate-800/50 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700">
            <PackagePlus className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            <p className="text-slate-600 dark:text-slate-300 font-medium text-sm">
              Ainda não tem artigos registados
            </p>
            <p className="text-slate-400 text-xs mt-1 mb-5">
              Adicione o primeiro artigo ou serviço para incluir no documento.
            </p>
            <Button
              onClick={() => setShowArtigoModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Artigo
            </Button>
          </div>
        ) : (
          <>
            {/* Linha 1: Select de artigo — largura total */}
            <div className="w-full">
              <Select value={artigoId} onValueChange={(v) => setArtigoId(v ?? "")}>
                <SelectTrigger className="w-full bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 h-10 text-sm">
                  <SelectValue placeholder="Escolha um artigo ou serviço...">
                    {artigoId ? (() => {
                      const a = store.getArtigoPorId(artigoId);
                      return a ? a.descricao : undefined;
                    })() : undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent
                  className="w-[var(--radix-select-trigger-width)] min-w-[480px]"
                  sideOffset={4}
                >
                  {store.artigos.map((artigo) => (
                    <SelectItem key={artigo.id} value={artigo.id} className="py-2.5">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-slate-900 dark:text-white">
                          <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 mr-1.5">
                            {artigo.codigo}
                          </span>
                          {artigo.descricao}
                        </span>
                        <span className="text-xs text-slate-400 mt-0.5">
                          {formatMoedaAOA(artigo.preco)} · IVA {artigo.taxaIVA}%
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Botão secundário: adicionar novo artigo */}
            <button
              onClick={() => setShowArtigoModal(true)}
              className="flex items-center justify-center gap-2 w-full mt-2 py-2.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:border-blue-500 hover:text-blue-600 dark:hover:border-blue-400 dark:hover:text-blue-400 hover:bg-blue-50/30 dark:hover:bg-blue-950/20 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Não encontrou? Adicionar novo artigo
            </button>

            {/* Linha 2: Quantidade + Botão — sempre lado a lado */}
            <div className="grid grid-cols-[1fr_auto] gap-3 items-end mt-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Quantidade
                </label>
                <Input
                  inputMode="numeric"
                  value={quantidade}
                  onChange={(e) => setQuantidade(e.target.value.replace(/\D/g, ""))}
                  className="bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 h-10 text-sm"
                />
              </div>

              <Button
                onClick={handleAddLinha}
                disabled={!artigoId || quantidadeNumerica <= 0}
                className="bg-blue-600 hover:bg-blue-700 text-white h-10 whitespace-nowrap"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Adicionar Linha
              </Button>
            </div>

            {/* Preview rápido do artigo selecionado */}
            {artigoSelecionado && (
              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 font-medium">
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
        <div className="text-center py-10 bg-slate-50 dark:bg-slate-800/50 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700">
          <Package className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-slate-600 dark:text-slate-300 font-medium text-sm">
            Nenhuma linha adicionada ainda
          </p>
          <p className="text-slate-400 text-xs mt-1">
            Escolha um artigo acima e clique em &quot;Adicionar Linha&quot;.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <Table>
            <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
              <TableRow>
                <TableHead className="font-semibold text-xs">Descrição</TableHead>
                <TableHead className="text-center font-semibold text-xs">Qtd</TableHead>
                <TableHead className="text-right font-semibold text-xs">Preço Unit.</TableHead>
                <TableHead className="text-center font-semibold text-xs">IVA</TableHead>
                <TableHead className="text-right font-semibold text-xs">Total c/ IVA</TableHead>
                <TableHead className="text-center font-semibold text-xs w-14" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {linhas.map((linha) => {
                const totalLinhaComIVA = linha.total + (linha.total * linha.taxaIVA) / 100;
                return (
                  <TableRow key={linha.id} className="hover:bg-blue-50/20 dark:hover:bg-blue-950/20">
                    <TableCell className="font-medium text-sm text-slate-900 dark:text-white">
                      {linha.descricao}
                    </TableCell>
                    <TableCell className="text-center font-mono text-sm">{linha.quantidade}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{formatMoedaAOA(linha.preco)}</TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="secondary"
                        className={`text-xs font-mono ${
                          linha.taxaIVA === 0
                            ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                            : linha.taxaIVA === 7
                            ? "bg-amber-50 text-amber-600 border border-amber-100 dark:bg-amber-950/30 dark:text-amber-400"
                            : "bg-blue-50 text-blue-600 border border-blue-100 dark:bg-blue-950/30 dark:text-blue-400"
                        }`}
                      >
                        {linha.taxaIVA}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-bold font-mono text-sm text-slate-900 dark:text-white">
                      {formatMoedaAOA(totalLinhaComIVA)}
                    </TableCell>
                    <TableCell className="text-center">
                      <button
                        onClick={() => handleDeleteLinha(linha.id)}
                        className="text-red-400 hover:text-red-600 dark:hover:text-red-400 transition-colors p-1 rounded"
                        title="Remover linha"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
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
      <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
        <Button variant="outline" onClick={onBack} className="text-sm">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar para Cliente
        </Button>
        <div className="flex items-center gap-3">
          {linhas.length > 0 && (
            <span className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              {linhas.length} linha(s) adicionada(s)
            </span>
          )}
          <Button
            onClick={onNext}
            disabled={linhas.length === 0}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 text-sm"
          >
            Próximo: Rever e Emitir
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>

      {/* Modal: Adicionar Artigo */}
      {showArtigoModal && (
        <ArtigoFormModal
          onClose={() => setShowArtigoModal(false)}
          onSave={() => {
            store.loadArtigos?.() ?? store.loadAll();
            setShowArtigoModal(false);
          }}
        />
      )}
    </div>
  );
}
