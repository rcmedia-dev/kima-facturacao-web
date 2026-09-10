"use client";

import { useState, useEffect, useCallback } from "react";
import { usePermissions } from "@/hooks/use-permissions";
import { useRouter } from "next/navigation";
import { UserCog, Plus, Users, Shield, Clock, UserX } from "lucide-react";
import { UtilizadorTable } from "./components/utilizador-table";
import { UtilizadorFormModal } from "./components/utilizador-form-modal";
import { UtilizadorPermissionsModal } from "./components/utilizador-permissions-modal";
import { ConfirmModal } from "@/components/confirm-modal";
import { useToastContext } from "@/components/ui/toast";
import type { UtilizadorData } from "./types";

export default function UtilizadoresPage() {
  const router = useRouter();
  const { isOwner, loaded: permsLoaded } = usePermissions();
  const { success, error } = useToastContext();

  const [utilizadores, setUtilizadores] = useState<UtilizadorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UtilizadorData | null>(null);
  const [permissionsUser, setPermissionsUser] = useState<UtilizadorData | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchUtilizadores = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/utilizadores");
      const data = await res.json();
      if (!res.ok) {
        error("Erro", data.error || "Erro ao listar utilizadores.");
      } else {
        setUtilizadores(data.users || []);
      }
    } catch {
      error("Erro", "Não foi possível carregar utilizadores.");
    }
    setLoading(false);
  }, [error]);

  useEffect(() => {
    if (permsLoaded) {
      if (!isOwner) {
        router.replace("/acesso-negado");
        return;
      }
      fetchUtilizadores();
    }
  }, [permsLoaded, isOwner, router, fetchUtilizadores]);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/utilizadores?userId=${deleteId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        error("Erro", data.error || "Erro ao remover.");
      } else {
        success("Sucesso", "Utilizador removido com sucesso.");
        fetchUtilizadores();
      }
    } catch {
      error("Erro", "Não foi possível remover o utilizador.");
    }
    setDeleteId(null);
  };

  if (!permsLoaded || loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-5 animate-pulse">
        <div className="h-8 w-40 bg-slate-200 dark:bg-slate-800 rounded-xl" />
        <div className="h-14 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
        <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
      </div>
    );
  }

  if (!isOwner) return null;

  const totalFuncionarios = utilizadores.filter((u) => !u.isOwner).length;
  const funcionariosAtivos = utilizadores.filter(
    (u) => !u.isOwner && u.status === "ativo"
  ).length;
  const funcionariosPendentes = utilizadores.filter(
    (u) => !u.isOwner && u.status === "pendente"
  ).length;
  const funcionariosInativos = utilizadores.filter(
    (u) => !u.isOwner && u.status === "inativo"
  ).length;

  return (
    <div className="max-w-7xl mx-auto space-y-5 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30">
            <UserCog size={20} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Utilizadores
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {utilizadores.length}{" "}
              {utilizadores.length === 1
                ? "utilizador registado"
                : "utilizadores registados"}
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setEditingUser(null);
            setShowFormModal(true);
          }}
          className="btn-primary"
        >
          <Plus size={16} />
          Novo Funcionário
        </button>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total
            </span>
            <span className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Users size={16} />
            </span>
          </div>
          <p className="text-[22px] font-extrabold leading-tight text-slate-900 dark:text-white mt-1.5">
            {totalFuncionarios}
          </p>
          <p className="text-[11.5px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
            Funcionários
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Ativos
            </span>
            <span className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Shield size={16} />
            </span>
          </div>
          <p className="text-[22px] font-extrabold leading-tight text-slate-900 dark:text-white mt-1.5">
            {funcionariosAtivos}
          </p>
          <p className="text-[11.5px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
            Com acesso ativo
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Pendentes
            </span>
            <span className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock size={16} />
            </span>
          </div>
          <p className="text-[22px] font-extrabold leading-tight text-slate-900 dark:text-white mt-1.5">
            {funcionariosPendentes}
          </p>
          <p className="text-[11.5px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
            Primeiro acesso
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Inativos
            </span>
            <span className="w-9 h-9 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center">
              <UserX size={16} />
            </span>
          </div>
          <p className="text-[22px] font-extrabold leading-tight text-slate-900 dark:text-white mt-1.5">
            {funcionariosInativos}
          </p>
          <p className="text-[11.5px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
            Sem acesso
          </p>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
        <UtilizadorTable
          utilizadores={utilizadores.filter((u) => !u.isOwner)}
          onEdit={(user) => {
            setEditingUser(user);
            setShowFormModal(true);
          }}
          onDelete={(id) => setDeleteId(id)}
          onManagePermissions={(user) => setPermissionsUser(user)}
        />
      </div>

      {/* Modal: Criar/Editar */}
      {showFormModal && (
        <UtilizadorFormModal
          utilizador={editingUser || undefined}
          onClose={() => {
            setShowFormModal(false);
            setEditingUser(null);
          }}
          onSave={() => {
            setShowFormModal(false);
            setEditingUser(null);
            fetchUtilizadores();
          }}
        />
      )}

      {/* Modal: Permissões */}
      {permissionsUser && (
        <UtilizadorPermissionsModal
          utilizador={permissionsUser}
          onClose={() => setPermissionsUser(null)}
          onSave={() => {
            setPermissionsUser(null);
            fetchUtilizadores();
          }}
        />
      )}

      {/* Modal: Confirmar remoção */}
      {deleteId && (
        <ConfirmModal
          title="Remover Funcionário"
          description="Tem certeza de que deseja remover este funcionário? Esta ação é irreversível e todas as permissões serão revogadas."
          confirmText="Remover"
          variant="danger"
          onClose={() => setDeleteId(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
