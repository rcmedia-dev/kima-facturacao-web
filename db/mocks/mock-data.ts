/**
 * Dados fictícios para mock do Supabase — Kima Facturação
 * Baseados no schema real das tabelas acessadas pela aplicação.
 * IDs usam UUIDs fixos para referências cruzadas entre tabelas.
 */

// ─── IDs Fixos (para referências entre tabelas) ─────────────────────────────
export const MOCK_IDS = {
  empresa: '550e8400-e29b-41d4-a716-446655440001',
  user: '550e8400-e29b-41d4-a716-446655440010',
  cliente1: '550e8400-e29b-41d4-a716-446655440020',
  cliente2: '550e8400-e29b-41d4-a716-446655440021',
  cliente3: '550e8400-e29b-41d4-a716-446655440022',
  fornecedor1: '550e8400-e29b-41d4-a716-446655440030',
  fornecedor2: '550e8400-e29b-41d4-a716-446655440031',
  artigo1: '550e8400-e29b-41d4-a716-446655440040',
  artigo2: '550e8400-e29b-41d4-a716-446655440041',
  artigo3: '550e8400-e29b-41d4-a716-446655440042',
  documento1: '550e8400-e29b-41d4-a716-446655440050',
  documento2: '550e8400-e29b-41d4-a716-446655440051',
  documento3: '550e8400-e29b-41d4-a716-446655440052',
  documento4: '550e8400-e29b-41d4-a716-446655440053',
  linha1: '550e8400-e29b-41d4-a716-446655440060',
  linha2: '550e8400-e29b-41d4-a716-446655440061',
  linha3: '550e8400-e29b-41d4-a716-446655440062',
  linha4: '550e8400-e29b-41d4-a716-446655440063',
  serie1: '550e8400-e29b-41d4-a716-446655440070',
  serie2: '550e8400-e29b-41d4-a716-446655440071',
  serie3: '550e8400-e29b-41d4-a716-446655440072',
  despesa1: '550e8400-e29b-41d4-a716-446655440080',
  despesa2: '550e8400-e29b-41d4-a716-446655440081',
  log1: '550e8400-e29b-41d4-a716-446655440090',
  log2: '550e8400-e29b-41d4-a716-446655440091',
  filaAgt1: '550e8400-e29b-41d4-a716-446655440100',
  chaveAgt1: '550e8400-e29b-41d4-a716-446655440110',
  movimento1: '550e8400-e29b-41d4-a716-446655440120',
  // Usuários do Kima Facturação (login próprio)
  userAdmin: '550e8400-e29b-41d4-a716-446655440010', // mesmo ID do user (owner)
  userFunc1: '550e8400-e29b-41d4-a716-446655440130',
  userFunc2: '550e8400-e29b-41d4-a716-446655440131',
  userFunc3: '550e8400-e29b-41d4-a716-446655440132',
} as const;

const now = new Date().toISOString();
const yesterday = new Date(Date.now() - 86400000).toISOString();
const lastWeek = new Date(Date.now() - 7 * 86400000).toISOString();

// ─── Tabela: companies (schema: public) ─────────────────────────────────────
export const MOCK_COMPANIES = [
  {
    id: MOCK_IDS.empresa,
    name: 'Kima Tecnologias, Lda',
    nif: '5417283901',
    company_code: 'KIMA',
    owner_id: MOCK_IDS.user,
    created_by: MOCK_IDS.user,
    created_at: lastWeek,
  },
];

// ─── Tabela: memberships (schema: public) ───────────────────────────────────
export const MOCK_MEMBERSHIPS = [
  {
    id: '550e8400-e29b-41d4-a716-446655440200',
    user_id: MOCK_IDS.user,
    company_id: MOCK_IDS.empresa,
    role: 'owner',
    status: 'ativo',
    created_at: lastWeek,
  },
];

