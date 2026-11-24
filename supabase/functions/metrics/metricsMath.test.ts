import { assertEquals, assertThrows } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import {
  calculateErrorRate,
  calculateMetricsHttpStatus,
  calculateOverallHealthStatus,
} from './metricsMath.ts';

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

Deno.test('não declara saúde geral quando a verificação do bridge falha', () => {
  assertEquals(calculateOverallHealthStatus(true, true, false), 0);
  assertEquals(calculateOverallHealthStatus(true, false, true), 0);
  assertEquals(calculateOverallHealthStatus(false, true, true), 0);
  assertEquals(calculateOverallHealthStatus(true, true, true), 1);
});

Deno.test('falha fechada no HTTP quando saúde ou coleta de telemetria está degradada', () => {
  assertEquals(calculateMetricsHttpStatus(1, 1), 200);
  assertEquals(calculateMetricsHttpStatus(0, 1), 503);
  assertEquals(calculateMetricsHttpStatus(1, 0), 503);
  assertEquals(calculateMetricsHttpStatus(0, 0), 503);
});
