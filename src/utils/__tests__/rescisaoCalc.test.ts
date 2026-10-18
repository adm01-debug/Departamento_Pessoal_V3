import { describe, it, expect } from 'vitest';
import { calcularRescisao, fmt } from '../rescisaoCalc';
import { calcularINSS as calcINSS, calcularIRRF as calcIRRF } from '@/calculators/impostos';

// ═══════════════════════════════════════════════════════
// INSS 2026 — Progressive Bracket Tests (50+ cases)
// ═══════════════════════════════════════════════════════
describe('calcINSS — Tabela Progressiva 2026', () => {
  // Bracket boundaries
  const FAIXA1_TETO = 1621.0;
  const FAIXA2_TETO = 2902.84;
  const FAIXA3_TETO = 4354.27;
  const FAIXA4_TETO = 8475.55;

  describe('edge cases', () => {
    it('salary = 0 → INSS = 0', () => expect(calcINSS(0)).toBe(0));
    it('salary = -100 → INSS = 0', () => expect(calcINSS(-100)).toBe(0));
    // INSS é truncado a centavos (IN RFB 2110/2022). Para salários ínfimos o truncamento domina:
    // 0.01 × 7.5% = 0.00075 → R$ 0.00 ; 1 × 7.5% = 0.075 → Math.trunc(7.5)/100 = R$ 0.07.
    it('salary = 0.01 → INSS truncado a centavos = 0', () => expect(calcINSS(0.01)).toBe(0));
    it('salary = 1 → 1 × 7.5% truncado = 0.07', () => expect(calcINSS(1)).toBe(0.07));
  });

  describe('faixa 1 — 7.5% até R$ 1.621,00', () => {
    it('R$ 500', () => expect(calcINSS(500)).toBeCloseTo(37.5, 2));
    it('R$ 1.000', () => expect(calcINSS(1000)).toBeCloseTo(75.0, 2));
    it('R$ 1.621,00 (teto)', () => expect(calcINSS(FAIXA1_TETO)).toBeCloseTo(121.57, 2));
  });

  describe('faixa 2 — 9% de R$ 1.621,01 a R$ 2.902,84', () => {
    it('R$ 1.621,01', () => {
      // IN RFB 2110/2022 trunca centavos: 121.5759… → 121.57
      expect(calcINSS(1621.01)).toBe(121.57);
    });
    it('R$ 2.000', () => {
      const expected = FAIXA1_TETO * 0.075 + (2000 - FAIXA1_TETO) * 0.09;
      expect(calcINSS(2000)).toBeCloseTo(expected, 2);
    });
    it('R$ 2.793,88 (teto)', () => {
      const expected = FAIXA1_TETO * 0.075 + (FAIXA2_TETO - FAIXA1_TETO) * 0.09;
      expect(calcINSS(FAIXA2_TETO)).toBeCloseTo(expected, 2);
    });
  });

  describe('faixa 3 — 12% de R$ 2.902,85 a R$ 4.354,27', () => {
    it('R$ 3.500', () => {
      // IN RFB 2110/2022 trunca centavos: 308.5998… → 308.59
      expect(calcINSS(3500)).toBe(308.59);
    });
    it('R$ 4.190,83 (teto)', () => {
      const expected = FAIXA1_TETO * 0.075 + (FAIXA2_TETO - FAIXA1_TETO) * 0.09 + (FAIXA3_TETO - FAIXA2_TETO) * 0.12;
      expect(calcINSS(FAIXA3_TETO)).toBeCloseTo(expected, 2);
    });
  });

  describe('faixa 4 — 14% de R$ 4.354,28 a R$ 8.475,55', () => {
    it('R$ 5.000', () => {
      const expected =
        FAIXA1_TETO * 0.075 +
        (FAIXA2_TETO - FAIXA1_TETO) * 0.09 +
        (FAIXA3_TETO - FAIXA2_TETO) * 0.12 +
        (5000 - FAIXA3_TETO) * 0.14;
      expect(calcINSS(5000)).toBeCloseTo(expected, 2);
    });
    it('R$ 8.157,41 (teto)', () => {
      const r = calcINSS(FAIXA4_TETO);
      const expected =
        FAIXA1_TETO * 0.075 +
        (FAIXA2_TETO - FAIXA1_TETO) * 0.09 +
        (FAIXA3_TETO - FAIXA2_TETO) * 0.12 +
        (FAIXA4_TETO - FAIXA3_TETO) * 0.14;
      expect(r).toBeCloseTo(expected, 2);
    });
  });

  describe('teto — acima de R$ 8.475,55', () => {
    it('R$ 10.000 = mesmo que teto', () => expect(calcINSS(10000)).toBeCloseTo(calcINSS(FAIXA4_TETO), 2));
    it('R$ 50.000 = mesmo que teto', () => expect(calcINSS(50000)).toBeCloseTo(calcINSS(FAIXA4_TETO), 2));
    it('R$ 100.000 = mesmo que teto', () => expect(calcINSS(100000)).toBeCloseTo(calcINSS(FAIXA4_TETO), 2));
  });

  describe('batch — common salaries', () => {
    const cases = [1320, 1412, 1518, 2000, 2500, 3000, 3500, 4000, 4500, 5000, 6000, 7000, 8000, 10000, 15000];
    cases.forEach((sal) => {
      it(`R$ ${sal.toLocaleString('pt-BR')} → positive INSS`, () => {
        const r = calcINSS(sal);
        expect(r).toBeGreaterThan(0);
        expect(r).toBeLessThanOrEqual(calcINSS(FAIXA4_TETO) + 0.01);
      });
    });
  });
});