// ─── Tabela: company_modules (schema: public) ──────────────────────────────
export const MOCK_COMPANY_MODULES = [
  {
    id: '550e8400-e29b-41d4-a716-446655440300',
    company_id: MOCK_IDS.empresa,
    module_key: 'faturas',
    status: 'Ativo',
    plan: 'free',
    expires_at: null,
    created_at: lastWeek,
  },
];

// ─── Tabela: subscription_requests (schema: public) ────────────────────────
export const MOCK_SUBSCRIPTION_REQUESTS: any[] = [];

// ─── Tabela: company_settings (schema: kima_facturas) ──────────────────────
export const MOCK_COMPANY_SETTINGS = [
  {
    id: '550e8400-e29b-41d4-a716-446655440400',
    company_id: MOCK_IDS.empresa,
    settings: {
      morada: 'Rua da Missão, 123, Luanda',
      telefone: '+244 923 456 789',
      email: 'geral@kima.ao',
      website: 'https://kima.ao',
      logo_url: null,
      modelo_documento: 'classico',
      cor_primaria: '#2563EB',
      conta_bancaria: 'AO06 0040 0000 1234 5678 9012 3',
      banco: 'BFA',
      inscricao_social: 'INC-12345',
      nif_regional: 'NIF-REG-001',
      software_nome: 'Kima Facturação',
      software_certificacao_numero: 'AGT-KIMA-2024-001',
      dias_vencimento_padrao: 30,
      updated_at: now,
    },
    created_at: lastWeek,
  },
];

// ─── Tabela: clientes (schema: kima_facturas) ──────────────────────────────
export const MOCK_CLIENTES = [
  {
    id: MOCK_IDS.cliente1,
    company_id: MOCK_IDS.empresa,
    nome: 'ANGOLA TELECOM, S.A.',
    tipo: 'Empresa',
    nif: '5410002389',
    morada: 'Rua Amílcar Cabral, 234, Luanda',
    telefone: '+244 923 001 100',
    email: 'compras@angolatelecom.ao',
    responsavel: 'João Silva',
    inscricao_social: 'INC-20001',
    ativo: true,
    created_at: lastWeek,
    updated_at: now,
  },
  {
    id: MOCK_IDS.cliente2,
    company_id: MOCK_IDS.empresa,
    nome: 'Empresa Municipal de Águas (EMAR)',
    tipo: 'Empresa',
    nif: '5410005678',
    morada: 'Av. 4 de Fevereiro, 1000, Luanda',
    telefone: '+244 923 002 200',
    email: 'geral@emar.ao',
    responsavel: 'Maria Santos',
    inscricao_social: 'INC-20002',
    ativo: true,
    created_at: yesterday,
    updated_at: now,
  },
  {
    id: MOCK_IDS.cliente3,
    company_id: MOCK_IDS.empresa,
    nome: 'Pedro Fernandes',
    tipo: 'Individual',
    nif: '5410009999',
    morada: 'Rua Comandante Gika, 45, Luanda',
    telefone: '+244 912 345 678',
    email: 'pedro@email.com',
    responsavel: null,
    inscricao_social: null,
    ativo: true,
    created_at: lastWeek,
    updated_at: lastWeek,
  },
];

// ─── Tabela: fornecedores (schema: kima_facturas) ──────────────────────────
export const MOCK_FORNECEDORES = [
  {
    id: MOCK_IDS.fornecedor1,
    company_id: MOCK_IDS.empresa,
    nome: 'TechSupply Angola',
    nif: '5410003333',
    morada: 'Rua dos Enganos, 55, Luanda',
    telefone: '+244 923 444 555',
    email: 'vendas@techsupply.ao',
    bancaria: 'AO06 0040 0000 9999 8888 7777 6',
    ativo: true,
    created_at: lastWeek,
    updated_at: now,
  },
  {
    id: MOCK_IDS.fornecedor2,
    company_id: MOCK_IDS.empresa,
    nome: 'Distribuidora Geral, Lda',
    nif: '5410004444',
    morada: 'Zona Industrial, Cacuaco',
    telefone: '+244 923 555 666',
    email: 'geral@distgeral.ao',
    bancaria: null,
    ativo: true,
    created_at: yesterday,
    updated_at: yesterday,
  },
];

