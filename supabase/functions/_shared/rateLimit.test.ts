// Testes unitários do helper checkRateLimit.
// Executa com Deno: `deno test supabase/functions/_shared/rateLimit.test.ts --no-check`
//
// Escopo: verificamos os invariantes críticos — allowed/remaining/reset,
// bloqueio quando count >= limit, fallback fail-closed em erro de DB e
// isolamento por chave. Mockamos a RPC atômica usada pelo helper.
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
    async rpc(name: string, args: {
      p_key: string;
      p_limit: number;
      p_window_sec: number;
      p_now: number;
    }) {
      if (name !== 'edge_rate_limit_check') {
        throw new Error(`RPC inesperada: ${name}`);
      }
      if (opts.countError) return { data: null, error: opts.countError };

      const windowStart = args.p_now - args.p_window_sec;
      const beforeCleanup = state.rows.length;
      state.rows = state.rows.filter(
        row => row.key !== args.p_key || row.timestamp >= windowStart,
      );
      state.deletes += beforeCleanup - state.rows.length;

      let current = state.rows.filter(row => row.key === args.p_key).length;
      const allowed = current < args.p_limit;
      if (allowed) {
        const row = { key: args.p_key, timestamp: args.p_now };
        state.rows.push(row);
        state.inserts.push(row);
        current += 1;
      }

      return {
        data: {
          allowed,
          current,
          limit: args.p_limit,
          remaining: Math.max(0, args.p_limit - current),
          reset: args.p_now,
        },
        error: null,
      };
    },
  };
  return {
    client: client as unknown as Parameters<typeof checkRateLimit>[0],
    state,
  };
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

Deno.test('fallback fail-closed quando a RPC rejeita a Promise', async () => {
  const client = {
    rpc: () => Promise.reject(new Error('network unavailable')),
  } as unknown as Parameters<typeof checkRateLimit>[0];
  const before = Math.floor(Date.now() / 1000);
  const result = await checkRateLimit(client, { key: 'u:1:rpc-throw', limit: 6, windowSec: 60 });
  assertEquals(result.allowed, true);
  assertEquals(result.limit, 3);
  assertEquals(result.remaining, 2);
  if (result.reset < before + 59 || result.reset > before + 61) {
    throw new Error(`fallback reset must be the end of the active window, got ${result.reset}`);
  }
});

Deno.test('fallback fail-closed quando a RPC retorna data nula sem erro', async () => {
  const client = {
    rpc: () => Promise.resolve({ data: null, error: null }),
  } as unknown as Parameters<typeof checkRateLimit>[0];
  const result = await checkRateLimit(client, { key: 'u:1:rpc-malformed', limit: 4, windowSec: 60 });
  assertEquals(result.allowed, true);
  assertEquals(result.limit, 2);
  assertEquals(result.remaining, 1);
});

Deno.test('burst cheio nega antes de consumir a cota principal', async () => {
  let rpcCalls = 0;
  const client = {
    rpc: async (_name: string, args: { p_limit: number; p_now: number }) => {
      rpcCalls++;
      return {
        data: { allowed: true, current: 1, limit: args.p_limit, remaining: args.p_limit - 1, reset: args.p_now + 60 },
        error: null,
      };
    },
  } as unknown as Parameters<typeof checkRateLimit>[0];
  const options = { key: 'u:1:burst-main-preserved', limit: 10, windowSec: 60, burstLimit: 1, burstWindowSec: 10 };
  const first = await checkRateLimit(client, options);
  const second = await checkRateLimit(client, options);
  assertEquals(first.allowed, true);
  assertEquals(second.allowed, false);
  assertEquals(second.reason, 'burst');
  assertEquals(rpcCalls, 1);
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
