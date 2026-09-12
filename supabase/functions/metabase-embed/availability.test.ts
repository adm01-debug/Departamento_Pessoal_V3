import { assertEquals, assertFalse } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { METABASE_UNAVAILABLE_MESSAGE, metabaseUnavailablePayload } from './availability.ts';

Deno.test('indisponibilidade do Metabase nunca anuncia fallback com dados de demonstração', () => {
  const payload = metabaseUnavailablePayload(4);

  assertFalse(payload.metabaseOk);
  assertEquals(payload.dashboardId, 4);
  assertEquals(payload.message, METABASE_UNAVAILABLE_MESSAGE);
  assertFalse(Object.hasOwn(payload, 'fallback'));
  assertFalse(Object.hasOwn(payload, 'filterParams'));
});