// ─── Tabela: artigos (schema: kima_facturas) ───────────────────────────────
export const MOCK_ARTIGOS = [
  {
    id: MOCK_IDS.artigo1,
    company_id: MOCK_IDS.empresa,
    codigo: 'PROD-001',
    descricao: 'Computador Portátil Dell Inspiron 15',
    categoria: 'Tecnologia',
    tipo: 'Produto',
    unidade_medida: 'UN',
    preco: '245000.00',
    taxa_iva: 14,
    stock: '15',
    stock_minimo: '5',
    fornecedor_id: MOCK_IDS.fornecedor1,
    ativo: true,
    created_at: lastWeek,
    updated_at: now,
  },
  {
    id: MOCK_IDS.artigo2,
    company_id: MOCK_IDS.empresa,
    codigo: 'PROD-002',
    descricao: 'Monitor LED 24" Full HD',
    categoria: 'Tecnologia',
    tipo: 'Produto',
    unidade_medida: 'UN',
    preco: '85000.00',
    taxa_iva: 14,
    stock: '30',
    stock_minimo: '10',
    fornecedor_id: MOCK_IDS.fornecedor1,
    ativo: true,
    created_at: lastWeek,
    updated_at: lastWeek,
  },
  {
    id: MOCK_IDS.artigo3,
    company_id: MOCK_IDS.empresa,
    codigo: 'SERV-001',
    descricao: 'Instalação e Configuração de Rede',
    categoria: 'Serviços',
    tipo: 'Serviço',
    unidade_medida: 'UN',
    preco: '35000.00',
    taxa_iva: 14,
    stock: '0',
    stock_minimo: '0',
    fornecedor_id: null,
    ativo: true,
    created_at: yesterday,
    updated_at: yesterday,
  },
];

// ─── Tabela: series_numeracao (schema: kima_facturas) ──────────────────────
export const MOCK_SERIES = [
  {
    id: MOCK_IDS.serie1,
    company_id: MOCK_IDS.empresa,
    serie: 'A',
    tipo_documento: 'Fatura',
    proximo_numero: 5,
    ultimo_numero_utilizado: 4,
    ano: new Date().getFullYear(),
    predefinida: true,
    created_at: lastWeek,
  },
  {
    id: MOCK_IDS.serie2,
    company_id: MOCK_IDS.empresa,
    serie: 'A',
    tipo_documento: 'FaturaRecibo',
    proximo_numero: 2,
    ultimo_numero_utilizado: 1,
    ano: new Date().getFullYear(),
    predefinida: true,
    created_at: lastWeek,
  },
  {
    id: MOCK_IDS.serie3,
    company_id: MOCK_IDS.empresa,
    serie: 'B',
    tipo_documento: 'Fatura',
    proximo_numero: 1,
    ultimo_numero_utilizado: 0,
    ano: new Date().getFullYear(),
    predefinida: false,
    created_at: yesterday,
  },
];

// ─── Tabela: documento_linhas (schema: kima_facturas) ──────────────────────
export const MOCK_DOCUMENTO_LINHAS = [
  {
    id: MOCK_IDS.linha1,
    company_id: MOCK_IDS.empresa,
    documento_id: MOCK_IDS.documento1,
    artigo_id: MOCK_IDS.artigo1,
    descricao: 'Computador Portátil Dell Inspiron 15',
    quantidade: '2',
    preco: '245000.00',
    taxa_iva: 14,
    unidade_medida: 'UN',
    total: '559600.00',
  },
  {
    id: MOCK_IDS.linha2,
    company_id: MOCK_IDS.empresa,
    documento_id: MOCK_IDS.documento1,
    artigo_id: MOCK_IDS.artigo2,
    descricao: 'Monitor LED 24" Full HD',
    quantidade: '2',
    preco: '85000.00',
    taxa_iva: 14,
    unidade_medida: 'UN',
    total: '193800.00',
  },
  {
    id: MOCK_IDS.linha3,
    company_id: MOCK_IDS.empresa,
    documento_id: MOCK_IDS.documento2,
    artigo_id: MOCK_IDS.artigo3,
    descricao: 'Instalação e Configuração de Rede',
    quantidade: '1',
    preco: '35000.00',
    taxa_iva: 14,
    unidade_medida: 'UN',
    total: '39900.00',
  },
  {
    id: MOCK_IDS.linha4,
    company_id: MOCK_IDS.empresa,
    documento_id: MOCK_IDS.documento3,
    artigo_id: MOCK_IDS.artigo1,
    descricao: 'Computador Portátil Dell Inspiron 15',
    quantidade: '1',
    preco: '245000.00',
    taxa_iva: 14,
    unidade_medida: 'UN',
    total: '279300.00',
  },
];

