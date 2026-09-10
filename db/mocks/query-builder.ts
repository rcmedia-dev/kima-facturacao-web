/**
 * Query Builder mock — simula a API do Supabase PostgREST.
 * Encadeia filtros (.eq, .neq, .in, .like, .gte, .lte, .not, .or),
 * ordenação (.order), paginação (.range, .limit) e retorno (.single, .maybeSingle).
 *
 * Suporta: select, insert, update, delete, upsert
 */

type MockRow = Record<string, any>;

function calcularTotaisPorLinhasMock(linhas: any[]): { subtotal: number; totalIVA: number; total: number } {
  const subtotal = linhas.reduce((acc, linha) => {
    const quantidade = Number(linha.quantidade ?? linha.quantidade ?? 0);
    const preco = Number(linha.preco ?? 0);
    const valorBase = quantidade * preco;
    return acc + valorBase;
  }, 0);

  const total = linhas.reduce((acc, linha) => {
    const quantidade = Number(linha.quantidade ?? 0);
    const preco = Number(linha.preco ?? 0);
    const taxaIVA = Number(linha.taxa_iva ?? linha.taxaIVA ?? 0);
    const valorBase = quantidade * preco;
    const valorComIVA = valorBase + (valorBase * taxaIVA) / 100;
    return acc + valorComIVA;
  }, 0);

  return {
    subtotal: Number(subtotal.toFixed(2)),
    totalIVA: Number((total - subtotal).toFixed(2)),
    total: Number(total.toFixed(2)),
  };
}

function recalcularTotaisDocumentoMock(documentoId: string): void {
  const documentos = MockDB.getTable('documentos');
  const linhas = MockDB.getTable('documento_linhas');
  if (!documentos || !linhas) return;

  const docIndex = documentos.findIndex((row) => row.id === documentoId);
  if (docIndex < 0) return;

  const linhasDoc = linhas.filter((linha) => linha.documento_id === documentoId);
  if (linhasDoc.length === 0) return;

  const totais = calcularTotaisPorLinhasMock(linhasDoc);
  documentos[docIndex] = {
    ...documentos[docIndex],
    subtotal: String(totais.subtotal),
    total_iva: String(totais.totalIVA),
    total: String(totais.total),
  };
}

interface QueryResult<T = any> {
  data: T | null;
  error: { message: string; code?: string } | null;
  count?: number | null;
}

type FilterFn = (row: MockRow) => boolean;

export class MockQueryBuilder {
  private _table: string;
  private _schema: string;
  private _operation: 'select' | 'insert' | 'update' | 'delete' | 'upsert' | 'rpc' = 'select';
  private _filters: FilterFn[] = [];
  private _orderBy: { column: string; ascending: boolean }[] = [];
  private _limitValue: number | null = null;
  private _rangeFrom: number | null = null;
  private _rangeTo: number | null = null;
  private _selectColumns: string | null = null;
  private _insertData: any = null;
  private _updateData: any = null;
  private _upsertData: any = null;
  private _onConflict: string | null = null;
  private _returnSingle: 'single' | 'maybeSingle' | null = null;
  private _countOptions: { count: 'exact' | 'planned' | 'estimated'; head?: boolean } | null = null;
  private _headOnly: boolean = false;
  private _resolvedData: MockRow[] = [];
  private _resolvedCount: number | null = null;

  constructor(table: string, schema: string = 'kima_facturas') {
    this._table = table;
    this._schema = schema;
  }

  // ─── SELECT ──────────────────────────────────────────────────────────────
  select(columns?: string, opts?: { count?: 'exact' | 'planned' | 'estimated'; head?: boolean }): MockQueryBuilder {
    this._operation = 'select';
    this._selectColumns = columns || '*';
    if (opts?.count) {
      this._countOptions = { count: opts.count, head: opts.head };
    }
    if (opts?.head) {
      this._headOnly = true;
    }
    return this;
  }

