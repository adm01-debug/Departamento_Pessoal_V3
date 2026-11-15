import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { AnimatedNumber } from './AnimatedNumber';
import { MiniSparkline } from './MiniSparkline';

const MotionCard = motion.create(Card);

// cardVariants exportado para a área Avaliação (W1) usar a mesma coreografia
// de entrada dos KPI cards; fast-refresh só se aplica a componentes, não a const.
// eslint-disable-next-line react-refresh/only-export-components
export const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

interface MetricCardProps {
  title: string;
  value: string | number;
  rawValue?: number;
  icon: React.ElementType;
  trend?: { value: number; label: string };
  description?: string;
  gradient: string;
  sparkline?: number[];
  index?: number;
  formatFn?: (n: number) => string;
}

export function MetricCard({
  title,
  value,
  rawValue,
  icon: Icon,
  trend,
  description,
  gradient,
  sparkline,
  index = 0,
  formatFn,
}: MetricCardProps) {
  const isPositive = trend && trend.value >= 0;

  return (
    <MotionCard
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className="group relative overflow-hidden border border-border/30 hover:border-primary/40 shadow-elevated hover:shadow-glow transition-all duration-500 rounded-2xl cursor-pointer"
      onClick={() => {
        const routes: Record<string, string> = {
          'Colaboradores Ativos': '/colaboradores',
          'Folha Mensal': '/folha',
          'Férias Pendentes': '/ferias',
          'Banco de Horas': '/ponto',
        };
        const path = routes[title];
        if (path) window.location.assign(path);
      }}
    >
      <div
        className={cn(
          'absolute inset-0 opacity-[0.06] group-hover:opacity-[0.12] transition-opacity duration-500 bg-gradient-to-br',
          gradient
        )}
      />
      <div className={cn('absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r', gradient)} />

      <CardContent className="relative p-card-space">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <p className="text-overline text-muted-foreground">{title}</p>
            <div className="text-display font-display font-bold tracking-tight">
              {rawValue !== undefined ? (
                <AnimatedNumber
                  value={rawValue}
                  format={
                    formatFn ||
                    (typeof value === 'string' && value.includes('R$') ? (n) => formatCurrency(n) : undefined)
                  }
                />
              ) : (
                value
              )}
            </div>
            {(description || trend) && (
              <div className="flex items-center gap-1.5 text-caption">
                {trend && (
                  <span
                    className={cn(
                      'inline-flex items-center gap-0.5 font-semibold px-2 py-0.5 rounded-full',
                      isPositive ? 'bg-success/15 text-success' : 'bg-destructive/15 text-destructive'
                    )}
                  >
                    {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                    {Math.abs(trend.value)}%
                  </span>
                )}
                <span className="text-muted-foreground font-body">{description || trend?.label}</span>
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <div
              className={cn(
                'p-3 rounded-2xl bg-gradient-to-br shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:shadow-glow',
                gradient
              )}
            >
              <Icon className="h-5 w-5 text-primary-foreground" />
            </div>
            {sparkline && sparkline.length > 0 && (
              <MiniSparkline data={sparkline} className="opacity-60 group-hover:opacity-100 transition-opacity" />
            )}
          </div>
        </div>
      </CardContent>
    </MotionCard>
  );
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}
