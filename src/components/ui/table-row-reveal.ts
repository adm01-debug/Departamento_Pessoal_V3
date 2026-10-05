import type { Variants } from 'framer-motion';

/**
 * ============================================================================
 * Cascata de ENTRADA das linhas de tabela — FONTE ÚNICA de motion.
 *
 * Mora fora dos componentes de propósito (mesmo princípio de
 * `ui/motion-presets.ts` / `ui/cascade-motion.ts`): a lista de "Gestão de
 * Candidatos" (`components/admissoes/GestaoCandidatos.tsx`) e a de "Auditoria
 * Global" (`pages/AuditoriaPage.tsx`) precisam da MESMA sensação — cada linha
 * entrando uma depois da outra. As duas importam os MESMOS números/variant
 * daqui; não existe uma segunda cascata de linhas no sistema. Mudar um valor
 * aqui move as duas telas juntas (nunca divergem).
 *
 * Cada linha "nasce de DENTRO PARA FORA": abre do centro (`scaleX: 0.94 → 1`,
 * com `transform-origin: center` pela classe `origin-center` no `<tr>`), sobe
 * 10px (`y: 10 → 0`) e aparece de `opacity: 0 → 1`.
 *
 * Onda própria: `delay = INICIO_LINHAS (0,52s) + índice × 40ms`. Só `opacity` e
 * `transform` animam (nada de width/height/left/top → sem reflow). SEM
 * `clip-path`: animar `clip-path` num `table-row` é inconsistente entre
 * navegadores — o efeito de "abrir do centro" vem do `scaleX` com
 * `origin-center`.
 *
 * NÃO usamos `useReducedMotion()` aqui de propósito (decisão explícita do
 * produto): queremos a cascata visível MESMO com `prefers-reduced-motion`
 * ligado no sistema.
 *
 * COMO USAR (o mesmo padrão dos dois consumidores): o `<tbody>` leva
 * `key` que muda quando a LISTA troca de identidade (página/ordenação/filtros)
 * — assim a cascata toca de novo — e é embrulhado por um `AnimatePresence`
 * LOCAL sem props, para que um `AnimatePresence initial={false}` de um ancestral
 * não pule o keyframe `hidden` das linhas. Cada `<tr>` vira `motion.tr` com
 * `custom={indice}`, `variants={linhaTabelaVariants}`, `initial="hidden"`,
 * `animate="visible"` e a classe `origin-center`. O cabeçalho NÃO anima.
 * ============================================================================
 */

/** Início da onda das linhas (segundos). */
export const INICIO_LINHAS = 0.52;

/** Passo entre linhas consecutivas (segundos). */
export const PASSO_LINHAS = 0.04;

/**
 * Variant do `<tr>`. Use com `custom={indice}`, `initial="hidden"` e
 * `animate="visible"`.
 */
export const linhaTabelaVariants: Variants = {
  hidden: { opacity: 0, y: 10, scaleX: 0.94 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scaleX: 1,
    transition: {
      duration: 0.8,
      delay: INICIO_LINHAS + i * PASSO_LINHAS,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  }),
};