  // ─── INSERT ──────────────────────────────────────────────────────────────
  insert(data: MockRow | MockRow[]): MockQueryBuilder {
    this._operation = 'insert';
    this._insertData = Array.isArray(data) ? data : [data];
    return this;
  }

  // ─── UPDATE ──────────────────────────────────────────────────────────────
  update(data: MockRow): MockQueryBuilder {
    this._operation = 'update';
    this._updateData = data;
    return this;
  }

  // ─── DELETE ──────────────────────────────────────────────────────────────
  delete(): MockQueryBuilder {
    this._operation = 'delete';
    return this;
  }

  // ─── UPSERT ──────────────────────────────────────────────────────────────
  upsert(data: MockRow | MockRow[], opts?: { onConflict?: string }): MockQueryBuilder {
    this._operation = 'upsert';
    this._upsertData = Array.isArray(data) ? data : [data];
    this._onConflict = opts?.onConflict || null;
    return this;
  }

  // ─── RPC ─────────────────────────────────────────────────────────────────
  rpc(_fn: string, _params?: any): MockQueryBuilder {
    this._operation = 'rpc';
    return this;
  }

  // ─── FILTROS ─────────────────────────────────────────────────────────────
  eq(column: string, value: any): MockQueryBuilder {
    this._filters.push((row) => row[column] === value);
    return this;
  }

  neq(column: string, value: any): MockQueryBuilder {
    this._filters.push((row) => row[column] !== value);
    return this;
  }

  in(column: string, values: any[]): MockQueryBuilder {
    this._filters.push((row) => values.includes(row[column]));
    return this;
  }

  like(column: string, pattern: string): MockQueryBuilder {
    const regex = new RegExp('^' + pattern.replace(/%/g, '.*').replace(/_/g, '.') + '$', 'i');
    this._filters.push((row) => regex.test(row[column] || ''));
    return this;
  }

  gte(column: string, value: any): MockQueryBuilder {
    this._filters.push((row) => row[column] >= value);
    return this;
  }

  lte(column: string, value: any): MockQueryBuilder {
    this._filters.push((row) => row[column] <= value);
    return this;
  }

  gt(column: string, value: any): MockQueryBuilder {
    this._filters.push((row) => row[column] > value);
    return this;
  }

  lt(column: string, value: any): MockQueryBuilder {
    this._filters.push((row) => row[column] < value);
    return this;
  }

  not(column: string, operator: string, value: any): MockQueryBuilder {
    if (operator === 'is' && value === null) {
      this._filters.push((row) => row[column] !== null);
    } else if (operator === 'is' && value !== null) {
      this._filters.push((row) => row[column] === null);
    }
    return this;
  }

  or(expression: string): MockQueryBuilder {
    // Suporta expressões como: "owner_id.eq.${userId},created_by.eq.${userId}"
    const conditions = expression.split(',').map((c) => c.trim());
    this._filters.push((row) => {
      return conditions.some((cond) => {
        const match = cond.match(/^(\w+)\.(eq|neq|gt|lt|gte|lte|like)\.(.+)$/);
        if (!match) return false;
        const [, col, op, val] = match;
        const cellVal = row[col];
        switch (op) {
          case 'eq': return String(cellVal) === val;
          case 'neq': return String(cellVal) !== val;
          case 'gt': return cellVal > val;
          case 'lt': return cellVal < val;
          case 'gte': return cellVal >= val;
          case 'lte': return cellVal <= val;
          case 'like': return new RegExp('^' + val.replace(/%/g, '.*') + '$').test(String(cellVal));
          default: return false;
        }
      });
    });
    return this;
  }

  // ─── ORDENAÇÃO ───────────────────────────────────────────────────────────
  order(column: string, opts?: { ascending?: boolean }): MockQueryBuilder {
    this._orderBy.push({ column, ascending: opts?.ascending ?? true });
    return this;
  }

  // ─── PAGINAÇÃO ───────────────────────────────────────────────────────────
  range(from: number, to: number): MockQueryBuilder {
    this._rangeFrom = from;
    this._rangeTo = to;
    return this;
  }

