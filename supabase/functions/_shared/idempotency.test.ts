// Testes de concorrência e reenvio para o helper de idempotência usado por `calcular-folha`.
// Simula a tabela `idempotency_keys` in-memory com a mesma UNIQUE constraint (endpoint, key_hash)
// aplicada no banco, garantindo que apenas UMA execução vence a corrida e as demais recebem
// resposta consistente (REPLAY ou IN_PROGRESS), nunca duplicando o cálculo.

import { assert, assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
  beginIdempotency,
  completeIdempotency,
} from "./idempotency.ts";

// ────────────────────────────────────────────────────────────────────────────────
// Mock mínimo do SupabaseClient — apenas o que o helper usa: from(...).insert / select / update.
// Emula UNIQUE(endpoint, key_hash) via Map indexado por essa chave composta.
// ────────────────────────────────────────────────────────────────────────────────

type Row = {
  id: string;
  key_hash: string;
  endpoint: string;
  request_hash: string;
  status: "in_progress" | "completed" | "failed";
  response_status: number | null;
  response_body: unknown;
  empresa_id: string | null;
  user_id: string | null;
  expires_at: string;
  completed_at: string | null;
};

function createMockAdmin() {
  const store = new Map<string, Row>(); // key = `${endpoint}::${key_hash}`
  let inserts = 0;
  let uniqueViolations = 0;

  const compositeKey = (endpoint: string, keyHash: string) => `${endpoint}::${keyHash}`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const from = (table: string): any => {
    if (table !== "idempotency_keys") {
      // Aceita audit_log etc. como no-op para não quebrar em chamadas colaterais.
      return {
        insert: () => Promise.resolve({ data: null, error: null }),
        select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }),
        update: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
      };
    }

    return {
      insert(payload: Partial<Row>) {
        return {
          select() {
            return {
              async maybeSingle() {
                inserts++;
                const ck = compositeKey(payload.endpoint!, payload.key_hash!);
                if (store.has(ck)) {
                  uniqueViolations++;
                  return {
                    data: null,
                    error: { code: "23505", message: "duplicate key value violates unique constraint" },
                  };
                }
                const row: Row = {
                  id: crypto.randomUUID(),
                  key_hash: payload.key_hash!,
                  endpoint: payload.endpoint!,
                  request_hash: payload.request_hash!,
                  status: (payload.status as Row["status"]) ?? "in_progress",
                  response_status: null,
                  response_body: null,
                  empresa_id: payload.empresa_id ?? null,
                  user_id: payload.user_id ?? null,
                  expires_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
                  completed_at: null,
                };
                store.set(ck, row);
                return { data: { id: row.id }, error: null };
              },
            };
          },
          // audit_log path (from() ≠ idempotency_keys) já tratado acima
        };
      },
      select(_cols: string) {
        const filters: Record<string, unknown> = {};
        const builder = {
          eq(col: string, val: unknown) {
            filters[col] = val;
            return builder;
          },
          maybeSingle() {
            for (const row of store.values()) {
              if (
                (filters.endpoint === undefined || row.endpoint === filters.endpoint) &&
                (filters.key_hash === undefined || row.key_hash === filters.key_hash) &&
                (filters.id === undefined || row.id === filters.id)
              ) {
                return Promise.resolve({ data: { ...row }, error: null });
              }
            }
            return Promise.resolve({ data: null, error: null });
          },
        };
        return builder;
      },
      update(patch: Partial<Row>) {
        return {
          eq(col: string, val: unknown) {
            for (const row of store.values()) {
              if ((row as unknown as Record<string, unknown>)[col] === val) {
                Object.assign(row, patch);
              }
            }
            return Promise.resolve({ data: null, error: null });
          },
        };
      },
    };
  };

  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    client: { from } as any,
    stats: () => ({ inserts, uniqueViolations, size: store.size }),
    dump: () => Array.from(store.values()),
  };
}

const ENDPOINT = "calcular-folha";
const KEY = "test-key-abc-1234567890";
const payload = { empresa_id: "e1", competencia: "2026-07", user_id: "u1" };

// ────────────────────────────────────────────────────────────────────────────────
// TESTES
// ────────────────────────────────────────────────────────────────────────────────

Deno.test("idempotency: primeira chamada retorna reason=NEW e id válido", async () => {
  const { client } = createMockAdmin();
  const res = await beginIdempotency(client, {
    endpoint: ENDPOINT,
    key: KEY,
    requestBody: payload,
    empresaId: payload.empresa_id,
    userId: payload.user_id,
  });
  assertEquals(res.reason, "NEW");
  assert(res.id);
  assert(!res.replay && !res.conflict);
});

