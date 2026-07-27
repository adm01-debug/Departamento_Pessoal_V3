/**
 * Mock canônico e encadeável do client Supabase para testes.
 *
 * Motivação (gap encontrado na auditoria de testes):
 * dezenas de suítes falhavam com `...select(...).eq(...).eq is not a function`
 * porque cada teste montava seu próprio mock ad-hoc, cobrindo apenas o
 * encadeamento que aquele serviço usava no dia em que o teste foi escrito.
 * Quando o serviço passou a exigir isolamento de tenant (`.eq('empresa_id')`),
 * o encadeamento ganhou um nível e todos os mocks quebraram.
 *
 * Este helper devolve um builder que:
 *  - aceita QUALQUER método do PostgREST em qualquer ordem (proxy);
 *  - é *thenable*, então `await query` resolve `{ data, count, error }`;
 *  - registra as chamadas para asserção (`builder.__calls`).
 */
import { vi } from 'vitest';

export interface SupabaseMockResult<T = unknown> {
  data: T | null;
  error: { message: string; code?: string } | null;
  count?: number | null;
  status?: number;
}

export interface RecordedCall {
  method: string;
  args: unknown[];
}

/** Métodos terminais que resolvem a query imediatamente. */
const TERMINAL_METHODS = new Set(['single', 'maybeSingle', 'csv', 'then']);

export interface ChainableQuery<T = unknown> extends PromiseLike<SupabaseMockResult<T>> {
  __calls: RecordedCall[];
  [key: string]: unknown;
}

/**
 * Cria um query builder encadeável que sempre resolve `result`.
 * Qualquer método desconhecido devolve o próprio builder (encadeamento infinito).
 */
export function createQueryBuilder<T = unknown>(
  result: SupabaseMockResult<T> = { data: null, error: null, count: 0 },
): ChainableQuery<T> {
  const calls: RecordedCall[] = [];

  const target: Record<string, unknown> = { __calls: calls };

  const proxy: ChainableQuery<T> = new Proxy(target, {
    get(obj, prop: string | symbol) {
      if (prop === '__calls') return calls;
      if (prop === 'then') {
        // Torna o builder aguardável: `await supabase.from('x').select('*')`
        return (
          resolve: (v: SupabaseMockResult<T>) => unknown,
          reject?: (e: unknown) => unknown,
        ) => Promise.resolve(result).then(resolve, reject);
      }
      if (prop === 'catch') {
        return (reject: (e: unknown) => unknown) => Promise.resolve(result).catch(reject);
      }
      if (prop === 'finally') {
        return (fn: () => void) => Promise.resolve(result).finally(fn);
      }
      if (typeof prop === 'symbol') return (obj as Record<symbol, unknown>)[prop];

      return (...args: unknown[]) => {
        calls.push({ method: prop, args });
        if (TERMINAL_METHODS.has(prop)) return Promise.resolve(result);
        return proxy;
      };
    },
  }) as unknown as ChainableQuery<T>;

  return proxy;
}

export interface SupabaseMockOptions {
  /** Resultado por tabela; use `*` como fallback global. */
  tables?: Record<string, SupabaseMockResult>;
  /** Resultado por RPC; use `*` como fallback global. */
  rpcs?: Record<string, SupabaseMockResult>;
  /** Usuário autenticado devolvido por `auth.getUser()` / `getSession()`. */
  user?: { id: string; email?: string } | null;
}

const EMPTY: SupabaseMockResult = { data: null, error: null, count: 0 };

/**
 * Cria um mock completo do client Supabase (from / rpc / auth / storage /
 * functions / channel), seguro para uso global em `setupTests`.
 */
export function createSupabaseMock(options: SupabaseMockOptions = {}) {
  const { tables = {}, rpcs = {}, user = { id: 'test-user-id', email: 'test@example.com' } } =
    options;

  const resolveTable = (table: string): SupabaseMockResult =>
    tables[table] ?? tables['*'] ?? EMPTY;

  const resolveRpc = (fn: string): SupabaseMockResult => rpcs[fn] ?? rpcs['*'] ?? EMPTY;

  const session = user
    ? { access_token: 'test-token', refresh_token: 'test-refresh', user }
    : null;

  return {
    from: vi.fn((table: string) => createQueryBuilder(resolveTable(table))),
    rpc: vi.fn((fn: string) => createQueryBuilder(resolveRpc(fn))),
    auth: {
      getUser: vi.fn(async () => ({ data: { user }, error: null })),
      getSession: vi.fn(async () => ({ data: { session }, error: null })),
      signInWithPassword: vi.fn(async () => ({ data: { session, user }, error: null })),
      signInWithOAuth: vi.fn(async () => ({ data: { url: 'https://example.test' }, error: null })),
      signOut: vi.fn(async () => ({ error: null })),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      refreshSession: vi.fn(async () => ({ data: { session, user }, error: null })),
    },
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(async () => ({ data: { path: 'mock/path' }, error: null })),
        download: vi.fn(async () => ({ data: new Blob(['mock']), error: null })),
        remove: vi.fn(async () => ({ data: [], error: null })),
        list: vi.fn(async () => ({ data: [], error: null })),
        createSignedUrl: vi.fn(async () => ({
          data: { signedUrl: 'https://example.test/signed' },
          error: null,
        })),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://example.test/public' } })),
      })),
    },
    functions: {
      invoke: vi.fn(async () => ({ data: null, error: null })),
    },
    channel: vi.fn(() => {
      const ch = {
        on: vi.fn(() => ch),
        subscribe: vi.fn(() => ch),
        unsubscribe: vi.fn(async () => 'ok'),
        send: vi.fn(async () => 'ok'),
      };
      return ch;
    }),
    removeChannel: vi.fn(async () => 'ok'),
    getChannels: vi.fn(() => []),
  };
}

export type SupabaseMock = ReturnType<typeof createSupabaseMock>;
