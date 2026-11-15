import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * ============================================================================
 * ESTRELAS DE NOTA — 5 estrelas preenchidas conforme o valor real da nota.
 *
 * Componente único da aba "Feedbacks" (usado no card e no dialog de detalhe),
 * sempre com o MESMO ícone (`Star`) e a MESMA tinta já usada pelo módulo para
 * nota (`--warning`). A quantidade preenchida é a nota ARREDONDADA (mesma régua
 * de `feedbacksComum.faixaNota`), então estrelas, número e badge textual nunca
 * discordam.
 * ============================================================================
 */

interface EstrelasNotaProps {
  /** Nota real (0–5). */
  nota: number;
  /** Classes do ícone preenchido (tinta semântica da faixa). */
  tinta: string;
  /** Lado do ícone em classes Tailwind (o card usa 3.5, o dialog 4). */
  tamanho?: string;
  className?: string;
}

export function EstrelasNota({ nota, tinta, tamanho = 'h-3.5 w-3.5', className }: EstrelasNotaProps) {
  const preenchidas = Math.min(5, Math.max(0, Math.round(nota)));

  return (
    <span className={cn('flex items-center gap-0.5', className)} aria-label={`Nota ${nota} de 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(tamanho, i <= preenchidas ? cn(tinta, 'fill-current') : 'text-muted-foreground/25')}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}