// ─── Tabela: documentos (schema: kima_facturas) ────────────────────────────
export const MOCK_DOCUMENTOS = [
  {
    id: MOCK_IDS.documento1,
    company_id: MOCK_IDS.empresa,
    tipo: 'Fatura',
    serie: 'A',
    numero: 1,
    numero_completo: 'A/000001',
    cliente_id: MOCK_IDS.cliente1,
    fornecedor_id: null,
    data_emissao: lastWeek,
    data_vencimento: new Date(Date.now() + 30 * 86400000).toISOString(),
    forma_pagamento: 'Transferência',
    status: 'Pago',
    observacoes: null,
    subtotal: '660000.00',
    total_iva: '92400.00',
    total: '752400.00',
    data_pagamento: yesterday,
    documento_referenciado: null,
    motivo: null,
    hash: 'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef12345678',
    hash_anterior: null,
    assinatura_jws: 'eyJhbGciOiJSUzI1NiJ9.mock.signature.1',
    qr_payload: '{"tipo":"Fatura","serie":"A","numero":"1","nifEmpresa":"5417283901"}',
    assinado_por: 'admin@kima.ao',
    cert_agt_numero: 'AGT-KIMA-2024-001',
    motivo_isencao_iva: null,
    data_operacao: lastWeek,
    created_by: MOCK_IDS.user,
    updated_by: MOCK_IDS.user,
    created_at: lastWeek,
    updated_at: now,
    transporte_viatura: null,
    transporte_matricula: null,
    transporte_motorista: null,
    status_agt: 'Transmitido',
    erro_agt: null,
    tentativas_agt: 1,
    data_transmissao_agt: yesterday,
  },
  {
    id: MOCK_IDS.documento2,
    company_id: MOCK_IDS.empresa,
    tipo: 'FaturaRecibo',
    serie: 'A',
    numero: 1,
    numero_completo: 'A/000001',
    cliente_id: MOCK_IDS.cliente2,
    fornecedor_id: null,
    data_emissao: yesterday,
    data_vencimento: new Date(Date.now() + 30 * 86400000).toISOString(),
    forma_pagamento: 'Numerário',
    status: 'Pago',
    observacoes: 'Pagamento na entrega',
    subtotal: '35000.00',
    total_iva: '4900.00',
    total: '39900.00',
    data_pagamento: yesterday,
    documento_referenciado: null,
    motivo: null,
    hash: 'b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef1234567890',
    hash_anterior: 'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef12345678',
    assinatura_jws: 'eyJhbGciOiJSUzI1NiJ9.mock.signature.2',
    qr_payload: '{"tipo":"FaturaRecibo","serie":"A","numero":"1","nifEmpresa":"5417283901"}',
    assinado_por: 'admin@kima.ao',
    cert_agt_numero: 'AGT-KIMA-2024-001',
    motivo_isencao_iva: null,
    data_operacao: yesterday,
    created_by: MOCK_IDS.user,
    updated_by: MOCK_IDS.user,
    created_at: yesterday,
    updated_at: now,
    transporte_viatura: null,
    transporte_matricula: null,
    transporte_motorista: null,
    status_agt: 'Transmitido',
    erro_agt: null,
    tentativas_agt: 1,
    data_transmissao_agt: yesterday,
  },
  {
    id: MOCK_IDS.documento3,
    company_id: MOCK_IDS.empresa,
    tipo: 'Fatura',
    serie: 'A',
    numero: 2,
    numero_completo: 'A/000002',
    cliente_id: MOCK_IDS.cliente3,
    fornecedor_id: null,
    data_emissao: now,
    data_vencimento: new Date(Date.now() + 30 * 86400000).toISOString(),
    forma_pagamento: 'Multicaixa',
    status: 'Pendente',
    observacoes: null,
    subtotal: '245000.00',
    total_iva: '34300.00',
    total: '279300.00',
    data_pagamento: null,
    documento_referenciado: null,
    motivo: null,
    hash: 'c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456789012',
    hash_anterior: 'b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef1234567890',
    assinatura_jws: null,
    qr_payload: null,
    assinado_por: null,
    cert_agt_numero: null,
    motivo_isencao_iva: null,
    data_operacao: now,
    created_by: MOCK_IDS.user,
    updated_by: null,
    created_at: now,
    updated_at: now,
    transporte_viatura: null,
    transporte_matricula: null,
    transporte_motorista: null,
    status_agt: 'Pendente',
    erro_agt: null,
    tentativas_agt: 0,
    data_transmissao_agt: null,
  },
  {
    id: MOCK_IDS.documento4,
    company_id: MOCK_IDS.empresa,
    tipo: 'NotaCredito',
    serie: 'A',
    numero: 1,
    numero_completo: 'A/000001',
    cliente_id: MOCK_IDS.cliente1,
    fornecedor_id: null,
    data_emissao: now,
    data_vencimento: now,
    forma_pagamento: 'Transferência',
    status: 'Pago',
    observacoes: 'Devolução parcial',
    subtotal: '245000.00',
    total_iva: '34300.00',
    total: '279300.00',
    data_pagamento: now,
    documento_referenciado: 'A/000001',
    motivo: 'Mercadoria devolvida por defeito',
    hash: null,
    hash_anterior: 'c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456789012',
    assinatura_jws: null,
    qr_payload: null,
    assinado_por: null,
    cert_agt_numero: null,
    motivo_isencao_iva: null,
    data_operacao: now,
    created_by: MOCK_IDS.user,
    updated_by: null,
    created_at: now,
    updated_at: now,
    transporte_viatura: null,
    transporte_matricula: null,
    transporte_motorista: null,
    status_agt: null,
    erro_agt: null,
    tentativas_agt: 0,
    data_transmissao_agt: null,
  },
];

