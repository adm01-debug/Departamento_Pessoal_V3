/**
 * ============================================================================
 * PESQUISAS DE CLIMA & eNPS — RÉGUA DO PREENCHIMENTO DA BARRA DE ADESÃO.
 *
 * A barra do cartão deixou de nascer cheia: o preenchimento entra pelo MESMO
 * movimento do card "Amplitude de Liderança" (Dashboard Executivo, aba
 * Estrutura), a referência aprovada do produto. Os números NÃO são recriados
 * aqui — vêm de `ui/progressMotion`, a régua GLOBAL do preenchimento
 * (1,2 s · `easeOut` · atraso de 0,15 s + índice × 0,1 s), a mesma que o
 * `TotaisHorasCard` e o painel de geofencing consomem. Mexer no ritmo das
 * barras do sistema continua sendo mexer em UM lugar.
 *
 * ── POR QUE `translateX` E NÃO `width` ──────────────────────────────────────
 * Na referência o preenchimento cresce por `width: 0 → pct%` e o degradê mora
 * nele. Aqui o degradê (lime `primary` → verde `success`) é esticado no TRILHO
 * e anda por `translateX`: a fração preenchida mostra o pedaço correspondente
 * da rampa. Animar `width` comprimiria a rampa dentro da parte preenchida (a
 * barra de 48% terminaria no verde) e mudaria o degradê aprovado.
 * `translateX(-100%) → translateX(-(100 − pct)%)` dá o MESMO crescimento da
 * esquerda para a direita sem tocar em cor nenhuma.
 *
 * ── QUANDO COMEÇA ───────────────────────────────────────────────────────────
 * O `initial` é sempre o zero (`-100%`). A grade de `PesquisasClimaPage` só
 * monta os cartões com `isLoading === false` (enquanto carrega, a grade é
 * substituída por um spinner), então o preenchimento parte do zero no mesmo
 * commit em que os dados aparecem — nunca existe um quadro com a barra cheia.
 * ============================================================================
 */
import type { MotionProps } from 'framer-motion';
import {
  BARRA_PROGRESSO_ATRASO_S,
  BARRA_PROGRESSO_DURACAO_S,
  BARRA_PROGRESSO_EASE,
  BARRA_PROGRESSO_PASSO_CASCATA_S,
} from '@/components/ui/progressMotion';

/** Percentual seguro (0–100, valores inválidos viram 0). */
export function percentualAdesao(valor: number): number {
  if (!Number.isFinite(valor)) return 0;
  return Math.max(0, Math.min(100, valor));
}

/** Atraso (s) do preenchimento: 0,15 s na primeira barra, +0,1 s por índice. */
export function atrasoPreenchimento(indice = 0): number {
  return BARRA_PROGRESSO_ATRASO_S + Math.max(0, indice) * BARRA_PROGRESSO_PASSO_CASCATA_S;
}

/**
 * `translateX` do preenchimento: `-100%` = inteiro fora da área visível
 * (trilho vazio), `0%` = encostado nas duas bordas (100% de adesão).
 */
export function deslocamentoPreenchimento(valor: number): string {
  return `-${100 - percentualAdesao(valor)}%`;
}

/**
 * Props do preenchimento animado: do zero até o percentual final, com a
 * duração, a curva e a cascata da referência.
 *
 * Com movimento reduzido (ver `useMovimentoReduzido`), a barra já nasce no
 * valor final via `style`, sem transição — como o resto do sistema faz.
 */
export function propsPreenchimentoAdesao(percentual: number, indice = 0, reduzir = false): MotionProps {
  const destino = deslocamentoPreenchimento(percentual);
  if (reduzir) return { style: { transform: `translateX(${destino})` } };
  return {
    initial: { x: '-100%' },
    animate: { x: destino },
    transition: {
      duration: BARRA_PROGRESSO_DURACAO_S,
      delay: atrasoPreenchimento(indice),
      ease: BARRA_PROGRESSO_EASE,
    },
  };
}
