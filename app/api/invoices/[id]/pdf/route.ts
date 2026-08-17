import { NextResponse } from "next/server";
import { obterDocumentoPorId, obterEmpresa } from "@/db/queries";
import { gerarPDFFatura } from "@/lib/pdf-generator";
import { Documento, Cliente, ConfiguracaoEmpresa } from "@/lib/types";
import { requireCompanyId } from "@/lib/company";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const companyId = requireCompanyId(request);
    const { id } = await params;
    const dbFatura = await obterDocumentoPorId(companyId, id);

    if (!dbFatura) {
      return NextResponse.json(
        { success: false, error: "Fatura não encontrada" },
        { status: 404 }
      );
    }

    const dbEmpresa = await obterEmpresa(companyId);

    const fatura: Documento = {
      id: dbFatura.id,
      tipo: dbFatura.tipo,
      serie: dbFatura.serie,
      numero: String(dbFatura.numero),
      numeroCompleto: dbFatura.numeroCompleto,
      clienteId: dbFatura.clienteId || undefined,
      fornecedorId: dbFatura.fornecedorId || undefined,
      dataEmissao: dbFatura.dataEmissao,
      dataVencimento: dbFatura.dataVencimento,
      formaPagamento: dbFatura.formaPagamento,
      status: dbFatura.status,
      linhas: dbFatura.linhas.map((l) => ({
        id: l.id,
        artigoId: l.artigoId || undefined,
        descricao: l.descricao,
        quantidade: Number(l.quantidade),
        preco: Number(l.preco),
        taxaIVA: Number(l.taxaIVA) as 0 | 7 | 14,
        total: Number(l.total),
        unidadeMedida: l.unidadeMedida || "UN",
      })),
      observacoes: dbFatura.observacoes || "",
      subtotal: Number(dbFatura.subtotal),
      totalIVA: Number(dbFatura.totalIVA),
      total: Number(dbFatura.total),
      dataPagamento: dbFatura.dataPagamento || undefined,
      hash: dbFatura.hash || undefined,
      motivoIsencaoIVA: dbFatura.motivoIsencaoIVA || undefined,
      dataOperacao: dbFatura.dataOperacao || undefined,
      dataAtualizacao: dbFatura.dataAtualizacao,
    };

    const cliente: Cliente | null = dbFatura.cliente
      ? {
          id: dbFatura.cliente.id,
          nome: dbFatura.cliente.nome,
          tipo: dbFatura.cliente.tipo,
          nif: dbFatura.cliente.nif,
          morada: dbFatura.cliente.morada || "",
          telefone: dbFatura.cliente.telefone || "",
          email: dbFatura.cliente.email || "",
          dataCriacao: dbFatura.cliente.dataCriacao,
          ultimaAtualizacao: dbFatura.cliente.ultimaAtualizacao,
          ativo: dbFatura.cliente.ativo,
        }
      : null;

    const empresa: ConfiguracaoEmpresa | null = dbEmpresa
      ? {
          id: dbEmpresa.id,
          nomeEmpresa: dbEmpresa.nomeEmpresa,
          nif: dbEmpresa.nif,
          morada: dbEmpresa.morada,
          telefone: dbEmpresa.telefone,
          email: dbEmpresa.email,
          logoUrl: dbEmpresa.logoUrl || undefined,
          contaBancaria: dbEmpresa.contaBancaria,
          banco: dbEmpresa.banco,
          inscricaoSocial: dbEmpresa.inscricaoSocial,
          nifRegional: dbEmpresa.nifRegional,
          softwareNome: dbEmpresa.softwareNome,
          softwareCertificacaoNumero: dbEmpresa.softwareCertificacaoNumero,
          seriesPorTipo: dbEmpresa.seriesPorTipo || [],
          diasVencimentoPadrao: dbEmpresa.diasVencimentoPadrao || 30,
          ultimaAtualizacao: dbEmpresa.ultimaAtualizacao,
          criadoEm: dbEmpresa.criadoEm,
        }
      : null;

    const pdfDoc = await gerarPDFFatura(fatura, cliente, empresa);
    const pdfBuffer = pdfDoc.output("arraybuffer");

    const fileName = `Fatura_${fatura.numeroCompleto || fatura.numero}.pdf`.replace(/[\/\\?%*:|"<>]/g, "_");

    return new Response(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao gerar PDF da fatura" },
      { status: 500 }
    );
  }
}