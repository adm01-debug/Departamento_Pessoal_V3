import { Card, CardContent } from '@/components/ui/card';
import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { cn } from '@/lib/utils';
import { Shield, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';

interface HealthMetric {
  label: string;
  value: number;
  maxValue: number;
  weight: number;
  status: 'excellent' | 'good' | 'warning' | 'critical';
  route: string;
}

interface WorkforceHealthScoreProps {
  turnover: number;
  absenteismo: number;
  cadastrosCompletos: number;
  totalColaboradores: number;
  feriasPendentes: number;
  passivoTotal?: number;
}

function getScoreColor(score: number) {
  if (score >= 85) return { label: 'Excelente', color: 'text-success', bg: 'from-success/20 to-success/5', ring: 'hsl(var(--success))' };
  if (score >= 70) return { label: 'Bom', color: 'text-primary', bg: 'from-primary/20 to-primary/5', ring: 'hsl(var(--primary))' };
  if (score >= 50) return { label: 'Atenção', color: 'text-warning', bg: 'from-warning/20 to-warning/5', ring: 'hsl(var(--warning))' };
  return { label: 'Crítico', color: 'text-destructive', bg: 'from-destructive/20 to-destructive/5', ring: 'hsl(var(--destructive))' };
}

function getMetricStatus(value: number, thresholds: [number, number, number]): 'excellent' | 'good' | 'warning' | 'critical' {
  if (value <= thresholds[0]) return 'excellent';
  if (value <= thresholds[1]) return 'good';
  if (value <= thresholds[2]) return 'warning';
  return 'critical';
}

const statusColors = {
  excellent: 'bg-success/15 text-success',
  good: 'bg-primary/15 text-primary',
  warning: 'bg-warning/15 text-warning',
  critical: 'bg-destructive/15 text-destructive'};

export function WorkforceHealthScore({ turnover, absenteismo, cadastrosCompletos, totalColaboradores, feriasPendentes, passivoTotal = 0 }: WorkforceHealthScoreProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });
  const navigate = useNavigate();

  // Calculate composite score (0-100)
  const turnoverScore = Math.max(0, 100 - (turnover * 5)); // 0% = 100, 20% = 0
  const absenteismoScore = Math.max(0, 100 - (absenteismo * 10)); // 0% = 100, 10% = 0
  const cadastroScore = totalColaboradores > 0 ? (cadastrosCompletos / totalColaboradores) * 100 : 100;
  const feriasScore = Math.max(0, 100 - (feriasPendentes * 5)); // each pending = -5
  
  // Passivo score: penalty if passivo > 1.5x monthly payroll (estimativa simplificada)
  const passivoPenalty = passivoTotal > 100000 ? 5 : 0; 

  const compositeScore = Math.round(
    (turnoverScore * 0.30) + (absenteismoScore * 0.25) + (cadastroScore * 0.20) + (feriasScore * 0.15) - passivoPenalty
  );

  const scoreInfo = getScoreColor(compositeScore);

  const metrics: HealthMetric[] = [
    { label: 'Turnover', value: turnover, maxValue: 20, weight: 35, status: getMetricStatus(turnover, [3, 8, 15]), route: '/desligamentos' },
    { label: 'Absenteísmo', value: absenteismo, maxValue: 10, weight: 30, status: getMetricStatus(absenteismo, [2, 4, 7]), route: '/faltas' },
    { label: 'Passivo', value: passivoTotal, maxValue: 1, weight: 1, status: passivoTotal > 50000 ? 'warning' : 'good', route: '/passivo-trabalhista' },
    { label: 'Férias', value: feriasPendentes, maxValue: 20, weight: 15, status: getMetricStatus(feriasPendentes, [3, 8, 15]), route: '/ferias' },
  ];

  // Arc drawing
  const size = 160;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const arcLength = (compositeScore / 100) * circumference * 0.75; // 270 degree arc
  const center = size / 2;

  return (
    <Card ref={ref} className="border border-border/30 shadow-elevated rounded-2xl overflow-hidden relative">
      <div className={cn("absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r", scoreInfo.bg.replace('/20', '').replace('/5', ''))} />
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-[0.04] pointer-events-none", scoreInfo.bg)} />

      <CardContent className="relative p-6">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* Score Ring */}
          <div className="relative shrink-0">
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-[135deg]">
              <circle
                cx={center} cy={center} r={radius}
                fill="none" stroke="hsl(var(--muted))" strokeWidth={strokeWidth}
                strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`}
                strokeLinecap="round" opacity={0.3}
              />
              <motion.circle
                cx={center} cy={center} r={radius}
                fill="none" stroke={scoreInfo.ring} strokeWidth={strokeWidth}
                strokeDasharray={`${arcLength} ${circumference - arcLength}`}
                strokeLinecap="round"
                initial={{ strokeDasharray: `0 ${circumference}` }}
                animate={isInView ? { strokeDasharray: `${arcLength} ${circumference - arcLength}` } : {}}
                transition={{ duration: 1.5, ease: [0.25, 0.46, 0.45, 0.94] }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <motion.span
                className={cn("text-3xl font-display font-bold", scoreInfo.color)}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={isInView ? { opacity: 1, scale: 1 } : {}}
                transition={{ delay: 0.5, type: 'spring', bounce: 0.4 }}
              >
                {compositeScore}
              </motion.span>
              <span className="text-[10px] text-muted-foreground font-body uppercase tracking-wider">de 100</span>
            </div>
          </div>

          {/* Details */}
          <div className="flex-1 space-y-3 w-full">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className={cn("h-5 w-5", scoreInfo.color)} />
                <span className={cn("text-h3 font-display font-bold", scoreInfo.color)}>{scoreInfo.label}</span>
              </div>
              <Badge variant="outline" className="text-[10px] font-bold border-primary/20 bg-primary/5">Saúde RH</Badge>
            </div>
            <p className="text-caption text-muted-foreground font-body leading-relaxed">
              Resumo automatizado da conformidade do RH. Considera turnover, absenteísmo e integridade de dados.
            </p>

            {/* Metric breakdown */}
            <div className="grid grid-cols-2 gap-2">
              {metrics.map((m, i) => (
                <motion.button
                  key={m.label}
                  initial={{ opacity: 0, y: 5 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ delay: 0.8 + i * 0.1 }}
                  onClick={() => navigate(m.route)}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent/50 transition-colors text-left group"
                >
                  <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded", statusColors[m.status])}>
                    {m.label === 'Cadastros' ? `${m.value.toFixed(0)}%` : m.label === 'Férias' ? m.value : m.label === 'Passivo' ? (m.value > 1000 ? `${(m.value/1000).toFixed(0)}k` : m.value) : `${m.value.toFixed(1)}%`}
                  </span>
                  <span className="text-caption text-muted-foreground font-body flex-1 truncate">{m.label}</span>
                  <ChevronRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </motion.button>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
