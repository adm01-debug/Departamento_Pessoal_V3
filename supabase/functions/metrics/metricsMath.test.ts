import { assertEquals, assertThrows } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { calculateErrorRate } from './metricsMath.ts';

Deno.test('calcula taxa de erro a partir do total de consultas', () => {
  assertEquals(calculateErrorRate(3, 200), 0.015);
});

Deno.test('retorna zero quando não houve consultas no período', () => {
  assertEquals(calculateErrorRate(0, 0), 0);
});

Deno.test('limita uma contagem inconsistente ao máximo matemático da taxa', () => {
  assertEquals(calculateErrorRate(12, 10), 1);
});

Deno.test('rejeita contagens inválidas para não publicar métrica enganosa', () => {
  assertThrows(() => calculateErrorRate(-1, 10), TypeError);
  assertThrows(() => calculateErrorRate(1, Number.NaN), TypeError);
});