// ═══════════════════════════════════════════════════════
// IRRF 2026 — Progressive Bracket Tests
// ═══════════════════════════════════════════════════════
describe('calcIRRF — Tabela Progressiva 2026', () => {
  describe('isenção (até R$ 2.259,20)', () => {
    it('base = 0', () => expect(calcIRRF(0)).toBe(0));
    it('base = 1.000', () => expect(calcIRRF(1000)).toBe(0));
  });

  describe('negative bases', () => {
    it('base = -1000 → 0', () => expect(calcIRRF(-1000)).toBe(0));
  });

  describe('valores positivos e monotonicidade', () => {
    it('IRRF cresce com a base', () => {
      expect(calcIRRF(5000)).toBeGreaterThan(calcIRRF(3000));
      expect(calcIRRF(10000)).toBeGreaterThan(calcIRRF(5000));
    });
    it('IRRF nunca é negativo', () => {
      [1000, 2500, 3500, 5000, 10000, 50000].forEach((b) => expect(calcIRRF(b)).toBeGreaterThanOrEqual(0));
    });
  });
});

// ═══════════════════════════════════════════════════════
// calcularRescisao — Full Integration Tests (100+ scenarios)
// ═══════════════════════════════════════════════════════
describe('calcularRescisao — Sem Justa Causa', () => {
  const base = {
    salario: 5000,
    dataAdmissao: '2020-03-15',
    dataDesligamento: '2026-03-22',
    tipo: 'sem_justa_causa',
    avisoTrabalhado: false,
    feriasVencidas: false,
    saldoFGTS: 15000,
  };

  it('retorna todos os campos obrigatórios', async () => {
    const r = await calcularRescisao(base);
    const fields = [
      'saldoSalario',
      'avisoIndenizado',
      'feriasVencidas',
      'feriasProporcionais',
      'tercoFerias',
      'decimoTerceiro',
      'multaFGTS',
      'fgtsRescisao',
      'totalProventos',
      'inss',
      'irrf',
      'totalDescontos',
      'totalLiquido',
      'diasTrabalhados',
      'mesesFerias',
      'meses13',
      'diasAviso',
    ];
    fields.forEach((f) => expect(r).toHaveProperty(f));
  });

  it('saldo de salário = (salário / dias_no_mês) × dia_desligamento', async () => {
    const r = await calcularRescisao(base);
    expect(r.saldoSalario).toBe(Math.trunc((5000 / 31) * 22 * 100) / 100);
    expect(r.diasTrabalhados).toBe(22);
  });

  it('aviso prévio proporcional: 6 anos → 30 + 18 = 48 dias', async () => {
    const r = await calcularRescisao(base);
    expect(r.diasAviso).toBe(48);
    expect(r.avisoIndenizado).toBeCloseTo((5000 / 30) * 48, 2);
  });

  it('aviso prévio com máximo de 90 dias (>20 anos)', async () => {
    const r = await calcularRescisao({ ...base, dataAdmissao: '2000-01-01' });
    expect(r.diasAviso).toBe(90);
  });

  it('aviso trabalhado = 0', async () => {
    const r = await calcularRescisao({ ...base, avisoTrabalhado: true });
    expect(r.avisoIndenizado).toBe(0);
  });

  it('férias vencidas = salário quando flagged', async () => {
    const r = await calcularRescisao({ ...base, feriasVencidas: true });
    expect(r.feriasVencidas).toBe(5000);
  });

  it('férias vencidas = 0 quando não flagged', async () => {
    const r = await calcularRescisao(base);
    expect(r.feriasVencidas).toBe(0);
  });

  it('férias proporcionais > 0', async () => {
    const r = await calcularRescisao(base);
    expect(r.feriasProporcionais).toBeGreaterThan(0);
  });

  it('1/3 constitucional = (férias vencidas + proporcionais) / 3', async () => {
    const r = await calcularRescisao({ ...base, feriasVencidas: true });
    expect(r.tercoFerias).toBe(Math.trunc(((r.feriasVencidas + r.feriasProporcionais) / 3) * 100) / 100);
  });

  it('13º proporcional: decimoTerceiro = (salário/12) × meses13', async () => {
    const r = await calcularRescisao(base);
    expect(r.meses13).toBeGreaterThan(0);
    expect(r.decimoTerceiro).toBe(Math.trunc((5000 / 12) * r.meses13 * 100) / 100);
  });

  it('FGTS sobre rescisão = 8% do (saldo salário + aviso + 13º)', async () => {
    const r = await calcularRescisao(base);
    expect(r.fgtsRescisao).toBeCloseTo((r.saldoSalario + r.avisoIndenizado + r.decimoTerceiro) * 0.08, 2);
  });

  it('multa FGTS = 40% do (saldo FGTS + FGTS rescisão)', async () => {
    const r = await calcularRescisao(base);
    expect(r.multaFGTS).toBeCloseTo((15000 + r.fgtsRescisao) * 0.4, 2);
  });

  it('totalProventos = soma de todas as verbas', async () => {
    const r = await calcularRescisao(base);
    const expected =
      r.saldoSalario + r.avisoIndenizado + r.feriasVencidas + r.feriasProporcionais + r.tercoFerias + r.decimoTerceiro;
    expect(r.totalProventos).toBeCloseTo(expected, 2);
  });

  it('totalDescontos = INSS + IRRF + desconto aviso + indenização art. 480', async () => {
    const r = await calcularRescisao(base);
    expect(r.totalDescontos).toBeCloseTo(r.inss + r.irrf + r.descontoAvisoPrevio + r.indenizacaoArt480, 1);
  });

  it('totalLiquido = proventos - descontos (multa FGTS é GRRF, fora do líquido)', async () => {
    const r = await calcularRescisao(base);
    expect(r.multaFGTS).toBeGreaterThan(0);
    expect(r.totalLiquido).toBeCloseTo(r.totalProventos - r.totalDescontos, 2);
  });

  it('totalLiquido > 0 para salário positivo', async () => {
    const r = await calcularRescisao(base);
    expect(r.totalLiquido).toBeGreaterThan(0);
  });
});

