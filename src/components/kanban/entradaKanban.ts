/**
 * ============================================================================
 * ENTRADA DO KANBAN — mecanismo ÚNICO compartilhado por Admissões e Pipeline
 *
 * A animação não mora aqui: as keyframes e os tempos estão em `src/index.css`
 * (bloco `KANBAN — ENTRADA DAS COLUNAS`). Este arquivo é o "gatilho" que os
 * boards usam — mede a altura final do slot, espera a coluna estar realmente
 * pintada, liga a classe `kanban-em-entrada` e, ao fim da coreografia, troca
 * por `kanban-coluna-concluida` (altura 100% estável; cards novos/movidos não
 * reanimam).
 *
 * Extraído de `admissoes/KanbanColumn.tsx` SEM mudar nenhum valor: constantes,
 * delays, condições e efeitos são os mesmos. Assim o Pipeline usa o MESMO
 * mecanismo (não uma cópia "parecida") e as duas telas permanecem em sincronia.
 *
 * Ordem da coreografia (CSS):
 *   1. coluna cresce de baixo para cima (900ms, 180ms entre colunas);
 *   2. degradê da etapa entra (380ms, +820ms);
 *   3. cabeçalho (320ms, +1040ms);
 *   4. cards descem de -18px (380ms, +1300ms + 100ms por card);
 *   5. rodapé (320ms, após o último card).
 * `prefers-reduced-motion` encurta tudo (500ms de crescimento, 80ms por coluna,
 * fade no conteúdo) — as keyframes da media query cuidam disso.
 * ============================================================================
 */
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';

/** ms entre colunas (MESMO valor do `animation-delay` em `index.css`). */
export const PASSO_COLUNA_MS = 180;
/** Teto do stagger dos cards (igual ao usado no `calc(...)` do CSS). */
export const MAX_CARDS_ESCALONADOS = 8;
/** Início do rodapé (ms) dado o nº de cards — casa com o `calc(... + 1300ms + i*100ms)`. */
export const delayRodapeMs = (cards: number) => 1300 + (Math.min(cards, MAX_CARDS_ESCALONADOS) + 1) * 100;
/** Passo entre colunas no `prefers-reduced-motion` (casa com o `calc(… * 80ms)`). */
export const PASSO_COLUNA_REDUZIDO_MS = 80;
/** Rodapé no `prefers-reduced-motion` (casa com o `calc(… + 620ms + i*50ms)`). */
export const delayRodapeReduzidoMs = (cards: number) => 620 + (Math.min(cards, MAX_CARDS_ESCALONADOS) + 1) * 50;

/**
 * O elemento está REALMENTE visível/pintado? Percorre a CADEIA de ancestrais e
 * pega `display: none` / `visibility: hidden` / `opacity: 0` (ex.: a transição de
 * página/aba) que esconderiam o Kanban — a keyframe não pode rodar atrás disso,
 * senão o usuário só vê o resultado final.
 */
export function estaVisivel(el: HTMLElement | null): boolean {
  if (!el || el.getBoundingClientRect().height <= 0) return false;
  let no: HTMLElement | null = el;
  while (no) {
    const cs = window.getComputedStyle(no);
    if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    // `opacity` só conta quando o browser informa um número (jsdom devolve '').
    if (cs.opacity !== '' && Number(cs.opacity) === 0) return false;
    no = no.parentElement;
  }
  return true;
}

/** CSS custom properties usadas pelas keyframes (tipadas sem `any`). */
export type VarsEntradaKanban = CSSProperties &
  Record<'--kanban-index' | '--kanban-footer-delay', string | number> &
  Partial<Record<'--kanban-final-height' | '--kanban-footer-delay-reduzido', string>>;

export interface OpcoesEntradaKanban {
  /** A aba do Kanban está ativa? Sem isso a coluna fica fechada (altura 0). */
  isActive: boolean;
  /** Posição da coluna no board — vira `--kanban-index` (onda de 180ms). */
  indice: number;
  /** Quantidade de cards da coluna — define o delay do rodapé. */
  totalCards: number;
  /** Ref do dnd-kit (`useDroppable`): o MESMO nó serve à medição e ao drop. */
  setNodeRef: (no: HTMLElement | null) => void;
}

