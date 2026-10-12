import { assertEquals, assertThrows } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { calcularINSS, calcularINSSCents } from './inss.ts';

Deno.test('calcularINSS usa a tabela progressiva 2026', () => {
  assertEquals(calcularINSS(1621, '2026-01'), 121.57);
  assertEquals(calcularINSS(2902.84, '2026-01'), 236.94);
  assertEquals(calcularINSS(50_000, '2026-01'), 988.09);
  assertEquals(calcularINSS(0, '2026-01'), 0);
  assertEquals(calcularINSS(-500, '2026-01'), 0);
  assertEquals(calcularINSS(NaN, '2026-01'), 0);
});

Deno.test('calcularINSS seleciona a tabela pelo ano da referência', () => {
  // Teto 2025 (Portaria MPS/MF nº 6/2025): R$ 951,63
  assertEquals(calcularINSS(50_000, '2025-12'), 951.63);
  assertEquals(calcularINSS(1518, '2025-06'), 113.85);
  // Referência por data ('YYYY-MM-DD') também funciona
  assertEquals(calcularINSS(50_000, '2025-12-15'), 951.63);
});

Deno.test('helpers float e cents devolvem o mesmo valor exato', () => {
  // 1.700,50: exato = 128,730 — acumular em float antes do trunc daria 128,72
  assertEquals(calcularINSS(1700.5, '2026-01'), 128.73);
  assertEquals(calcularINSSCents(170_050n, '2026-01'), 12_873n);
});

Deno.test('calcularINSSCents devolve os mesmos valores em centavos', () => {
  assertEquals(calcularINSSCents(162_100n, '2026-01'), 12_157n);
  assertEquals(calcularINSSCents(290_284n, '2026-01'), 23_694n);
  assertEquals(calcularINSSCents(5_000_000n, '2026-01'), 98_809n);
  assertEquals(calcularINSSCents(0n, '2026-01'), 0n);
  assertEquals(calcularINSSCents(-10_000n, '2026-01'), 0n);
});

Deno.test('ano sem tabela homologada falha fechado', () => {
  assertThrows(() => calcularINSS(5000, '2024-01'), Error, 'não homologada');
  assertThrows(() => calcularINSSCents(500_000n, '2030-01'), Error, 'não homologada');
});
