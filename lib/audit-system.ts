'use client';

import { LogAuditoria } from './types';

/**
 * Sistema de Auditoria e Conformidade
 * Rastreia todas as ações no sistema para conformidade fiscal e segurança
 */

export type AcaoAuditoria =
  | 'CRIAR'
  | 'ATUALIZAR'
  | 'DELETAR'
  | 'VISUALIZAR'
  | 'PAGAMENTO'
  | 'CANCELAMENTO'
  | 'EXPORTACAO'
  | 'LOGIN'
  | 'LOGOUT'
  | 'ALTERACAO_PERMISSAO';

export interface UsuarioAutenticado {
  id: string;
  email: string;
  nome: string;
  role: 'admin' | 'gerente' | 'operador' | 'visualizador';
  datacriacao?: Date;
}

export interface ConfiguracaoAuditoria {
  armazenarDetalhes: boolean;
  armazenarIpAddress: boolean;
  retencaoDias: number; // Dias para manter logs
  avisarAlteracoesCriticas: boolean;
}

/**
 * Cria entrada de auditoria
 */
export function criarLogAuditoria(
  acao: AcaoAuditoria,
  entidade: string,
  entidadeId: string,
  usuario?: UsuarioAutenticado,
  alteracoesAnteriores?: Record<string, unknown>,
  alteracoesNovas?: Record<string, unknown>,
  endereco?: string
): LogAuditoria {
  return {
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    usuario: usuario?.email,
    acao,
    entidade,
    entidadeId,
    alteracoesAnteriores,
    alteracoesNovas,
    timestamp: new Date(),
    endereco,
  };
}

/**
 * Valida ação baseada em role do usuário
 */
export function validarPermissao(
  usuario: UsuarioAutenticado,
  acao: AcaoAuditoria,
  entidade: string
): { permitido: boolean; motivo?: string } {
  // Admin tem acesso total
  if (usuario.role === 'admin') {
    return { permitido: true };
  }

  const permissoes: Record<string, Record<string, string[]>> = {
    gerente: {
      Documento: ['CRIAR', 'ATUALIZAR', 'PAGAMENTO', 'VISUALIZAR'],
      Cliente: ['CRIAR', 'ATUALIZAR', 'VISUALIZAR'],
      Artigo: ['VISUALIZAR'],
      Fornecedor: ['VISUALIZAR'],
    },
    operador: {
      Documento: ['CRIAR', 'VISUALIZAR'],
      Cliente: ['VISUALIZAR'],
      Artigo: ['VISUALIZAR'],
      Fornecedor: ['VISUALIZAR'],
    },
    visualizador: {
      Documento: ['VISUALIZAR'],
      Cliente: ['VISUALIZAR'],
      Artigo: ['VISUALIZAR'],
      Fornecedor: ['VISUALIZAR'],
    },
  };

  const acoesPermitidas = permissoes[usuario.role]?.[entidade] || [];
  const permitido = acoesPermitidas.includes(acao);

  return {
    permitido,
    motivo: permitido
      ? undefined
      : `Utilizador com role '${usuario.role}' não tem permissão para '${acao}' em '${entidade}'`,
  };
}

/**
 * Limpa logs antigos
 */
export function limparLogsAntigos(
  logs: LogAuditoria[],
  retencaoDias: number
): LogAuditoria[] {
  const agora = new Date();
  const limite = new Date(agora.getTime() - retencaoDias * 24 * 60 * 60 * 1000);

  return logs.filter((log) => new Date(log.timestamp) > limite);
}

/**
 * Gera relatório de auditoria
 */
export function gerarRelatorioAuditoria(
  logs: LogAuditoria[],
  filtros?: {
    usuario?: string;
    entidade?: string;
    acao?: AcaoAuditoria;
    dataInicio?: Date;
    dataFim?: Date;
  }
): {
  total: number;
  porAcao: Record<string, number>;
  porEntidade: Record<string, number>;
  porUsuario: Record<string, number>;
  alteracoesDetectadas: LogAuditoria[];
} {
  let filtrados = logs;

  if (filtros) {
    if (filtros.usuario) {
      filtrados = filtrados.filter((l) => l.usuario === filtros.usuario);
    }
    if (filtros.entidade) {
      filtrados = filtrados.filter((l) => l.entidade === filtros.entidade);
    }
    if (filtros.acao) {
      filtrados = filtrados.filter((l) => l.acao === filtros.acao);
    }
    if (filtros.dataInicio && filtros.dataFim) {
      filtrados = filtrados.filter(
        (l) =>
          l.timestamp >= filtros.dataInicio! &&
          l.timestamp <= filtros.dataFim!
      );
    }
  }

  // Contar por ação
  const porAcao: Record<string, number> = {};
  filtrados.forEach((l) => {
    porAcao[l.acao] = (porAcao[l.acao] || 0) + 1;
  });

  // Contar por entidade
  const porEntidade: Record<string, number> = {};
  filtrados.forEach((l) => {
    porEntidade[l.entidade] = (porEntidade[l.entidade] || 0) + 1;
  });

  // Contar por usuário
  const porUsuario: Record<string, number> = {};
  filtrados.forEach((l) => {
    if (l.usuario) {
      porUsuario[l.usuario] = (porUsuario[l.usuario] || 0) + 1;
    }
  });

  // Detectar alterações suspeitas (Ex: deleções)
  const alteracoesDetectadas = filtrados.filter(
    (l) =>
      l.acao === 'DELETAR' ||
      l.acao === 'CANCELAMENTO' ||
      (l.acao === 'ATUALIZAR' &&
        l.alteracoesNovas?.status === 'Cancelado')
  );

  return {
    total: filtrados.length,
    porAcao,
    porEntidade,
    porUsuario,
    alteracoesDetectadas,
  };
}

