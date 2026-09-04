import { normalizarErro } from "@/lib/utils";
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { obterDocumentos, criarDocumento, obterSeriePredefinida, obterEmpresa } from "@/db/queries";
import { faturaLinhaSchema } from "@/lib/schemas";
import { gerarHashEncadeado, construirPayloadQR, assinarDocumentoJWS } from "@/lib/crypto-engine";
import {
  obterUltimoHashCadeia,
  garantirChavesAssinatura,
  obterNumeroCertificacaoAGT,
  registarAuditoriaAGT,
} from "@/lib/queries-agt-fase1";
import { usuarioAtual } from "@/lib/session";
import { z } from "zod";
import { requireCompanyId } from "@/lib/company";
import { SOFTWARE_NOME } from "@/lib/constants";

const criarDocumentoSchema = z.object({
  tipo: z.enum(["Fatura", "FaturaRecibo", "NotaCredito", "NotaDebito", "Orcamento", "Recibo"]).default("Fatura"),
  serie: z.string().optional(),
  clienteId: z.string().min(1, "Cliente é obrigatório").optional(),
  fornecedorId: z.string().optional(),
  linhas: z.array(faturaLinhaSchema).min(1, "O documento deve ter pelo menos 1 linha"),
  formaPagamento: z.enum(["Numerário", "Transferência", "Multicaixa", "POS", "Cheque", "Crédito"]).default("Transferência"),
  status: z.enum(["Pago", "Pendente", "Cancelado", "Processado", "Rascunho"]).optional(),
  dataVencimento: z.string().optional(),
  observacoes: z.string().optional().default(""),
  motivoIsencaoIVA: z.string().optional(),
  dataOperacao: z.string().optional(),
  documentoReferenciado: z.string().optional(),
  motivo: z.string().optional(),
  transporteViatura: z.string().optional(),
  transporteMatricula: z.string().optional(),
  transporteMotorista: z.string().optional(),
});

async function proximoNumero(companyId: string, tipo: string, serie: string): Promise<number> {
  const { data: serieRow } = await db
    .from("series_numeracao")
    .select("*")
    .eq("company_id", companyId)
    .eq("serie", serie)
    .eq("tipo_documento", tipo)
    .maybeSingle();

  if (serieRow) {
    const n = serieRow.proximo_numero;
    await db
      .from("series_numeracao")
      .update({ proximo_numero: n + 1, ultimo_numero_utilizado: n })
      .eq("id", serieRow.id);
    return n;
  }

  const documentos = await obterDocumentos(companyId, tipo);
  return documentos.length + 1;
}

