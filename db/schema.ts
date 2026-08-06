import {
  pgTable,
  text,
  varchar,
  decimal,
  integer,
  timestamp,
  boolean,
  pgEnum,
  uuid,
  jsonb,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const tipoClienteEnum = pgEnum('tipo_cliente', ['PF', 'PJ']);
export const tipoDocumentoEnum = pgEnum('tipo_documento', [
  'Fatura',
  'FaturaRecibo',
  'Simplificada',
  'NotaCredito',
  'NotaDebito',
  'Orcamento',
  'GuiaRemessa',
]);
export const statusDocumentoEnum = pgEnum('status_documento', [
  'Pago',
  'Pendente',
  'Cancelado',
  'Processado',
  'Rascunho',
]);
export const formaPagamentoEnum = pgEnum('forma_pagamento', [
  'Numerário',
  'Transferência',
  'Multicaixa',
  'POS',
  'Cheque',
  'Crédito',
]);
export const roleEnum = pgEnum('role', ['admin', 'gerente', 'operador', 'visualizador']);
export const unidadeMedidaEnum = pgEnum('unidade_medida', [
  'UN',
  'KG',
  'M',
  'M2',
  'L',
  'H',
  'DIA',
  'MES',
]);
export const tipoMovimentoStockEnum = pgEnum('tipo_movimento_stock', [
  'Entrada',
  'Saída',
  'Ajuste',
]);

// Empresas
export const empresas = pgTable('empresas', {
  id: uuid('id').primaryKey().defaultRandom(),
  nome: varchar('nome', { length: 255 }).notNull(),
  nif: varchar('nif', { length: 20 }).notNull().unique(),
  morada: text('morada'),
  telefone: varchar('telefone', { length: 20 }),
  email: varchar('email', { length: 255 }),
  website: varchar('website', { length: 255 }),
  logoUrl: text('logo_url'),
  contaBancaria: varchar('conta_bancaria', { length: 50 }),
  banco: varchar('banco', { length: 100 }),
  inscricaoSocial: varchar('inscricao_social', { length: 50 }),
  nifRegional: varchar('nif_regional', { length: 20 }),
  criadoEm: timestamp('criado_em', { withTimezone: true }).defaultNow(),
  atualizadoEm: timestamp('atualizado_em', { withTimezone: true }).defaultNow(),
});

// Usuários
export const usuarios = pgTable('usuarios', {
  id: uuid('id').primaryKey().defaultRandom(),
  empresaId: uuid('empresa_id')
    .notNull()
    .references(() => empresas.id, { onDelete: 'cascade' }),
  email: varchar('email', { length: 255 }).notNull().unique(),
  senha: text('senha').notNull(), // Hash
  nome: varchar('nome', { length: 255 }).notNull(),
  role: roleEnum('role').default('operador'),
  ativo: boolean('ativo').default(true),
  criadoEm: timestamp('criado_em', { withTimezone: true }).defaultNow(),
  atualizadoEm: timestamp('atualizado_em', { withTimezone: true }).defaultNow(),
});

// Clientes
export const clientes = pgTable('clientes', {
  id: uuid('id').primaryKey().defaultRandom(),
  empresaId: uuid('empresa_id')
    .notNull()
    .references(() => empresas.id, { onDelete: 'cascade' }),
  nome: varchar('nome', { length: 255 }).notNull(),
  tipo: tipoClienteEnum('tipo').default('PF'),
  nif: varchar('nif', { length: 20 }).notNull(),
  morada: text('morada'),
  telefone: varchar('telefone', { length: 20 }),
  email: varchar('email', { length: 255 }),
  responsavel: varchar('responsavel', { length: 255 }),
  inscricaoSocial: varchar('inscricao_social', { length: 50 }),
  ativo: boolean('ativo').default(true),
  criadoEm: timestamp('criado_em', { withTimezone: true }).defaultNow(),
  atualizadoEm: timestamp('atualizado_em', { withTimezone: true }).defaultNow(),
});

// Fornecedores
export const fornecedores = pgTable('fornecedores', {
  id: uuid('id').primaryKey().defaultRandom(),
  empresaId: uuid('empresa_id')
    .notNull()
    .references(() => empresas.id, { onDelete: 'cascade' }),
  nome: varchar('nome', { length: 255 }).notNull(),
  nif: varchar('nif', { length: 20 }).notNull(),
  morada: text('morada'),
  telefone: varchar('telefone', { length: 20 }),
  email: varchar('email', { length: 255 }),
  bancaria: varchar('bancaria', { length: 50 }),
  ativo: boolean('ativo').default(true),
  criadoEm: timestamp('criado_em', { withTimezone: true }).defaultNow(),
  atualizadoEm: timestamp('atualizado_em', { withTimezone: true }).defaultNow(),
});

// Artigos/Produtos
export const artigos = pgTable('artigos', {
  id: uuid('id').primaryKey().defaultRandom(),
  empresaId: uuid('empresa_id')
    .notNull()
    .references(() => empresas.id, { onDelete: 'cascade' }),
  codigo: varchar('codigo', { length: 50 }).notNull(),
  descricao: text('descricao').notNull(),
  categoria: varchar('categoria', { length: 100 }),
  unidadeMedida: unidadeMedidaEnum('unidade_medida').default('UN'),
  preco: decimal('preco', { precision: 10, scale: 2 }).notNull(),
  taxaIVA: integer('taxa_iva').notNull().default(14),
  stock: integer('stock').default(0),
  stockMinimo: integer('stock_minimo').default(0),
  fornecedorId: uuid('fornecedor_id').references(() => fornecedores.id),
  ativo: boolean('ativo').default(true),
  criadoEm: timestamp('criado_em', { withTimezone: true }).defaultNow(),
  atualizadoEm: timestamp('atualizado_em', { withTimezone: true }).defaultNow(),
});

// Documentos (Faturas, Recibos, etc)
export const documentos = pgTable('documentos', {
  id: uuid('id').primaryKey().defaultRandom(),
  empresaId: uuid('empresa_id')
    .notNull()
    .references(() => empresas.id, { onDelete: 'cascade' }),
  tipo: tipoDocumentoEnum('tipo').notNull(),
  serie: varchar('serie', { length: 5 }).default('A'),
  numero: integer('numero').notNull(),
  numeroCompleto: varchar('numero_completo', { length: 20 }).notNull(),
  clienteId: uuid('cliente_id').references(() => clientes.id),
  fornecedorId: uuid('fornecedor_id').references(() => fornecedores.id),
  dataEmissao: timestamp('data_emissao', { withTimezone: true }).notNull(),
  dataVencimento: timestamp('data_vencimento', { withTimezone: true }).notNull(),
  formaPagamento: formaPagamentoEnum('forma_pagamento').default('Transferência'),
  status: statusDocumentoEnum('status').default('Rascunho'),
  observacoes: text('observacoes'),
  subtotal: decimal('subtotal', { precision: 12, scale: 2 }).notNull(),
  totalIVA: decimal('total_iva', { precision: 12, scale: 2 }).notNull(),
  total: decimal('total', { precision: 12, scale: 2 }).notNull(),
  dataPagamento: timestamp('data_pagamento', { withTimezone: true }),
  criadoPor: uuid('criado_por').references(() => usuarios.id),
  atualizadoPor: uuid('atualizado_por').references(() => usuarios.id),
  dataAtualizacao: timestamp('data_atualizacao', { withTimezone: true }).defaultNow(),
  documentoReferenciado: uuid('documento_referenciado'),
  motivo: text('motivo'),
  criadoEm: timestamp('criado_em', { withTimezone: true }).defaultNow(),
});

// Linhas de Documentos
export const documentoLinhas = pgTable(
  'documento_linhas',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    documentoId: uuid('documento_id')
      .notNull()
      .references(() => documentos.id, { onDelete: 'cascade' }),
    artigoId: uuid('artigo_id').references(() => artigos.id),
    descricao: text('descricao').notNull(),
    quantidade: decimal('quantidade', { precision: 10, scale: 3 }).notNull(),
    preco: decimal('preco', { precision: 10, scale: 2 }).notNull(),
    taxaIVA: integer('taxa_iva').notNull(),
    unidadeMedida: unidadeMedidaEnum('unidade_medida').default('UN'),
    total: decimal('total', { precision: 12, scale: 2 }).notNull(),
  }
);

