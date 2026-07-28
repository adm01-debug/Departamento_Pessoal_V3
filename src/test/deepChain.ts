/**
 * `deepChain` — adaptador defensivo para mocks legados do PostgREST.
 *
 * Contexto: dezenas de suítes montaram mocks "rasos" (`{ select: fn }` →
 * `{ eq: fn }` → Promise). Quando os serviços passaram a exigir isolamento de
 * tenant, o encadeamento ganhou um nível extra (`.eq('empresa_id', ...)`) e
 * todos esses mocks quebraram com `...eq is not a function`.
 *
 * Em vez de reescrever cada mock, envolvemos o resultado de `supabase.from()`
 * num Proxy recursivo que:
 *  - preserva os `vi.fn()` originais (asserções continuam válidas);
 *  - envolve o retorno de cada método, para que o encadeamento siga profundo;
 *  - cria automaticamente métodos ausentes, devolvendo o próprio proxy;
 *  - é *thenable*, resolvendo o último resultado configurado pelo mock.
 *
 * Isso torna os testes resilientes a novos filtros sem afrouxar as asserções
 * já existentes.
 */
import { vi } from 'vitest';

type AnyRecord = Record<string | symbol, unknown>;

const isPlainObject = (v: unknown): v is AnyRecord =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const isPromiseLike = (v: unknown): v is PromiseLike<unknown> =>
  isPlainObject(v) && typeof (v as { then?: unknown }).then === 'function';

/**
 * Envolve o objeto devolvido por um mock de query builder.
 *
 * @param target Objeto original do mock (pode ser parcial).
 * @param fallback Resultado resolvido quando o mock não define um terminal.
 */
export function deepChain(
  target: unknown,
  fallback: { data: unknown; error: unknown; count?: unknown } = { data: null, error: null },
): unknown {
  // Promise já resolvida pelo mock: ainda assim precisa aceitar métodos extras
  // (`.limit()`, `.eq()` de tenant) adicionados depois que o teste foi escrito.
  // Somente Promises reais são reencapsuladas; chains customizados (ex.: makeChain)
  // já são thenable e devem passar intactos para preservar suas asserções.
  if (target instanceof Promise) return promiseChain(target);
  if (!isPlainObject(target) || isPromiseLike(target)) return target;

  const generated = new Map<string, ReturnType<typeof vi.fn>>();

  const proxy: unknown = new Proxy(target, {
    get(obj, prop, receiver) {
      if (prop === 'then') {
        // Torna o chain aguardável mesmo quando o mock não define terminal.
        return (onOk: (v: unknown) => unknown, onErr?: (e: unknown) => unknown) =>
          Promise.resolve(fallback).then(onOk, onErr);
      }
      if (typeof prop === 'symbol') return Reflect.get(obj, prop, receiver);

      const original = Reflect.get(obj, prop, receiver);

      if (typeof original === 'function') {
        // Preserva o vi.fn() original mas envolve o retorno para seguir a cadeia.
        const wrapper = (...args: unknown[]) => {
          const result = (original as (...a: unknown[]) => unknown).apply(obj, args);
          if (result instanceof Promise) return promiseChain(result);
          if (isPromiseLike(result) || !isPlainObject(result)) return result;
          return deepChain(result, fallback);
        };
        // Repassa metadados do vi.fn (mock, mockReturnValue, etc.) para asserções.
        return Object.assign(wrapper, original);
      }

      if (original !== undefined) return original;

      // Método ausente no mock legado: devolve o próprio chain.
      if (!generated.has(prop)) {
        generated.set(prop, vi.fn(() => proxy));
      }
      return generated.get(prop);
    },
  });

  return proxy;
}

/**
 * Envolve uma Promise para que continue encadeável.
 * Métodos desconhecidos devolvem o próprio wrapper e o `await` resolve o valor
 * original configurado pelo mock.
 */
function promiseChain(promise: PromiseLike<unknown>): unknown {
  const generated = new Map<string, ReturnType<typeof vi.fn>>();
  const proxy: unknown = new Proxy({} as AnyRecord, {
    get(_obj, prop) {
      if (prop === 'then') {
        return (onOk: (v: unknown) => unknown, onErr?: (e: unknown) => unknown) =>
          Promise.resolve(promise).then(onOk, onErr);
      }
      if (prop === 'catch') return (onErr: (e: unknown) => unknown) => Promise.resolve(promise).catch(onErr);
      if (prop === 'finally') return (fn: () => void) => Promise.resolve(promise).finally(fn);
      if (typeof prop === 'symbol') return undefined;
      const key = prop as string;
      if (!generated.has(key)) generated.set(key, vi.fn(() => proxy));
      return generated.get(key);
    },
  });
  return proxy;
}

/** Açúcar para uso direto na factory do `vi.mock`. */
export const chainedFrom =
  (mockFrom: (...args: unknown[]) => unknown) =>
  (...args: unknown[]) =>
    deepChain(mockFrom(...args));
