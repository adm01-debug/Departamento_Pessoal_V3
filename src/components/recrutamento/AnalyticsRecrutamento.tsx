import { useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Briefcase,
  Minus,
  Users,
  Workflow,
  type LucideIcon,
} from 'lucide-react';
import { CardContent } from '@/components/ui/card';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { AnimatedNumber } from '@/components/dashboard/AnimatedNumber';
import { MotionCard, entradaCard } from '@/components/ui/entrada-cards';
import { cn } from '@/lib/utils';
import type { CandidatoRow, CandidaturaComRelacoes, VagaRow } from '@/types/recrutamento';
import { construirAnalytics, type KpiRecrutamento } from './analyticsComum';
import { AnalyticsFunil } from './AnalyticsFunil';
import { AnalyticsEvolucao } from './AnalyticsEvolucao';
import { AnalyticsOrigens } from './AnalyticsOrigens';
import { AnalyticsTempo } from './AnalyticsTempo';
import { AnalyticsAtencao } from './AnalyticsAtencao';
import { AnalyticsVagas } from './AnalyticsVagas';
import { AnalyticsIndicadores } from './AnalyticsIndicadores';

/**
 * ============================================================================
 * ABA ANALYTICS — dashboard analítico do Recrutamento & Seleção
 *
 * Composição em quatro faixas, como na referência aprovada:
 *   1. KPIs ......... vagas, candidatos, processos ativos e conversão;
 *   2. Visão geral .. funil por etapa, evolução mensal e origens;
 *   3. Operação ..... tempo por etapa, pontos de atenção e vagas;
 *   4. Indicadores .. tempo de contratação, candidatos/vaga, desistência e
 *                     aceitação de proposta.
 *
 * TODA a matemática mora em `analyticsComum.ts` (funções puras e testadas).
 * Aqui só existe apresentação: tokens do Design System, ícones já usados no
 * módulo, `font-display`/`font-body` e a MESMA cascata de entrada do restante
 * da tela (`entradaCard`). Nenhum dado é criado nesta camada.
 * ============================================================================
 */
type TomKpi = 'success' | 'info' | 'chart4' | 'warning';

const KPI_VISUAL: Record<
  KpiRecrutamento['id'],
  { icone: LucideIcon; tom: TomKpi; tooltip: string }
> = {
  vagas: {
    icone: Briefcase,
    tom: 'success',
    tooltip: 'Vagas com status aberta na base do recrutamento.',
  },
  candidatos: {
    icone: Users,
    tom: 'info',
    tooltip: 'Candidatos únicos cadastrados — cada pessoa conta uma vez, mesmo com mais de uma candidatura.',
  },
  processos: {
    icone: Workflow,
    tom: 'chart4',
    tooltip: 'Candidaturas que ainda não foram concluídas, canceladas, desistidas ou reprovadas.',
  },
  conversao: {
    icone: BarChart3,
    tom: 'warning',
    tooltip: 'Contratações concluídas divididas pelo total de candidaturas da base.',
  },
};

const ESTILO_KPI: Record<
  TomKpi,
  { chip: string; linha: string; halo: string }
> = {
  success: {
    chip: 'border-success/25 bg-success/10 text-success',
    linha: 'via-success/60',
    halo: 'bg-success/10',
  },
  info: {
    chip: 'border-info/25 bg-info/10 text-info',
    linha: 'via-info/60',
    halo: 'bg-info/10',
  },
  chart4: {
    chip: 'border-[hsl(var(--chart-4)/0.28)] bg-[hsl(var(--chart-4)/0.12)] text-[hsl(var(--chart-4))]',
    linha: 'via-[hsl(var(--chart-4)/0.6)]',
    halo: 'bg-[hsl(var(--chart-4)/0.10)]',
  },
  warning: {
    chip: 'border-warning/25 bg-warning/10 text-warning',
    linha: 'via-warning/60',
    halo: 'bg-warning/10',
  },
};