Deno.test("idempotency: 20 requisições concorrentes com MESMA key produzem exatamente 1 NEW", async () => {
  const { client, stats } = createMockAdmin();

  const runs = await Promise.all(
    Array.from({ length: 20 }, () =>
      beginIdempotency(client, {
        endpoint: ENDPOINT,
        key: KEY,
        requestBody: payload,
        empresaId: payload.empresa_id,
        userId: payload.user_id,
      }),
    ),
  );

  const news = runs.filter((r) => r.reason === "NEW");
  const inProgress = runs.filter((r) => r.reason === "IN_PROGRESS");

  assertEquals(news.length, 1, "apenas UM insert deve vencer a corrida");
  assertEquals(inProgress.length, 19, "os 19 restantes devem receber IN_PROGRESS");
  inProgress.forEach((r) => {
    assert(r.conflict, "IN_PROGRESS deve retornar Response de conflito");
    assertEquals(r.existingId, news[0].id, "existingId deve apontar para o vencedor");
  });

  // Todas as 20 tentativas geraram INSERT; apenas 1 sucesso na store.
  const s = stats();
  assertEquals(s.inserts, 20);
  assertEquals(s.uniqueViolations, 19);
  assertEquals(s.size, 1);

  // Consome bodies (Deno leak guard)
  await Promise.all(inProgress.map((r) => r.conflict!.text()));
});

Deno.test("idempotency: reenvio após conclusão retorna REPLAY com mesmo body", async () => {
  const { client } = createMockAdmin();

  const first = await beginIdempotency(client, {
    endpoint: ENDPOINT, key: KEY, requestBody: payload,
    empresaId: payload.empresa_id, userId: payload.user_id,
  });
  assertEquals(first.reason, "NEW");

  const responseBody = { success: true, folha_id: "f1", integrity_hash: "abc123" };
  await completeIdempotency(client, first.id!, 200, responseBody);

  // Múltiplos reenvios (usuário clicando várias vezes)
  const replays = await Promise.all(
    Array.from({ length: 5 }, () =>
      beginIdempotency(client, {
        endpoint: ENDPOINT, key: KEY, requestBody: payload,
        empresaId: payload.empresa_id, userId: payload.user_id,
      }),
    ),
  );

  for (const r of replays) {
    assertEquals(r.reason, "REPLAY");
    assert(r.replay);
    assertEquals(r.replay!.headers.get("Idempotent-Replay"), "true");
    const body = await r.replay!.json();
    assertEquals(body, responseBody, "replay deve devolver body idêntico ao original");
  }
});

Deno.test("idempotency: mesma key com payload divergente → KEY_REUSE (409)", async () => {
  const { client } = createMockAdmin();

  const first = await beginIdempotency(client, {
    endpoint: ENDPOINT, key: KEY, requestBody: payload,
    empresaId: payload.empresa_id, userId: payload.user_id,
  });
  assertEquals(first.reason, "NEW");
  await completeIdempotency(client, first.id!, 200, { ok: true });

  const reuse = await beginIdempotency(client, {
    endpoint: ENDPOINT,
    key: KEY,
    requestBody: { ...payload, competencia: "2026-08" }, // payload diferente!
    empresaId: payload.empresa_id,
    userId: payload.user_id,
  });

  assertEquals(reuse.reason, "KEY_REUSE");
  assert(reuse.conflict);
  assertEquals(reuse.conflict!.status, 409);
  const body = await reuse.conflict!.json();
  assertEquals(body.error.code, "IDEMPOTENCY_KEY_REUSE");

});

Deno.test("idempotency: canonicalização ignora ordem de chaves no payload", async () => {
  const { client } = createMockAdmin();

  const a = await beginIdempotency(client, {
    endpoint: ENDPOINT, key: KEY,
    requestBody: { empresa_id: "e1", competencia: "2026-07", user_id: "u1" },
  });
  await completeIdempotency(client, a.id!, 200, { ok: true });

  const b = await beginIdempotency(client, {
    endpoint: ENDPOINT, key: KEY,
    // mesmas propriedades, ordem diferente → mesmo request_hash
    requestBody: { user_id: "u1", competencia: "2026-07", empresa_id: "e1" },
  });

  assertEquals(b.reason, "REPLAY", "ordem de chaves não pode invalidar idempotência");
  await b.replay!.text();
});

Deno.test("idempotency: sem header → skipped=true, segue sem persistir", async () => {
  const { client, stats } = createMockAdmin();
  const res = await beginIdempotency(client, {
    endpoint: ENDPOINT, key: null, requestBody: payload,
  });
  assertEquals(res.skipped, true);
  assertEquals(stats().size, 0);
});

Deno.test("idempotency: key com formato inválido → 400 IDEMPOTENCY_KEY_INVALID", async () => {
  const { client } = createMockAdmin();
  const res = await beginIdempotency(client, {
    endpoint: ENDPOINT, key: "curta", requestBody: payload,
  });
  assertEquals(res.reason, "KEY_INVALID");
  assert(res.conflict);
  assertEquals(res.conflict!.status, 400);
  await res.conflict!.text();
});

Deno.test("idempotency: retentativa após failed é permitida (RETRY_AFTER_FAILURE)", async () => {
  const { client } = createMockAdmin();

  const first = await beginIdempotency(client, {
    endpoint: ENDPOINT, key: KEY, requestBody: payload,
  });
  assertEquals(first.reason, "NEW");
  // Marca como failed (ex.: erro interno)
  await completeIdempotency(client, first.id!, 500, { error: "boom" });

  const retry = await beginIdempotency(client, {
    endpoint: ENDPOINT, key: KEY, requestBody: payload,
  });
  assertEquals(retry.reason, "RETRY_AFTER_FAILURE");
  assert(retry.id);
  assert(!retry.conflict && !retry.replay);
});
