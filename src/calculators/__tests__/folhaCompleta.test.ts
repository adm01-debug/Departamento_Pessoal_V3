import { describe, it, expect } from 'vitest';
import { calcularFolhaCompleta, calcularSalarioLiquido } from '../folhaCompleta';

describe('calcularFolhaCompleta', () => {
  const base = { salarioBase: 3000 };

  it('returns all top-level keys', () => {
    const result = calcularFolhaCompleta(base);
    expect(result).toHaveProperty('proventos');
    expect(result).toHaveProperty('descontos');
    expect(result).toHaveProperty('fgts');
    expect(result).toHaveProperty('salarioLiquido');
    expect(result).toHaveProperty('lancamentos');
  });

  it('proventos.totalProventos equals salarioBase when no extras', () => {
    const result = calcularFolhaCompleta(base);
    expect(result.proventos.totalProventos).toBe(3000);
  });

  it('proventos.salarioBase is the original base', () => {
    const result = calcularFolhaCompleta({ salarioBase: 5000 });
    expect(result.proventos.salarioBase).toBe(5000);
  });

  it('fgts is 8% of totalProventos', () => {
    const result = calcularFolhaCompleta({ salarioBase: 3000 });
    expect(result.fgts).toBeCloseTo(3000 * 0.08, 1);
  });

  it('INSS is deducted from totalProventos', () => {
    const result = calcularFolhaCompleta({ salarioBase: 3000 });
    expect(result.descontos.inss).toBeGreaterThan(0);
  });

  it('salarioLiquido = totalProventos - totalDescontos', () => {
    const result = calcularFolhaCompleta({ salarioBase: 3000 });
    expect(result.salarioLiquido).toBeCloseTo(
      result.proventos.totalProventos - result.descontos.totalDescontos, 1
    );
  });

  it('periculosidade adds 30% of base', () => {
    const with_ = calcularFolhaCompleta({ salarioBase: 3000, periculosidade: true });
    const without = calcularFolhaCompleta({ salarioBase: 3000, periculosidade: false });
    expect(with_.proventos.periculosidade).toBeGreaterThan(0);
    expect(with_.proventos.totalProventos).toBeGreaterThan(without.proventos.totalProventos);
  });

  it('insalubridade adds a non-zero adicional for grau "medio"', () => {
    const result = calcularFolhaCompleta({ salarioBase: 3000, insalubridade: 'medio' });
    expect(result.proventos.insalubridade).toBeGreaterThan(0);
  });

  it('lancamentos contains at least the Salário Base entry', () => {
    const result = calcularFolhaCompleta({ salarioBase: 3000 });
    const baseEntry = result.lancamentos.find(l => l.codigo === '1000');
    expect(baseEntry).toBeDefined();
    expect(baseEntry?.tipo).toBe('provento');
    expect(baseEntry?.valor).toBe(3000);
  });

  it('lancamentos includes INSS entry', () => {
    const result = calcularFolhaCompleta({ salarioBase: 3000 });
    const inssEntry = result.lancamentos.find(l => l.codigo === '5000');
    expect(inssEntry).toBeDefined();
    expect(inssEntry?.tipo).toBe('desconto');
  });

  it('valeTransporte is deducted when provided', () => {
    const result = calcularFolhaCompleta({ salarioBase: 3000, valeTransporte: 400 });
    expect(result.descontos.valeTransporte).toBeGreaterThan(0);
  });

  it('horasExtras50 adds extra proventos', () => {
    const without = calcularFolhaCompleta({ salarioBase: 3000 });
    const with_ = calcularFolhaCompleta({ salarioBase: 3000, horasExtras50: 10 });
    expect(with_.proventos.totalProventos).toBeGreaterThan(without.proventos.totalProventos);
  });
});

describe('calcularSalarioLiquido', () => {
  it('returns all expected fields', () => {
    const result = calcularSalarioLiquido({ salarioBruto: 3000 });
    expect(result).toHaveProperty('salarioBruto');
    expect(result).toHaveProperty('inss');
    expect(result).toHaveProperty('irrf');
    expect(result).toHaveProperty('fgts');
    expect(result).toHaveProperty('totalDescontos');
    expect(result).toHaveProperty('liquido');
  });

  it('fgts is 8% of bruto', () => {
    const result = calcularSalarioLiquido({ salarioBruto: 5000 });
    expect(result.fgts).toBeCloseTo(400, 1);
  });

  it('liquido = salarioBruto - totalDescontos', () => {
    const result = calcularSalarioLiquido({ salarioBruto: 3000 });
    expect(result.liquido).toBeCloseTo(result.salarioBruto - result.totalDescontos, 1);
  });

  it('valeTransporte reduces liquido', () => {
    const without = calcularSalarioLiquido({ salarioBruto: 3000 });
    const with_ = calcularSalarioLiquido({ salarioBruto: 3000, valeTransporte: 400 });
    expect(with_.liquido).toBeLessThan(without.liquido);
    expect(with_.descontoVT).toBeGreaterThan(0);
  });

  it('dependentes reduces IRRF', () => {
    const with0 = calcularSalarioLiquido({ salarioBruto: 5000, dependentes: 0 });
    const with2 = calcularSalarioLiquido({ salarioBruto: 5000, dependentes: 2 });
    expect(with2.irrf).toBeLessThanOrEqual(with0.irrf);
  });
});
