import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MotionCard, entradaCard } from '@/components/ui/entrada-cards';
import { cn } from '@/lib/utils';

/**
 * ============================================================================
 * CASCO DOS PAINÉIS DA ANALYTICS — um só desenho para todos os blocos
 *
 * Cabeçalho com ícone em chip (na cor semântica do painel), título em
 * `font-display`, subtítulo curto e ação opcional à direita. O corpo é
 * `flex-col` com `min-h-0` para que listas/gráficos possam esticar sem
 * estourar o card. A entrada é a MESMA cascata do módulo (`entradaCard`), com
 * o índice de leitura da tela.
 * ============================================================================
 */
export type TomAnalytics = 'primary' | 'info' | 'chart4' | 'success' | 'warning' | 'destructive';

const TONS: Record<TomAnalytics, { chip: string; halo: string; texto: string }> = {
  primary: { chip: 'border-primary/25 bg-primary/10 text-primary', halo: 'bg-primary/10', texto: 'text-primary' },
  info: { chip: 'border-info/25 bg-info/10 text-info', halo: 'bg-info/10', texto: 'text-info' },
  chart4: {
    chip: 'border-[hsl(var(--chart-4)/0.28)] bg-[hsl(var(--chart-4)/0.12)] text-[hsl(var(--chart-4))]',
    halo: 'bg-[hsl(var(--chart-4)/0.10)]',
    texto: 'text-[hsl(var(--chart-4))]',
  },
  success: { chip: 'border-success/25 bg-success/10 text-success', halo: 'bg-success/10', texto: 'text-success' },
  warning: { chip: 'border-warning/25 bg-warning/10 text-warning', halo: 'bg-warning/10', texto: 'text-warning' },
  destructive: {
    chip: 'border-destructive-vivid/25 bg-destructive-vivid/10 text-destructive-vivid',
    halo: 'bg-destructive-vivid/10',
    texto: 'text-destructive-vivid',
  },
};

interface AnalyticsPainelProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  /** Posição na cascata de entrada da tela. */
  index: number;
  tom?: TomAnalytics;
  className?: string;
  contentClassName?: string;
}

export function AnalyticsPainel({
  icon: Icon,
  title,
  subtitle,
  action,
  children,
  index,
  tom = 'primary',
  className,
  contentClassName,
}: AnalyticsPainelProps) {
  const tons = TONS[tom];
  return (
    <MotionCard
      {...entradaCard(index)}
      data-analytics-painel={title}
      className={cn(
        'relative flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border-border/40 bg-card/70 shadow-card',
        className
      )}
    >
      {/* Halo discreto no topo direito — profundidade sem “brilho” exagerado. */}
      <span aria-hidden className={cn('pointer-events-none absolute -right-12 -top-16 h-36 w-36 rounded-full blur-3xl', tons.halo)} />
      <CardHeader className="relative flex flex-row items-start justify-between gap-2 space-y-0 px-4 pb-2.5 pt-4">
        <div className="flex min-w-0 items-start gap-2.5">
          <span
            className={cn(
              'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border',
              tons.chip
            )}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden />
          </span>
          <div className="min-w-0">
            <CardTitle className="font-display text-[13px] font-semibold leading-tight tracking-tight">
              {title}
            </CardTitle>
            {subtitle && (
              <CardDescription className="mt-0.5 text-[10.5px] leading-snug">{subtitle}</CardDescription>
            )}
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </CardHeader>
      <CardContent className={cn('relative flex flex-1 flex-col px-4 pb-4 pt-0', contentClassName)}>
        {children}
      </CardContent>
    </MotionCard>
  );
}

/** Selo compacto de contagem usado no cabeçalho dos painéis. */
export function ChipContagem({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-border/40 bg-background/50 px-2 py-0.5 text-[10px] font-medium leading-none tabular-nums text-muted-foreground">
      {children}
    </span>
  );
}