describe('calcularRescisao — Justa Causa', () => {
  const base = {
    salario: 3000,
    dataAdmissao: '2022-06-01',
    dataDesligamento: '2026-03-15',
    tipo: 'justa_causa',
    avisoTrabalhado: false,
    feriasVencidas: false,
    saldoFGTS: 8000,
  };

  it('aviso indenizado = 0', async () => {
    expect((await calcularRescisao(base)).avisoIndenizado).toBe(0);
  });

  it('férias proporcionais = 0', async () => {
    expect((await calcularRescisao(base)).feriasProporcionais).toBe(0);
  });

  it('13º proporcional = 0', async () => {
    expect((await calcularRescisao(base)).decimoTerceiro).toBe(0);
  });

  it('multa FGTS = 0', async () => {
    expect((await calcularRescisao(base)).multaFGTS).toBe(0);
  });

  it('saldo de salário > 0', async () => {
    expect((await calcularRescisao(base)).saldoSalario).toBeGreaterThan(0);
  });

  it('1/3 constitucional = 0 (sem férias)', async () => {
    expect((await calcularRescisao(base)).tercoFerias).toBe(0);
  });

  it('férias vencidas pagas mesmo em justa causa (art. 146 — só proporcionais se perdem)', async () => {
    const r = await calcularRescisao({ ...base, feriasVencidas: true });
    expect(r.feriasVencidas).toBe(3000);
  });
});

