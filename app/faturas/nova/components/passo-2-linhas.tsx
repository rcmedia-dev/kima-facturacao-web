"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppStore } from "@/lib/store";
import { Cliente, FaturaLinha } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatMoedaAOA } from "@/lib/formatters";
import { Plus, Trash2, ArrowLeft, ArrowRight, Package } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Passo2LinhasProps {
  linhas: FaturaLinha[];
  onUpdateLinhas: (linhas: FaturaLinha[]) => void;
  clienteSelecionado: Cliente | null;
  onBack: () => void;
  onNext: () => void;
}

export function Passo2Linhas({
  linhas,
  onUpdateLinhas,
  clienteSelecionado,
  onBack,
  onNext,
}: Passo2LinhasProps) {
  const store = useAppStore();
  const [artigoId, setArtigoId] = useState<string>("");
  const [quantidade, setQuantidade] = useState<number>(1);

  const handleAddLinha = () => {
    if (!artigoId || quantidade <= 0) return;

    const artigo = store.getArtigoPorId(artigoId);
    if (!artigo) return;

    const novaLinha: FaturaLinha = {
      id: `linha-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      artigoId: artigo.id,
      descricao: artigo.descricao,
      quantidade,
      preco: artigo.preco,
      taxaIVA: artigo.taxaIVA,
      unidadeMedida: artigo.unidadeMedida || "UN",
      total: quantidade * artigo.preco,
    };

    onUpdateLinhas([...linhas, novaLinha]);
    setArtigoId("");
    setQuantidade(1);
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
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">
          Passo 2: Adicionar Artigos / Serviços
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          Selecione os artigos da tabela e especifique as quantidades para a fatura de <strong>{clienteSelecionado?.nome}</strong>
        </p>

        {/* Form para Adicionar Linha */}
        <Card className="p-4 bg-blue-50/60 border-blue-200 mb-6 rounded-xl shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            <div className="sm:col-span-6">
              <label className="text-xs font-semibold text-gray-700 block mb-1">
                Artigo / Serviço <span className="text-red-500">*</span>
              </label>
              <Select value={artigoId} onValueChange={(v) => setArtigoId(v ?? "")}>
                <SelectTrigger className="bg-white border-gray-300">
                  <SelectValue placeholder="Pesquisar por código ou descrição..." />
                </SelectTrigger>
                <SelectContent>
                  {store.artigos.map((artigo) => (
                    <SelectItem key={artigo.id} value={artigo.id}>
                      <span className="font-mono text-xs font-bold text-gray-700 mr-2">[{artigo.codigo}]</span>
                      {artigo.descricao} — {formatMoedaAOA(artigo.preco)} (IVA {artigo.taxaIVA}%)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="sm:col-span-3">
              <label className="text-xs font-semibold text-gray-700 block mb-1">
                Quantidade <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                min="1"
                value={quantidade}
                onChange={(e) => setQuantidade(Math.max(1, parseInt(e.target.value) || 1))}
                className="bg-white border-gray-300"
              />
            </div>

            <div className="sm:col-span-3">
              <Button
                onClick={handleAddLinha}
                disabled={!artigoId || quantidade <= 0}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Adicionar Linha
              </Button>
            </div>
          </div>

          {/* Preview Rápido do Artigo Selecionado */}
          {artigoSelecionado && (
            <div className="mt-3 pt-3 border-t border-blue-200/60 flex items-center justify-between text-xs text-blue-900 font-medium">
              <span>
                Preço Unitário: <strong>{formatMoedaAOA(artigoSelecionado.preco)}</strong> | Taxa IVA: <strong>{artigoSelecionado.taxaIVA}%</strong>
              </span>
              <span>
                Subtotal da Linha: <strong>{formatMoedaAOA(artigoSelecionado.preco * quantidade)}</strong>
              </span>
            </div>
          )}
        </Card>

        {/* Tabela de Linhas */}
        {linhas.length === 0 ? (
          <div className="text-center py-10 bg-gray-50/80 rounded-xl border-2 border-dashed border-gray-200">
            <Package className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600 font-medium text-sm">Nenhuma linha adicionada até ao momento</p>
            <p className="text-gray-400 text-xs mt-1">Selecione um artigo acima e clique em "Adicionar Linha".</p>
          </div>
        ) : (
          <div className="overflow-x-auto mb-6 border rounded-xl shadow-sm bg-white">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="font-semibold">Descrição</TableHead>
                  <TableHead className="text-center font-semibold">Qtd</TableHead>
                  <TableHead className="text-right font-semibold">Preço Unit.</TableHead>
                  <TableHead className="text-center font-semibold">IVA</TableHead>
                  <TableHead className="text-right font-semibold">Total Linha (c/ IVA)</TableHead>
                  <TableHead className="text-center font-semibold w-16">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linhas.map((linha) => {
                  const totalLinhaComIVA = linha.total + (linha.total * linha.taxaIVA) / 100;
                  return (
                    <TableRow key={linha.id} className="hover:bg-blue-50/20">
                      <TableCell className="font-medium text-gray-900">{linha.descricao}</TableCell>
                      <TableCell className="text-center font-mono">{linha.quantidade}</TableCell>
                      <TableCell className="text-right font-mono">{formatMoedaAOA(linha.preco)}</TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="secondary"
                          className={`text-xs font-mono ${
                            linha.taxaIVA === 0
                              ? "bg-gray-100 text-gray-600"
                              : linha.taxaIVA === 7
                              ? "bg-amber-50 text-amber-600 border border-amber-100"
                              : "bg-blue-50 text-blue-600 border border-blue-100"
                          }`}
                        >
                          {linha.taxaIVA}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold font-mono text-gray-900">
                        {formatMoedaAOA(totalLinhaComIVA)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteLinha(linha.id)}
                          className="hover:bg-red-50 hover:text-red-600"
                          title="Remover linha"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Card de Resumo de Valores */}
      <Card className="bg-slate-900 text-white p-5 rounded-xl shadow-md">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-slate-300">
            <span>Subtotal (sem IVA):</span>
            <span className="font-mono">{formatMoedaAOA(subtotal)}</span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span>Total IVA Calculado:</span>
            <span className="font-mono">{formatMoedaAOA(totalIVA)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold text-white border-t border-slate-700 pt-3 mt-2">
            <span>TOTAL GERAL DA FATURA:</span>
            <span className="font-mono text-blue-400">{formatMoedaAOA(total)}</span>
          </div>
        </div>
      </Card>

      {/* Botões de Navegação */}
      <div className="flex gap-3 justify-between pt-4 border-t">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar para Cliente
        </Button>
        <Button
          onClick={onNext}
          disabled={linhas.length === 0}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6"
        >
          Próximo: Resumo e Emitir
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
