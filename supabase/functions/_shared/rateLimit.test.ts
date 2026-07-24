// Testes unitários do helper checkRateLimit.
// Executa com Deno: `deno test supabase/functions/_shared/rateLimit.test.ts --no-check`
//
// Escopo: verificamos os invariantes críticos — allowed/remaining/reset,
// bloqueio quando count >= limit, fail-open em erro de DB, e insert só
// quando allowed. Mockamos o SupabaseClient com stubs mínimos.
import { assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { checkRateLimit, rateLimitResponse } from './rateLimit.ts';

type Row = { key: string; timestamp: number };

/** Mock mínimo do SupabaseClient — apenas o subset usado pelo helper. */
function makeMockClient(opts: {
  initialRows?: Row[];
  countError?: { message: string } | null;
} = {}) {
  const state = {
    rows: [...(opts.initialRows ?? [])],
    inserts: [] as Row[],
    deletes: 0,
  };

  const client = {
    from(table: string) {
      if (table !== 'rate_limits') throw new Error(`tabela inesperada: ${table}`);
      return {
        // delete().lt(...)  → thenable no-op
        delete() {
          return {
            lt(_col: string, _val: number) {
              state.deletes++;
              return { then: (res: () => void) => { res(); return Promise.resolve(); } };
            },
          };
        },
        // select('id', { count: 'exact', head: true }).eq(...).gte(...)
        select(_cols: string, _opts: unknown) {
          const chain = {
            _key: '' as string,
            _from: 0 as number,
            eq(_col: string, v: string) { chain._key = v; return chain; },
            async gte(_col: string, v: number) {
              chain._from = v;
              if (opts.countError) return { count: null, error: opts.countError };
              const c = state.rows.filter(r => r.key === chain._key && r.timestamp >= chain._from).length;
              return { count: c, error: null };
            },
          };
          return chain;
        },
        // insert({ key, timestamp })
        async insert(row: Row) {
          state.inserts.push(row);
          state.rows.push(row);
          return { error: null };
        },
      };
    },
  };
  return { client: client as any, state };
}

Deno.test('permite quando abaixo do limite e insere marcador', async () => {
  const { client, state } = makeMockClient({ initialRows: [] });
  const r = await checkRateLimit(client, { key: 'u:1:foo', limit: 5, windowSec: 60 });
  assertEquals(r.allowed, true);
  assertEquals(r.remaining, 4);
  assertEquals(r.limit, 5);
  assertEquals(r.windowSec, 60);
  assertEquals(state.inserts.length, 1);
  assertEquals(state.inserts[0].key, 'u:1:foo');
});

Deno.test('bloqueia quando count >= limit e não insere', async () => {
  const now = Math.floor(Date.now() / 1000);
  const rows: Row[] = Array.from({ length: 3 }, (_, i) => ({ key: 'u:1:foo', timestamp: now - i }));
  const { client, state } = makeMockClient({ initialRows: rows });
  const r = await checkRateLimit(client, { key: 'u:1:foo', limit: 3, windowSec: 60 });
  assertEquals(r.allowed, false);
  assertEquals(r.remaining, 0);
  assertEquals(state.inserts.length, 0);
});

Deno.test('isolamento por chave — outra chave não conta contra a atual', async () => {
  const now = Math.floor(Date.now() / 1000);
  const rows: Row[] = Array.from({ length: 10 }, () => ({ key: 'u:2:bar', timestamp: now }));
  const { client } = makeMockClient({ initialRows: rows });
  const r = await checkRateLimit(client, { key: 'u:1:foo', limit: 5, windowSec: 60 });
  assertEquals(r.allowed, true);
  assertEquals(r.remaining, 4);
});

Deno.test('ignora rows fora da janela (timestamp < windowStart)', async () => {
  const now = Math.floor(Date.now() / 1000);
  const oldRows: Row[] = Array.from({ length: 10 }, () => ({ key: 'u:1:foo', timestamp: now - 3600 }));
  const { client } = makeMockClient({ initialRows: oldRows });
  const r = await checkRateLimit(client, { key: 'u:1:foo', limit: 5, windowSec: 60 });
  assertEquals(r.allowed, true);
  assertEquals(r.remaining, 4);
});

Deno.test('fail-closed (fallback em memória) — primeira req permitida com limite reduzido', async () => {
  const { client, state } = makeMockClient({ countError: { message: 'DB offline' } });
  // limit=5, fallbackLimit = max(1, floor(5 * 0.5)) = 2
  const r = await checkRateLimit(client, { key: 'u:1:foo-fb', limit: 5, windowSec: 60 });
  assertEquals(r.allowed, true);
  assertEquals(r.limit, 2);           // 50% do limite normal
  assertEquals(r.remaining, 1);       // 2 - 1 (esta requisição) = 1
  assertEquals(state.inserts.length, 0); // fallback não insere na tabela DB
});

Deno.test('fail-closed (fallback em memória) — bloqueia após atingir limite reduzido', async () => {
  const { client } = makeMockClient({ countError: { message: 'DB offline' } });
  // fallbackLimit = 2; consome as 2 permissões
  await checkRateLimit(client, { key: 'u:1:foo-fb2', limit: 5, windowSec: 60 });
  await checkRateLimit(client, { key: 'u:1:foo-fb2', limit: 5, windowSec: 60 });
  // 3ª req deve ser bloqueada
  const r3 = await checkRateLimit(client, { key: 'u:1:foo-fb2', limit: 5, windowSec: 60 });
  assertEquals(r3.allowed, false);
  assertEquals(r3.remaining, 0);
});

Deno.test('rateLimitResponse gera 429 com headers RFC-compliant', async () => {
  const res = rateLimitResponse({ allowed: false, remaining: 0, reset: 1_700_000_000, limit: 10, windowSec: 60 });
  assertEquals(res.status, 429);
  assertEquals(res.headers.get('Retry-After'), '60');
  assertEquals(res.headers.get('X-RateLimit-Limit'), '10');
  assertEquals(res.headers.get('X-RateLimit-Remaining'), '0');
  assertEquals(res.headers.get('X-RateLimit-Reset'), '1700000000');
  const body = await res.json();
  assertEquals(body.code, 'RATE_LIMIT_EXCEEDED');
  assertEquals(body.limit, 10);
});
