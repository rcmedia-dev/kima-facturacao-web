import { NextResponse } from "next/server";
import { z } from "zod";

const registrarPagamentoSchema = z.object({
  invoiceId: z.string().min(1, "ID da fatura é obrigatório"),
  amount: z.number().positive("O valor deve ser maior que zero"),
  paymentDate: z.string().optional(),
  method: z.enum(["Numerário", "Transferência", "Multicaixa", "POS", "Cheque", "Crédito"]).default("Transferência"),
});

export async function POST(request: Request) {
  try {
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

    // Retorna resposta estruturada de confirmação
    return NextResponse.json({
      success: true,
      message: "Pagamento registrado com sucesso",
      data: {
        id: `pay-${Date.now()}`,
        invoiceId,
        amount,
        paymentDate: paymentDate || new Date().toISOString(),
        method,
        status: "Pago",
      },
    });
  } catch (error: any) {
    console.error("Erro ao registrar pagamento via API:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Erro interno ao processar pagamento",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
