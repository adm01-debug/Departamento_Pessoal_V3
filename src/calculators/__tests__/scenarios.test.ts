import { describe, it, expect } from 'vitest';
import {
  calcularINSS,
  calcularIRRF,
  calcularFGTS,
} from '../impostos';
import {
  calcularRescisao,
  calcularSeguroDesemprego,
  calcularMultaFGTS,
  calcularProvisaoFerias,
  calcularProvisao13,
  calcularEncargos,
  calcularPLR,
  type TipoRescisao,
} from '../rescisao';
import {
  calcularDecimo13,
  calcularFerias,
  calcularHorasExtras,
  calcularDSR,
  calcularAdicionalNoturno,
  calcularSobreaviso,
  calcularProntidao,
  calcularSalarioFamilia,
  calcularDescontoVT,
  calcularValeAlimentacao,
  calcularBancoHoras,
  calcularInsalubridade,
  calcularPericulosidade,
} from '../beneficios';

const isFiniteNum = (n: number) => typeof n === 'number' && Number.isFinite(n);

/**
 * Suíte de SIMULAÇÃO EXAUSTIVA — centenas de cenários do dia a dia de DP/folha.
 * Combina valores de referência legais, invariantes matemáticos e casos de borda
 * (zero, negativo, NaN, teto, divisão por zero) para prever falhas e gaps.
 */

