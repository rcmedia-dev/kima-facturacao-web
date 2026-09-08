"use client";

import { useState, useRef, useEffect, useSyncExternalStore } from "react";
import { useAppStore } from "@/lib/store";
import { useToastContext } from "@/components/ui/toast";
import { ConfiguracaoEmpresa } from "@/lib/types";
import { validarNIFAngolano, mensagemErro } from "@/lib/utils";
import {
  Upload,
  AlertCircle,
  Loader2,
  Settings,
} from "lucide-react";

const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const MAX_LOGO_DIMENSAO = 1024;
const MAX_LOGO_BASE64_LEN = 3_000_000;

function lerImagem(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Não foi possível ler a imagem."));
    img.src = dataUrl;
  });
}

async function otimizarLogo(dataUrl: string, tipo: string): Promise<string> {
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

    if (tipo === "image/jpeg" || tipo === "image/webp") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, nw, nh);
    }
    ctx.drawImage(img, 0, 0, nw, nh);
    return canvas.toDataURL(tipo === "image/png" ? "image/png" : "image/jpeg", 0.85);
  } catch {
    return dataUrl;
  }
}

function ConfiguracoesInner({
  empresa,
  mounted,
  saving,
  setSaving,
  errorMsg,
  setErrorMsg,
  fileInputRef,
  success,
  error,
  store,
  falhaCarregar,
}: {
  empresa: ConfiguracaoEmpresa | null | undefined;
  mounted: boolean;
  saving: boolean;
  setSaving: (saving: boolean) => void;
  errorMsg: string | null;
  setErrorMsg: (msg: string | null) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  success: (title: string, msg: string) => void;
  error: (title: string, msg: string) => void;
  store: ReturnType<typeof useAppStore>;
  falhaCarregar: boolean;
}) {
  const [formData, setFormData] = useState({
    nomeEmpresa: empresa?.nomeEmpresa || "",
    nif: empresa?.nif || "",
    morada: empresa?.morada || "",
    telefone: empresa?.telefone || "",
    email: empresa?.email || "",
    logoUrl: empresa?.logoUrl || null,
  });

  const [initialData, setInitialData] = useState({
    nomeEmpresa: empresa?.nomeEmpresa || "",
    nif: empresa?.nif || "",
    morada: empresa?.morada || "",
    telefone: empresa?.telefone || "",
    email: empresa?.email || "",
    logoUrl: empresa?.logoUrl || null,
  });

  useEffect(() => {
    if (empresa) {
      const data = {
        nomeEmpresa: empresa.nomeEmpresa || "",
        nif: empresa.nif || "",
        morada: empresa.morada || "",
        telefone: empresa.telefone || "",
        email: empresa.email || "",
        logoUrl: empresa.logoUrl || null,
      };
      setFormData(data);
      setInitialData(data);
    }
  }, [empresa]);

  const hasChanges =
    formData.nomeEmpresa !== initialData.nomeEmpresa ||
    formData.nif !== initialData.nif ||
    formData.morada !== initialData.morada ||
    formData.telefone !== initialData.telefone ||
    formData.email !== initialData.email ||
    formData.logoUrl !== initialData.logoUrl;

  const [nifError, setNifError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (name === "nif") {
      if (!value.trim()) {
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
    if (!file.type.startsWith("image/")) {
      setErrorMsg("Ficheiro inválido: selecione uma imagem (PNG, JPG, SVG ou WebP).");
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setErrorMsg("O tamanho do logotipo não deve exceder 2MB.");
      return;
    }
    setErrorMsg(null);

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
    setFormData((prev) => ({ ...prev, logoUrl: null }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSave = async () => {
    if (!formData.nomeEmpresa.trim()) {
      setErrorMsg("O nome da empresa é obrigatório.");
      return;
    }
    if (!formData.nif.trim()) {
      setNifError("NIF é obrigatório");
      setErrorMsg("Por favor insira o NIF da empresa.");
      return;
    }
    const nifValid = validarNIFAngolano(formData.nif);
    if (!nifValid.valido) {
      setNifError(nifValid.mensagem || "NIF inválido (10 dígitos para empresas)");
      setErrorMsg("Por favor insira um NIF válido antes de salvar.");
      return;
    }
    if (!formData.morada.trim()) {
      setErrorMsg("A morada é obrigatória.");
      return;
    }
    if (!formData.telefone.trim()) {
      setErrorMsg("O telefone de contacto é obrigatório.");
      return;
    }
    if (!formData.email.trim()) {
      setErrorMsg("O email institucional é obrigatório.");
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
        const msg = json?.error || "Erro ao salvar as configurações.";
        if (msg.toLowerCase().includes("nif")) {
          setNifError(msg);
        }
        setErrorMsg(msg);
        throw new Error(msg);
      }

      const empresaAtualizada: ConfiguracaoEmpresa = {
        id: empresa?.id || "empresa-001",
        nomeEmpresa: formData.nomeEmpresa,
        nif: formData.nif,
        morada: formData.morada,
        telefone: formData.telefone,
        email: formData.email,
        logoUrl: formData.logoUrl || undefined,
        softwareNome: empresa?.softwareNome,
        softwareCertificacaoNumero: empresa?.softwareCertificacaoNumero,
        seriesPorTipo: empresa?.seriesPorTipo || [],
        diasVencimentoPadrao: empresa?.diasVencimentoPadrao || 30,
        criadoEm: empresa?.criadoEm || new Date(),
        ultimaAtualizacao: new Date(),
      };
      store.setEmpresa(empresaAtualizada);
      setInitialData(formData);

      success("Sucesso", "Configurações guardadas com sucesso.");
    } catch (err: unknown) {
      const msg = mensagemErro(err, "Erro ao salvar as configurações.");
      if (msg.toLowerCase().includes("nif")) {
        setNifError(msg);
      }
      error("Erro", msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full px-6 py-4 flex flex-col gap-6 animate-slide-up">
      {/* ── HEADER DA PÁGINA ────────────────────────── */}
      <div className="max-w-3xl mx-auto w-full flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30">
          <Settings size={20} className="text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Configurações</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Identidade corporativa e dados cadastrais da empresa</p>
        </div>
      </div>

      {/* ── ALERTAS ─────────────────────────────────── */}
      {errorMsg && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[var(--danger-light)] border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 animate-fade-in">
          <AlertCircle size={16} className="shrink-0" />
          <span className="text-sm font-medium">{errorMsg}</span>
        </div>
      )}

      {mounted && falhaCarregar && !empresa && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 animate-fade-in">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold">Não foi possível carregar os dados da empresa.</p>
            <p className="text-xs opacity-80 mt-0.5">
              Verifique a sessão do Kima Hub ou a variável de ambiente.
            </p>
          </div>
        </div>
      )}

      {/* ── CARD PRINCIPAL ──────────────────────────── */}
      <div className="max-w-3xl mx-auto w-full card-kima p-6 space-y-6">

        {/* ── TÍTULO DO CARD ─────────────────────────── */}
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Dados da Empresa</h3>
          {hasChanges && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 animate-fade-in">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              Alterações pendentes
            </span>
          )}
        </div>

        {/* ── LOGOTIPO ───────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 pb-6 border-b border-slate-100 dark:border-slate-800">
          {/* Preview da Imagem */}
          <div
            className="relative w-32 h-20 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-2 flex items-center justify-center overflow-hidden shrink-0 shadow-sm cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            {formData.logoUrl ? (
              <img src={formData.logoUrl} alt="Logotipo" className="w-full h-full object-contain rounded-xl" />
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 gap-1">
                <Upload size={20} />
                <span className="text-[9px] font-medium">Logo</span>
              </div>
            )}
          </div>

          {/* Ações e Especificações */}
          <div className="flex flex-col gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png, image/jpeg, image/svg+xml, image/webp"
              onChange={handleLogoUpload}
              className="hidden"
            />
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn-secondary h-9 px-4 text-xs font-medium gap-2"
              >
                <Upload size={13} />
                Alterar Logotipo
              </button>
              {formData.logoUrl && (
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  className="text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 px-3 py-2 rounded-lg font-medium transition-colors"
                >
                  Remover
                </button>
              )}
            </div>
            <p className="text-[12px] text-slate-400 font-normal">Formatos suportados: PNG, JPG, SVG ou WebP (Máx. 2MB)</p>
          </div>
        </div>

        {/* ── FORMULÁRIO ─────────────────────────────── */}
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
          {/* Linha 1: Nome + NIF */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="nomeEmpresa" className="label-kima">
                Nome da Empresa <span className="text-red-500">*</span>
              </label>
              <input
                id="nomeEmpresa"
                name="nomeEmpresa"
                value={formData.nomeEmpresa}
                onChange={handleChange}
                placeholder="Ex: RC Media"
                className="input-kima h-10 py-2 text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="nif" className="label-kima">
                NIF <span className="text-red-500">*</span>
              </label>
              <input
                id="nif"
                name="nif"
                value={formData.nif}
                onChange={handleChange}
                placeholder="Insira o NIF da empresa"
                className={`input-kima h-10 py-2 text-xs ${nifError ? "border-red-500" : ""}`}
                required
              />
              {nifError ? (
                <p className="text-[10px] text-red-500">{nifError}</p>
              ) : (
                <p className="text-[10px] text-slate-400">Validação Módulo 11 (PJ de 10 dígitos) ou BI (PF)</p>
              )}
            </div>
          </div>

          {/* Linha 2: Morada */}
          <div className="space-y-1.5">
            <label htmlFor="morada" className="label-kima">
              Morada Principal <span className="text-red-500">*</span>
            </label>
            <input
              id="morada"
              name="morada"
              value={formData.morada}
              onChange={handleChange}
              placeholder="Ex: Luanda, largo do Kinaxixi"
              className="input-kima h-10 py-2 text-xs"
              required
            />
          </div>

          {/* Linha 3: Telefone + Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="telefone" className="label-kima">
                Telefone de Contacto <span className="text-red-500">*</span>
              </label>
              <input
                id="telefone"
                name="telefone"
                value={formData.telefone}
                onChange={handleChange}
                placeholder="Ex: 933335784"
                className="input-kima h-10 py-2 text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="email" className="label-kima">
                Email Institucional <span className="text-red-500">*</span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Ex: contacto@empresa.co.ao"
                className="input-kima h-10 py-2 text-xs"
                required
              />
            </div>
          </div>

          {/* ── BOTÃO GUARDAR ─────────────────────── */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={saving || !hasChanges || !!nifError}
              className={`h-10 px-4 text-xs w-full font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 ${
                saving || !hasChanges || !!nifError
                  ? "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-200 dark:border-slate-800 opacity-60"
                  : "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 cursor-pointer"
              }`}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  A guardar...
                </>
              ) : (
                "Guardar Alterações"
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}

export default function ConfiguracoesPage() {
  const store = useAppStore();
  const { success, error } = useToastContext();
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [falhaCarregar, setFalhaCarregar] = useState(false);

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
            setFalhaCarregar(false);
          } else {
            setFalhaCarregar(true);
          }
        })
        .catch(() => {
          if (ativo) setFalhaCarregar(true);
        });
    }
    return () => {
      ativo = false;
    };
  }, []);

  if (!mounted) {
    return (
      <div className="w-full px-6 py-4 flex flex-col gap-6 animate-pulse">
        <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded-xl" />
        <div className="max-w-2xl mx-auto w-full h-96 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
      </div>
    );
  }

  return (
    <ConfiguracoesInner
      key={store.empresa?.id || "loading"}
      empresa={store.empresa}
      mounted={mounted}
      saving={saving}
      setSaving={setSaving}
      errorMsg={errorMsg}
      setErrorMsg={setErrorMsg}
      fileInputRef={fileInputRef}
      success={success}
      error={error}
      store={store}
      falhaCarregar={falhaCarregar}
    />
  );
}