function KpiCard({ kpi, index }: { kpi: KpiRecrutamento; index: number }) {
  const visual = KPI_VISUAL[kpi.id];
  const estilo = ESTILO_KPI[visual.tom];
  const Icone = visual.icone;
  const ehPercentual = kpi.id === 'conversao';

  return (
    <MotionCard
      {...entradaCard(index)}
      data-analytics-kpi={kpi.id}
      className="group relative flex min-h-[126px] flex-col overflow-hidden rounded-2xl border-border/40 bg-card/70 shadow-card transition-colors hover:border-border/60"
    >
      <span
        aria-hidden
        className={cn('absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent to-transparent', estilo.linha)}
      />
      <span
        aria-hidden
        className={cn('pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full blur-3xl', estilo.halo)}
      />
      <CardContent className="relative flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="inline-flex min-w-0 items-center gap-1 text-[9.5px] font-semibold uppercase tracking-widest text-muted-foreground">
            <span className="truncate">{kpi.label}</span>
            <InfoTooltip content={visual.tooltip} side="top" align="start" />
          </p>
          <span
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-colors',
              estilo.chip
            )}
          >
            <Icone className="h-4 w-4" aria-hidden />
          </span>
        </div>

        <p className="mt-2.5 font-display text-[30px] font-semibold leading-none tracking-tight tabular-nums text-foreground">
          <AnimatedNumber
            value={kpi.valor}
            duration={0.9}
            decimals={ehPercentual ? 1 : 0}
            format={ehPercentual ? (numero) => `${numero.toFixed(1).replace('.', ',')}%` : undefined}
          />
        </p>

        <div className="mt-auto pt-2.5">
          {kpi.tendencia && (
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
              <span
                className={cn(
                  'inline-flex items-center gap-0.5 text-[10px] font-semibold leading-none',
                  kpi.tendencia.neutra
                    ? 'text-muted-foreground'
                    : kpi.tendencia.positiva
                      ? 'text-success'
                      : 'text-destructive-vivid'
                )}
              >
                {kpi.tendencia.neutra ? (
                  <Minus className="h-3 w-3" aria-hidden />
                ) : kpi.tendencia.positiva ? (
                  <ArrowUpRight className="h-3 w-3" aria-hidden />
                ) : (
                  <ArrowDownRight className="h-3 w-3" aria-hidden />
                )}
                {kpi.tendencia.texto}
              </span>
              <span className="text-[9.5px] leading-snug text-muted-foreground">{kpi.tendencia.label}</span>
            </div>
          )}
          <p className="mt-0.5 truncate text-[9.5px] leading-snug text-muted-foreground" title={kpi.apoio}>
            {kpi.apoio}
          </p>
        </div>
      </CardContent>
    </MotionCard>
  );
}

export function AnalyticsRecrutamento({
  candidaturas,
  vagas,
  candidatos,
}: {
  candidaturas: CandidaturaComRelacoes[];
  vagas: VagaRow[];
  candidatos: CandidatoRow[];
}) {
  const analytics = useMemo(
    () => construirAnalytics({ candidaturas, vagas, candidatos }),
    [candidaturas, vagas, candidatos]
  );

  return (
    <div data-analytics-recrutamento className="space-y-3.5 sm:space-y-4">
      {/* Cabeçalho da aba — contexto + data de referência da base. */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-0.5">
        <div className="min-w-0">
          <h2 className="font-display text-[15px] font-semibold tracking-tight text-foreground">
            Visão analítica do recrutamento
          </h2>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Funil, origens e desempenho derivados da base atual do módulo.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border/40 bg-card/60 px-2.5 py-1 text-[10px] leading-none text-muted-foreground">
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-success" />
          Base de referência: {format(analytics.referencia, 'dd MMM yyyy', { locale: ptBR })}
        </span>
      </div>

      {/* 1 · KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        {analytics.kpis.map((kpi, indice) => (
          <KpiCard key={kpi.id} kpi={kpi} index={indice} />
        ))}
      </div>

      {/* 2 · Funil · Evolução · Origens */}
      <div className="grid gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1.05fr)_minmax(0,0.85fr)]">
        <div className="h-full md:col-span-2 xl:col-span-1">
          <AnalyticsFunil
            funil={analytics.funil}
            conversoes={analytics.conversoes}
            total={analytics.totalCandidaturas}
            index={4}
          />
        </div>
        <AnalyticsEvolucao candidaturas={candidaturas} referencia={analytics.referencia} index={5} />
        <AnalyticsOrigens origens={analytics.origens} index={6} />
      </div>

      {/* 3 · Tempo por etapa · Pontos de atenção · Desempenho por vaga */}
      <div className="grid gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1.02fr)_minmax(0,1.12fr)_minmax(0,1fr)]">
        <AnalyticsTempo tempos={analytics.tempos} index={7} />
        <AnalyticsAtencao atencao={analytics.atencao} index={8} />
        <div className="h-full md:col-span-2 xl:col-span-1">
          <AnalyticsVagas vagas={analytics.vagas} index={9} />
        </div>
      </div>

      {/* 4 · Indicadores gerais */}
      <AnalyticsIndicadores
        indicadores={analytics.indicadores}
        referencia={analytics.referencia}
        index={10}
      />
    </div>
  );
}
