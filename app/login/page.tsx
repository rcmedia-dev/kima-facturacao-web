"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase-ssr";
import {
  getSupabaseAuthConfig,
  type SupabaseAuthSource,
} from "@/lib/auth-source";
import {
  Loader2,
  Eye,
  EyeOff,
  ShieldCheck,
  Building2,
  ArrowLeft,
} from "lucide-react";

import { Button } from "@/components/ui/button";

type Step = "credentials" | "password" | "select-company";

interface CompanyOption {
  id: string;
  name: string;
}

export default function LoginPage() {
  const router = useRouter();

  const requestedRedirect =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("redirect")
      : null;
  const redirectTo =
    requestedRedirect?.startsWith("/") && !requestedRedirect.startsWith("//")
      ? requestedRedirect
      : "/dashboard";

  const [step, setStep] = useState<Step>("credentials");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("error") === "sso_failed"
      ? "Não foi possível validar a sessão recebida do Kima Hub. Tente iniciar sessão novamente."
      : null;
  });

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [authSource, setAuthSource] = useState<SupabaseAuthSource>("hub");

  const hubUrl = process.env.NEXT_PUBLIC_KIMA_HUB_URL || "https://kima-hub.vercel.app";

  const handleCheckUser = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!email.trim() || !email.includes("@")) {
      setErrorMsg("Introduza um email válido.");
      return;
    }
    setStep("password");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const { url, anonKey } = getSupabaseAuthConfig(authSource);
      const supabase = createBrowserClient(url, anonKey);

      if (step === "password") {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });

        if (authError) {
          setErrorMsg(
            authError.message.toLowerCase().includes("email not confirmed")
              ? "Confirme o seu email antes de iniciar sessão."
              : "Email ou palavra-passe inválidos."
          );
          return;
        }
      }

      const response = await fetch("/api/auth/context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          step === "select-company"
            ? { companyId: selectedCompanyId, authSource }
            : { authSource }
        ),
      });

      const result = await response.json();

      if (!response.ok) {
        setErrorMsg(result.error || "Não foi possível validar o acesso.");
        return;
      }

      if (result.requiresCompanySelection) {
        const options: CompanyOption[] = result.companies || [];
        setCompanies(options);
        setSelectedCompanyId(options[0]?.id || "");
        setStep("select-company");
        return;
      }

      if (!result.success) {
        setErrorMsg(result.error || "Não foi possível iniciar sessão.");
        return;
      }

      router.push(redirectTo);
      router.refresh();
    } catch (error: unknown) {
      setErrorMsg(
        error instanceof Error &&
          error.message.includes("não está configurada")
          ? error.message
          : "Não foi possível conectar ao servidor. Tente novamente."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F3F4F6] dark:bg-[#0F172A] text-slate-900 dark:text-slate-100 lg:grid lg:grid-cols-2">
      {/* ── PAINEL DE MARCA (Esquerda) ─────────────────────────── */}
      <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-blue-600 text-white p-12">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-0 -left-24 w-80 h-80 rounded-full bg-indigo-400/20 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-white text-blue-600 font-extrabold text-lg shadow-lg">
            K
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold tracking-tight leading-tight">
              KIMA <span className="text-blue-100">FINANCEIRO</span>
            </span>
            <span className="text-[10px] uppercase font-semibold text-blue-100/70 tracking-widest">
              Facturação Web
            </span>
          </div>
        </div>

        <div className="relative space-y-6">
          <h2 className="text-4xl font-extrabold leading-tight tracking-tight">
            Facturação moderna
            <br />
            para empresas angolanas
          </h2>
          <p className="text-blue-100/90 text-sm leading-relaxed max-w-md">
            O sistema de facturação da KIMA ajuda a sua empresa a emitir
            documentos fiscais conformes com a AGT, gerir clientes e controlar
            o seu negócio a partir de um único lugar.
          </p>

          <div className="relative flex items-center justify-center py-2">
            <svg
              viewBox="0 0 420 300"
              className="w-full max-w-md h-auto"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="kimaGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#93C5FD" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#312E81" stopOpacity="0.2" />
                </linearGradient>
              </defs>
              <g className="animate-kima-float">
                <circle cx="70" cy="80" r="24" fill="#FBBF24" opacity="0.9" />
                <circle cx="70" cy="80" r="17" fill="none" stroke="#D97706" strokeWidth="2" />
                <text x="70" y="86" textAnchor="middle" fontSize="16" fontWeight="bold" fill="#92400E" fontFamily="Inter, sans-serif">Kz</text>
              </g>
              <g className="animate-kima-float-delay">
                <circle cx="352" cy="120" r="18" fill="#34D399" opacity="0.95" />
                <circle cx="352" cy="120" r="12" fill="none" stroke="#047857" strokeWidth="2" />
                <text x="352" y="125" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#065F46" fontFamily="Inter, sans-serif">%</text>
              </g>
              <g className="animate-kima-float-slow">
                <circle cx="88" cy="215" r="14" fill="#A5B4FC" opacity="0.9" />
                <circle cx="88" cy="215" r="9" fill="none" stroke="#4F46E5" strokeWidth="2" />
              </g>
              <g className="animate-kima-float-slow">
                <rect x="120" y="46" width="210" height="240" rx="16" fill="url(#kimaGrad)" />
                <rect x="128" y="58" width="194" height="216" rx="12" fill="#FFFFFF" />
                <rect x="146" y="80" width="90" height="12" rx="6" fill="#DBEAFE" />
                <rect x="268" y="80" width="36" height="12" rx="6" fill="#DBEAFE" />
                <circle cx="160" cy="112" r="7" fill="#BFDBFE" />
                <rect x="176" y="106" width="110" height="8" rx="4" fill="#E2E8F0" />
                <rect x="176" y="120" width="80" height="8" rx="4" fill="#E2E8F0" />
                <rect x="146" y="152" width="160" height="8" rx="4" fill="#E2E8F0" className="animate-kima-line" />
                <rect x="146" y="170" width="140" height="8" rx="4" fill="#E2E8F0" className="animate-kima-line-delay" />
                <rect x="146" y="188" width="120" height="8" rx="4" fill="#E2E8F0" className="animate-kima-line-slow" />
                <rect x="146" y="212" width="158" height="2" rx="1" fill="#E2E8F0" />
                <rect x="146" y="228" width="70" height="8" rx="4" fill="#93C5FD" />
                <rect x="250" y="222" width="54" height="18" rx="6" fill="#2563EB" className="animate-kima-total" />
                <g className="animate-kima-check">
                  <circle cx="190" cy="254" r="13" fill="#10B981" />
                  <path d="M184 254 L189 259 L197 249" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </g>
                <text x="212" y="259" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#059669" fontFamily="Inter, sans-serif" className="animate-kima-check">
                  PAGO
                </text>
              </g>
            </svg>
          </div>
        </div>

        <div className="relative flex items-center gap-2">
          <ShieldCheck size={16} className="text-emerald-300" />
          <span className="text-xs font-semibold text-emerald-100">Certificado AGT</span>
          <span className="text-blue-100/50">•</span>
          <span className="text-xs text-blue-100/70">© 2026 KIMA SaaS — RC Media</span>
        </div>
      </div>

      {/* ── PAINEL DO FORMULÁRIO (Direita) ─────────────────────── */}
      <div className="flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md animate-scale-in">
          {/* Marca (mobile) */}
          <div className="lg:hidden flex flex-col items-center mb-8 text-center">
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

          {/* Card do formulário */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md shadow-sm dark:shadow-black/20 p-6 sm:p-9">
            <div className="flex justify-end mb-6">
              {authSource === "hub" && (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Não tem conta?{" "}
                  <a
                    href={`${hubUrl}/signup?app=hub`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                  >
                    Criar conta
                  </a>
                </p>
              )}
            </div>

            <div className="mb-6">
              <h2 className="text-2xl sm:text-[28px] font-bold tracking-tight text-slate-900 dark:text-white">
                {step === "credentials"
                  ? "Entrar na sua conta"
                  : step === "select-company"
                    ? "Escolha a empresa"
                    : "Bem-vindo(a)"}
              </h2>
              <p className="text-sm text-slate-400 dark:text-slate-500 mt-1.5">
                {step === "credentials"
                  ? "Introduza o seu email para continuar."
                  : step === "select-company"
                    ? "Selecione a empresa onde pretende trabalhar."
                    : `Introduza a sua palavra-passe para ${email}.`}
              </p>
            </div>

            {/* Erro global */}
            {errorMsg && (
              <div className="mb-5 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/60 text-red-700 dark:text-red-300 text-sm animate-scale-in">
                {errorMsg}
              </div>
            )}
            {/* ── PASSO 1: Email ──────────────────────────────────── */}
            {step === "credentials" && (
              <form onSubmit={handleCheckUser} className="space-y-5" noValidate>
                <fieldset className="grid gap-2 sm:grid-cols-2">
                  <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Tipo de acesso
                  </legend>
                  {([
                    {
                      value: "hub",
                      title: "Administrador",
                      description: "Conta do Kima Hub",
                    },
                    {
                      value: "faturas",
                      title: "Colaborador",
                      description: "Convite do Kima Faturas",
                    },
                  ] as const).map((option) => (
                    <label
                      key={option.value}
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${
                        authSource === option.value
                          ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20"
                          : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
                      }`}
                    >
                      <input
                        type="radio"
                        name="authSource"
                        value={option.value}
                        checked={authSource === option.value}
                        onChange={() => setAuthSource(option.value)}
                        className="mt-1 accent-blue-600"
                      />
                      <span>
                        <span className="block text-sm font-semibold text-slate-800 dark:text-slate-100">
                          {option.title}
                        </span>
                        <span className="block text-xs text-slate-500 dark:text-slate-400">
                          {option.description}
                        </span>
                      </span>
                    </label>
                  ))}
                </fieldset>
                {/* Email */}
                <div className="relative">
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder=" "
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="peer w-full h-[52px] rounded-xl border bg-white dark:bg-slate-900 px-4 pt-5 pb-1.5 text-sm text-slate-900 dark:text-white outline-none transition-all duration-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/30 border-slate-300 dark:border-slate-700"
                  />
                  <label
                    htmlFor="email"
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400 dark:text-slate-500 transition-all duration-200 pointer-events-none peer-focus:top-3.5 peer-focus:text-xs peer-focus:text-blue-600 peer-focus:font-semibold peer-[:not(:placeholder-shown)]:top-3.5 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-slate-500"
                  >
                    Email*
                  </label>
                </div>

                <Button
                  disabled={isLoading || !email.trim()}
                  type="submit"
                  className="w-full h-[52px] text-base font-semibold rounded-xl bg-none bg-blue-600 hover:bg-blue-700"
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      A entrar...
                    </>
                  ) : (
                    "Continuar"
                  )}
                </Button>

                <p className="text-center text-sm text-slate-500 dark:text-slate-400">
                  {authSource === "faturas"
                    ? "Primeiro acesso? Abra o link de convite enviado pelo administrador da empresa."
                    : "Acesso de administrador através da conta partilhada do Kima Hub."}
                </p>
              </form>
            )}

            {/* ── PASSO 2: Senha ─────────────────────────────────── */}
            {(step === "password" || step === "select-company") && (
              <form onSubmit={handleLogin} className="space-y-5" noValidate>
                {step === "password" && (
                  <>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Conta: <span className="font-medium text-slate-700 dark:text-slate-300">{email}</span>
                    </p>
                    <div className="relative">
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        placeholder=" "
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="peer w-full h-[52px] rounded-xl border bg-white dark:bg-slate-900 px-4 pt-5 pb-1.5 pr-11 text-sm text-slate-900 dark:text-white outline-none transition-all duration-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/30 border-slate-300 dark:border-slate-700"
                      />
                      <label
                        htmlFor="password"
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400 dark:text-slate-500 transition-all duration-200 pointer-events-none peer-focus:top-3.5 peer-focus:text-xs peer-focus:text-blue-600 peer-focus:font-semibold peer-[:not(:placeholder-shown)]:top-3.5 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-slate-500"
                      >
                        Palavra-passe*
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                        aria-label={showPassword ? "Ocultar palavra-passe" : "Mostrar palavra-passe"}
                      >
                        {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </div>
                  </>
                )}

                {step === "select-company" && (
                  <div className="relative">
                    <Building2 size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <select
                      id="companyId"
                      value={selectedCompanyId}
                      onChange={(e) => setSelectedCompanyId(e.target.value)}
                      required
                      className="w-full h-[52px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 pl-11 pr-4 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/30"
                    >
                      {companies.map((company) => (
                        <option key={company.id} value={company.id}>
                          {company.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex items-center justify-end pt-1">
                  {authSource === "hub" && (
                    <a
                      href={`${hubUrl}/forgot-password`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 dark:text-blue-400 font-medium hover:underline"
                    >
                      Esqueceu a palavra-passe?
                    </a>
                  )}
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (step === "select-company") {
                        setStep("password");
                        setCompanies([]);
                        setSelectedCompanyId("");
                      } else {
                        setStep("credentials");
                        setPassword("");
                      }
                      setErrorMsg(null);
                    }}
                    className="h-[52px] px-4 rounded-xl"
                  >
                    <ArrowLeft size={18} />
                  </Button>
                  <Button
                    disabled={isLoading || (step === "password" && !password.trim()) || (step === "select-company" && !selectedCompanyId)}
                    type="submit"
                    className="flex-1 h-[52px] text-base font-semibold rounded-xl bg-none bg-blue-600 hover:bg-blue-700"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        A entrar...
                      </>
                    ) : (
                      "Entrar"
                    )}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
