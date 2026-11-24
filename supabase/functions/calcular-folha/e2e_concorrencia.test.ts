// E2E — Fase 2: concorrência real sobre `calcular-folha`
// -------------------------------------------------------
// Este teste dispara N chamadas paralelas com a MESMA Idempotency-Key
// contra a edge function já deployada e valida:
//   1) Apenas uma resposta 200 (winner) — as demais são 409 IN_PROGRESS ou 200 REPLAY.
//   2) Todas as respostas 200 têm o mesmo `integrity_hash`.
//   3) Nenhuma resposta 5xx (sem race conditions).
//
// Pré-requisitos (exportar antes de rodar):
//   E2E_SUPABASE_URL           — ex.: https://<ref>.supabase.co
//   E2E_ANON_KEY               — anon key para o header apikey
//   E2E_JWT                    — access_token de um usuário com acesso à empresa
//   E2E_EMPRESA_ID             — uuid da empresa
//   E2E_COMPETENCIA            — YYYY-MM (padrão: mês corrente)
//   E2E_ORIGIN                 — Origin permitido (padrão: https://lovable.app)
//   E2E_CONCURRENCY            — nº de chamadas paralelas (padrão: 10)
//
// Executar:
//   deno test --allow-net --allow-env supabase/functions/calcular-folha/e2e_concorrencia.test.ts
//
// Este arquivo é IGNORADO quando as variáveis não estão presentes — não quebra CI padrão.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const url = Deno.env.get("E2E_SUPABASE_URL");
const anon = Deno.env.get("E2E_ANON_KEY");
const jwt = Deno.env.get("E2E_JWT");
const empresaId = Deno.env.get("E2E_EMPRESA_ID");
const competencia = Deno.env.get("E2E_COMPETENCIA") ??
  new Date().toISOString().slice(0, 7);
const origin = Deno.env.get("E2E_ORIGIN") ?? "https://lovable.app";
const N = Number(Deno.env.get("E2E_CONCURRENCY") ?? "10");

const canRun = Boolean(url && anon && jwt && empresaId);

Deno.test({
  name: "calcular-folha: N chamadas paralelas com mesma Idempotency-Key convergem",
  ignore: !canRun,
  async fn() {
    const key = `e2e-${crypto.randomUUID()}`;
    const body = JSON.stringify({
      empresa_id: empresaId,
      competencia,
      idempotency_key: key,
    });

    const fire = () =>
      fetch(`${url}/functions/v1/calcular-folha`, {
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
      replay: r.headers.get("Idempotent-Replay"),
      json: await r.json().catch(() => ({})),
    })));

    // Diagnóstico legível em falhas
    console.log(JSON.stringify(payloads.map((p) => ({
      status: p.status,
      replay: p.replay,
      code: (p.json as { error?: { code?: string } })?.error?.code,
      hash: (p.json as { integrity_hash?: string })?.integrity_hash,
    })), null, 2));

    // 1) Nenhum 5xx
    const fivexx = payloads.filter((p) => p.status >= 500);
    assertEquals(fivexx.length, 0, `Respostas 5xx detectadas: ${fivexx.length}`);

    // 2) Status esperado ∈ {200, 409}
    const bad = payloads.filter((p) => p.status !== 200 && p.status !== 409);
    assertEquals(bad.length, 0, `Status inesperado: ${bad.map((b) => b.status)}`);

    // 3) integrity_hash consistente entre todas as respostas 200
    const okHashes = new Set(
      payloads
        .filter((p) => p.status === 200)
        .map((p) => (p.json as { integrity_hash?: string })?.integrity_hash)
        .filter(Boolean),
    );
    assert(okHashes.size <= 1, `Hashes divergentes: ${[...okHashes].join(", ")}`);

    // 4) Pelo menos uma resposta 200 (o winner)
    const okCount = payloads.filter((p) => p.status === 200).length;
    assert(okCount >= 1, "Nenhuma resposta 200 (winner ausente)");
  },
});
