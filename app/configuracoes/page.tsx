"use client";

import { useState, useRef, useEffect, useSyncExternalStore, useCallback } from "react";
import { useAppStore } from "@/lib/store";
import { useToastContext } from "@/components/ui/toast";
import { ConfiguracaoEmpresa, ModeloDocumento, Documento } from "@/lib/types";
import { validarNIFAngolano, mensagemErro } from "@/lib/utils";
import { gerarPDFFatura } from "@/lib/pdf-generator";
import {
  Upload,
  AlertCircle,
  Loader2,
  Settings,
  Palette,
  Check,
  Download,
  Building2,
  Layout,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
} from "lucide-react";

const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const MAX_LOGO_DIMENSAO = 1024;
const MAX_LOGO_BASE64_LEN = 3_000_000;

const MODELOS_INFO: {
  id: ModeloDocumento;
  nome: string;
  tag: string;
  descricao: string;
  destaque: string;
  iconeTipo: "studio" | "executivo" | "nordic" | "bold" | "grid" | "moderno" | "classico" | "compacto";
}[] = [
  {
    id: "studio",
    nome: "Studio Minimal",
    tag: "Design & Agências",
    descricao: "Linha vertical contínua na borda lateral, tipografia marcante e espaçamentos nobres inspirados em estúdios internacionais.",
    destaque: "Ultra-Clean & Criativo",
    iconeTipo: "studio",
  },
  {
    id: "executivo",
    nome: "Corporate Executive",
    tag: "Consultoria & Finanças",
    descricao: "Banner superior suave com a cor da marca, cartões de cliente com borda lateral e total em caixa destacada.",
    destaque: "Premium & Elegante",
    iconeTipo: "executivo",
  },
  {
    id: "nordic",
    nome: "Nordic Elegance",
    tag: "Boutiques & Estética",
    descricao: "Estética escandinava editorial com linhas duplas delicadas, tons neutros suaves e acabamento sofisticado.",
    destaque: "Editorial & Refinado",
    iconeTipo: "nordic",
  },
  {
    id: "bold",
    nome: "Bold Contrast",
    tag: "Indústria & Logística",
    descricao: "Cabeçalho escuro sólido de alto impacto com texto branco, presença corporativa forte e alto contraste.",
    destaque: "Forte & Imponente",
    iconeTipo: "bold",
  },
  {
    id: "grid",
    nome: "Modern Grid",
    tag: "Startups & SaaS",
    descricao: "Estrutura modular em cartões geométricos limpos, separação clara de blocos e acabamento contemporâneo.",
    destaque: "Geométrico & Modular",
    iconeTipo: "grid",
  },
  {
    id: "moderno",
    nome: "Modern Clean",
    tag: "Serviços & PMEs",
    descricao: "Linha divisória de acento, tipografia leve sem caixas pesadas, tabela com linhas suaves e rodapé discreto.",
    destaque: "Leve & Arejado",
    iconeTipo: "moderno",
  },
  {
    id: "classico",
    nome: "Kima Clássico",
    tag: "Padrão Corporativo",
    descricao: "Faixa superior colorida, caixas estruturadas de emissor e cliente, e cabeçalho de tabela sólido.",
    destaque: "Equilibrado & Tradicional",
    iconeTipo: "classico",
  },
  {
    id: "compacto",
    nome: "Compact / Retalho",
    tag: "Comércio & POS",
    descricao: "Cabeçalho compacto e linhas condensadas de 5.8mm, ideal para documentos com longas listas de artigos.",
    destaque: "Económico & Eficiente",
    iconeTipo: "compacto",
  },
];

const PRESET_CORES = [
  { nome: "Azul Kima", hex: "#2563EB" },
  { nome: "Verde Esmeralda", hex: "#059669" },
  { nome: "Roxo / Violeta", hex: "#7C3AED" },
  { nome: "Grafite / Slate", hex: "#1E293B" },
  { nome: "Bordô / Rubro", hex: "#DC2626" },
  { nome: "Âmbar / Laranja", hex: "#D97706" },
  { nome: "Ciano / Oceano", hex: "#0284C7" },
  { nome: "Petróleo / Teal", hex: "#0D9488" },
];

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

/* ─── Shared micro-text building blocks ────────────────────────── */
function MicroLine({ w, className }: { w: string; className?: string }) {
  return <div className={`h-[3px] rounded-[1px] bg-slate-200 dark:bg-slate-700 ${className ?? ""}`} style={{ width: w }} />;
}

function MicroLabel({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <p className="text-[5px] font-extrabold uppercase tracking-[0.08em]" style={{ color }}>
      {children}
    </p>
  );
}

function MicroText({ w = "100%", className }: { w?: string; className?: string }) {
  return <div className={`h-[2.5px] rounded-[1px] bg-slate-300 dark:bg-slate-600 ${className ?? ""}`} style={{ width: w }} />;
}

/* ─── Table rows micro-component ────────────────────────────────── */
function MicroTable({ headerBg, headerFg, accent }: { headerBg: string; headerFg: string; accent: string }) {
  const rows = [
    { desc: "62%", qty: "10%", price: "16%", total: "18%" },
    { desc: "55%", qty: "10%", price: "14%", total: "16%" },
    { desc: "48%", qty: "10%", price: "12%", total: "15%" },
  ];
  return (
    <div className="rounded-[2px] overflow-hidden border border-slate-100 dark:border-slate-800">
      <div className="flex items-center px-1 py-[1.5px] gap-1" style={{ backgroundColor: headerBg, color: headerFg }}>
        <span className="text-[4.5px] font-bold flex-1">Descrição</span>
        <span className="text-[4.5px] font-bold w-[10%] text-center">Qtd</span>
        <span className="text-[4.5px] font-bold w-[16%] text-right">Preço</span>
        <span className="text-[4.5px] font-bold w-[18%] text-right">Total</span>
      </div>
      {rows.map((r, i) => (
        <div key={i} className={`flex items-center px-1 py-[1px] gap-1 ${i % 2 === 1 ? "bg-slate-50/60 dark:bg-slate-800/40" : ""}`}>
          <div className="flex-1"><MicroText w={r.desc} /></div>
          <div className="w-[10%] flex justify-center"><MicroText w="60%" /></div>
          <div className="w-[16%] flex justify-end"><MicroText w="80%" /></div>
          <div className="w-[18%] flex justify-end"><MicroText w="90%" /></div>
        </div>
      ))}
    </div>
  );
}

/* ─── Compact Layouts (mobile) ─────────────────────────────────── */
function CompactStudio({ c }: { c: string }) {
  return (
    <div className="w-full h-full bg-white dark:bg-slate-900 relative overflow-hidden flex flex-col">
      <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ backgroundColor: c }} />
      <div className="flex-1 pl-[5px] pr-1 pt-1 pb-0.5 flex flex-col">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-[2px]">
            <div className="w-2 h-2 rounded-[1px] flex items-center justify-center text-white text-[3px] font-black" style={{ backgroundColor: c }}>K</div>
            <div className="w-8 h-[2px] rounded bg-slate-700 dark:bg-slate-300" />
          </div>
          <div className="text-right">
            <p className="text-[4px] font-black tracking-tighter" style={{ color: c }}>FACTURA</p>
            <div className="w-6 h-[1.5px] rounded bg-slate-300 dark:bg-slate-600 ml-auto" />
          </div>
        </div>
        <div className="h-px w-full mb-1" style={{ backgroundColor: `${c}20` }} />
        <div className="grid grid-cols-2 gap-1 mb-1">
          <div className="space-y-[1px]"><div className="w-5 h-[1.5px] rounded bg-slate-300 dark:bg-slate-600" /><div className="w-4 h-[1px] rounded bg-slate-200 dark:bg-slate-700" /></div>
          <div className="space-y-[1px]"><div className="w-5 h-[1.5px] rounded bg-slate-300 dark:bg-slate-600" /><div className="w-4 h-[1px] rounded bg-slate-200 dark:bg-slate-700" /></div>
        </div>
        <div className="flex-1 rounded border border-slate-100 dark:border-slate-800 mb-0.5 overflow-hidden">
          <div className="h-[3px]" style={{ backgroundColor: `${c}15` }} />
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-[2px] mx-0.5 mt-[1px] rounded bg-slate-100 dark:bg-slate-800" style={{ width: `${70 + (i % 2) * 10}%` }} />)}
        </div>
        <div className="flex justify-end"><div className="w-[40%] h-[2px] rounded" style={{ backgroundColor: c }} /></div>
      </div>
    </div>
  );
}

function CompactBold({ c }: { c: string }) {
  return (
    <div className="w-full h-full bg-white dark:bg-slate-900 overflow-hidden flex flex-col">
      <div className="w-full px-1 py-[3px] flex items-center justify-between" style={{ backgroundColor: c }}>
        <div className="flex items-center gap-[2px]">
          <div className="w-2 h-2 rounded-[1px] bg-white/20 flex items-center justify-center text-white text-[3px] font-black">K</div>
          <div className="w-7 h-[2px] rounded bg-white/60" />
        </div>
        <p className="text-[4px] font-black text-white">FACTURA</p>
      </div>
      <div className="flex-1 px-1 pt-1 pb-0.5 flex flex-col">
        <div className="grid grid-cols-2 gap-1 mb-1">
          <div className="rounded border-l-[2px] bg-slate-50 dark:bg-slate-800 p-[2px]" style={{ borderLeftColor: c }}><div className="w-5 h-[1.5px] rounded bg-slate-300 dark:bg-slate-600" /><div className="w-4 h-[1px] rounded bg-slate-200 dark:bg-slate-700 mt-[1px]" /></div>
          <div className="rounded border-l-[2px] bg-slate-50 dark:bg-slate-800 p-[2px]" style={{ borderLeftColor: c }}><div className="w-5 h-[1.5px] rounded bg-slate-300 dark:bg-slate-600" /><div className="w-4 h-[1px] rounded bg-slate-200 dark:bg-slate-700 mt-[1px]" /></div>
        </div>
        <div className="flex-1 rounded border border-slate-100 dark:border-slate-800 mb-0.5 overflow-hidden">
          <div className="h-[3px]" style={{ backgroundColor: c }} />
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-[2px] mx-0.5 mt-[1px] rounded bg-slate-100 dark:bg-slate-800" style={{ width: `${70 + (i % 2) * 10}%` }} />)}
        </div>
        <div className="flex justify-end"><div className="w-[40%] h-[2px] rounded" style={{ backgroundColor: c }} /></div>
      </div>
    </div>
  );
}

function CompactNordic({ c }: { c: string }) {
  return (
    <div className="w-full h-full bg-white dark:bg-slate-900 overflow-hidden flex flex-col">
      <div className="px-1 pt-1 space-y-px mb-0.5">
        <div className="h-px w-full" style={{ backgroundColor: c }} />
        <div className="h-px w-full bg-slate-300 dark:bg-slate-600" />
      </div>
      <div className="flex-1 px-1 pb-0.5 flex flex-col">
        <div className="flex justify-between items-start mb-1">
          <div className="w-8 h-[2px] rounded bg-slate-700 dark:bg-slate-300" />
          <p className="text-[4px] font-light tracking-[0.12em] uppercase" style={{ color: c, fontFamily: "Georgia, serif" }}>Factura</p>
        </div>
        <div className="grid grid-cols-2 gap-1 mb-1">
          <div className="space-y-[1px]"><div className="w-5 h-[1.5px] rounded bg-slate-300 dark:bg-slate-600" /><div className="w-4 h-[1px] rounded bg-slate-200 dark:bg-slate-700" /></div>
          <div className="space-y-[1px]"><div className="w-5 h-[1.5px] rounded bg-slate-300 dark:bg-slate-600" /><div className="w-4 h-[1px] rounded bg-slate-200 dark:bg-slate-700" /></div>
        </div>
        <div className="flex-1 rounded border border-slate-100 dark:border-slate-800 mb-0.5 overflow-hidden">
          <div className="h-[3px] bg-slate-50 dark:bg-slate-800" />
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-[2px] mx-0.5 mt-[1px] rounded bg-slate-100 dark:bg-slate-800" style={{ width: `${70 + (i % 2) * 10}%` }} />)}
        </div>
        <div className="flex justify-end"><div className="w-[40%] h-[2px] rounded" style={{ backgroundColor: `${c}40` }} /></div>
      </div>
    </div>
  );
}

