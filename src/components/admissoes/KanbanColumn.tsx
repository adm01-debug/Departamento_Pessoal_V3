/**
 * Coluna (lane) do Kanban de Admissões.
 *
 * ENTRADA 100% CSS (ver o bloco `KANBAN … ENTRADA DAS COLUNAS` no `src/index.css`):
 * nada de Framer Motion no crescimento — o JS aqui só LIGA/DESLIGA a classe de
 * disparo. A mecânica mora nas keyframes.
 *
 *   <div class="kanban-lane-slot … items-end">        ← SLOT: altura FINAL, transparente
 *     <section class="kanban-column-visual …"           (sem bg/borda/sombra), nó do dnd-kit
 *              style="--kanban-index:N; --kanban-footer-delay:…">
 *       <div class="kb-gradient" />                    ← degradê (overlay)
 *       <div class="relative z-10 flex h-full flex-col">
 *         <header class="kb-header">…</header>
 *         <div class="kb-list">… <div class="kanban-card" style="--card-index:i">…</div> …</div>
 *         <footer class="kb-footer">…</footer>
 *       </div>
 *     </section>
 *   </div>
 *
 * `.kanban-column-visual` tem `height: 0` na base e ganha a keyframe
 * `kanban-column-grow` (0px → `--kanban-final-height`, a altura REAL do slot) quando
 * a aba está ativa — como o slot é
 * `items-end` e tem a ALTURA FINAL, a coluna cresce do RODAPÉ até o topo. Depois:
 * degradê → header → cards (100ms) → rodapé, tudo por `animation-delay` calculado com
 * `--kanban-index`. O slot não tem fundo/borda/sombra: a ÚNICA superfície é a coluna.
 *
 * O único JS é o `setTimeout` que troca `kanban-em-entrada` por
 * `kanban-coluna-concluida` depois que as keyframes terminam (altura 100% estável e
 * cards novos/movidos entram JÁ visíveis). Ele NÃO anima nada.
 *
 * Com `prefers-reduced-motion` o crescimento CONTINUA (500ms, `ease-out`, onda de
 * 80ms), só mais rápido, e o conteúdo entra em fade simples — nunca `animation: none`
 * nem `height: 100%` (a coluna jamais aparece pronta).
 *
 * `isActive` (de `AdmissoesPage`, `activeTab === 'kanban'`) é o disparo: sem ele
 * nenhuma classe entra e a coluna fica em `height: 0`. A `key` no board remonta a
 * coluna a cada entrada na aba — as keyframes tocam de novo do zero.
 */
import { useDroppable } from '@dnd-kit/core';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useEntradaKanbanColuna } from '@/components/kanban/entradaKanban';
import { DraggableCard, type KanbanAcoes } from './KanbanCard';
import { TOM_KANBAN, type AdmissaoKanban, type ColunaKanban } from './kanbanComum';

export interface KanbanColumnProps {
  coluna: ColunaKanban;
  items: AdmissaoKanban[];
  /** Posição da coluna no board — vira `--kanban-index` (onda de 180ms). */
  indice: number;
  /** A aba do Kanban está ativa? Só então a classe de animação é aplicada. */
  isActive: boolean;
  /** Ações do card (menu de três pontos), vindas da página. */
  acoes?: KanbanAcoes;
  /** "+ Adicionar candidato" do rodapé — abre a Nova Admissão (dono: o board). */
  onAdicionar?: () => void;
}

export function KanbanColumn({ coluna, items, indice, isActive, acoes, onAdicionar }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: coluna.key });
  const tom = TOM_KANBAN[coluna.tom];
  const Icone = coluna.icon;
  // MESMO gatilho do Pipeline (mecanismo compartilhado em `components/kanban`):
  // mede o slot, liga `kanban-em-entrada` e depois `kanban-coluna-concluida`.
  const { refColuna, emEntrada, concluida, estilo } = useEntradaKanbanColuna({
    isActive,
    indice,
    totalCards: items.length,
    setNodeRef,
  });

  return (
    <div
      ref={refColuna}
      className="kanban-lane-slot flex h-[calc(100vh-19rem)] max-h-[900px] min-h-[520px] w-[272px] shrink-0 items-end"
    >
      {/* COLUNA VISUAL — a ÚNICA superfície da lane. Cresce 0px → altura final (keyframe). */}
      <section
        aria-label={`${coluna.label} — ${coluna.descricao}`}
        style={estilo}
        className={cn(
          'kanban-column-visual relative w-full rounded-xl border border-border/30 bg-card shadow-elevated transition-colors',
          emEntrada && 'kanban-em-entrada',
          concluida && 'kanban-coluna-concluida',
          isOver && 'ring-1 ring-primary/25'
        )}
      >
        {/* OVERLAY do degradê — layer próprio; aparece só depois do crescimento. */}
        <div
          aria-hidden
          style={{ backgroundImage: tom.fundo }}
          className={cn(
            'kb-gradient pointer-events-none absolute inset-0 rounded-xl border',
            isOver ? 'border-primary/45' : tom.borda
          )}
        />

        {/* CONTEÚDO — o `h-full` acompanha a coluna que cresce (nada é esticado). */}
        <div className="relative z-10 flex h-full flex-col">
          <header className="kb-header shrink-0 border-b border-border/25 px-3 pb-2.5 pt-3">
            <div className="flex items-start gap-2">
              <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-lg', tom.chip)}>
                <Icone className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h3 className="truncate font-display text-[13px] font-semibold leading-tight text-foreground">
                    {coluna.label}
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
                  {coluna.descricao}
                </p>
              </div>
            </div>
          </header>

          {/* LISTA (cards) — scroll vertical próprio; header e rodapé fixos. */}
          <div className="kb-list min-h-0 flex-1 space-y-2 overflow-y-auto px-2.5 py-2.5">
            {items.map((it, i) => (
              <DraggableCard key={it.id} item={it} cardIndex={i} acoes={acoes} />
            ))}
            {items.length === 0 && (
              <div className="rounded-lg border border-dashed border-border/40 px-3 py-5 text-center text-[10.5px] text-muted-foreground/60">
                Solte aqui
              </div>
            )}
          </div>

          {/* RODAPÉ — "+ Adicionar candidato" full-width, por último. */}
          <footer className="kb-footer shrink-0 border-t border-border/40 p-2.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={onAdicionar}
              className="h-8 w-full justify-center gap-1.5 rounded-lg border border-dashed border-border/60 text-[11.5px] font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-foreground"
            >
              <Plus className="h-3.5 w-3.5" />
              Adicionar candidato
            </Button>
          </footer>
        </div>
      </section>
    </div>
  );
}
