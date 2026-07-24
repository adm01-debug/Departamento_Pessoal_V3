import { describe, it, expect } from 'vitest';
import {
  calcularDecimo13,
  calcularFerias,
  calcularHorasExtras,
  calcularDSR,
  calcularAdicionalNoturno,
  calcularPericulosidade,
  calcularInsalubridade,
  calcularDescontoVT,
  calcularPensaoAlimenticia,
  calcularSalarioFamilia,
  calcularSalarioMaternidade,
  calcularAuxilioDoenca,
  calcularSobreaviso,
  calcularProntidao,
  calcularGratificacao,
  calcularComissao,
  calcularBancoHoras,
  calcularMedias,
  calcularLiquido,
  calcularDiarias,
  calcularQuilometragem,
  calcularEmprestimoConsignado,
  calcularAdicionalTransferencia,
} from '../beneficios';

describe('calcularDecimo13', () => {
  it('parcela 1 returns half the proportional value with no deductions', () => {
    const result = calcularDecimo13({ salarioBase: 3000, mesesTrabalhados: 12, parcela: 1 });
    expect(result.bruto).toBeCloseTo(1500, 1);
    expect(result.inss).toBe(0);
    expect(result.irrf).toBe(0);
    expect(result.fgts).toBeCloseTo(120, 1);
  });

  it('parcela 2 deducts INSS and IRRF', () => {
    const result = calcularDecimo13({ salarioBase: 5000, mesesTrabalhados: 12, parcela: 2 });
    expect(result.inss).toBeGreaterThan(0);
    expect(result.liquido).toBeLessThan(result.bruto);
  });

  it('proportional: 6 months = 50% of salary', () => {
    const result = calcularDecimo13({ salarioBase: 3000, mesesTrabalhados: 6, parcela: 1 });
    expect(result.bruto).toBeCloseTo(750, 1);
  });

  it('returns zero values when meses < 1', () => {
    const result = calcularDecimo13({ salarioBase: 3000, mesesTrabalhados: 0, parcela: 1 });
    expect(result.bruto).toBe(0);
    expect(result.mensagem).toBeTruthy();
  });
});

describe('calcularFerias', () => {
  it('calculates 1/3 constitutional bonus', () => {
    const result = calcularFerias(3000, 30);
    expect(result.tercoConstitucional).toBeCloseTo(1000, 1);
  });

  it('bruto includes ferias + terco', () => {
    const result = calcularFerias(3000, 30, 0);
    expect(result.bruto).toBeCloseTo(4000, 1);
  });

  it('applies INSS and IRRF', () => {
    const result = calcularFerias(5000, 30);
    expect(result.inss).toBeGreaterThan(0);
  });

  it('liquido < bruto', () => {
    const result = calcularFerias(5000, 30);
    expect(result.liquido).toBeLessThan(result.bruto);
  });
});

describe('calcularHorasExtras', () => {
  it('50% adicional adds 50% per hour', () => {
    const result = calcularHorasExtras(3000, 10);
    expect(result.valor50).toBeGreaterThan(0);
  });

  it('total = valor50 + valor100 + dsr', () => {
    const result = calcularHorasExtras(3000, 10, 0);
    expect(result.totalComDsr).toBeCloseTo(result.total + result.dsr, 1);
  });
});

describe('calcularDSR', () => {
  it('returns DSR proportional to variáveis', () => {
    const dsr = calcularDSR(1000, 26, 4);
    expect(dsr).toBeCloseTo((1000 / 26) * 4, 1);
  });

  it('returns 0 when diasUteis=0', () => {
    expect(calcularDSR(1000, 0, 4)).toBe(0);
  });
});

describe('calcularAdicionalNoturno', () => {
  it('computes 20% for default percentual', () => {
    const valorHora = 3000 / 220;
    const expected = valorHora * 0.20 * 44;
    expect(calcularAdicionalNoturno(3000, 44)).toBeCloseTo(expected, 1);
  });

  it('returns 0 for 0 hours', () => {
    expect(calcularAdicionalNoturno(3000, 0)).toBe(0);
  });
});

describe('calcularPericulosidade', () => {
  it('is 30% of salarioBase', () => {
    expect(calcularPericulosidade(3000)).toBeCloseTo(900, 1);
    expect(calcularPericulosidade(5000)).toBeCloseTo(1500, 1);
  });
});

describe('calcularInsalubridade', () => {
  it('grau minimo = 10% of salario minimo', () => {
    const result = calcularInsalubridade('minimo');
    expect(result).toBeGreaterThan(0);
  });

  it('grau maximo > grau medio > grau minimo', () => {
    const min = calcularInsalubridade('minimo');
    const med = calcularInsalubridade('medio');
    const max = calcularInsalubridade('maximo');
    expect(max).toBeGreaterThan(med);
    expect(med).toBeGreaterThan(min);
  });
});

