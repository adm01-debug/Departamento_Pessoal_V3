import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { STATUS_BADGE, STATUS_LABELS, TIPO_BADGE, TIPO_LABELS } from './desligamentosComum';

/**
 * Selos de status/tipo do desligamento. Os mapas vêm de `desligamentosComum` —
 * fonte única com a Gestão, o drawer e o gráfico, para o mesmo valor nunca
 * mostrar rótulo ou cor diferentes entre as peças da tela.
 */
export function StatusBadge({ status }: { status: string }) {
  const label = STATUS_LABELS[status] || status;
  const className = STATUS_BADGE[status] || 'bg-muted text-muted-foreground border-border/30';
  return (
    <Badge variant="outline" className={cn('whitespace-nowrap text-[10px] font-body', className)}>
      {label}
    </Badge>
  );
}

export function TipoBadge({ tipo }: { tipo: string }) {
  const label = TIPO_LABELS[tipo] || tipo;
  const className = TIPO_BADGE[tipo] || 'bg-muted text-muted-foreground border-border/30';
  return (
    <Badge variant="outline" className={cn('whitespace-nowrap text-[10px] font-body', className)}>
      {label}
    </Badge>
  );
}
