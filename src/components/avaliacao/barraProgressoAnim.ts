/**
 * ============================================================================
 * BARRA DE PROGRESSO — RÉGUA DA ANIMAÇÃO (Gestão de Desempenho).
 *
 * Réplica EXATA da animação aprovada no card "Amplitude de Liderança"
 * (`DashboardExecutivoPage`, aba Estrutura): o preenchimento cresce da ESQUERDA
 * para a direita (`width: 0 → pct%`), em 0,6 s, `easeOut`, com atraso de
 * `0,15 s + índice × 0,1 s` — a cascata do card referência.
 *
 * Nada aqui é uma animação nova: as constantes abaixo foram copiadas da
 * referência e são a ÚNICA fonte de verdade do ritmo. O componente que as
 * aplica é `BarraProgresso` (`./barraProgresso`), usado por TODAS as barras
 * horizontais do módulo (Ciclo Ativo, cards analíticos, tabela de ciclos e a
 * grade de metas da página).
 *
 * Movimento reduzido: o preenchimento já sai na largura final (via `style`),
 * como o resto do módulo faz (`propsTraco`/`propsRotulo` do `CicloAtivoPanel`)
 * — sem largura alguma a barra ocuparia 100%.
 * ============================================================================
 */
import type { MotionProps } from 'framer-motion';
import { limitarPercentual } from './desempenhoComum';

/** Duração do preenchimento — mesmo valor de "Amplitude de Liderança". */
export const BARRA_DURACAO_S = 0.6;
/** Atraso da PRIMEIRA barra da lista (as seguintes entram em cascata). */
export const BARRA_ATRASO_S = 0.15;
/** Passo da cascata entre uma barra e a seguinte — o stagger da referência. */
export const BARRA_ATRASO_POR_INDICE_S = 0.1;
/** Curva do preenchimento — a mesma da referência (`easeOut`). */
export const BARRA_EASE = 'easeOut';

/** Props de animação do preenchimento de uma barra (largura final em %). */
export function propsBarraProgresso(
  percentual: number,
  indice = 0,
  reduzir = false
): MotionProps {
  const largura = `${limitarPercentual(percentual)}%`;
  if (reduzir) return { style: { width: largura } };
  return {
    initial: { width: 0 },
    animate: { width: largura },
    transition: {
      duration: BARRA_DURACAO_S,
      delay: BARRA_ATRASO_S + indice * BARRA_ATRASO_POR_INDICE_S,
      ease: BARRA_EASE,
    },
  };
}