export async function GET(request: Request) {
  try {
    const companyId = requireCompanyId(request);
    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get("tipo") || undefined;
    const status = searchParams.get("status");
    const dataInicioStr = searchParams.get("dataInicio");
    const dataFimStr = searchParams.get("dataFim");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    let documentos = await obterDocumentos(companyId, tipo);

    if (status && status !== "Todos") {
      documentos = documentos.filter((d) => d.status.toLowerCase() === status.toLowerCase());
    }
    if (dataInicioStr) {
      const dataInicio = new Date(dataInicioStr);
      documentos = documentos.filter((d) => new Date(d.dataEmissao) >= dataInicio);
    }
    if (dataFimStr) {
      const dataFim = new Date(dataFimStr);
      dataFim.setHours(23, 59, 59, 999);
      documentos = documentos.filter((d) => new Date(d.dataEmissao) <= dataFim);
    }

    documentos.sort(
      (a, b) => new Date(b.dataEmissao).getTime() - new Date(a.dataEmissao).getTime()
    );

    const totalItems = documentos.length;
    const totalPages = Math.ceil(totalItems / limit) || 1;
    const startIndex = (page - 1) * limit;
    const paginated = documentos.slice(startIndex, startIndex + limit);

    return NextResponse.json({
      success: true,
      data: paginated,
      pagination: { totalItems, totalPages, currentPage: page, itemsPerPage: limit },
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: normalizarErro(error).mensagem || "Erro ao obter documentos" },
      { status: normalizarErro(error).status || 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const companyId = requireCompanyId(request);
    const body = await request.json();
    const validatedData = criarDocumentoSchema.parse(body);

    let subtotal = 0;
    let totalIVA = 0;

    const linhas = validatedData.linhas.map((linha) => {
      const valorBase = linha.quantidade * linha.preco;
      const valorIVA = (valorBase * linha.taxaIVA) / 100;
      const totalLinha = valorBase + valorIVA;
      subtotal += valorBase;
      totalIVA += valorIVA;

      return {
        id: crypto.randomUUID(),
        artigoId: linha.artigoId,
        descricao: linha.descricao,
        quantidade: linha.quantidade,
        preco: linha.preco,
        taxaIVA: Number(linha.taxaIVA) as 0 | 7 | 14,
        unidadeMedida: "UN" as const,
        total: totalLinha,
      };
    });

    const total = subtotal + totalIVA;

    // ── FASE 4 · Validações de retificação / documentos complementares ────────
    // T4.1 (Notas de Crédito), T4.2 (Notas de Débito), Recibo — vinculação ao doc. original (F1/R4)
    const TIPOS_RETIFICACAO: string[] = ["NotaCredito", "NotaDebito"];
    const TIPOS_REFERENCIA: string[] = ["NotaCredito", "NotaDebito", "Recibo"];
    const TIPOS_FONTE: string[] = ["Fatura", "FaturaRecibo"];

    if (TIPOS_REFERENCIA.includes(validatedData.tipo)) {
      if (!validatedData.documentoReferenciado) {
        const err = Object.assign(new Error("Fase 4 (T4.1/T4.2): o documento de origem (documentoReferenciado) é obrigatório para Notas de Crédito, Notas de Débito e Recibos"), { status: 400 });
        throw err;
      }

      // Vincular ao documento original emitido na mesma empresa
      const { data: docOrigem, error: errOrigem } = await db
        .from("documentos")
        .select("id, tipo, numero_completo, cliente_id, status, total")
        .eq("company_id", companyId)
        .eq("numero_completo", validatedData.documentoReferenciado)
        .maybeSingle();

      if (errOrigem) throw new Error(errOrigem.message);

      if (!docOrigem) {
        const err = Object.assign(new Error(`Fase 4: o documento de origem "${validatedData.documentoReferenciado}" não existe nesta empresa`), { status: 400 });
        throw err;
      }

      if (docOrigem.status === "Cancelado") {
        const err = Object.assign(new Error(`Fase 4: não é possível referenciar o documento "${validatedData.documentoReferenciado}" porque está cancelado`), { status: 400 });
        throw err;
      }

      if (!TIPOS_FONTE.includes(docOrigem.tipo)) {
        const err = Object.assign(new Error(`Fase 4: o documento "${validatedData.documentoReferenciado}" (${docOrigem.tipo}) não é uma fatura válida para retificação/liquidação`), { status: 400 });
        throw err;
      }

      // Motivo obrigatório nas retificações
      if (TIPOS_RETIFICACAO.includes(validatedData.tipo) && !validatedData.motivo) {
        const err = Object.assign(new Error("Fase 4 (T4.1/T4.2): o motivo da retificação é obrigatório"), { status: 400 });
        throw err;
      }

      // T4.1 — Nota de Crédito não pode ultrapassar o valor da fatura original (regra fiscal)
      if (validatedData.tipo === "NotaCredito" && total > Number(docOrigem.total)) {
        const err = Object.assign(new Error(
          `Fase 4: o valor da Nota de Crédito (${total.toFixed(2)} Kz) não pode exceder o valor da fatura original (${Number(docOrigem.total).toFixed(2)} Kz)`
        ), { status: 400 });
        throw err;
      }

      // O cliente da retificação deve coincidir com o da fatura original
      if (
        TIPOS_RETIFICACAO.includes(validatedData.tipo) &&
        validatedData.clienteId &&
        docOrigem.cliente_id &&
        validatedData.clienteId !== docOrigem.cliente_id
      ) {
        const err = Object.assign(new Error("Fase 4: o cliente da retificação deve ser o mesmo da fatura original"), { status: 400 });
        throw err;
      }
    }

    // Série predefinida para o tipo de documento (Art. 10º b — DP 71/25)
    const seriePredefinida = await obterSeriePredefinida(companyId, validatedData.tipo);
    const serie = validatedData.serie || seriePredefinida.serie;

    const numero = await proximoNumero(companyId, validatedData.tipo, serie);

    const dataEmissao = new Date();
    const dataVencimento = validatedData.dataVencimento
      ? new Date(validatedData.dataVencimento)
      : new Date(dataEmissao.getTime() + 30 * 24 * 60 * 60 * 1000);

    const initialStatus =
      validatedData.status ||
      (validatedData.tipo === "FaturaRecibo" || validatedData.tipo === "Recibo" ? "Pago" : "Pendente");

    const numeroCompleto = `${serie}/${String(numero).padStart(6, "0")}`;

    const cliente = validatedData.clienteId
      ? await db.from("clientes").select("nif").eq("company_id", companyId).eq("id", validatedData.clienteId).maybeSingle()
      : null;
    const fornecedor = validatedData.fornecedorId
      ? await db.from("fornecedores").select("nif").eq("company_id", companyId).eq("id", validatedData.fornecedorId).maybeSingle()
      : null;

    // Isolamento: o cliente/fornecedor tem de pertencer a esta empresa.
    if (validatedData.clienteId && !cliente?.data) {
      const err = Object.assign(new Error('O cliente indicado não pertence a esta empresa'), { status: 400 });
      throw err;
    }
    if (validatedData.fornecedorId && !fornecedor?.data) {
      const err = Object.assign(new Error('O fornecedor indicado não pertence a esta empresa'), { status: 400 });
      throw err;
    }

    // ── FASE 1 · Motor criptográfico AGT (R8/R9/R12/R13/R14/R15) ───────────────
    // Hash encadeado SHA-256 com o hash do documento anterior da mesma série (T1.1)
    const hashAnterior = await obterUltimoHashCadeia(companyId, validatedData.tipo, serie);
    const { hash } = await gerarHashEncadeado(
      {
        tipo: validatedData.tipo,
        serie,
        numero: String(numero),
        numeroCompleto,
        dataEmissao,
        clienteNif: cliente?.data?.nif || undefined,
        fornecedorNif: fornecedor?.data?.nif || undefined,
        subtotal,
        totalIVA,
        total,
        formaPagamento: validatedData.formaPagamento,
        linhas,
      },
      hashAnterior
    );

    // Assinatura digital JWS (T1.2) — chave privada RSA da empresa
    const empresa = await obterEmpresa(companyId);
    let assinaturaJWS: string | null = null;
    let qrPayload: string | null = null;
    try {
      const { privateKeyPEM } = await garantirChavesAssinatura(companyId);
      assinaturaJWS = await assinarDocumentoJWS(
        {
          hash,
          hashAnterior,
          numeroCompleto,
          dataEmissao,
          nifEmpresa: empresa?.nif || '',
          software: empresa?.softwareNome || SOFTWARE_NOME,
        },
        privateKeyPEM
      );
    } catch (e: unknown) {
      console.warn('FASE 1 — assinatura JWS indisponível:', normalizarErro(e).mensagem);
    }

    // QR Code regulamentar (T1.3)
    const numeroCertificacao = await obterNumeroCertificacaoAGT(companyId);
    qrPayload = construirPayloadQR({
      tipo: validatedData.tipo,
      serie,
      numero: String(numero),
      numeroCompleto,
      dataEmissao,
      nifEmpresa: empresa?.nif || '',
      nifCliente: cliente?.data?.nif || undefined,
      subtotal,
      totalIVA,
      total,
      hash,
      numeroCertificacao: numeroCertificacao || undefined,
      formaPagamento: validatedData.formaPagamento,
    });

    // User tracking (T1.5)
    const utilizador = await usuarioAtual();

    const novoDocumento = await criarDocumento(companyId, {
      tipo: validatedData.tipo,
      serie,
      numero: String(numero),
      clienteId: validatedData.clienteId,
      fornecedorId: validatedData.fornecedorId,
      dataEmissao,
      dataOperacao: validatedData.dataOperacao ? new Date(validatedData.dataOperacao) : dataEmissao,
      dataVencimento,
      formaPagamento: validatedData.formaPagamento,
      status: initialStatus,
      observacoes: validatedData.observacoes,
      subtotal,
      totalIVA,
      total,
      hash,
      hashAnterior: hashAnterior ?? undefined,
      assinaturaJWS: assinaturaJWS ?? undefined,
      qrPayload: qrPayload ?? undefined,
      assinadoPor: utilizador?.email ?? undefined,
      certAgtNumero: numeroCertificacao ?? undefined,
      motivoIsencaoIVA: validatedData.motivoIsencaoIVA,
      dataPagamento: initialStatus === "Pago" ? dataEmissao : undefined,
      documentoReferenciado: validatedData.documentoReferenciado,
      motivo: validatedData.motivo,
      transporteViatura: validatedData.transporteViatura,
      transporteMatricula: validatedData.transporteMatricula,
      transporteMotorista: validatedData.transporteMotorista,
      linhas,
    });

    // Auditoria avançada com rastreio do utilizador (T1.5)
    if (!novoDocumento) {
      throw new Error("Documento criado mas não foi possível relê-lo");
    }
    await registarAuditoriaAGT(companyId, 'EMITIR_DOCUMENTO', 'Documento', novoDocumento.id, {
      novas: {
        tipo: validatedData.tipo,
        numeroCompleto,
        hash,
        hashAnterior,
        assinadoPor: utilizador?.email || null,
      },
    });

    // ── FASE 2 · Enfileira o documento para transmissão AGT (T2.2) ───────────
    // O trigger SQL também enfileira; a chamada aqui garante robustez mesmo
    // antes da migração 002 estar activa no ambiente.
    if (novoDocumento && novoDocumento.tipo !== 'Orcamento') {
      try {
        const { enfileirarDocumentoAGT } = await import('@/lib/queries-agt-fase2');
        await enfileirarDocumentoAGT(companyId, novoDocumento.id);
      } catch (e: any) {
        console.warn('FASE 2 — não foi possível enfileirar documento AGT:', e?.message || e);
      }
    }

    return NextResponse.json(
      { success: true, data: novoDocumento, message: "Documento emitido com sucesso" },
      { status: 201 }
    );
  } catch (error: unknown) {
    if (normalizarErro(error).nome === "ZodError") {
      return NextResponse.json(
        { success: false, error: "Dados inválidos", details: normalizarErro(error).detalhes },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: normalizarErro(error).mensagem || "Erro ao emitir documento" },
      { status: 500 }
    );
  }
}