function CompactExecutivo({ c }: { c: string }) {
  return (
    <div className="w-full h-full bg-white dark:bg-slate-900 overflow-hidden flex flex-col">
      <div className="h-2 w-full" style={{ backgroundColor: `${c}12` }}><div className="h-px w-full" style={{ backgroundColor: c }} /></div>
      <div className="flex-1 px-1 pt-1 pb-0.5 flex flex-col">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-[2px]">
            <div className="w-2 h-2 rounded-[1px] flex items-center justify-center text-white text-[3px] font-black" style={{ backgroundColor: c }}>K</div>
            <div className="w-8 h-[2px] rounded bg-slate-700 dark:bg-slate-300" />
          </div>
          <p className="text-[4px] font-bold" style={{ color: c }}>FACTURA</p>
        </div>
        <div className="grid grid-cols-2 gap-1 mb-1">
          <div className="rounded border-l-[2px] bg-slate-50 dark:bg-slate-800 p-[2px]" style={{ borderLeftColor: c }}><div className="w-5 h-[1.5px] rounded bg-slate-300 dark:bg-slate-600" /><div className="w-4 h-[1px] rounded bg-slate-200 dark:bg-slate-700 mt-[1px]" /></div>
          <div className="rounded border-l-[2px] bg-slate-50 dark:bg-slate-800 p-[2px]" style={{ borderLeftColor: c }}><div className="w-5 h-[1.5px] rounded bg-slate-300 dark:bg-slate-600" /><div className="w-4 h-[1px] rounded bg-slate-200 dark:bg-slate-700 mt-[1px]" /></div>
        </div>
        <div className="flex-1 rounded border border-slate-100 dark:border-slate-800 mb-0.5 overflow-hidden">
          <div className="h-[3px]" style={{ backgroundColor: `${c}12` }} />
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-[2px] mx-0.5 mt-[1px] rounded bg-slate-100 dark:bg-slate-800" style={{ width: `${70 + (i % 2) * 10}%` }} />)}
        </div>
        <div className="flex justify-end"><div className="w-[40%] h-[2px] rounded" style={{ backgroundColor: c }} /></div>
      </div>
    </div>
  );
}

function CompactGrid({ c }: { c: string }) {
  return (
    <div className="w-full h-full bg-white dark:bg-slate-900 overflow-hidden flex flex-col p-1">
      <div className="grid grid-cols-2 gap-[3px] mb-1">
        <div className="rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-[2px]"><div className="w-5 h-[1.5px] rounded bg-slate-300 dark:bg-slate-600" /><div className="w-4 h-[1px] rounded bg-slate-200 dark:bg-slate-700 mt-[1px]" /></div>
        <div className="rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-[2px]"><div className="w-5 h-[1.5px] rounded bg-slate-300 dark:bg-slate-600" /><div className="w-4 h-[1px] rounded bg-slate-200 dark:bg-slate-700 mt-[1px]" /></div>
      </div>
      <div className="flex items-center justify-between mb-1 px-[2px]">
        <div className="flex gap-1"><div className="w-3 h-[1.5px] rounded bg-slate-300 dark:bg-slate-600" /><div className="w-2 h-[1.5px] rounded bg-slate-200 dark:bg-slate-700" /></div>
        <div className="flex items-center gap-[2px]"><div className="w-1.5 h-1.5 rounded-[1px]" style={{ backgroundColor: c }} /><p className="text-[3.5px] font-bold" style={{ color: c }}>FACTURA</p></div>
      </div>
      <div className="flex-1 rounded border border-slate-100 dark:border-slate-800 mb-0.5 overflow-hidden">
        <div className="h-[3px]" style={{ backgroundColor: c }} />
        {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-[2px] mx-0.5 mt-[1px] rounded bg-slate-100 dark:bg-slate-800" style={{ width: `${70 + (i % 2) * 10}%` }} />)}
      </div>
      <div className="flex justify-end"><div className="w-[40%] h-[2px] rounded" style={{ backgroundColor: `${c}30` }} /></div>
    </div>
  );
}

function CompactModerno({ c }: { c: string }) {
  return (
    <div className="w-full h-full bg-white dark:bg-slate-900 overflow-hidden flex flex-col p-1">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-[2px]">
          <div className="w-2 h-2 rounded-[1px] bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[3px] font-black text-slate-500">K</div>
          <div className="w-8 h-[2px] rounded bg-slate-700 dark:bg-slate-300" />
        </div>
        <p className="text-[4px] font-bold" style={{ color: c }}>FACTURA</p>
      </div>
      <div className="h-[1.5px] w-full mb-1" style={{ backgroundColor: c }} />
      <div className="grid grid-cols-2 gap-1 mb-1">
        <div className="space-y-[1px]"><div className="w-5 h-[1.5px] rounded bg-slate-300 dark:bg-slate-600" /><div className="w-4 h-[1px] rounded bg-slate-200 dark:bg-slate-700" /></div>
        <div className="space-y-[1px]"><div className="w-5 h-[1.5px] rounded bg-slate-300 dark:bg-slate-600" /><div className="w-4 h-[1px] rounded bg-slate-200 dark:bg-slate-700" /></div>
      </div>
      <div className="flex-1 rounded border border-slate-100 dark:border-slate-800 mb-0.5 overflow-hidden">
        <div className="h-[3px] bg-slate-50 dark:bg-slate-800" />
        {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-[2px] mx-0.5 mt-[1px] rounded bg-slate-100 dark:bg-slate-800" style={{ width: `${70 + (i % 2) * 10}%` }} />)}
      </div>
      <div className="flex justify-end"><div className="w-[40%] h-[2px] rounded" style={{ backgroundColor: c }} /></div>
    </div>
  );
}

function CompactClassico({ c }: { c: string }) {
  return (
    <div className="w-full h-full bg-white dark:bg-slate-900 overflow-hidden flex flex-col">
      <div className="h-[3px] w-full" style={{ backgroundColor: c }} />
      <div className="flex-1 px-1 pt-1 pb-0.5 flex flex-col">
        <div className="flex items-center justify-between mb-0.5 border-b border-slate-100 dark:border-slate-800 pb-0.5">
          <div className="flex items-center gap-[2px]">
            <div className="w-2 h-2 rounded-[1px] flex items-center justify-center text-white text-[3px] font-black" style={{ backgroundColor: c }}>K</div>
            <div className="w-8 h-[2px] rounded bg-slate-700 dark:bg-slate-300" />
          </div>
          <p className="text-[4px] font-bold" style={{ color: c }}>FACTURA</p>
        </div>
        <div className="grid grid-cols-2 gap-1 mb-1">
          <div className="rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-[2px]"><div className="w-5 h-[1.5px] rounded bg-slate-300 dark:bg-slate-600" /><div className="w-4 h-[1px] rounded bg-slate-200 dark:bg-slate-700 mt-[1px]" /></div>
          <div className="rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-[2px]"><div className="w-5 h-[1.5px] rounded bg-slate-300 dark:bg-slate-600" /><div className="w-4 h-[1px] rounded bg-slate-200 dark:bg-slate-700 mt-[1px]" /></div>
        </div>
        <div className="flex-1 rounded border border-slate-100 dark:border-slate-800 mb-0.5 overflow-hidden">
          <div className="h-[3px]" style={{ backgroundColor: c }} />
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-[2px] mx-0.5 mt-[1px] rounded bg-slate-100 dark:bg-slate-800" style={{ width: `${70 + (i % 2) * 10}%` }} />)}
        </div>
        <div className="flex justify-end"><div className="w-[40%] h-[2px] rounded" style={{ backgroundColor: c }} /></div>
      </div>
    </div>
  );
}

function CompactRetalho({ c }: { c: string }) {
  return (
    <div className="w-full h-full bg-white dark:bg-slate-900 overflow-hidden flex flex-col">
      <div className="h-[2px] w-full" style={{ backgroundColor: c }} />
      <div className="flex-1 px-1 py-0.5 flex flex-col">
        <div className="flex items-center justify-between mb-0.5">
          <div className="flex items-center gap-[2px]">
            <div className="w-1.5 h-1.5 rounded-[1px] flex items-center justify-center text-white text-[2.5px] font-black" style={{ backgroundColor: c }}>K</div>
            <div className="w-7 h-[2px] rounded bg-slate-700 dark:bg-slate-300" />
          </div>
          <p className="text-[3.5px] font-bold" style={{ color: c }}>FACTURA</p>
        </div>
        <div className="h-px w-full mb-0.5" style={{ backgroundColor: `${c}20` }} />
        <div className="grid grid-cols-2 gap-[3px] mb-0.5">
          <div className="space-y-[1px]"><div className="w-5 h-[1.5px] rounded bg-slate-300 dark:bg-slate-600" /><div className="w-4 h-[1px] rounded bg-slate-200 dark:bg-slate-700" /></div>
          <div className="space-y-[1px]"><div className="w-5 h-[1.5px] rounded bg-slate-300 dark:bg-slate-600" /><div className="w-4 h-[1px] rounded bg-slate-200 dark:bg-slate-700" /></div>
        </div>
        <div className="flex-1 rounded border border-slate-100 dark:border-slate-800 mb-0.5 overflow-hidden">
          <div className="flex items-center px-[3px] py-[1px] gap-[3px]" style={{ backgroundColor: c }}>
            <div className="flex-1 h-[1.5px] rounded bg-white/50" />
            <div className="w-[20%] h-[1.5px] rounded bg-white/50" />
          </div>
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="flex items-center px-[3px] py-[1px] gap-[3px]"><div className="flex-1 h-[1px] rounded bg-slate-200 dark:bg-slate-700" /><div className="w-[20%] h-[1px] rounded bg-slate-200 dark:bg-slate-700" /></div>)}
        </div>
        <div className="flex justify-end"><div className="w-[35%] h-[2px] rounded" style={{ backgroundColor: c }} /></div>
      </div>
    </div>
  );
}

