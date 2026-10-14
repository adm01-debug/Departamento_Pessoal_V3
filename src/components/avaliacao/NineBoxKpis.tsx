import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MotionCard, entradaCard } from './entradaCards';

/**
 * ============================================================================
 * KPIs DO NINE-BOX — os quatro indicadores do topo.
 *
 * ENTRADA: `entradaCard(indice)` — a MESMA cascata dos KPI Cards do Dashboard
 * Executivo (fade + subida de 20px, stagger por índice), sem tocar no Dashboard
 * nem em componente global.
 *
 * HONESTIDADE DE DADO: `valor === null` NÃO vira "0". Significa "não há base
 * para calcular" (ex.: nenhum colaborador presente em dois ciclos) e o card
 * mostra "—" com a explicação no lugar da leitura contextual. Número estimado
 * nunca entra aqui.
 * ============================================================================
 */

export interface IndicadorNineBox {
  id: string;
  rotulo: string;
  /** Número principal. `null` = indicador indisponível (não é zero). */
  valor: number | null;
  /** Leitura curta abaixo do número (ex.: "33% do ciclo"). */
  contexto: string;
  icone: LucideIcon;
  /** Classes de cor do ícone (tokens do tema). */
  tom: string;
  /** Glifo discreto do canto (opcional). */
  glifo?: LucideIcon;
}

interface NineBoxKpisProps {
  indicadores: IndicadorNineBox[];
  /** Índice da cascata do primeiro card (2º item da tela = 1). */
  indiceBase?: number;
}

export function NineBoxKpis({ indicadores, indiceBase = 1 }: NineBoxKpisProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {indicadores.map((ind, i) => {
        const Glifo = ind.glifo;
        return (
          <MotionCard
            key={ind.id}
            {...entradaCard(indiceBase + i)}
            className="flex flex-col gap-1.5 rounded-xl border-border/60 bg-gradient-to-b from-card to-card/60 px-4 py-3 shadow-elevated transition-colors hover:border-primary/25"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', ind.tom)}>
                  <ind.icone className="h-4 w-4" />
                </span>
                <p className="truncate text-[11px] font-medium leading-tight text-muted-foreground">{ind.rotulo}</p>
              </div>
              {Glifo && <Glifo aria-hidden className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />}
            </div>

            <div className="flex items-baseline gap-2">
              <p
                className={cn(
                  'font-display text-[26px] font-semibold leading-none tabular-nums',
                  ind.valor === null ? 'text-muted-foreground/60' : 'text-foreground'
                )}
              >
                {ind.valor === null ? '—' : ind.valor}
              </p>
              <p className="min-w-0 truncate text-[10px] leading-snug text-muted-foreground">{ind.contexto}</p>
            </div>
          </MotionCard>
        );
      })}
    </div>
  );
}