describe('calcularRescisao — Pedido de Demissão', () => {
  const base = {
    salario: 4000,
    dataAdmissao: '2021-01-10',
    dataDesligamento: '2026-06-20',
    tipo: 'pedido_demissao',
    avisoTrabalhado: false,
    feriasVencidas: true,
    saldoFGTS: 10000,
  };

  it('aviso indenizado = 0', async () => {
    expect((await calcularRescisao(base)).avisoIndenizado).toBe(0);
  });

  it('multa FGTS = 0', async () => {
    expect((await calcularRescisao(base)).multaFGTS).toBe(0);
  });

  it('13º proporcional > 0', async () => {
    expect((await calcularRescisao(base)).decimoTerceiro).toBeGreaterThan(0);
  });

  it('férias proporcionais > 0', async () => {
    expect((await calcularRescisao(base)).feriasProporcionais).toBeGreaterThan(0);
  });

  it('férias vencidas = salário', async () => {
    expect((await calcularRescisao(base)).feriasVencidas).toBe(4000);
  });
});

// ═══════════════════════════════════════════════════════
// Salary Ranges — Stress Tests
// ═══════════════════════════════════════════════════════
describe('calcularRescisao — Faixas Salariais', () => {
  const salarios = [1320, 1518, 2000, 3000, 5000, 8000, 10000, 15000, 20000, 50000];
  const tipos = ['sem_justa_causa', 'justa_causa', 'pedido_demissao'] as const;

  salarios.forEach((sal) => {
    tipos.forEach((tipo) => {
      it(`R$ ${sal} × ${tipo} → valores consistentes`, async () => {
        const r = await calcularRescisao({
          salario: sal,
          dataAdmissao: '2020-01-01',
          dataDesligamento: '2026-06-15',
          tipo,
          avisoTrabalhado: false,
          feriasVencidas: false,
          saldoFGTS: sal * 3,
        });

        expect(r.saldoSalario).toBeGreaterThan(0);
        expect(r.totalProventos).toBeGreaterThan(0);
        expect(r.inss).toBeGreaterThanOrEqual(0);
        expect(r.irrf).toBeGreaterThanOrEqual(0);
        expect(r.totalDescontos).toBeGreaterThanOrEqual(0);
        expect(r.totalLiquido).toBeGreaterThan(0);

        if (tipo === 'sem_justa_causa') {
          expect(r.avisoIndenizado).toBeGreaterThan(0);
          expect(r.multaFGTS).toBeGreaterThan(0);
        }
        if (tipo === 'justa_causa') {
          expect(r.avisoIndenizado).toBe(0);
          expect(r.multaFGTS).toBe(0);
          expect(r.decimoTerceiro).toBe(0);
          expect(r.feriasProporcionais).toBe(0);
        }
        if (tipo === 'pedido_demissao') {
          expect(r.avisoIndenizado).toBe(0);
          expect(r.multaFGTS).toBe(0);
        }
      });
    });
  });
});

// ═══════════════════════════════════════════════════════
// Aviso Prévio Proporcional — Year Tests
// ═══════════════════════════════════════════════════════
describe('calcularRescisao — Aviso Prévio Proporcional', () => {
  const years = [0, 1, 2, 3, 5, 10, 15, 20, 25, 30];
  years.forEach((y) => {
    it(`${y} anos → ${Math.min(90, 30 + y * 3)} dias`, async () => {
      const admissao = new Date(2026 - y, 0, 1);
      const r = await calcularRescisao({
        salario: 5000,
        dataAdmissao: admissao.toISOString().slice(0, 10),
        dataDesligamento: '2026-06-15',
        tipo: 'sem_justa_causa',
        avisoTrabalhado: false,
        feriasVencidas: false,
        saldoFGTS: 10000,
      });
      expect(r.diasAviso).toBe(Math.min(90, 30 + y * 3));
    });
  });
});

// ═══════════════════════════════════════════════════════
// Months — 13º Calculation per Month
// ═══════════════════════════════════════════════════════
describe('calcularRescisao — 13º por Mês', () => {
  for (let m = 1; m <= 12; m++) {
    it(`desligamento em mês ${m} → decimoTerceiro = (salário/12) × meses13`, async () => {
      const r = await calcularRescisao({
        salario: 6000,
        dataAdmissao: '2020-01-01',
        dataDesligamento: `2026-${String(m).padStart(2, '0')}-15`,
        tipo: 'sem_justa_causa',
        avisoTrabalhado: false,
        feriasVencidas: false,
        saldoFGTS: 20000,
      });
      expect(r.meses13).toBeGreaterThan(0);
      expect(r.decimoTerceiro).toBeCloseTo((6000 / 12) * r.meses13, 2);
    });
  }
});