/* ─── Main Component ────────────────────────────────────────────── */
function MiniDocumentPreview({
  templateId,
  brandColor,
  isSelected,
  compact = false,
}: {
  templateId: ModeloDocumento;
  brandColor: string;
  isSelected: boolean;
  compact?: boolean;
}) {
  const c = brandColor;

  if (compact) {
    const compactMap: Record<ModeloDocumento, React.FC<{ c: string }>> = {
      studio: CompactStudio,
      bold: CompactBold,
      nordic: CompactNordic,
      executivo: CompactExecutivo,
      grid: CompactGrid,
      moderno: CompactModerno,
      classico: CompactClassico,
      compacto: CompactRetalho,
    };
    const CompactComponent = compactMap[templateId];
    return CompactComponent ? <CompactComponent c={c} /> : null;
  }

  /* ─── STUDIO MINIMAL ──────────────────────────────────────────── */
  if (templateId === "studio") {
    return (
      <div className="w-full h-full bg-white dark:bg-slate-900 relative overflow-hidden flex flex-col">
        <div className="absolute left-0 top-0 bottom-0 w-[5px]" style={{ backgroundColor: c }} />
        <div className="pl-[9px] pr-1.5 pt-2 pb-1.5 flex flex-col h-full">
          {/* Header */}
          <div className="flex items-start justify-between mb-1.5">
            <div className="flex items-center gap-[3px]">
              <div className="w-3 h-3 rounded-[2px] flex items-center justify-center text-white text-[5px] font-black" style={{ backgroundColor: c }}>K</div>
              <div>
                <div className="w-14 h-[3px] rounded-[1px] bg-slate-800 dark:bg-slate-200 mb-[1px]" />
                <div className="w-10 h-[2px] rounded-[1px] bg-slate-300 dark:bg-slate-600" />
              </div>
            </div>
            <div className="text-right">
              <p className="text-[6px] font-black tracking-tighter" style={{ color: c }}>FACTURA</p>
              <div className="w-10 h-[2px] rounded-[1px] bg-slate-300 dark:bg-slate-600 ml-auto mt-[1px]" />
            </div>
          </div>
          <div className="h-px w-full mb-1.5" style={{ backgroundColor: `${c}25` }} />
          {/* Emissor / Cliente */}
          <div className="grid grid-cols-2 gap-1.5 mb-1.5">
            <div>
              <MicroLabel color={c}>Emissor</MicroLabel>
              <MicroText w="85%" />
              <MicroText w="65%" />
            </div>
            <div>
              <MicroLabel color={c}>Destinatário</MicroLabel>
              <MicroText w="80%" />
              <MicroText w="60%" />
            </div>
          </div>
          {/* Table */}
          <MicroTable headerBg="#f1f5f9" headerFg="#334155" accent={c} />
          {/* Total */}
          <div className="flex justify-end mt-1.5">
            <div className="w-[48%] space-y-[2px]">
              <div className="flex justify-between"><MicroText w="35%" /><MicroText w="30%" /></div>
              <div className="flex justify-between"><MicroText w="30%" /><MicroText w="28%" /></div>
              <div className="h-px mt-[1px]" style={{ backgroundColor: c }} />
              <div className="flex justify-between"><div className="w-[28%] h-[3.5px] rounded-[1px]" style={{ backgroundColor: c }} /><div className="w-[32%] h-[3.5px] rounded-[1px]" style={{ backgroundColor: c }} /></div>
            </div>
          </div>
          {/* Footer */}
          <div className="mt-auto pt-1 text-center">
            <div className="h-px w-full mb-[2px]" style={{ backgroundColor: `${c}15` }} />
            <p className="text-[3.5px] text-slate-400">Processado por Kima Fatura · AGT 999/AGT/2026</p>
            <p className="text-[3.5px] font-bold" style={{ color: c }}>Hash: 4A7B-9X2Y</p>
          </div>
        </div>
      </div>
    );
  }

  /* ─── BOLD CONTRAST ───────────────────────────────────────────── */
  if (templateId === "bold") {
    return (
      <div className="w-full h-full bg-white dark:bg-slate-900 overflow-hidden flex flex-col">
        {/* Solid header */}
        <div className="w-full px-2 py-1.5 flex items-center justify-between" style={{ backgroundColor: c }}>
          <div className="flex items-center gap-[3px]">
            <div className="w-3 h-3 rounded-[2px] bg-white/20 flex items-center justify-center text-white text-[5px] font-black">K</div>
            <div className="w-12 h-[3px] rounded-[1px] bg-white/70" />
          </div>
          <p className="text-[6px] font-black text-white tracking-wider">FACTURA</p>
        </div>
        <div className="flex-1 px-1.5 pt-1.5 pb-1.5 flex flex-col">
          {/* Meta row */}
          <div className="flex items-center justify-between mb-1.5 px-1 py-[2px] rounded-[2px]" style={{ backgroundColor: `${c}10` }}>
            <MicroText w="25%" />
            <MicroText w="20%" />
            <MicroText w="22%" />
          </div>
          {/* Emissor / Cliente */}
          <div className="grid grid-cols-2 gap-1.5 mb-1.5">
            <div className="rounded-[2px] p-1 border-l-[3px] bg-slate-50 dark:bg-slate-800" style={{ borderLeftColor: c }}>
              <MicroLabel color={c}>Emissor</MicroLabel>
              <MicroText w="90%" />
              <MicroText w="70%" />
            </div>
            <div className="rounded-[2px] p-1 border-l-[3px] bg-slate-50 dark:bg-slate-800" style={{ borderLeftColor: c }}>
              <MicroLabel color={c}>Destinatário</MicroLabel>
              <MicroText w="85%" />
              <MicroText w="65%" />
            </div>
          </div>
          {/* Table */}
          <MicroTable headerBg={c} headerFg="#ffffff" accent={c} />
          {/* Total */}
          <div className="flex justify-end mt-1.5">
            <div className="w-[48%] space-y-[2px]">
              <div className="flex justify-between"><MicroText w="35%" /><MicroText w="30%" /></div>
              <div className="flex justify-between"><MicroText w="30%" /><MicroText w="28%" /></div>
              <div className="flex justify-between p-[2px] rounded-[2px] text-white mt-[1px]" style={{ backgroundColor: c }}>
                <div className="w-[28%] h-[3px] rounded-[1px] bg-white/60" />
                <div className="w-[32%] h-[3px] rounded-[1px] bg-white/80" />
              </div>
            </div>
          </div>
          {/* Footer */}
          <div className="mt-auto pt-1 p-1 rounded-[2px] text-center" style={{ backgroundColor: c }}>
            <p className="text-[3.5px] text-white/80">Kima Fatura · AGT 999/AGT/2026</p>
            <p className="text-[3.5px] font-bold text-white">Hash: 4A7B-9X2Y</p>
          </div>
        </div>
      </div>
    );
  }

  /* ─── NORDIC ELEGANCE ─────────────────────────────────────────── */
  if (templateId === "nordic") {
    return (
      <div className="w-full h-full bg-white dark:bg-slate-900 overflow-hidden flex flex-col">
        {/* Double fine lines */}
        <div className="px-2 pt-2 space-y-px mb-1">
          <div className="h-px w-full" style={{ backgroundColor: c }} />
          <div className="h-px w-full bg-slate-300 dark:bg-slate-600" />
        </div>
        <div className="flex-1 px-2 pb-1.5 flex flex-col">
          {/* Header */}
          <div className="flex justify-between items-start mb-2">
            <div>
              <div className="w-16 h-[3.5px] rounded-[1px] bg-slate-700 dark:bg-slate-300 mb-[2px]" />
              <div className="w-12 h-[2px] rounded-[1px] bg-slate-300 dark:bg-slate-600" />
            </div>
            <div className="text-right">
              <p className="text-[6px] font-light tracking-[0.15em] uppercase" style={{ color: c, fontFamily: "Georgia, serif" }}>Factura</p>
              <div className="w-10 h-[2px] rounded-[1px] bg-slate-200 dark:bg-slate-700 ml-auto mt-[1px]" />
            </div>
          </div>
          <div className="h-px w-full mb-1.5" style={{ backgroundColor: `${c}20` }} />
          {/* Emissor / Cliente */}
          <div className="grid grid-cols-2 gap-2 mb-1.5">
            <div>
              <MicroLabel color={c}>Emissor</MicroLabel>
              <MicroText w="88%" />
              <MicroText w="68%" />
            </div>
            <div>
              <MicroLabel color={c}>Destinatário</MicroLabel>
              <MicroText w="82%" />
              <MicroText w="62%" />
            </div>
          </div>
          {/* Table */}
          <MicroTable headerBg="#f8fafc" headerFg="#475569" accent={c} />
          {/* Total */}
          <div className="flex justify-end mt-1.5">
            <div className="w-[48%] space-y-[2px]">
              <div className="flex justify-between"><MicroText w="35%" /><MicroText w="30%" /></div>
              <div className="flex justify-between"><MicroText w="30%" /><MicroText w="28%" /></div>
              <div className="h-px mt-[1px]" style={{ backgroundColor: `${c}30` }} />
              <div className="flex justify-between mt-[1px]"><div className="w-[28%] h-[3px] rounded-[1px]" style={{ backgroundColor: `${c}30` }} /><div className="w-[32%] h-[3px] rounded-[1px]" style={{ backgroundColor: c }} /></div>
            </div>
          </div>
          {/* Footer */}
          <div className="mt-auto pt-1.5 space-y-px">
            <div className="h-px w-full" style={{ backgroundColor: `${c}20` }} />
            <div className="h-px w-full bg-slate-200 dark:bg-slate-700" />
          </div>
          <p className="text-[3.5px] text-center text-slate-400 mt-[2px]">Kima Fatura · AGT 999/AGT/2026 · <span style={{ color: c }}>Hash: 4A7B-9X2Y</span></p>
        </div>
      </div>
    );
  }

  /* ─── CORPORATE EXECUTIVE ─────────────────────────────────────── */
  if (templateId === "executivo") {
    return (
      <div className="w-full h-full bg-white dark:bg-slate-900 overflow-hidden flex flex-col">
        <div className="h-3.5 w-full flex flex-col justify-end px-2" style={{ backgroundColor: `${c}12` }}>
          <div className="h-px w-full" style={{ backgroundColor: c }} />
        </div>
        <div className="flex-1 px-1.5 pt-1.5 pb-1.5 flex flex-col">
          {/* Header */}
          <div className="flex items-start justify-between mb-1.5">
            <div className="flex items-center gap-[3px]">
              <div className="w-3 h-3 rounded-[2px] flex items-center justify-center text-white text-[5px] font-black" style={{ backgroundColor: c }}>K</div>
              <div>
                <div className="w-14 h-[3px] rounded-[1px] bg-slate-800 dark:bg-slate-200 mb-[1px]" />
                <div className="w-10 h-[2px] rounded-[1px] bg-slate-300 dark:bg-slate-600" />
              </div>
            </div>
            <div className="text-right">
              <p className="text-[6px] font-bold" style={{ color: c }}>FACTURA</p>
              <div className="w-10 h-[2px] rounded-[1px] bg-slate-300 dark:bg-slate-600 ml-auto mt-[1px]" />
            </div>
          </div>
          {/* Emissor / Cliente with border-left cards */}
          <div className="grid grid-cols-2 gap-1.5 mb-1.5">
            <div className="p-[3px] rounded-[2px] border-l-[3px] bg-slate-50 dark:bg-slate-800" style={{ borderLeftColor: c }}>
              <MicroLabel color={c}>Emissor</MicroLabel>
              <MicroText w="92%" />
              <MicroText w="72%" />
            </div>
            <div className="p-[3px] rounded-[2px] border-l-[3px] bg-slate-50 dark:bg-slate-800" style={{ borderLeftColor: c }}>
              <MicroLabel color={c}>Destinatário</MicroLabel>
              <MicroText w="88%" />
              <MicroText w="68%" />
            </div>
          </div>
          {/* Table */}
          <MicroTable headerBg={`${c}12`} headerFg={c} accent={c} />
          {/* Total */}
          <div className="flex justify-end mt-1.5">
            <div className="w-[48%] space-y-[2px]">
              <div className="flex justify-between"><MicroText w="35%" /><MicroText w="30%" /></div>
              <div className="flex justify-between"><MicroText w="30%" /><MicroText w="28%" /></div>
              <div className="flex justify-between p-[2px] rounded-[2px] text-white mt-[1px]" style={{ backgroundColor: c }}>
                <div className="w-[28%] h-[3px] rounded-[1px] bg-white/60" />
                <div className="w-[32%] h-[3px] rounded-[1px] bg-white/80" />
              </div>
            </div>
          </div>
          {/* Footer */}
          <div className="mt-auto pt-1 text-center">
            <div className="h-px w-full mb-[2px]" style={{ backgroundColor: `${c}15` }} />
            <p className="text-[3.5px] text-slate-400">Kima Fatura · AGT 999/AGT/2026</p>
            <p className="text-[3.5px] font-bold" style={{ color: c }}>Hash: 4A7B-9X2Y</p>
          </div>
        </div>
      </div>
    );
  }

  /* ─── MODERN GRID ─────────────────────────────────────────────── */
  if (templateId === "grid") {
    return (
      <div className="w-full h-full bg-white dark:bg-slate-900 overflow-hidden flex flex-col p-1.5">
        {/* Info cards */}
        <div className="grid grid-cols-2 gap-1 mb-1.5">
          <div className="rounded-[3px] border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-1">
            <MicroLabel color={c}>Emissor</MicroLabel>
            <MicroText w="90%" />
            <MicroText w="70%" />
          </div>
          <div className="rounded-[3px] border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-1">
            <MicroLabel color={c}>Destinatário</MicroLabel>
            <MicroText w="85%" />
            <MicroText w="65%" />
          </div>
        </div>
        {/* Meta card */}
        <div className="rounded-[3px] border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-1 mb-1.5">
          <div className="flex items-center justify-between">
            <div className="flex gap-1.5"><MicroText w="22%" /><MicroText w="18%" /></div>
            <div className="flex items-center gap-[2px]">
              <div className="w-2 h-2 rounded-[1px]" style={{ backgroundColor: c }} />
              <p className="text-[5px] font-bold" style={{ color: c }}>FACTURA</p>
            </div>
          </div>
        </div>
        {/* Table */}
        <MicroTable headerBg={c} headerFg="#ffffff" accent={c} />
        {/* Total */}
        <div className="flex justify-end mt-1">
          <div className="w-[48%] space-y-[2px]">
            <div className="flex justify-between"><MicroText w="35%" /><MicroText w="30%" /></div>
            <div className="flex justify-between"><MicroText w="30%" /><MicroText w="28%" /></div>
            <div className="flex justify-between p-[2px] rounded-[3px] border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 mt-[1px]" style={{ color: c }}>
              <div className="w-[28%] h-[3px] rounded-[1px]" style={{ backgroundColor: `${c}30` }} />
              <div className="w-[32%] h-[3px] rounded-[1px]" style={{ backgroundColor: c }} />
            </div>
          </div>
        </div>
        {/* Footer */}
        <div className="mt-auto pt-1 text-center">
          <div className="h-px w-full mb-[2px] border-slate-100 dark:border-slate-800" />
          <p className="text-[3.5px] text-slate-400">Kima Fatura · AGT 999/AGT/2026 · <span style={{ color: c }}>Hash: 4A7B-9X2Y</span></p>
        </div>
      </div>
    );
  }

  /* ─── MODERN CLEAN ────────────────────────────────────────────── */
  if (templateId === "moderno") {
    return (
      <div className="w-full h-full bg-white dark:bg-slate-900 overflow-hidden flex flex-col p-1.5">
        {/* Header */}
        <div className="flex items-start justify-between mb-1.5">
          <div className="flex items-center gap-[3px]">
            <div className="w-3 h-3 rounded-[2px] bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[5px] font-black text-slate-500">K</div>
            <div>
              <div className="w-14 h-[3px] rounded-[1px] bg-slate-700 dark:bg-slate-300 mb-[1px]" />
              <div className="w-10 h-[2px] rounded-[1px] bg-slate-300 dark:bg-slate-600" />
            </div>
          </div>
          <div className="text-right">
            <p className="text-[6px] font-bold" style={{ color: c }}>FACTURA</p>
            <div className="w-10 h-[2px] rounded-[1px] bg-slate-300 dark:bg-slate-600 ml-auto mt-[1px]" />
          </div>
        </div>
        <div className="h-[2px] w-full mb-1.5" style={{ backgroundColor: c }} />
        {/* Emissor / Cliente */}
        <div className="grid grid-cols-2 gap-1.5 mb-1.5">
          <div>
            <MicroLabel color={c}>Emissor</MicroLabel>
            <MicroText w="88%" />
            <MicroText w="68%" />
          </div>
          <div>
            <MicroLabel color={c}>Destinatário</MicroLabel>
            <MicroText w="82%" />
            <MicroText w="62%" />
          </div>
        </div>
        {/* Table */}
        <MicroTable headerBg="#f8fafc" headerFg="#334155" accent={c} />
        {/* Total */}
        <div className="flex justify-end mt-1">
          <div className="w-[48%] space-y-[2px]">
            <div className="flex justify-between"><MicroText w="35%" /><MicroText w="30%" /></div>
            <div className="flex justify-between"><MicroText w="30%" /><MicroText w="28%" /></div>
            <div className="h-px mt-[1px]" style={{ backgroundColor: c }} />
            <div className="flex justify-between mt-[1px]"><div className="w-[28%] h-[3px] rounded-[1px]" style={{ backgroundColor: c }} /><div className="w-[32%] h-[3px] rounded-[1px]" style={{ backgroundColor: c }} /></div>
          </div>
        </div>
        {/* Footer */}
        <div className="mt-auto pt-1 text-center">
          <div className="h-px w-full mb-[2px]" style={{ backgroundColor: `${c}15` }} />
          <p className="text-[3.5px] text-slate-400">Kima Fatura · AGT 999/AGT/2026</p>
          <p className="text-[3.5px] font-bold" style={{ color: c }}>Hash: 4A7B-9X2Y</p>
        </div>
      </div>
    );
  }

  /* ─── KIMA CLÁSSICO ───────────────────────────────────────────── */
  if (templateId === "classico") {
    return (
      <div className="w-full h-full bg-white dark:bg-slate-900 overflow-hidden flex flex-col">
        <div className="h-[5px] w-full" style={{ backgroundColor: c }} />
        <div className="flex-1 px-1.5 pt-1.5 pb-1.5 flex flex-col">
          {/* Header */}
          <div className="flex items-start justify-between mb-1.5 border-b border-slate-100 dark:border-slate-800 pb-1">
            <div className="flex items-center gap-[3px]">
              <div className="w-3 h-3 rounded-[2px] flex items-center justify-center text-white text-[5px] font-black" style={{ backgroundColor: c }}>K</div>
              <div>
                <div className="w-14 h-[3px] rounded-[1px] bg-slate-800 dark:bg-slate-200 mb-[1px]" />
                <div className="w-10 h-[2px] rounded-[1px] bg-slate-300 dark:bg-slate-600" />
              </div>
            </div>
            <div className="text-right">
              <p className="text-[6px] font-bold" style={{ color: c }}>FACTURA</p>
              <div className="w-10 h-[2px] rounded-[1px] bg-slate-300 dark:bg-slate-600 ml-auto mt-[1px]" />
            </div>
          </div>
          {/* Emissor / Cliente boxed */}
          <div className="grid grid-cols-2 gap-1.5 mb-1.5">
            <div className="p-[3px] rounded-[2px] border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
              <MicroLabel color={c}>Emissor</MicroLabel>
              <MicroText w="92%" />
              <MicroText w="72%" />
            </div>
            <div className="p-[3px] rounded-[2px] border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
              <MicroLabel color={c}>Destinatário</MicroLabel>
              <MicroText w="88%" />
              <MicroText w="68%" />
            </div>
          </div>
          {/* Table */}
          <MicroTable headerBg={c} headerFg="#ffffff" accent={c} />
          {/* Total */}
          <div className="flex justify-end mt-1.5">
            <div className="w-[48%] space-y-[2px]">
              <div className="flex justify-between"><MicroText w="35%" /><MicroText w="30%" /></div>
              <div className="flex justify-between"><MicroText w="30%" /><MicroText w="28%" /></div>
              <div className="h-px mt-[1px]" style={{ backgroundColor: c }} />
              <div className="flex justify-between mt-[1px]"><div className="w-[28%] h-[3px] rounded-[1px]" style={{ backgroundColor: c }} /><div className="w-[32%] h-[3px] rounded-[1px]" style={{ backgroundColor: c }} /></div>
            </div>
          </div>
          {/* Footer */}
          <div className="mt-auto pt-1 p-1 rounded-[2px] text-center" style={{ backgroundColor: c }}>
            <p className="text-[3.5px] text-white/80">Kima Fatura · AGT 999/AGT/2026</p>
            <p className="text-[3.5px] font-bold text-white">Hash: 4A7B-9X2Y</p>
          </div>
        </div>
      </div>
    );
  }

  /* ─── COMPACT / RETALHO ───────────────────────────────────────── */
  if (templateId === "compacto") {
    return (
      <div className="w-full h-full bg-white dark:bg-slate-900 overflow-hidden flex flex-col">
        <div className="h-[3px] w-full" style={{ backgroundColor: c }} />
        <div className="flex-1 px-1.5 py-1 flex flex-col">
          {/* Header compact */}
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-[2px]">
              <div className="w-2.5 h-2.5 rounded-[1px] flex items-center justify-center text-white text-[4px] font-black" style={{ backgroundColor: c }}>K</div>
              <div className="w-12 h-[3px] rounded-[1px] bg-slate-700 dark:bg-slate-300" />
            </div>
            <p className="text-[5px] font-bold" style={{ color: c }}>FACTURA</p>
          </div>
          <div className="h-px w-full mb-1" style={{ backgroundColor: `${c}25` }} />
          {/* Emissor / Cliente inline */}
          <div className="grid grid-cols-2 gap-1 mb-1">
            <div>
              <MicroLabel color={c}>Emissor</MicroLabel>
              <MicroText w="95%" />
              <MicroText w="75%" />
            </div>
            <div>
              <MicroLabel color={c}>Cliente</MicroLabel>
              <MicroText w="90%" />
              <MicroText w="70%" />
            </div>
          </div>
          {/* Dense table */}
          <div className="rounded-[2px] overflow-hidden border border-slate-100 dark:border-slate-800">
            <div className="flex items-center px-1 py-[1px] gap-1" style={{ backgroundColor: c }}>
              <span className="text-[4.5px] font-bold text-white flex-1">Descrição</span>
              <span className="text-[4.5px] font-bold text-white w-[18%] text-right">Total</span>
            </div>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className={`flex items-center px-1 py-[1px] gap-1 ${i % 2 === 1 ? "bg-slate-50/60 dark:bg-slate-800/40" : ""}`}>
                <div className="flex-1"><MicroText w={`${55 + (i % 3) * 8}%`} /></div>
                <div className="w-[18%] flex justify-end"><MicroText w="85%" /></div>
              </div>
            ))}
          </div>
          {/* Total compact */}
          <div className="flex justify-end mt-1">
            <div className="w-[42%] space-y-[1px]">
              <div className="flex justify-between"><MicroText w="40%" /><MicroText w="32%" /></div>
              <div className="flex justify-between"><MicroText w="35%" /><MicroText w="30%" /></div>
              <div className="h-px mt-[1px]" style={{ backgroundColor: c }} />
              <div className="flex justify-between mt-[1px]"><div className="w-[30%] h-[3px] rounded-[1px]" style={{ backgroundColor: c }} /><div className="w-[35%] h-[3px] rounded-[1px]" style={{ backgroundColor: c }} /></div>
            </div>
          </div>
          {/* Footer */}
          <div className="mt-auto pt-[2px] text-center">
            <div className="h-px w-full mb-[1px]" style={{ backgroundColor: `${c}15` }} />
            <p className="text-[3px] text-slate-400">Kima Fatura · AGT 999/AGT/2026 · <span style={{ color: c }}>Hash: 4A7B-9X2Y</span></p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

