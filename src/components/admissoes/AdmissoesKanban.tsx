/**
 * Board (Kanban) de Admissões — o container das colunas.
 *
 * RESPONSABILIDADES: agrupar as admissões por etapa, manter o arraste (dnd-kit) e
 * desenhar a faixa horizontal de colunas. O visual da coluna mora em
 * `KanbanColumn.tsx`, o do card em `KanbanCard.tsx` e a identidade de etapa
 * (ícone, tom, descrição, ordem) em `kanbanComum.ts` — nada de rótulo, cor ou
 * texto repetido aqui.
 *
 * BOARD x COLUNA x CARD: só a faixa rola na horizontal (`overflow-x-auto`); cada
 * coluna rola na vertical quando a lista passa do teto; o card não rola nunca. O
 * gutter da faixa é `-mx-2 px-2` (o realce/sombra das colunas não é cortado na
 * borda do container) e `gap-3` = 12px entre colunas. `items-end` alinha as
 * colunas pelo RODAPÉ (a altura fixa vive na coluna, que cresce por `height`).
 *
 * ARRASTE: `PointerSensor` com `distance: 6` — clique curto (inclusive no menu de
 * três pontos do card) não vira arraste. O drop NÃO é um simples `update` da
 * coluna: `concluida` e `cancelada` passam por `admissaoService.concluir` /
 * `.cancelar`, porque concluir uma admissão CRIA o colaborador (e por isso as
 * duas etapas terminais também não voltam a ser arrastáveis — ver `KanbanCard`).
 * As outras etapas gravam por `admissaoService.atualizar` (a MESMA escrita de
 * Nova Admissão/edição). Enquanto a gravação corre, o card fica na coluna de
 * destino pelo estado otimista, desfeito se falhar.
 * O `DragOverlay` é PORTALADO para `document.body` (`createPortal`): o wrapper de
 * transição de página (`PageTransition`) usa `will-change: transform` — o que o
 * torna bloco contentor de `position: fixed` — e, sem o portal, o card arrastado
 * apareceria muito longe do cursor. No body o overlay fica preso ao ponteiro.
 *
 * ENTRADA (CSS puro — ver o bloco `KANBAN … ENTRADA DAS COLUNAS` no `index.css`): o
 * board só entrega `indice` (→ `--kanban-index`, onda de 180ms) e `isActive` a cada
 * coluna; quem anima são keyframes CSS (`height 0 → 100%` + degradê → header → cards
 * → rodapé). Nada de Framer Motion aqui. A animação só é aplicada com a aba ativa, e
 * a `key` da coluna inclui `isActive` — entrar/sair da aba remonta a coluna e as
 * keyframes tocam de novo do zero. Com `prefers-reduced-motion` o crescimento
 * continua (de baixo para cima), só mais rápido e com o conteúdo em fade simples.
 *
 * "+ ADICIONAR CANDIDATO": cada coluna tem o botão no rodapé e o diálogo
 * controlado é montado SOB DEMANDA por este board (`NovaAdmissaoDialog` em modo
 * criação — o mesmo componente usado no topo da página). Montagem preguiçosa de
 * propósito: o diálogo carrega o formulário inteiro e o hook de admissões, e nada
 * disso deve existir no board antes do primeiro clique.
 */
import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { safeErrorMessage } from '@/utils/safeError';
import { admissaoService } from '@/services/admissaoService';
import { useEmpresas } from '@/hooks/useEmpresas';
import type { Database, Tables } from '@/integrations/supabase/database.types';
import { KanbanCard, type KanbanAcoes } from './KanbanCard';
import { KanbanColumn } from './KanbanColumn';
import { NovaAdmissaoDialog } from './NovaAdmissaoDialog';
import { COLUNAS_KANBAN, type AdmissaoKanban } from './kanbanComum';

type EtapaAdmissao = Database['public']['Enums']['etapa_admissao'];

/**
 * Props do board: a lista + as ações do card, que chegam da página exatamente
 * como em `GestaoCandidatos` (mesmos handlers, mesmo módulo). Todas as ações são
 * opcionais — o board continua montável sozinho, sem quebrar quem só passa a
 * lista.
 */
export interface AdmissoesKanbanProps extends KanbanAcoes {
  /**
   * A lista como a página a tem: a linha do banco (`Tables<'admissoes'>`, cujo
   * `metadata: Json` é mais largo que o do board) ou já na forma frouxa do
   * Kanban. Os derivados de `kanbanComum` toleram campo faltando.
   */
  admissoes: readonly (AdmissaoKanban | Tables<'admissoes'>)[];
  /**
   * A aba do Kanban está ATIVA? A entrada só roda quando `true` (e é resetada
   * quando `false`) — ver `AdmissoesPage`, que passa `activeTab === 'kanban'`.
   * Default `true`: o board continua utilizável/montável sozinho.
   */
  isActive?: boolean;
}

