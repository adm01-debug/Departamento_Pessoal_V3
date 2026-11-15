/**
 * ============================================================================
 * BARRA DE PROGRESSO — componente único das barras horizontais do módulo.
 *
 * Aplica a régua de `./barraProgressoAnim` (a MESMA animação do card "Amplitude
 * de Liderança" — ver lá) sobre um trilho `overflow-hidden rounded-full`. O
 * preenchimento recebe `h-full rounded-full` e o degradê pedido pelo chamador
 * (`gradienteProgresso`, ou o `barra` de uma faixa semântica), ficando com a
 * mesma silhueta e o mesmo movimento em qualquer altura/largura.
 * ============================================================================
 */
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { propsBarraProgresso } from './barraProgressoAnim';

interface BarraProgressoProps {
  /** Percentual final (0–100). `null` = sem dado: trilho vazio. */
  percentual: number | null;
  /** Posição na cascata (0 = primeira barra da lista). */
  indice?: number;
  /** Classes de cor/degradê do preenchimento (ex.: `gradienteProgresso(pct)`). */
  cor: string;
  /** Movimento reduzido (ver `useMovimentoReduzido`). */
  reduzirMovimento?: boolean;
  /** Classes do TRILHO: altura, largura (`w-16`, `flex-1`…) e cor de fundo. */
  trilhoClassName?: string;
  /** Classes extras do preenchimento (ex.: `transition-colors`). */
  className?: string;
}

/**
 * Barra de progresso animada. O trilho é `block` (funciona como item flex e em
 * célula de tabela) e o preenchimento fica com `h-full rounded-full`.
 */
export function BarraProgresso({
  percentual,
  indice = 0,
  cor,
  reduzirMovimento = false,
  trilhoClassName,
  className,
}: BarraProgressoProps) {
  return (
    <span className={cn('block overflow-hidden rounded-full', trilhoClassName)}>
      <motion.span
        {...propsBarraProgresso(percentual ?? 0, indice, reduzirMovimento)}
        className={cn('block h-full rounded-full', cor, className)}
      />
    </span>
  );
}
