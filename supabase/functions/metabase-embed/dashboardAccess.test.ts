import { assert, assertFalse } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { isConfiguredDashboard } from './dashboardAccess.ts';

Deno.test('somente dashboards explicitamente configurados podem receber embed assinado', () => {
  assert(isConfiguredDashboard(1));
  assert(isConfiguredDashboard(4));
  assertFalse(isConfiguredDashboard(0));
  assertFalse(isConfiguredDashboard(5));
  assertFalse(isConfiguredDashboard(Number.NaN));
});
