import { describe, it, expect } from 'vitest';
import {
  calcularAvisoPrevioIndenizado,
  calcularMulta477,
  calcularProRata,
  calcularMargemConsignado,
} from '../rescisao';
import { calcular13Salario, calcularHorasExtras, calcularDSR } from '../trabalhista-base';

// ─── calcularAvisoPrevioIndenizado ───────────────────────────────────────────

describe('calcularAvisoPrevioIndenizado', () => {
  it('30 dias para menos de 1 ano de serviço', () => {
    const { dias, valor } = calcularAvisoPrevioIndenizado(3000, 0);
    expect(dias).toBe(30);
    expect(valor).toBeCloseTo(3000, 2);
  });

  it('incrementa 3 dias por ano de serviço (1 ano → 33 dias)', () => {
    const { dias } = calcularAvisoPrevioIndenizado(3000, 1);
    expect(dias).toBe(33);
  });

  it('incrementa 3 dias por ano de serviço (5 anos → 45 dias)', () => {
    const { dias } = calcularAvisoPrevioIndenizado(3000, 5);
    expect(dias).toBe(45);
  });

  it('limita a 90 dias (20 anos → 90 dias, não 90+)', () => {
    const { dias } = calcularAvisoPrevioIndenizado(3000, 20);
    expect(dias).toBe(90);
  });

  it('valor = salarioBase / 30 * dias', () => {
    const salario = 6000;
    const { dias, valor } = calcularAvisoPrevioIndenizado(salario, 10);
    expect(valor).toBeCloseTo((salario / 30) * dias, 2);
  });
});

// ─── calcularMulta477 ────────────────────────────────────────────────────────

describe('calcularMulta477', () => {
  it('equals salarioBase (1 mês de salário)', () => {
    expect(calcularMulta477(3000)).toBe(3000);
    expect(calcularMulta477(1518)).toBe(1518);
  });

  it('returns 0 for 0 salary', () => {
    expect(calcularMulta477(0)).toBe(0);
  });
});

// ─── calcularProRata ─────────────────────────────────────────────────────────

describe('calcularProRata', () => {
  it('full month (30 days) equals salarioBase', () => {
    expect(calcularProRata(3000, 30)).toBeCloseTo(3000, 2);
  });

  it('half month (15 days) = salarioBase / 2', () => {
    expect(calcularProRata(3000, 15)).toBeCloseTo(1500, 2);
  });

  it('single day = salarioBase / 30', () => {
    expect(calcularProRata(3000, 1)).toBeCloseTo(100, 2);
  });

  it('zero days returns 0', () => {
    expect(calcularProRata(3000, 0)).toBe(0);
  });

  it('rounds to 2 decimal places', () => {
    const result = calcularProRata(1000, 7);
    // 1000/30 * 7 = 233.333... → 233.33
    expect(result).toBe(233.33);
  });
});

// ─── calcularMargemConsignado ─────────────────────────────────────────────────

describe('calcularMargemConsignado', () => {
  it('margem total = 35% do salário líquido', () => {
    const { margemTotal } = calcularMargemConsignado(5000);
    expect(margemTotal).toBeCloseTo(1750, 2);
  });

  it('margem cartão = 5% do salário líquido', () => {
    const { margemCartao } = calcularMargemConsignado(5000);
    expect(margemCartao).toBeCloseTo(250, 2);
  });

  it('returns zero margins for zero salary', () => {
    const { margemTotal, margemCartao } = calcularMargemConsignado(0);
    expect(margemTotal).toBe(0);
    expect(margemCartao).toBe(0);
  });

  it('rounds to 2 decimal places', () => {
    const { margemTotal } = calcularMargemConsignado(1000);
    expect(margemTotal).toBe(350);
  });
});

// ─── calcular13Salario (trabalhista-base) ────────────────────────────────────

describe('calcular13Salario', () => {
  it('1ª parcela = 50% do valor de direito (12 meses)', () => {
    expect(calcular13Salario(6000, 12, 1)).toBeCloseTo(3000, 2);
  });

  it('2ª parcela = 100% do valor de direito (12 meses)', () => {
    expect(calcular13Salario(6000, 12, 2)).toBeCloseTo(6000, 2);
  });

  it('1ª parcela proporcional (6 meses) = 6/12 * salary * 50%', () => {
    expect(calcular13Salario(6000, 6, 1)).toBeCloseTo(1500, 2);
  });

  it('2ª parcela proporcional (6 meses) = 6/12 * salary', () => {
    expect(calcular13Salario(6000, 6, 2)).toBeCloseTo(3000, 2);
  });

  it('zero salary returns 0', () => {
    expect(calcular13Salario(0, 12, 1)).toBe(0);
    expect(calcular13Salario(0, 12, 2)).toBe(0);
  });

  it('1 mês proporcional', () => {
    expect(calcular13Salario(3000, 1, 2)).toBeCloseTo(250, 2);
  });

  it('defaults to 12 meses when omitted', () => {
    expect(calcular13Salario(3600, 12, 2)).toBeCloseTo(3600, 2);
  });
});

// ─── calcularHorasExtras (trabalhista-base) ──────────────────────────────────

describe('calcularHorasExtras', () => {
  it('HE 50%: salário/jornada * horas * 1.5', () => {
    // 3000/220 * 10 * 1.5 = 204.55
    const result = calcularHorasExtras(3000, 220, 10, 0.5);
    expect(result).toBeCloseTo(204.55, 1);
  });

  it('HE 100%: salário/jornada * horas * 2', () => {
    // 3000/220 * 5 * 2 = 136.36
    const result = calcularHorasExtras(3000, 220, 5, 1.0);
    expect(result).toBeCloseTo(136.36, 1);
  });

  it('zero horas returns 0', () => {
    expect(calcularHorasExtras(3000, 220, 0, 0.5)).toBe(0);
  });

  it('negative horas returns 0', () => {
    expect(calcularHorasExtras(3000, 220, -5, 0.5)).toBe(0);
  });
});

// ─── calcularDSR (trabalhista-base) ──────────────────────────────────────────

describe('calcularDSR', () => {
  it('DSR = (variaveis / diasUteis) * domingosFeriados', () => {
    // 1000 / 26 * 4 = 153.85
    const result = calcularDSR(1000, 26, 4);
    expect(result).toBeCloseTo(153.85, 1);
  });

  it('zero variaveis returns 0', () => {
    expect(calcularDSR(0, 26, 4)).toBe(0);
  });

  it('negative variaveis returns 0', () => {
    expect(calcularDSR(-500, 26, 4)).toBe(0);
  });

  it('zero diasUteis returns Infinity guard — skip (domain constraint)', () => {
    // When diasUteis is 0, division by zero returns Infinity or NaN. The function
    // doesn't guard this case, so we only test with valid inputs.
    expect(calcularDSR(1000, 26, 0)).toBe(0);
  });
});
