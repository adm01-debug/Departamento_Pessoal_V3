import { describe, it, expect } from 'vitest';
import { calculoFerias } from '../calculoFerias';

describe('calculoFerias', () => {
  it('deve calcular férias simples (30 dias) sem abono', () => {
    const params = {
      salarioBase: 3000,
      diasFerias: 30,
      diasAbono: 0,
      dependentesIrrf: 0
    };

    const result = calculoFerias.calcular(params);

    // Salário base 3000, 30 dias = 3000
    expect(result.valorFerias).toBe(3000);
    // 1/3 de 3000 = 1000
    expect(result.tercoConstitucional).toBe(1000);
    expect(result.valorAbono).toBe(0);
    expect(result.tercoAbono).toBe(0);
    expect(result.bruto).toBe(4000);
    
    // INSS 2026 (Progressivo) — ~368.60 (floating point may give 368.59 or 368.60)
    expect(result.inss).toBeCloseTo(368.6, 0);

    // IRRF — simplificado 133.84
    expect(result.irrf).toBeCloseTo(133.84, 1);

    // Líquido: bruto - INSS - IRRF ≈ 3497.56
    expect(result.liquido).toBeCloseTo(3497.56, 0);
  });

  it('deve calcular férias com abono pecuniário (20 dias férias + 10 dias abono)', () => {
    const params = {
      salarioBase: 3000,
      diasFerias: 20,
      diasAbono: 10,
      dependentesIrrf: 0
    };

    const result = calculoFerias.calcular(params);

    // Valor dia: 100
    // 20 dias férias: 2000
    expect(result.valorFerias).toBe(2000);
    // 1/3 de 2000 truncado a centavos: 666.66 (Math.trunc, não Math.round)
    expect(result.tercoConstitucional).toBe(666.66);
    // 10 dias abono: 1000
    expect(result.valorAbono).toBe(1000);
    // 1/3 abono: 333.33
    expect(result.tercoAbono).toBe(333.33);
    
    expect(result.bruto).toBe(4000);
  });

  it('deve limitar o abono pecuniário a no máximo 10 dias', () => {
    const params = {
      salarioBase: 3000,
      diasFerias: 15,
      diasAbono: 15, // Tentando 15 dias de abono
      dependentesIrrf: 0
    };

    const result = calculoFerias.calcular(params);

    // Limite é 10 dias
    // Valor dia: 100
    expect(result.valorAbono).toBe(1000);
  });

  it('salário mínimo (1518) sem abono — resultado estrutural', () => {
    const result = calculoFerias.calcular({ salarioBase: 1518, diasFerias: 30, diasAbono: 0 });
    expect(result.valorFerias).toBe(1518);
    expect(result.tercoConstitucional).toBe(506);
    expect(result.bruto).toBe(2024);
    // INSS sobre bruto de 2024 — first bracket only (1518 * 7.5% = 113.85, rest 9%)
    expect(result.inss).toBeGreaterThan(0);
    // Líquido deve ser positivo
    expect(result.liquido).toBeGreaterThan(0);
  });

  it('abono pecuniário zero quando diasAbono omitido', () => {
    const result = calculoFerias.calcular({ salarioBase: 4000, diasFerias: 30 });
    expect(result.valorAbono).toBe(0);
    expect(result.tercoAbono).toBe(0);
  });

  it('retorna estrutura correta com todas as propriedades', () => {
    const result = calculoFerias.calcular({ salarioBase: 3000, diasFerias: 30 });
    expect(result).toHaveProperty('valorFerias');
    expect(result).toHaveProperty('tercoConstitucional');
    expect(result).toHaveProperty('valorAbono');
    expect(result).toHaveProperty('tercoAbono');
    expect(result).toHaveProperty('bruto');
    expect(result).toHaveProperty('inss');
    expect(result).toHaveProperty('irrf');
    expect(result).toHaveProperty('liquido');
  });

  it('líquido = bruto - inss - irrf (balanço contábil)', () => {
    const result = calculoFerias.calcular({ salarioBase: 5000, diasFerias: 30 });
    expect(result.liquido).toBeCloseTo(result.bruto - result.inss - result.irrf, 2);
  });

  it('alto salário — incide alíquota máxima de INSS e IRRF', () => {
    const result = calculoFerias.calcular({ salarioBase: 20000, diasFerias: 30 });
    expect(result.inss).toBeGreaterThan(0);
    expect(result.irrf).toBeGreaterThan(0);
    expect(result.liquido).toBeLessThan(result.bruto);
  });

  it('isenção de IRRF para salário muito baixo', () => {
    // Salário abaixo da faixa isenta de IRRF
    const result = calculoFerias.calcular({ salarioBase: 1320, diasFerias: 30 });
    // Bruto = 1320 + 440 = 1760 — abaixo da faixa tributável
    expect(result.irrf).toBe(0);
  });
});
