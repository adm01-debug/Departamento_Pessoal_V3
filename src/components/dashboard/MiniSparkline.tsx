import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

interface MiniSparklineProps {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
  className?: string;
  /** Espessura do traço — padrão 1.5 (histórico), aumentar para dar mais destaque em cards maiores. */
  strokeWidth?: number;
  /** Opacidade do topo do degradê da área abaixo da linha — padrão 0.2 (histórico), aumentar para um preenchimento mais visível. */
  fillOpacity?: number;
}

export function MiniSparkline({
  data,
  color = 'hsl(var(--primary))',
  width = 80,
  height = 28,
  className,
  strokeWidth = 1.5,
  fillOpacity = 0.2,
}: MiniSparklineProps) {
  const ref = useRef<SVGSVGElement>(null);
  const isInView = useInView(ref, { once: true });

  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const padding = 2;

  const points = data.map((v, i) => {
    const x = padding + (i / (data.length - 1)) * (width - padding * 2);
    const y = height - padding - ((v - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  }).join(' ');

  const areaPoints = `${padding},${height - padding} ${points} ${width - padding},${height - padding}`;

  return (
    <svg ref={ref} width={width} height={height} className={className} viewBox={`0 0 ${width} ${height}`}>
      <defs>
        <linearGradient id={`spark-fill-${color.replace(/[^a-z0-9]/gi, '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={fillOpacity} />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {isInView && (
        <>
          <motion.polygon
            points={areaPoints}
            fill={`url(#spark-fill-${color.replace(/[^a-z0-9]/gi, '')})`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          />
          <motion.polyline
            points={points}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </>
      )}
    </svg>
  );
}
