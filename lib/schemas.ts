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
  codigo: z.string().min(1, "Código é obrigatório"),
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

export const faturaLinhaSchema = z.object({
  artigoId: z.string().min(1, "Artigo é obrigatório"),
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
  logoUrl: z.string().optional().nullable(),
});

export type ClienteFormData = z.output<typeof clienteSchema>;
export type ClienteFormInput = z.input<typeof clienteSchema>;
// Tipo de INPUT do form (antes do transform)
export type ArtigoFormInput = z.input<typeof artigoSchema>;
// Tipo de OUTPUT do form (após o transform, para o store)
export type ArtigoFormData = z.output<typeof artigoSchema>;
export type EmpresaFormData = z.infer<typeof empresaSchema>;