// Movimentos de Stock
export const movimentosStock = pgTable('movimentos_stock', {
  id: uuid('id').primaryKey().defaultRandom(),
  empresaId: uuid('empresa_id')
    .notNull()
    .references(() => empresas.id, { onDelete: 'cascade' }),
  artigoId: uuid('artigo_id')
    .notNull()
    .references(() => artigos.id, { onDelete: 'cascade' }),
  tipo: tipoMovimentoStockEnum('tipo').notNull(),
  quantidade: decimal('quantidade', { precision: 10, scale: 3 }).notNull(),
  referencia: varchar('referencia', { length: 50 }).notNull(),
  observacoes: text('observacoes'),
  data: timestamp('data', { withTimezone: true }).defaultNow(),
  criadoEm: timestamp('criado_em', { withTimezone: true }).defaultNow(),
});

// Logs de Auditoria
export const logsAuditoria = pgTable('logs_auditoria', {
  id: uuid('id').primaryKey().defaultRandom(),
  empresaId: uuid('empresa_id')
    .notNull()
    .references(() => empresas.id, { onDelete: 'cascade' }),
  usuario: varchar('usuario', { length: 255 }),
  acao: varchar('acao', { length: 50 }).notNull(),
  entidade: varchar('entidade', { length: 100 }).notNull(),
  entidadeId: varchar('entidade_id', { length: 255 }).notNull(),
  alteracoesAnteriores: jsonb('alteracoes_anteriores'),
  alteracoesNovas: jsonb('alteracoes_novas'),
  timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow(),
  endereco: varchar('endereco', { length: 45 }),
});

