import { Minus, TrendingDown, TrendingUp, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * ============================================================================
 * INDICADOR DE EVOLUÇÃO — "+12% desde a última atualização".
 *
 * Componente ÚNICO e reutilizável pelos cards da aba "Metas & OKRs" (região de
 * progresso, imediatamente ABAIXO do painel de prazo e à DIREITA do donut).
 *
 * SEMÂNTICA: a variação chega em PONTOS PERCENTUAIS — progresso ATUAL menos a
 * medição ANTERIOR (ex.: 51% → 63% = `+12`), nunca variação relativa. O valor é
 * calculado em `metasComum.derivarMeta` e só existe quando há histórico real
 * (`progresso_anterior`); sem histórico o card NÃO renderiza o indicador.
 *
 * TRÊS ESTADOS, na linguagem da referência:
 *   • alta   → `TrendingUp`, ícone + percentual em verde-success;
 *   • baixa  → `TrendingDown`, ícone + percentual em vermelho-vivo;
 *   • neutra → `Minus`, ícone + percentual em cinza (sem alteração).
 * O texto complementar é SEMPRE cinza claro. Sem background, badge ou container
 * quadrado: o indicador vive direto sobre o fundo do card. Dimensões compactas
 * (ícone 14 px, percentual 12 px semibold, complemento 11 px, gap 4 px) para não
 * aumentar a altura do card — a distância até o painel de prazo (8 px) é do
 * chamador.
 * ============================================================================
 */

interface IndicadorEvolucaoProps {
  /** Variação em PONTOS PERCENTUAIS (ex.: `12` = +12%). */
  variacao: number;
  className?: string;
}

/** Aparência de cada estado: ícone + tinta semântica (ver documentação). */
const APARENCIA: Record<'alta' | 'baixa' | 'neutra', { Icone: LucideIcon; tinta: string }> = {
  alta: { Icone: TrendingUp, tinta: 'text-success' },
  baixa: { Icone: TrendingDown, tinta: 'text-destructive-vivid' },
  neutra: { Icone: Minus, tinta: 'text-muted-foreground' },
};

export function IndicadorEvolucao({ variacao, className }: IndicadorEvolucaoProps) {
  const tom = variacao > 0 ? 'alta' : variacao < 0 ? 'baixa' : 'neutra';
  const { Icone, tinta } = APARENCIA[tom];
  const percentual = `${variacao > 0 ? '+' : ''}${variacao}%`;

  return (
    <p
      className={cn('flex min-w-0 items-center gap-1 text-[11px] leading-tight', className)}
      aria-label={`${percentual} em pontos percentuais desde a última atualização`}
    >
      <Icone className={cn('h-3.5 w-3.5 shrink-0', tinta)} aria-hidden="true" />
      <span className={cn('text-[12px] font-semibold tabular-nums', tinta)}>{percentual}</span>
      <span className="text-muted-foreground">desde a última atualização</span>
    </p>
  );
}
