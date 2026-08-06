"use client";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Cliente } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Users } from "lucide-react";
import { Edit2, Trash2 } from "lucide-react";

interface ClienteTableProps {
  clientes: Cliente[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  hasQuery?: boolean;
  isSearching?: boolean;
}

export function ClienteTable({
  clientes,
  onEdit,
  onDelete,
  hasQuery = false,
  isSearching = false,
}: ClienteTableProps) {
  // Estado de loading da pesquisa
  if (isSearching) {
    return (
      <div className="p-12 text-center space-y-3">
        <div className="flex justify-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
        <p className="text-sm text-gray-400">A pesquisar clientes…</p>
      </div>
    );
  }

  // Estado vazio
  if (clientes.length === 0) {
    return (
      <div className="p-12 text-center space-y-3">
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
            <Users className="w-5 h-5 text-gray-400" />
          </div>
        </div>
        {hasQuery ? (
          <>
            <p className="text-sm font-medium text-gray-600">Sem resultados</p>
            <p className="text-xs text-gray-400">Tente pesquisar por outro nome ou NIF.</p>
          </>
        ) : (
          <>
            <p className="text-sm font-medium text-gray-600">Nenhum cliente cadastrado</p>
            <p className="text-xs text-gray-400">Clique em "Novo Cliente" para começar.</p>
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
            <TableHead>Nome</TableHead>
            <TableHead>NIF</TableHead>
            <TableHead>Telefone</TableHead>
            <TableHead>Email</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clientes.map((cliente, index) => (
            <TableRow
              key={cliente.id}
              className={cn(
                "hover:bg-blue-50/40 transition-colors duration-150",
                "animate-in fade-in slide-in-from-bottom-1"
              )}
              style={{ animationDelay: `${index * 30}ms`, animationFillMode: "both" }}
            >
              <TableCell className="font-medium">{cliente.nome}</TableCell>
              <TableCell>
                <span className="font-mono text-sm tracking-wide">{cliente.nif}</span>
              </TableCell>
              <TableCell className="text-gray-600">{cliente.telefone}</TableCell>
              <TableCell className="text-gray-600">{cliente.email}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(cliente.id)}
                    className="hover:bg-blue-50 hover:text-blue-600 transition-colors"
                    title="Editar cliente"
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(cliente.id)}
                    className="hover:bg-red-50 hover:text-red-600 transition-colors"
                    title="Remover cliente"
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
