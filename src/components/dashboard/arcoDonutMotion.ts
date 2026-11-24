/**
 * ============================================================================
 * ARCOS DE ROSCA — MECÂNICA DO TRAÇADO PROGRESSIVO (fonte única em JS).
 *
 * É ESTA a animação de entrada de toda rosca do produto: o `strokeDasharray`
 * nasce em "nada desenhado" (`0 <comprimento>`) e caminha até o traçado final,
 * interpolado pelo Framer Motion (mesmo mecanismo de `boxShadow`/`clipPath`:
 * os dois números do valor complexo são animados), com um atraso por segmento
 * (`atraso + índice × passo`). Sem `useMotionValue`/`useTransform` e sem
 * re-render por quadro — o React renderiza uma vez; quem interpola é a Motion.
 *
 * QUEM CONSOME (a paridade é por CONSTRUÇÃO, não por disciplina):
 *   • `dashboard/DonutChart.tsx` — "Departamentos", "Tipo de Vínculo",
 *     "Resumo Financeiro" (cada card passa a própria régua de duração/atraso);
 *   • `ponto/GestaoPontoAnalytics.tsx` — rosca "Distribuição de Status",
 *     desenhada dentro do `shape` do `<Pie>` do Recharts com o preset
 *     `ANIMACAO_DONUT_CARD` — o MESMO do card "Tipo de Vínculo".
 *
 * A RÉGUA (duração, atraso inicial, passo e curva) não mora aqui: vem de
 * `donutMotion.ts` (`ANIMACAO_DONUT_CARD`) ou das props de quem chama. Este
 * módulo só materializa a TÉCNICA; mudar o tempo continua sendo mexer na régua.
 *
 * GATILHO: `emVista` (o `useInView` com `once: true` de quem chama). O traçado
 * roda uma única vez, quando o gráfico aparece — nunca de novo em hover,
 * tooltip, refetch ou re-render.
 *
 * MOVIMENTO REDUZIDO: `reduzido` devolve duração 0 — o arco já nasce inteiro,
 * sem desenho animado (ver `lib/motionMode`).
 * ============================================================================
 */
import type { MotionProps, Transition } from 'framer-motion';
import { ANIMACAO_DONUT_CARD } from './donutMotion';

export interface OpcoesArcoDonut {
  /**
   * Posição do segmento no anel. Define o atraso do stagger — o primeiro
   * segmento parte no `atraso` e cada seguinte `passo` depois do anterior.
   */
  indice: number;
  /**
   * Comprimento do traçado INTEIRO, nas unidades do desenho: o perímetro do
   * círculo ou o comprimento do arco do setor. É o "zero" do traçado.
   */
  comprimento: number;
  /** Traçado final (`"<desenhado> <vazio>"`), como já era estático antes. */
  dashArrayFinal: string;
  /** `true` a partir do momento em que o gráfico entrou na viewport. */
  emVista: boolean;
  /** Movimento reduzido (`lib/motionMode`): traçado já pronto. */
  reduzido?: boolean;
  /** Duração do traçado de cada segmento (s). Default: preset do card. */
  duracao?: number;
  /** Atraso antes do primeiro segmento (s). Default: preset do card. */
  atraso?: number;
  /** Intervalo entre o início dos segmentos (s). Default: preset do card. */
  passo?: number;
  /** Curva do traçado. Default: preset do card. */
  curva?: Transition['ease'];
}

/**
 * Props de animação de UM arco — espalhe no `motion.circle` (rosca de anel) ou
 * no `motion.path` (arco de setor):
 *
 *   `<motion.circle r={raio} {...propsArcoDonut({ … })} />`
 *
 * `initial` já inclui o `strokeDasharray` (nunca um objeto vazio): com a chave
 * "sem gerenciar" no primeiro render o navegador chega a desenhar o traço
 * sólido inteiro por um frame — o "flash" que a versão antiga do DonutChart
 * tinha antes de `useInView` disparar.
 */
export function propsArcoDonut({
  indice,
  comprimento,
  dashArrayFinal,
  emVista,
  reduzido = false,
  duracao = ANIMACAO_DONUT_CARD.animationDuration,
  atraso = ANIMACAO_DONUT_CARD.animationDelay,
  passo = ANIMACAO_DONUT_CARD.segmentStagger,
  curva = ANIMACAO_DONUT_CARD.animationEase,
}: OpcoesArcoDonut): Pick<MotionProps, 'initial' | 'animate' | 'transition'> {
  const naoDesenhado = `0 ${comprimento}`;

  return {
    initial: { strokeDasharray: naoDesenhado },
    animate: { strokeDasharray: emVista ? dashArrayFinal : naoDesenhado },
    transition: {
      duration: reduzido ? 0 : duracao,
      delay: reduzido ? 0 : atraso + Math.max(0, indice) * passo,
      ease: curva,
    },
  };
}
