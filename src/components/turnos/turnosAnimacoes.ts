/**
 * ============================================================================
 * TURNOS & ESCALAS — CASCATA DO CALENDÁRIO (números derivados, não novos).
 * ============================================================================
 *
 * A grade da semana precisa de uma entrada própria: as LINHAS surgem
 * progressivamente e as CÉLULAS aparecem em cascata, com deslocamento vertical
 * curto + opacidade (nada de escala, nada de mola) e sem reiniciar a cada
 * hover/filtro.
 *
 * Para não inventar uma segunda coreografia no sistema, TODOS os números saem
 * da régua global de entrada de cards (`ui/entradaGlobal.ts` →
 * `CONFIG_ENTRADA_CARD_GLOBAL`): mesma curva, mesma duração por item, mesmo
 * intervalo entre linhas. O que muda é só a GEOMETRIA, porque uma célula não é
 * um card:
 *
 *   • `deslocamentoY` = metade do deslocamento global (7px) — uma célula de
 *     ~90px subindo 14px pareceria um salto; metade mantém o "sobe e assenta";
 *   • `intervaloCelulaS` = intervalo global / 4 (30ms) — as 7 células de uma
 *     linha fecham em ~210ms, dentro da duração de um card, em vez de a linha
 *     inteira levar 840ms;
 *   • `maxLinhasAnimadas` = 12 — acima disso a espera para a última linha
 *     passaria de 1,4s; a partir daí todas entram junto na última leva.
 *
 * A animação roda só na MONTAGEM da grade (a `key` do bloco muda apenas quando
 * muda a visão ou o período), então hover, seleção de célula e abertura de
 * modal não reexecutam nada.
 * ============================================================================
 */
import type { Variants } from 'framer-motion';
import { CONFIG_ENTRADA_CARD_GLOBAL } from '@/components/ui/entradaGlobal';

export const CASCATA_CALENDARIO = {
  /** Deslocamento vertical de cada linha/célula (metade da régua de card). */
  deslocamentoY: Math.round(CONFIG_ENTRADA_CARD_GLOBAL.deslocamentoY / 2),
  /** Duração da entrada de cada item — a mesma dos cards do sistema. */
  duracaoS: CONFIG_ENTRADA_CARD_GLOBAL.duracaoMs / 1000,
  /** Curva — a mesma dos cards do sistema (`ease-out` puro). */
  curva: CONFIG_ENTRADA_CARD_GLOBAL.curva,
  /** Intervalo entre o início de uma LINHA e o da próxima. */
  intervaloLinhaS: CONFIG_ENTRADA_CARD_GLOBAL.intervaloMs / 1000,
  /** Intervalo entre o início de uma CÉLULA e o da próxima, dentro da linha. */
  intervaloCelulaS: CONFIG_ENTRADA_CARD_GLOBAL.intervaloMs / 4000,
  /** Acima deste número de linhas, todas entram junto na última leva. */
  maxLinhasAnimadas: 12,
} as const;

/** Atraso da linha `indice` (0-based), com teto em `maxLinhasAnimadas`. */
export function atrasoDaLinha(indice: number): number {
  return Math.min(Math.max(indice, 0), CASCATA_CALENDARIO.maxLinhasAnimadas) * CASCATA_CALENDARIO.intervaloLinhaS;
}

/** Atraso da célula: a linha inteira primeiro, depois a coluna dentro dela. */
export function atrasoDaCelula(indiceLinha: number, indiceColuna: number): number {
  return atrasoDaLinha(indiceLinha) + Math.max(indiceColuna, 0) * CASCATA_CALENDARIO.intervaloCelulaS;
}

/** Variants da LINHA do calendário (`custom` = índice da linha). */
export const variantesLinhaCalendario: Variants = {
  oculto: { opacity: 0, y: CASCATA_CALENDARIO.deslocamentoY },
  visivel: (indice: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: CASCATA_CALENDARIO.duracaoS,
      delay: atrasoDaLinha(indice),
      ease: CASCATA_CALENDARIO.curva,
    },
  }),
};

/**
 * Variants da CÉLULA (`custom` = `[indiceLinha, indiceColuna]`).
 *
 * A célula também é o item que "assenta" depois da linha: o atraso já inclui o
 * da linha, então a cascata é diagonal (linha 0 coluna 0 → linha 1 coluna 0…),
 * que é o efeito progressivo pedido — sem deslocamento do bloco.
 */
export const variantesCelulaCalendario: Variants = {
  oculto: { opacity: 0, y: CASCATA_CALENDARIO.deslocamentoY },
  visivel: ([indiceLinha, indiceColuna]: [number, number]) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: CASCATA_CALENDARIO.duracaoS,
      delay: atrasoDaCelula(indiceLinha, indiceColuna),
      ease: CASCATA_CALENDARIO.curva,
    },
  }),
};
