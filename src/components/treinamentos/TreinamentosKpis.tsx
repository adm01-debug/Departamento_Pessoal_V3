import { ArrowDownRight, ArrowUpRight, Award, CheckCircle2, Clock, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { AnimatedNumber } from '@/components/dashboard/AnimatedNumber';
import { CardContent } from '@/components/ui/card';
import { EntradaPresenca, MotionCard, entradaCard } from '@/components/ui/entrada-cards';
import { cn } from '@/lib/utils';
import type { IndicadoresTreinamentos } from './treinamentosDerivacoes';

/**
 * Faixa de 4 KPIs horizontais do Hub de Treinamentos.
 *
 * MESMA composição e MESMA escala do KPI do Dashboard (referência obrigatória —
 * ver `DashboardExecutivoPage`, bloco `kpis.map`): `CardContent` com `p-3`,
 * ícone 36×36 circular, título `text-xs`, número `text-2xl` e linha de apoio
 * discreta. A altura renderizada fica na mesma faixa do Dashboard (~90 px),
 * porque usa exatamente as mesmas classes — nada de padding/altura paralelos.
 *
 * Movimento: `entradaCard` (a MESMA cascata dos KPI Cards do Dashboard
 * Executivo) + `EntradaPresenca`, que devolve o keyframe `hidden` sob o
 * `AnimatePresence initial={false}` das rotas. A contagem usa o
 * `AnimatedNumber` compartilhado (uma vez por montagem; scroll não reinicia).
 *
 * Dados: cada indicador vem de `calcularIndicadoresTreinamentos` — sem números
 * fixos da referência. Indicador sem base aparece como "—" (ver `disponivel`).
 */

type TomKpi = 'info' | 'success' | 'warning' | 'accent';

/** Chip do ícone — mesmo padrão plano (`bg-{cor}/10 text-{cor}`) do Dashboard. */
const TOM_ICONE: Record<TomKpi, string> = {
  info: 'bg-info/10 text-info',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  accent: 'bg-xp/10 text-xp',
};

interface TreinamentoKpiCardProps {
  title: string;
  value: number | null;
  description: string;
  icon: LucideIcon;
  tone: TomKpi;
  index: number;
  sufixo?: string;
  trend?: number | null;
  tooltip?: string;
}

function TreinamentoKpiCard({
  title,
  value,
  description,
  icon: Icon,
  tone,
  index,
  sufixo,
  trend,
  tooltip,
}: TreinamentoKpiCardProps) {
  const disponivel = value !== null;
  return (
    <MotionCard
      {...entradaCard(index)}
      data-kpi={title}
      className="h-full overflow-hidden rounded-xl border border-border/60 transition-colors duration-300 hover:border-primary/40"
    >
      <CardContent className="flex h-full items-center gap-2.5 p-3">
        <div className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-full', TOM_ICONE[tone])}>
          <Icon className="h-4 w-4" />
        </div>

        <div className="min-w-0 flex-1">
          <p
            className="flex items-center gap-1 truncate text-xs font-normal leading-snug tracking-wide text-muted-foreground"
            title={title}
          >
            <span className="truncate">{title}</span>
          </p>

          <div className="mt-1.5 flex min-w-0 items-center gap-1.5">
            <span
              className={cn(
                'truncate font-display text-2xl font-semibold leading-none',
                disponivel ? 'text-foreground' : 'text-muted-foreground/60'
              )}
              title={disponivel ? undefined : (tooltip ?? 'Sem dados suficientes para calcular este indicador.')}
            >
              {disponivel ? <AnimatedNumber value={value} format={sufixo ? (n) => `${n}${sufixo}` : undefined} /> : '—'}
            </span>

            {disponivel && trend !== null && trend !== undefined && trend !== 0 && (
              <span
                className={cn(
                  'inline-flex shrink-0 items-center gap-0.5 text-[10px] font-medium tabular-nums',
                  trend >= 0 ? 'text-success' : 'text-destructive'
                )}
                title="Variação contra o ano anterior (certificados emitidos)"
              >
                {trend >= 0 ? <ArrowUpRight className="h-2.5 w-2.5" /> : <ArrowDownRight className="h-2.5 w-2.5" />}
                {Math.abs(trend)}%
              </span>
            )}
          </div>

          <p className="mt-1 truncate text-xs leading-snug text-muted-foreground" title={description}>
            {description}
          </p>
        </div>
      </CardContent>
    </MotionCard>
  );
}

export function TreinamentosKpis({ indicadores }: { indicadores: IndicadoresTreinamentos }) {
  const cards: Omit<TreinamentoKpiCardProps, 'index'>[] = [
    {
      title: 'Participação ativa',
      value: indicadores.participacaoDisponivel ? indicadores.participacaoAtiva : null,
      description: 'colaboradores inscritos',
      icon: Users,
      tone: 'info',
      tooltip: 'Nenhuma inscrição em andamento foi encontrada para a empresa atual.',
    },
    {
      title: 'Conclusão no período',
      value: indicadores.conclusaoDisponivel ? indicadores.conclusaoPercentual : null,
      description: 'taxa de conclusão',
      icon: CheckCircle2,
      tone: 'success',
      sufixo: '%',
      tooltip: 'Ainda não há inscrições para calcular a taxa de conclusão.',
    },
    {
      title: 'Pendências obrigatórias',
      value: indicadores.pendenciasDisponiveis ? indicadores.pendenciasObrigatorias : null,
      description: 'treinamentos pendentes',
      icon: Clock,
      tone: 'warning',
      tooltip: 'Não há cursos obrigatórios cadastrados ou inscrições suficientes para calcular pendências.',
    },
    {
      title: 'Certificados emitidos',
      value: indicadores.certificadosDisponiveis ? indicadores.certificadosAno : null,
      description: 'neste ano',
      icon: Award,
      tone: 'accent',
      trend: indicadores.variacaoCertificados,
      tooltip: 'Nenhum certificado emitido para a empresa atual.',
    },
  ];

  return (
    <EntradaPresenca>
      <div className="grid grid-cols-1 gap-3 min-[640px]:grid-cols-2 min-[1200px]:grid-cols-4">
        {cards.map((card, index) => (
          <TreinamentoKpiCard key={card.title} {...card} index={index} />
        ))}
      </div>
    </EntradaPresenca>
  );
}
