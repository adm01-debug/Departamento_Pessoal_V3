import { assertEquals, assertNotEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { reportEmailPayload, scheduledReportPath, stableJson } from './dispatchPayload.ts';

Deno.test('scheduled report request hashing is stable across key order', () => {
  assertEquals(stableJson({ b: 2, a: { d: 4, c: 3 } }), stableJson({ a: { c: 3, d: 4 }, b: 2 }));
  assertNotEquals(stableJson({ a: 1 }), stableJson({ a: 2 }));
});

Deno.test('scheduled report provider payload is byte-stable for a persisted occurrence', () => {
  const descriptor = { tipoRelatorio: 'folha_resumo', formato: 'csv' };
  const occurrence = new Date('2026-09-12T10:00:00.000Z');
  const first = reportEmailPayload(descriptor, 7, 'https://signed.invalid/token-1', occurrence);
  const retry = reportEmailPayload(descriptor, 7, 'https://signed.invalid/token-1', occurrence);
  assertEquals(retry, first);
  assertNotEquals(
    reportEmailPayload(descriptor, 7, 'https://signed.invalid/token-2', occurrence),
    first,
  );
});

Deno.test('scheduled report storage path cannot overwrite different content for one occurrence', () => {
  const first = scheduledReportPath('empresa', 'folha', 'dispatch', 'content-a', 'csv');
  assertEquals(first, scheduledReportPath('empresa', 'folha', 'dispatch', 'content-a', 'csv'));
  assertNotEquals(first, scheduledReportPath('empresa', 'folha', 'dispatch', 'content-b', 'csv'));
});
