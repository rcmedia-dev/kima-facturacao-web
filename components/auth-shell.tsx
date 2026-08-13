import Link from "next/link";
import {
  ShieldCheck,
  FileText,
  Users,
  Package,
  BarChart3,
  CheckCircle2,
} from "lucide-react";

const features = [
  {
    icon: FileText,
    title: "Faturação Rápida",
    description: "Emita faturas conformes AGT em 3 passos simples.",
  },
  {
    icon: Users,
    title: "Gestão de Clientes",
    description: "Cadastro completo com NIF angolano validado.",
  },
  {
    icon: Package,
    title: "Artigos & Serviços",
    description: "Catálogo com taxas de IVA (0%, 7%, 14%).",
  },
  {
    icon: BarChart3,
    title: "Dashboard em Tempo Real",
    description: "Métricas de faturação e desempenho financeiro.",
  },
];

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#F3F4F6] dark:bg-[#0F172A] text-slate-900 dark:text-slate-100 lg:grid lg:grid-cols-2">
      {/* ── PAINEL DE MARCA (Esquerda) ─────────────────────────── */}
      <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 text-white p-12">
        {/* Decoração de fundo */}
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-0 -left-24 w-80 h-80 rounded-full bg-indigo-400/20 blur-3xl" />

        {/* Marca */}
        <div className="relative flex items-center gap-3">
          <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-white text-blue-700 font-extrabold text-lg shadow-lg">
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

        {/* Mensagem central */}
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

          {/* Lista de funcionalidades */}
          <ul className="grid grid-cols-1 gap-4 pt-2">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <li key={f.title} className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm shrink-0">
                    <Icon size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{f.title}</p>
                    <p className="text-xs text-blue-100/80">{f.description}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Rodapé do painel */}
        <div className="relative flex items-center gap-2">
          <ShieldCheck size={16} className="text-emerald-300" />
          <span className="text-xs font-semibold text-emerald-100">
            Certificado AGT
          </span>
          <span className="text-blue-100/50">•</span>
          <span className="text-xs text-blue-100/70">
            © 2026 KIMA SaaS — RC Media
          </span>
        </div>
      </div>

      {/* ── PAINEL DO FORMULÁRIO (Direita) ─────────────────────── */}
      <div className="flex items-center justify-center px-4 py-10 min-h-screen">
        <div className="w-full max-w-md animate-scale-in">
          {/* Marca (mobile) */}
          <div className="lg:hidden flex flex-col items-center mb-8 text-center">
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white font-extrabold text-2xl shadow-lg mb-3">
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
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{title}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5">{subtitle}</p>
            </div>

            {children}
          </div>

          {/* Rodapé (mobile) */}
          <div className="lg:hidden mt-6 text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
              <ShieldCheck size={13} />
              <span>Certificado AGT</span>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              © 2026 KIMA SaaS — RC Media. Todos os direitos reservados.
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              <Link href="/" className="text-blue-600 dark:text-blue-400 hover:underline">
                Voltar ao início
              </Link>
            </p>
          </div>

          {/* Link voltar (desktop) */}
          <div className="hidden lg:flex justify-center mt-6">
            <Link href="/" className="text-xs text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              ← Voltar ao início
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