// ═══════════════════════════════════════════════════════
// Days in Month — Saldo Salário
// ═══════════════════════════════════════════════════════
describe('calcularRescisao — Saldo Salário em Meses Diferentes', () => {
  const monthDays = [
    { month: '01', days: 31 },
    { month: '02', days: 28 }, // 2026 is not a leap year
    { month: '03', days: 31 },
    { month: '04', days: 30 },
    { month: '06', days: 30 },
    { month: '09', days: 30 },
    { month: '12', days: 31 },
  ];

  monthDays.forEach(({ month, days }) => {
    it(`mês ${month} tem ${days} dias`, async () => {
      const dayOfMonth = Math.min(15, days);
      const r = await calcularRescisao({
        salario: 3000,
        dataAdmissao: '2020-01-01',
        dataDesligamento: `2026-${month}-${String(dayOfMonth).padStart(2, '0')}`,
        tipo: 'sem_justa_causa',
        avisoTrabalhado: false,
        feriasVencidas: false,
        saldoFGTS: 5000,
      });
      expect(r.saldoSalario).toBeCloseTo((3000 / days) * dayOfMonth, 2);
    });
  });
});

// ═══════════════════════════════════════════════════════
// fmt — Formatting
// ═══════════════════════════════════════════════════════
describe('fmt — Formatação Monetária', () => {
  it('0 → "0,00"', () => expect(fmt(0)).toBe('0,00'));
  it('1234.5 → "1.234,50"', () => expect(fmt(1234.5)).toBe('1.234,50'));
  it('123456.78 → "123.456,78"', () => expect(fmt(123456.78)).toBe('123.456,78'));
  it('0.1 → "0,10"', () => expect(fmt(0.1)).toBe('0,10'));
  it('0.99 → "0,99"', () => expect(fmt(0.99)).toBe('0,99'));
  it('1000000 → "1.000.000,00"', () => expect(fmt(1000000)).toBe('1.000.000,00'));
  it('999.999 → arredondado', () => {
    const r = fmt(999.999);
    expect(r).toBe('1.000,00');
  });
  it('negative → formatted with minus', () => {
    const r = fmt(-500.5);
    expect(r).toContain('500,50');
  });
});

// ═══════════════════════════════════════════════════════
// Edge Cases & Regression
// ═══════════════════════════════════════════════════════
describe('calcularRescisao — Edge Cases', () => {
  it('salário mínimo 2026 (R$ 1.518)', async () => {
    const r = await calcularRescisao({
      salario: 1518,
      dataAdmissao: '2025-01-01',
      dataDesligamento: '2026-03-15',
      tipo: 'sem_justa_causa',
      avisoTrabalhado: false,
      feriasVencidas: false,
      saldoFGTS: 2000,
    });
    expect(r.totalLiquido).toBeGreaterThan(0);
    expect(r.inss).toBeGreaterThan(0);
  });

  it('1 dia trabalhado', async () => {
    const r = await calcularRescisao({
      salario: 5000,
      dataAdmissao: '2025-12-01',
      dataDesligamento: '2026-01-01',
      tipo: 'sem_justa_causa',
      avisoTrabalhado: false,
      feriasVencidas: false,
      saldoFGTS: 0,
    });
    expect(r.diasTrabalhados).toBe(1);
    expect(r.saldoSalario).toBeCloseTo(5000 / 31, 2);
  });

  it('saldo FGTS = 0', async () => {
    const r = await calcularRescisao({
      salario: 3000,
      dataAdmissao: '2025-01-01',
      dataDesligamento: '2026-06-15',
      tipo: 'sem_justa_causa',
      avisoTrabalhado: false,
      feriasVencidas: false,
      saldoFGTS: 0,
    });
    expect(r.multaFGTS).toBeCloseTo(r.fgtsRescisao * 0.4, 2);
  });

  it('salário alto R$ 100.000', async () => {
    const r = await calcularRescisao({
      salario: 100000,
      dataAdmissao: '2015-01-01',
      dataDesligamento: '2026-06-15',
      tipo: 'sem_justa_causa',
      avisoTrabalhado: false,
      feriasVencidas: true,
      saldoFGTS: 200000,
    });
    expect(r.totalLiquido).toBeGreaterThan(100000);
  });

  it('com férias vencidas + proporcionais + 1/3 tudo incluso', async () => {
    const r = await calcularRescisao({
      salario: 4000,
      dataAdmissao: '2020-06-01',
      dataDesligamento: '2026-09-20',
      tipo: 'sem_justa_causa',
      avisoTrabalhado: false,
      feriasVencidas: true,
      saldoFGTS: 12000,
    });
    expect(r.feriasVencidas).toBe(4000);
    expect(r.feriasProporcionais).toBeGreaterThan(0);
    expect(r.tercoFerias).toBe(Math.trunc(((r.feriasVencidas + r.feriasProporcionais) / 3) * 100) / 100);
  });
});

