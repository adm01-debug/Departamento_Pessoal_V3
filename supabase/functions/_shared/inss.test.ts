import { assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { calcularINSS, calcularINSSCents } from './inss.ts';

// Valores-âncora iguais aos de gerar-holerite/inss.test.ts (tabela 2026 oficial)
Deno.test('calcularINSS usa a tabela progressiva 2026', () => {
  assertEquals(calcularINSS(1621), 121.57);
  assertEquals(calcularINSS(2902.84), 236.94);
  assertEquals(calcularINSS(50_000), 988.09);
  assertEquals(calcularINSS(0), 0);
  assertEquals(calcularINSS(-500), 0);
  assertEquals(calcularINSS(NaN), 0);
});

Deno.test('calcularINSSCents devolve os mesmos valores em centavos', () => {
  assertEquals(calcularINSSCents(162_100n), 12_157n);
  assertEquals(calcularINSSCents(290_284n), 23_694n);
  assertEquals(calcularINSSCents(5_000_000n), 98_809n);
  assertEquals(calcularINSSCents(0n), 0n);
  assertEquals(calcularINSSCents(-10_000n), 0n);
});
