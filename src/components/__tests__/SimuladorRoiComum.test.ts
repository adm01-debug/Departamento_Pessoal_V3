import { describe, it, expect } from 'vitest';
import {
  PREMISSAS_ROI,
  calcularMetricas,
  montarSerieTemporal,
  variacaoPercentual,
} from '../premiacoes/simuladorRoiComum';

const BASE = {
  employees: 50,
  avgSalary: 4500,
  bonusPercent: 10,
  performanceLevel: 85,
  retentionImpact: 5,
};

describe('simuladorRoiComum', () => {
  it('preserva a fórmula financeira original', () => {
    const m = calcularMetricas(BASE);
    expect(m.totalBudget).toBeCloseTo(19125, 2);
    expect(m.custoReposicao).toBeCloseTo(4500 * 3 * 50 * 0.15, 2);
    expect(m.savings).toBeCloseTo(5062.5, 2);
    expect(m.roi).toBeCloseTo(0.264705882, 5);
    expect(m.resultadoLiquido).toBeCloseTo(-14062.5, 2);
  });

  it('deriva as métricas de retenção e por colaborador', () => {
    const m = calcularMetricas(BASE);
    expect(m.retidos).toBeCloseTo(2.5, 5);
    expect(m.naoRetidos).toBeCloseTo(47.5, 5);
    expect(m.custoPorRetido).toBeCloseTo(5062.5 / 2.5, 2);
    expect(m.payoutPorColaborador).toBeCloseTo(382.5, 2);
    expect(m.economiaPorColaborador).toBeCloseTo(101.25, 2);
    expect(m.resultadoPorColaborador).toBeCloseTo(-281.25, 2);
  });

  it('não divide por zero quando não há colaboradores/payout', () => {
    const m = calcularMetricas({ ...BASE, employees: 0, retentionImpact: 0 });
    expect(m.totalBudget).toBe(0);
    expect(m.roi).toBe(0);
    expect(m.retidos).toBe(0);
    expect(m.custoPorRetido).toBe(0);
    expect(m.payoutPorColaborador).toBe(0);
  });

  it('monta a série temporal com cenários reais e "Agora" no fim', () => {
    const atual = calcularMetricas(BASE);
    const serie = montarSerieTemporal(
      [
        {
          id: 'b',
          configuracoes: BASE,
          resultados: { totalBudget: 100, savings: 10 },
          created_at: '2026-10-10T10:00:00.000Z',
        },
        {
          id: 'a',
          configuracoes: BASE,
          resultados: { totalBudget: 200, savings: 20 },
          created_at: '2026-09-10T10:00:00.000Z',
        },
        { id: 'sem-data', configuracoes: BASE, resultados: { totalBudget: 1, savings: 1 } },
      ],
      { metricas: atual },
    );
    expect(serie).toHaveLength(3);
    expect(serie[0].rotulo).toBe('10/09');
    expect(serie[1].rotulo).toBe('10/10');
    expect(serie[2]).toMatchObject({ rotulo: 'Agora', atual: true, payout: atual.totalBudget });
    expect(serie[2].resultado).toBeCloseTo(atual.resultadoLiquido, 2);
  });

  it('limita a série ao máximo de pontos (9 salvos + Agora)', () => {
    const cenarios = Array.from({ length: 20 }, (_, i) => ({
      id: `c-${i}`,
      configuracoes: BASE,
      resultados: { totalBudget: i + 1, savings: i },
      created_at: new Date(2026, 0, i + 1).toISOString(),
    }));
    const serie = montarSerieTemporal(cenarios, { metricas: calcularMetricas(BASE) });
    expect(serie).toHaveLength(PREMISSAS_ROI.maxPontosTemporais);
    expect(serie[serie.length - 1].rotulo).toBe('Agora');
  });

  it('calcula variação percentual com proteção contra base zero', () => {
    expect(variacaoPercentual(120, 100)).toBeCloseTo(20, 5);
    expect(variacaoPercentual(80, 100)).toBeCloseTo(-20, 5);
    expect(variacaoPercentual(10, 0)).toBeNull();
  });
});
