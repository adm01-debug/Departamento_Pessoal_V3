/**
 * ============================================================================
 * SIMULADOR ROI — ENTRADA EM CASCATA (rápida, uma vez por acesso à aba).
 *
 * A linguagem é a mesma dos KPI Cards do Dashboard Executivo (fade + subida
 * curta), mas com parâmetros próprios do Simulador, aprovados para acelerar a
 * entrada:
 *
 *     fade (0 → 1) + y (6px → 0) · 350 ms · passo de 60 ms por índice ·
 *     ease [0.22, 1, 0.36, 1] · sem escala · teto no 9º item
 *
 * O gatilho é a MONTAGEM da aba (`initial="hidden"` + `animate="visible"`),
 * nunca o scroll. Uma vez que a aba abriu, rolar/hover/slider/select não
 * reiniciam a cascata. Ao sair e voltar à aba, o componente remonta e a
 * entrada acontece de novo — o comportamento esperado de navegação.
 *
 * `EntradaPresenca` continua necessária: o `AnimatePresence initial={false}` do
 * PageTransition bloqueia o keyframe `hidden` de descendentes Motion.
 * ============================================================================
 */
import type { Variants } from 'framer-motion';
import { MAX_ENTRADA_INDEX } from '@/components/ui/entrada-cards';

export { EntradaPresenca } from '@/components/ui/entrada-cards';

/** Duração da entrada de cada bloco (s). */
export const ENTRADA_SIMULADOR_DURACAO = 0.35;
/** Intervalo entre blocos consecutivos (s). */
export const ENTRADA_SIMULADOR_PASSO = 0.06;

const variantesEntradaSimulador: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: Math.min(Math.max(i, 0), MAX_ENTRADA_INDEX) * ENTRADA_SIMULADOR_PASSO,
      duration: ENTRADA_SIMULADOR_DURACAO,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  }),
};

/**
 * Props da entrada do Simulador, prontas para espalhar em qualquer `motion.*`.
 * Sem `whileInView`: a entrada é disparada pela montagem, uma única vez.
 */
export function entradaSimulador(index = 0) {
  return {
    custom: Math.min(Math.max(index, 0), MAX_ENTRADA_INDEX),
    variants: variantesEntradaSimulador,
    initial: 'hidden',
    animate: 'visible',
  };
}

