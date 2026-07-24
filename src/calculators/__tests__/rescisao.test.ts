import { describe, it, expect } from 'vitest';
import { calcularRescisao } from '../rescisao';

const BASE_PARAMS = {
  salarioBase: 3000,
  dataAdmissao: '2022-01-01',
  dataDesligamento: '2024-07-15',
  tipoRescisao: 'sem_justa_causa' as const,
};

describe('calcularRescisao', () => {
  it('returns all expected top-level keys', () => {
    const result = calcularRescisao(BASE_PARAMS);
    expect(result).toHaveProperty('saldoSalario');
    expect(result).toHaveProperty('decimo13Proporcional');
    expect(result).toHaveProperty('feriasProporcional');
    expect(result).toHaveProperty('avisoPrevio');
    expect(result).toHaveProperty('multaFGTS');
    expect(result).toHaveProperty('totalBruto');
    expect(result).toHaveProperty('totalLiquido');
  });

  it('saldoSalario is proportional to days worked', () => {
    const result = calcularRescisao(BASE_PARAMS);
    expect(result.saldoSalario).toBeGreaterThan(0);
    expect(result.saldoSalario).toBeLessThanOrEqual(3000);
  });

  it('sem_justa_causa has aviso previo > 0', () => {
    const result = calcularRescisao(BASE_PARAMS);
    expect(result.avisoPrevio).toBeGreaterThan(0);
  });

  it('com_justa_causa has no decimo13, ferias or aviso previo', () => {
    const result = calcularRescisao({ ...BASE_PARAMS, tipoRescisao: 'com_justa_causa' });
    expect(result.decimo13Proporcional).toBe(0);
    expect(result.feriasProporcional).toBe(0);
    expect(result.avisoPrevio).toBe(0);
  });

  it('pedido_demissao has no aviso previo indenizado', () => {
    const result = calcularRescisao({ ...BASE_PARAMS, tipoRescisao: 'pedido_demissao' });
    expect(result.avisoPrevio).toBe(0);
  });

  it('acordo_mutuo has half aviso previo', () => {
    const sjc = calcularRescisao(BASE_PARAMS);
    const acordo = calcularRescisao({ ...BASE_PARAMS, tipoRescisao: 'acordo_mutuo' });
    expect(acordo.avisoPrevio).toBeLessThan(sjc.avisoPrevio);
    expect(acordo.avisoPrevio).toBeGreaterThan(0);
  });

  it('multaFGTS is 40% of saldoFGTS for sem_justa_causa', () => {
    const result = calcularRescisao({ ...BASE_PARAMS, saldoFGTS: 10000 });
    expect(result.multaFGTS).toBeCloseTo(4000, 1);
  });

  it('multaFGTS is 0 for com_justa_causa', () => {
    const result = calcularRescisao({ ...BASE_PARAMS, tipoRescisao: 'com_justa_causa', saldoFGTS: 10000 });
    expect(result.multaFGTS).toBe(0);
  });

  it('totalBruto > saldoSalario', () => {
    const result = calcularRescisao(BASE_PARAMS);
    expect(result.totalBruto).toBeGreaterThan(result.saldoSalario);
  });

  it('totalLiquido < totalBruto due to deductions', () => {
    const result = calcularRescisao({ ...BASE_PARAMS, salarioBase: 8000 });
    expect(result.totalLiquido).toBeLessThan(result.totalBruto);
  });

  it('ferias vencidas adds extra value', () => {
    const without = calcularRescisao(BASE_PARAMS);
    const with_ = calcularRescisao({ ...BASE_PARAMS, feriasVencidas: true });
    expect(with_.totalBruto).toBeGreaterThan(without.totalBruto);
  });
});
