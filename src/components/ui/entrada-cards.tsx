/**
 * ============================================================================
 * ENTRADA DE CARD — a MESMA animação dos KPI Cards do Dashboard Executivo, num
 * formato reutilizável por QUALQUER módulo. Este arquivo NÃO inventa animação
 * nenhuma: ele só empacota o variant que já é a referência aprovada.
 *
 * FONTE DE VERDADE: `cardVariants`, exportado por
 * `src/components/dashboard/MetricCard.tsx` (fade + subida de 20px, stagger de
 * 0.08s por índice, 0.4s, ease `[0.25, 0.46, 0.45, 0.94]`) — o MESMO objeto que
 * o próprio `DashboardExecutivoPage` importa. Importar daqui é importar do
 * Dashboard: nenhum número é recalculado nem duplicado. Calibrar a cascata é
 * mudar UM valor lá, e Dashboard Executivo, Admissões, Desligamentos e
 * Recrutamento se movem juntos.
 *
 * POR QUE ESTE ARQUIVO MORA EM `ui/` (e não dentro de um módulo): ele nasceu em
 * `components/desligamentos/entradaCards.tsx` (que hoje só reexporta daqui, para
 * não quebrar os ~30 call sites do módulo). Desligamentos, Admissões e
 * Recrutamento precisam do MESMO pacote; deixá-lo na pasta de um módulo faria os
 * outros importarem do módulo alheio. `ui/` é o lugar neutro dos mecanismos de
 * movimento compartilhados — é onde já moram `cascade-motion.ts`,
 * `motion-presets.ts`, `table-row-reveal.ts` e `cascade-table.tsx`.
 *
 * POR QUE UMA FUNÇÃO E UM `MotionCard` (e não props repetidas em cada tela):
 * são dezenas de blocos animados por módulo (KPIs, alerta, gráfico, painel de
 * gestão, cards de processo, cards do kanban, linhas da timeline, cards do
 * drawer). Escrever a trinca `custom`/`variants`/`initial`/`animate` em cada um
 * é exatamente o tipo de cópia que diverge com o tempo — daí `{...entradaCard(i)}`.
 *
 * SEM NÓ EXTRA NO DOM: `MotionCard` é `motion.create(Card)`, então o bloco
 * ANIMADO é o próprio card. Um wrapper `<motion.div>` em volta mudaria o item de
 * grid/flex (os cards são os filhos diretos dos grids) e o espaçamento das
 * listas (`space-y-*`), por isso não existe. Quando o alvo não é um `Card` (card
 * do kanban, cabeçalho de coluna, linha da timeline), use `motion.div` com
 * `{...entradaCard(i)}` — os MESMOS números, nenhuma variante nova.
 *
 * ── POR QUE `EntradaPresenca` É OBRIGATÓRIA ────────────────────────────────
 * Toda rota do app vive dentro de `<AnimatePresence initial={false}>`
 * (`PageTransition.tsx`), e esse contexto de presença é lido por QUALQUER
 * `motion.*` descendente: com `initial={false}` a Motion PULA o keyframe
 * inicial e a cascata nunca toca (é o mesmo bloqueio já documentado e
 * contornado em `AdmissoesDashboard.tsx`, `HeadcountOverviewCard.tsx`,
 * `HistoryEventRow.tsx` e `OrganogramaRevealBlock.tsx`). Um `AnimatePresence`
 * aninhado, SEM props, cria um contexto de presença novo (`initial=true` por
 * padrão) e devolve o keyframe `hidden` a todo o bloco de uma vez — sem repetir
 * a blindagem card a card e SEM renderizar DOM (layout, cores e tamanhos
 * seguem idênticos). É por isso que os cards do módulo animam na primeira
 * apresentação, inclusive numa carga direta da página.
 *
 * ENTRADA ÚNICA POR APRESENTAÇÃO: a animação é por MONTAGEM com alvo constante
 * (`animate="visible"`), então hover, tooltip, resize, re-render e filtro NÃO
 * reanimam (a `key` estável de cada card mantém o elemento montado). Ela toca
 * de novo apenas quando o componente é genuinamente montado outra vez: troca de
 * aba, abertura do drawer, nova navegação para a página.
 *
 * MOVIMENTO REDUZIDO: o deslocamento é o da referência; a página envolve tudo
 * em `MotionConfig reducedMotion="user"` (é o que `DesligamentosPage` e o
 * `TurnoverChart` já fazem), e aí a Motion mantém o fade e desliga o `y` — sem
 * mexer em configuração global.
 */
import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { cardVariants } from '@/components/dashboard/MetricCard';

/** O `Card` do design system animado com a entrada de referência (substitui `<Card>` 1:1). */
// eslint-disable-next-line react-refresh/only-export-components
export const MotionCard = motion.create(Card);

/**
 * Acima do 9º item de um grupo o atraso para de crescer (para em 0.64s) — mesma
 * régua do `use-stagger-cards` global. Sem esse teto, uma timeline longa ou um
 * kanban cheio levariam segundos para terminar de entrar e o usuário esperaria
 * para interagir com o rodapé da lista.
 */
export const MAX_ENTRADA_INDEX = 8;

/** Props da entrada de referência, prontas para espalhar em qualquer `motion.*`. */
// eslint-disable-next-line react-refresh/only-export-components
export function entradaCard(index = 0) {
  return {
    custom: Math.min(Math.max(index, 0), MAX_ENTRADA_INDEX),
    variants: cardVariants,
    initial: 'hidden',
    animate: 'visible',
  };
}

/**
 * Blindagem da entrada (ver o bloco "POR QUE `EntradaPresenca` É OBRIGATÓRIA"
 * acima): envolve UM bloco — um card, um grid, um kanban ou uma lista inteira —
 * e cria o contexto de presença que o `initial={false}` do `PageTransition`
 * bloqueia. Não renderiza DOM; o filho é o próprio bloco.
 */
export function EntradaPresenca({ children }: { children: ReactNode }) {
  return <AnimatePresence>{children}</AnimatePresence>;
}
