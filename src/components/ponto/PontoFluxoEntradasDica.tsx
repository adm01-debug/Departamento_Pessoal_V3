/**
 * ============================================================================
 * DICA (tooltip) DO GRÁFICO "FLUXO DE ENTRADAS POR HORÁRIO".
 *
 * Uma dica por coluna, ancorada na própria barra — não segue o mouse. Quem
 * posiciona é o gráfico (`GestaoPontoAnalytics`, que prende a caixa dentro da
 * área do plot); aqui mora só o CONTEÚDO e a entrada.
 *
 * CONTEÚDO (hierarquia pedida): intervalo em destaque, entradas registradas,
 * participação no total — calculada em tempo real sobre a série exibida, nunca
 * fixada — e a marca de pico quando o horário é o de maior volume.
 *
 * ENTRADA: fade + 4 px de subida (`easeOut`, 150 ms — o mesmo
 * `--transition-duration-tooltip` da régua). Pode parecer que contraria
 * `docs/tooltips-graficos.md` ("tooltip de gráfico só opacidade"), mas aquela
 * regra existe por causa do Recharts, que posiciona a tooltip por
 * `transform: translate()` e animava a POSIÇÃO (a tooltip "voava" até o mouse).
 * Aqui a posição é calculada ANTES de a caixa aparecer e não é interpolada: o
 * deslocamento de 4 px é entrada, não movimento até o cursor.
 *
 * COR/ACABAMENTO: só tokens do sistema (`bg-popover`, `border-border`,
 * `text-primary` no lime). Nenhuma cor nova, nenhuma fonte nova.
 * ============================================================================
 */
import type { Ref } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Clock, TrendingUp, Zap } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DicaFluxoEntradasProps {
  /** Hora cheia da coluna ativa (`08:00`). */
  hour: string;
  /** Entradas registradas nessa hora. */
  count: number;
  /** Total de entradas da série exibida — denominador da participação. */
  total: number;
  /** `true` quando o horário é o de maior volume do gráfico. */
  ehPico: boolean;
  /** Movimento reduzido (`useMovimentoReduzido`): a caixa aparece pronta. */
  reduzido: boolean;
  /** Referência da caixa — o gráfico usa para medir e posicionar. */
  elementoRef?: Ref<HTMLDivElement>;
}

/** Participação (%) do horário no total exibido — derivada, nunca fixada. */
function participacaoNoTotal(count: number, total: number): number {
  if (!Number.isFinite(count) || !Number.isFinite(total) || total <= 0) return 0;
  return Math.round((count / total) * 100);
}

/** Uma linha rótulo → valor, com o ícone da biblioteca já usada no sistema. */
function LinhaDica({
  Icone,
  rotulo,
  valor,
  destaque = false,
}: {
  Icone: LucideIcon;
  rotulo: string;
  valor: string;
  destaque?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="flex min-w-0 items-center gap-1 text-[10px] leading-none text-muted-foreground">
        <Icone className="h-3 w-3 shrink-0" />
        <span className="truncate">{rotulo}</span>
      </span>
      <span
        className={cn(
          'shrink-0 text-[10px] font-semibold leading-none tabular-nums',
          destaque ? 'text-primary' : 'text-foreground'
        )}
      >
        {valor}
      </span>
    </div>
  );
}

export function DicaFluxoEntradas({ hour, count, total, ehPico, reduzido, elementoRef }: DicaFluxoEntradasProps) {
  const participacao = participacaoNoTotal(count, total);

  return (
    <motion.div
      ref={elementoRef}
      role="tooltip"
      initial={reduzido ? false : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduzido ? 0 : 0.15, ease: 'easeOut' }}
      // `pointer-events-none`: a caixa nunca intercepta o ponteiro — o hover
      // continua sendo da coluna, que é quem sabe qual barra está ativa.
      className="pointer-events-none absolute z-10 w-[172px] rounded-lg border border-border/60 bg-popover px-2 py-1.5 text-left shadow-[0_12px_28px_-14px_hsl(0_0%_0%/0.8)]"
    >
      {/* Horário em destaque — intervalo completo do bloco de uma hora. */}
      <div className="flex items-center gap-1.5 border-b border-border/40 pb-1">
        <Clock className="h-3.5 w-3.5 shrink-0 text-primary" />
        <span className="truncate text-[11px] font-semibold leading-none tabular-nums text-foreground">
          {hour} – {hour.slice(0, 2)}:59
        </span>
      </div>

      <div className="mt-1 space-y-0.5">
        <LinhaDica Icone={ArrowRight} rotulo="Entradas registradas" valor={String(count)} />
        <LinhaDica Icone={TrendingUp} rotulo="Participação no total" valor={`${participacao}%`} destaque />
      </div>

      {ehPico && (
        <div className="mt-1 flex items-center gap-1 border-t border-primary/25 pt-1 text-[10px] font-medium leading-none text-primary">
          <Zap className="h-3 w-3 shrink-0" />
          Pico de movimentação
        </div>
      )}
    </motion.div>
  );
}
