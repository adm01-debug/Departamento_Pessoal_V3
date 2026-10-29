import { assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { calcIRRF } from './irrf.ts';

// Referências calculadas pela implementação do front
// (src/calculators/impostos.ts — calcularIRRF, ano 2026, Lei 15.270/2025) —
// garante paridade exata edge × front nas fronteiras das faixas e em casos
// truncados. Brutos ≤ R$ 5.000 zeram o imposto (redução até R$ 312,89).
Deno.test('calcIRRF casa com o front nas fronteiras das faixas (dep=0)', () => {
  const casos: [number, number][] = [
    [1621, 0],
    [2259.20, 0],
    [2260, 0],
    [2826.65, 0],
    [2826.66, 0],
    [3000, 0],
    [3751.05, 0],
    [3751.06, 0],
    [4664.68, 0],
    [4664.69, 0],
    [5000, 0],
    [6000, 385.11],
    [7350, 884.13],
    [8000, 1037.86],
    [15000, 2944.55],
  ];
  for (const [bruto, esperado] of casos) {
    assertEquals(calcIRRF(bruto, 0, '2026-01'), esperado, `bruto=${bruto}`);
  }
});

Deno.test('calcIRRF casa com o front com dependentes (dep=2)', () => {
  const casos: [number, number][] = [
    [3000, 0],
    [3751.05, 0],
    [4664.68, 0],
    [5000, 0],
    [6000, 280.83],
    [8000, 933.58],
    [15000, 2840.27],
  ];
  for (const [bruto, esperado] of casos) {
    assertEquals(calcIRRF(bruto, 2, '2026-01'), esperado, `bruto=${bruto}`);
  }
});

Deno.test('calcIRRF devolve 0 para entradas inválidas', () => {
  assertEquals(calcIRRF(0, 0, '2026-01'), 0);
  assertEquals(calcIRRF(-500, 0, '2026-01'), 0);
  assertEquals(calcIRRF(NaN, 0, '2026-01'), 0);
});
