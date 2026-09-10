export type TipoCliente = "PF" | "PJ";
export type TipoDocumento =
  | "Fatura"
  | "FaturaRecibo"
  | "NotaCredito"
  | "NotaDebito"
  | "Orcamento"
  | "Recibo";
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

export type FormaPagamento = "Numerário" | "Transferência" | "Multicaixa" | "POS" | "Cheque" | "Crédito";

export interface Despesa {
  id: string;
  descricao: string;
  fornecedorId?: string;
  categoria: string;
  valor: number; // valor base (sem IVA) em AOA
  taxaIVA: 0 | 7 | 14;
  total: number; // valor com IVA em AOA
  data: Date;
  formaPagamento: Exclude<FormaPagamento, "Crédito">;
  estado: "Paga" | "Pendente";
  observacoes?: string;
  dataCriacao: Date;
  ultimaAtualizacao: Date;
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
  cliente?: {
    id: string;
    nome: string;
    nif: string;
    tipo?: TipoCliente;
    morada?: string;
    telefone?: string;
    email?: string;
    ativo?: boolean;
    dataCriacao?: Date | string;
    ultimaAtualizacao?: Date | string;
  };
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
  hash?: string; // Código hash fiscal (Art. 10º j — DP 71/25)
  hashAnterior?: string; // Hash do documento anterior da mesma série (cadeia de imutabilidade — R12/R13)
  assinaturaJWS?: string; // Assinatura digital JWS (RS256) do documento — R9
  qrPayload?: string; // Payload do QR Code regulamentar AGT — R8
  assinadoPor?: string; // Utilizador que emitiu/assinou o documento — R14
  certAgtNumero?: string; // N.º do certificado AGT do software na emissão — R15
  motivoIsencaoIVA?: string; // Motivo da não liquidação do imposto (Art. 10º f)
  dataOperacao?: Date; // Data da operação que deu causa à emissão (Art. 8º)
  
  // Campos de auditoria
  criadoPor?: string;
  atualizadoPor?: string;
  dataAtualizacao: Date;
  
  // Referências
  documentoReferenciado?: string; // Para notas de crédito/débito e recibos (fatura a que se refere)
  motivo?: string; // Motivo de cancelamento ou nota

  // T4.3 · Guias de Remessa / Transporte — dados do transporte de mercadorias
  transporteViatura?: string; // Descrição da viatura
  transporteMatricula?: string; // Matrícula da viatura
  transporteMotorista?: string; // Nome do motorista/transportador
// T2.4 · Comunicação AGT — estado de transmissão do documento (Fase 2)
  statusAGT?: "Pendente" | "Processando" | "Transmitido" | "Rejeitado" | "Erro";
  erroAGT?: string;
  tentativasAGT?: number;
  dataTransmissaoAGT?: Date;
}

// Alias para manter compatibilidade
export type Fatura = Documento;

export interface SerieNumeracao {
  id?: string;
  serie: string; // A, B, C, etc
  tipoDocumento: TipoDocumento;
  proximoNumero: number;
  ultimoNumeroUtilizado: number;
  ano?: number; // Ano económico da série
  predefinida?: boolean; // Série predefinida para o tipo de documento
}

export type ModeloDocumento =
  | "classico"
  | "moderno"
  | "executivo"
  | "compacto"
  | "studio"
  | "nordic"
  | "bold"
  | "grid";

export interface ConfiguracaoEmpresa {
  id: string;
  nomeEmpresa: string;
  nif: string;
  morada: string;
  telefone: string;
  email: string;
  website?: string;
  logoUrl?: string;
  
  // Design & Identidade visual
  modeloDocumento?: ModeloDocumento; // Modelo visual padrão dos documentos
  corPrimaria?: string; // Cor primária da marca (ex: #2563EB)
  
  // Dados bancários
  contaBancaria?: string;
  banco?: string;
  
  // Configurações de documentos
  seriesPorTipo: SerieNumeracao[];
  diasVencimentoPadrao: number;
  
  // Conformidade fiscal
  inscricaoSocial?: string;
  nifRegional?: string;
  softwareNome?: string; // Identificação do software de facturação (Art. 10º j)
  softwareCertificacaoNumero?: string; // Nº de certificação AGT
  
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
  alteracoesAnteriores?: Record<string, unknown>;
  alteracoesNovas?: Record<string, unknown>;
  timestamp: Date;
  endereco?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// SISTEMA DE PERMISSÕES — Kima Facturação
// ══════════════════════════════════════════════════════════════════════════════

/** Permissão individual (código da tabela permissions) */
export type Permission =
  | 'dashboard.view'
  | 'invoices.view'
  | 'invoices.create'
  | 'invoices.update'
  | 'invoices.delete'
  | 'customers.view'
  | 'customers.manage'
  | 'customers.delete'
  | 'suppliers.view'
  | 'suppliers.manage'
  | 'articles.view'
  | 'articles.manage'
  | 'expenses.view'
  | 'expenses.manage'
  | 'reports.view'
  | 'settings.manage'
  | 'agt.manage'
  | 'users.manage';

/** Utilizador do Kima Facturação (tabela public.users) */
export interface Utilizador {
  id: string;
  companyId: string;
  email: string;
  fullName: string | null;
  passwordHash: string | null; // NULL = precisa definir senha
  isOwner: boolean;
  status: 'ativo' | 'inativo' | 'pendente';
  createdAt: Date;
  updatedAt: Date;
}

/** Sessão codificada no cookie kima-session */
export interface Sessao {
  userId: string;
  companyId: string;
  isOwner: boolean;
  email: string;
}

/** Permissões finais de um utilizador */
export interface UserPermissions {
  userId: string;
  companyId: string;
  isOwner: boolean;
  permissions: Permission[];
}
