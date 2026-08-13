"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Lock, Mail, User, Eye, EyeOff } from "lucide-react";

import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToastContext } from "@/components/ui/toast";
import { signupSchema, SignupFormData } from "@/lib/schemas";

export default function SignupPage() {
  const router = useRouter();
  const { error, success } = useToastContext();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema) as any,
  });

  const onSubmit = async (data: SignupFormData) => {
    setIsLoading(true);
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.nome,
          },
        },
      });

      if (authError) {
        error("Erro no registo", authError.message);
        return;
      }

      if (authData.session) {
        success("Conta criada!", "Sessão iniciada com sucesso.");
        router.push("/dashboard");
        router.refresh();
      } else {
        success(
          "Conta criada!",
          "Confirme o seu email para poder iniciar sessão."
        );
        router.push("/login");
      }
    } catch (e) {
      error("Erro no registo", "Não foi possível criar a conta.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthShell
      title="Criar Conta"
      subtitle="Registe-se para começar a faturar com a KIMA"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        {/* Nome */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Nome
          </label>
          <div className="relative">
            <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              type="text"
              autoComplete="name"
              placeholder="Nome completo"
              className="pl-10"
              {...register("nome")}
            />
          </div>
          {errors.nome && (
            <p className="text-red-500 text-xs mt-1">{errors.nome.message}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Email
          </label>
          <div className="relative">
            <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              type="email"
              autoComplete="email"
              placeholder="nome@empresa.ao"
              className="pl-10"
              {...register("email")}
            />
          </div>
          {errors.email && (
            <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
          )}
        </div>

        {/* Palavra-passe */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Palavra-passe
          </label>
          <div className="relative">
            <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Mínimo 6 caracteres"
              className="pl-10 pr-10"
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              aria-label={showPassword ? "Ocultar palavra-passe" : "Mostrar palavra-passe"}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.password && (
            <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
          )}
        </div>

        {/* Confirmar palavra-passe */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Confirmar Palavra-passe
          </label>
          <div className="relative">
            <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Repita a palavra-passe"
              className="pl-10"
              {...register("confirmPassword")}
            />
          </div>
          {errors.confirmPassword && (
            <p className="text-red-500 text-xs mt-1">{errors.confirmPassword.message}</p>
          )}
        </div>

        <Button disabled={isLoading} type="submit" className="w-full h-12 text-base">
          {isLoading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              A criar conta...
            </>
          ) : (
            "Criar Conta"
          )}
        </Button>
      </form>

      <p className="text-sm text-slate-500 dark:text-slate-400 text-center mt-6">
        Já tem conta?{" "}
        <Link href="/login" className="text-blue-600 dark:text-blue-400 font-semibold hover:underline">
          Iniciar sessão
        </Link>
      </p>
    </AuthShell>
  );
}
