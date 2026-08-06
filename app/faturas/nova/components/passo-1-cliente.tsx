"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store";
import { Cliente, TipoDocumento } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Plus, Check, UserCheck, ArrowRight } from "lucide-react";
import { ClienteFormModal } from "@/app/clientes/components/cliente-form-modal";
import { SearchBar } from "@/components/search-bar";
import { useDebounceSearch } from "@/hooks/use-debounce-search";
import { DocumentoTipoSelector } from "@/components/documento-tipo-selector";

interface Passo1ClienteProps {
  clienteSelecionado: Cliente | null;
  onSelectCliente: (cliente: Cliente) => void;
  tipoDocumento: TipoDocumento;
  setTipoDocumento: (tipo: TipoDocumento) => void;
  onNext: () => void;
}

export function Passo1Cliente({
  clienteSelecionado,
  onSelectCliente,
  tipoDocumento,
  setTipoDocumento,
  onNext,
}: Passo1ClienteProps) {
  const store = useAppStore();
  const [showModal, setShowModal] = useState(false);

  const {
    searchTerm,
    setSearchTerm,
    filteredItems: filteredClientes,
    isSearching,
  } = useDebounceSearch(
    store.clientes,
    (c, term) =>
      c.nome.toLowerCase().includes(term.toLowerCase()) ||
      c.nif.toLowerCase().includes(term.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
           <h3 className="text-sm font-semibold text-gray-900 mb-2">Tipo de Documento</h3>
           <DocumentoTipoSelector value={tipoDocumento} onChange={setTipoDocumento} />
        </div>
      </div>
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">
          Passo 1: Selecionar Cliente
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          Pesquise por nome ou NIF do cliente ou crie um novo registo
        </p>

        {/* Barra de Pesquisa */}
        <Card className="mb-4 p-2 bg-gray-50/50 border-gray-200">
          <SearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Pesquisar cliente por nome ou NIF..."
            isSearching={isSearching}
            count={filteredClientes.length}
            countLabel={{ singular: "cliente", plural: "clientes" }}
          />
        </Card>

        {/* Lista de Clientes Filtrados */}
        {filteredClientes.length === 0 && store.clientes.length === 0 ? (
          <div className="text-center py-10 bg-gray-50/80 rounded-xl border-2 border-dashed border-gray-200">
            <p className="text-gray-500 text-sm mb-4">Nenhum cliente cadastrado no sistema</p>
            <Button
              onClick={() => setShowModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Criar Primeiro Cliente
            </Button>
          </div>
        ) : filteredClientes.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-xl">
            <p className="text-sm font-medium text-gray-600">Nenhum cliente encontrado</p>
            <p className="text-xs text-gray-400 mt-1 mb-4">Não encontramos resultados para "{searchTerm}"</p>
            <Button
              onClick={() => setShowModal(true)}
              variant="outline"
              size="sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Cadastrar "{searchTerm}" como Novo Cliente
            </Button>
          </div>
        ) : (
          <div className="grid gap-3 max-h-80 overflow-y-auto pr-1">
            {filteredClientes.map((cliente) => {
              const isSelected = clienteSelecionado?.id === cliente.id;
              return (
                <Card
                  key={cliente.id}
                  className={`p-4 cursor-pointer border-2 transition-all ${
                    isSelected
                      ? "border-blue-600 bg-blue-50/80 shadow-sm"
                      : "border-gray-200 hover:border-blue-300 hover:bg-blue-50/20"
                  }`}
                  onClick={() => onSelectCliente(cliente)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        {cliente.nome}
                        {isSelected && (
                          <span className="inline-flex items-center gap-1 text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full font-normal">
                            <Check className="w-3 h-3" /> Selecionado
                          </span>
                        )}
                      </h3>
                      <div className="flex items-center gap-4 text-xs text-gray-600 mt-1">
                        <span>NIF: <strong className="font-mono text-gray-800">{cliente.nif}</strong></span>
                        {cliente.telefone && <span>Tel: {cliente.telefone}</span>}
                        {cliente.email && <span className="hidden sm:inline">Email: {cliente.email}</span>}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Botão de Criação Rápida */}
        {store.clientes.length > 0 && (
          <div className="mt-4">
            <Button
              onClick={() => setShowModal(true)}
              variant="outline"
              className="w-full border-dashed text-gray-600 hover:text-blue-600 hover:border-blue-400 hover:bg-blue-50/30"
            >
              <Plus className="w-4 h-4 mr-2" />
              Criar Novo Cliente
            </Button>
          </div>
        )}
      </div>

      {/* Resumo do Cliente Selecionado */}
      {clienteSelecionado && (
        <Card className="bg-green-50/90 border-green-200 p-4 rounded-xl shadow-sm animate-in fade-in">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-green-500 text-white rounded-lg shrink-0">
              <UserCheck className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-green-700">Cliente Confirmado</p>
                  <h3 className="text-base font-bold text-green-950 mt-0.5">{clienteSelecionado.nome}</h3>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-green-800 mt-2 border-t border-green-200/60 pt-2">
                <p>NIF: <strong className="font-mono">{clienteSelecionado.nif}</strong></p>
                <p>Telefone: <strong>{clienteSelecionado.telefone || "N/A"}</strong></p>
                <p>Email: <strong>{clienteSelecionado.email || "N/A"}</strong></p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Navegação */}
      <div className="flex justify-end pt-4 border-t">
        <Button
          onClick={onNext}
          disabled={!clienteSelecionado}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6"
        >
          Próximo: Adicionar Linhas
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>

      {/* Modal de Criação de Cliente */}
      {showModal && (
        <ClienteFormModal
          onClose={() => setShowModal(false)}
          onSave={() => {
            setShowModal(false);
            const lastCliente = store.clientes[store.clientes.length - 1];
            if (lastCliente) {
              onSelectCliente(lastCliente);
            }
          }}
        />
      )}
    </div>
  );
}
