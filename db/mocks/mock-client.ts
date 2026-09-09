/**
 * Mock Client — substitui o Supabase client em modo mock.
 * Simula: createClient(url, key, opts) → { from(), schema(), auth, channel() }
 * Para schemas, usa MockDB com o schema correto.
 */

import { MockQueryBuilder, MockDB } from './query-builder';
import { MOCK_USER, MOCK_IDS } from './mock-data';

// Tabelas que pertencem ao schema "public"
const PUBLIC_TABLES = new Set([
  'companies',
  'memberships',
  'company_modules',
  'subscription_requests',
]);

// Tabelas que pertencem ao schema "kima_facturas"
const KIMA_TABLES = new Set([
  'clientes',
  'fornecedores',
  'artigos',
  'documentos',
  'documento_linhas',
  'series_numeracao',
  'despesas',
  'movimentos_stock',
  'logs_auditoria',
  'company_settings',
  'chaves_assinatura_agt',
  'fila_envio_agt',
]);

function resolveSchema(table: string, defaultSchema: string): string {
  if (PUBLIC_TABLES.has(table)) return 'public';
  if (KIMA_TABLES.has(table)) return 'kima_facturas';
  return defaultSchema;
}

// ─── Auth Mock ──────────────────────────────────────────────────────────────
const mockAuth = {
  getUser: async () => ({
    data: { user: MOCK_USER },
    error: null,
  }),
  signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
    if (!email || !password) {
      return { data: { user: null, session: null }, error: { message: 'Credenciais inválidas' } };
    }
    return {
      data: {
        user: { ...MOCK_USER, email },
        session: { access_token: 'mock-token', user: MOCK_USER },
      },
      error: null,
    };
  },
  signUp: async ({ email, password, options }: any) => {
    if (!email || !password) {
      return { data: { user: null, session: null }, error: { message: 'Email e password são obrigatórios' } };
    }
    return {
      data: {
        user: { ...MOCK_USER, email, user_metadata: options?.data || {} },
        session: { access_token: 'mock-token', user: MOCK_USER },
      },
      error: null,
    };
  },
  signOut: async () => ({ error: null }),
  onAuthStateChange: (callback: (event: string, session: any) => void) => {
    // Simula auth state change imediato
    setTimeout(() => callback('SIGNED_IN', { user: MOCK_USER }), 0);
    return {
      data: {
        subscription: {
          unsubscribe: () => {},
        },
      },
    };
  },
};

// ─── Realtime Mock ──────────────────────────────────────────────────────────
class MockRealtimeChannel {
  private _handlers: Map<string, Function[]> = new Map();

  constructor(public _name: string) {}

  on(type: string, filter: { event: string }, callback: Function): MockRealtimeChannel {
    const key = `${type}:${filter.event}`;
    if (!this._handlers.has(key)) this._handlers.set(key, []);
    this._handlers.get(key)!.push(callback);
    return this;
  }

  subscribe(callback?: Function): MockRealtimeChannel {
    if (callback) setTimeout(() => callback('SUBSCRIBED'), 0);
    return this;
  }

  send(filter: { event: string; payload: any }): void {
    const key = `broadcast:${filter.event}`;
    const handlers = this._handlers.get(key) || [];
    handlers.forEach((h) => h(filter.payload));
  }

  unsubscribe(): void {
    this._handlers.clear();
  }
}

// ─── Mock Supabase Client ───────────────────────────────────────────────────
class MockSupabaseClient {
  private _defaultSchema = 'kima_facturas';

  schema(schemaName: string): MockSupabaseClient {
    const clone = new MockSupabaseClient();
    clone._defaultSchema = schemaName;
    return clone;
  }

  from(table: string): MockQueryBuilder {
    const schema = resolveSchema(table, this._defaultSchema);
    return new MockQueryBuilder(table, schema);
  }

  get auth() {
    return mockAuth;
  }

  channel(name: string): MockRealtimeChannel {
    return new MockRealtimeChannel(name);
  }

  removeChannel(channel: MockRealtimeChannel): Promise<{ error: any }> {
    channel.unsubscribe();
    return Promise.resolve({ error: null });
  }

  removeChannels(channels: MockRealtimeChannel[]): Promise<{ error: any }> {
    channels.forEach((ch) => ch.unsubscribe());
    return Promise.resolve({ error: null });
  }
}

// ─── Factory ────────────────────────────────────────────────────────────────
export function createMockClient(
  _supabaseUrl?: string,
  _supabaseKey?: string,
  _opts?: any
): MockSupabaseClient {
  MockDB.init();
  return new MockSupabaseClient();
}

export { MockSupabaseClient, MockDB };
