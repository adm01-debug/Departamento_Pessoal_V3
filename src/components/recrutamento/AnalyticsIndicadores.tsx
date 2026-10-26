import { CircleCheck, Gauge, Timer, UserMinus, Users, type LucideIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { IndicadorGeral } from './analyticsComum';
import { AnalyticsPainel, ChipContagem } from './AnalyticsPainel';
import { cn } from '@/lib/utils';

/**
 * PRINCIPAIS INDICADORES — métricas de apoio em cards horizontais.
 *
 * Cada valor tem uma legenda curta que explica de onde ele saiu (quantos
 * processos concluídos, quantos candidatos por vaga, etc.), para o número não
 * virar um selo solto. O chip do cabeçalho mostra a data de referência da base.
 */
const META: Record<
  IndicadorGeral['id'],
  { icone: LucideIcon; classe: string; dica: string }
> = {
  'tempo-contratacao': {
    icone: Timer,
    classe: 'border-info/25 bg-info/10 text-info',
    dica: 'Dias entre a entrada na base e a data de referência para os processos em Contratado.',
  },
  'candidatos-vaga': {
    icone: Users,
    classe: 'border-[hsl(var(--chart-4)/0.28)] bg-[hsl(var(--chart-4)/0.12)] text-[hsl(var(--chart-4))]',
    dica: 'Candidatos únicos divididos pelas vagas com status aberta.',
  },
  desistencia: {
    icone: UserMinus,
    classe: 'border-warning/25 bg-warning/10 text-warning',
    dica: 'Processos com status de desistência ou cancelamento divididos pelo total de candidaturas.',
  },
  aceitacao: {
    icone: CircleCheck,
    classe: 'border-success/25 bg-success/10 text-success',
    dica: 'Contratados divididos pelo total de propostas emitidas (Proposta + Contratado).',
  },
};

export function AnalyticsIndicadores({
  indicadores,
  referencia,
  index,
}: {
  indicadores: IndicadorGeral[];
  referencia: Date;
  index: number;
}) {
  return (
    <AnalyticsPainel
      icon={Gauge}
      title="Principais indicadores"
      subtitle="Métricas gerais do recrutamento na base atual"
      tom="primary"
      index={index}
      action={<ChipContagem>Base: {format(referencia, "dd MMM yyyy", { locale: ptBR })}</ChipContagem>}
    >
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {indicadores.map((indicador) => {
          const meta = META[indicador.id];
          const Icone = meta.icone;
          return (
            <div
              key={indicador.id}
              className="flex min-w-0 items-center gap-2.5 rounded-xl border border-border/40 bg-background/40 px-3 py-2.5"
              title={meta.dica}
            >
              <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border', meta.classe)}>
                <Icone className="h-4 w-4" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="truncate text-[9px] font-semibold uppercase leading-tight tracking-widest text-muted-foreground">
                  {indicador.label}
                </p>
                <p className="mt-0.5 font-display text-[17px] font-semibold leading-none text-foreground">
                  {indicador.valor}
                </p>
                <p className="mt-1 truncate text-[9.5px] leading-tight text-muted-foreground" title={indicador.apoio}>
                  {indicador.apoio}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </AnalyticsPainel>
  );
}
