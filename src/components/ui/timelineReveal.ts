/**
 * ============================================================================
 * LINHA DO TEMPO — REVELAÇÃO PROGRESSIVA (fonte única do ritmo)
 *
 * A coreografia nasceu no card "Histórico Profissional"
 * (`colaborador-detalhes/TrabalhoHierarquiaTab.tsx`) e é a referência aprovada
 * para toda linha do tempo horizontal do sistema:
 *
 *   1. o TRILHO é DESENHADO da esquerda para a direita (`scaleX` 0→1 ancorado
 *      à esquerda) em velocidade CONSTANTE (`linear`), `DURACAO_TRACO_TIMELINE`;
 *   2. cada MARCADOR nasce "de dentro para fora" (opacidade 0→1 + escala 0→1,
 *      com um overshoot curto) no instante em que o traço o alcança;
 *   3. as INFORMAÇÕES da etapa (horário, rótulo e descrição) descem 14 px até a
 *      posição final, logo depois do marcador (`ATRASO_INFO_TIMELINE`), em fade.
 *
 * POR QUE O RITMO MORA AQUI
 * -------------------------
 * O passo entre etapas é DERIVADO da duração do traço (`passoTimeline`): um
 * número só alimenta linha e cascata, então desacelerar o traço desacelera as
 * bolinhas junto, sem perder a coincidência "traço chega ↔ marcador nasce" e
 * sem pausas artificiais. Quem tem geometria diferente muda apenas a FRAÇÃO do
 * traço em que o último marcador cai (`fracaoUltimoMarcador`), nunca o ritmo.
 *
 * QUEM USA
 * --------
 *   • "Histórico Profissional" (`colaborador-detalhes/TrabalhoHierarquiaTab.tsx`)
 *     → 4 etapas (3 passos) e último marcador a 84% do traço, medido com as
 *       etapas distribuídas por `justify-between`;
 *   • "Jornada de Hoje" (`ponto/PontoTodayCard.tsx`) → 4 etapas (3 passos) e
 *     trilho que começa e termina no centro do 1º e do 4º círculo (fração 1),
 *     então cada círculo nasce exatamente quando a ponta do traço o alcança.
 *
 * MOVIMENTO REDUZIDO
 * ------------------
 * Quem decide é `lib/motionMode.ts` (`useMovimentoReduzido`) — fonte única do
 * app. Com a preferência ligada, os atrasos caem para 0 e o traço já nasce
 * pronto (`duration: 0`); o Framer Motion mantém apenas o fade (sem escala nem
 * deslocamento), porque o `reducedMotion` global desliga os transforms.
 * ============================================================================
 */
import type { Transition } from 'framer-motion';

/** Duração do TRAÇO da linha (s) — faixa aprovada: 1,8–2,2 s. */
export const DURACAO_TRACO_TIMELINE = 1.8;

/**
 * Fração do traço em que o ÚLTIMO marcador fica quando a linha é mais larga que
 * a soma dos marcadores (padrão do "Histórico Profissional": ~84%).
 */
export const FRACAO_ULTIMO_MARCADOR_TIMELINE = 0.84;

/** Duração do "surgir de dentro para fora" de cada marcador (0,45–0,60 s). */
export const DURACAO_MARCADOR_TIMELINE = 0.52;

/** Duração do deslizar das informações até a posição final (0,50–0,65 s). */
export const DURACAO_INFO_TIMELINE = 0.56;

/** Folga (s) entre o marcador nascer e as informações começarem a descer. */
export const ATRASO_INFO_TIMELINE = 0.16;

/** Deslocamento inicial das informações: 14 px ACIMA da posição final. */
export const Y_INFO_TIMELINE = -14;

/**
 * Curva do marcador — overshoot curto (é o "pulinho" aprovado da bolinha).
 * Tupla MUTÁVEL de propósito: é o formato que `Transition['ease']` aceita.
 */
export const EASE_MARCADOR_TIMELINE: [number, number, number, number] = [0.34, 1.56, 0.64, 1];

/** Curva das informações — desaceleração suave, SEM overshoot. */
export const EASE_INFO_TIMELINE: [number, number, number, number] = [0.25, 0.46, 0.45, 0.94];

/**
 * Geometria/ritmo de UMA linha do tempo. Só o que muda de tela para tela:
 * quantos passos existem entre o 1º e o último marcador e em que fração do
 * traço esse último marcador fica.
 */