// ─── Tabela: despesas (schema: kima_facturas) ──────────────────────────────
export const MOCK_DESPESAS = [
  {
    id: MOCK_IDS.despesa1,
    company_id: MOCK_IDS.empresa,
    descricao: 'Aluguel do escritório - Setembro',
    fornecedor_id: MOCK_IDS.fornecedor2,
    categoria: 'Fixos',
    valor: '150000.00',
    taxa_iva: 14,
    total: '171000.00',
    data: lastWeek,
    forma_pagamento: 'Transferência',
    estado: 'Pago',
    observacoes: null,
    created_at: lastWeek,
    updated_at: lastWeek,
  },
  {
    id: MOCK_IDS.despesa2,
    company_id: MOCK_IDS.empresa,
    descricao: 'Material de escritório',
    fornecedor_id: null,
    categoria: 'Material',
    valor: '25000.00',
    taxa_iva: 14,
    total: '28500.00',
    data: yesterday,
    forma_pagamento: 'Numerário',
    estado: 'Pago',
    observacoes: 'Papel, canetas, pastas',
    created_at: yesterday,
    updated_at: yesterday,
  },
];

// ─── Tabela: logs_auditoria (schema: kima_facturas) ────────────────────────
export const MOCK_LOGS_AUDITORIA = [
  {
    id: MOCK_IDS.log1,
    company_id: MOCK_IDS.empresa,
    user_id: MOCK_IDS.user,
    acao: 'CRIAR',
    entidade: 'Documento',
    entidade_id: MOCK_IDS.documento1,
    alteracoes_anteriores: null,
    alteracoes_novas: { tipo: 'Fatura', numero_completo: 'A/000001' },
    created_at: lastWeek,
    endereco: null,
  },
  {
    id: MOCK_IDS.log2,
    company_id: MOCK_IDS.empresa,
    user_id: MOCK_IDS.user,
    acao: 'EMITIR_DOCUMENTO',
    entidade: 'Documento',
    entidade_id: MOCK_IDS.documento1,
    alteracoes_anteriores: null,
    alteracoes_novas: { hash: 'a1b2c3...', hashAnterior: null, assinadoPor: 'admin@kima.ao' },
    created_at: lastWeek,
    endereco: null,
  },
];