// ═══════════════════════════════════════════════════════
// Consistency — Total Checks
// ═══════════════════════════════════════════════════════
describe('calcularRescisao — Consistência Matemática', () => {
  const scenarios = [
    { sal: 1518, tipo: 'sem_justa_causa', ferias: false },
    { sal: 3000, tipo: 'sem_justa_causa', ferias: true },
    { sal: 5000, tipo: 'justa_causa', ferias: false },
    { sal: 8000, tipo: 'pedido_demissao', ferias: true },
    { sal: 15000, tipo: 'sem_justa_causa', ferias: true },
    { sal: 30000, tipo: 'sem_justa_causa', ferias: false },
  ];

  scenarios.forEach(({ sal, tipo, ferias }) => {
    it(`R$ ${sal} / ${tipo} / férias=${ferias} → fórmula consistente`, async () => {
      const r = await calcularRescisao({
        salario: sal,
        dataAdmissao: '2020-01-15',
        dataDesligamento: '2026-04-10',
        tipo,
        avisoTrabalhado: false,
        feriasVencidas: ferias,
        saldoFGTS: sal * 2,
      });

      // totalProventos = soma
      const expectedProventos =
        r.saldoSalario +
        r.avisoIndenizado +
        r.feriasVencidas +
        r.feriasProporcionais +
        r.tercoFerias +
        r.decimoTerceiro +
        r.indenizacaoArt479 +
        r.multa477;
      expect(r.totalProventos).toBeCloseTo(expectedProventos, 1);

      // totalDescontos = INSS + IRRF + desconto aviso + indenização art. 480
      expect(r.totalDescontos).toBeCloseTo(r.inss + r.irrf + r.descontoAvisoPrevio + r.indenizacaoArt480, 2);

      // totalLiquido — multa FGTS fora do líquido (depósito GRRF)
      expect(r.totalLiquido).toBeCloseTo(r.totalProventos - r.totalDescontos, 1);

      // All values >= 0
      expect(r.saldoSalario).toBeGreaterThanOrEqual(0);
      expect(r.avisoIndenizado).toBeGreaterThanOrEqual(0);
      expect(r.feriasVencidas).toBeGreaterThanOrEqual(0);
      expect(r.feriasProporcionais).toBeGreaterThanOrEqual(0);
      expect(r.tercoFerias).toBeGreaterThanOrEqual(0);
      expect(r.decimoTerceiro).toBeGreaterThanOrEqual(0);
      expect(r.multaFGTS).toBeGreaterThanOrEqual(0);
      expect(r.inss).toBeGreaterThanOrEqual(0);
      expect(r.irrf).toBeGreaterThanOrEqual(0);
    });
  });
});

// ═══════════════════════════════════════════════════════
// Onda 5 — Regras novas do motor único
// ═══════════════════════════════════════════════════════
describe('calcularRescisao — Término de Contrato a Prazo (arts. 479/480)', () => {
  const base = {
    salario: 5000,
    dataAdmissao: '2025-01-01',
    dataDesligamento: '2026-03-01',
    tipo: 'termino_contrato',
    avisoTrabalhado: false,
    feriasVencidas: false,
    saldoFGTS: 10000,
    dataFimContrato: '2026-07-01',
  };

  // 2026-03-01 → 2026-07-01 = 122 dias restantes → 5000/30 × 122 × 50% = 10.166,67
  it('iniciativa do empregador → indenização art. 479 de 50% dos dias restantes', async () => {
    const r = await calcularRescisao({ ...base, terminoIniciativa: 'empregador' });
    expect(r.indenizacaoArt479).toBeCloseTo(10166.66, 2);
    expect(r.indenizacaoArt480).toBe(0);
    // entra nos proventos, não nos descontos
    expect(r.totalProventos).toBeCloseTo(
      r.saldoSalario +
        r.avisoIndenizado +
        r.feriasVencidas +
        r.feriasProporcionais +
        r.tercoFerias +
        r.decimoTerceiro +
        r.indenizacaoArt479 +
        r.multa477,
      2
    );
  });

  it('iniciativa do empregador → multa FGTS 40% e saque FGTS pleno', async () => {
    const r = await calcularRescisao({ ...base, terminoIniciativa: 'empregador' });
    expect(r.multaFGTS).toBeCloseTo(Math.trunc((10000 + r.fgtsRescisao) * 0.4 * 100) / 100, 2);
    expect(r.fgtsSaquePercentual).toBe(1);
  });

  it('iniciativa do empregado → indenização art. 480 nos descontos', async () => {
    const r = await calcularRescisao({ ...base, terminoIniciativa: 'empregado' });
    expect(r.indenizacaoArt480).toBeCloseTo(10166.66, 2);
    expect(r.indenizacaoArt479).toBe(0);
    expect(r.totalDescontos).toBeCloseTo(r.inss + r.irrf + r.indenizacaoArt480, 2);
    // empregado pediu: sem multa FGTS e sem saque
    expect(r.multaFGTS).toBe(0);
    expect(r.fgtsSaquePercentual).toBe(0);
    expect(r.seguroDesemprego.elegivel).toBe(false);
  });

  it('término natural (contrato correu o prazo) → sem indenização, multa 40%', async () => {
    const r = await calcularRescisao({ ...base, terminoIniciativa: 'natural' });
    expect(r.indenizacaoArt479).toBe(0);
    expect(r.indenizacaoArt480).toBe(0);
    expect(r.multaFGTS).toBeCloseTo(Math.trunc((10000 + r.fgtsRescisao) * 0.4 * 100) / 100, 2);
  });

  it('desligamento após o fim previsto → sem indenização', async () => {
    const r = await calcularRescisao({ ...base, dataFimContrato: '2026-02-01', terminoIniciativa: 'empregador' });
    expect(r.indenizacaoArt479).toBe(0);
  });
});

