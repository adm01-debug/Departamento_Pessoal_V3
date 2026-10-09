import { Button } from '@/components/ui/button';
import { AlertTriangle, ArrowRight } from 'lucide-react';

/**
 * ============================================================================
 * FAIXA DE ALERTAS — Gestão de Desempenho.
 *
 * Faixa horizontal compacta que só aparece quando existem PENDÊNCIAS REAIS
 * (metas/PDIs com prazo vencido e ainda não concluídos, ou feedbacks com
 * status `pendente`). Sem pendências o componente devolve `null` — nada de
 * números decorativos copiados do mockup.
 * ============================================================================
 */

interface AlertasDesempenhoProps {
  metasAtrasadas: number;
  feedbacksPendentes: number;
  pdisAtrasados: number;
  onNavigate?: (tab: string) => void;
}

export function AlertasDesempenho({
  metasAtrasadas,
  feedbacksPendentes,
  pdisAtrasados,
  onNavigate,
}: AlertasDesempenhoProps) {
  const total = metasAtrasadas + feedbacksPendentes + pdisAtrasados;
  if (total === 0) return null;

  const partes = [
    metasAtrasadas > 0 && `${metasAtrasadas} ${metasAtrasadas === 1 ? 'meta atrasada' : 'metas atrasadas'}`,
    feedbacksPendentes > 0 &&
      `${feedbacksPendentes} ${feedbacksPendentes === 1 ? 'feedback pendente' : 'feedbacks pendentes'}`,
    pdisAtrasados > 0 && `${pdisAtrasados} ${pdisAtrasados === 1 ? 'PDI atrasado' : 'PDIs atrasados'}`,
  ].filter(Boolean) as string[];

  // Destino contextual: a frente com mais pendências.
  const destino =
    metasAtrasadas >= feedbacksPendentes && metasAtrasadas >= pdisAtrasados
      ? 'metas'
      : feedbacksPendentes >= pdisAtrasados
        ? 'feedbacks'
        : 'pdis';

  return (
    <div className="flex items-center gap-3 rounded-xl border border-destructive-vivid/30 bg-destructive-vivid/10 px-4 py-2.5">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-destructive-vivid/15 text-destructive-vivid">
        <AlertTriangle className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium leading-tight">
          {total} {total === 1 ? 'item precisa' : 'itens precisam'} de atenção
        </p>
        <p className="truncate text-[11px] text-muted-foreground">{partes.join(' • ')}</p>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="h-8 shrink-0 gap-1.5 border-destructive-vivid/30 text-xs text-destructive-vivid hover:bg-destructive-vivid/10 hover:text-destructive-vivid"
        onClick={() => onNavigate?.(destino)}
      >
        Ver pendências
        <ArrowRight className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
