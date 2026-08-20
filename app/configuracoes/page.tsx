"use client";

import { useState, useRef, useEffect, useSyncExternalStore } from "react";
import { useAppStore } from "@/lib/store";
import { useToastContext } from "@/components/ui/toast";
import { ConfiguracaoEmpresa } from "@/lib/types";
import { validarNIFAngolano } from "@/lib/utils";
import { mensagemErro } from "@/lib/utils";
import { SeriesManager } from "./components/series-manager";
import { SOFTWARE_NOME, SOFTWARE_CERTIFICACAO_AGT } from "@/lib/constants";
import {
  Upload,
  Building2,
  X,
  AlertCircle,
  Loader2,
  Settings,
  ShieldCheck,
  Lock,
} from "lucide-react";

// ── Logotipo: limites e otimização ───────────────────────────────────────────
// A logo é guardada como base64 no JSONB (company_settings.logo_url) e volta em
// todos os GET /api/company — por isso é importante mantê-la leve.
const MAX_LOGO_BYTES = 2 * 1024 * 1024; // 2MB de upload
const MAX_LOGO_DIMENSAO = 1024; // px no lado maior (após redimensionamento)
const MAX_LOGO_BASE64_LEN = 3_000_000; // ~2.2MB em base64 (cerca de 1.6MB binário)

function lerImagem(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Não foi possível ler a imagem."));
    img.src = dataUrl;
  });
}

/** Reduz imagens bitmap grandes para no máximo 1024px, mantendo a logo leve no JSONB. */
async function otimizarLogo(dataUrl: string, tipo: string): Promise<string> {
  // SVG é vetorial e já é leve — não mexer.
  if (tipo === "image/svg+xml") return dataUrl;
  try {
    const img = await lerImagem(dataUrl);
    const { naturalWidth: w, naturalHeight: h } = img;
    if (!w || !h || (w <= MAX_LOGO_DIMENSAO && h <= MAX_LOGO_DIMENSAO)) return dataUrl;

    const escala = Math.min(MAX_LOGO_DIMENSAO / w, MAX_LOGO_DIMENSAO / h);
    const nw = Math.max(1, Math.round(w * escala));
    const nh = Math.max(1, Math.round(h * escala));
    const canvas = document.createElement("canvas");
    canvas.width = nw;
    canvas.height = nh;
    const ctx = canvas.getContext("2d");
    if (!ctx) return dataUrl;

    // JPEG/WebP não têm transparência — preenche com branco antes de desenhar.
    if (tipo === "image/jpeg" || tipo === "image/webp") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, nw, nh);
    }
    ctx.drawImage(img, 0, 0, nw, nh);
    return canvas.toDataURL(tipo === "image/png" ? "image/png" : "image/jpeg", 0.85);
  } catch {
    // Se o browser não conseguir redimensionar, devolve o original.
    return dataUrl;
  }
}