describe('calcularRescisao — Pedido de Demissão sem aviso cumprido (art. 487 §2º)', () => {
  const base = {
    salario: 3000,
    dataAdmissao: '2023-01-01',
    dataDesligamento: '2026-04-10',
    tipo: 'pedido_demissao',
    avisoTrabalhado: false,
    feriasVencidas: false,
    saldoFGTS: 0,
  };

  it('30 dias não cumpridos (default) → desconto = 1 salário', async () => {
    const r = await calcularRescisao(base);
    expect(r.diasAvisoNaoCumpridos).toBe(30);
    expect(r.descontoAvisoPrevio).toBe(3000);
  });

  it('dias parciais → desconto proporcional', async () => {
    const r = await calcularRescisao({ ...base, diasAvisoNaoCumpridos: 15 });
    expect(r.descontoAvisoPrevio).toBe(1500);
  });

  it('aviso trabalhado → sem desconto', async () => {
    const r = await calcularRescisao({ ...base, avisoTrabalhado: true });
    expect(r.descontoAvisoPrevio).toBe(0);
  });

  it('desconto entra em totalDescontos (e sai do líquido)', async () => {
    const r = await calcularRescisao(base);
    expect(r.totalDescontos).toBeCloseTo(r.inss + r.irrf + r.descontoAvisoPrevio, 2);
    expect(r.totalLiquido).toBeCloseTo(r.totalProventos - r.totalDescontos, 2);
  });
});

describe('calcularRescisao — Culpa Recíproca (Súm. 14 TST)', () => {
  const base = {
    salario: 6000,
    dataAdmissao: '2022-05-01',
    dataDesligamento: '2026-06-01',
    tipo: 'culpa_reciproca',
    avisoTrabalhado: false,
    feriasVencidas: false,
    saldoFGTS: 20000,
  };

  it('aviso indenizado = 50% do aviso cheio', async () => {
    const r = await calcularRescisao(base);
    // 4 anos → 30 + 12 = 42 dias; metade = 21 dias → 6000/30 × 21 = 4.200
    expect(r.diasAviso).toBe(42);
    expect(r.avisoIndenizado).toBeCloseTo((6000 / 30) * 21, 2);
  });

  it('férias proporcionais e 13º a 50%', async () => {
    const r = await calcularRescisao(base);
    const sem = await calcularRescisao({ ...base, tipo: 'sem_justa_causa' });
    expect(r.feriasProporcionais).toBeCloseTo(
      Math.trunc((((6000 / 12) * r.mesesFerias * 100) / 100 / 2) * 100) / 100,
      1
    );
    expect(r.decimoTerceiro).toBeLessThan(sem.decimoTerceiro);
    expect(r.decimoTerceiro).toBeCloseTo(sem.decimoTerceiro / 2, 1);
  });

  it('multa FGTS 20% e seguro elegível', async () => {
    const r = await calcularRescisao(base);
    expect(r.multaFGTS).toBeCloseTo(Math.trunc((20000 + r.fgtsRescisao) * 0.2 * 100) / 100, 2);
    expect(r.seguroDesemprego.elegivel).toBe(true);
  });
});

