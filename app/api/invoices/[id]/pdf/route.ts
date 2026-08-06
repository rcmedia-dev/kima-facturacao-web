import { NextResponse } from "next/server";
import { obterDocumentoPorId, obterEmpresa } from "@/db/queries";
import { gerarPDFFatura } from "@/lib/pdf-generator";
import { Documento, Cliente, ConfiguracaoEmpresa } from "@/lib/types";

const EMPRESA_ID_DEFAULT = "e1000000-0000-0000-0000-000000000001";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const dbFatura = await obterDocumentoPorId(EMPRESA_ID_DEFAULT, id);

    if (!dbFatura) {
      return NextResponse.json(
        { success: false, error: "Fatura não encontrada" },
        { status: 404 }
      );
    }

    const dbEmpresa = await obterEmpresa(EMPRESA_ID_DEFAULT);

    // Mapear para tipos do aplicativo
    const fatura: Documento = {
      id: dbFatura.id,
      tipo: dbFatura.tipo as any,
      serie: dbFatura.serie,
      numero: String(dbFatura.numero),
      numeroCompleto: dbFatura.numeroCompleto,
      clienteId: dbFatura.clienteId || undefined,
      dataEmissao: dbFatura.dataEmissao,
      dataVencimento: dbFatura.dataVencimento,
      formaPagamento: dbFatura.formaPagamento as any,
      status: dbFatura.status as any,
      linhas: dbFatura.linhas.map((l) => ({
        id: l.id,
        artigoId: l.artigoId || undefined,
        descricao: l.descricao,
        quantidade: Number(l.quantidade),
        preco: Number(l.preco),
        taxaIVA: Number(l.taxaIVA) as 0 | 7 | 14,
        total: Number(l.total),
        unidadeMedida: (l.unidadeMedida || "UN") as any,
      })),
      observacoes: dbFatura.observacoes || "",
      subtotal: Number(dbFatura.subtotal),
      totalIVA: Number(dbFatura.totalIVA),
      total: Number(dbFatura.total),
      dataPagamento: dbFatura.dataPagamento || undefined,
      dataAtualizacao: dbFatura.atualizadoEm || new Date(),
    };

    const cliente: Cliente | null = dbFatura.cliente
      ? {
          id: dbFatura.cliente.id,
          nome: dbFatura.cliente.nome,
          tipo: (dbFatura.cliente.tipo || "PJ") as any,
          nif: dbFatura.cliente.nif,
          morada: dbFatura.cliente.morada || "",
          telefone: dbFatura.cliente.telefone || "",
          email: dbFatura.cliente.email || "",
          dataCriacao: dbFatura.cliente.criadoEm,
          ultimaAtualizacao: dbFatura.cliente.atualizadoEm,
          ativo: dbFatura.cliente.ativo,
        }
      : null;

    const empresa: ConfiguracaoEmpresa | null = dbEmpresa
      ? {
          id: dbEmpresa.id,
          nomeEmpresa: dbEmpresa.nome,
          nif: dbEmpresa.nif,
          morada: dbEmpresa.morada,
          telefone: dbEmpresa.telefone,
          email: dbEmpresa.email,
          logoUrl: dbEmpresa.logoUrl || undefined,
          seriesPorTipo: [],
          diasVencimentoPadrao: 30,
          ultimaAtualizacao: dbEmpresa.atualizadoEm,
          criadoEm: dbEmpresa.criadoEm,
        }
      : null;

    // Gerar o documento PDF via jsPDF
    const pdfDoc = gerarPDFFatura(fatura, cliente, empresa);
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
