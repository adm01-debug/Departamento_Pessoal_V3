/**
 * ============================================================================
 * SIMULADOR ROI — MOTOR DE CÁLCULO COMPARTILHADO (puro, sem React/I/O).
 *
 * FONTE ÚNICA das métricas do simulador. O componente (`RewardsSimulator`) e as
 * quatro visões analíticas consomem daqui — nenhuma fórmula é recalculada ou
 * duplicada na UI.
 *
 * ── FÓRMULAS PRESERVADAS (idênticas às da implementação original) ──────────
 *   payout             = colaboradores × salário médio × (% bônus / 100) × (meta / 100)
 *   custo de reposição = salário médio × 3 × colaboradores × 15%
 *   economia           = custo de reposição × (% redução de turnover / 100)
 *   ROI                = economia ÷ payout                 (0 quando payout = 0)
 *   resultado líquido  = economia − payout                 (derivado, para exibição)
 *
 * ── PREMISSAS (explícitas, não inventadas) ─────────────────────────────────
 *  · O payout é o custo de UM ciclo de premiação (não é valor mensal).
 *  · O custo de reposição assume 3 salários por desligamento e 15% de turnover
 *    de referência do quadro — números que JÁ existiam na fórmula original.
 *  · "Colaboradores retidos" = quadro × redução de turnover (%); é uma fração
 *    do quadro preservada pelo programa, não uma contagem nominal de pessoas.
 *  · "Por colaborador" divide os totais pelo número de colaboradores elegíveis.
 *  · "Evolução temporal" usa SOMENTE dados reais: cada cenário salvo é um ponto
 *    na data de criação, e o último ponto é a configuração atual ("Agora").
 *    Nenhuma projeção futura é inventada.
 * ============================================================================
 */

export interface ParametrosRoi {
  employees: number;
  avgSalary: number;
  bonusPercent: number;
  performanceLevel: number;
  retentionImpact: number;
}

export const PREMISSAS_ROI = {
  /** Salários necessários para repor um desligamento. */
  salariosPorReposicao: 3,
  /** Turnover de referência do quadro usado pela fórmula original. */
  turnoverBase: 0.15,
  /** Máximo de pontos na série temporal (9 salvos + "Agora"). */
  maxPontosTemporais: 10,
} as const;

export interface MetricasRoi {
  totalBudget: number;
  custoReposicao: number;
  savings: number;
  roi: number;
  resultadoLiquido: number;
  /** Colaboradores preservados pela redução de turnover (fração do quadro). */
  retidos: number;
  naoRetidos: number;
  custoPorRetido: number;
  payoutPorColaborador: number;
  economiaPorColaborador: number;
  resultadoPorColaborador: number;
}

/** Calcula TODAS as métricas derivadas do cenário. */
export function calcularMetricas(p: ParametrosRoi): MetricasRoi {
  const totalBudget = p.employees * p.avgSalary * (p.bonusPercent / 100) * (p.performanceLevel / 100);
  const custoReposicao =
    p.avgSalary * PREMISSAS_ROI.salariosPorReposicao * p.employees * PREMISSAS_ROI.turnoverBase;
  const savings = custoReposicao * (p.retentionImpact / 100);
  const roi = totalBudget > 0 ? savings / totalBudget : 0;
  const retidos = p.employees * (p.retentionImpact / 100);
  const resultadoLiquido = savings - totalBudget;
  return {
    totalBudget,
    custoReposicao,
    savings,
    roi,
    resultadoLiquido,
    retidos,
    naoRetidos: Math.max(p.employees - retidos, 0),
    custoPorRetido: retidos > 0 ? savings / retidos : 0,
    payoutPorColaborador: p.employees > 0 ? totalBudget / p.employees : 0,
    economiaPorColaborador: p.employees > 0 ? savings / p.employees : 0,
    resultadoPorColaborador: p.employees > 0 ? resultadoLiquido / p.employees : 0,
  };
}

/** Variação percentual (null quando a base é zero/não numérica). */
export function variacaoPercentual(atual: number, base: number): number | null {
  if (!Number.isFinite(base) || base === 0) return null;
  return ((atual - base) / Math.abs(base)) * 100;
}

export interface CenarioTemporal {
  id: string;
  configuracoes: ParametrosRoi;
  resultados: { totalBudget: number; savings: number };
  created_at?: string;
}

export interface PontoTemporal {
  rotulo: string;
  criadoEm: string | null;
  payout: number;
  economia: number;
  resultado: number;
  atual: boolean;
}

/**
 * Série da visão "Evolução temporal": cenários SALVOS (na data de criação) +
 * configuração atual ("Agora"). Apenas datas válidas entram; a série mantém os
 * últimos `maxPontosTemporais - 1` salvos para não comprimir o eixo.
 */
export function montarSerieTemporal(
  cenarios: CenarioTemporal[],
  atual: { metricas: MetricasRoi },
): PontoTemporal[] {
  const pontos = cenarios
    .filter((c) => c.created_at && !Number.isNaN(new Date(c.created_at).getTime()))
    .map((c) => {
      const quando = new Date(c.created_at as string);
      return {
        rotulo: new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(quando),
        criadoEm: c.created_at ?? null,
        quando: quando.getTime(),
        payout: Number(c.resultados?.totalBudget ?? 0),
        economia: Number(c.resultados?.savings ?? 0),
        resultado: Number(c.resultados?.savings ?? 0) - Number(c.resultados?.totalBudget ?? 0),
        atual: false,
      };
    })
    .sort((a, b) => a.quando - b.quando)
    .map(({ quando: _quando, ...ponto }) => ponto);

  const recentes = pontos.slice(-(PREMISSAS_ROI.maxPontosTemporais - 1));
  return [
    ...recentes,
    {
      rotulo: 'Agora',
      criadoEm: null,
      payout: atual.metricas.totalBudget,
      economia: atual.metricas.savings,
      resultado: atual.metricas.resultadoLiquido,
      atual: true,
    },
  ];
}
