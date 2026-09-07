import { z } from "zod";
import { validarNIFAngolano } from "./utils";

export const clienteSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório").min(3, "Nome deve ter pelo menos 3 caracteres"),
  nif: z.string().min(1, "NIF é obrigatório").refine((val) => validarNIFAngolano(val).valido, {
    message: "NIF Angolano inválido. Deve possuir 10 dígitos (PJ/PF) ou 14 caracteres de BI (ex: 005432198LA042)",
  }),
  morada: z.string().min(1, "Morada é obrigatória"),
  telefone: z.string().min(1, "Telefone é obrigatório"),
  email: z.string().email("Email inválido"),
  tipo: z.enum(["PF", "PJ"]).default("PJ"),
  ativo: z.boolean().default(true),
  responsavel: z.string().optional(),
  inscricaoSocial: z.string().optional(),
});

// Schema interno do form (antes de transform) - taxaIVA como string para o <select> HTML
export const artigoSchemaInput = z.object({
  tipo: z.enum(["Produto", "Serviço"]).default("Produto"),
  codigo: z.string().optional(),
  descricao: z.string().min(1, "Descrição é obrigatória"),
  preco: z.number().min(0, "Preço deve ser maior que 0"),
  taxaIVA: z.enum(["0", "7", "14"]),
  categoria: z.string().default("Geral"),
  unidadeMedida: z.enum(["UN", "KG", "M", "M2", "L", "H", "DIA", "MES"]).default("UN"),
  stock: z.number().min(0).default(0),
  stockMinimo: z.number().min(0).default(0),
  ativo: z.boolean().default(true),
});

// Schema com transformação para persistência
export const artigoSchema = artigoSchemaInput.transform((data) => ({
  ...data,
  taxaIVA: parseInt(data.taxaIVA) as 0 | 7 | 14,
}));

export const fornecedorSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório").min(3, "Nome deve ter pelo menos 3 caracteres"),
  nif: z.string().min(1, "NIF é obrigatório").refine((val) => validarNIFAngolano(val).valido, {
    message: "NIF Angolano inválido. Deve possuir 10 dígitos (PJ/PF) ou 14 caracteres de BI (ex: 005432198LA042)",
  }),
  morada: z.string().min(1, "Morada é obrigatória"),
  telefone: z.string().min(1, "Telefone é obrigatório"),
  email: z.string().email("Email inválido"),
  bancaria: z.string().optional(),
  ativo: z.boolean().default(true),
});

export const despesaSchemaInput = z.object({
  descricao: z.string().min(1, "Descrição é obrigatória").min(3, "Descrição deve ter pelo menos 3 caracteres"),
  fornecedorId: z.string().optional(),
  categoria: z.string().min(1, "Categoria é obrigatória").default("Geral"),
  valor: z.number().min(0, "Valor deve ser maior ou igual a 0"),
  taxaIVA: z.enum(["0", "7", "14"]).default("0"),
  data: z.string().min(1, "Data é obrigatória"),
  formaPagamento: z.enum(["Numerário", "Transferência", "Multicaixa", "POS", "Cheque"]).default("Numerário"),
  estado: z.enum(["Paga", "Pendente"]).default("Paga"),
  observacoes: z.string().optional(),
});

export const despesaSchema = despesaSchemaInput.transform((data) => ({
  ...data,
  taxaIVA: parseInt(data.taxaIVA) as 0 | 7 | 14,
  data: new Date(data.data),
}));

export const faturaLinhaSchema = z.object({
  artigoId: z.string().min(1).optional(),
  quantidade: z.number().min(1, "Quantidade deve ser maior que 0"),
  descricao: z.string(),
  preco: z.number(),
  taxaIVA: z.enum(["0", "7", "14"]).transform(v => parseInt(v) as 0 | 7 | 14),
});

export const empresaSchema = z.object({
  nomeEmpresa: z.string().min(1, "Nome da empresa é obrigatório"),
  nif: z.string().min(1, "NIF é obrigatório").refine((val) => validarNIFAngolano(val).valido, {
    message: "NIF Angolano inválido (deve possuir 10 dígitos numéricos)",
  }),
  morada: z.string().min(1, "Morada é obrigatória"),
  telefone: z.string().min(1, "Telefone é obrigatório"),
  email: z.string().email("Email inválido"),
  logoUrl: z.string().max(3_000_000, "Logotipo demasiado grande — use uma imagem até 1024px (≤1MB base64).").optional().nullable(),
  softwareNome: z.string().optional().nullable(),
  softwareCertificacaoNumero: z.string().optional().nullable(),
});

export const loginSchema = z.object({
  email: z.string().min(1, "Email é obrigatório").email("Email inválido"),
  password: z.string().min(6, "A palavra-passe deve ter pelo menos 6 caracteres"),
});

export const signupSchema = z
  .object({
    nome: z.string().min(1, "Nome é obrigatório").min(3, "O nome deve ter pelo menos 3 caracteres"),
    email: z.string().min(1, "Email é obrigatório").email("Email inválido"),
    password: z.string().min(6, "A palavra-passe deve ter pelo menos 6 caracteres"),
    confirmPassword: z.string().min(1, "Confirme a palavra-passe"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As palavras-passe não coincidem",
    path: ["confirmPassword"],
  });

export type LoginFormData = z.input<typeof loginSchema>;
export type SignupFormData = z.input<typeof signupSchema>;

export type ClienteFormData = z.output<typeof clienteSchema>;
export type ClienteFormInput = z.input<typeof clienteSchema>;
// Tipo de INPUT do form (antes do transform)
export type ArtigoFormInput = z.input<typeof artigoSchema>;
// Tipo de OUTPUT do form (após o transform, para o store)
export type ArtigoFormData = z.output<typeof artigoSchema>;
export type EmpresaFormData = z.infer<typeof empresaSchema>;
export type FornecedorFormInput = z.input<typeof fornecedorSchema>;
export type FornecedorFormData = z.output<typeof fornecedorSchema>;
export type DespesaFormInput = z.input<typeof despesaSchema>;
export type DespesaFormData = z.output<typeof despesaSchema>;
