import { motion } from 'framer-motion';
import { Ban, CheckCircle2, Clock3, FilePlus2, History, Pencil, RotateCcw, Send, UserCheck } from 'lucide-react';
import { DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { CascadeDialogFrame } from '@/components/ui/cascade-dialog';
import { cascadeItemVariants } from '@/components/ui/cascade-motion';
import { cn } from '@/lib/utils';

import { iniciais } from './desempenhoComum';
import type { FeedbackCanonico } from './feedbackCanonico';
import {
  formatarDataHoraHistorico,
  ROTULO_EVENTO,
  rotuloStatusHistorico,
  type EventoHistoricoFeedback,
  type TipoEventoHistorico,
} from './historicoFeedback';
import { TextoExpansivel } from './TextoExpansivel';

const ICONE: Record<TipoEventoHistorico, typeof History> = {
  criado: FilePlus2,
  editado: Pencil,
  concluido: CheckCircle2,
  encaminhado: Send,
  devolvido: RotateCcw,
  aprovado: UserCheck,
  cancelado: Ban,
  reaberto: RotateCcw,
};

const TINTA: Record<TipoEventoHistorico, string> = {
  criado: 'border-primary/35 bg-primary/10 text-primary',
  editado: 'border-info/35 bg-info/10 text-info',
  concluido: 'border-success/35 bg-success/10 text-success',
  encaminhado: 'border-info/35 bg-info/10 text-info',
  devolvido: 'border-warning/35 bg-warning/10 text-warning',
  aprovado: 'border-success/35 bg-success/10 text-success',
  cancelado: 'border-destructive-vivid/35 bg-destructive-vivid/10 text-destructive-vivid',
  reaberto: 'border-primary/35 bg-primary/10 text-primary',
};

function responsavelDoEvento(evento: EventoHistoricoFeedback): string {
  return evento.responsavelNome ?? evento.responsavelEmail ?? 'Não registrado';
}

function detalhesRelevantes(evento: EventoHistoricoFeedback): string | null {
  const d = evento.detalhes ?? {};
  const revisao = d.revisao ?? d.revisao_nova ?? d.revisao_avaliada;
  const versao = d.versao_avaliacao;
  const decisao = d.decisao;
  const tipo = d.tipo;
  return (
    [
      decisao ? `Decisão: ${String(decisao)}` : null,
      tipo ? `Tipo: ${String(tipo)}` : null,
      revisao !== undefined && revisao !== null ? `Revisão: ${String(revisao)}` : null,
      versao ? `Versão: ${String(versao)}` : null,
    ]
      .filter(Boolean)
      .join(' · ') || null
  );
}

export interface HistoricoFeedbackDialogProps {
  item: FeedbackCanonico;
  aberto: boolean;
  onOpenChange: (aberto: boolean) => void;
  eventos: EventoHistoricoFeedback[];
  carregando?: boolean;
  erro?: unknown;
}

/**
 * HISTÓRICO DA AVALIAÇÃO — mesma moldura/cascata dos modais do módulo.
 * Mostra somente eventos existentes, em ordem cronológica crescente.
 */
export function HistoricoFeedbackDialog({
  item,
  aberto,
  onOpenChange,
  eventos,
  carregando = false,
  erro = null,
}: HistoricoFeedbackDialogProps) {
  const mensagemErro =
    erro instanceof Error ? erro.message : String((erro as { message?: unknown } | null)?.message ?? '');

  return (
    <CascadeDialogFrame
      open={aberto}
      onOpenChange={onOpenChange}
      blocks={6}
      className="max-w-2xl border-border rounded-none sm:rounded-lg"
      contentClassName="max-h-[86vh] overflow-y-auto p-5 space-y-4"
    >
      <motion.div variants={cascadeItemVariants}>
        <DialogHeader>
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary ring-1 ring-inset ring-primary/20">
              <History className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <DialogTitle className="font-display text-base">Histórico da avaliação</DialogTitle>
              <DialogDescription className="truncate text-[11px]">
                {item.avaliado} · {item.cicloNome.estado === 'informado' ? item.cicloNome.valor : 'Ciclo não informado'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
      </motion.div>

      {carregando ? (
        <motion.p variants={cascadeItemVariants} className="py-8 text-center text-xs italic text-muted-foreground">
          Carregando histórico...
        </motion.p>
      ) : mensagemErro ? (
        <motion.p
          variants={cascadeItemVariants}
          className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive"
        >
          Não foi possível carregar o histórico: {mensagemErro}
        </motion.p>
      ) : eventos.length === 0 ? (
        <motion.p variants={cascadeItemVariants} className="py-8 text-center text-xs italic text-muted-foreground">
          Nenhum evento registrado para esta avaliação.
        </motion.p>
      ) : (
        <motion.div variants={cascadeItemVariants} className="space-y-2">
          {eventos.map((evento, indice) => {
            const Icone = ICONE[evento.tipo];
            const status = [evento.statusAnterior, evento.statusPosterior].filter(Boolean) as string[];
            const detalhes = detalhesRelevantes(evento);
            return (
              <div key={evento.id} className="relative flex gap-3">
                <div className="flex w-8 shrink-0 flex-col items-center">
                  <span
                    className={cn('flex h-7 w-7 items-center justify-center rounded-full border', TINTA[evento.tipo])}
                  >
                    <Icone className="h-3.5 w-3.5" />
                  </span>
                  {indice < eventos.length - 1 && <span aria-hidden className="mt-1 w-px flex-1 bg-border/50" />}
                </div>

                <div className="min-w-0 flex-1 rounded-lg border border-border/50 bg-background/50 px-3 py-2">
                  <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                    <div className="min-w-0">
                      <p className="text-[12px] font-semibold leading-tight">{ROTULO_EVENTO[evento.tipo]}</p>
                      <p className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Clock3 className="h-3 w-3 shrink-0" />
                        {formatarDataHoraHistorico(evento.ocorridoEm)}
                      </p>
                    </div>
                    {status.length > 0 && (
                      <Badge
                        variant="outline"
                        className="h-5 max-w-full rounded-md border-border/60 bg-muted/40 px-1.5 text-[10px] font-medium text-muted-foreground"
                      >
                        <span className="truncate">
                          {status.length > 1
                            ? `${rotuloStatusHistorico(status[0])} → ${rotuloStatusHistorico(status[1])}`
                            : rotuloStatusHistorico(status[0])}
                        </span>
                      </Badge>
                    )}
                  </div>

                  <div className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[8px] font-semibold">
                      {iniciais(responsavelDoEvento(evento))}
                    </span>
                    <span className="truncate">Responsável: {responsavelDoEvento(evento)}</span>
                  </div>

                  {evento.justificativa && (
                    <div className="mt-2 rounded-md border border-border/40 bg-muted/20 px-2 py-1.5">
                      <p className="mb-0.5 text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
                        Justificativa
                      </p>
                      <TextoExpansivel texto={evento.justificativa} limite={220} classeRecorte="line-clamp-3" />
                    </div>
                  )}

                  {detalhes && <p className="mt-1.5 text-[10px] text-muted-foreground/80">{detalhes}</p>}
                </div>
              </div>
            );
          })}
        </motion.div>
      )}
    </CascadeDialogFrame>
  );
}
