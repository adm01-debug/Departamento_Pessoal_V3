import { describe, it, expect } from 'vitest';
import { calcularHorasExtras, calcularDSR, calcular13Salario } from '../trabalhista-base';

describe('calcularHorasExtras (trabalhista-base)', () => {
  it('returns 0 for 0 hours', () => {
    expect(calcularHorasExtras(3000, 220, 0)).toBe(0);
  });

  it('returns 0 for negative hours', () => {
    expect(calcularHorasExtras(3000, 220, -5)).toBe(0);
  });

  it('50% adicional: 1 hour = (salary/jornada) * 1.5', () => {
    const valorHora = 3000 / 220;
    expect(calcularHorasExtras(3000, 220, 1, 0.5)).toBeCloseTo(valorHora * 1.5, 1);
  });

  it('100% adicional: 1 hour = (salary/jornada) * 2.0', () => {
    const valorHora = 3000 / 220;
    expect(calcularHorasExtras(3000, 220, 1, 1.0)).toBeCloseTo(valorHora * 2.0, 1);
  });

  it('scales with number of hours', () => {
    const h1 = calcularHorasExtras(3000, 220, 10, 0.5);
    const h2 = calcularHorasExtras(3000, 220, 20, 0.5);
    expect(h2).toBeCloseTo(h1 * 2, 1);
  });
});

describe('calcularDSR (trabalhista-base)', () => {
  it('returns 0 for totalVariavel=0', () => {
    expect(calcularDSR(0)).toBe(0);
  });

  it('returns 0 for negative totalVariavel', () => {
    expect(calcularDSR(-100)).toBe(0);
  });

  it('calculates DSR correctly', () => {
    expect(calcularDSR(1000, 26, 4)).toBeCloseTo((1000 / 26) * 4, 1);
  });

  it('DSR increases with more feriados/domingos', () => {
    expect(calcularDSR(1000, 26, 5)).toBeGreaterThan(calcularDSR(1000, 26, 4));
  });
});

describe('calcular13Salario', () => {
  it('parcela 1 = 50% of proportional value', () => {
    expect(calcular13Salario(3000, 12, 1)).toBeCloseTo(1500, 1);
  });

  it('parcela 2 = full proportional value', () => {
    expect(calcular13Salario(3000, 12, 2)).toBeCloseTo(3000, 1);
  });

  it('proportional for 6 months', () => {
    expect(calcular13Salario(3000, 6, 2)).toBeCloseTo(1500, 1);
  });

  it('proportional for 1 month', () => {
    expect(calcular13Salario(3000, 1, 2)).toBeCloseTo(250, 1);
  });
});