  limit(count: number): MockQueryBuilder {
    this._limitValue = count;
    return this;
  }

  // ─── RETORNO ─────────────────────────────────────────────────────────────
  single(): MockQueryBuilder {
    this._returnSingle = 'single';
    return this;
  }

  maybeSingle(): MockQueryBuilder {
    this._returnSingle = 'maybeSingle';
    return this;
  }

  // ─── EXECUÇÃO ────────────────────────────────────────────────────────────
  async then(resolve: (result: QueryResult) => void, reject?: (err: any) => void): Promise<void> {
    try {
      const result = this._execute();
      resolve(result);
    } catch (err) {
      if (reject) reject(err);
      else throw err;
    }
  }

  private _execute(): QueryResult {
    switch (this._operation) {
      case 'select': return this._execSelect();
      case 'insert': return this._execInsert();
      case 'update': return this._execUpdate();
      case 'delete': return this._execDelete();
      case 'upsert': return this._execUpsert();
      default: return { data: null, error: { message: `Operação não suportada: ${this._operation}` } };
    }
  }

  private _execSelect(): QueryResult {
    const store = MockDB.getTable(this._table);
    if (!store) return { data: this._headOnly ? null : [], count: this._headOnly ? 0 : undefined, error: null };

    let rows = [...store].filter((r) => r.company_id === this._getCompanyId() || !this._getCompanyId());

    // Aplicar filtros
    for (const filter of this._filters) {
      rows = rows.filter(filter);
    }

    const totalCount = rows.length;

    // Ordenação
    if (this._orderBy.length > 0) {
      rows.sort((a, b) => {
        for (const { column, ascending } of this._orderBy) {
          const aVal = a[column];
          const bVal = b[column];
          const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
          if (cmp !== 0) return ascending ? cmp : -cmp;
        }
        return 0;
      });
    }

    // Paginação
    if (this._rangeFrom !== null && this._rangeTo !== null) {
      rows = rows.slice(this._rangeFrom, this._rangeTo + 1);
    } else if (this._limitValue !== null) {
      rows = rows.slice(0, this._limitValue);
    }

    // Processar JOINs simulados no select
    rows = this._processSelects(rows);

    // head only (count)
    if (this._headOnly) {
      return { data: null, error: null, count: totalCount };
    }

    // single / maybeSingle
    if (this._returnSingle === 'single') {
      if (rows.length === 0) return { data: null, error: { message: 'Row not found', code: 'PGRST116' } };
      return { data: rows[0], error: null };
    }
    if (this._returnSingle === 'maybeSingle') {
      return { data: rows[0] || null, error: null };
    }

    return { data: rows, count: this._countOptions ? totalCount : undefined, error: null };
  }

  private _execInsert(): QueryResult {
    const store = MockDB.getTable(this._table, true);
    if (!store) return { data: null, error: { message: `Tabela não encontrada: ${this._table}` } };

    const inserted: MockRow[] = [];
    for (const row of this._insertData || []) {
      const newRow = {
        ...row,
        id: row.id || crypto.randomUUID(),
        created_at: row.created_at || new Date().toISOString(),
      };
      store.push(newRow);
      inserted.push(newRow);

      if (this._table === 'documento_linhas') {
        const documentoId = newRow.documento_id;
        if (documentoId) {
          recalcularTotaisDocumentoMock(documentoId);
        }
      }
    }

    if (this._returnSingle === 'single') {
      return { data: inserted[0] || null, error: null };
    }
    return { data: inserted.length === 1 ? inserted[0] : inserted, error: null };
  }

