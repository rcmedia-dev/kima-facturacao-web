import Link from 'next/link';

export default function SignupPage() {
  const hubUrl = process.env.NEXT_PUBLIC_KIMA_HUB_URL || 'https://kima-hub.vercel.app';

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#F3F4F6] px-4 dark:bg-[#0F172A]">
      <section className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">
          Criar conta KIMA
        </h1>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
          As empresas e as contas de administrador são criadas no Kima Hub.
          Depois, use aqui as mesmas credenciais.
        </p>
        <Link
          href={`${hubUrl}/signup?app=hub`}
          className="mt-6 inline-flex h-11 items-center justify-center rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Criar conta no Kima Hub
        </Link>
      </section>
    </main>
  );
}
