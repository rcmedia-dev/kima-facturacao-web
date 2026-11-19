"use client";

import { useEffect, useState } from "react";
import {
  Clock3,
  Plus,
  Search,
  Shield,
  UserCog,
  UserX,
  Users,
} from "lucide-react";

import {
  getInitials,
  StatusBadge,
  UtilizadorTable,
} from "./components/utilizador-table";
import { UtilizadorPermissionsModal } from "./components/utilizador-permissions-modal";
import { UtilizadorFormModal } from "./components/utilizador-form-modal";
import type { UtilizadorData } from "./types";

interface Employee {
  id: string;
  user_id: string;
  auth_source: "hub" | "faturas";
  email: string;
  full_name: string | null;
  status: "ativo" | "inativo";
  created_at: string;
  permissions: string[];
}
interface Invitation {
  id: string;
  email: string;
  full_name: string | null;
  invite_url?: string | null;
  expires_at: string;
  created_at: string;
}

function getLegacyInviteLinks(invitations: Invitation[]): Record<string, string> {
  try {
    const storageKey = "kima-facturas-invite-links";
    const stored =
      window.localStorage.getItem(storageKey) ||
      window.sessionStorage.getItem(storageKey);
    if (!stored) return {};

    const parsed: unknown = JSON.parse(stored);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};

    const cachedLinks = parsed as Record<string, unknown>;
    const pendingIds = new Set(invitations.map((invitation) => invitation.id));
    const validLinks: Record<string, string> = {};
    for (const [invitationId, url] of Object.entries(cachedLinks)) {
      if (pendingIds.has(invitationId) && typeof url === "string") {
        validLinks[invitationId] = url;
      }
    }

    window.localStorage.setItem(storageKey, JSON.stringify(validLinks));
    window.sessionStorage.removeItem(storageKey);
    return validLinks;
  } catch {
    return {};
  }
}

async function fetchEmployeeData(): Promise<{
  employees: Employee[];
  invitations: Invitation[];
}> {
  const response = await fetch("/api/utilizadores", { cache: "no-store" });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || "Não foi possível carregar os funcionários.");
  }
  return {
    employees: result.employees || [],
    invitations: result.invitations || [],
  };
}

