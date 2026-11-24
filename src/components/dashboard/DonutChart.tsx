import { useInView, type Transition } from 'framer-motion';
import { useRef } from 'react';
import { useMovimentoReduzido } from '@/lib/motionMode';
import { AnelDonut } from './anelDonut';

interface Segment {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  segments: Segment[];
  size?: number;
  strokeWidth?: number;
  className?: string;
  /** Legenda abaixo do gráfico. Desligue quando a lista for renderizada ao lado. */
  showLegend?: boolean;
  /**
   * Formatação dos números do gráfico (centro e legenda). Sem esta prop o
   * comportamento é o histórico: o número cru (`String`). Passar `formatCurrency`
   * permite o mesmo donut servir a contagens (Dashboard Executivo) e a valores
   * monetários (Resumo Financeiro de Pagamentos) sem duplicar o componente.
   */
  formatValue?: (valor: number) => string;
  /** Classes do valor central (para o valor monetário caber no anel). */
  centerClassName?: string;
  /**
   * Duração do traçado de CADA segmento, em segundos (default 0.6 — a régua
   * histórica do Dashboard Executivo). Quem precisa de um desenho mais lento
   * (ex.: Resumo Financeiro de Pagamentos) informa o próprio valor.
   */
  animationDuration?: number;
  /** Atraso antes do primeiro segmento, em segundos (default 0.2). */
  animationDelay?: number;
  /** Intervalo entre o início dos segmentos, em segundos (default 0.15). */
  segmentStagger?: number;
  /** Curva do traçado (default `'easeOut'`). */
  animationEase?: Transition['ease'];
}

export function DonutChart({
  segments,
  size = 140,
  strokeWidth = 16,
  className,
  showLegend = true,
  formatValue,
  centerClassName,
  animationDuration = 0.6,
  animationDelay = 0.2,
  segmentStagger = 0.15,
  animationEase = 'easeOut',
}: DonutChartProps) {
  const ref = useRef<SVGSVGElement>(null);
  const isInView = useInView(ref, { once: true });
  // Movimento reduzido: o traçado aparece pronto (sem desenho animado) — o
  // restante da tela continua com o fade normal do MotionConfig.
  const reduzirMovimento = useMovimentoReduzido();

  const total = segments.reduce((sum, s) => sum + s.value, 0);

  const radius = (size - strokeWidth) / 2;
  const center = size / 2;

  if (total === 0) return null;

  return (
    <div className={className}>
      <svg ref={ref} width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
          opacity={0.3}
        />
        {/* Traçado progressivo por segmento — MECÂNICA ÚNICA do sistema
            (`dashboard/anelDonut.tsx` + `arcoDonutMotion.ts`): o
            `strokeDasharray` vai de "nada desenhado" até o valor final que já
            era estático; o `strokeDashoffset` (posição/rotação do segmento no
            anel) não muda, só o quanto dele já foi desenhado. O MESMO anel
            desenha a rosca "Distribuição de Status" do Controle de Ponto, então
            as duas não podem divergir.

            O traçado começa quando o gráfico entra na viewport. O gate de CICLO
            DE VIDA (fim do loading dos dados) é do CONSUMIDOR: quem depende de
            requisição só monta este componente depois do `fetch` resolver
            (renderização condicional estrita). Montado ⇒ o arco desenha inteiro
            a partir de "nada desenhado"; como o elemento não existia antes dos
            dados, nada é "gasto" prematuramente. */}
        <AnelDonut
          segments={segments}
          center={center}
          radius={radius}
          strokeWidth={strokeWidth}
          gap={3}
          emVista={isInView}
          reduzido={reduzirMovimento}
          duracao={animationDuration}
          atraso={animationDelay}
          passo={segmentStagger}
          curva={animationEase}
        />
        {/* Center text — `dominantBaseline="central"` centraliza cada linha
            verticalmente no seu próprio `y` (texto SVG por padrão usa a
            baseline alfabética, não o centro do glifo, o que deixava o bloco
            "42 / Total" visivelmente deslocado do centro real do gráfico).
            Fonte um pouco maior (`text-xl`→`text-2xl`) para ficar
            proporcional ao tamanho do gráfico. */}
        <text
          x={center}
          y={center - 8}
          textAnchor="middle"
          dominantBaseline="central"
          className={centerClassName ?? 'fill-foreground text-data text-xl'}
        >
          {formatValue ? formatValue(total) : total}
        </text>
        <text
          x={center}
          y={center + 11}
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-muted-foreground text-caption"
        >
          Total
        </text>
      </svg>

      {/* Legend */}
      {showLegend && (
        <div className="mt-3 space-y-1.5">
          {segments.map((seg, i) => (
            <div key={i} className="flex items-center gap-2 text-caption">
              <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: seg.color }} />
              <span className="flex-1 text-muted-foreground font-body truncate">{seg.label}</span>
              <span className="font-display font-medium">{formatValue ? formatValue(seg.value) : seg.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
