"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Loader2, Eye, EyeOff, ShieldCheck, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";

function PrimeiroAcessoForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const companyCode = searchParams.get("companyCode") || "";
  const email = searchParams.get("email") || "";
  const companyName = searchParams.get("companyName") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!companyCode || !email) {
    return (
      <div className="min-h-screen bg-[#F3F4F6] dark:bg-[#0F172A] flex items-center justify-center px-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md shadow-sm p-6 sm:p-9 max-w-md w-full text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Link inválido ou expirado.{" "}
            <a href="/login" className="text-blue-600 dark:text-blue-400 font-semibold hover:underline">
              Voltar ao login
            </a>
          </p>
        </div>
      </div>
    );
  }

  const passwordsMatch = password === confirmPassword || confirmPassword === "";
  const passwordValid = password.length >= 6;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!passwordValid) {
      setErrorMsg("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg("As senhas não coincidem.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/primeiro-acesso", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyCode, email, password, confirmPassword }),
      });

      const result = await response.json();

      if (!response.ok) {
        setErrorMsg(result.error || "Erro ao definir senha.");
        return;
      }

      setSuccess(true);
      setTimeout(() => router.push("/login"), 3000);
    } catch {
      setErrorMsg("Não foi possível conectar ao servidor. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#F3F4F6] dark:bg-[#0F172A] flex items-center justify-center px-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md shadow-sm p-6 sm:p-9 max-w-md w-full text-center animate-scale-in">
          <CheckCircle2 size={48} className="mx-auto text-emerald-500 mb-4" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            Senha criada com sucesso!
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            A redirecionar para o login...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F3F4F6] dark:bg-[#0F172A] flex items-center justify-center px-4">
      <div className="w-full max-w-md animate-scale-in">
        {/* Marca */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 text-white font-extrabold text-2xl shadow-lg mb-3">
            K
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            KIMA <span className="text-blue-600 dark:text-blue-400">FINANCEIRO</span>
          </h1>
          <p className="text-xs uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider mt-1">
            Facturação Web
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md shadow-sm dark:shadow-black/20 p-6 sm:p-9">
          <div className="mb-6">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Primeiro Acesso
            </h2>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-1.5">
              Defina a sua senha para poder aceder ao sistema.
            </p>
            {companyName && (
              <div className="mt-3 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 rounded-lg px-3 py-2">
                <ShieldCheck size={14} className="text-blue-500 shrink-0" />
                <span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">{companyName}</span>
                  {" · "}
                  {email}
                </span>
              </div>
            )}
          </div>

          {errorMsg && (
            <div className="mb-5 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/60 text-red-700 dark:text-red-300 text-sm animate-scale-in">
              {errorMsg}
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-5" noValidate>
            {/* Nova senha */}
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder=" "
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`peer w-full h-[52px] rounded-xl border bg-white dark:bg-slate-900 px-4 pt-5 pb-1.5 pr-11 text-sm text-slate-900 dark:text-white outline-none transition-all duration-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/30 ${
                  !passwordValid && password.length > 0
                    ? "border-red-500"
                    : "border-slate-300 dark:border-slate-700"
                }`}
              />
              <label
                htmlFor="password"
                className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400 dark:text-slate-500 transition-all duration-200 pointer-events-none peer-focus:top-3.5 peer-focus:text-xs peer-focus:text-blue-600 peer-focus:font-semibold peer-[:not(:placeholder-shown)]:top-3.5 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-slate-500"
              >
                Nova senha (mín. 6 caracteres)*
              </label>
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>

            {/* Confirmar senha */}
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirm ? "text" : "password"}
                autoComplete="new-password"
                placeholder=" "
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`peer w-full h-[52px] rounded-xl border bg-white dark:bg-slate-900 px-4 pt-5 pb-1.5 pr-11 text-sm text-slate-900 dark:text-white outline-none transition-all duration-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/30 ${
                  !passwordsMatch ? "border-red-500" : "border-slate-300 dark:border-slate-700"
                }`}
              />
              <label
                htmlFor="confirmPassword"
                className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400 dark:text-slate-500 transition-all duration-200 pointer-events-none peer-focus:top-3.5 peer-focus:text-xs peer-focus:text-blue-600 peer-focus:font-semibold peer-[:not(:placeholder-shown)]:top-3.5 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-slate-500"
              >
                Confirmar senha*
              </label>
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                {showConfirm ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
              {!passwordsMatch && confirmPassword.length > 0 && (
                <p className="text-red-500 text-xs mt-1.5">As senhas não coincidem.</p>
              )}
            </div>

            <Button
              disabled={isLoading || !passwordValid || !passwordsMatch}
              type="submit"
              className="w-full h-[52px] text-base font-semibold rounded-xl bg-none bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  A guardar...
                </>
              ) : (
                "Definir Senha"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function PrimeiroAcessoPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F3F4F6] dark:bg-[#0F172A] flex items-center justify-center">
          <Loader2 size={24} className="animate-spin text-blue-600" />
        </div>
      }
    >
      <PrimeiroAcessoForm />
    </Suspense>
  );
}
