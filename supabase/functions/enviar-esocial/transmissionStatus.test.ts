import { assertEquals, assertThrows } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { assertSandboxAmbiente, transmissionHttpStatus } from './transmissionStatus.ts';

Deno.test('só confirma a transmissão eSocial quando o provedor a aceitou', () => {
  assertEquals(transmissionHttpStatus(true), 200);
  assertEquals(transmissionHttpStatus(false), 503);
});

Deno.test('assinador sandbox rejeita o ambiente oficial tpAmb=1', () => {
  assertEquals(assertSandboxAmbiente('2'), undefined);
  assertThrows(() => assertSandboxAmbiente('1'), Error, 'ESOCIAL_PRODUCTION_SIMULATION_FORBIDDEN');
});