// ─── Tabela: chaves_assinatura_agt (schema: kima_facturas) ─────────────────
export const MOCK_CHAVES_ASSINATURA = [
  {
    id: MOCK_IDS.chaveAgt1,
    company_id: MOCK_IDS.empresa,
    private_key_pem: '-----BEGIN RSA PRIVATE KEY-----\nMOCK_KEY_FOR_DEV\n-----END RSA PRIVATE KEY-----',
    public_key_pem: '-----BEGIN PUBLIC KEY-----\nMOCK_PUB_KEY_FOR_DEV\n-----END PUBLIC KEY-----',
    alg: 'RS256',
    created_at: lastWeek,
  },
];

// ─── Tabela: fila_envio_agt (schema: kima_facturas) ────────────────────────
export const MOCK_FILA_ENVIO_AGT = [
  {
    id: MOCK_IDS.filaAgt1,
    company_id: MOCK_IDS.empresa,
    documento_id: MOCK_IDS.documento3,
    estado: 'Pendente',
    tentativas: 0,
    max_tentativas: 5,
    proxima_tentativa: now,
    ultimo_erro: null,
    processado_em: null,
    fim_de_linha: false,
    criado_em: now,
    atualizado_em: now,
  },
];

// ─── Tabela: movimentos_stock (schema: kima_facturas) ──────────────────────
export const MOCK_MOVIMENTOS_STOCK = [
  {
    id: MOCK_IDS.movimento1,
    company_id: MOCK_IDS.empresa,
    artigo_id: MOCK_IDS.artigo1,
    tipo: 'Entrada',
    quantidade: '20',
    referencia: 'Encomenda #001',
    observacoes: 'Stock inicial',
    data: lastWeek,
    created_at: lastWeek,
  },
];

// ─── Auth mock user (Supabase Auth — manter para compatibilidade) ─────────────
export const MOCK_USER = {
  id: MOCK_IDS.user,
  email: 'admin@kima.ao',
  user_metadata: {
    full_name: 'Administrador Kima',
  },
  created_at: lastWeek,
};

// ══════════════════════════════════════════════════════════════════════════════
// SISTEMA DE PERMISSÕES — Kima Facturação
// Login próprio: email + senha
// ══════════════════════════════════════════════════════════════════════════════