describe('calcularDescontoVT', () => {
  it('is capped at 6% of salario', () => {
    const result = calcularDescontoVT(3000, 500);
    expect(result).toBeCloseTo(Math.min(500, 3000 * 0.06), 1);
  });

  it('returns actual VT cost when lower than 6% cap', () => {
    expect(calcularDescontoVT(10000, 50)).toBeCloseTo(50, 1);
  });
});

describe('calcularPensaoAlimenticia', () => {
  it('calculates percentage of base', () => {
    expect(calcularPensaoAlimenticia(3000, 30)).toBeCloseTo(900, 1);
    expect(calcularPensaoAlimenticia(3000, 15)).toBeCloseTo(450, 1);
  });
});

describe('calcularSalarioFamilia', () => {
  it('returns 0 for high salary', () => {
    expect(calcularSalarioFamilia(10000, 2)).toBe(0);
  });

  it('returns benefit for eligible salary', () => {
    expect(calcularSalarioFamilia(1500, 1)).toBeGreaterThan(0);
  });
});

describe('calcularSalarioMaternidade', () => {
  it('is daily salary times dias', () => {
    const result = calcularSalarioMaternidade(3000, 120);
    expect(result).toBeCloseTo((3000 / 30) * 120, 1);
  });
});

describe('calcularAuxilioDoenca', () => {
  it('is 91% of average salary', () => {
    const result = calcularAuxilioDoenca(5000);
    expect(result).toBeCloseTo(5000 * 0.91, 1);
  });

  it('never goes below salario minimo', () => {
    const result = calcularAuxilioDoenca(100);
    expect(result).toBeGreaterThan(0);
  });
});

describe('calcularSobreaviso', () => {
  it('is 1/3 of hour value times hours', () => {
    const valorHora = 3000 / 220;
    expect(calcularSobreaviso(3000, 66)).toBeCloseTo(valorHora * (1 / 3) * 66, 1);
  });
});

describe('calcularProntidao', () => {
  it('is 2/3 of hour value times hours', () => {
    const valorHora = 3000 / 220;
    expect(calcularProntidao(3000, 66)).toBeCloseTo(valorHora * (2 / 3) * 66, 1);
  });
});

describe('calcularGratificacao', () => {
  it('returns correct percentage of salary', () => {
    expect(calcularGratificacao(3000, 10)).toBeCloseTo(300, 1);
    expect(calcularGratificacao(3000, 50)).toBeCloseTo(1500, 1);
  });
});

describe('calcularComissao', () => {
  it('returns correct percentage of vendas', () => {
    expect(calcularComissao(10000, 5)).toBeCloseTo(500, 1);
  });
});

describe('calcularBancoHoras', () => {
  it('calculates saldo correctly', () => {
    const result = calcularBancoHoras(['10:00', '5:30'], ['2:00']);
    expect(result.saldo).toBeGreaterThan(0);
  });

  it('formats saldo as hh:mm', () => {
    const result = calcularBancoHoras(['08:00'], ['06:00']);
    expect(result.saldoFormatado).toBe('2:00');
  });
});

describe('calcularMedias', () => {
  it('returns correct average', () => {
    expect(calcularMedias([100, 200, 300])).toBeCloseTo(200, 1);
  });

  it('returns 0 for empty array', () => {
    expect(calcularMedias([])).toBe(0);
  });
});

describe('calcularLiquido', () => {
  it('subtracts descontos from bruto', () => {
    expect(calcularLiquido(3000, 500)).toBeCloseTo(2500, 1);
  });
});

describe('calcularDiarias', () => {
  it('calculates total and liquido', () => {
    const result = calcularDiarias(200, 5, 0);
    expect(result.total).toBe(1000);
    expect(result.liquido).toBe(1000);
  });

  it('applies discount', () => {
    const result = calcularDiarias(200, 5, 10);
    expect(result.desconto).toBeCloseTo(100, 1);
    expect(result.liquido).toBeCloseTo(900, 1);
  });
});

describe('calcularQuilometragem', () => {
  it('uses default 1.20 per km', () => {
    expect(calcularQuilometragem(100)).toBeCloseTo(120, 1);
  });

  it('uses custom rate', () => {
    expect(calcularQuilometragem(100, 2.0)).toBeCloseTo(200, 1);
  });
});

describe('calcularEmprestimoConsignado', () => {
  it('margem is 35% of liquido', () => {
    const result = calcularEmprestimoConsignado(3000, 500);
    expect(result.margemDisponivel).toBeCloseTo(3000 * 0.35 - 500, 1);
  });

  it('margem never goes negative', () => {
    const result = calcularEmprestimoConsignado(1000, 5000);
    expect(result.margemDisponivel).toBe(0);
  });
});

describe('calcularAdicionalTransferencia', () => {
  it('defaults to 25%', () => {
    expect(calcularAdicionalTransferencia(3000)).toBeCloseTo(750, 1);
  });

  it('uses custom percentage', () => {
    expect(calcularAdicionalTransferencia(3000, 50)).toBeCloseTo(1500, 1);
  });
});
