import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ArrowRight, ArrowUpRight } from 'lucide-react';
import { entradaCard } from './entradaCards';
import { descricaoProblema, type MetaDerivada } from './metasComum';

/**
 * ============================================================================
 * BANNER "FOCO AGORA" — Metas & OKRs.
 *
 * Faixa compacta que só aparece quando existem metas REAIS que precisam de
 * atenção (`metasCriticas`: atrasadas + em risco, conforme as regras de
 * `metasComum`). Sem nenhuma, o componente devolve `null` — nada de banner
 * decorativo com números copiados da referência.
 *
 * Esquerda → resumo por estado crítico; centro → meta prioritária (a mais
 * crítica da lista já ordenada) com a leitura do problema; direita → ação
 * REAL: "Ver críticas" aplica o filtro rápido correspondente na própria aba.
 *
 * TOM: vermelho/bordô translúcido (`--destructive-vivid`), como na referência.
 * A faixa SÓ existe quando há meta crítica (atrasada ou em risco), então a cor
 * de alerta está sempre justificada pelo dado — não há estado decorativo.
 * ============================================================================
 */

interface MetasCriticasBannerProps {
  /** Metas críticas já ordenadas (mais crítica primeiro). */
  criticas: MetaDerivada[];
  /** Posição na cascata de entrada (mesma régua do Dashboard Executivo). */
  indice?: number;
  /** Aplica o filtro rápido da situação mais grave — ação real da aba. */
  onVerCriticas?: () => void;
}

export function MetasCriticasBanner({ criticas, indice = 0, onVerCriticas }: MetasCriticasBannerProps) {
  if (criticas.length === 0) return null;

  const atrasadas = criticas.filter((c) => c.situacao === 'atrasada').length;
  const risco = criticas.length - atrasadas;
  const prioritária = criticas[0];

  const resumo = [
    atrasadas > 0 && `${atrasadas} ${atrasadas === 1 ? 'atrasada' : 'atrasadas'}`,
    risco > 0 && `${risco} em risco`,
  ]
    .filter(Boolean)
    .join('  •  ');

  return (
    <motion.div
      {...entradaCard(indice)}
      className="flex flex-col gap-3 rounded-xl border border-destructive-vivid/30 bg-destructive-vivid/10 px-4 py-3 lg:flex-row lg:items-center lg:gap-5"
    >
      {/* Esquerda — resumo */}
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-destructive-vivid/15 text-destructive-vivid">
          <AlertTriangle className="h-4.5 w-4.5" />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Foco agora</p>
          <p className="text-[13px] font-medium leading-tight">
            {criticas.length} {criticas.length === 1 ? 'meta precisa' : 'metas precisam'} de atenção
          </p>
          <p className="truncate text-[11px] leading-tight text-muted-foreground">{resumo}</p>
        </div>
      </div>

      <span className="hidden h-10 w-px shrink-0 bg-destructive-vivid/25 lg:block" />

      {/* Centro — meta prioritária */}
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-destructive-vivid/15 text-destructive-vivid">
          <ArrowUpRight className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium leading-tight">{prioritária.meta?.titulo}</p>
          <p className="truncate text-[11px] leading-tight text-muted-foreground">{descricaoProblema(prioritária)}</p>
        </div>
      </div>

      {/* Direita — ação */}
      <Button
        variant="outline"
        size="sm"
        className="h-8 shrink-0 gap-1.5 border-destructive-vivid/30 bg-transparent text-xs text-destructive-vivid hover:bg-destructive-vivid/10 hover:text-destructive-vivid"
        onClick={onVerCriticas}
      >
        Ver {criticas.length === 1 ? 'crítica' : 'críticas'}
        <ArrowRight className="h-3.5 w-3.5" />
      </Button>
    </motion.div>
  );
}