describe('Simulação — INSS (progressivo 2026, teto R$ 8.475,55)', () => {
  it('zero e negativos retornam 0', () => {
    expect(calcularINSS(0)).toBe(0);
    expect(calcularINSS(-1000)).toBe(0);
  });
  it('NaN não propaga (robustez)', () => {
    expect(isFiniteNum(calcularINSS(NaN))).toBe(true);
  });
  it('piso (salário mínimo 1518) => 113,85', () => {
    expect(calcularINSS(1518)).toBeCloseTo(113.85, 2);
  });
  it('teto e acima => contribuição máxima 988,09', () => {
    expect(calcularINSS(8475.55)).toBeCloseTo(988.09, 2);
    expect(calcularINSS(20000)).toBeCloseTo(988.09, 2);
    expect(calcularINSS(1_000_000)).toBeCloseTo(988.09, 2);
  });
  it('nunca excede o teto de contribuição e é monotônico não-decrescente', () => {
    let anterior = 0;
    for (let s = 0; s <= 12000; s += 137) {
      const v = calcularINSS(s);
      expect(isFiniteNum(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(988.10);
      expect(v).toBeGreaterThanOrEqual(anterior - 0.001);
      anterior = v;
    }
  });
});

describe('Simulação — IRRF (com escolha da base mais benéfica)', () => {
  it('zero/negativo => 0', () => {
    expect(calcularIRRF(0)).toBe(0);
    expect(calcularIRRF(-500)).toBe(0);
  });
  it('NaN não propaga', () => {
    expect(isFiniteNum(calcularIRRF(NaN))).toBe(true);
  });
  it('faixa de isenção => 0', () => {
    expect(calcularIRRF(2000)).toBe(0);
  });
  it('sempre >= 0, finito e monotônico em renda crescente', () => {
    let anterior = -1;
    for (let s = 0; s <= 30000; s += 211) {
      const v = calcularIRRF(s);
      expect(isFiniteNum(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeGreaterThanOrEqual(anterior - 0.001);
      anterior = v;
    }
  });
  it('dependentes reduzem (ou mantêm) o imposto', () => {
    const sem = calcularIRRF(6000, 0);
    const com = calcularIRRF(6000, 3);
    expect(com).toBeLessThanOrEqual(sem);
  });
});

describe('Simulação — FGTS (8%)', () => {
  it('8% do salário', () => {
    expect(calcularFGTS(1000)).toBeCloseTo(80, 2);
    expect(calcularFGTS(3500)).toBeCloseTo(280, 2);
  });
  it('zero e negativo não geram valor negativo nem NaN', () => {
    expect(calcularFGTS(0)).toBe(0);
    expect(calcularFGTS(-100)).toBeGreaterThanOrEqual(0);
    expect(isFiniteNum(calcularFGTS(NaN))).toBe(true);
  });
});

describe('Simulação — Rescisão (4 tipos × múltiplos tempos de casa)', () => {
  const base = {
    salarioBase: 3000,
    dataAdmissao: '2020-01-10',
    dataDesligamento: '2026-03-20',
    saldoFGTS: 15000,
  };
  const tipos: TipoRescisao[] = ['sem_justa_causa', 'com_justa_causa', 'pedido_demissao', 'acordo_mutuo'];

  it('todos os campos finitos e não-negativos em todos os tipos', () => {
    for (const tipoRescisao of tipos) {
      const r = calcularRescisao({ ...base, tipoRescisao });
      for (const [k, v] of Object.entries(r)) {
        expect(isFiniteNum(v as number), `${tipoRescisao}.${k} finito`).toBe(true);
        expect(v as number, `${tipoRescisao}.${k} >= 0`).toBeGreaterThanOrEqual(0);
      }
      expect(r.totalLiquido).toBeLessThanOrEqual(r.totalBruto);
    }
  });

  it('justa causa zera 13º, férias proporcionais, aviso e multa', () => {
    const r = calcularRescisao({ ...base, tipoRescisao: 'com_justa_causa' });
    expect(r.decimo13Proporcional).toBe(0);
    expect(r.feriasProporcional).toBe(0);
    expect(r.avisoPrevio).toBe(0);
    expect(r.multaFGTS).toBe(0);
  });

  it('sem justa causa: multa 40% do FGTS e aviso prévio proporcional ao tempo', () => {
    const r = calcularRescisao({ ...base, tipoRescisao: 'sem_justa_causa' });
    expect(r.multaFGTS).toBeCloseTo(15000 * 0.4, 2);
    expect(r.diasAvisoPrevio).toBeGreaterThanOrEqual(30);
    expect(r.diasAvisoPrevio).toBeLessThanOrEqual(90);
    expect(r.avisoPrevio).toBeGreaterThan(0);
  });

  it('acordo mútuo: multa 20% e meio aviso prévio', () => {
    const r = calcularRescisao({ ...base, tipoRescisao: 'acordo_mutuo' });
    expect(r.multaFGTS).toBeCloseTo(15000 * 0.2, 2);
    const cheio = calcularRescisao({ ...base, tipoRescisao: 'sem_justa_causa' });
    expect(r.avisoPrevio).toBeCloseTo(cheio.avisoPrevio * 0.5, 1);
  });

  it('pedido de demissão: sem aviso indenizado e sem multa, mas com verbas proporcionais', () => {
    const r = calcularRescisao({ ...base, tipoRescisao: 'pedido_demissao' });
    expect(r.avisoPrevio).toBe(0);
    expect(r.multaFGTS).toBe(0);
    expect(r.decimo13Proporcional).toBeGreaterThan(0);
  });

  it('terço de férias é sempre ~1/3 das férias proporcionais', () => {
    const r = calcularRescisao({ ...base, tipoRescisao: 'sem_justa_causa' });
    expect(r.tercoFeriasProporcional).toBeCloseTo(r.feriasProporcional / 3, 1);
  });

  it('férias vencidas adicionam verba + 1/3', () => {
    const semVencidas = calcularRescisao({ ...base, tipoRescisao: 'sem_justa_causa', feriasVencidas: false });
    const comVencidas = calcularRescisao({ ...base, tipoRescisao: 'sem_justa_causa', feriasVencidas: true });
    expect(comVencidas.feriasVencidas).toBeGreaterThan(semVencidas.feriasVencidas);
    expect(comVencidas.tercoFeriasVencidas).toBeCloseTo(comVencidas.feriasVencidas / 3, 2);
  });

  it('admissão = desligamento (0 dia) não quebra', () => {
    const r = calcularRescisao({ salarioBase: 2000, dataAdmissao: '2026-03-01', dataDesligamento: '2026-03-01', tipoRescisao: 'sem_justa_causa' });
    expect(isFiniteNum(r.totalBruto)).toBe(true);
    expect(r.totalBruto).toBeGreaterThanOrEqual(0);
  });

  it('varredura de tempos de casa de 1 a 240 meses mantém invariantes', () => {
    for (let meses = 1; meses <= 240; meses += 7) {
      const adm = new Date(2026, 2, 20);
      adm.setMonth(adm.getMonth() - meses);
      const r = calcularRescisao({
        salarioBase: 2500,
        dataAdmissao: adm.toISOString().slice(0, 10),
        dataDesligamento: '2026-03-20',
        tipoRescisao: 'sem_justa_causa',
        saldoFGTS: 10000,
      });
      expect(isFiniteNum(r.totalLiquido)).toBe(true);
      expect(r.totalLiquido).toBeLessThanOrEqual(r.totalBruto);
      expect(r.diasAvisoPrevio).toBeLessThanOrEqual(90);
    }
  });

  it('C34 — múltiplo exato de 12 meses: férias proporcionais = 0 (período aquisitivo completo, não 12)', () => {
    // 24 meses exatos: avosTotal=24, 24%12=0 → feriasProporcional deve ser 0
    const r = calcularRescisao({
      salarioBase: 3000,
      dataAdmissao: '2024-03-20',
      dataDesligamento: '2026-03-20',
      tipoRescisao: 'sem_justa_causa',
    });
    expect(r.feriasProporcional).toBe(0);
  });

  it('C34 — 12 meses exatos: férias proporcionais = 0', () => {
    const r = calcularRescisao({
      salarioBase: 3000,
      dataAdmissao: '2025-03-20',
      dataDesligamento: '2026-03-20',
      tipoRescisao: 'sem_justa_causa',
    });
    expect(r.feriasProporcional).toBe(0);
  });

  it('C34 — 11 meses e 16 dias: avos=12 (≥15 dias), férias prop = 0 (período completo)', () => {
    // Admissão 2025-04-04, desligamento 2026-03-20 → 11 meses + 16 dias → avos=12 → prop=0
    const r = calcularRescisao({
      salarioBase: 3000,
      dataAdmissao: '2025-04-04',
      dataDesligamento: '2026-03-20',
      tipoRescisao: 'sem_justa_causa',
    });
    expect(r.feriasProporcional).toBe(0);
    expect(r.diasAvisoPrevio).toBe(30); // C35: < 1 ano completo → sem bônus
  });

  it('C35 — 11 meses e 16 dias: aviso prévio = 30 dias (< 1 ano de serviço real)', () => {
    // Com avosTotal=12 o bug antigo calculava 1 ano → 33 dias; correto é 30 dias
    const r = calcularRescisao({
      salarioBase: 3000,
      dataAdmissao: '2025-04-04',
      dataDesligamento: '2026-03-20',
      tipoRescisao: 'sem_justa_causa',
    });
    expect(r.diasAvisoPrevio).toBe(30);
  });

  it('C35 — exatamente 1 ano: aviso prévio = 33 dias (30 + 1×3)', () => {
    const r = calcularRescisao({
      salarioBase: 3000,
      dataAdmissao: '2025-03-20',
      dataDesligamento: '2026-03-20',
      tipoRescisao: 'sem_justa_causa',
    });
    expect(r.diasAvisoPrevio).toBe(33);
  });

  it('C35 — 10 anos de serviço: aviso prévio = 60 dias (30 + 10×3)', () => {
    const r = calcularRescisao({
      salarioBase: 3000,
      dataAdmissao: '2016-03-20',
      dataDesligamento: '2026-03-20',
      tipoRescisao: 'sem_justa_causa',
    });
    expect(r.diasAvisoPrevio).toBe(60);
  });

  it('C35 — 20 anos de serviço: aviso prévio cap em 90 dias', () => {
    const r = calcularRescisao({
      salarioBase: 3000,
      dataAdmissao: '2006-03-20',
      dataDesligamento: '2026-03-20',
      tipoRescisao: 'sem_justa_causa',
    });
    expect(r.diasAvisoPrevio).toBe(90);
  });
});

describe('Simulação — Férias', () => {
  it('30 dias: bruto = férias + 1/3, líquido <= bruto', () => {
    const r = calcularFerias(3000, 30, 0, 0);
    expect(r.valorFerias).toBeCloseTo(3000, 2);
    expect(r.tercoConstitucional).toBeCloseTo(1000, 2);
    expect(r.bruto).toBeCloseTo(4000, 2);
    expect(r.liquido).toBeLessThanOrEqual(r.bruto);
  });
  it('abono pecuniário (venda de 10 dias) adiciona valor + 1/3', () => {
    const r = calcularFerias(3000, 20, 10, 0);
    expect(r.valorAbono).toBeCloseTo(1000, 2);
    expect(r.tercoAbono).toBeCloseTo(333.33, 1);
  });
  it('salário zero e negativo não geram NaN/negativo', () => {
    expect(isFiniteNum(calcularFerias(0).bruto)).toBe(true);
    const neg = calcularFerias(-100);
    expect(isFiniteNum(neg.bruto)).toBe(true);
  });
  it('varredura de salários e dias mantém líquido <= bruto e finitude', () => {
    for (let s = 0; s <= 20000; s += 1000) {
      for (const dias of [10, 15, 20, 30]) {
        const r = calcularFerias(s, dias);
        expect(isFiniteNum(r.bruto)).toBe(true);
        expect(r.liquido).toBeLessThanOrEqual(r.bruto + 0.01);
      }
    }
  });
});

describe('Simulação — 13º salário (parcelas)', () => {
  it('menos de 1 mês retorna mensagem e zeros', () => {
    const r = calcularDecimo13({ salarioBase: 2000, mesesTrabalhados: 0, parcela: 1 });
    expect(r.bruto).toBe(0);
    expect(r.mensagem).toBeTruthy();
  });
  it('1ª parcela: sem INSS/IRRF, com FGTS', () => {
    const r = calcularDecimo13({ salarioBase: 2400, mesesTrabalhados: 12, parcela: 1 });
    expect(r.inss).toBe(0);
    expect(r.irrf).toBe(0);
    expect(r.bruto).toBeCloseTo(1200, 2);
    expect(r.fgts).toBeCloseTo(96, 2);
  });
  it('2ª parcela: aplica INSS/IRRF e desconta a 1ª parcela', () => {
    const r = calcularDecimo13({ salarioBase: 2400, mesesTrabalhados: 12, parcela: 2 });
    expect(r.inss).toBeGreaterThan(0);
    expect(r.liquido).toBeLessThan(r.bruto + 0.01);
  });
  it('meses acima de 12 são limitados a 12', () => {
    const r12 = calcularDecimo13({ salarioBase: 3000, mesesTrabalhados: 12, parcela: 2 });
    const r20 = calcularDecimo13({ salarioBase: 3000, mesesTrabalhados: 20, parcela: 2 });
    expect(r20.bruto).toBeCloseTo(r12.bruto, 2);
  });
});

describe('Simulação — Horas extras, DSR e adicionais (robustez de divisor)', () => {
  it('HE 50% e 100% calculadas sobre valor-hora', () => {
    const r = calcularHorasExtras(2200, 10, 5, 220);
    expect(r.valor50).toBeCloseTo((2200 / 220) * 1.5 * 10, 2);
    expect(r.valor100).toBeCloseTo((2200 / 220) * 2.0 * 5, 2);
    expect(r.totalComDsr).toBeGreaterThanOrEqual(r.total);
  });
  it('jornada mensal zero NÃO produz Infinity (robustez)', () => {
    const r = calcularHorasExtras(2200, 10, 0, 0);
    expect(isFiniteNum(r.total)).toBe(true);
  });
  it('DSR com dias úteis <= 0 retorna 0', () => {
    expect(calcularDSR(500, 0, 4)).toBe(0);
    expect(calcularDSR(500, -3, 4)).toBe(0);
  });
  it('adicional noturno, sobreaviso e prontidão com jornada 0 não quebram', () => {
    expect(isFiniteNum(calcularAdicionalNoturno(2200, 20, 0))).toBe(true);
    expect(isFiniteNum(calcularSobreaviso(2200, 20, 0))).toBe(true);
    expect(isFiniteNum(calcularProntidao(2200, 20, 0))).toBe(true);
  });
});

describe('Simulação — Benefícios e descontos', () => {
  it('salário-família zera acima do teto', () => {
    expect(calcularSalarioFamilia(5000, 2)).toBe(0);
    expect(calcularSalarioFamilia(1500, 2)).toBeGreaterThan(0);
  });
  it('desconto de VT limitado a 6% do salário', () => {
    expect(calcularDescontoVT(2000, 500)).toBeCloseTo(120, 2); // 6% de 2000
    expect(calcularDescontoVT(2000, 50)).toBeCloseTo(50, 2); // valor real menor
  });
  it('VA/VR limitado conforme PAT', () => {
    const r = calcularValeAlimentacao(600, 2000, true);
    expect(r.desconto).toBeLessThanOrEqual(2000 * 0.2 + 0.01);
  });
  it('insalubridade e periculosidade finitas e positivas', () => {
    expect(calcularInsalubridade('maximo')).toBeGreaterThan(0);
    expect(calcularPericulosidade(3000)).toBeCloseTo(900, 2);
  });
});

describe('Simulação — Banco de horas (saldo positivo/negativo/zerado)', () => {
  it('saldo positivo formatado corretamente', () => {
    const r = calcularBancoHoras(['08:00', '02:30'], ['01:00']);
    expect(r.saldo).toBe((8 * 60) + (2 * 60 + 30) - 60); // 630 - 60 = 570
    expect(r.saldoFormatado).toBe('9:30');
  });
  it('saldo negativo recebe sinal', () => {
    const r = calcularBancoHoras(['01:00'], ['03:30']);
    expect(r.saldo).toBeLessThan(0);
    expect(r.saldoFormatado.startsWith('-')).toBe(true);
  });
  it('listas vazias => saldo 0', () => {
    const r = calcularBancoHoras([], []);
    expect(r.saldo).toBe(0);
  });
});

describe('Simulação — Seguro-desemprego, multa FGTS, provisões, encargos, PLR', () => {
  it('seguro-desemprego respeita piso (salário mínimo) e número de parcelas', () => {
    const baixo = calcularSeguroDesemprego([1200, 1200, 1200]);
    expect(baixo.valorParcela).toBeGreaterThanOrEqual(1518);
    expect(baixo.parcelas).toBe(3);
    const longo = calcularSeguroDesemprego(new Array(24).fill(3000));
    expect(longo.parcelas).toBe(5);
  });
  it('multa FGTS 40% e 20%', () => {
    expect(calcularMultaFGTS(10000, 'sem_justa_causa')).toBeCloseTo(4000, 2);
    expect(calcularMultaFGTS(10000, 'acordo_mutuo')).toBeCloseTo(2000, 2);
  });
  it('provisões de férias e 13º finitas e positivas', () => {
    const pf = calcularProvisaoFerias(3000, 6);
    const p13 = calcularProvisao13(3000, 6);
    expect(pf.total).toBeGreaterThan(0);
    expect(p13.total).toBeGreaterThan(0);
  });
  it('encargos patronais: custo total > salário base', () => {
    const e = calcularEncargos(3000);
    expect(e.custoMensalTotal).toBeGreaterThan(3000);
    expect(e.totalEncargosPatronais).toBeGreaterThan(0);
  });
  it('PLR: isento até o limite, tributado acima, líquido <= bruto', () => {
    expect(calcularPLR(5000).irrf).toBe(0);
    const alto = calcularPLR(20000);
    expect(alto.irrf).toBeGreaterThan(0);
    expect(alto.liquido).toBeLessThanOrEqual(alto.bruto);
  });
});