  private _execUpdate(): QueryResult {
    const store = MockDB.getTable(this._table);
    if (!store) return { data: null, error: { message: `Tabela não encontrada: ${this._table}` } };

    let updated: MockRow[] = [];
    for (let i = 0; i < store.length; i++) {
      let match = true;
      for (const filter of this._filters) {
        if (!filter(store[i])) { match = false; break; }
      }
      if (match) {
        // Remover chaves undefined do updateData para não sobrescrever com undefined
        const cleanUpdate: MockRow = {};
        for (const [k, v] of Object.entries(this._updateData || {})) {
          if (v !== undefined) cleanUpdate[k] = v;
        }
        store[i] = { ...store[i], ...cleanUpdate, updated_at: new Date().toISOString() };
        updated.push(store[i]);

        if (this._table === 'documentos') {
          const documentoId = store[i].id;
          if (documentoId) {
            recalcularTotaisDocumentoMock(documentoId);
          }
        }
      }
    }

    if (this._returnSingle === 'single') {
      if (updated.length === 0) return { data: null, error: { message: 'Row not found', code: 'PGRST116' } };
      return { data: updated[0], error: null };
    }
    return { data: updated, error: null };
  }

  private _execDelete(): QueryResult {
    const store = MockDB.getTable(this._table);
    if (!store) return { data: null, error: { message: `Tabela não encontrada: ${this._table}` } };

    const before = store.length;
    for (let i = store.length - 1; i >= 0; i--) {
      let match = true;
      for (const filter of this._filters) {
        if (!filter(store[i])) { match = false; break; }
      }
      if (match) store.splice(i, 1);
    }

    return { data: null, error: null };
  }

  private _execUpsert(): QueryResult {
    const store = MockDB.getTable(this._table, true);
    if (!store) return { data: null, error: { message: `Tabela não encontrada: ${this._table}` } };

    const rows = Array.isArray(this._upsertData) ? this._upsertData : [this._upsertData];
    const results: MockRow[] = [];

    for (const row of rows) {
      const existingIdx = store.findIndex((r) => {
        if (this._onConflict) {
          const cols = this._onConflict.split(',').map((c) => c.trim());
          return cols.every((col) => r[col] === row[col]);
        }
        return r.id === row.id;
      });

      if (existingIdx >= 0) {
        store[existingIdx] = { ...store[existingIdx], ...row };
        results.push(store[existingIdx]);
      } else {
        const newRow = { ...row, id: row.id || crypto.randomUUID(), created_at: row.created_at || new Date().toISOString() };
        store.push(newRow);
        results.push(newRow);
      }
    }

    if (this._returnSingle === 'single') {
      return { data: results[0] || null, error: null };
    }
    return { data: results, error: null };
  }

  private _processSelects(rows: MockRow[]): MockRow[] {
    // Processar selects com join simulado (ex: '*, cliente:clientes(*), linhas:documento_linhas(*)')
    if (!this._selectColumns || this._selectColumns === '*') return rows;

    // Detectar padrões de join no select: alias:table(columns)
    const joinPattern = /(\w+):(\w+)\(([^)]*)\)/g;
    let match;
    const joins: { alias: string; table: string; columns: string }[] = [];

    while ((match = joinPattern.exec(this._selectColumns)) !== null) {
      joins.push({ alias: match[1], table: match[2], columns: match[3] });
    }

    if (joins.length === 0) return rows;

    return rows.map((row) => {
      const enriched = { ...row };
      for (const join of joins) {
        const foreignStore = MockDB.getTable(join.table);
        if (!foreignStore) continue;

        if (join.columns === '*') {
          // Lookup por foreign key
          const fkColumn = join.alias === 'cliente' ? 'cliente_id'
            : join.alias === 'fornecedor' ? 'fornecedor_id'
            : join.alias === 'linhas' ? 'documento_id'
            : `${join.alias}_id`;

          if (join.alias === 'linhas' || join.table === 'documento_linhas') {
            enriched[join.alias] = foreignStore.filter((r) => r.documento_id === row.id);
          } else {
            enriched[join.alias] = foreignStore.find((r) => r.id === row[fkColumn]) || null;
          }
        } else {
          // Lookup com colunas específicas
          const fkColumn = `${join.alias}_id`;
          const fkValue = row[fkColumn] || row.id;
          const found = foreignStore.find((r) => r.id === fkValue);
          if (found) {
            const projected: MockRow = {};
            const cols = join.columns.split(',').map((c) => c.trim());
            for (const col of cols) {
              projected[col] = found[col];
            }
            enriched[join.alias] = projected;
          } else {
            enriched[join.alias] = null;
          }
        }
      }
      return enriched;
    });
  }

  private _getCompanyId(): string | undefined {
    // O company_id normalmente está no primeiro filtro .eq('company_id', ...)
    for (const filter of this._filters) {
      // Não podemos extrair diretamente, então retornamos undefined (pega tudo)
      // O filtro de company_id será aplicado pelo próprio filter
    }
    return undefined;
  }
}

