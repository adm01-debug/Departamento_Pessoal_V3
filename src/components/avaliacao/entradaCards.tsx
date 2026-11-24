/**
 * ENTRADA DE CARD DO MÓDULO DE GESTÃO DE DESEMPENHO — RÉGUA GLOBAL DO SISTEMA.
 *
 * Este arquivo é a PONTE do módulo (`/avaliacao` e todas as abas) para a régua
 * única do Design System: `src/components/ui/entradaGlobal.ts`
 * (`CONFIG_ENTRADA_CARD_GLOBAL`), consumida através de `ui/entrada-cards.tsx`.
 *
 *     deslocamentoY : 14 px (o card começa 14 px ABAIXO e sobe até y: 0)
 *     duracaoMs     : 520 ms por card
 *     intervaloMs   : 120 ms entre o INÍCIO de um card e o do próximo
 *     curva         : ease-out puro `cubic-bezier(0, 0, 0.58, 1)`
 *     escala / mola : NENHUMA
 *
 * São EXATAMENTE os números do Dashboard Executivo (a referência aprovada) e
 * nenhum deles é repetido aqui: importar deste arquivo é importar da régua
 * global. Calibrar a cascata do sistema é mexer UM valor em `entradaGlobal.ts`,
 * e este módulo se move junto — como Pesquisas, Treinamentos, Recrutamento,
 * Admissões, Desligamentos, Premiações e a Calculadora de Rescisão.
 *
 * ── HISTÓRICO (por que este arquivo já fixou números no passado) ────────────
 * Até 29/10/2026 o módulo era a ÚNICA exceção da régua: `.clinerules` §1
 * congela o movimento de `/avaliacao`, então a centralização do Design System
 * parou aqui — os valores aprovados da época (20px / 0,4s / 0,08s) estavam
 * declarados localmente (`CARD_VARIANTS_CONGELADO`) e o isolamento era feito
 * por atributo (`data-entrada-escopo="desempenho-congelado"` no `#main-content`,
 * escrito pelo `MainLayout`).
 * A padronização foi AUTORIZADA pelo usuário em 29/10/2026 — "aplicar a mesma
 * animação de entrada do Dashboard Executivo a todos os cards e KPI cards do
 * módulo Avaliação e Performance" — e é essa autorização explícita, exigida
 * pelo §1.1, que permite esta ponte. Layout, cores, tipografia, espaçamentos,
 * textos, dados e funcionalidades seguem INTACTOS: o que mudou foi só o TEMPO
 * do movimento, e ele agora vem de fora (fonte única), não daqui.
 *
 * ── UMA ANIMAÇÃO POR CARD (o `data-entrada="cascata"` abaixo) ───────────────
 * Todo `Card` do design system carrega `.animate-squash`, que hoje É a entrada
 * global em CSS (fade + 14px, 520 ms) usada pelos cards "burros". Um
 * `MotionCard` anima o MESMO nó por Framer: com as duas rodando juntas, o
 * `transform` da folha de estilo vence o inline da Motion (o card entraria com
 * o movimento do CSS, sem a cascata das variants) e o `animation-delay` do
 * `useStaggerCards` correria em paralelo ao `delay` das variants — duas
 * cascatas independentes no mesmo elemento.
 * O `MotionCard` exportado aqui escreve `data-entrada="cascata"`, o MESMO
 * opt-out que o Dashboard Executivo usa: `.animate-squash[data-entrada='cascata']`
 * (`index.css`) desliga a animação de folha de estilo e deixa `transform` e
 * `opacity` exclusivamente com a Motion. Um card, uma animação.
 *
 * ── O QUE CONTINUA COM COREORAFIA PRÓPRIA (de propósito) ────────────────────
 * Duas listas do módulo têm sequências próprias, aprovadas e travadas por
 * teste — não são "a entrada de card" e sim a coreografia daquelas listas:
 *   • aba Feedbacks — expansão do 1º card + descida em cascata dos demais
 *     (`animacaoFeedbacks.ts`, `FeedbacksAnimacaoEntrada.test.tsx`);
 *   • aba Auditoria — cascata imperativa dia/evento com rede de segurança
 *     (`PerformanceAuditTimeline.tsx`).
 * Os cards que entram por elas usam os números delas; TODOS os demais blocos
 * daquelas abas (filtros, chips, banners, widgets de resumo) usam esta régua.
 *
 * Travado por `src/components/__tests__/DesempenhoEntradaCascade.test.tsx`
 * (keyframe `hidden` da régua global, índices da cascata e o opt-out do CSS).
 */
import { forwardRef, type ComponentProps } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { EntradaPresenca, MAX_ENTRADA_INDEX, entradaCard as entradaCardGlobal } from '@/components/ui/entrada-cards';

/**
 * `Card` do design system com a entrada por Framer. O bloco animado é o PRÓPRIO
 * card (sem wrapper: os cards são filhos diretos dos grids e um nó extra mudaria
 * o item de grid/flex — layout).
 */
const MotionCardBase = motion.create(Card);
type MotionCardProps = ComponentProps<typeof MotionCardBase>;

/**
 * `MotionCard` da régua global + o opt-out do CSS (`data-entrada="cascata"`).
 * Substitui `<Card>` 1:1; a única diferença é o atributo que impede a entrada
 * de folha de estilo de tocar no mesmo nó da entrada por Framer.
 */
export const MotionCard = forwardRef<HTMLDivElement, MotionCardProps>(function MotionCard(props, ref) {
  return <MotionCardBase ref={ref} data-entrada="cascata" {...props} />;
});
MotionCard.displayName = 'MotionCard';

/**
 * Props da entrada global prontas para espalhar em qualquer `motion.*`:
 * `{...entradaCard(3)}`. Delega a `ui/entrada-cards` → `propsEntradaGlobal()`
 * (fonte única), aplicando o mesmo teto de índice do resto do sistema.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function entradaCard(index = 0) {
  return entradaCardGlobal(index);
}

// Peças SEM tempo de animação: presença de entrada (blindagem contra o
// `initial={false}` do `PageTransition`) e o teto de índice da cascata.
export { EntradaPresenca, MAX_ENTRADA_INDEX };
