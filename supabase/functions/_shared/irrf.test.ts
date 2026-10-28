import { assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { calcIRRF } from './irrf.ts';

// Referências calculadas pela implementação do front
// (src/calculators/impostos.ts — calcularIRRF, ano 2026) — garante paridade
// exata edge × front nas fronteiras das faixas e em casos truncados.
Deno.test('calcIRRF casa com o front nas fronteiras das faixas (dep=0)', () => {
  const casos: [number, number][] = [
    [1621, 0],
    [2259.20, 0],
    [2260, 0],
    [2826.65, 0.19],
    [2826.66, 0.19],
    [3000, 13.20],
    [3751.05, 96.49],
    [3751.06, 96.50],
    [4664.68, 259.70],
    [4664.69, 259.70],
    [5000, 335.15],
    [8000, 1050.58],
    [15000, 2957.27],
  ];
  for (const [bruto, esperado] of casos) {
    assertEquals(calcIRRF(bruto, 0, '2026-01'), esperado, `bruto=${bruto}`);
  }
});

Deno.test('calcIRRF casa com o front com dependentes (dep=2)', () => {
  const casos: [number, number][] = [
    [3000, 8.47],
    [3751.05, 73.53],
    [4664.68, 199.19],
    [5000, 264.07],
    [8000, 946.30],
    [15000, 2852.99],
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
