/**
 * ============================================================================
 * TURNOS & ESCALAS — FAIXA DE KPI CARDS (4 indicadores reais).
 * ============================================================================
 *
 * Mesmo padrão visual dos KPI Cards do Dashboard Executivo: `Card` do design
 * system com `rounded-2xl`, borda `border-border/30`, ícone em círculo de tinta
 * translúcida (`bg-{token}/10 text-{token}`), valor em `text-xl` display e
 * rótulo miúdo. A ENTRADA é a mesma cascata de lá — `MotionCard` +
 * `entradaKpiGlobal` (fila intercalada da régua global: 14px / 520ms / 120ms),
 * com `EntradaPresenca` por fora para a cascata valer dentro da rota.
 *
 *   1. Turnos cadastrados   — catálogo + variação contra o período anterior;
 *   2. Escalas no período   — total + variação contra o período anterior;
 *   3. Colaboradores        — distintos escalados + % da equipe;
 *   4. Conflitos            — sobreposições reais + ação "Resolver".
 *
 * ── ANATOMIA ÚNICA (ícone · valor · rótulo · complemento) ───────────────────
 * Os quatro cards compartilham a MESMA estrutura, na mesma ordem, para poderem
 * ser lidos em diagonal:
 *
 *   [ícone] [valor]        ← topo, valor com destaque
 *   Rótulo do indicador    ← o que está sendo medido
 *   complemento            ← rodapé (`mt-auto`), quando existe
 *
 * O `mt-auto` do rodapé é intencional: como os quatro cards têm a mesma altura
 * (grid), os complementos alinham na mesma linha de base, independentemente de
 * o conteúdo do topo ser um pouco mais curto em um deles. Não há espaçamento
 * artificial no meio do card — o que sobra vai para o rodapé, e só nele.
 *
 * ── SEM GRÁFICO DENTRO DO CARD (decisão de design) ──────────────────────────
 * O card "Colaboradores escalados" desenhava uma BARRA DE PROGRESSO sob o
 * rótulo. Era o único KPI do painel com gráfico embutido e, num card de ~100px,
 * ela espremia o texto (o rótulo encostava na barra) sem informar nada que o
 * "x% da equipe" já não diga em uma linha. Saiu o desenho — o percentual
 * continua calculado em `calcularMetricasPainel` e é mostrado como texto. Pelo
 * mesmo motivo o card "Escalas no período" não desenha a série diária em
 * minibarras: a série continua sendo CALCULADA (é dado do painel, pode
 * alimentar um gráfico grande fora do card); o que saiu foi o desenho no card.
 *
 * Nenhum número é decorativo: todos vêm de `calcularMetricasPainel`
 * (`turnosMetricas.ts`), que só agrega as linhas carregadas do banco.
 * ============================================================================
 */
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  CalendarClock,
  CalendarRange,
  Users,
} from 'lucide-react';
import { CardContent } from '@/components/ui/card';
import { EntradaPresenca, MotionCard } from '@/components/ui/entrada-cards';
import { entradaKpiGlobal } from '@/components/ui/entradaGlobal';
import { cn } from '@/lib/utils';
import type { MetricasPainelTurnos } from './turnosMetricas';

/**
 * Ritmo vertical dos quatro cards (valor → rótulo → linha de apoio).
 *
 * O conteúdo flui do TOPO, como no `MetricCard` do Dashboard Executivo, e o
 * único elemento ancorado embaixo é o COMPLEMENTO (`mt-auto`) — é o que faz a
 * linha de apoio cair na mesma altura nos quatro cards.
 *
 * ── COMPACTAÇÃO (revisão de proporções) ─────────────────────────────────────
 * O card tinha 136px (1920) / 155px (1440) de altura para ~75px de conteúdo: o
 * padding vertical de 15px, o gap de 10px entre blocos e o círculo do ícone de
 * 35px empurravam valor e rótulo para longe um do outro. O ritmo agora é
 * `px-3 py-2.5` + `gap-1` + ícone `h-6` — o mesmo desenho, ~24% mais baixo
 * (≈104px), sem `space-between` e sem gráfico: a altura passa a ser a do
 * conteúdo + o padding padronizado.
 */
const ROTULO = 'text-[11px] leading-snug text-muted-foreground';

/** Linha de tendência (mesma anatomia da usada no Dashboard Executivo). */
function Tendencia({ variacao }: { variacao: number | null }) {
  if (variacao === null) return null;
  const positiva = variacao >= 0;
  return (
    <p className="flex items-center gap-1 whitespace-nowrap text-[10px] text-muted-foreground">
      <span
        className={cn(
          'inline-flex items-center gap-0.5 font-medium',
          positiva ? 'text-success' : 'text-destructive-vivid'
        )}
      >
        {positiva ? (
          <ArrowUpRight className="h-2.5 w-2.5" aria-hidden />
        ) : (
          <ArrowDownRight className="h-2.5 w-2.5" aria-hidden />
        )}
        {Math.abs(variacao).toFixed(1)}%
      </span>
      vs. anterior
    </p>
  );
}

