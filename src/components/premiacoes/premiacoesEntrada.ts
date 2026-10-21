/**
 * ============================================================================
 * HUB DE PREMIAÇÕES — ENTRADA DE BLOCO (CAMPANHAS · PAGAMENTOS).
 *
 * A ANIMAÇÃO é a mesma do sistema (`ui/entrada-cards` → `cardVariants` do
 * Dashboard Executivo), mas o Hub tem cadência PRÓPRIA, mais lenta que a régua
 * global para que a cascata seja perceptível:
 *
 *     fade + subida de 20px · 0,42s · passo de 0,10s por índice ·
 *     atraso inicial de 0,06s · ease [0.25, 0.46, 0.45, 0.94] · teto no 9º item
 *
 * O MOVIMENTO, a DIREÇÃO, a OPACIDADE e o EASE são exatamente os da referência:
 * só o TEMPO mudou. Calibrar a cascata do Hub é mexer apenas nas constantes
 * abaixo; Dashboard Executivo, Admissões, Desligamentos e Recrutamento (que
 * importam `cardVariants` direto do Dashboard) não são afetados.
 *
 * O teto no 9º item (`MAX_ENTRADA_INDEX`) impede que grupos longos empurrem a
 * última entrada para além de ~1,3s (0,06 + 8 × 0,10 + 0,42), mantendo a página
 * interativa enquanto a cascata termina.
 *
 * Para as LINHAS (tabela, "Próximas ações" e "Atividade recente") existe
 * `linhaEntradaHubVariants`: mesmo movimento da referência compartilhada
 * (`ui/table-row-reveal` — opacity + y(10px) + scaleX 0.94→1, ease
 * [0.22, 1, 0.36, 1]), com o intervalo entre elementos ligeiramente maior
 * (0,08s contra 0,04s) e início em 0,46s. A duração de 0,80s foi preservada.
 * Assim a cascata das linhas fica perceptível sem passar de ~1,8s no último
 * registro visível e sem alterar a animação de outros módulos.
 *
 * A entrada continua sendo por MONTAGEM, uma vez por apresentação (`animate`
 * constante + `key` estável): hover, re-render e filtro não reanimam. Com
 * "reduzir movimento" ligado, o `MotionConfig` da página mantém o fade e
 * desliga o deslocamento.
 * ============================================================================
 */
import type { Variants } from 'framer-motion';
import { MAX_ENTRADA_INDEX } from '@/components/ui/entrada-cards';

/* ─── Blocos (cards, filtros, seções) ─────────────────────────────────────── */

/** Duração da entrada de CADA bloco (s). */
export const ENTRADA_HUB_DURACAO = 0.42;
/** Intervalo entre blocos consecutivos (s). */
export const ENTRADA_HUB_PASSO = 0.1;
/** Atraso antes do primeiro bloco (s). */
export const ENTRADA_HUB_ATRASO_INICIAL = 0.06;

/** Mesmo movimento/ease da referência — só a cadência é própria do Hub. */
const variantesEntradaHub: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: ENTRADA_HUB_ATRASO_INICIAL + i * ENTRADA_HUB_PASSO,
      duration: ENTRADA_HUB_DURACAO,
      ease: [0.25, 0.46, 0.45, 0.94] as const,
    },
  }),
};

/** Props da entrada do Hub, prontas para espalhar em qualquer `motion.*`. */
export function entradaCard(index = 0) {
  return {
    custom: Math.min(Math.max(index, 0), MAX_ENTRADA_INDEX),
    variants: variantesEntradaHub,
    initial: 'hidden',
    animate: 'visible',
  };
}

/* ─── Linhas (tabela e listas laterais) ───────────────────────────────────── */

/** Início da onda das linhas (s) — junto da entrada do card da tabela. */
export const LINHA_HUB_INICIO = 0.46;
/** Passo entre linhas consecutivas (s). */
export const LINHA_HUB_PASSO = 0.08;
/** Duração da entrada de cada linha (s) — a MESMA da referência. */
export const LINHA_HUB_DURACAO = 0.8;

/**
 * Variant do `<tr>`/`<li>` do Hub. Use com `custom={indice}`,
 * `initial="hidden"` e `animate="visible"`.
 */
export const linhaEntradaHubVariants: Variants = {
  hidden: { opacity: 0, y: 10, scaleX: 0.94 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scaleX: 1,
    transition: {
      duration: LINHA_HUB_DURACAO,
      delay: LINHA_HUB_INICIO + i * LINHA_HUB_PASSO,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  }),
};

/**
 * Blindagem da entrada (o `initial={false}` do `PageTransition` bloqueia o
 * keyframe `hidden`): mesmo mecanismo compartilhado do sistema, sem DOM extra.
 */
export { EntradaPresenca } from '@/components/ui/entrada-cards';

