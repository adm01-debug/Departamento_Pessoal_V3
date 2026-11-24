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
  /** `compact` — mesma leitura em altura reduzida, para a faixa inferior do Dashboard. */
  variant?: 'default' | 'compact';
  /** Sem `Card`/decoração própria e anel menor — para compor dentro de outro
      card (usado por `SaudeResumoCard`, que funde Saúde RH + Resumo
      Operacional numa única coluna, seguindo a composição de 3 colunas do
      preview de referência). */
  bare?: boolean;
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

export function WorkforceHealthScore({ turnover, absenteismo, cadastrosCompletos, totalColaboradores, feriasPendentes, passivoTotal = 0, variant = 'default', bare = false }: WorkforceHealthScoreProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });
  const navigate = useNavigate();
  const isCompact = variant === 'compact';

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

  // Arc drawing — anel compacto num tamanho confortável de leitura, não mais
  // o mínimo forçado pela antiga altura travada à viewport. `bare` usa um
  // anel bem menor: divide a coluna com o Resumo Operacional (ver
  // `SaudeResumoCard`), então precisa de bem menos altura que o `compact`
  // original (que ocupava a coluna inteira sozinho).
  const size = bare ? 76 : isCompact ? 140 : 160;
  const strokeWidth = bare ? 7 : isCompact ? 11 : 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const arcLength = (compositeScore / 100) * circumference * 0.75; // 270 degree arc
  const center = size / 2;

  const body = (
    <div className={cn('flex items-center gap-4', !bare && 'flex-col sm:flex-row gap-6', isCompact && !bare && 'w-full gap-5')}>
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
            className={cn('font-display font-medium', bare ? 'text-base' : 'text-2xl', scoreInfo.color)}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ delay: 0.5, type: 'spring', bounce: 0.4 }}
          >
            {compositeScore}
          </motion.span>
          {!bare && <span className="text-[10px] text-muted-foreground font-body uppercase tracking-wider">de 100</span>}
        </div>
      </div>

      {/* Details */}
      <div className={cn('flex-1 space-y-3 w-full min-w-0', isCompact && 'space-y-3', bare && 'space-y-2')}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {!bare && <Shield className={cn("h-5 w-5 shrink-0", scoreInfo.color)} />}
            {/* Sem `cn()`: `text-h3` disputava o mesmo grupo de conflito do
                tailwind-merge que `scoreInfo.color` e era descartado — o
                título renderizava no tamanho padrão do navegador (16px)
                sem a cor de status (verde/âmbar/vermelho). */}
            <span className={`${bare ? 'text-caption' : 'text-h3'} font-display font-medium truncate ${scoreInfo.color}`}>{scoreInfo.label}</span>
          </div>
          <Badge variant="outline" className="shrink-0 text-[10px] font-medium border-primary/20 bg-primary/5">Saúde RH</Badge>
        </div>
        {/* Sem parágrafo de descrição nem grade de métricas no modo `bare`:
            a coluna é compartilhada com o Resumo Operacional abaixo — só o
            essencial (anel + rótulo) cabe sem sobrar vazio nem espremer o
            resto. */}
        {!bare && (
          <p className={cn(
            'text-caption text-muted-foreground font-body leading-relaxed',
            isCompact && 'text-overline normal-case tracking-normal',
          )}>
            Resumo automatizado da conformidade do RH. Considera turnover, absenteísmo e integridade de dados.
          </p>
        )}

        {/* Metric breakdown — coluna única no modo compacto: a grade de 2
            colunas dividia a largura já estreita da coluna de detalhes
            pela metade, cortando rótulos como "Absenteísmo" em "A...". */}
        {!bare && (
          <div className={cn('grid gap-2.5', isCompact ? 'grid-cols-1' : 'grid-cols-2')}>
            {metrics.map((m, i) => (
              <motion.button
                key={m.label}
                initial={{ opacity: 0, y: 5 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.8 + i * 0.1 }}
                onClick={() => navigate(m.route)}
                className="flex items-center gap-2 p-2.5 rounded-lg hover:bg-accent/50 transition-colors text-left group"
              >
                <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded", statusColors[m.status])}>
                  {m.label === 'Cadastros' ? `${m.value.toFixed(0)}%` : m.label === 'Férias' ? m.value : m.label === 'Passivo' ? (m.value > 1000 ? `${(m.value/1000).toFixed(0)}k` : m.value) : `${m.value.toFixed(1)}%`}
                </span>
                <span className="text-caption text-muted-foreground font-body flex-1 truncate">{m.label}</span>
                <ChevronRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  if (bare) {
    return <div ref={ref}>{body}</div>;
  }

  return (
    <Card ref={ref} className={cn(
      'border overflow-hidden relative',
      isCompact ? 'border-border/60 rounded-xl flex h-full min-h-[260px] flex-col' : 'border-border/30 shadow-elevated rounded-2xl',
    )}>
      <div className={cn("absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r", scoreInfo.bg.replace('/20', '').replace('/5', ''))} />
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-[0.04] pointer-events-none", scoreInfo.bg)} />
      <CardContent className={cn('relative p-6', isCompact && 'flex min-h-0 flex-1 items-center p-5')}>
        {body}
      </CardContent>
    </Card>
  );
}
