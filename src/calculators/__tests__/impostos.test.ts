import { describe, it, expect } from 'vitest';
import { calcularINSS, calcularIRRF, calcularFGTS } from '../impostos';

describe('calcularINSS', () => {
  it('returns 0 for salary of 0', () => {
    expect(calcularINSS(0)).toBe(0);
  });

  it('returns 0 for negative salary', () => {
    expect(calcularINSS(-1000)).toBe(0);
  });

  it('returns 0 for NaN', () => {
    expect(calcularINSS(NaN)).toBe(0);
  });

  it('returns a positive number for valid salary', () => {
    expect(calcularINSS(3000)).toBeGreaterThan(0);
  });

  it('is progressive: higher salary pays more INSS', () => {
    expect(calcularINSS(5000)).toBeGreaterThan(calcularINSS(3000));
  });

  it('INSS is capped (ceiling applies)', () => {
    const high = calcularINSS(50000);
    const veryHigh = calcularINSS(100000);
    expect(high).toBe(veryHigh);
  });

  it('is less than 15% of salary (progressive rates)', () => {
    const inss = calcularINSS(3000);
    expect(inss).toBeLessThan(3000 * 0.15);
  });
});

describe('calcularIRRF', () => {
  it('returns 0 for salary of 0', () => {
    expect(calcularIRRF(0)).toBe(0);
  });

  it('returns 0 for NaN', () => {
    expect(calcularIRRF(NaN)).toBe(0);
  });

  it('returns 0 for low salary (exempt threshold)', () => {
    expect(calcularIRRF(2000)).toBe(0);
  });

  it('returns positive for high salary', () => {
    expect(calcularIRRF(10000)).toBeGreaterThan(0);
  });

  it('more dependentes = less IRRF', () => {
    const irrf0 = calcularIRRF(6000, 0);
    const irrf2 = calcularIRRF(6000, 2);
    expect(irrf2).toBeLessThanOrEqual(irrf0);
  });

  it('is non-negative', () => {
    expect(calcularIRRF(5000, 5)).toBeGreaterThanOrEqual(0);
  });
});

describe('calcularFGTS', () => {
  it('is exactly 8% of salary', () => {
    expect(calcularFGTS(3000)).toBeCloseTo(240, 1);
    expect(calcularFGTS(5000)).toBeCloseTo(400, 1);
  });

  it('returns 0 for salary of 0', () => {
    expect(calcularFGTS(0)).toBe(0);
  });

  it('returns 0 for negative salary', () => {
    expect(calcularFGTS(-100)).toBe(0);
  });

  it('scales linearly with salary', () => {
    expect(calcularFGTS(10000)).toBeCloseTo(calcularFGTS(5000) * 2, 1);
  });
});
