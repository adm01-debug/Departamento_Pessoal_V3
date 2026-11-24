import { cn } from '@/lib/utils';
import type { TomInscricao } from './inscricoesDerivacoes';

/**
 * Badge semântico de status da inscrição. O código interno
 * (`em_andamento`, `concluido`…) nunca é exibido: o texto vem do rótulo
 * humano calculado em `statusInscricao`. As cores usam exclusivamente tokens
 * do Design System.
 */
const ESTILOS: Record<TomInscricao, { badge: string; ponto: string }> = {
  sucesso: { badge: 'border-success/25 bg-success/[0.09] text-success', ponto: 'bg-success' },
  andamento: { badge: 'border-info/25 bg-info/[0.09] text-info', ponto: 'bg-info' },
  inscrito: { badge: 'border-info/20 bg-info/[0.06] text-info/85', ponto: 'bg-info/80' },
  alerta: { badge: 'border-warning/25 bg-warning/[0.09] text-warning', ponto: 'bg-warning' },
  perigo: {
    badge:
      'border-[hsl(var(--destructive-vivid)/0.28)] bg-[hsl(var(--destructive-vivid)/0.09)] text-[hsl(var(--destructive-vivid))]',
    ponto: 'bg-[hsl(var(--destructive-vivid))]',
  },
  neutro: { badge: 'border-border/70 bg-muted/30 text-muted-foreground', ponto: 'bg-muted-foreground/70' },
};

export interface InscricaoStatusBadgeProps {
  tom: TomInscricao;
  label: string;
  /** Mostra a linha original apenas como dica de acessibilidade em status livres. */
  original?: string | null;
  className?: string;
}

export function InscricaoStatusBadge({ tom, label, original, className }: InscricaoStatusBadgeProps) {
  const estilo = ESTILOS[tom];
  const titulo = original && original !== label ? `Status original: ${original}` : undefined;

  return (
    <span
      title={titulo}
      className={cn(
        'inline-flex h-[23px] max-w-full items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 text-[10.5px] font-medium leading-none',
        estilo.badge,
        className
      )}
    >
      <span aria-hidden="true" className={cn('h-1.5 w-1.5 shrink-0 rounded-full', estilo.ponto)} />
      <span className="truncate">{label}</span>
    </span>
  );
}
