import { assertEquals, assertThrows } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { calcularInssEmpregado } from './inss.ts';

Deno.test('INSS uses the 2025 progressive table for a 2025 competence', () => {
  assertEquals(calcularInssEmpregado(1518, '2025-12'), 113.85);
  assertEquals(calcularInssEmpregado(50_000, '2025-12'), 951.63);
});

Deno.test('INSS uses the official 2026 progressive table and ceiling', () => {
  // IN RFB 2110/2022: o total é truncado na 2ª casa (não arredondado).
  // 1.621,00 × 7,5% = 121,575 → 121,57.
  assertEquals(calcularInssEmpregado(1621, '2026-01'), 121.57);
  assertEquals(calcularInssEmpregado(2902.84, '2026-06'), 236.94);
  assertEquals(calcularInssEmpregado(50_000, '2026-12'), 988.09);
});

Deno.test('INSS fails closed for a competence without a homologated table', () => {
  assertThrows(() => calcularInssEmpregado(3000, '2027-01'), Error, 'Tabela INSS não homologada');
  assertThrows(() => calcularInssEmpregado(3000, '2026-13'), Error, 'Tabela INSS não homologada');
  // Base não positiva não tributa — retorna 0 antes de avaliar a tabela.
  assertEquals(calcularInssEmpregado(0, '2027-01'), 0);
});
