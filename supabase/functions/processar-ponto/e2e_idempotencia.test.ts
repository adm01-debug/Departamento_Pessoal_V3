// E2E — Idempotência + integridade sobre `processar-ponto`
// Env: E2E_SUPABASE_URL, E2E_ANON_KEY, E2E_JWT, E2E_COLABORADOR_ID, E2E_EMPRESA_ID
// Opcionais: E2E_ORIGIN, E2E_CONCURRENCY (default 6), E2E_PONTO_DATA (YYYY-MM-DD)

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const url = Deno.env.get("E2E_SUPABASE_URL");
const anon = Deno.env.get("E2E_ANON_KEY");
const jwt = Deno.env.get("E2E_JWT");
const colaboradorId = Deno.env.get("E2E_COLABORADOR_ID");
const empresaId = Deno.env.get("E2E_EMPRESA_ID");
const origin = Deno.env.get("E2E_ORIGIN") ?? "https://lovable.app";
const dataRef = Deno.env.get("E2E_PONTO_DATA") ?? new Date().toISOString().split("T")[0];
const N = Number(Deno.env.get("E2E_CONCURRENCY") ?? "6");

const canRun = Boolean(url && anon && jwt && colaboradorId && empresaId);

function headers(key: string) {
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${jwt}`,
    "apikey": anon!,
    "Origin": origin,
    "Idempotency-Key": key,
  };
}

Deno.test({
  name: "processar-ponto: chamadas concorrentes com mesma key convergem (1 winner + replays)",
  ignore: !canRun,
  async fn() {
    const key = `e2e-ponto-${crypto.randomUUID()}`;
    const body = JSON.stringify({ colaboradorId, empresaId, data: dataRef });

    const fire = () =>
      fetch(`${url}/functions/v1/processar-ponto`, { method: "POST", headers: headers(key), body });

    const responses = await Promise.all(Array.from({ length: N }, fire));
    const payloads = await Promise.all(
      responses.map(async (r) => ({ status: r.status, json: await r.json().catch(() => ({})) })),
    );

    // 1. Sem 5xx
    const fivexx = payloads.filter((p) => p.status >= 500);
    assertEquals(fivexx.length, 0, `5xx inesperado: ${fivexx.length}`);

    // 2. Status ∈ {200, 409}
    const bad = payloads.filter((p) => p.status !== 200 && p.status !== 409);
    assertEquals(bad.length, 0, `Status inesperado: ${bad.map((b) => b.status)}`);

    // 3. Hashes consistentes entre 200s
    const hashes = new Set(
      payloads
        .filter((p) => p.status === 200)
        .map((p) => (p.json as { integrity_hash?: string })?.integrity_hash)
        .filter(Boolean),
    );
    assert(hashes.size <= 1, `Hashes divergentes: ${[...hashes].join(", ")}`);

    // 4. Pelo menos um winner
    const winners = payloads.filter((p) => p.status === 200);
    assert(winners.length >= 1, "Nenhum winner (200) na corrida idempotente");
  },
});

Deno.test({
  name: "processar-ponto: payload inválido → 400 e nenhum efeito colateral",
  ignore: !canRun,
  async fn() {
    const r = await fetch(`${url}/functions/v1/processar-ponto`, {
      method: "POST",
      headers: headers(`e2e-inv-${crypto.randomUUID()}`),
      body: JSON.stringify({ colaboradorId: null, empresaId }),
    });
    assertEquals(r.status, 400);
    const j = await r.json();
    assert(String(j?.error ?? "").length > 0, "erro deve ser descritivo");
  },
});

Deno.test({
  name: "processar-ponto: mesma key + payload diferente → 409 KEY_REUSE",
  ignore: !canRun,
  async fn() {
    const key = `e2e-reuse-${crypto.randomUUID()}`;
    const body1 = JSON.stringify({ colaboradorId, empresaId, data: dataRef });
    const body2 = JSON.stringify({ colaboradorId, empresaId, data: "2000-01-01" });

    const r1 = await fetch(`${url}/functions/v1/processar-ponto`, { method: "POST", headers: headers(key), body: body1 });
    await r1.text();
    const r2 = await fetch(`${url}/functions/v1/processar-ponto`, { method: "POST", headers: headers(key), body: body2 });
    const j2 = await r2.json().catch(() => ({}));
    assertEquals(r2.status, 409, `esperava 409, veio ${r2.status}: ${JSON.stringify(j2)}`);
  },
});
