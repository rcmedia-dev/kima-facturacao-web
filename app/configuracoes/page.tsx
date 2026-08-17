"use client";

import { useEffect, useState, useRef } from "react";
import { useAppStore } from "@/lib/store";
import { useToastContext } from "@/components/ui/toast";
import { ConfiguracaoEmpresa } from "@/lib/types";
import { validarNIFAngolano } from "@/lib/utils";
import { SeriesManager } from "./components/series-manager";
import {
  Upload,
  Building2,
  X,
  AlertCircle,
  Loader2,
  Settings,
  ShieldCheck,
} from "lucide-react";

export default function ConfiguracoesPage() {
  const store = useAppStore();
  const { success, error } = useToastContext();
  const [mounted, setMounted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    nomeEmpresa: "",
    nif: "",
    morada: "",
    telefone: "",
    email: "",
    logoUrl: "" as string | undefined | null,
    softwareNome: "",
    softwareCertificacaoNumero: "",
  });

  const [nifError, setNifError] = useState<string | null>(null);

  useEffect(() => {
    if (store.empresa) {
      setFormData({
        nomeEmpresa: store.empresa.nomeEmpresa || "",
        nif: store.empresa.nif || "",
        morada: store.empresa.morada || "",
        telefone: store.empresa.telefone || "",
        email: store.empresa.email || "",
        logoUrl: store.empresa.logoUrl || null,
        softwareNome: store.empresa.softwareNome || "",
        softwareCertificacaoNumero: store.empresa.softwareCertificacaoNumero || "",
      });
    }
    setMounted(true);
  }, [store.empresa]);

  // Validação em tempo real do NIF
  useEffect(() => {
    if (formData.nif) {
      const validacao = validarNIFAngolano(formData.nif);
      if (!validacao.valido) {
        setNifError(validacao.mensagem || "NIF inválido");
      } else {
        setNifError(null);
      }
    } else {
      setNifError("NIF é obrigatório");
    }
  }, [formData.nif]);

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
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErrorMsg("Por favor selecione um arquivo de imagem válido (PNG, JPG, SVG, WebP).");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setErrorMsg("O tamanho do logotipo não deve exceder 2MB.");
      return;
    }
    setErrorMsg(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64String = event.target?.result as string;
      setFormData((prev) => ({ ...prev, logoUrl: base64String }));
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
    const nifValid = validarNIFAngolano(formData.nif);
    if (!nifValid.valido) {
      setNifError("NIF Angolano inválido (deve possuir 10 dígitos numéricos)");
      setErrorMsg("Por favor insira um NIF Angolano válido antes de salvar.");
      return;
    }

    setSaving(true);
    setErrorMsg(null);

    try {
      await fetch("/api/company", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const empresaAtualizada: ConfiguracaoEmpresa = {
        id: store.empresa?.id || "empresa-001",
        nomeEmpresa: formData.nomeEmpresa,
        nif: formData.nif,
        morada: formData.morada,
        telefone: formData.telefone,
        email: formData.email,
        logoUrl: formData.logoUrl || undefined,
        softwareNome: formData.softwareNome || undefined,
        softwareCertificacaoNumero: formData.softwareCertificacaoNumero || undefined,
        seriesPorTipo: store.empresa?.seriesPorTipo || [],
        diasVencimentoPadrao: store.empresa?.diasVencimentoPadrao || 30,
        criadoEm: store.empresa?.criadoEm || new Date(),
        ultimaAtualizacao: new Date(),
      };
      store.setEmpresa(empresaAtualizada);

      success("Sucesso", "Configurações guardadas com sucesso.");
    } catch (err: any) {
      error("Erro", err.message || "Erro ao salvar as configurações.");
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
                Estes dados constam nas facturas e documentos fiscais emitidos (Art. 10º, alínea j, do Decreto Presidencial nº 71/25).
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="softwareNome" className="label-kima">
                    Nome do Software
                  </label>
                  <input
                    id="softwareNome"
                    name="softwareNome"
                    value={formData.softwareNome}
                    onChange={handleChange}
                    placeholder="Ex: Kima Facturação"
                    className="input-kima"
                  />
                </div>
                <div>
                  <label htmlFor="softwareCertificacaoNumero" className="label-kima">
                    Nº de Certificação AGT
                  </label>
                  <input
                    id="softwareCertificacaoNumero"
                    name="softwareCertificacaoNumero"
                    value={formData.softwareCertificacaoNumero}
                    onChange={handleChange}
                    placeholder="Ex: 123/AGT/2026"
                    className="input-kima"
                  />
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
