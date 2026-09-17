// V15-182: src/components/ui/stat-card.tsx
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
  trend?: { value: number; label?: string };
  className?: string;
}

export function StatCard({ title, value, description, icon: Icon, trend, className }: StatCardProps) {
  const isPositive = trend && trend.value >= 0;
  return (
    <Card className={cn(className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xs font-normal tracking-wide leading-snug text-muted-foreground">{title}</CardTitle>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-medium tracking-tight leading-none">{value}</div>
        {(description || trend) && (
          <div className="flex items-center gap-1 text-xs font-normal tracking-wide leading-snug text-muted-foreground mt-1">
            {trend && (
            <span className={cn('flex items-center font-medium', isPositive ? 'text-success' : 'text-destructive')}>
              {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {Math.abs(trend.value)}%
              </span>
            )}
            {description || trend?.label}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