/**
 * MockDB — armazenamento em memória que simula as tabelas do Supabase.
 * Inicializado com dados fictícios e mutável durante a sessão.
 */
export class MockDB {
  private static _tables: Map<string, MockRow[]> = new Map();
  private static _initialized = false;

  static init(): void {
    if (MockDB._initialized) return;
    MockDB._initialized = true;

    const {
      MOCK_COMPANIES,
      MOCK_MEMBERSHIPS,
      MOCK_COMPANY_MODULES,
      MOCK_SUBSCRIPTION_REQUESTS,
      MOCK_COMPANY_SETTINGS,
      MOCK_CLIENTES,
      MOCK_FORNECEDORES,
      MOCK_ARTIGOS,
      MOCK_SERIES,
      MOCK_DOCUMENTOS,
      MOCK_DOCUMENTO_LINHAS,
      MOCK_DESPESAS,
      MOCK_LOGS_AUDITORIA,
      MOCK_CHAVES_ASSINATURA,
      MOCK_FILA_ENVIO_AGT,
      MOCK_MOVIMENTOS_STOCK,
      MOCK_USERS,
      MOCK_PERMISSIONS,
      MOCK_USER_PERMISSIONS,
    } = require('./mock-data');

    MockDB._tables.set('companies', [...MOCK_COMPANIES]);
    MockDB._tables.set('memberships', [...MOCK_MEMBERSHIPS]);
    MockDB._tables.set('company_modules', [...MOCK_COMPANY_MODULES]);
    MockDB._tables.set('subscription_requests', [...MOCK_SUBSCRIPTION_REQUESTS]);
    MockDB._tables.set('company_settings', [...MOCK_COMPANY_SETTINGS]);
    MockDB._tables.set('clientes', [...MOCK_CLIENTES]);
    MockDB._tables.set('fornecedores', [...MOCK_FORNECEDORES]);
    MockDB._tables.set('artigos', [...MOCK_ARTIGOS]);
    MockDB._tables.set('series_numeracao', [...MOCK_SERIES]);
    MockDB._tables.set('documentos', [...MOCK_DOCUMENTOS]);
    MockDB._tables.set('documento_linhas', [...MOCK_DOCUMENTO_LINHAS]);
    MockDB._tables.set('despesas', [...MOCK_DESPESAS]);
    MockDB._tables.set('logs_auditoria', [...MOCK_LOGS_AUDITORIA]);
    MockDB._tables.set('chaves_assinatura_agt', [...MOCK_CHAVES_ASSINATURA]);
    MockDB._tables.set('fila_envio_agt', [...MOCK_FILA_ENVIO_AGT]);
    MockDB._tables.set('movimentos_stock', [...MOCK_MOVIMENTOS_STOCK]);
    MockDB._tables.set('users', [...MOCK_USERS]);
    MockDB._tables.set('permissions', [...MOCK_PERMISSIONS]);
    MockDB._tables.set('user_permissions', [...MOCK_USER_PERMISSIONS]);
  }

  static getTable(name: string, create = false): MockRow[] | null {
    MockDB.init();
    if (!MockDB._tables.has(name) && create) {
      MockDB._tables.set(name, []);
    }
    return MockDB._tables.get(name) || null;
  }

  static reset(): void {
    MockDB._initialized = false;
    MockDB._tables.clear();
  }

  static getAllTables(): string[] {
    MockDB.init();
    return Array.from(MockDB._tables.keys());
  }
}
