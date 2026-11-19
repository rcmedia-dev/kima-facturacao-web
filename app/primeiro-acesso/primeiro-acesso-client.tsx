"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { createBrowserClient } from "@/lib/supabase-ssr";
import { getSupabaseAuthConfig } from "@/lib/auth-source";

type AcceptanceResult = {
  success?: boolean;
  companyId?: string;
  email?: string;
  accountCreated?: boolean;
  code?: string;
  error?: string;
};

export default function PrimeiroAcessoClient({ initialToken }: { initialToken: string }) {
  const router = useRouter();
  const [token] = useState(initialToken);
  const [currentUserEmail, setCurrentUserEmail] = useState("");
  const [invitationEmail, setInvitationEmail] = useState("");
  const [mode, setMode] = useState<"new" | "existing">("new");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (
      !process.env.NEXT_PUBLIC_FATURAS_AUTH_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_FATURAS_AUTH_SUPABASE_ANON_KEY
    ) return;
    const config = getSupabaseAuthConfig("faturas");
    const supabase = createBrowserClient(config.url, config.anonKey);
    void supabase.auth.getUser().then(({ data, error }) => {
      if (error && error.status !== 401 && error.name !== "AuthSessionMissingError") {
        setErrorMessage("Não foi possível verificar a sessão atual.");
        return;
      }
      if (data.user?.email) setCurrentUserEmail(data.user.email);
    });
  }, []);

  async function acceptInvitation(passwordToSet?: string) {
    setIsLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch("/api/auth/primeiro-acesso", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          ...(passwordToSet ? { password: passwordToSet } : {}),
        }),
      });
      const result = (await response.json()) as AcceptanceResult;

      if (response.status === 409 && result.code === "account_exists") {
        setInvitationEmail(result.email || "");
        setMode("existing");
        setPassword("");
        setConfirmPassword("");
        setErrorMessage(result.error || "Este email já tem uma conta Kima.");
        return;
      }
      if (!response.ok || !result.success || !result.companyId) {
        setErrorMessage(result.error || "Não foi possível aceitar o convite.");
        return;
      }

      const email = result.email || invitationEmail || currentUserEmail;
      if (result.accountCreated) {
        if (!passwordToSet || !email) {
          setSuccessMessage(
            "Convite aceite. Inicie sessão para entrar no Kima Faturas."
          );
          return;
        }

        const { url, anonKey } = getSupabaseAuthConfig("faturas");
        const supabase = createBrowserClient(url, anonKey);
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password: passwordToSet,
        });
        if (signInError) {
          setSuccessMessage(
            "Convite aceite. Inicie sessão com a palavra-passe definida para continuar."
          );
          return;
        }
      }

      const contextResponse = await fetch("/api/auth/context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: result.companyId,
          authSource: "faturas",
        }),
      });
      const contextResult = await contextResponse.json();
      if (!contextResponse.ok || !contextResult.success) {
        setSuccessMessage(
          "Convite aceite, mas não foi possível iniciar a sessão nesta empresa. Tente entrar novamente ou contacte o administrador."
        );
        return;
      }

      router.replace("/dashboard");
      router.refresh();
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error &&
          error.message.includes("não está configurada")
          ? error.message
          : "Não foi possível ligar ao servidor. Tente novamente."
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleNewAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password.length < 8) {
      setErrorMessage("A palavra-passe deve ter pelo menos 8 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage("As palavras-passe não coincidem.");
      return;
    }
    await acceptInvitation(password);
  }

  async function handleExistingAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!invitationEmail || !currentPassword) {
      setErrorMessage("Introduza a palavra-passe da conta existente.");
      return;
    }
    setIsLoading(true);
    setErrorMessage("");
    try {
      const { url, anonKey } = getSupabaseAuthConfig("faturas");
      const supabase = createBrowserClient(url, anonKey);
      const { error } = await supabase.auth.signInWithPassword({
        email: invitationEmail,
        password: currentPassword,
      });
      if (error) {
        setErrorMessage("Email ou palavra-passe inválidos.");
        return;
      }
      setCurrentUserEmail(invitationEmail);
      await acceptInvitation();
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error ? error.message : "Não foi possível iniciar sessão."
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function signOutDifferentAccount() {
    try {
      const { url, anonKey } = getSupabaseAuthConfig("faturas");
      const supabase = createBrowserClient(url, anonKey);
      const { error } = await supabase.auth.signOut();
      if (error) {
        setErrorMessage("Não foi possível terminar a sessão atual.");
        return;
      }
      setCurrentUserEmail("");
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error ? error.message : "Não foi possível terminar a sessão atual."
      );
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F3F4F6] px-4 py-10 dark:bg-[#0F172A]">
      <section className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">
          Primeiro acesso ao Kima Faturas
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          {mode === "existing"
            ? "Este email já tem uma conta Kima. Entre com a palavra-passe existente para aceitar o convite."
            : "Defina a palavra-passe da sua conta para ativar o acesso ao módulo."}
        </p>

        {!token && (
          <p className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">
            O link de convite está incompleto ou inválido.
          </p>
        )}
        {(!process.env.NEXT_PUBLIC_FATURAS_AUTH_SUPABASE_URL ||
          !process.env.NEXT_PUBLIC_FATURAS_AUTH_SUPABASE_ANON_KEY) && (
          <p className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">
            A autenticação do Kima Faturas não está configurada.
          </p>
        )}
        {errorMessage && (
          <p className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">
            {errorMessage}
          </p>
        )}
        {successMessage && (
          <p className="mt-5 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
            {successMessage}
          </p>
        )}

        {currentUserEmail && mode === "new" ? (
          <div className="mt-6 space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Sessão atual: <strong>{currentUserEmail}</strong>
            </p>
            <button
              type="button"
              disabled={!token || isLoading}
              onClick={() => void acceptInvitation()}
              className="h-11 w-full rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? "A aceitar..." : "Aceitar convite com esta conta"}
            </button>
            <button
              type="button"
              onClick={() => void signOutDifferentAccount()}
              className="w-full text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
            >
              Terminar sessão e usar outra conta
            </button>
          </div>
        ) : mode === "existing" ? (
          <form onSubmit={handleExistingAccount} className="mt-6 space-y-4">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              Email
              <input
                type="email"
                value={invitationEmail}
                readOnly
                className="mt-1 h-11 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              Palavra-passe atual
              <input
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                required
                className="mt-1 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-900"
              />
            </label>
            <button
              type="submit"
              disabled={!token || isLoading}
              className="h-11 w-full rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? "A validar..." : "Entrar e aceitar convite"}
            </button>
          </form>
        ) : !currentUserEmail && (
          <form onSubmit={handleNewAccount} className="mt-6 space-y-4">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              Nova palavra-passe
              <input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={8}
                className="mt-1 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-900"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              Confirmar palavra-passe
              <input
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                minLength={8}
                className="mt-1 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-900"
              />
            </label>
            <button
              type="submit"
              disabled={!token || isLoading}
              className="h-11 w-full rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? "A ativar..." : "Definir palavra-passe e aceitar"}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