// Series de Numeração
export const seriesNumeracao = pgTable('series_numeracao', {
  id: uuid('id').primaryKey().defaultRandom(),
  empresaId: uuid('empresa_id')
    .notNull()
    .references(() => empresas.id, { onDelete: 'cascade' }),
  serie: varchar('serie', { length: 5 }).notNull(),
  tipoDocumento: tipoDocumentoEnum('tipo_documento').notNull(),
  proximoNumero: integer('proximo_numero').default(1),
  ultimoNumeroUtilizado: integer('ultimo_numero_utilizado').default(0),
});

// Relations
export const usuariosRelations = relations(usuarios, ({ one }) => ({
  empresa: one(empresas),
}));

export const clientesRelations = relations(clientes, ({ one, many }) => ({
  empresa: one(empresas),
  documentos: many(documentos),
}));

export const fornecedoresRelations = relations(fornecedores, ({ one, many }) => ({
  empresa: one(empresas),
  artigos: many(artigos),
}));

export const artrigosRelations = relations(artigos, ({ one, many }) => ({
  empresa: one(empresas),
  fornecedor: one(fornecedores),
  movimentos: many(movimentosStock),
  linhas: many(documentoLinhas),
}));

export const documentosRelations = relations(documentos, ({ one, many }) => ({
  empresa: one(empresas),
  cliente: one(clientes),
  linhas: many(documentoLinhas),
  criadoBy: one(usuarios, { fields: [documentos.criadoPor], references: [usuarios.id] }),
  atualizadoBy: one(usuarios, { fields: [documentos.atualizadoPor], references: [usuarios.id] }),
}));

export const documentoLinhasRelations = relations(documentoLinhas, ({ one }) => ({
  documento: one(documentos),
  artigo: one(artigos),
}));

export const movimentosStockRelations = relations(movimentosStock, ({ one }) => ({
  empresa: one(empresas),
  artigo: one(artigos),
}));
