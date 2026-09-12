import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { extractTenantWriteScope, hasCompleteTenantWriteScope } from './tenantScope.ts';

Deno.test('tenant write scope accepts only fully scoped business rows', () => {
  const scope = extractTenantWriteScope('folhas_pagamento', [
    { empresa_id: 'empresa-a', competencia: '2026-09' },
    { empresa_id: 'empresa-a', competencia: '2026-10' },
  ]);

  assertEquals(scope.rowCount, 2);
  assertEquals([...scope.empresaIds], ['empresa-a']);
  assertEquals(scope.missingTenantRows, 0);
  assertEquals(hasCompleteTenantWriteScope(scope), true);
});

Deno.test('tenant write scope fails closed when any bulk row omits empresa_id', () => {
  const scope = extractTenantWriteScope('folhas_pagamento', [
    { empresa_id: 'empresa-a', competencia: '2026-09' },
    { competencia: '2026-10' },
  ]);

  assertEquals(scope.missingTenantRows, 1);
  assertEquals(hasCompleteTenantWriteScope(scope), false);
});

Deno.test('tenant write scope rejects an empty or malformed tenant identifier', () => {
  for (const data of [undefined, {}, { empresa_id: '' }, { empresa_id: '   ' }, { empresa_id: null }]) {
    assertEquals(hasCompleteTenantWriteScope(extractTenantWriteScope('folhas_pagamento', data)), false);
  }
});

Deno.test('company writes scope by their explicit company id', () => {
  const scope = extractTenantWriteScope('empresas', { id: 'empresa-nova', razao_social: 'Nova Ltda.' });

  assertEquals([...scope.empresaIds], ['empresa-nova']);
  assertEquals(scope.missingTenantRows, 0);
  assertEquals(hasCompleteTenantWriteScope(scope), true);
});
