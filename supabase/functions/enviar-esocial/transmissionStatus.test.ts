import { assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { transmissionHttpStatus } from './transmissionStatus.ts';

Deno.test('só confirma a transmissão eSocial quando o provedor a aceitou', () => {
  assertEquals(transmissionHttpStatus(true), 200);
  assertEquals(transmissionHttpStatus(false), 503);
});
