/**
 * ============================================================================
 * COLUNA DO PIPELINE — mesma lane do Kanban de Admissão
 *
 * SLOT   `h-[calc(100vh-19rem)] max-h-[900px] min-h-[520px] w-[272px]` — todas as
 *        colunas compartilham a MESMA altura externa, independente da quantidade
 *        de cards; a faixa do board rola na horizontal quando a soma passa da
 *        viewport (4 colunas inteiras + parte da 5ª em 1600px).
 * COLUNA `rounded-xl border border-border/30 bg-card shadow-elevated` + overlay
 *        de gradiente da etapa; a única superfície visível é esta.
 * LISTA  `flex-1 min-h-0 overflow-y-auto` — só os cards rolam; cabeçalho e rodapé
 *        ficam fixos. SEM `overscroll-behavior: contain`: ao chegar ao fim da
 *        lista a roda continua para a página (scroll chaining).
 * VAZIO  caixa tracejada pequena "Solte aqui", discreta como na referência.
 * RODAPÉ em TODAS as colunas (`.kb-footer`), com a MESMA altura externa — em
 *        Contratado avisa "Processo concluído"; nas demais, rótulo informativo
 *        "Arraste candidatos para esta etapa". Sem botão de fachada: a
 *        inscrição de candidato é a da aba Candidatos, não da coluna (a altura
 *        externa vem do slot, `.kanban-column-visual { height: 100% }`).
 * ============================================================================
 */
import { useDroppable } from '@dnd-kit/core';
import { ShieldCheck, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEntradaKanbanColuna } from '@/components/kanban/entradaKanban';
import type { CandidaturaComRelacoes } from '@/types/recrutamento';
import type { EtapaPipeline } from './pipelineEtapas';
import { DraggablePipelineCard, type MoverEtapaHandler } from './PipelineCard';
import { TONS_PIPELINE } from './pipelineVisual';

export interface PipelineColumnProps {
  etapa: EtapaPipeline;
  items: readonly CandidaturaComRelacoes[];
  /** Posição da coluna no board — vira `--kanban-index` (onda de 180ms). */
  indice: number;
  /** A aba Pipeline está ativa? Só então a entrada é disparada. */
  isActive: boolean;
  onAbrir: (cand: CandidaturaComRelacoes) => void;
  onMoverEtapa: MoverEtapaHandler;
  onContatar: (cand: CandidaturaComRelacoes) => void;
}

export function PipelineColumn({
  etapa,
  items,
  indice,
  isActive,
  onAbrir,
  onMoverEtapa,
  onContatar,
}: PipelineColumnProps) {
  const tom = TONS_PIPELINE[etapa.id];
  const Icone = etapa.icone;
  // A COLUNA é a zona de soltura (os cards são apenas arrastáveis) — o mesmo
  // desenho do board de Admissão: `over.id` é sempre o id da etapa.
  const { setNodeRef, isOver } = useDroppable({ id: etapa.id });
  // MESMO gatilho da Admissão (mecanismo compartilhado): mede o slot, liga
  // `kanban-em-entrada` e depois `kanban-coluna-concluida`.
  const { refColuna, emEntrada, concluida, estilo } = useEntradaKanbanColuna({
    isActive,
    indice,
    totalCards: items.length,
    setNodeRef,
  });

  return (
    <div
      ref={refColuna}
      data-pipeline-coluna={etapa.id}
      data-pipeline-drop={isOver ? 'true' : 'false'}
      aria-label={`${etapa.label} — ${etapa.descricao}`}
      className="kanban-lane-slot flex h-[calc(100vh-19rem)] max-h-[900px] min-h-[520px] w-[272px] shrink-0 items-end"
    >
      <section
        style={estilo}
        className={cn(
          'kanban-column-visual relative w-full rounded-xl border border-border/30 bg-card shadow-elevated transition-colors',
          emEntrada && 'kanban-em-entrada',
          concluida && 'kanban-coluna-concluida',
          isOver && 'ring-1 ring-primary/25'
        )}
      >
        <div
          aria-hidden
          style={{ backgroundImage: tom.fundo }}
          className={cn(
            'kb-gradient pointer-events-none absolute inset-0 rounded-xl border',
            isOver ? 'border-primary/45' : tom.borda
          )}
        />

        <div className="relative z-10 flex h-full flex-col">
          <header className="kb-header shrink-0 border-b border-border/25 px-3 pb-2.5 pt-3">
            <div className="flex items-start gap-2">
              <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-lg', tom.chip)}>
                <Icone className="h-3.5 w-3.5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h3 className="truncate font-display text-[13px] font-semibold leading-tight text-foreground">
                    {etapa.label}
                  </h3>
                  <span
                    className={cn(
                      'ml-auto shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums',
                      tom.veu,
                      items.length === 0 && 'opacity-60'
                    )}
                  >
                    {items.length}
                  </span>
                </div>
                <p className="mt-0.5 line-clamp-1 text-[10.5px] leading-snug text-muted-foreground/80">
                  {etapa.descricao}
                </p>
              </div>
            </div>
          </header>

          <div data-pipeline-lista className="min-h-0 flex-1 space-y-2 overflow-y-auto px-2.5 py-2.5">
            {items.map((cand, i) => (
              <DraggablePipelineCard
                key={cand.id}
                cand={cand}
                etapa={etapa}
                cardIndex={i}
                onAbrir={onAbrir}
                onMoverEtapa={onMoverEtapa}
                onContatar={onContatar}
              />
            ))}

            {items.length === 0 && (
              <div
                data-pipeline-vazio
                className="rounded-lg border border-dashed border-border/40 px-3 py-5 text-center text-[10.5px] text-muted-foreground/60"
              >
                Solte aqui
              </div>
            )}
          </div>

          {/* RODAPÉ em TODAS as colunas (mesma anatomia do Kanban de Admissão:
              entry identica via `.kb-footer` e altura externa do rodapé igual
              entre colunas). Em Contratado avisa o encerramento; nas demais,
              um rótulo informativo de mesma altura — NUNCA botão de fachada: a
              inscrição de candidato é a da aba Candidatos, não da coluna. */}
          <footer className="kb-footer shrink-0 border-t border-border/40 p-2.5">
            <div
              className={cn(
                'flex h-8 w-full items-center justify-center gap-1.5 rounded-lg text-[11.5px] font-medium',
                etapa.id === 'contratado'
                  ? 'border border-dashed border-success/40 bg-success/5 text-success'
                  : 'text-muted-foreground/70'
              )}
            >
              {etapa.id === 'contratado' ? (
                <>
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
                  Processo concluído
                </>
              ) : (
                <>
                  <UserPlus className="h-3.5 w-3.5" aria-hidden />
                  Arraste candidatos para esta etapa
                </>
              )}
            </div>
          </footer>
        </div>
      </section>
    </div>
  );
}
