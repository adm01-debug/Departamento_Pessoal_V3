/**
 * ============================================================================
 * ENTRADA DE CARD — o PACOTE compartilhado do sistema (uma linha por card).
 *
 * Este arquivo NÃO tem números de animação. Ele empacota a RÉGUA GLOBAL do
 * Design System — `src/components/ui/entradaGlobal.ts` →
 * `CONFIG_ENTRADA_CARD_GLOBAL`: fade + subida de 14px, 520ms por card, 120ms
 * entre o INÍCIO de um card e o do próximo, ease-out `[0, 0, 0.58, 1]`, sem
 * escala e sem mola — num formato que qualquer módulo consome sem repetir a
 * trinca `custom`/`variants`/`initial`/`animate` (é exatamente aí que as
 * cascatas divergem com o tempo).
 *
 * FONTE DE VERDADE: `ui/entradaGlobal.ts`. Importar daqui é importar da régua
 * global: nenhum número é recalculado nem duplicado. Calibrar a cascata do
 * sistema inteiro é mexer UM valor lá, e Pesquisas, Treinamentos, Recrutamento,
 * Admissões, Desligamentos, Premiações, Calculadora de Rescisão (e o Dashboard
 * Executivo, que importa as variants direto de `entradaGlobal`) se movem juntos.
 *
 * ── QUEM USA ESTE PACOTE ───────────────────────────────────────────────────
 * ~40 arquivos de módulo (`entradaCard(i)` em KPIs, cards de lista, kanban,
 * linhas de timeline, filtros e blocos de drawer), além da ponte
 * `desligamentos/entradaCards.tsx`.
 *
 * ── A ÁREA DE DESEMPENHO TAMBÉM SEGUE ESTA RÉGUA ───────────────────────────
 * Até 29/10/2026 Gestão de Desempenho (`/avaliacao`) era a exceção protegida
 * (`.clinerules` §1) e `avaliacao/entradaCards.tsx` fixava números próprios.
 * Com a autorização explícita do usuário, aquele arquivo passou a ser uma PONTE
 * para cá: o módulo inteiro (KPIs, cards de conteúdo, resumo, metas, PDI,
 * Nine-Box, ciclos e auditoria) entra com 14px / 520ms / 120ms.
 *
 * ── POR QUE ESTE ARQUIVO MORA EM `ui/` ─────────────────────────────────────
 * Ele nasceu em `components/desligamentos/entradaCards.tsx` (que hoje só
 * reexporta daqui, para não quebrar os ~30 call sites do módulo). Vários módulos
 * precisam do MESMO pacote; deixá-lo na pasta de um módulo faria os outros
 * importarem do módulo alheio. `ui/` é o lugar neutro dos mecanismos de
 * movimento compartilhados — é onde já moram `entradaGlobal.ts`,
 * `cascade-motion.ts`, `motion-presets.ts`, `table-row-reveal.ts` e
 * `cascade-table.tsx`.
 *
 * ── SEM NÓ EXTRA NO DOM ────────────────────────────────────────────────────
 * `MotionCard` é `motion.create(Card)`, então o bloco ANIMADO é o próprio card.
 * Um wrapper `<motion.div>` em volta mudaria o item de grid/flex (os cards são
 * os filhos diretos dos grids) e o espaçamento das listas (`space-y-*`), por
 * isso não existe. Quando o alvo não é um `Card` (card do kanban, botão-card,
 * linha da timeline), use `motion.*` com `{...entradaCard(i)}` — os MESMOS
 * números, nenhuma variante nova.
 * ============================================================================
 */
import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { propsEntradaGlobal } from '@/components/ui/entradaGlobal';

/** O `Card` do design system animado com a entrada de referência (substitui `<Card>` 1:1). */
// eslint-disable-next-line react-refresh/only-export-components
export const MotionCard = motion.create(Card);

/**
 * Teto do ÍNDICE da cascata (8 → 0,96 s com a régua global: 8 × 120 ms).
 * Acima disso o atraso para de crescer, para que uma timeline longa ou um
 * kanban cheio não levem segundos para terminar de entrar. Continua exportado
 * porque módulos que calculam o próprio tempo (Premiações, Calculadora de
 * Rescisão, painéis de Treinamentos) usam o MESMO teto.
 *
 * Não confundir com `MAX_SLOT_ENTRADA_CARD_GLOBAL` (11), que é o teto de SLOT
 * da fila dentro de `entradaGlobal.ts`.
 */
export const MAX_ENTRADA_INDEX = 8;

/**
 * Props da entrada global, prontas para espalhar em qualquer `motion.*`:
 * `{...entradaCard(3)}`. Delega a `propsEntradaGlobal()` (fonte única), só
 * aplicando o teto de índice acima.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function entradaCard(index = 0) {
  return propsEntradaGlobal(Math.min(Math.max(index, 0), MAX_ENTRADA_INDEX));
}

/**
 * Blindagem da entrada: toda rota vive dentro de `<AnimatePresence
 * initial={false}>` (`PageTransition.tsx`), e esse contexto é lido por QUALQUER
 * `motion.*` descendente — com `initial={false}` a Motion PULA o keyframe
 * inicial e a cascata nunca toca. Um `AnimatePresence` aninhado, SEM props, cria
 * um contexto de presença novo (`initial=true` por padrão) e devolve o keyframe
 * `hidden` a todo o bloco de uma vez, SEM renderizar DOM (layout, cores e
 * tamanhos seguem idênticos). Envolve UM bloco — um card, um grid, um kanban ou
 * uma lista inteira.
 */
export function EntradaPresenca({ children }: { children: ReactNode }) {
  return <AnimatePresence>{children}</AnimatePresence>;
}
