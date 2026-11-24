/**
 * ============================================================================
 * BARRAS DE PROGRESSO — RÉGUA DO PREENCHIMENTO (fonte única em JS).
 *
 * Espelha o token `--transition-duration-progresso` (1200ms) do `@theme` em
 * `src/index.css`, usado pelas barras que animam por CSS (`duration-progresso`).
 * Aqui ficam os MESMOS números para as barras implementadas com Framer Motion
 * (`width` 0 → X%): antes cada card tinha o seu (0,35 s / 0,5 s / 0,6 s / 0,8 s
 * / 1 s / 1,5 s) e o preenchimento ficava rápido demais para ser percebido.
 *
 * O que é padronizado aqui é SÓ o tempo/curva do preenchimento. Atraso inicial,
 * passo de cascata, cor, altura e largura continuam sendo de cada card — é o
 * que preserva a coreografia aprovada de cada tela.
 * ============================================================================
 */
import type { MotionProps, Transition } from 'framer-motion';

/** Duração do preenchimento (s) — 1200ms, o passo `progresso` da régua. */
export const BARRA_PROGRESSO_DURACAO_S = 1.2;

/** Curva do preenchimento — `ease-out`, como pede a régua do produto. */
export const BARRA_PROGRESSO_EASE = 'easeOut' as const;

/**
 * Props de animação de um preenchimento que cresce da esquerda para a direita
 * (`width`: 0 → percentual final). `delay`/`ease` opcionais mantêm a cascata
 * do card que chama; o que NÃO se repete em cada arquivo é a duração.
 *
 * `reduzir` (movimento reduzido) devolve a largura final direto no `style`,
 * sem transição — a barra nasce cheia, como manda o `prefers-reduced-motion`.
 *
 * É a versão “pronta” da régua para barras novas: espalhe as props no
 * `motion.*` que representa o preenchimento (`<motion.div {...propsPreenchimentoBarra(pct)} />`).
 */
export function propsPreenchimentoBarra(
  percentual: number,
  opcoes: { delay?: number; ease?: Transition['ease']; reduzir?: boolean } = {}
): MotionProps {
  const largura = `${percentualDaBarra(percentual)}%`;
  if (opcoes.reduzir) return { style: { width: largura } };
  return {
    initial: { width: 0 },
    animate: { width: largura },
    transition: {
      duration: BARRA_PROGRESSO_DURACAO_S,
      delay: opcoes.delay ?? 0,
      ease: opcoes.ease ?? BARRA_PROGRESSO_EASE,
    },
  };
}

/**
 * Percentual de uma barra: 0–100, com as CASAS DECIMAIS preservadas.
 *
 * O valor que chega aqui é o dado real (27,8% de participação, 33,3% de
 * conversão). Arredondar para inteiro mudaria o comprimento da barra em relação
 * ao percentual escrito ao lado dela — a régua cuida do TEMPO, nunca do dado.
 */
function percentualDaBarra(percentual: number): number {
  if (!Number.isFinite(percentual)) return 0;
  return Math.max(0, Math.min(100, percentual));
}

/* ──────────────────────────────────────────────────────────────────────────
 * CASCATA DA REFERÊNCIA — card "Amplitude de Liderança"
 *
 * As duas constantes abaixo são a coreografia APROVADA daquele card
 * (`DashboardExecutivoPage`, aba Estrutura):
 *
 *   transition={{ duration: BARRA_PROGRESSO_DURACAO_S,
 *                 delay: 0.15 + i * 0.1, ease: 'easeOut' }}
 *
 * Elas moram aqui — e não em cada tela — porque a mesma cascata passou a ser
 * usada por mais de um módulo (Gestão de Desempenho via
 * `avaliacao/barraProgressoAnim.ts` e, agora, os painéis "Principais origens" e
 * "Desempenho por vaga" da Analytics de Recrutamento). A paridade com o card de
 * referência é provada lendo o fonte dele em
 * `components/__tests__/BarrasProgressoRegua.test.ts`.
 *
 * A duração NÃO é redefinida aqui: é a régua global (`BARRA_PROGRESSO_DURACAO_S`
 * = 1,2 s), a mesma que o card de referência consome.
 * ────────────────────────────────────────────────────────────────────────── */

/** Atraso da PRIMEIRA barra da lista, em segundos (0,15 s). */
export const BARRA_PROGRESSO_ATRASO_S = 0.15;

/** Passo da cascata entre uma barra e a seguinte, em segundos (0,1 s). */
export const BARRA_PROGRESSO_PASSO_CASCATA_S = 0.1;

/**
 * Props de animação de uma barra em CASCATA — a coreografia do card
 * "Amplitude de Liderança" com a régua global de duração/curva.
 *
 * `indice` é a posição da barra na lista (0 = primeira): cada uma parte
 * `BARRA_PROGRESSO_PASSO_CASCATA_S` depois da anterior, o mesmo "de cima para
 * baixo" da referência. `reduzir` (movimento reduzido) monta a barra já no
 * comprimento final: `initial: false` faz a Motion ignorar o keyframe de
 * partida e aplicar o alvo no primeiro quadro — sem espera e sem varredura.
 *
 * Diferença em relação a `propsPreenchimentoBarra`: aqui NÃO há
 * `style`/arredondamento no caminho do movimento reduzido, então o estado
 * "ainda escondido" (barra em 0) pode ser representado pelo próprio chamador
 * sem misturar as duas APIs.
 */
export function propsPreenchimentoBarraCascata(
  percentual: number,
  indice = 0,
  opcoes: { reduzir?: boolean } = {}
): MotionProps {
  const largura = `${percentualDaBarra(percentual)}%`;
  if (opcoes.reduzir) return { initial: false, animate: { width: largura } };
  return {
    initial: { width: 0 },
    animate: { width: largura },
    transition: {
      duration: BARRA_PROGRESSO_DURACAO_S,
      delay: BARRA_PROGRESSO_ATRASO_S + Math.max(0, indice) * BARRA_PROGRESSO_PASSO_CASCATA_S,
      ease: BARRA_PROGRESSO_EASE,
    },
  };
}