describe('calcularRescisao — Acordo 484-A completo', () => {
  const base = {
    salario: 5000,
    dataAdmissao: '2021-01-01',
    dataDesligamento: '2026-05-10',
    tipo: 'acordo_mutuo',
    avisoTrabalhado: false,
    feriasVencidas: false,
    saldoFGTS: 18000,
  };

  it('aviso 50%, multa 20%, saque FGTS 80%, sem seguro-desemprego', async () => {
    const r = await calcularRescisao(base);
    const sem = await calcularRescisao({ ...base, tipo: 'sem_justa_causa' });
    expect(r.avisoIndenizado).toBeCloseTo(sem.avisoIndenizado * 0.5, 1);
    expect(r.multaFGTS).toBeCloseTo(Math.trunc((18000 + r.fgtsRescisao) * 0.2 * 100) / 100, 2);
    expect(r.fgtsSaquePercentual).toBe(0.8);
    expect(r.seguroDesemprego.elegivel).toBe(false);
  });
});

describe('calcularRescisao — Multa art. 477 §8º', () => {
  const base = {
    salario: 4000,
    dataAdmissao: '2020-01-01',
    dataDesligamento: '2026-03-10',
    tipo: 'sem_justa_causa',
    avisoTrabalhado: false,
    feriasVencidas: false,
    saldoFGTS: 0,
  };

  it('pagamento > 10 dias corridos → multa de 1 salário', async () => {
    const r = await calcularRescisao({ ...base, dataPagamento: '2026-03-25' });
    expect(r.multa477).toBe(4000);
    expect(r.totalProventos).toBeGreaterThanOrEqual(4000);
  });

  it('pagamento no 10º dia → sem multa', async () => {
    const r = await calcularRescisao({ ...base, dataPagamento: '2026-03-20' });
    expect(r.multa477).toBe(0);
  });

  it('sem data de pagamento → sem multa', async () => {
    const r = await calcularRescisao(base);
    expect(r.multa477).toBe(0);
  });
});

describe('calcularRescisao — Seguro-desemprego informativo', () => {
  const base = {
    salario: 3000,
    dataAdmissao: '2020-01-01',
    dataDesligamento: '2026-06-15',
    avisoTrabalhado: false,
    feriasVencidas: false,
    saldoFGTS: 0,
  };

  it('sem justa causa com ≥24 meses → elegível, 5 parcelas', async () => {
    const r = await calcularRescisao({ ...base, tipo: 'sem_justa_causa' });
    expect(r.seguroDesemprego.elegivel).toBe(true);
    expect(r.seguroDesemprego.parcelas).toBe(5);
    expect(r.seguroDesemprego.valorParcela).toBeGreaterThanOrEqual(1621);
  });

  it('sem justa causa com <12 meses → inelegível', async () => {
    const r = await calcularRescisao({ ...base, tipo: 'sem_justa_causa', dataAdmissao: '2026-01-01' });
    expect(r.seguroDesemprego.elegivel).toBe(false);
    expect(r.seguroDesemprego.parcelas).toBe(0);
  });

  it('pedido de demissão → inelegível', async () => {
    const r = await calcularRescisao({ ...base, tipo: 'pedido_demissao', avisoTrabalhado: true });
    expect(r.seguroDesemprego.elegivel).toBe(false);
  });

  it('justa causa → inelegível', async () => {
    const r = await calcularRescisao({ ...base, tipo: 'justa_causa' });
    expect(r.seguroDesemprego.elegivel).toBe(false);
  });
});

describe('calcularRescisao — Normalização de tipos', () => {
  const base = {
    salario: 3000,
    dataAdmissao: '2020-01-01',
    dataDesligamento: '2026-06-15',
    avisoTrabalhado: false,
    feriasVencidas: false,
    saldoFGTS: 0,
  };

  it('aliases legados produzem o mesmo resultado do tipo canônico', async () => {
    const jc = await calcularRescisao({ ...base, tipo: 'com_justa_causa' });
    const jcCanon = await calcularRescisao({ ...base, tipo: 'justa_causa' });
    expect(jc.totalLiquido).toBe(jcCanon.totalLiquido);

    const acordo = await calcularRescisao({ ...base, tipo: 'acordo' });
    const acordoCanon = await calcularRescisao({ ...base, tipo: 'acordo_mutuo' });
    expect(acordo.totalLiquido).toBe(acordoCanon.totalLiquido);

    const fim = await calcularRescisao({ ...base, tipo: 'fim_contrato' });
    const termino = await calcularRescisao({ ...base, tipo: 'termino_contrato' });
    expect(fim.totalLiquido).toBe(termino.totalLiquido);
  });
});
