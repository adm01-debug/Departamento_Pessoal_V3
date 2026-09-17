import { motion, useInView } from 'framer-motion';
import { useRef, useMemo } from 'react';

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
}

export function DonutChart({ segments, size = 140, strokeWidth = 16, className, showLegend = true }: DonutChartProps) {
  const ref = useRef<SVGSVGElement>(null);
  const isInView = useInView(ref, { once: true });

  const total = segments.reduce((sum, s) => sum + s.value, 0);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  // Hook sempre chamado (antes de qualquer early return) e sem mutação durante o render.
  const segmentsWithOffsets = useMemo(() => {
    if (total <= 0) return [];
    const lengths = segments.map((seg) => (seg.value / total) * circumference);
    return segments.map((seg, i) => ({
      ...seg,
      segLength: lengths[i],
      offset: lengths.slice(0, i).reduce((acc, len) => acc + len, 0),
    }));
  }, [segments, total, circumference]);

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
        {segmentsWithOffsets.map((seg: any, i: number) => {
          const gap = segments.length > 1 ? 3 : 0;
          const dashArray = `${Math.max(seg.segLength - gap, 0)} ${circumference - seg.segLength + gap}`;
          const strokeOffset = -seg.offset + circumference * 0.25; // start from top

          return (
            <motion.circle
              key={i}
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={strokeWidth}
              strokeDashoffset={strokeOffset}
              strokeLinecap="round"
              // Traçado progressivo por segmento: anima o próprio `strokeDasharray`
              // de "nada desenhado" (`0 circunferência`) até o valor final que já
              // era estático (`dashArray`) — o `strokeDashoffset` (posição/rotação
              // do segmento no anel) não muda, só o quanto dele já foi "desenhado".
              // Framer Motion interpola os dois números do valor complexo
              // (mesmo mecanismo usado por `boxShadow`/`clipPath`), sem precisar
              // de useMotionValue/useTransform.
              //
              // `animate` sempre inclui `strokeDasharray` (nunca um objeto vazio
              // `{}`): deixamos a chave "sem gerenciar" enquanto `!isInView`
              // (primeiro render, antes do IntersectionObserver disparar) fazia
              // o Framer Motion pular a aplicação síncrona do `initial` para esse
              // atributo — o círculo ficava um instante sem `stroke-dasharray`
              // nenhum, e o navegador desenha isso como traço sólido ao redor do
              // círculo inteiro (um "flash" visível antes do traçado começar).
              initial={{ strokeDasharray: `0 ${circumference}` }}
              animate={{ strokeDasharray: isInView ? dashArray : `0 ${circumference}` }}
              transition={{ duration: 0.6, delay: 0.2 + i * 0.15, ease: 'easeOut' }}
            />
          );
        })}
        {/* Center text — `dominantBaseline="central"` centraliza cada linha
            verticalmente no seu próprio `y` (texto SVG por padrão usa a
            baseline alfabética, não o centro do glifo, o que deixava o bloco
            "42 / Total" visivelmente deslocado do centro real do gráfico).
            Fonte um pouco maior (`text-xl`→`text-2xl`) para ficar
            proporcional ao tamanho do gráfico. */}
        <text x={center} y={center - 8} textAnchor="middle" dominantBaseline="central" className="fill-foreground text-data text-xl">{total}</text>
        <text x={center} y={center + 11} textAnchor="middle" dominantBaseline="central" className="fill-muted-foreground text-caption">Total</text>
      </svg>

      {/* Legend */}
      {showLegend && (
      <div className="mt-3 space-y-1.5">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-2 text-caption">
            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: seg.color }} />
            <span className="flex-1 text-muted-foreground font-body truncate">{seg.label}</span>
            <span className="font-display font-medium">{seg.value}</span>
          </div>
        ))}
      </div>
      )}
    </div>
  );
}
