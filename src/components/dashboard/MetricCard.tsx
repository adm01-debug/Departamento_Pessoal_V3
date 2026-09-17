import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { AnimatedNumber } from './AnimatedNumber';
import { MiniSparkline } from './MiniSparkline';
import { InfoTooltip } from '@/components/ui/info-tooltip';

const MotionCard = motion.create(Card);

// eslint-disable-next-line react-refresh/only-export-components
export const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

/**
 * Tom do ícone. Neutro por padrão (primary): vermelho fica reservado a risco e
 * âmbar a atenção — não há cor por card, como pede o design system.
 */
export type MetricTone = 'primary' | 'warning' | 'destructive' | 'muted' | 'info' | 'accent';

const toneStyles: Record<MetricTone, string> = {
  primary: 'bg-primary/10 text-primary',
  warning: 'bg-warning/10 text-warning',
  destructive: 'bg-destructive/10 text-destructive',
  muted: 'bg-muted text-muted-foreground',
  info: 'bg-info/10 text-info',
  accent: 'bg-xp/10 text-xp',
};

interface MetricCardProps {
  title: string;
  value: string | number;
  rawValue?: number;
  icon: React.ElementType;
  trend?: { value: number; label: string };
  description?: string;
  /** @deprecated Mantido por compatibilidade — o KPI usa `tone`. */
  gradient?: string;
  tone?: MetricTone;
  sparkline?: number[];
  index?: number;
  formatFn?: (n: number) => string;
  /** Destino ao clicar. Sem valor, cai no mapa por título; sem match, o card não navega. */
  route?: string;
  /** Texto explicativo do KPI, exibido num ícone `[i]` ao lado do título. */
  tooltip?: string;
}

const defaultRoutes: Record<string, string> = {
  'Colaboradores Ativos': '/colaboradores',
  'Folha Mensal': '/folha',
  'Férias Pendentes': '/ferias',
  'Banco de Horas': '/ponto',
};

export function MetricCard({
  title, value, rawValue, icon: Icon, trend, description, tone = 'primary', sparkline, index = 0, formatFn, route, tooltip,
}: MetricCardProps) {
  const isPositive = trend && trend.value >= 0;
  const target = route ?? defaultRoutes[title];

  return (
    <MotionCard
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className={cn(
        'group relative h-full overflow-hidden border border-border/60 hover:border-primary/40',
        'transition-all duration-500 rounded-xl',
        target && 'cursor-pointer',
      )}
      onClick={() => { if (target) window.location.assign(target); }}
    >
      <CardContent className="relative flex h-full items-center gap-2.5 p-3">
        <div className={cn(
          'grid h-9 w-9 shrink-0 place-items-center rounded-full transition-transform duration-300 group-hover:scale-105',
          toneStyles[tone],
        )}>
          <Icon className="h-4 w-4" />
        </div>

        <div className="min-w-0 flex-1">
          {/* `normal-case tracking-normal`: a referência usa o título em caixa
              de frase, não versalete — e a versão maiúscula+tracking largo
              cortava títulos como "Colaboradores Ativos" antes do fim. */}
          <p className="flex items-center gap-1 text-xs font-normal tracking-wide leading-snug text-muted-foreground normal-case truncate">
            <span className="truncate">{title}</span>
            {tooltip && (
              <span onClick={(e) => e.stopPropagation()}>
                <InfoTooltip content={tooltip} />
              </span>
            )}
          </p>
          <div className="text-data truncate mt-1.5">
            {rawValue !== undefined ? (
              <AnimatedNumber
                value={rawValue}
                format={formatFn || (typeof value === 'string' && value.includes('R$') ? (n) => formatCurrency(n) : undefined)}
              />
            ) : (
              value
            )}
          </div>
          {(description || trend) && (
            <div className="flex items-center gap-1.5 mt-1 min-w-0">
              {trend && (
                // Sem `cn()`: combinada com `text-success`/`text-destructive` na
                // mesma chamada, o tailwind-merge derrubava `text-overline` e o
                // selo de tendência renderizava no tamanho padrão do navegador
                // (16px) em vez do token de 10px.
                <span className={`inline-flex items-center gap-0.5 text-xs font-medium tracking-normal leading-snug shrink-0 ${isPositive ? 'text-success' : 'text-destructive'}`}>
                  {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {Math.abs(trend.value)}%
                </span>
              )}
              <span className="text-xs font-normal tracking-wide leading-snug text-muted-foreground truncate normal-case">
                {description || trend?.label}
              </span>
            </div>
          )}
        </div>

        {sparkline && sparkline.length > 0 && (
          <MiniSparkline data={sparkline} className="opacity-60 group-hover:opacity-100 transition-opacity shrink-0" />
        )}
      </CardContent>
    </MotionCard>
  );
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency", currency: "BRL",
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(value);
}