/**
 * Gatilho da entrada de UMA coluna. Devolve a ref do slot (medição + droppable),
 * as flags de fase e o objeto de CSS vars para o `<section>`.
 */
export function useEntradaKanbanColuna({ isActive, indice, totalCards, setNodeRef }: OpcoesEntradaKanban) {
  /** Nó do SLOT: mede a altura final e é o nó do dnd-kit. */
  const slotRef = useRef<HTMLDivElement | null>(null);
  /** Altura FINAL em px (medida do slot) — vira `--kanban-final-height`. */
  const [alturaFinal, setAlturaFinal] = useState<number | null>(null);
  /** Só fica `true` depois de a coluna estar visível/pintada + DOIS frames. */
  const [podeAnimar, setPodeAnimar] = useState(false);
  /** Marca "as keyframes terminaram" (o JS só troca classe — quem anima é o CSS). */
  const [entradaConcluida, setEntradaConcluida] = useState(false);

  /** Ref combinada: o MESMO nó (slot) serve à medição e ao dnd-kit. */
  const refColuna = useCallback(
    (no: HTMLDivElement | null) => {
      slotRef.current = no;
      setNodeRef(no);
    },
    [setNodeRef]
  );

  /**
   * GATILHO — a keyframe NÃO pode começar antes de a coluna existir de verdade na
   * tela (senão ela roda "escondida" e o usuário só vê o resultado final):
   *   1. espera o slot estar VISÍVEL/PINTADO (`estaVisivel`: display, visibility,
   *      opacity de TODA a cadeia + altura > 0 — pega a transição de página/aba);
   *   2. mede a altura FINAL do slot em px → `--kanban-final-height`;
   *   3. espera DOIS `requestAnimationFrame`;
   *   4. só então liga `kanban-em-entrada`.
   * Antes disso, os frames A/B são `height: 0` e SEM `animation-name` — o navegador
   * tem um estado inicial real para animar.
   */
  useEffect(() => {
    if (!isActive) return;
    let r1 = 0;
    let r2 = 0;
    let t = 0;
    let vivo = true;
    const tentar = () => {
      if (!vivo) return;
      const no = slotRef.current;
      if (!estaVisivel(no)) {
        t = window.setTimeout(tentar, 32);
        return;
      }
      setAlturaFinal(Math.round(no!.getBoundingClientRect().height));
      r1 = window.requestAnimationFrame(() => {
        r2 = window.requestAnimationFrame(() => {
          if (vivo) setPodeAnimar(true);
        });
      });
    };
    r1 = window.requestAnimationFrame(tentar);
    return () => {
      vivo = false;
      window.cancelAnimationFrame(r1);
      window.cancelAnimationFrame(r2);
      window.clearTimeout(t);
    };
  }, [isActive]);

  /**
   * Depois que a coreografia termina, troca `kanban-em-entrada` por
   * `kanban-coluna-concluida`: altura final estável (100% responsivo) e cards
   * adicionados/movidos depois entram JÁ visíveis.
   */
  useEffect(() => {
    if (!isActive || !podeAnimar) return;
    // `prefers-reduced-motion` encurta TUDO (ver o bloco do Kanban no `index.css`).
    const reduzido = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const total = reduzido
      ? indice * PASSO_COLUNA_REDUZIDO_MS + delayRodapeReduzidoMs(totalCards) + 240 + 150
      : indice * PASSO_COLUNA_MS + delayRodapeMs(totalCards) + 380 + 150;
    const id = window.setTimeout(() => setEntradaConcluida(true), total);
    return () => window.clearTimeout(id);
  }, [isActive, podeAnimar, indice, totalCards]);

  const emEntrada = podeAnimar && !entradaConcluida;
  const concluida = podeAnimar && entradaConcluida;
  const estilo: VarsEntradaKanban = {
    '--kanban-index': indice,
    '--kanban-footer-delay': `${delayRodapeMs(totalCards)}ms`,
    '--kanban-footer-delay-reduzido': `${delayRodapeReduzidoMs(totalCards)}ms`,
  };
  if (alturaFinal != null) estilo['--kanban-final-height'] = `${alturaFinal}px`;

  return { refColuna, emEntrada, concluida, estilo };
}