export interface RitmoTimeline {
  /** Nº de passos entre o 1º e o último marcador (= etapas − 1). */
  passos: number;
  /** Fração do traço ocupada até o último marcador (0–1). Padrão: 0,84. */
  fracaoUltimoMarcador?: number;
  /** Duração do traço (s). Padrão: `DURACAO_TRACO_TIMELINE`. */
  duracaoTraco?: number;
}

/**
 * Passo (s) entre uma etapa e a seguinte, DERIVADO da duração do traço: com o
 * traço em ritmo constante, a bolinha nasce no instante em que o "lápis" chega
 * nela. Ex.: `(1,8 s × 0,84) / 3 passos` ≈ 0,50 s no Histórico Profissional.
 */
export function passoTimeline({
  passos,
  fracaoUltimoMarcador = FRACAO_ULTIMO_MARCADOR_TIMELINE,
  duracaoTraco = DURACAO_TRACO_TIMELINE,
}: RitmoTimeline): number {
  const passosValidos = Number.isFinite(passos) && passos > 0 ? passos : 1;
  const fracao = Number.isFinite(fracaoUltimoMarcador) ? Math.min(Math.max(fracaoUltimoMarcador, 0), 1) : 1;
  return (duracaoTraco * fracao) / passosValidos;
}

/**
 * Atraso (s) do marcador de uma etapa: `0` no primeiro e um passo a cada etapa
 * seguinte, na ordem em que o traço as alcança. Com movimento reduzido é `0`.
 */
export function atrasoMarcadorTimeline(posicao: number, ritmo: RitmoTimeline, reduzirMovimento = false): number {
  if (reduzirMovimento) return 0;
  const indice = Number.isFinite(posicao) && posicao > 0 ? Math.round(posicao) : 0;
  return indice * passoTimeline(ritmo);
}

/** Props de revelação devolvidas pelos helpers abaixo (para espalhar num `motion.*`). */
export interface PropsRevelacaoTimeline {
  initial: { opacity: number; scale?: number; y?: number };
  animate: { opacity: number; scale?: number; y?: number };
  transition: Transition;
}

/**
 * Props do MARCADOR: "de dentro para fora" (opacidade + escala a partir do
 * centro), sem deslocamento vertical — escala não afeta layout, então nada em
 * volta se mexe.
 */
export function propsMarcadorTimeline(revelar: boolean, atraso = 0): PropsRevelacaoTimeline {
  return {
    initial: { opacity: 0, scale: 0 },
    animate: revelar ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0 },
    transition: { delay: atraso, duration: DURACAO_MARCADOR_TIMELINE, ease: EASE_MARCADOR_TIMELINE },
  };
}

/**
 * Props das INFORMAÇÕES da etapa: fade + descida de 14 px (`y`), começando
 * `ATRASO_INFO_TIMELINE` depois de o marcador nascer. `y` é transform: a
 * posição final é exatamente a original, sem reflow.
 */
export function propsInfoTimeline(revelar: boolean, atrasoMarcador = 0): PropsRevelacaoTimeline {
  return {
    initial: { opacity: 0, y: Y_INFO_TIMELINE },
    animate: revelar ? { opacity: 1, y: 0 } : { opacity: 0, y: Y_INFO_TIMELINE },
    transition: {
      delay: atrasoMarcador + ATRASO_INFO_TIMELINE,
      duration: DURACAO_INFO_TIMELINE,
      ease: EASE_INFO_TIMELINE,
    },
  };
}

/**
 * Props do TRILHO: `scaleX` 0→1 ancorado à esquerda (o traço é DESENHADO da
 * esquerda para a direita) em ritmo CONSTANTE — `linear` é obrigatório: com
 * qualquer easing a ponta ficaria longe da bolinha no instante em que ela nasce.
 */
export function propsTracoTimeline(revelar: boolean, reduzirMovimento = false) {
  return {
    initial: { scaleX: 0 },
    animate: revelar ? { scaleX: 1 } : { scaleX: 0 },
    transition: {
      duration: reduzirMovimento ? 0 : DURACAO_TRACO_TIMELINE,
      ease: 'linear' as const,
    },
    style: { transformOrigin: 'left' } as const,
  };
}