/**
 * Detecta atividades suspeitas
 */
export function detectarAtividadeSuspeita(
  logs: LogAuditoria[],
  horasUltimas: number = 24
): {
  tentativasMultiplasAcesso: boolean;
  deletoesEmMassa: boolean;
  cancelamentosDuvidosos: boolean;
  alertas: string[];
} {
  const agora = new Date();
  const limite = new Date(agora.getTime() - horasUltimas * 60 * 60 * 1000);
  const logsRecentes = logs.filter((l) => l.timestamp >= limite);

  const alertas: string[] = [];

  // Verificar tentativas múltiplas de acesso falhadas
  const loginPorUsuario: Record<string, number> = {};
  logsRecentes
    .filter((l) => l.acao === 'LOGIN')
    .forEach((l) => {
      if (l.usuario) {
        loginPorUsuario[l.usuario] = (loginPorUsuario[l.usuario] || 0) + 1;
      }
    });

  let tentativasMultiplasAcesso = false;
  Object.entries(loginPorUsuario).forEach(([usuario, qtd]) => {
    if (qtd > 5) {
      alertas.push(
        `Múltiplas tentativas de login para ${usuario} (${qtd} vezes em ${horasUltimas}h)`
      );
      tentativasMultiplasAcesso = true;
    }
  });

  // Verificar deleções em massa
  const delets = logsRecentes.filter((l) => l.acao === 'DELETAR');
  if (delets.length > 10) {
    alertas.push(
      `Deleções em massa detectadas: ${delets.length} deleções em ${horasUltimas}h`
    );
  }
  const deletoesEmMassa = delets.length > 10;

  // Verificar cancelamentos duvidosos
  const cancelamentos = logsRecentes.filter(
    (l) =>
      l.acao === 'CANCELAMENTO' ||
      (l.acao === 'ATUALIZAR' && l.alteracoesNovas?.status === 'Cancelado')
  );
  const cancelamentosPorUsuario: Record<string, number> = {};
  cancelamentos.forEach((l) => {
    if (l.usuario) {
      cancelamentosPorUsuario[l.usuario] =
        (cancelamentosPorUsuario[l.usuario] || 0) + 1;
    }
  });

  let cancelamentosDuvidosos = false;
  Object.entries(cancelamentosPorUsuario).forEach(([usuario, qtd]) => {
    if (qtd > 5) {
      alertas.push(
        `Cancelamentos suspeitos por ${usuario}: ${qtd} cancelamentos em ${horasUltimas}h`
      );
      cancelamentosDuvidosos = true;
    }
  });

  return {
    tentativasMultiplasAcesso,
    deletoesEmMassa,
    cancelamentosDuvidosos,
    alertas,
  };
}

/**
 * Exporta logs para análise externa
 */
export function exportarLogsAuditoria(
  logs: LogAuditoria[],
  formato: 'json' | 'csv' = 'json'
): string {
  if (formato === 'json') {
    return JSON.stringify(logs, null, 2);
  }

  // CSV
  const headers = [
    'ID',
    'Usuário',
    'Ação',
    'Entidade',
    'Entidade ID',
    'Timestamp',
    'Alterações Anteriores',
    'Alterações Novas',
  ];
  const rows = logs.map((l) => [
    l.id,
    l.usuario || '-',
    l.acao,
    l.entidade,
    l.entidadeId,
    l.timestamp.toISOString(),
    JSON.stringify(l.alteracoesAnteriores || {}),
    JSON.stringify(l.alteracoesNovas || {}),
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((r) => r.map((v) => `"${v}"`).join(',')),
  ].join('\n');

  return csvContent;
}
