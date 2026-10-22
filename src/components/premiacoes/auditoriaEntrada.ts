/**
 * ============================================================================
 * AUDITORIA (Hub de Premiações) — TEMPORIZAÇÃO/MOVIMENTO DA TIMELINE.
 *
 * A linguagem continua sendo a da lista de Campanhas (fade + subida de 10px,
 * opacidade 0→1), mas a Auditoria tem régua própria, definida para esta aba:
 *
 *     duração 0,55s · passo 0,11s · atraso inicial 0,08s · easeOutCubic
 *
 * Sem `scaleX`: numa timeline o trilho vertical e o ponto vivem DENTRO da linha
 * e precisam permanecer alinhados entre os eventos durante a cascata — uma
 * escala horizontal por linha desalinharia o trilho enquanto os atrasos são
 * diferentes. O movimento aqui é só opacidade + `y` (GPU-friendly).
 *
 * O atraso para de crescer no 9º passo (0,08 + 9 × 0,11 = 1,07s): os primeiros
 * eventos aparecem em cascata perceptível e o restante da lista entra junto,
 * sem empurrar o fim da animação para 3s em páginas maiores. A lista de
 * Campanhas NÃO importa este arquivo — a régua dela continua intacta em
 * `premiacoesEntrada.ts`.
 * ============================================================================
 */
import type { Variants } from 'framer-motion';

/** Duração da entrada de CADA linha/cabeçalho (s). */
export const AUDITORIA_ENTRADA_DURACAO = 0.55;
/** Intervalo entre unidades consecutivas (s). */
export const AUDITORIA_ENTRADA_PASSO = 0.11;
/** Atraso antes da primeira unidade (s). */
export const AUDITORIA_ENTRADA_ATRASO = 0.08;
/** Índice máximo que ainda aumenta o atraso (limite do total da cascata). */
export const AUDITORIA_ENTRADA_MAX_PASSO = 9;
/** `easeOutCubic` (aproximação cúbica padrão do CSS). */
export const AUDITORIA_EASE_OUT_CUBIC: [number, number, number, number] = [0.33, 1, 0.68, 1];

/**
 * Entrada de uma unidade da timeline (cabeçalho do dia OU linha de evento).
 * Use com `custom={indiceGlobal}`, `initial="hidden"` e `animate="visible"`.
 */
export const linhaAuditoriaVariants: Variants = {
  // Mesmo estado inicial visual da referência, sem escala horizontal.
  hidden: { opacity: 0, y: 10 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: AUDITORIA_ENTRADA_DURACAO,
      delay: AUDITORIA_ENTRADA_ATRASO + Math.min(Math.max(i, 0), AUDITORIA_ENTRADA_MAX_PASSO) * AUDITORIA_ENTRADA_PASSO,
      ease: AUDITORIA_EASE_OUT_CUBIC,
    },
  }),
};
