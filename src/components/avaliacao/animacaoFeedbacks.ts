/**
 * ============================================================================
 * ENTRADA DOS CARDS DE FEEDBACK — régua PRÓPRIA da lista da aba "Feedbacks".
 *
 * POR QUE UM ARQUIVO LOCAL (e não `ui/entrada-cards.tsx`): a régua compartilhada
 * (`entradaCard` + `cardVariants` — fade + subida de 20 px, cascata de 0.08 s) é a
 * assinatura dos KPI Cards do Dashboard e é usada por Admissões, Desligamentos e
 * Recrutamento; mexer nela moveria todas essas telas. A lista de Feedbacks pede
 * uma coreografia DIFERENTE, então a régua nova mora aqui, ao lado de quem a
 * consome — o mesmo padrão de `barraProgressoAnim.ts`.
 *
 * ── COREOGRAFIA (duas etapas, coordenadas) ──────────────────────────────────
 *   1. PRIMEIRO card → EXPANSÃO DO CENTRO PARA AS BORDAS: nasce menor
 *      (`scale 0.78`), transparente e recortado no miolo
 *      (`clipPath: inset(35% 25% round 16px)`) e cresce até ocupar a caixa
 *      inteira (`scale 1`, `clipPath: inset(0% 0% round 16px)`), com a origem da
 *      transformação no centro. O recorte é o que dá a leitura de "superfície
 *      que se abre"; a escala sozinha pareceria apenas um zoom.
 *   2. DEMAIS cards → DESCIDA (`y: -48 → 0`) em cascata de `0.2 s`, começando
 *      quando a expansão do primeiro está praticamente concluída.
 *
 * QUEM COMANDA É O PAI: as variantes abaixo são consumidas por `variants` +
 * `custom`, com `initial`/`animate` vindos do COORDENADOR
 * (`FeedbacksTimeline`) — os cards não têm gatilho próprio, então não existe
 * animação independente nem reexecução por hover, scroll, re-render ou resize.
 *
 * MOVIMENTO REDUZIDO: quem carrega a preferência é o coordenador, que abre a
 * lista já no estado final (sem `y`, sem escala e sem recorte) — nenhuma
 * configuração global é tocada.
 * ============================================================================
 */
import type { CSSProperties } from 'react';
import type { Variants } from 'framer-motion';

/**
 * Curva ÚNICA da lista: acelera e desacelera suavemente, sem bounce e sem
 * "tranco" no fim — a mesma nas duas etapas, para os movimentos parecerem um
 * só sistema.
 */
export const EASE_FEEDBACKS: [number, number, number, number] = [0.22, 1, 0.36, 1];

/** ── Etapa 1 — expansão do primeiro card ──────────────────────────────────── */
export const EXPANSAO_DURACAO_S = 0.9;
export const EXPANSAO_ESCALA_INICIAL = 0.78;
export const EXPANSAO_CLIP_INICIAL = 'inset(35% 25% round 16px)';
/**
 * O recorte termina em `inset(0% 0% round 16px)` — exatamente o estado final
 * especificado: a 100 % o card está inteiro e o canto do recorte (16 px) é MAIOR
 * que o raio do próprio card (12 px, `rounded-xl`), então ele não corta o
 * conteúdo nem desenha borda visível.
 *
 * CONSEQUÊNCIA CONHECIDA: com o recorte preso na caixa, a sombra do card
 * (`shadow-elevated` / `hover:shadow-lg`) não aparece FORA dela — um `clip-path`
 * corta também a própria sombra. É o único jeito de manter o estado final
 * literalmente como pedido; quem preferir a sombra de volta troca o valor final
 * por `nenhum` (removendo a chave `clipPath` do quadro final).
 */
export const EXPANSAO_CLIP_FINAL = 'inset(0% 0% round 16px)';
/** Origem da transformação: o card cresce a partir do próprio centro. */
export const EXPANSAO_ORIGEM: CSSProperties = { transformOrigin: 'center center' };

/** ── Etapa 2 — descida em cascata dos demais cards ────────────────────────── */
/**
 * Duração da descida de CADA card. Era 0,75 s e caiu para 0,6 s a pedido: o
 * deslize fica um pouco mais rápido sem tocar na cadência (o 2º card ainda
 * começa quando o 1º termina de expandir, e os seguintes continuam a 0,2 s de
 * intervalo) — a cascata fica mais ágil sem perder a leitura do movimento.
 */
export const CASCATA_DURACAO_S = 0.6;
/** Deslocamento inicial (px) — o card vem de CIMA e desce até a posição final. */
export const CASCATA_Y_INICIAL = -48;
/** Intervalo entre um card e o seguinte (o movimento seguinte continua a cascata). */
export const CASCATA_PASSO_S = 0.2;
/**
 * A cascata começa quando a expansão está praticamente concluída — por isso o
 * atraso do 2º card é igual à duração da 1ª etapa. Os movimentos se sobrepõem
 * de leve, formando uma cascata contínua (e não uma fila de esperas).
 */
export const CASCATA_ATRASO_S = EXPANSAO_DURACAO_S;

/** Atraso do card de posição `i` (o 1º = 0; o 2º = 0.9 s; o 3º = 1.1 s …). */
export function atrasoDoCard(indice: number): number {
  return indice <= 0 ? 0 : CASCATA_ATRASO_S + (indice - 1) * CASCATA_PASSO_S;
}

/**
 * Variantes da entrada: `custom` é a POSIÇÃO do card na lista (0 = primeiro).
 * O primeiro recebe a expansão; do segundo em diante, a descida com atraso
 * progressivo — a sequência continua até o último registro da apresentação.
 */
export const entradaFeedbackVariants: Variants = {
  hidden: (i: number) =>
    i === 0
      ? { opacity: 0, scale: EXPANSAO_ESCALA_INICIAL, clipPath: EXPANSAO_CLIP_INICIAL }
      : { opacity: 0, y: CASCATA_Y_INICIAL },
  visible: (i: number) =>
    i === 0
      ? {
          opacity: 1,
          scale: 1,
          clipPath: [EXPANSAO_CLIP_INICIAL, EXPANSAO_CLIP_FINAL],
          transition: {
            duration: EXPANSAO_DURACAO_S,
            ease: EASE_FEEDBACKS,
            // `clipPath` ganha transição PRÓPRIA (e não um `times` no topo): um
            // `times` global vale para TODOS os valores e desalinha os que têm
            // menos quadros — foi o que fez a opacidade oscilar em vez de subir.
            clipPath: { duration: EXPANSAO_DURACAO_S, ease: EASE_FEEDBACKS },
          },
        }
      : {
          opacity: 1,
          y: 0,
          transition: {
            delay: atrasoDoCard(i),
            duration: CASCATA_DURACAO_S,
            ease: EASE_FEEDBACKS,
          },
        },
};

/**
 * Props do card no coordenador: só `custom` + `variants`. `initial`/`animate`
 * ficam com o PAI de propósito — é o que garante um gatilho único para toda a
 * lista (sem animação independente e sem reexecução).
 */
export function cardEntradaFeedback(indice: number) {
  return {
    custom: Math.max(indice, 0),
    variants: entradaFeedbackVariants,
  };
}