// ─── Tabela: users (login próprio) ──────────────────────────────────────────
// Formato mock: password_hash = "mock:${senha}"
// Para login use: senha = email do utilizador
export const MOCK_USERS = [
  // Admin (owner da empresa) — senha: admin@kima.ao
  {
    id: MOCK_IDS.userAdmin,
    company_id: MOCK_IDS.empresa,
    email: 'admin@kima.ao',
    full_name: 'Administrador Kima',
    password_hash: 'mock:admin@kima.ao',
    is_owner: true,
    status: 'ativo',
    created_at: lastWeek,
    updated_at: now,
  },
  // Funcionário 1 — Bruno (com permissões) — senha: bruno@kima.ao
  {
    id: MOCK_IDS.userFunc1,
    company_id: MOCK_IDS.empresa,
    email: 'bruno@kima.ao',
    full_name: 'Bruno Silva',
    password_hash: 'mock:bruno@kima.ao',
    is_owner: false,
    status: 'ativo',
    created_at: yesterday,
    updated_at: now,
  },
  // Funcionário 2 — Maria (com permissões) — senha: maria@kima.ao
  {
    id: MOCK_IDS.userFunc2,
    company_id: MOCK_IDS.empresa,
    email: 'maria@kima.ao',
    full_name: 'Maria Santos',
    password_hash: 'mock:maria@kima.ao',
    is_owner: false,
    status: 'ativo',
    created_at: yesterday,
    updated_at: now,
  },
  // Funcionário 3 — Rita (sem senha — primeiro acesso)
  {
    id: MOCK_IDS.userFunc3,
    company_id: MOCK_IDS.empresa,
    email: 'rita@kima.ao',
    full_name: 'Rita Costa',
    password_hash: null, // NULL = precisa definir senha no primeiro acesso
    is_owner: false,
    status: 'pendente',
    created_at: now,
    updated_at: now,
  },
];

// ─── Tabela: permissions (catálogo fixo — 18 permissões) ────────────────────
export const MOCK_PERMISSIONS = [
  { code: 'dashboard.view', description: 'Ver dashboard' },
  { code: 'invoices.view', description: 'Ver facturas' },
  { code: 'invoices.create', description: 'Criar facturas' },
  { code: 'invoices.update', description: 'Editar facturas' },
  { code: 'invoices.delete', description: 'Apagar facturas' },
  { code: 'customers.view', description: 'Ver clientes' },
  { code: 'customers.manage', description: 'Criar/editar clientes' },
  { code: 'customers.delete', description: 'Apagar clientes' },
  { code: 'suppliers.view', description: 'Ver fornecedores' },
  { code: 'suppliers.manage', description: 'Gerir fornecedores' },
  { code: 'articles.view', description: 'Ver artigos' },
  { code: 'articles.manage', description: 'Gerir artigos' },
  { code: 'expenses.view', description: 'Ver despesas' },
  { code: 'expenses.manage', description: 'Gerir despesas' },
  { code: 'reports.view', description: 'Ver relatórios' },
  { code: 'settings.manage', description: 'Gerir configurações' },
  { code: 'agt.manage', description: 'Gerir AGT' },
  { code: 'users.manage', description: 'Gerir utilizadores' },
];

// ─── Tabela: user_permissions (permissões atribuídas) ────────────────────────
// Admin NÃO precisa de registos (tem todas automaticamente)
// Apenas funcionários têm permissões atribuídas
export const MOCK_USER_PERMISSIONS = [
  // Bruno: facturas + clientes
  { user_id: MOCK_IDS.userFunc1, company_id: MOCK_IDS.empresa, permission_code: 'dashboard.view' },
  { user_id: MOCK_IDS.userFunc1, company_id: MOCK_IDS.empresa, permission_code: 'invoices.view' },
  { user_id: MOCK_IDS.userFunc1, company_id: MOCK_IDS.empresa, permission_code: 'invoices.create' },
  { user_id: MOCK_IDS.userFunc1, company_id: MOCK_IDS.empresa, permission_code: 'customers.view' },
  // Maria: facturas + relatórios
  { user_id: MOCK_IDS.userFunc2, company_id: MOCK_IDS.empresa, permission_code: 'dashboard.view' },
  { user_id: MOCK_IDS.userFunc2, company_id: MOCK_IDS.empresa, permission_code: 'invoices.view' },
  { user_id: MOCK_IDS.userFunc2, company_id: MOCK_IDS.empresa, permission_code: 'reports.view' },
  // Rita: sem permissões (pendente)
];

// ─── Índice rápido por company_id ──────────────────────────────────────────
export function filterByCompany<T extends { company_id?: string }>(
  rows: T[],
  companyId: string
): T[] {
  return rows.filter((r) => r.company_id === companyId);
}
