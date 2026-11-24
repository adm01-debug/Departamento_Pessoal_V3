// Fase 7 — Testa determinismo e canonicalização do helper de hash de integridade.
// Garante que os 3 endpoints (calcular/fechar/reabrir) produzam SEMPRE o mesmo
// hash para o mesmo snapshot lógico, independente da ordem das chaves.

import { assert, assertEquals, assertNotEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { canonicalize, integrityHash, sha256Hex } from './integrityHash.ts';

Deno.test('canonicalize: ordena chaves recursivamente', () => {
  const a = canonicalize({ b: 1, a: { z: 9, a: 1 } });
  const b = canonicalize({ a: { a: 1, z: 9 }, b: 1 });
  assertEquals(a, b);
  assertEquals(a, '{"a":{"a":1,"z":9},"b":1}');
});

Deno.test('canonicalize: arrays preservam ordem', () => {
  assertEquals(canonicalize([3, 1, 2]), '[3,1,2]');
  assertNotEquals(canonicalize([1, 2, 3]), canonicalize([3, 2, 1]));
});

Deno.test('canonicalize: null e primitivos', () => {
  assertEquals(canonicalize(null), 'null');
  assertEquals(canonicalize(42), '42');
  assertEquals(canonicalize('x'), '"x"');
  assertEquals(canonicalize(undefined), 'null');
});

Deno.test('integrityHash: determinístico para mesmo snapshot lógico', async () => {
  const snap1 = {
    empresa_id: 'e-1',
    competencia: '2026-06',
    total_liquido: 12345.67,
    itens_count: 42,
  };
  const snap2 = {
    itens_count: 42,
    total_liquido: 12345.67,
    competencia: '2026-06',
    empresa_id: 'e-1',
  };
  const h1 = await integrityHash(snap1);
  const h2 = await integrityHash(snap2);
  assertEquals(h1, h2);
  assertEquals(h1.length, 64);
  assert(/^[0-9a-f]{64}$/.test(h1));
});

Deno.test('integrityHash: qualquer mudança de valor altera o hash', async () => {
  const base = { v: 1, x: 'a' };
  const changed = { v: 1, x: 'b' };
  const h1 = await integrityHash(base);
  const h2 = await integrityHash(changed);
  assertNotEquals(h1, h2);
});

Deno.test('sha256Hex: RFC vector — "abc"', async () => {
  const h = await sha256Hex('abc');
  assertEquals(h, 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});
