import { normalizarErro } from "@/lib/utils";
import { NextResponse } from "next/server";
import { z } from "zod";
import { registrarPagamento } from "@/db/queries";
import { requireCompanyId } from "@/lib/company";

const registrarPagamentoSchema = z.object({
  invoiceId: z.string().min(1, "ID da fatura é obrigatório"),
  amount: z.number().positive("O valor deve ser maior que zero"),
  paymentDate: z.string().optional(),
  method: z.enum(["Numerário", "Transferência", "Multicaixa", "POS", "Cheque", "Crédito"]).default("Transferência"),
});

export async function POST(request: Request) {
  try {
    const companyId = requireCompanyId(request);
    const body = await request.json();
    const parseResult = registrarPagamentoSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Dados de pagamento inválidos",
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { invoiceId, amount, paymentDate, method } = parseResult.data;
    const dataPagamento = paymentDate ? new Date(paymentDate) : new Date();

    const documento = await registrarPagamento(companyId, invoiceId, dataPagamento, method);

    return NextResponse.json({
      success: true,
      message: "Pagamento registrado com sucesso",
      data: {
        id: documento.id,
        invoiceId,
        amount,
        paymentDate: dataPagamento.toISOString(),
        method,
        status: documento.status,
      },
    });
  } catch (error: unknown) {
    console.error("Erro ao registrar pagamento via API:", error);
    return NextResponse.json(
      {
        success: false,
        error: normalizarErro(error).mensagem || "Erro interno ao processar pagamento",
      },
      { status: normalizarErro(error).status || 500 }
    );
  }
}