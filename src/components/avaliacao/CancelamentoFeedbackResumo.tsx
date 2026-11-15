import { Ban, History } from 'lucide-react';

import { Button } from '@/components/ui/button';

import type { FeedbackCanonico } from './feedbackCanonico';
import { formatarDataHoraHistorico, resumoCancelamento } from './historicoFeedback';
import { TextoExpansivel } from './TextoExpansivel';
import { useHistoricoFeedback } from './useHistoricoFeedback';

/**
 * Faixa compacta do card para feedback cancelado.
 *
 * A fonte é `useHistoricoFeedback` — a MESMA query do modal. O componente só é
 * montado quando o status é `cancelado`, então cards normais não fazem consulta.
 */
export function CancelamentoFeedbackResumo({
  item,
  onVerHistorico,
}: {
  item: FeedbackCanonico;
  onVerHistorico: () => void;
}) {
  const { data: eventos = [] } = useHistoricoFeedback(item, true);
  const resumo = resumoCancelamento(eventos);
  const motivoRegistrado = String(
    (item.feedback as { motivo_cancelamento?: unknown } | undefined)?.motivo_cancelamento ?? ''
  ).trim();
  const motivo = resumo.motivo ?? (motivoRegistrado || 'Motivo não registrado');
  const responsavel = resumo.responsavel ?? 'Não registrado';
  const quando = formatarDataHoraHistorico(resumo.ocorridoEm);

  return (
    <div className="rounded-lg border border-destructive-vivid/25 bg-destructive-vivid/5 px-2.5 py-2">
      <div className="flex items-start gap-2">
        <Ban className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive-vivid" />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="text-[9px] font-medium uppercase tracking-wider text-destructive-vivid">
              Motivo do cancelamento
            </span>
            <span className="text-[9px] text-muted-foreground">{quando}</span>
          </div>
          <TextoExpansivel texto={motivo} limite={150} classeRecorte="line-clamp-1" className="text-muted-foreground" />
          <p className="truncate text-[9px] text-muted-foreground">Por {responsavel}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-7 shrink-0 gap-1 rounded-lg px-2 text-[10px]"
          onClick={onVerHistorico}
        >
          <History className="h-3 w-3" />
          Ver histórico
        </Button>
      </div>
    </div>
  );
}
