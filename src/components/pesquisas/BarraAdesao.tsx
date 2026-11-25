/**
 * ============================================================================
 * BARRA DE ADESÃO DAS PESQUISAS — trilho do `Progress` + preenchimento ANIMADO.
 *
 * Mesmo par do componente compartilhado (`ui/progress.tsx`): Root do Radix
 * (`role="progressbar"`, `aria-valuenow` vindo de `value`) com
 * `overflow-hidden rounded-full` recortando o preenchimento, que é `w-full`,
 * em degradê e anda por `translateX`. A diferença é UMA: aqui o preenchimento
 * é animado pelo Framer Motion com a régua de `./barraAdesaoAnim` (a mesma do
 * card "Amplitude de Liderança"), então ele cresce de 0 até o valor em vez de
 * aparecer pronto.
 *
 * Por isso o preenchimento NÃO repete `transition-all duration-progresso` do
 * `ui/progress.tsx`: o `animate` do Motion escreve o `transform` a cada quadro
 * e uma transição CSS em cima disso suavizaria quadro a quadro (movimento
 * pastoso). A classe-marcador `progress-indicator` continua aqui para o cartão
 * seguir com a mesma anatomia de classes das outras barras do sistema.
 *
 * Nada de dado é calculado aqui: o percentual chega pronto de `adesaoDe`.
 * ============================================================================
 */
import * as React from 'react';
import * as ProgressPrimitive from '@radix-ui/react-progress';
import { motion } from 'framer-motion';
import { useMovimentoReduzido } from '@/lib/motionMode';
import { cn } from '@/lib/utils';
import { propsPreenchimentoAdesao } from './barraAdesaoAnim';

/** Preenchimento animado — o `Indicator` do Radix com as props do Motion. */
const Preenchimento = motion.create(ProgressPrimitive.Indicator);

export type BarraAdesaoProps = React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & {
  /** Percentual final da adesão (0–100). */
  value?: number;
  /** Índice na cascata (0 = primeiro cartão da grade). */
  indice?: number;
  /** Classes do preenchimento (degradê + acabamento). */
  indicatorClassName?: string;
};

export function BarraAdesao({ value = 0, indice = 0, className, indicatorClassName, ...props }: BarraAdesaoProps) {
  const reduzirMovimento = useMovimentoReduzido();

  return (
    <ProgressPrimitive.Root
      value={value}
      className={cn('relative h-4 w-full overflow-hidden rounded-full bg-secondary', className)}
      {...props}
    >
      <Preenchimento
        {...propsPreenchimentoAdesao(value, indice, reduzirMovimento)}
        className={cn('progress-indicator h-full w-full flex-1 bg-primary', indicatorClassName)}
      />
    </ProgressPrimitive.Root>
  );
}