export function AdmissoesKanban({ admissoes, isActive = true, ...acoes }: AdmissoesKanbanProps) {
  const qc = useQueryClient();
  const { empresaAtual } = useEmpresas();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const [activeId, setActiveId] = useState<string | null>(null);
  const [optimistic, setOptimistic] = useState<Record<string, EtapaAdmissao>>({});
  /** "+ Adicionar candidato" (rodapé de qualquer coluna) → Nova Admissão. */
  const [novaAberta, setNovaAberta] = useState(false);

  /** A linha do banco é mais larga que `AdmissaoKanban` só no `metadata`. */
  const lista = admissoes as readonly AdmissaoKanban[];

  const grouped = useMemo(() => {
    const map: Record<string, AdmissaoKanban[]> = {};
    COLUNAS_KANBAN.forEach((c) => (map[c.key] = []));
    for (const a of lista) {
      const etapa = optimistic[a.id] ?? a.etapa;
      if (!map[etapa]) map[etapa] = [];
      map[etapa].push({ ...a, etapa });
    }
    return map;
  }, [lista, optimistic]);

  const activeItem = useMemo(() => lista.find((a) => a.id === activeId) || null, [activeId, lista]);

  const handleDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));

  const handleDragEnd = async (e: DragEndEvent) => {
    setActiveId(null);
    const id = String(e.active.id);
    const target = e.over?.id ? (String(e.over.id) as EtapaAdmissao) : null;
    if (!target) return;
    const current = lista.find((a) => a.id === id);
    if (!current || current.etapa === target) return;

    if (!empresaAtual?.id) {
      toast.error('Empresa ativa não carregada.');
      return;
    }

    setOptimistic((s) => ({ ...s, [id]: target }));
    try {
      if (target === 'concluida') {
        const r = await admissaoService.concluir(id, empresaAtual.id);
        toast.success(r.colaboradorId ? 'Admissão concluída — colaborador criado.' : 'Admissão concluída.');
      } else if (target === 'cancelada') {
        await admissaoService.cancelar(id, empresaAtual.id);
        toast.success('Admissão cancelada.');
      } else {
        await admissaoService.atualizar(id, { etapa: target }, empresaAtual.id);
        toast.success(`Movido para ${COLUNAS_KANBAN.find((c) => c.key === target)?.label ?? target}`);
      }
      await qc.invalidateQueries({ queryKey: ['admissoes'] });
      if (target === 'concluida') {
        await Promise.all([
          qc.invalidateQueries({ queryKey: ['colaboradores'] }),
          qc.invalidateQueries({ queryKey: ['colaboradores-summary'] }),
          // ver ColaboradorFormPage: a chave singular do dossiê é outra família.
          qc.invalidateQueries({ queryKey: ['colaborador'] }),
        ]);
      }
    } catch (err) {
      setOptimistic((s) => {
        const next = { ...s };
        delete next[id];
        return next;
      });
      toast.error(safeErrorMessage(err, 'Falha ao mover admissão.'));
    }
  };

  return (
    <>
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        {/* ENTRADA em CSS puro (ver o bloco `KANBAN … ENTRADA DAS COLUNAS` no
            `index.css`): a faixa é um `<div>` e cada `KanbanColumn` recebe o `indice`
            (→ `--kanban-index`, onda de 180ms) e `isActive`. A `key` remonta a coluna
            a cada entrada/saída da aba — as keyframes tocam de novo do zero.
            `items-end` alinha as colunas pelo RODAPÉ (o slot tem a altura final e a
            coluna cresce por `height`, então a borda superior sobe).
            `overflow-y-hidden` evita scrollbar vertical transitório. */}
        <div className="-mx-2 flex items-end gap-3 overflow-x-auto overflow-y-hidden px-2 pb-4">
          {COLUNAS_KANBAN.map((coluna, indice) => (
            <KanbanColumn
              key={`${coluna.key}-${isActive ? 'ativa' : 'inativa'}`}
              coluna={coluna}
              items={grouped[coluna.key] || []}
              indice={indice}
              isActive={isActive}
              acoes={acoes}
              onAdicionar={() => setNovaAberta(true)}
            />
          ))}
        </div>
        {/* `createPortal(…, document.body)`: SEM isto, o `DragOverlay` (que monta
            INLINE e se posiciona com `position: fixed`) cairia dentro da árvore
            do board — e o `will-change: transform` do wrapper de transição de
            página (`PageTransition`) passa a ser bloco contentor do "fixed",
            jogando o card arrastado para longe do cursor (offset que ainda muda
            com o scroll). Em `document.body` o `fixed` volta a ser relativo à
            viewport e o overlay fica GRUDADO no ponto exato do clique. O portal
            preserva o contexto do `DndContext` (o elemento continua na árvore
            React) e as variáveis de tema (o `.dark` vive no `<html>`, ancestral
            do body). */}
        {createPortal(
          <DragOverlay dropAnimation={null}>
            {/* O `KanbanCard` não anima sozinho: o clone do overlay monta já no
              estado final, sem cascata. */}
            {activeItem ? <KanbanCard item={activeItem} dragging acoes={acoes} /> : null}
          </DragOverlay>,
          document.body
        )}
      </DndContext>

      {/* Montado sob demanda — ver a nota do cabeçalho deste arquivo. */}
      {novaAberta && <NovaAdmissaoDialog open onOpenChange={(aberto) => setNovaAberta(aberto)} />}
    </>
  );
}
