export type TipoCliente = "PF" | "PJ";
export type TipoDocumento = "Fatura" | "FaturaRecibo" | "Simplificada" | "NotaCredito" | "NotaDebito" | "Orcamento" | "GuiaRemessa";
export type UnidadeMedida = "UN" | "KG" | "M" | "M2" | "L" | "H" | "DIA" | "MES";
export type TipoArtigo = "Produto" | "Serviço";

export interface Cliente {
  id: string;
  nome: string;
  tipo: TipoCliente; // PF = Pessoa Física, PJ = Pessoa Jurídica
  nif: string;
  morada: string;
  telefone: string;
  email: string;
  responsavel?: string; // Para PJ
  inscricaoSocial?: string; // Para PJ
  dataCriacao: Date;
  ultimaAtualizacao: Date;
  ativo: boolean;
}

export interface Fornecedor {
  id: string;
  nome: string;
  nif: string;
  morada: string;
  telefone: string;
  email: string;
  bancaria?: string; // IBAN ou dados bancários
  dataCriacao: Date;
  ultimaAtualizacao: Date;
  ativo: boolean;
}

export interface Artigo {
  id: string;
  codigo: string;
  descricao: string;
  categoria: string;
  unidadeMedida: UnidadeMedida;
  preco: number; // em AOA
  taxaIVA: 0 | 7 | 14;
  stock: number;
  stockMinimo: number;
  fornecedorId?: string;
  dataCriacao: Date;
  ultimaAtualizacao: Date;
  ativo: boolean;
  tipo?: TipoArtigo; // Produto | Serviço
}

export interface MovimentoStock {
  id: string;
  artigoId: string;
  tipo: "Entrada" | "Saída" | "Ajuste";
  quantidade: number;
  referencia: string; // Número da fatura, guia, etc
  observacoes?: string;
  data: Date;
}

export interface FaturaLinha {
  id: string;
  artigoId?: string;
  descricao: string;
  quantidade: number;
  preco: number; // preço unitário
  taxaIVA: 0 | 7 | 14;
  total: number;
  unidadeMedida: UnidadeMedida;
}

export interface Documento {
  id: string;
  tipo: TipoDocumento;
  serie: string; // A, B, C, etc para diferentes séries
  numero: string; // Número sequencial dentro da série
  numeroCompleto: string; // Serie + Numero (ex: A/000001)
  clienteId?: string;
  fornecedorId?: string;
  dataEmissao: Date;
  dataVencimento: Date;
  formaPagamento: "Numerário" | "Transferência" | "Multicaixa" | "POS" | "Cheque" | "Crédito";
  status: "Pago" | "Pendente" | "Cancelado" | "Processado" | "Rascunho";
  linhas: FaturaLinha[];
  observacoes: string;
  subtotal: number;
  totalIVA: number;
  total: number;
  dataPagamento?: Date;
  
  // Campos de auditoria
  criadoPor?: string;
  atualizadoPor?: string;
  dataAtualizacao: Date;
  
  // Referências
  documentoReferenciado?: string; // Para notas de crédito/débito
  motivo?: string; // Motivo de cancelamento ou nota
}

// Alias para manter compatibilidade
export type Fatura = Documento;

export interface SerieNumeracao {
  serie: string; // A, B, C, etc
  tipoDocumento: TipoDocumento;
  proximoNumero: number;
  ultimoNumeroUtilizado: number;
}

export interface ConfiguracaoEmpresa {
  id: string;
  nomeEmpresa: string;
  nif: string;
  morada: string;
  telefone: string;
  email: string;
  website?: string;
  logoUrl?: string;
  
  // Dados bancários
  contaBancaria?: string;
  banco?: string;
  
  // Configurações de documentos
  seriesPorTipo: SerieNumeracao[];
  diasVencimentoPadrao: number;
  
  // Conformidade fiscal
  inscricaoSocial?: string;
  nifRegional?: string;
  
  ultimaAtualizacao: Date;
  criadoEm: Date;
}

// Tipos para auditoria e logs
export interface LogAuditoria {
  id: string;
  usuario?: string;
  acao: string;
  entidade: string;
  entidadeId: string;
  alteracoesAnteriores?: Record<string, any>;
  alteracoesNovas?: Record<string, any>;
  timestamp: Date;
  endereco?: string;
}