/** Casca de um KPI (mesmos paddings/raios nos quatro). */
function KpiCard({ posicao, children }: { posicao: number; children: React.ReactNode }) {
  return (
    <MotionCard
      data-entrada="cascata"
      custom={posicao}
      initial="hidden"
      animate="visible"
      variants={entradaKpiGlobal}
      className="h-full overflow-hidden rounded-2xl border border-border/30"
    >
      <CardContent className="flex h-full flex-col gap-1 px-3 py-2.5">{children}</CardContent>
    </MotionCard>
  );
}

/** Topo do KPI: ícone em círculo + valor. Estrutura idêntica nos quatro. */
function KpiTopo({ icone, valor, tom }: { icone: React.ReactNode; valor: string | number; tom: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={cn('grid h-6 w-6 shrink-0 place-items-center rounded-full', tom)} aria-hidden>
        {icone}
      </span>
      <p className="text-xl font-display font-semibold leading-none tabular-nums">{valor}</p>
    </div>
  );
}

function KpiSkeleton({ posicao }: { posicao: number }) {
  return (
    <KpiCard posicao={posicao}>
      <div aria-hidden className="flex items-center gap-2">
        <span className="h-6 w-6 animate-pulse rounded-full bg-muted/50" />
        <span className="h-4 w-10 animate-pulse rounded-md bg-muted/50" />
      </div>
      <span aria-hidden className="h-3 w-24 animate-pulse rounded-full bg-muted/40" />
      <span aria-hidden className="mt-auto h-2.5 w-16 animate-pulse rounded-full bg-muted/30" />
    </KpiCard>
  );
}

export interface TurnosKpiCardsProps {
  metricas: MetricasPainelTurnos;
  carregando: boolean;
  onResolverConflitos: () => void;
}

export function TurnosKpiCards({ metricas, carregando, onResolverConflitos }: TurnosKpiCardsProps) {
  const totalConflitos = metricas.conflitos.length;

  if (carregando) {
    return (
      <EntradaPresenca>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, indice) => (
            <KpiSkeleton key={indice} posicao={indice} />
          ))}
        </div>
      </EntradaPresenca>
    );
  }

  return (
    <EntradaPresenca>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard posicao={0}>
          <KpiTopo
            icone={<CalendarClock className="h-3.5 w-3.5" />}
            valor={metricas.totalTurnos}
            tom="bg-primary/10 text-primary"
          />
          <p className={ROTULO}>Turnos cadastrados</p>
          <div className="mt-auto">
            <Tendencia variacao={metricas.variacaoTurnos} />
          </div>
        </KpiCard>

        <KpiCard posicao={1}>
          <KpiTopo
            icone={<CalendarRange className="h-3.5 w-3.5" />}
            valor={metricas.escalasNoPeriodo}
            tom="bg-info/10 text-info"
          />
          <p className={ROTULO}>Escalas no período</p>
          <div className="mt-auto">
            <Tendencia variacao={metricas.variacaoEscalas} />
          </div>
        </KpiCard>

        <KpiCard posicao={2}>
          <KpiTopo
            icone={<Users className="h-3.5 w-3.5" />}
            valor={metricas.colaboradoresEscalados}
            tom="bg-success/10 text-success"
          />
          <p className={ROTULO}>Colaboradores escalados</p>
          <div className="mt-auto">
            <p className="text-[10px] leading-snug tabular-nums text-muted-foreground">
              {metricas.percentualEquipe === null ? 'Equipe não informada' : `${metricas.percentualEquipe}% da equipe`}
            </p>
          </div>
        </KpiCard>

        <KpiCard posicao={3}>
          <KpiTopo
            icone={<AlertTriangle className="h-3.5 w-3.5" />}
            valor={totalConflitos}
            tom={totalConflitos > 0 ? 'bg-destructive/10 text-destructive-vivid' : 'bg-success/10 text-success'}
          />
          <p className={ROTULO}>Conflitos identificados</p>
          <div className="mt-auto">
            {totalConflitos > 0 ? (
              <button
                type="button"
                onClick={onResolverConflitos}
                className="inline-flex items-center gap-1 rounded-md px-1 -ml-1 text-[10px] font-semibold text-destructive-vivid transition-colors hover:bg-destructive/10"
              >
                Resolver
                <ArrowRight className="h-3 w-3" aria-hidden />
              </button>
            ) : (
              <p className="text-[10px] leading-snug text-success">Nenhum conflito</p>
            )}
          </div>
        </KpiCard>
      </div>
    </EntradaPresenca>
  );
}
