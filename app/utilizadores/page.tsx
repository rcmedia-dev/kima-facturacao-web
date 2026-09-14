"use client";

import { useState, useEffect, useCallback } from "react";
import { usePermissions } from "@/hooks/use-permissions";
import { useRouter } from "next/navigation";
import { UserCog, Plus, Users, Shield, ShieldCheck, Clock, UserX, Pencil } from "lucide-react";
import { UtilizadorTable, StatusBadge, getInitials } from "./components/utilizador-table";
import { UtilizadorFormModal } from "./components/utilizador-form-modal";
import { UtilizadorPermissionsModal } from "./components/utilizador-permissions-modal";
import { ConfirmModal } from "@/components/confirm-modal";
import { useToastContext } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
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
  const [filtroEstado, setFiltroEstado] = useState<string>("todos");
  const [pesquisa, setPesquisa] = useState("");

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

  const funcionarios = utilizadores.filter((u) => !u.isOwner);

  const funcionariosFiltrados = funcionarios.filter((u) => {
    const matchEstado =
      filtroEstado === "todos" || u.status === filtroEstado;
    const matchPesquisa =
      !pesquisa ||
      (u.fullName || "").toLowerCase().includes(pesquisa.toLowerCase()) ||
      u.email.toLowerCase().includes(pesquisa.toLowerCase());
    return matchEstado && matchPesquisa;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-5 animate-slide-up">

      {/* ═══════════════ MOBILE ═══════════════ */}
      <div className="sm:hidden space-y-4">
        {/* Mobile Header */}
        <div className="flex items-center justify-between px-4 pt-4">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
              Utilizadores
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {funcionarios.length} funcionários
            </p>
          </div>
          <button
            onClick={() => {
              setEditingUser(null);
              setShowFormModal(true);
            }}
            className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/25"
          >
            <Plus size={18} />
          </button>
        </div>

        {/* Segmented Status Filter */}
        <div className="flex gap-1.5 sm:hidden px-4">
          {[
            { key: "todos", label: `Todos (${funcionarios.length})` },
            { key: "ativo", label: `Ativos (${funcionariosAtivos})` },
            { key: "pendente", label: `Pendentes (${funcionariosPendentes})` },
            { key: "inativo", label: `Inativos (${funcionariosInativos})` },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFiltroEstado(f.key)}
              className={cn(
                "flex-1 py-2.5 px-2 rounded-[10px] text-[11px] font-[700] border-[1.5px] transition-all text-center",
                filtroEstado === f.key
                  ? f.key === "todos"
                    ? "bg-blue-600 text-white border-blue-600 shadow-[0_2px_8px_rgba(59,130,246,0.25)]"
                    : f.key === "ativo"
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-[0_2px_8px_rgba(16,185,129,0.25)]"
                    : f.key === "pendente"
                    ? "bg-amber-500 text-white border-amber-500 shadow-[0_2px_8px_rgba(245,158,11,0.25)]"
                    : "bg-red-500 text-white border-red-500 shadow-[0_2px_8px_rgba(244,63,94,0.25)]"
                  : "bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="px-4">
          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 shadow-sm">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-400 shrink-0"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              type="text"
              placeholder="Nome ou email..."
              value={pesquisa}
              onChange={(e) => setPesquisa(e.target.value)}
              className="flex-1 bg-transparent border-none outline-none text-[13px] text-slate-900 dark:text-white placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Result Count + Limpar */}
        <div className="flex items-center justify-between px-4">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            {funcionariosFiltrados.length} resultado{funcionariosFiltrados.length !== 1 ? "s" : ""}
          </span>
          {(filtroEstado !== "todos" || pesquisa) && (
            <button
              onClick={() => { setFiltroEstado("todos"); setPesquisa(""); }}
              className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold"
            >
              Limpar filtros
            </button>
          )}
        </div>

        {/* Mobile Cards */}
        <div className="px-4 pb-4 space-y-2">
          {funcionariosFiltrados.length === 0 && (
            <div className="py-12 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
                <UserCog className="w-5 h-5 text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Nenhum funcionário encontrado</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Ajuste os filtros ou crie um novo funcionário.</p>
            </div>
          )}
          {funcionariosFiltrados.map((user) => (
            <div
              key={user.id}
              className={cn(
                "bg-white dark:bg-slate-900 rounded-xl p-3.5 shadow-sm border-l-[3px]",
                user.status === "ativo"
                  ? "border-l-emerald-500"
                  : user.status === "pendente"
                  ? "border-l-amber-500"
                  : "border-l-red-500"
              )}
            >
              <div className="flex items-start justify-between mb-2.5">
                <div className="flex items-center gap-2.5">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-[10px] flex items-center justify-center text-white font-bold text-sm shrink-0",
                      user.isOwner
                        ? "bg-gradient-to-br from-amber-500 to-orange-500"
                        : "bg-gradient-to-br from-blue-600 to-indigo-500"
                    )}
                  >
                    {getInitials(user.fullName, user.email)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-slate-900 dark:text-white truncate">
                      {user.fullName || user.email.split("@")[0]}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {user.email}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex gap-1.5">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md",
                      user.isOwner
                        ? "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                    )}
                  >
                    {user.isOwner ? <ShieldCheck size={10} /> : <Shield size={10} />}
                    {user.isOwner ? "Admin" : "Funcionário"}
                  </span>
                  <StatusBadge status={user.status} />
                </div>
                {!user.isOwner && (
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => setPermissionsUser(user)}
                      className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center"
                    >
                      <Shield size={13} />
                    </button>
                    <button
                      onClick={() => { setEditingUser(user); setShowFormModal(true); }}
                      className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center"
                    >
                      <Pencil size={13} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══════════════ DESKTOP ═══════════════ */}
      <div className="hidden sm:block space-y-5">
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
          utilizadores={funcionarios}
          onEdit={(user) => {
            setEditingUser(user);
            setShowFormModal(true);
          }}
          onDelete={(id) => setDeleteId(id)}
          onManagePermissions={(user) => setPermissionsUser(user)}
        />
      </div>
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