export default function ConfiguracoesPage() {
  const store = useAppStore();
  const { success, error } = useToastContext();
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Inicializa o formulário a partir dos dados já carregados no store (Supabase).
  // Lazy initializer: não depende do timing/timing do loadAll do store.
  const [formData, setFormData] = useState(() => {
    const e = store.empresa;
    return {
      nomeEmpresa: e?.nomeEmpresa || "",
      nif: e?.nif || "",
      morada: e?.morada || "",
      telefone: e?.telefone || "",
      email: e?.email || "",
      logoUrl: e?.logoUrl || null,
    };
  });

  const [nifError, setNifError] = useState<string | null>(null);
  const [falhaCarregar, setFalhaCarregar] = useState(false);
  // Começa como `undefined` (e não store.empresa) para que a sincronização abaixo
  // também corra quando a empresa já estava no store no momento de montar a página.
  const [prevEmpresa, setPrevEmpresa] = useState<ConfiguracaoEmpresa | null | undefined>(undefined);
  // Marca se o utilizador já editou o formulário — impede que re-sincronizações
  // (ex.: loadAll chamado pelo SeriesManager) apaguem edições ainda não guardadas.
  const formTouchedRef = useRef(false);

  if (store.empresa !== prevEmpresa) {
    setPrevEmpresa(store.empresa);
    if (store.empresa && !formTouchedRef.current) {
      setFormData({
        nomeEmpresa: store.empresa.nomeEmpresa || "",
        nif: store.empresa.nif || "",
        morada: store.empresa.morada || "",
        telefone: store.empresa.telefone || "",
        email: store.empresa.email || "",
        logoUrl: store.empresa.logoUrl || null,
      });
    }
  }

  // Se a empresa ainda não veio do store (o loadAll inicial falhou ou estava em curso),
  // tenta buscar diretamente /api/company para preencher os campos.
  useEffect(() => {
    let ativo = true;
    if (useAppStore.getState().empresa === null) {
      fetch("/api/company")
        .then((res) => res.json())
        .then((json) => {
          if (!ativo) return;
          if (json?.success && json.data) {
            const e = json.data;
            useAppStore.setState({
              empresa: {
                id: e.id,
                nomeEmpresa: e.nomeEmpresa,
                nif: e.nif,
                morada: e.morada || "",
                telefone: e.telefone || "",
                email: e.email || "",
                logoUrl: e.logoUrl || undefined,
                softwareNome: e.softwareNome || undefined,
                softwareCertificacaoNumero: e.softwareCertificacaoNumero || undefined,
                seriesPorTipo: e.seriesPorTipo || [],
                diasVencimentoPadrao: e.diasVencimentoPadrao || 30,
                criadoEm: e.criadoEm ? new Date(e.criadoEm) : new Date(),
                ultimaAtualizacao: e.ultimaAtualizacao ? new Date(e.ultimaAtualizacao) : new Date(),
              },
            });
          }
        })
        .catch(() => {})
        .finally(() => {
          if (ativo) setFalhaCarregar(true);
        });
    }
    return () => {
      ativo = false;
    };
  }, []);

  if (!mounted) {
    return (
      <div className="max-w-3xl mx-auto px-2 py-6 space-y-5 animate-pulse">
        <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded-xl" />
        <div className="h-4 w-64 bg-slate-200 dark:bg-slate-800 rounded-xl" />
        <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
      </div>
    );
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    formTouchedRef.current = true;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (name === "nif") {
      if (!value) {
        setNifError("NIF é obrigatório");
      } else {
        const validacao = validarNIFAngolano(value);
        setNifError(validacao.valido ? null : validacao.mensagem || "NIF inválido");
      }
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // (b) Aviso imediato para ficheiros que não são imagem
    if (!file.type.startsWith("image/")) {
      setErrorMsg("Ficheiro inválido: selecione uma imagem (PNG, JPG, SVG ou WebP).");
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setErrorMsg("O tamanho do logotipo não deve exceder 2MB.");
      return;
    }
    setErrorMsg(null);
    formTouchedRef.current = true;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      try {
        const base64String = await otimizarLogo(dataUrl, file.type);
        if (base64String.length > MAX_LOGO_BASE64_LEN) {
          setErrorMsg(
            "A imagem processada do logotipo continua demasiado pesada. Use uma imagem mais pequena (recomendado: até 1024px)."
          );
          return;
        }
        setFormData((prev) => ({ ...prev, logoUrl: base64String }));
      } catch {
        setErrorMsg("Não foi possível processar a imagem do logotipo. Tente outro ficheiro.");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    formTouchedRef.current = true;
    setFormData((prev) => ({ ...prev, logoUrl: null }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSave = async () => {
    if (!formData.nomeEmpresa.trim()) {
      setErrorMsg("O nome da empresa é obrigatório.");
      return;
    }
    const nifValid = validarNIFAngolano(formData.nif);
    if (!nifValid.valido) {
      setNifError("NIF Angolano inválido (deve possuir 10 dígitos numéricos)");
      setErrorMsg("Por favor insira um NIF Angolano válido antes de salvar.");
      return;
    }

    setSaving(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/company", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || "Erro ao salvar as configurações.");
      }

      const empresaAtualizada: ConfiguracaoEmpresa = {
        id: store.empresa?.id || "empresa-001",
        nomeEmpresa: formData.nomeEmpresa,
        nif: formData.nif,
        morada: formData.morada,
        telefone: formData.telefone,
        email: formData.email,
        logoUrl: formData.logoUrl || undefined,
        // Identidade do software certificado AGT: valores fixos (não editáveis)
        softwareNome: SOFTWARE_NOME,
        softwareCertificacaoNumero: SOFTWARE_CERTIFICACAO_AGT,
        seriesPorTipo: store.empresa?.seriesPorTipo || [],
        diasVencimentoPadrao: store.empresa?.diasVencimentoPadrao || 30,
        criadoEm: store.empresa?.criadoEm || new Date(),
        ultimaAtualizacao: new Date(),
      };
      store.setEmpresa(empresaAtualizada);
      formTouchedRef.current = false;

      success("Sucesso", "Configurações guardadas com sucesso.");
    } catch (err: unknown) {
      error("Erro", mensagemErro(err, "Erro ao salvar as configurações."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-2 py-2 space-y-6 animate-slide-up">
      {/* ── HEADER ──────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800">
          <Settings size={20} className="text-slate-600 dark:text-slate-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Configurações</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Identidade corporativa e dados cadastrais da empresa
          </p>
        </div>
      </div>

      {/* ── ALERTAS ─────────────────────────────────── */}
      {errorMsg && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[var(--danger-light)] border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 animate-fade-in">
          <AlertCircle size={16} className="shrink-0" />
          <span className="text-sm font-medium">{errorMsg}</span>
        </div>
      )}

      {/* ── AVISO: EMPRESA SEM DADOS CARREGADOS ─────── */}
      {mounted && falhaCarregar && !store.empresa && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 animate-fade-in">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold">Não foi possível carregar os dados da empresa.</p>
            <p className="text-xs opacity-80 mt-0.5">
              Verifique a sessão do Kima Hub (cookie{" "}
              <code className="font-mono">kima-company-id</code>) ou a variável{" "}
              <code className="font-mono">NEXT_PUBLIC_KIMA_FALLBACK_COMPANY_ID</code> no{" "}
              <code className="font-mono">.env.local</code>. Os campos abaixo estão vazios porque o
              servidor não encontrou uma empresa no Supabase para este contexto.
            </p>
          </div>
        </div>
      )}

      {/* ── CARD: PERFIL DA EMPRESA ──────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center gap-2.5 px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <Building2 size={18} className="text-blue-600 dark:text-blue-400" />
          <h3 className="font-bold text-slate-900 dark:text-white text-base">Perfil e Identidade da Empresa</h3>
        </div>

        <div className="p-6 space-y-6">
          <div className="pb-5 border-b border-slate-100 dark:border-slate-800">
            <label className="label-kima">Logotipo da Empresa</label>
            <div className="flex items-center gap-5 mt-2">
              <div className="relative w-20 h-20 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center overflow-hidden shrink-0 group hover:border-blue-400 dark:hover:border-blue-500 transition-colors">
                {formData.logoUrl ? (
                  <>
                    <img
                      src={formData.logoUrl}
                      alt="Logotipo da empresa"
                      className="w-full h-full object-contain p-1"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                      title="Remover logotipo"
                    >
                      <X size={11} />
                    </button>
                  </>
                ) : (
                  <Building2 size={24} className="text-slate-300 dark:text-slate-600" />
                )}
              </div>

              <div className="space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png, image/jpeg, image/svg+xml, image/webp"
                  onChange={handleLogoUpload}
                  className="hidden"
                  id="logo-upload-input"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="btn-outline h-9 px-3 text-xs"
                  >
                    <Upload size={14} />
                    {formData.logoUrl ? "Alterar Logotipo" : "Carregar Logotipo"}
                  </button>
                  {formData.logoUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="btn-ghost h-9 px-3 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      Remover
                    </button>
                  )}
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  PNG, JPG, SVG ou WebP — Máximo 2MB
                </p>
              </div>
            </div>
          </div>

          <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label htmlFor="nomeEmpresa" className="label-kima">
                  Nome da Empresa <span className="text-red-500">*</span>
                </label>
                <input
                  id="nomeEmpresa"
                  name="nomeEmpresa"
                  value={formData.nomeEmpresa}
                  onChange={handleChange}
                  placeholder="Ex: Kima Tecnologias & Serviços Lda"
                  className="input-kima"
                  required
                />
              </div>

              <div>
                <label htmlFor="nif" className="label-kima">
                  NIF Angolano <span className="text-red-500">*</span>
                </label>
                <input
                  id="nif"
                  name="nif"
                  value={formData.nif}
                  onChange={handleChange}
                  placeholder="Ex: 5417082910"
                  className={`input-kima ${nifError ? "border-red-500 focus:ring-red-500" : ""}`}
                  required
                />
                {nifError ? (
                  <p className="text-xs text-red-500 dark:text-red-400 mt-1">{nifError}</p>
                ) : (
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Validação Módulo 11 — 10 dígitos</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="morada" className="label-kima">
                Morada Principal <span className="text-red-500">*</span>
              </label>
              <input
                id="morada"
                name="morada"
                value={formData.morada}
                onChange={handleChange}
                placeholder="Ex: Av. 4 de Fevereiro, Edifício Luanda Tower, Luanda"
                className="input-kima"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label htmlFor="telefone" className="label-kima">
                  Telefone de Contacto <span className="text-red-500">*</span>
                </label>
                <input
                  id="telefone"
                  name="telefone"
                  value={formData.telefone}
                  onChange={handleChange}
                  placeholder="Ex: +244 923 000 111"
                  className="input-kima"
                  required
                />
              </div>

              <div>
                <label htmlFor="email" className="label-kima">
                  Email Institucional <span className="text-red-500">*</span>
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Ex: contacto@kima.co.ao"
                  className="input-kima"
                  required
                />
              </div>
            </div>

            {/* Identificação do Software de Facturação AGT (Art. 10º j — DP 71/25) */}
            <div className="pb-5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck size={15} className="text-emerald-600 dark:text-emerald-400" />
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Software de Facturação (AGT)
                </h4>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Identificação do software de facturação certificado AGT (Art. 10º, alínea j, do
                Decreto Presidencial nº 71/25). Estes valores são <strong>fixos</strong> — pertencem à
                certificação da Kima pela AGT e constam em todas as facturas e documentos fiscais.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <span className="label-kima">Nome do Software</span>
                  <div className="flex items-center gap-2 px-3.5 h-10 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 select-none">
                    <Lock size={13} className="text-slate-400 shrink-0" />
                    {SOFTWARE_NOME}
                  </div>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                    Valor fixo — identifica o software certificado pela AGT.
                  </p>
                </div>
                <div>
                  <span className="label-kima">Nº de Certificação AGT</span>
                  <div className="flex items-center gap-2 px-3.5 h-10 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-sm font-medium text-emerald-700 dark:text-emerald-300 font-mono select-none">
                    <ShieldCheck size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                    {SOFTWARE_CERTIFICACAO_AGT}
                  </div>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                    Atribuído pela AGT à Kima na certificação do software.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                id="config-btn-guardar"
                type="button"
                onClick={handleSave}
                disabled={saving || !formData.nomeEmpresa || !formData.nif || !!nifError}
                className="btn-primary min-w-44"
              >
                {saving ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    A guardar...
                  </>
                ) : (
                  "Guardar Configurações"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* ── CARD: SÉRIES E NUMERAÇÃO ────────────────── */}
      <SeriesManager />
    </div>
  );
}
