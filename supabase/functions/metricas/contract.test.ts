import { assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { metricasSchema } from '../_shared/schemas/common.ts';

Deno.test('metricas accepts a canonical company UUID', () => {
  const result = metricasSchema.safeParse({ empresaId: '00000000-0000-0000-0000-000000000000' });
  assertEquals(result.success, true);
});

Deno.test('metricas rejects malformed or absent tenant identifiers', () => {
  for (const payload of [{ empresaId: 'invalid-uuid' }, {}, { empresaId: null }]) {
    const result = metricasSchema.safeParse(payload);
    assertEquals(result.success, false);
    if (!result.success) assertEquals(result.error.issues[0]?.path, ['empresaId']);
  }
});
