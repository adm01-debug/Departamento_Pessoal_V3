// E2E — Validação de assinatura HMAC sobre `processar-ponto-offline`
// Requer PONTO_HASH_SECRET configurado no projeto Supabase (enforcement ON).
// Env: E2E_SUPABASE_URL, E2E_ANON_KEY, E2E_JWT, E2E_COLABORADOR_ID, E2E_PONTO_HASH_SECRET
// Opcionais: E2E_ORIGIN

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const url = Deno.env.get("E2E_SUPABASE_URL");
const anon = Deno.env.get("E2E_ANON_KEY");
const jwt = Deno.env.get("E2E_JWT");
const colaboradorId = Deno.env.get("E2E_COLABORADOR_ID");
const origin = Deno.env.get("E2E_ORIGIN") ?? "https://lovable.app";
const secret = Deno.env.get("E2E_PONTO_HASH_SECRET");

const canRun = Boolean(url && anon && jwt && colaboradorId && secret);

async function hmac(canonical: string, key: string): Promise<string> {
  const k = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(canonical));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function headers() {
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${jwt}`,
    "apikey": anon!,
    "Origin": origin,
  };
}

function ts(): string {
  return new Date().toISOString();
}

Deno.test({
  name: "offline: assinatura válida é aceita e batch_integrity_hash é retornado",
  ignore: !canRun,
  async fn() {
    const dispositivoId = `e2e-${crypto.randomUUID()}`;
    const timestamp = ts();
    const tipo = "entrada";
    const canonical = `${colaboradorId}|${timestamp}|${tipo}|${dispositivoId}`;
    const hash = await hmac(canonical, secret!);

    const r = await fetch(`${url}/functions/v1/processar-ponto-offline`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        registros: [{
          id: crypto.randomUUID(),
          colaborador_id: colaboradorId,
          timestamp, tipo, dispositivoId, hash,
        }],
      }),
    });
    const j = await r.json();
    assertEquals(r.status, 200, JSON.stringify(j));
    assertEquals(j.rejected_invalid_hash, 0);
    assert(typeof j.batch_integrity_hash === "string" && j.batch_integrity_hash.length === 64);
  },
});

Deno.test({
  name: "offline: assinatura forjada é rejeitada com INVALID_SIGNATURE",
  ignore: !canRun,
  async fn() {
    const r = await fetch(`${url}/functions/v1/processar-ponto-offline`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        registros: [{
          id: crypto.randomUUID(),
          colaborador_id: colaboradorId,
          timestamp: ts(),
          tipo: "entrada",
          dispositivoId: `forged-${crypto.randomUUID()}`,
          hash: "deadbeef".repeat(8), // 64 chars mas inválido
        }],
      }),
    });
    const j = await r.json();
    assertEquals(r.status, 200);
    assertEquals(j.success, true);
    assertEquals(j.rejected_invalid_hash, 1);
    assert(j.details?.[0]?.code === "INVALID_SIGNATURE");
  },
});

Deno.test({
  name: "offline: campos obrigatórios ausentes → erro contabilizado, não crash",
  ignore: !canRun,
  async fn() {
    const r = await fetch(`${url}/functions/v1/processar-ponto-offline`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ registros: [{ id: crypto.randomUUID() }] }),
    });
    const j = await r.json();
    assertEquals(r.status, 200);
    assert(j.errors >= 1);
  },
});