export default function UtilizadoresPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteUrl, setInviteUrl] = useState("");
  const [permissionsEmployee, setPermissionsEmployee] =
    useState<UtilizadorData | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"todos" | "ativo" | "inativo">(
    "todos"
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [legacyInviteLinks, setLegacyInviteLinks] = useState<Record<string, string>>({});

  const employeesForTable: UtilizadorData[] = employees.map((employee) => ({
    id: employee.id,
    userId: employee.user_id,
    authSource: employee.auth_source,
    email: employee.email,
    fullName: employee.full_name,
    isOwner: false,
    status: employee.status,
    permissions: employee.permissions,
    createdAt: employee.created_at,
    updatedAt: employee.created_at,
  }));
  const normalizedSearch = search.trim().toLowerCase();
  const filteredEmployees = employeesForTable.filter((employee) => {
    const matchesStatus =
      statusFilter === "todos" || employee.status === statusFilter;
    const matchesSearch =
      !normalizedSearch ||
      `${employee.fullName || ""} ${employee.email}`
        .toLowerCase()
        .includes(normalizedSearch);
    return matchesStatus && matchesSearch;
  });
  const activeEmployees = employees.filter(
    (employee) => employee.status === "ativo"
  ).length;
  const inactiveEmployees = employees.length - activeEmployees;

  useEffect(() => {
    let active = true;
    fetchEmployeeData()
      .then((result) => {
        if (!active) return;
        setEmployees(result.employees);
        setInvitations(result.invitations);
        setLegacyInviteLinks(getLegacyInviteLinks(result.invitations));
      })
      .catch((error: unknown) => {
        if (!active) return;
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Não foi possível carregar os funcionários."
        );
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  async function refreshData() {
    setErrorMessage("");
    try {
      const result = await fetchEmployeeData();
      setEmployees(result.employees);
      setInvitations(result.invitations);
      setLegacyInviteLinks(getLegacyInviteLinks(result.invitations));
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar os funcionários."
      );
    }
  }

  async function toggleEmployeeStatus(employee: UtilizadorData) {
    setIsSaving(true);
    setErrorMessage("");
    setNotice("");
    try {
      const response = await fetch("/api/utilizadores", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: employee.userId,
          authSource: employee.authSource,
          status: employee.status === "ativo" ? "inativo" : "ativo",
          permissions: employee.permissions,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Não foi possível atualizar o acesso.");
      }
      setNotice(
        employee.status === "ativo"
          ? "Acesso do funcionário desativado."
          : "Acesso do funcionário reativado."
      );
      await refreshData();
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar o acesso."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function revokeInvitation(invitationId: string) {
    setIsSaving(true);
    setErrorMessage("");
    setNotice("");
    try {
      const response = await fetch("/api/utilizadores", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitationId }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Não foi possível cancelar o convite.");
      }
      setNotice("Convite cancelado.");
      await refreshData();
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error ? error.message : "Não foi possível cancelar o convite."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function copyInvitationLink() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setNotice("Link copiado.");
    } catch {
      setErrorMessage("Não foi possível copiar automaticamente. Selecione e copie o link.");
    }
  }

  async function copyPendingInviteLink(invitation: Invitation) {
    const url = invitation.invite_url || legacyInviteLinks[invitation.id];
    if (!url) {
      setErrorMessage(
        "Este convite é antigo e o link original não está disponível para cópia."
      );
      return;
    }

    setErrorMessage("");
    setNotice("");
    setInviteUrl(url);
    try {
      await navigator.clipboard.writeText(url);
      setNotice("Link do convite copiado.");
    } catch {
      setNotice("Selecione e copie o link apresentado no campo abaixo.");
    }
  }

  return (
    <main className="mx-auto max-w-7xl space-y-5 py-6 animate-slide-up">
      <header className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-900/30">
            <UserCog size={20} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              Utilizadores
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {employees.length} funcionário{employees.length === 1 ? "" : "s"} ·{" "}
              {invitations.length} convite{invitations.length === 1 ? "" : "s"} pendente
              {invitations.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setErrorMessage("");
            setShowInviteForm(true);
          }}
          className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl bg-blue-600 px-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 sm:px-4"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Convidar funcionário</span>
          <span className="sm:hidden">Convidar</span>
        </button>
      </header>

      {errorMessage && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          {errorMessage}
        </p>
      )}
      {notice && (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
          {notice}
        </p>
      )}

      {inviteUrl && (
        <section className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/30">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            Link de convite criado — válido durante 7 dias
          </p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input
              aria-label="Link de convite"
              readOnly
              value={inviteUrl}
              className="h-10 min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
            />
            <button
              type="button"
              onClick={() => void copyInvitationLink()}
              className="h-10 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Copiar link
            </button>
          </div>
        </section>
      )}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="Total" value={employees.length} detail="Funcionários" icon={Users} tone="blue" />
        <MetricCard label="Ativos" value={activeEmployees} detail="Com acesso ativo" icon={Shield} tone="green" />
        <MetricCard label="Pendentes" value={invitations.length} detail="Aguardam primeiro acesso" icon={Clock3} tone="amber" />
        <MetricCard label="Inativos" value={inactiveEmployees} detail="Sem acesso ao módulo" icon={UserX} tone="red" />
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative min-w-0 flex-1 sm:max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              placeholder="Pesquisar por nome ou email..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>
          <div className="flex gap-1.5">
            {[
              { value: "todos", label: `Todos (${employees.length})` },
              { value: "ativo", label: `Ativos (${activeEmployees})` },
              { value: "inativo", label: `Inativos (${inactiveEmployees})` },
            ].map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() =>
                  setStatusFilter(filter.value as "todos" | "ativo" | "inativo")
                }
                className={`flex-1 rounded-lg border px-2.5 py-2 text-[11px] font-semibold transition-colors sm:flex-none ${
                  statusFilter === filter.value
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3 p-5">
            <div className="h-12 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
            <div className="h-12 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
            <div className="h-12 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
          </div>
        ) : (
          <>
            <div className="hidden sm:block">
              <UtilizadorTable
                utilizadores={filteredEmployees}
                onManagePermissions={setPermissionsEmployee}
                onToggleStatus={(employee) => void toggleEmployeeStatus(employee)}
              />
            </div>
            <div className="divide-y divide-slate-100 sm:hidden dark:divide-slate-800">
              {filteredEmployees.length === 0 ? (
                <p className="px-4 py-12 text-center text-sm text-slate-500">
                  Nenhum funcionário encontrado.
                </p>
              ) : (
                filteredEmployees.map((employee) => (
                  <article key={employee.id} className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-500 text-sm font-bold text-white">
                        {getInitials(employee.fullName, employee.email)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                            {employee.fullName || employee.email.split("@")[0]}
                          </h2>
                          <StatusBadge status={employee.status} />
                        </div>
                        <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                          {employee.email}
                        </p>
                        <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                          {employee.permissions.length} permissões
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2 pl-[52px]">
                      <button
                        type="button"
                        onClick={() => setPermissionsEmployee(employee)}
                        className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                      >
                        Permissões
                      </button>
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() => void toggleEmployeeStatus(employee)}
                        className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600 disabled:opacity-50 dark:bg-slate-800 dark:text-slate-300"
                      >
                        {employee.status === "ativo" ? "Desativar" : "Reativar"}
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </>
        )}
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5 dark:border-slate-800">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Convites pendentes
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Funcionários que ainda não concluíram o primeiro acesso. O link do
              convite permanece disponível enquanto estiver pendente.
            </p>
          </div>
          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
            {invitations.length}
          </span>
        </div>
        {invitations.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-slate-500">
            Não há convites pendentes.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {invitations.map((invitation) => (
              <li
                key={invitation.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-50 text-xs font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                    {getInitials(invitation.full_name, invitation.email)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                      {invitation.full_name || invitation.email}
                    </p>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                      {invitation.email} · Expira{" "}
                      {new Date(invitation.expires_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {invitation.invite_url || legacyInviteLinks[invitation.id] ? (
                    <button
                      type="button"
                      onClick={() => void copyPendingInviteLink(invitation)}
                      className="rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-50 dark:border-blue-900 dark:text-blue-300 dark:hover:bg-blue-950/30"
                    >
                      Copiar link
                    </button>
                  ) : (
                    <span className="px-2 py-2 text-xs text-slate-500">
                      Link antigo indisponível
                    </span>
                  )}
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => void revokeInvitation(invitation.id)}
                    className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/30"
                  >
                    Cancelar convite
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {showInviteForm && (
        <UtilizadorFormModal
          onClose={() => setShowInviteForm(false)}
          onSave={() => {
            setShowInviteForm(false);
            setNotice("Convite criado. Copie e partilhe o link com o funcionário.");
            void refreshData();
          }}
          onInviteUrl={(url, invitationId) => {
            setInviteUrl(url);
            const nextLinks = {
              ...legacyInviteLinks,
              [invitationId]: url,
            };
            setLegacyInviteLinks(nextLinks);
            try {
              window.localStorage.setItem(
                "kima-facturas-invite-links",
                JSON.stringify(nextLinks)
              );
            } catch {
              setErrorMessage(
                "Convite criado, mas o link não pôde ser guardado neste navegador. Copie-o antes de sair desta página."
              );
            }
          }}
        />
      )}

      {permissionsEmployee && (
        <UtilizadorPermissionsModal
          utilizador={permissionsEmployee}
          onClose={() => setPermissionsEmployee(null)}
          onSave={() => {
            setPermissionsEmployee(null);
            setNotice("Permissões atualizadas.");
            void refreshData();
          }}
        />
      )}
    </main>
  );
}

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  detail: string;
  icon: typeof Users;
  tone: "blue" | "green" | "amber" | "red";
}) {
  const toneStyles = {
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
    green: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
    amber: "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
    red: "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400",
  };

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {label}
        </span>
        <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${toneStyles[tone]}`}>
          <Icon size={16} />
        </span>
      </div>
      <p className="mt-1.5 text-[22px] font-extrabold leading-tight text-slate-900 dark:text-white">
        {value}
      </p>
      <p className="mt-0.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
        {detail}
      </p>
    </article>
  );
}