/* ─── A4 Preview reutilizável (DRY) ─────────────────────────────── */
function A4Preview({
  tmpl,
  cor,
  formData,
}: {
  tmpl: ModeloDocumento;
  cor: string;
  formData: { logoUrl: string | null; nomeEmpresa: string };
}) {
  return (
    <div className="bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden relative font-sans text-[10px] leading-tight select-none">
      {/* ═══ STUDIO MINIMAL ═══ */}
      {tmpl === "studio" && (
        <div className="relative">
          <div className="absolute left-0 top-0 bottom-0 w-2 z-10" style={{ backgroundColor: cor }} />
          <div className="pl-5 pr-4 pt-4 pb-4 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                {formData.logoUrl ? (
                  <img src={formData.logoUrl} alt="Logo" className="h-8 w-auto max-w-[90px] object-contain" />
                ) : (
                  <div className="w-8 h-8 rounded-lg text-white font-extrabold flex items-center justify-center text-sm" style={{ backgroundColor: cor }}>
                    {formData.nomeEmpresa?.charAt(0) || "K"}
                  </div>
                )}
                <div>
                  <p className="font-bold text-sm tracking-tight">{formData.nomeEmpresa || "KIMA FACTURAÇÃO"}</p>
                  <p className="text-[9px] text-slate-500">NIF: 5417123456 · Luanda, Angola</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-black text-[11px] tracking-tight" style={{ color: cor }}>FACTURA</p>
                <p className="text-[9px] text-slate-500">FT 2026/000001 · 09/09/2026</p>
              </div>
            </div>
            <div className="h-px w-full" style={{ backgroundColor: `${cor}20` }} />
            <div className="grid grid-cols-2 gap-3 text-[9px]">
              <div><p className="font-bold text-[7px] uppercase tracking-wider" style={{ color: cor }}>Emissor</p><p className="font-semibold">KIMA HOLDING, LDA</p><p className="text-slate-500">NIF: 5417123456</p></div>
              <div><p className="font-bold text-[7px] uppercase tracking-wider" style={{ color: cor }}>Cliente</p><p className="font-semibold">Empresa Cliente, Lda</p><p className="text-slate-500">NIF: 5000123456</p></div>
            </div>
            <div className="rounded overflow-hidden border border-slate-200">
              <div className="grid grid-cols-[1fr_60px_70px] gap-2 px-2 py-1 bg-slate-50 text-[7px] font-bold uppercase tracking-wider text-slate-500"><span>Descrição</span><span className="text-right">Qtd</span><span className="text-right">Total</span></div>
              <div className="divide-y divide-slate-100 text-[8px]">
                <div className="grid grid-cols-[1fr_60px_70px] gap-2 px-2 py-1"><span>Consultoria em Faturação Web</span><span className="text-right">1</span><span className="text-right font-mono">114.000,00</span></div>
                <div className="grid grid-cols-[1fr_60px_70px] gap-2 px-2 py-1 bg-slate-50/50"><span>Licenciamento Software</span><span className="text-right">1</span><span className="text-right font-mono">57.000,00</span></div>
                <div className="grid grid-cols-[1fr_60px_70px] gap-2 px-2 py-1"><span>Suporte Técnico Mensal</span><span className="text-right">1</span><span className="text-right font-mono">25.000,00</span></div>
                <div className="grid grid-cols-[1fr_60px_70px] gap-2 px-2 py-1 bg-slate-50/50"><span>Manutenção Preventiva</span><span className="text-right">1</span><span className="text-right font-mono">15.000,00</span></div>
              </div>
            </div>
            <div className="flex justify-end"><div className="w-36 text-right space-y-0.5 text-[8px]"><div className="flex justify-between text-slate-400"><span>Sub:</span><span className="font-mono">211.000,00</span></div><div className="flex justify-between text-slate-400"><span>IVA:</span><span className="font-mono">29.540,00</span></div><div className="flex justify-between font-bold text-[9px] pt-0.5 border-t" style={{ borderColor: cor, color: cor }}><span>TOTAL:</span><span className="font-mono">240.540,00 Kz</span></div></div></div>
            <div className="text-[6px] text-center text-slate-400 border-t pt-1" style={{ borderColor: `${cor}20` }}><p>Kima Fatura &middot; AGT 999/AGT/2026 &middot; Hash: 4A7B-9X2Y</p></div>
          </div>
        </div>
      )}
      {/* ═══ BOLD CONTRAST ═══ */}
      {tmpl === "bold" && (
        <div>
          <div className="px-4 py-3 flex items-center justify-between text-white" style={{ backgroundColor: cor }}>
            <div className="flex items-center gap-2">{formData.logoUrl ? <img src={formData.logoUrl} alt="Logo" className="h-7 w-auto max-w-[80px] object-contain brightness-0 invert" /> : <div className="w-7 h-7 rounded bg-white/20 flex items-center justify-center font-black text-xs">{formData.nomeEmpresa?.charAt(0) || "K"}</div>}<span className="font-bold text-xs">{formData.nomeEmpresa || "KIMA FACTURAÇÃO"}</span></div>
            <span className="font-black text-xs tracking-wider">FACTURA</span>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex justify-between text-[9px]"><span className="text-slate-500">FT 2026/000001 · 09/09/2026</span><span className="font-mono text-slate-500">NIF: 5417123456</span></div>
            <div className="grid grid-cols-2 gap-3 text-[9px]">
              <div className="rounded p-2 border-l-2 bg-slate-50" style={{ borderLeftColor: cor }}><p className="font-bold text-[7px] uppercase" style={{ color: cor }}>Emissor</p><p className="font-semibold">KIMA HOLDING, LDA</p><p className="text-slate-500">NIF: 5417123456</p></div>
              <div className="rounded p-2 border-l-2 bg-slate-50" style={{ borderLeftColor: cor }}><p className="font-bold text-[7px] uppercase" style={{ color: cor }}>Cliente</p><p className="font-semibold">Empresa Cliente, Lda</p><p className="text-slate-500">NIF: 5000123456</p></div>
            </div>
            <div className="rounded overflow-hidden border border-slate-200">
              <div className="grid grid-cols-[1fr_60px_70px] gap-2 px-2 py-1 text-[7px] font-bold uppercase tracking-wider text-white" style={{ backgroundColor: cor }}><span>Descrição</span><span className="text-right">Qtd</span><span className="text-right">Total</span></div>
              <div className="divide-y divide-slate-100 text-[8px]">
                <div className="grid grid-cols-[1fr_60px_70px] gap-2 px-2 py-1"><span>Consultoria em Faturação Web</span><span className="text-right">1</span><span className="text-right font-mono">114.000,00</span></div>
                <div className="grid grid-cols-[1fr_60px_70px] gap-2 px-2 py-1 bg-slate-50/50"><span>Licenciamento Software</span><span className="text-right">1</span><span className="text-right font-mono">57.000,00</span></div>
                <div className="grid grid-cols-[1fr_60px_70px] gap-2 px-2 py-1"><span>Suporte Técnico Mensal</span><span className="text-right">1</span><span className="text-right font-mono">25.000,00</span></div>
                <div className="grid grid-cols-[1fr_60px_70px] gap-2 px-2 py-1 bg-slate-50/50"><span>Manutenção Preventiva</span><span className="text-right">1</span><span className="text-right font-mono">15.000,00</span></div>
              </div>
            </div>
            <div className="flex justify-end"><div className="w-36 text-right space-y-0.5 text-[8px]"><div className="flex justify-between text-slate-400"><span>Sub:</span><span className="font-mono">211.000,00</span></div><div className="flex justify-between text-slate-400"><span>IVA:</span><span className="font-mono">29.540,00</span></div><div className="flex justify-between font-bold text-white px-2 py-1 rounded text-[9px]" style={{ backgroundColor: cor }}><span>TOTAL:</span><span className="font-mono">240.540,00 Kz</span></div></div></div>
            <div className="text-[6px] text-center text-white rounded py-1" style={{ backgroundColor: cor }}><p>Kima Fatura &middot; AGT 999/AGT/2026 &middot; Hash: 4A7B-9X2Y</p></div>
          </div>
        </div>
      )}
      {/* ═══ NORDIC ELEGANCE ═══ */}
      {tmpl === "nordic" && (
        <div className="p-4 space-y-3">
          <div className="space-y-1"><div className="h-px w-full" style={{ backgroundColor: cor }} /><div className="h-px w-full bg-slate-200" /></div>
          <div className="flex justify-between items-start"><div><p className="font-serif font-light text-sm tracking-wide">{formData.nomeEmpresa || "KIMA FACTURAÇÃO"}</p><p className="text-[9px] text-slate-500">NIF: 5417123456 · Luanda</p></div><div className="text-right"><p className="font-serif font-light text-xs tracking-[0.15em] uppercase" style={{ color: cor, fontFamily: "Georgia, serif" }}>Factura</p><p className="text-[9px] text-slate-500">FT 2026/000001</p></div></div>
          <div className="h-px w-full" style={{ backgroundColor: `${cor}20` }} />
          <div className="grid grid-cols-2 gap-3 text-[9px]">
            <div><p className="font-bold text-[7px] uppercase tracking-wider" style={{ color: cor }}>Emissor</p><p className="font-semibold">KIMA HOLDING, LDA</p><p className="text-slate-500">NIF: 5417123456</p></div>
            <div><p className="font-bold text-[7px] uppercase tracking-wider" style={{ color: cor }}>Cliente</p><p className="font-semibold">Empresa Cliente, Lda</p><p className="text-slate-500">NIF: 5000123456</p></div>
          </div>
          <div className="rounded overflow-hidden border border-slate-200">
            <div className="grid grid-cols-[1fr_60px_70px] gap-2 px-2 py-1 bg-slate-50 text-[7px] font-bold uppercase tracking-wider text-slate-500"><span>Descrição</span><span className="text-right">Qtd</span><span className="text-right">Total</span></div>
            <div className="divide-y divide-slate-100 text-[8px]">
              <div className="grid grid-cols-[1fr_60px_70px] gap-2 px-2 py-1"><span>Consultoria em Faturação Web</span><span className="text-right">1</span><span className="text-right font-mono">114.000,00</span></div>
              <div className="grid grid-cols-[1fr_60px_70px] gap-2 px-2 py-1 bg-slate-50/50"><span>Licenciamento Software</span><span className="text-right">1</span><span className="text-right font-mono">57.000,00</span></div>
              <div className="grid grid-cols-[1fr_60px_70px] gap-2 px-2 py-1"><span>Suporte Técnico Mensal</span><span className="text-right">1</span><span className="text-right font-mono">25.000,00</span></div>
              <div className="grid grid-cols-[1fr_60px_70px] gap-2 px-2 py-1 bg-slate-50/50"><span>Manutenção Preventiva</span><span className="text-right">1</span><span className="text-right font-mono">15.000,00</span></div>
            </div>
          </div>
          <div className="flex justify-end"><div className="w-36 text-right space-y-0.5 text-[8px]"><div className="flex justify-between text-slate-400"><span>Sub:</span><span className="font-mono">211.000,00</span></div><div className="flex justify-between text-slate-400"><span>IVA:</span><span className="font-mono">29.540,00</span></div><div className="flex justify-between font-bold text-[9px] pt-0.5 border-t" style={{ borderColor: `${cor}30`, color: cor }}><span>TOTAL:</span><span className="font-mono">240.540,00 Kz</span></div></div></div>
          <div className="space-y-1 pt-1"><div className="h-px w-full" style={{ backgroundColor: `${cor}20` }} /><div className="h-px w-full bg-slate-200" /></div>
          <p className="text-[6px] text-center text-slate-400">Kima Fatura &middot; AGT 999/AGT/2026 &middot; <span style={{ color: cor }}>Hash: 4A7B-9X2Y</span></p>
        </div>
      )}
      {/* ═══ CORPORATE EXECUTIVO ═══ */}
      {tmpl === "executivo" && (
        <div>
          <div className="h-3 w-full" style={{ backgroundColor: `${cor}12` }}><div className="h-px w-full" style={{ backgroundColor: cor }} /></div>
          <div className="p-4 space-y-3">
            <div className="flex items-start justify-between"><div className="flex items-center gap-2">{formData.logoUrl ? <img src={formData.logoUrl} alt="Logo" className="h-8 w-auto max-w-[90px] object-contain" /> : <div className="w-8 h-8 rounded text-white font-extrabold flex items-center justify-center text-sm" style={{ backgroundColor: cor }}>{formData.nomeEmpresa?.charAt(0) || "K"}</div>}<div><p className="font-bold text-sm">{formData.nomeEmpresa || "KIMA FACTURAÇÃO"}</p><p className="text-[9px] text-slate-500">NIF: 5417123456 · Luanda</p></div></div><div className="text-right"><p className="font-bold text-[11px]" style={{ color: cor }}>FACTURA</p><p className="text-[9px] text-slate-500">FT 2026/000001</p></div></div>
            <div className="grid grid-cols-2 gap-3 text-[9px]">
              <div className="rounded p-2 border-l-2 bg-slate-50" style={{ borderLeftColor: cor }}><p className="font-bold text-[7px] uppercase" style={{ color: cor }}>Emissor</p><p className="font-semibold">KIMA HOLDING, LDA</p><p className="text-slate-500">NIF: 5417123456</p></div>
              <div className="rounded p-2 border-l-2 bg-slate-50" style={{ borderLeftColor: cor }}><p className="font-bold text-[7px] uppercase" style={{ color: cor }}>Cliente</p><p className="font-semibold">Empresa Cliente, Lda</p><p className="text-slate-500">NIF: 5000123456</p></div>
            </div>
            <div className="rounded overflow-hidden border border-slate-200">
              <div className="grid grid-cols-[1fr_60px_70px] gap-2 px-2 py-1 text-[7px] font-bold uppercase tracking-wider" style={{ backgroundColor: `${cor}12`, color: cor }}><span>Descrição</span><span className="text-right">Qtd</span><span className="text-right">Total</span></div>
              <div className="divide-y divide-slate-100 text-[8px]">
                <div className="grid grid-cols-[1fr_60px_70px] gap-2 px-2 py-1"><span>Consultoria em Faturação Web</span><span className="text-right">1</span><span className="text-right font-mono">114.000,00</span></div>
                <div className="grid grid-cols-[1fr_60px_70px] gap-2 px-2 py-1 bg-slate-50/50"><span>Licenciamento Software</span><span className="text-right">1</span><span className="text-right font-mono">57.000,00</span></div>
                <div className="grid grid-cols-[1fr_60px_70px] gap-2 px-2 py-1"><span>Suporte Técnico Mensal</span><span className="text-right">1</span><span className="text-right font-mono">25.000,00</span></div>
                <div className="grid grid-cols-[1fr_60px_70px] gap-2 px-2 py-1 bg-slate-50/50"><span>Manutenção Preventiva</span><span className="text-right">1</span><span className="text-right font-mono">15.000,00</span></div>
              </div>
            </div>
            <div className="flex justify-end"><div className="w-36 text-right space-y-0.5 text-[8px]"><div className="flex justify-between text-slate-400"><span>Sub:</span><span className="font-mono">211.000,00</span></div><div className="flex justify-between text-slate-400"><span>IVA:</span><span className="font-mono">29.540,00</span></div><div className="flex justify-between font-bold text-white px-2 py-1 rounded text-[9px]" style={{ backgroundColor: cor }}><span>TOTAL:</span><span className="font-mono">240.540,00 Kz</span></div></div></div>
            <div className="text-[6px] text-center text-slate-400 border-t pt-1" style={{ borderColor: `${cor}15` }}><p>Kima Fatura &middot; AGT 999/AGT/2026 &middot; Hash: 4A7B-9X2Y</p></div>
          </div>
        </div>
      )}
      {/* ═══ MODERN GRID ═══ */}
      {tmpl === "grid" && (
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-2 text-[9px]">
            <div className="rounded border border-slate-200 bg-slate-50 p-2"><p className="font-bold text-[7px] uppercase" style={{ color: cor }}>Emissor</p><p className="font-semibold">KIMA HOLDING, LDA</p><p className="text-slate-500">NIF: 5417123456</p></div>
            <div className="rounded border border-slate-200 bg-slate-50 p-2"><p className="font-bold text-[7px] uppercase" style={{ color: cor }}>Cliente</p><p className="font-semibold">Empresa Cliente, Lda</p><p className="text-slate-500">NIF: 5000123456</p></div>
          </div>
          <div className="rounded border border-slate-200 bg-slate-50 p-2 flex items-center justify-between text-[9px]"><span className="text-slate-500">FT 2026/000001 · 09/09/2026</span><span className="font-bold flex items-center gap-1" style={{ color: cor }}><span className="w-2 h-2 rounded-sm inline-block" style={{ backgroundColor: cor }} />FACTURA</span></div>
          <div className="rounded overflow-hidden border border-slate-200">
            <div className="grid grid-cols-[1fr_60px_70px] gap-2 px-2 py-1 text-[7px] font-bold uppercase tracking-wider text-white" style={{ backgroundColor: cor }}><span>Descrição</span><span className="text-right">Qtd</span><span className="text-right">Total</span></div>
            <div className="divide-y divide-slate-100 text-[8px]">
              <div className="grid grid-cols-[1fr_60px_70px] gap-2 px-2 py-1"><span>Consultoria em Faturação Web</span><span className="text-right">1</span><span className="text-right font-mono">114.000,00</span></div>
              <div className="grid grid-cols-[1fr_60px_70px] gap-2 px-2 py-1 bg-slate-50/50"><span>Licenciamento Software</span><span className="text-right">1</span><span className="text-right font-mono">57.000,00</span></div>
              <div className="grid grid-cols-[1fr_60px_70px] gap-2 px-2 py-1"><span>Suporte Técnico Mensal</span><span className="text-right">1</span><span className="text-right font-mono">25.000,00</span></div>
              <div className="grid grid-cols-[1fr_60px_70px] gap-2 px-2 py-1 bg-slate-50/50"><span>Manutenção Preventiva</span><span className="text-right">1</span><span className="text-right font-mono">15.000,00</span></div>
            </div>
          </div>
          <div className="flex justify-end"><div className="w-36 text-right space-y-0.5 text-[8px]"><div className="flex justify-between text-slate-400"><span>Sub:</span><span className="font-mono">211.000,00</span></div><div className="flex justify-between text-slate-400"><span>IVA:</span><span className="font-mono">29.540,00</span></div><div className="flex justify-between font-bold px-2 py-1 rounded border text-[9px] bg-slate-50" style={{ borderColor: `${cor}30`, color: cor }}><span>TOTAL:</span><span className="font-mono">240.540,00 Kz</span></div></div></div>
          <p className="text-[6px] text-center text-slate-400">Kima Fatura &middot; AGT 999/AGT/2026 &middot; <span style={{ color: cor }}>Hash: 4A7B-9X2Y</span></p>
        </div>
      )}
      {/* ═══ MODERNO CLEAN ═══ */}
      {tmpl === "moderno" && (
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between"><div className="flex items-center gap-2"><div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center font-black text-xs text-slate-500">K</div><div><p className="font-bold text-sm">{formData.nomeEmpresa || "KIMA FACTURAÇÃO"}</p><p className="text-[9px] text-slate-500">NIF: 5417123456</p></div></div><div className="text-right"><p className="font-bold text-[11px]" style={{ color: cor }}>FACTURA</p><p className="text-[9px] text-slate-500">FT 2026/000001</p></div></div>
          <div className="h-0.5 w-full" style={{ backgroundColor: cor }} />
          <div className="grid grid-cols-2 gap-3 text-[9px]">
            <div><p className="font-bold text-[7px] uppercase" style={{ color: cor }}>Emissor</p><p className="font-semibold">KIMA HOLDING, LDA</p><p className="text-slate-500">NIF: 5417123456</p></div>
            <div><p className="font-bold text-[7px] uppercase" style={{ color: cor }}>Cliente</p><p className="font-semibold">Empresa Cliente, Lda</p><p className="text-slate-500">NIF: 5000123456</p></div>
          </div>
          <div className="rounded overflow-hidden border border-slate-200">
            <div className="grid grid-cols-[1fr_60px_70px] gap-2 px-2 py-1 bg-slate-50 text-[7px] font-bold uppercase tracking-wider text-slate-500"><span>Descrição</span><span className="text-right">Qtd</span><span className="text-right">Total</span></div>
            <div className="divide-y divide-slate-100 text-[8px]">
              <div className="grid grid-cols-[1fr_60px_70px] gap-2 px-2 py-1"><span>Consultoria em Faturação Web</span><span className="text-right">1</span><span className="text-right font-mono">114.000,00</span></div>
              <div className="grid grid-cols-[1fr_60px_70px] gap-2 px-2 py-1 bg-slate-50/50"><span>Licenciamento Software</span><span className="text-right">1</span><span className="text-right font-mono">57.000,00</span></div>
              <div className="grid grid-cols-[1fr_60px_70px] gap-2 px-2 py-1"><span>Suporte Técnico Mensal</span><span className="text-right">1</span><span className="text-right font-mono">25.000,00</span></div>
              <div className="grid grid-cols-[1fr_60px_70px] gap-2 px-2 py-1 bg-slate-50/50"><span>Manutenção Preventiva</span><span className="text-right">1</span><span className="text-right font-mono">15.000,00</span></div>
            </div>
          </div>
          <div className="flex justify-end"><div className="w-36 text-right space-y-0.5 text-[8px]"><div className="flex justify-between text-slate-400"><span>Sub:</span><span className="font-mono">211.000,00</span></div><div className="flex justify-between text-slate-400"><span>IVA:</span><span className="font-mono">29.540,00</span></div><div className="flex justify-between font-bold text-[9px] pt-0.5 border-t" style={{ borderColor: cor }}><span>TOTAL:</span><span className="font-mono" style={{ color: cor }}>240.540,00 Kz</span></div></div></div>
          <div className="text-[6px] text-center text-slate-400 border-t pt-1" style={{ borderColor: `${cor}15` }}><p>Kima Fatura &middot; AGT 999/AGT/2026 &middot; Hash: 4A7B-9X2Y</p></div>
        </div>
      )}
      {/* ═══ KIMA CLASSICO ═══ */}
      {tmpl === "classico" && (
        <div>
          <div className="h-1.5 w-full" style={{ backgroundColor: cor }} />
          <div className="p-4 space-y-3">
            <div className="flex items-start justify-between border-b pb-2"><div className="flex items-center gap-2">{formData.logoUrl ? <img src={formData.logoUrl} alt="Logo" className="h-8 w-auto max-w-[90px] object-contain" /> : <div className="w-8 h-8 rounded text-white font-extrabold flex items-center justify-center text-sm" style={{ backgroundColor: cor }}>{formData.nomeEmpresa?.charAt(0) || "K"}</div>}<div><p className="font-bold text-sm">{formData.nomeEmpresa || "KIMA FACTURAÇÃO"}</p><p className="text-[9px] text-slate-500">NIF: 5417123456</p></div></div><div className="text-right"><p className="font-bold text-[11px]" style={{ color: cor }}>FACTURA</p><p className="text-[9px] text-slate-500">FT 2026/000001</p></div></div>
            <div className="grid grid-cols-2 gap-3 text-[9px]">
              <div className="rounded border p-2 bg-slate-50"><p className="font-bold text-[7px] uppercase" style={{ color: cor }}>Emissor</p><p className="font-semibold">KIMA HOLDING, LDA</p><p className="text-slate-500">NIF: 5417123456</p></div>
              <div className="rounded border p-2 bg-slate-50"><p className="font-bold text-[7px] uppercase" style={{ color: cor }}>Cliente</p><p className="font-semibold">Empresa Cliente, Lda</p><p className="text-slate-500">NIF: 5000123456</p></div>
            </div>
            <div className="rounded overflow-hidden border border-slate-200">
              <div className="grid grid-cols-[1fr_60px_70px] gap-2 px-2 py-1 text-[7px] font-bold uppercase tracking-wider text-white" style={{ backgroundColor: cor }}><span>Descrição</span><span className="text-right">Qtd</span><span className="text-right">Total</span></div>
              <div className="divide-y divide-slate-100 text-[8px]">
                <div className="grid grid-cols-[1fr_60px_70px] gap-2 px-2 py-1"><span>Consultoria em Faturação Web</span><span className="text-right">1</span><span className="text-right font-mono">114.000,00</span></div>
                <div className="grid grid-cols-[1fr_60px_70px] gap-2 px-2 py-1 bg-slate-50/50"><span>Licenciamento Software</span><span className="text-right">1</span><span className="text-right font-mono">57.000,00</span></div>
                <div className="grid grid-cols-[1fr_60px_70px] gap-2 px-2 py-1"><span>Suporte Técnico Mensal</span><span className="text-right">1</span><span className="text-right font-mono">25.000,00</span></div>
                <div className="grid grid-cols-[1fr_60px_70px] gap-2 px-2 py-1 bg-slate-50/50"><span>Manutenção Preventiva</span><span className="text-right">1</span><span className="text-right font-mono">15.000,00</span></div>
              </div>
            </div>
            <div className="flex justify-end"><div className="w-36 text-right space-y-0.5 text-[8px]"><div className="flex justify-between text-slate-400"><span>Sub:</span><span className="font-mono">211.000,00</span></div><div className="flex justify-between text-slate-400"><span>IVA:</span><span className="font-mono">29.540,00</span></div><div className="flex justify-between font-bold text-[9px] pt-0.5 border-t" style={{ borderColor: cor }}><span>TOTAL:</span><span className="font-mono" style={{ color: cor }}>240.540,00 Kz</span></div></div></div>
            <div className="text-[6px] text-center text-white rounded py-1" style={{ backgroundColor: cor }}><p>Kima Fatura &middot; AGT 999/AGT/2026 &middot; Hash: 4A7B-9X2Y</p></div>
          </div>
        </div>
      )}
      {/* ═══ COMPACTO / RETALHO ═══ */}
      {tmpl === "compacto" && (
        <div>
          <div className="h-1 w-full" style={{ backgroundColor: cor }} />
          <div className="p-3 space-y-2">
            <div className="flex items-center justify-between"><div className="flex items-center gap-1.5">{formData.logoUrl ? <img src={formData.logoUrl} alt="Logo" className="h-5 w-auto max-w-[50px] object-contain" /> : <div className="w-5 h-5 rounded text-white font-black flex items-center justify-center text-[9px]" style={{ backgroundColor: cor }}>{formData.nomeEmpresa?.charAt(0) || "K"}</div>}<span className="font-bold text-xs">{formData.nomeEmpresa || "KIMA"}</span></div><span className="font-bold text-[10px]" style={{ color: cor }}>FACTURA</span></div>
            <div className="h-px w-full" style={{ backgroundColor: `${cor}20` }} />
            <div className="grid grid-cols-2 gap-2 text-[8px]">
              <div><p className="font-bold text-[7px]" style={{ color: cor }}>Emissor</p><p className="font-semibold">KIMA HOLDING, LDA</p><p className="text-slate-400">NIF: 5417123456</p></div>
              <div><p className="font-bold text-[7px]" style={{ color: cor }}>Cliente</p><p className="font-semibold">Empresa Cliente, Lda</p><p className="text-slate-400">NIF: 5000123456</p></div>
            </div>
            <div className="rounded overflow-hidden border border-slate-200">
              <div className="grid grid-cols-[1fr_70px] gap-2 px-1.5 py-1 text-[7px] font-bold text-white" style={{ backgroundColor: cor }}><span>Descrição</span><span className="text-right">Total</span></div>
              <div className="divide-y divide-slate-100 text-[8px]">
                <div className="grid grid-cols-[1fr_70px] gap-2 px-1.5 py-0.5"><span className="truncate">Consultoria em Faturação Web</span><span className="text-right font-mono">114.000,00</span></div>
                <div className="grid grid-cols-[1fr_70px] gap-2 px-1.5 py-0.5 bg-slate-50/50"><span className="truncate">Licenciamento Software</span><span className="text-right font-mono">57.000,00</span></div>
                <div className="grid grid-cols-[1fr_70px] gap-2 px-1.5 py-0.5"><span className="truncate">Suporte Técnico Mensal</span><span className="text-right font-mono">25.000,00</span></div>
                <div className="grid grid-cols-[1fr_70px] gap-2 px-1.5 py-0.5 bg-slate-50/50"><span className="truncate">Manutenção Preventiva</span><span className="text-right font-mono">15.000,00</span></div>
              </div>
            </div>
            <div className="flex justify-end"><div className="w-32 text-right space-y-0.5 text-[8px]"><div className="flex justify-between text-slate-400"><span>Sub:</span><span className="font-mono">211.000,00</span></div><div className="flex justify-between text-slate-400"><span>IVA:</span><span className="font-mono">29.540,00</span></div><div className="flex justify-between font-bold text-[9px] pt-0.5 border-t" style={{ borderColor: cor, color: cor }}><span>TOTAL:</span><span className="font-mono">240.540,00 Kz</span></div></div></div>
            <div className="text-[6px] text-center text-slate-400 border-t pt-1" style={{ borderColor: `${cor}15` }}><p>Kima Fatura &middot; AGT 999/AGT/2026 &middot; Hash: 4A7B-9X2Y</p></div>
          </div>
        </div>
      )}
    </div>
  );
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
  store: { setEmpresa: (empresa: ConfiguracaoEmpresa) => void };
  falhaCarregar: boolean;
}) {
  const [activeTab, setActiveTab] = useState<"dados" | "design">("dados");
  const [downloadingPreview, setDownloadingPreview] = useState(false);
  const [activeIndex, setActiveIndex] = useState(() => {
    const idx = MODELOS_INFO.findIndex((m) => m.id === (empresa?.modeloDocumento || "classico"));
    return idx >= 0 ? idx : 6;
  });
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef<number | null>(null);
  const currentYRef = useRef<number | null>(null);

  // Lock body scroll when preview drawer is open
  useEffect(() => {
    if (previewOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = prev; };
    }
  }, [previewOpen]);

  const [formData, setFormData] = useState({
    nomeEmpresa: empresa?.nomeEmpresa || "",
    nif: empresa?.nif || "",
    morada: empresa?.morada || "",
    telefone: empresa?.telefone || "",
    email: empresa?.email || "",
    logoUrl: empresa?.logoUrl || null,
    modeloDocumento: (empresa?.modeloDocumento || "classico") as ModeloDocumento,
    corPrimaria: empresa?.corPrimaria || "#2563EB",
    contaBancaria: empresa?.contaBancaria || "",
  });

  const [initialData, setInitialData] = useState({
    nomeEmpresa: empresa?.nomeEmpresa || "",
    nif: empresa?.nif || "",
    morada: empresa?.morada || "",
    telefone: empresa?.telefone || "",
    email: empresa?.email || "",
    logoUrl: empresa?.logoUrl || null,
    modeloDocumento: (empresa?.modeloDocumento || "classico") as ModeloDocumento,
    corPrimaria: empresa?.corPrimaria || "#2563EB",
    contaBancaria: empresa?.contaBancaria || "",
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
        modeloDocumento: (empresa.modeloDocumento || "classico") as ModeloDocumento,
        corPrimaria: empresa.corPrimaria || "#2563EB",
        contaBancaria: empresa.contaBancaria || "",
      };
      setFormData(data);
      setInitialData(data);
      const idx = MODELOS_INFO.findIndex((m) => m.id === data.modeloDocumento);
      if (idx >= 0) setActiveIndex(idx);
    }
  }, [empresa]);

  const scrollMobileToCard = useCallback((index: number) => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const card = container.children[index] as HTMLElement | undefined;
    if (card) {
      const scrollLeft = card.offsetLeft - container.clientWidth / 2 + card.clientWidth / 2;
      container.scrollTo({ left: scrollLeft, behavior: "smooth" });
    }
  }, []);

  const navigateCarousel = useCallback((direction: "left" | "right") => {
    setActiveIndex((prev) => {
      const next = direction === "left" ? Math.max(0, prev - 1) : Math.min(MODELOS_INFO.length - 1, prev + 1);
      setFormData((f) => ({ ...f, modeloDocumento: MODELOS_INFO[next].id }));
      scrollMobileToCard(next);
      return next;
    });
  }, [scrollMobileToCard]);

  const goToCard = useCallback((index: number) => {
    setActiveIndex(index);
    setFormData((prev) => ({ ...prev, modeloDocumento: MODELOS_INFO[index].id }));
    scrollMobileToCard(index);
  }, [scrollMobileToCard]);

  const hasChanges =
    formData.nomeEmpresa !== initialData.nomeEmpresa ||
    formData.nif !== initialData.nif ||
    formData.morada !== initialData.morada ||
    formData.telefone !== initialData.telefone ||
    formData.email !== initialData.email ||
    formData.logoUrl !== initialData.logoUrl ||
    formData.modeloDocumento !== initialData.modeloDocumento ||
    formData.corPrimaria !== initialData.corPrimaria ||
    formData.contaBancaria !== initialData.contaBancaria;

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
        modeloDocumento: formData.modeloDocumento,
        corPrimaria: formData.corPrimaria,
        contaBancaria: formData.contaBancaria || undefined,
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

  const handleBaixarExemploPDF = async () => {
    try {
      setDownloadingPreview(true);
      const faturaExemplo: Documento = {
        id: "demo-001",
        tipo: "Fatura",
        serie: "FT",
        numero: "1",
        numeroCompleto: "FT 2026/000001",
        dataEmissao: new Date(),
        dataVencimento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        formaPagamento: "Transferência",
        status: "Pendente",
        subtotal: 150000,
        totalIVA: 21000,
        total: 171000,
        observacoes: "Documento de demonstração de layout e identidade visual gerado para teste.",
        dataAtualizacao: new Date(),
        linhas: [
          {
            id: "l1",
            descricao: "Consultoria em Gestão Financeira e Faturação",
            quantidade: 1,
            preco: 100000,
            taxaIVA: 14,
            total: 100000,
            unidadeMedida: "UN",
          },
          {
            id: "l2",
            descricao: "Licenciamento de Software Kima Fatura (Anual)",
            quantidade: 1,
            preco: 50000,
            taxaIVA: 14,
            total: 50000,
            unidadeMedida: "UN",
          },
        ],
      };

      const empresaMock: ConfiguracaoEmpresa = {
        id: empresa?.id || "demo-empresa",
        nomeEmpresa: formData.nomeEmpresa || "KIMA SOLUÇÕES, LDA",
        nif: formData.nif || "5417082910",
        morada: formData.morada || "Luanda, Angola",
        telefone: formData.telefone || "933335784",
        email: formData.email || "contacto@empresa.co.ao",
        logoUrl: formData.logoUrl || undefined,
        modeloDocumento: formData.modeloDocumento,
        corPrimaria: formData.corPrimaria,
        contaBancaria: formData.contaBancaria || undefined,
        softwareNome: empresa?.softwareNome,
        softwareCertificacaoNumero: empresa?.softwareCertificacaoNumero,
        seriesPorTipo: [],
        diasVencimentoPadrao: 30,
        criadoEm: new Date(),
        ultimaAtualizacao: new Date(),
      };

      const clienteMock = {
        id: "c-demo",
        nome: "EMPRESA CLIENTE EXEMPLO, LDA",
        tipo: "PJ" as const,
        nif: "5000123456",
        morada: "Avenida 4 de Fevereiro, Luanda",
        telefone: "923456789",
        email: "financeiro@cliente.ao",
        dataCriacao: new Date(),
        ultimaAtualizacao: new Date(),
        ativo: true,
      };

      const pdf = await gerarPDFFatura(faturaExemplo, clienteMock, empresaMock);
      pdf.save(`Exemplo_${formData.modeloDocumento}_${formData.corPrimaria.replace("#", "")}.pdf`);
      success("PDF Gerado", "O documento de demonstração foi descarregado com sucesso.");
    } catch (err: unknown) {
      error("Erro", "Não foi possível gerar o PDF de demonstração.");
    } finally {
      setDownloadingPreview(false);
    }
  };

  const tmpl = formData.modeloDocumento;
  const cor = formData.corPrimaria;

  return (
    <div className="w-full px-3 sm:px-6 lg:px-8 py-3 sm:py-4 flex flex-col gap-4 sm:gap-6 animate-slide-up max-w-7xl mx-auto">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/30">
              <Settings size={18} className="text-blue-600 dark:text-blue-400" />
            </div>
            Configurações
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 ml-11.5">
            Identidade corporativa, dados cadastrais e personalização de documentos.
          </p>
        </div>

        <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab("dados")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 ${
              activeTab === "dados"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Building2 size={14} />
            Dados da Empresa
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("design")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 ${
              activeTab === "design"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Palette size={14} />
            Design & Modelos
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 animate-fade-in">
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

      {activeTab === "dados" && (
        <div className="card-kima p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Dados Cadastrais</h3>
              <p className="text-xs text-slate-400">Informações oficiais que constam nos documentos fiscais emitidos</p>
            </div>
            {hasChanges && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 animate-fade-in">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                Alterações pendentes
              </span>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 pb-6 border-b border-slate-100 dark:border-slate-800">
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

          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
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

            <div className="space-y-1.5">
              <label htmlFor="contaBancaria" className="label-kima">
                IBAN
              </label>
              <input
                id="contaBancaria"
                name="contaBancaria"
                value={formData.contaBancaria}
                onChange={handleChange}
                placeholder="Ex: AO06 0044 0000 6768 9012 3457 6"
                className="input-kima h-10 py-2 text-xs"
              />
              <p className="text-[10px] text-slate-400">IBAN da conta bancária da empresa (aparece nos documentos emitidos)</p>
            </div>

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
      )}

      {activeTab === "design" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-8 items-start">
          <div className="lg:col-span-7 space-y-4 sm:space-y-5">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 sm:p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <Layout size={14} className="text-blue-600 dark:text-blue-400" />
                    Modelo do Documento
                    <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-full normal-case">
                      8 estilos
                    </span>
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewOpen(true)}
                  title="Ver Pré-visualização A4"
                  aria-label="Ver Pré-visualização A4"
                  className="flex lg:hidden items-center gap-0.5 px-2.5 h-8 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/25 active:scale-95 transition-all cursor-pointer"
                >
                  <ChevronRight size={14} className="animate-pulse opacity-90 -mr-1" />
                  <Eye size={15} />
                </button>
              </div>

              {/* ── MOBILE: FLAT SCROLL-SNAP CAROUSEL ───────────── */}
              <div className="block sm:hidden">
                <div
                  ref={scrollContainerRef}
                  className="flex gap-3 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-2 px-1 -mx-1"
                  style={{ scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }}
                >
                  {MODELOS_INFO.map((mod, idx) => {
                    const isActive = idx === activeIndex;
                    return (
                      <div
                        key={mod.id}
                        onClick={() => goToCard(idx)}
                        className="snap-center shrink-0 cursor-pointer active:scale-[0.97] transition-transform duration-150"
                      >
                        <div
                          className={`relative w-[130px] rounded-xl overflow-hidden border-[1.5px] transition-all duration-200 flex flex-col ${
                            isActive
                              ? "border-blue-500 shadow-lg ring-1 ring-blue-500/20"
                              : "border-slate-200 dark:border-slate-700 shadow-sm active:shadow-md"
                          }`}
                        >
                          <div className="h-[130px] bg-white dark:bg-slate-900 rounded-t-[10px] overflow-hidden">
                            <MiniDocumentPreview
                              templateId={mod.id}
                              brandColor={formData.corPrimaria}
                              isSelected={isActive}
                              compact
                            />
                          </div>
                          <div className="bg-slate-50 dark:bg-slate-800/80 px-2 py-1.5 border-t border-slate-100 dark:border-slate-700/50">
                            <span className="text-[8px] font-bold uppercase tracking-wider block" style={{ color: cor }}>
                              {mod.tag}
                            </span>
                            <h4 className="text-[10px] font-bold text-slate-900 dark:text-white leading-tight mt-px">
                              {mod.nome}
                            </h4>
                          </div>
                          {isActive && (
                            <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center shadow">
                              <Check size={10} strokeWidth={3} />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <style>{`.scrollbar-hide::-webkit-scrollbar{display:none}`}</style>
              </div>

              {/* ── DESKTOP: 3D COVERFLOW CAROUSEL ─────────────── */}
              <div
                className="hidden sm:block relative w-full overflow-hidden"
                style={{ perspective: "1200px", height: "280px" }}
              >
                <div
                  className="absolute inset-0 flex items-center justify-center"
                  style={{ transformStyle: "preserve-3d" }}
                >
                  {MODELOS_INFO.map((mod, idx) => {
                    const diff = idx - activeIndex;
                    const absDiff = Math.abs(diff);
                    const isActive = diff === 0;

                    const translateX = diff * 130;
                    const translateZ = isActive ? 40 : -50 * Math.min(absDiff, 3);
                    const rotateY = diff < 0 ? 20 : diff > 0 ? -20 : 0;
                    const scale = isActive ? 1.08 : absDiff === 1 ? 0.92 : absDiff === 2 ? 0.8 : 0.7;
                    const opacity = isActive ? 1 : absDiff === 1 ? 0.95 : absDiff === 2 ? 0.8 : 0.65;
                    const zIndex = 20 - absDiff;

                    return (
                      <div
                        key={mod.id}
                        onClick={() => goToCard(idx)}
                        className="absolute cursor-pointer"
                        style={{
                          transform: `translateX(${translateX}px) translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`,
                          opacity,
                          zIndex,
                          transition: "all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
                          transformStyle: "preserve-3d",
                        }}
                      >
                        <div
                          className={`relative w-[160px] rounded-2xl overflow-hidden border-2 transition-shadow duration-300 flex flex-col ${
                            isActive
                              ? "border-blue-500 shadow-2xl ring-2 ring-blue-500/20"
                              : "border-slate-300 dark:border-slate-600 shadow-lg hover:shadow-xl"
                          }`}
                        >
                          <div className="flex-1 bg-white dark:bg-slate-900 rounded-t-[14px] overflow-hidden">
                            <MiniDocumentPreview
                              templateId={mod.id}
                              brandColor={formData.corPrimaria}
                              isSelected={isActive}
                            />
                          </div>
                          <div className="bg-slate-50 dark:bg-slate-800/80 px-3 py-2 border-t border-slate-100 dark:border-slate-700/50">
                            <span className="text-[9px] font-bold uppercase tracking-wider block" style={{ color: cor }}>
                              {mod.tag}
                            </span>
                            <h4 className="text-[11px] font-bold text-slate-900 dark:text-white leading-tight mt-0.5">
                              {mod.nome}
                            </h4>
                            <p className="text-[8px] text-slate-500 dark:text-slate-400 font-medium mt-px">
                              {mod.destaque}
                            </p>
                          </div>
                          {isActive && (
                            <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg">
                              <Check size={12} strokeWidth={3} />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── CONTROLOS INFERIORES ─────────────────────────── */}
              <div className="flex items-center justify-center gap-4 pt-1">
                <button
                  type="button"
                  onClick={() => navigateCarousel("left")}
                  disabled={activeIndex === 0}
                  className="w-9 h-9 rounded-full border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={16} />
                </button>

                <div className="flex items-center gap-1.5">
                  {MODELOS_INFO.map((mod, i) => (
                    <button
                      key={mod.id}
                      type="button"
                      onClick={() => goToCard(i)}
                      className={`rounded-full transition-all duration-300 ${
                        activeIndex === i
                          ? "w-6 h-2 bg-blue-600"
                          : "w-2 h-2 bg-slate-300 dark:bg-slate-600 hover:bg-slate-400 dark:hover:bg-slate-500"
                      }`}
                    />
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => navigateCarousel("right")}
                  disabled={activeIndex === MODELOS_INFO.length - 1}
                  className="w-9 h-9 rounded-full border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 sm:p-4 shadow-sm space-y-3">
              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Palette size={14} className="text-blue-600 dark:text-blue-400" />
                  Cor da Marca
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Aplicada aos títulos, linhas e destaques dos seus documentos AGT.
                </p>
              </div>

              <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                {PRESET_CORES.map((preset) => {
                  const isSelected = formData.corPrimaria.toLowerCase() === preset.hex.toLowerCase();
                  return (
                    <button
                      key={preset.hex}
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, corPrimaria: preset.hex }))}
                      className={`flex items-center gap-1 sm:gap-2 p-1 sm:p-1.5 rounded-lg sm:rounded-xl border text-left transition-all ${
                        isSelected
                          ? "border-blue-600 ring-2 ring-blue-600/10 bg-blue-50/20 dark:bg-blue-950/30 font-semibold"
                          : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                      }`}
                    >
                      <span
                        className="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full shrink-0 shadow-xs ring-1 ring-black/10"
                        style={{ backgroundColor: preset.hex }}
                      />
                      <span className="text-[9px] sm:text-[11px] text-slate-700 dark:text-slate-300 truncate">
                        {preset.nome}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="pt-1.5 sm:pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between gap-2">
                <label className="text-[10px] sm:text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                  Cor Personalizada (HEX):
                </label>
                <div className="flex items-center gap-1 sm:gap-2 bg-slate-50 dark:bg-slate-800/80 p-0.5 sm:p-1 rounded-lg border border-slate-200 dark:border-slate-700">
                  <input
                    type="color"
                    value={formData.corPrimaria}
                    onChange={(e) => setFormData((prev) => ({ ...prev, corPrimaria: e.target.value }))}
                    className="w-6 h-6 sm:w-7 sm:h-7 rounded-md cursor-pointer border-0 p-0 bg-transparent shrink-0"
                    title="Escolher cor"
                  />
                  <input
                    type="text"
                    value={formData.corPrimaria}
                    onChange={(e) => setFormData((prev) => ({ ...prev, corPrimaria: e.target.value }))}
                    placeholder="#2563EB"
                    className="w-20 sm:w-24 text-[11px] sm:text-xs font-mono font-bold bg-transparent outline-none uppercase text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>



            {/* ── Ações desktop (hidden no mobile) ───────────────── */}
            <div className="hidden lg:flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !hasChanges || !!nifError}
                className={`flex-1 h-11 px-4 text-xs font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 ${
                  saving || !hasChanges || !!nifError
                    ? "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-200 dark:border-slate-800 opacity-60"
                    : "bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md cursor-pointer"
                }`}
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    A guardar...
                  </>
                ) : (
                  <>
                    <Check size={14} strokeWidth={3} />
                    Guardar Alterações
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleBaixarExemploPDF}
                disabled={downloadingPreview}
                className="h-11 px-4 text-xs font-bold rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shrink-0 shadow-xs"
              >
                {downloadingPreview ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download size={14} className="text-blue-600 dark:text-blue-400" />
                )}
                Exemplo PDF
              </button>
            </div>
          </div>

          <div className="hidden lg:block lg:col-span-5 sticky top-6 space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Pré-visualização em Tempo Real (A4)
              </span>
              <span className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase">
                {formData.modeloDocumento} &bull; {formData.corPrimaria}
              </span>
            </div>

            <A4Preview tmpl={tmpl} cor={cor} formData={formData} />
          </div>
        </div>
      )}

      {/* ── BOTTOM SHEET PREVIEW (mobile) ───────────── */}
      {previewOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden" onClick={() => setPreviewOpen(false)} aria-hidden />
          <div
            ref={sheetRef}
            className="fixed inset-x-0 bottom-0 z-50 lg:hidden bg-white dark:bg-slate-900 rounded-t-2xl shadow-2xl flex flex-col h-[85vh] max-h-[85vh]"
            onTouchStart={(e) => { startYRef.current = e.touches[0].clientY; }}
            onTouchMove={(e) => {
              currentYRef.current = e.touches[0].clientY;
              if (startYRef.current !== null && currentYRef.current !== null) {
                const delta = currentYRef.current - startYRef.current;
                if (delta > 0 && sheetRef.current) sheetRef.current.style.transform = `translateY(${delta}px)`;
              }
            }}
            onTouchEnd={() => {
              if (startYRef.current !== null && currentYRef.current !== null) {
                const delta = currentYRef.current - startYRef.current;
                if (delta > 80) setPreviewOpen(false);
              }
              if (sheetRef.current) sheetRef.current.style.transform = "";
              startYRef.current = null;
              currentYRef.current = null;
            }}
          >
            <div className="flex justify-center pt-3 pb-2 shrink-0">
              <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
            </div>
            <div className="flex items-center justify-between px-4 pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Pré-visualização A4</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 capitalize">{tmpl} &bull; {cor}</p>
              </div>
              <button type="button" onClick={() => setPreviewOpen(false)} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-2 bg-slate-100 dark:bg-slate-950 flex items-center justify-center">
              <div className="w-full max-w-[500px] origin-center scale-[0.85] sm:scale-[0.95]">
                <A4Preview tmpl={tmpl} cor={cor} formData={formData} />
              </div>
            </div>
            <div className="shrink-0 border-t border-slate-100 dark:border-slate-800 p-3 bg-white dark:bg-slate-900">
              <button type="button" onClick={handleBaixarExemploPDF} disabled={downloadingPreview} className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow">
                {downloadingPreview ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download size={14} />}
                Baixar Modelo PDF
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── BARRA STICKY AÇÕES MOBILE ─────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-30 lg:hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur border-t border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center gap-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <button type="button" onClick={handleSave} disabled={saving || !hasChanges || !!nifError} className={`w-full h-11 px-4 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all ${saving || !hasChanges || !!nifError ? "bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700 opacity-60 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 text-white shadow-md"}`}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check size={14} strokeWidth={3} />}
          Guardar Alterações
        </button>
      </div>
      {activeTab === "design" && <div className="h-16 lg:hidden" aria-hidden />}
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
                modeloDocumento: e.modeloDocumento || "classico",
                corPrimaria: e.corPrimaria || "#2563EB",
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
      <div className="w-full px-4 sm:px-6 lg:px-8 py-4 flex flex-col gap-6 animate-pulse max-w-7xl mx-auto">
        <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded-xl" />
        <div className="w-full h-96 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
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
