// E2E — Concorrência sobre `fechar-folha`
// Dispara N chamadas paralelas com a MESMA Idempotency-Key e valida:
//   1) Nenhuma resposta 5xx
//   2) Status ∈ {200, 409}
//   3) integrity_hash consistente entre 200s
//   4) Ao menos um winner (200)
//
// Env obrigatórios: E2E_SUPABASE_URL, E2E_ANON_KEY, E2E_JWT, E2E_FOLHA_ID
// Opcionais: E2E_ORIGIN, E2E_CONCURRENCY (default 8)

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const url = Deno.env.get("E2E_SUPABASE_URL");
const anon = Deno.env.get("E2E_ANON_KEY");
const jwt = Deno.env.get("E2E_JWT");
const folhaId = Deno.env.get("E2E_FOLHA_ID");
const origin = Deno.env.get("E2E_ORIGIN") ?? "https://lovable.app";
const N = Number(Deno.env.get("E2E_CONCURRENCY") ?? "8");

const canRun = Boolean(url && anon && jwt && folhaId);

Deno.test({
  name: "fechar-folha: N chamadas paralelas com mesma Idempotency-Key convergem",
  ignore: !canRun,
  async fn() {
    const key = `e2e-close-${crypto.randomUUID()}`;
    const body = JSON.stringify({ folha_id: folhaId, idempotency_key: key });

    const fire = () =>
      fetch(`${url}/functions/v1/fechar-folha`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${jwt}`,
          "apikey": anon!,
          "Origin": origin,
          "Idempotency-Key": key,
        },
        body,
      });

    const responses = await Promise.all(Array.from({ length: N }, fire));
    const payloads = await Promise.all(responses.map(async (r) => ({
      status: r.status,
      json: await r.json().catch(() => ({})),
    })));

    const fivexx = payloads.filter((p) => p.status >= 500);
    assertEquals(fivexx.length, 0, `5xx: ${fivexx.length}`);

    const bad = payloads.filter((p) => p.status !== 200 && p.status !== 409);
    assertEquals(bad.length, 0, `Status inesperado: ${bad.map((b) => b.status)}`);

    const okHashes = new Set(
      payloads
        .filter((p) => p.status === 200)
        .map((p) => (p.json as { integrity_hash?: string })?.integrity_hash)
        .filter(Boolean),
    );
    assert(okHashes.size <= 1, `Hashes divergentes: ${[...okHashes].join(", ")}`);

    const okCount = payloads.filter((p) => p.status === 200).length;
    assert(okCount >= 1, "Nenhum winner");
  },
});
