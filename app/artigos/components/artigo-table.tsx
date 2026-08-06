"use client";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Artigo } from "@/lib/types";
import { formatMoedaAOA } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { Package } from "lucide-react";
import { Edit2, Trash2 } from "lucide-react";

interface ArtigoTableProps {
  artigos: Artigo[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  hasQuery?: boolean;
  isSearching?: boolean;
}

// Badge de IVA com cor contextual
function IVABadge({ taxa }: { taxa: number }) {
  if (taxa === 0)
    return (
      <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-500 font-mono">
        Isento
      </Badge>
    );
  if (taxa === 7)
    return (
      <Badge variant="secondary" className="text-xs bg-amber-50 text-amber-600 border border-amber-100 font-mono">
        7%
      </Badge>
    );
  return (
    <Badge variant="secondary" className="text-xs bg-blue-50 text-blue-600 border border-blue-100 font-mono">
      14%
    </Badge>
  );
}

export function ArtigoTable({
  artigos,
  onEdit,
  onDelete,
  hasQuery = false,
  isSearching = false,
}: ArtigoTableProps) {
  // Estado de loading da pesquisa
  if (isSearching) {
    return (
      <div className="p-12 text-center space-y-3">
        <div className="flex justify-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
        <p className="text-sm text-gray-400">A pesquisar artigos…</p>
      </div>
    );
  }

  // Estado vazio
  if (artigos.length === 0) {
    return (
      <div className="p-12 text-center space-y-3">
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
            <Package className="w-5 h-5 text-gray-400" />
          </div>
        </div>
        {hasQuery ? (
          <>
            <p className="text-sm font-medium text-gray-600">Sem resultados</p>
            <p className="text-xs text-gray-400">Tente pesquisar por outro código ou descrição.</p>
          </>
        ) : (
          <>
            <p className="text-sm font-medium text-gray-600">Nenhum artigo cadastrado</p>
            <p className="text-xs text-gray-400">Clique em "Novo Artigo" para começar.</p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Código</TableHead>
            <TableHead>Descrição</TableHead>
            <TableHead className="text-right">Preço (AOA)</TableHead>
            <TableHead className="text-center">IVA</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {artigos.map((artigo, index) => (
            <TableRow
              key={artigo.id}
              className={cn(
                "hover:bg-blue-50/40 transition-colors duration-150",
                "animate-in fade-in slide-in-from-bottom-1"
              )}
              style={{ animationDelay: `${index * 30}ms`, animationFillMode: "both" }}
            >
              <TableCell>
                <span className="font-mono text-sm font-medium tracking-wider text-gray-700">
                  {artigo.codigo}
                </span>
              </TableCell>
              <TableCell className="text-gray-700">{artigo.descricao}</TableCell>
              <TableCell className="text-right font-medium tabular-nums">
                {formatMoedaAOA(artigo.preco)}
              </TableCell>
              <TableCell className="text-center">
                <IVABadge taxa={artigo.taxaIVA} />
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(artigo.id)}
                    className="hover:bg-blue-50 hover:text-blue-600 transition-colors"
                    title="Editar artigo"
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(artigo.id)}
                    className="hover:bg-red-50 hover:text-red-600 transition-colors"
                    title="Remover artigo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
