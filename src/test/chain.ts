/**
 * Helper canônico de encadeamento PostgREST para testes.
 *
 * Motivação: dezenas de suítes montavam mocks ad-hoc que só cobriam o
 * encadeamento existente no dia em que o teste foi escrito. Quando os serviços
 * passaram a exigir isolamento de tenant (`.eq('empresa_id', ...)`), o
 * encadeamento ganhou um nível e todos quebraram com
 * `...select(...).eq(...).eq is not a function`.
 *
 * `makeChain` devolve um objeto que:
 *  - aceita QUALQUER método do PostgREST, em qualquer ordem e profundidade;
 *  - memoiza cada método como um `vi.fn()` (permite `expect(chain.eq)...`);
 *  - é *thenable* (o `await` resolve o resultado configurado);
 *  - resolve imediatamente em métodos terminais (`single`, `maybeSingle`, `csv`).
 */
import { vi } from 'vitest';

export interface ChainResult<T = unknown> {
  data?: T | null;
  error?: { message: string; code?: string } | null;
  count?: number | null;
}

/** Métodos que encerram a query devolvendo uma Promise diretamente. */
const TERMINAL = new Set(['single', 'maybeSingle', 'csv']);

export type Chain = Record<string, ReturnType<typeof vi.fn>> & PromiseLike<ChainResult>;

/**
 * Cria um query builder encadeável que sempre resolve `result`.
 *
 * @param result Resposta simulada do PostgREST (`{ data, error, count }`).
 */
export function makeChain<T = unknown>(result: ChainResult<T> = { data: null, error: null }): Chain {
  const resolved: ChainResult<T> = { data: null, error: null, ...result };
  const fns = new Map<string, ReturnType<typeof vi.fn>>();

  const proxy = new Proxy({} as Record<string | symbol, unknown>, {
    get(_target, prop) {
      if (prop === 'then') {
        return (onOk: (v: ChainResult<T>) => unknown, onErr?: (e: unknown) => unknown) =>
          Promise.resolve(resolved).then(onOk, onErr);
      }
      if (prop === 'catch') {
        return (onErr: (e: unknown) => unknown) => Promise.resolve(resolved).catch(onErr);
      }
      if (prop === 'finally') {
        return (fn: () => void) => Promise.resolve(resolved).finally(fn);
      }
      // Symbols (ex.: Symbol.toStringTag) não devem virar métodos encadeáveis.
      if (typeof prop === 'symbol') return undefined;

      const key = prop as string;
      if (!fns.has(key)) {
        const fn = TERMINAL.has(key)
          ? vi.fn(() => Promise.resolve(resolved))
          : vi.fn(() => proxy);
        fns.set(key, fn);
      }
      return fns.get(key);
    },
  }) as unknown as Chain;

  return proxy;
}

/**
 * Atalho para mockar `supabase.from()` devolvendo sempre o mesmo chain.
 * Retorna o chain para asserções.
 */
export function mockFromChain<T = unknown>(
  mockFrom: { mockReturnValue: (v: unknown) => unknown },
  result: ChainResult<T> = { data: null, error: null },
): Chain {
  const chain = makeChain(result);
  mockFrom.mockReturnValue(chain);
  return chain;
}
