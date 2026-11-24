/**
 * ============================================================================
 * ANEL DE ROSCA ANIMADO — o desenho em si, compartilhado.
 *
 * Materializa a MECÂNICA ÚNICA do traçado (`arcoDonutMotion.ts`): um
 * `<motion.circle>` por segmento, com `strokeDasharray` indo de "nada
 * desenhado" até o traçado final e `strokeDashoffset` fixo (posição/rotação do
 * segmento no anel). Quem chama decide a régua (duração/atraso/passo/curva),
 * o raio, a espessura, o vão entre segmentos e o `stroke-linecap`.
 *
 * QUEM USA
 *   • `dashboard/DonutChart.tsx` — "Departamentos", "Tipo de Vínculo",
 *     "Resumo Financeiro" (anel dentro do `<svg>` do próprio card);
 *   • `ponto/GestaoPontoAnalytics.tsx` — rosca "Distribuição de Status"
 *     (anel responsivo de `viewBox 0 0 100 100`, com o MESMO preset do
 *     "Tipo de Vínculo").
 *
 * Por que o anel é montado AQUI (e não dentro do `shape` do Recharts, no
 * Controle de Ponto): o Recharts recria os setores quando o layout é medido, e
 * um `motion` remontado no meio da entrada perde a animação (o traçado
 * aparecia pronto). Num `<svg>` do próprio React o elemento é montado uma vez
 * e o traçado roda inteiro, como na referência.
 * ============================================================================
 */
import { motion, type Transition } from 'framer-motion';
import { propsArcoDonut } from './arcoDonutMotion';

export interface SegmentoAnel {
  label: string;
  value: number;
  color: string;
}

interface AnelDonutProps {
  segments: readonly SegmentoAnel[];
  /** Centro do anel, nas unidades do desenho. */
  center: number;
  /** Raio da linha média do traço, nas unidades do desenho. */
  radius: number;
  /** Espessura do traço, nas unidades do desenho. */
  strokeWidth: number;
  /**
   * Vão entre segmentos, nas unidades do desenho (comprimento, não ângulo).
   * É subtraído do traçado de cada segmento — o resto da circunferência já é
   * "vazio", então o vão entre dois segmentos é exatamente este valor.
   */
  gap?: number;
  /** Duração do traçado de cada segmento (s). Default: preset do card. */
  duracao?: number;
  /** Atraso antes do primeiro segmento (s). Default: preset do card. */
  atraso?: number;
  /** Intervalo entre o início dos segmentos (s). Default: preset do card. */
  passo?: number;
  /** Curva do traçado. Default: preset do card. */
  curva?: Transition['ease'];
  /** `true` a partir do momento em que o gráfico entrou na viewport. */
  emVista: boolean;
  /** Movimento reduzido (`lib/motionMode`): traçado já pronto. */
  reduzido?: boolean;
  /**
   * Pontas do traço. `'butt'` = o traço cobre exatamente o arco do segmento (o
   * vão entre fatias é o `gap` informado, sem compensação); `'round'` = pontas
   * arredondadas, como nos cards do Dashboard — nesse caso cada ponta avança
   * meia espessura e o vão APARENTE passa a ser `gap - espessura`.
   */
  strokeLinecap?: 'round' | 'butt';
}

/**
 * `gap` padrão — 3 unidades, o mesmo vão que os cards do Dashboard sempre
 * usaram.
 */
const GAP_PADRAO = 3;

export function AnelDonut({
  segments,
  center,
  radius,
  strokeWidth,
  gap = GAP_PADRAO,
  duracao,
  atraso,
  passo,
  curva,
  emVista,
  reduzido = false,
  strokeLinecap = 'round',
}: AnelDonutProps) {
  const total = segments.reduce((soma, segmento) => soma + segmento.value, 0);
  if (total <= 0 || radius <= 0) return null;

  const circunferencia = 2 * Math.PI * radius;
  const vao = segments.length > 1 ? gap : 0;

  // Comprimento de cada segmento e deslocamento ACUMULADO (sem mutação durante
  // o render — o mesmo cálculo que o DonutChart sempre fez).
  const comprimentos = segments.map((segmento) => (segmento.value / total) * circunferencia);
  const desenhos = segments.map((segmento, indice) => {
    const comprimento = comprimentos[indice];
    const acumulado = comprimentos.slice(0, indice).reduce((soma, valor) => soma + valor, 0);
    return {
      ...segmento,
      comprimento,
      // Traçado final do segmento (o "vazio" completa a volta) e a posição
      // dele no anel — começando no topo (`+ circunferência * 0.25`).
      dashArray: `${Math.max(comprimento - vao, 0)} ${circunferencia - comprimento + vao}`,
      deslocamento: -acumulado + circunferencia * 0.25,
    };
  });

  return (
    <>
      {desenhos.map((desenho, indice) => {
        // Segmento ZERADO não gera traço: com `stroke-linecap="round"` um dash
        // de comprimento 0 ainda pintaria um PONTO no anel (o "pontinho" da
        // fatia de 0%). O `indice` original é preservado (o stagger não muda).
        if (desenho.comprimento <= 0) return null;

        return (
          <motion.circle
            key={`${desenho.label}-${indice}`}
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={desenho.color}
            strokeWidth={strokeWidth}
            strokeDashoffset={desenho.deslocamento}
            strokeLinecap={strokeLinecap}
            {...propsArcoDonut({
              indice,
              comprimento: circunferencia,
              dashArrayFinal: desenho.dashArray,
              emVista,
              reduzido,
              duracao,
              atraso,
              passo,
              curva,
            })}
          />
        );
      })}
    </>
  );
}
