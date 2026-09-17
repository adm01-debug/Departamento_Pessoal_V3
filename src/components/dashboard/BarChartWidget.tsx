import { memo } from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface BarChartData {
  label: string;
  value: number;
  color?: string;
}

interface BarChartWidgetProps {
  data: BarChartData[];
  maxValue?: number;
  height?: number;
  showValues?: boolean;
  className?: string;
}

export const BarChartWidget = memo(function BarChartWidget({
  data,
  maxValue: customMax,
  height = 120,
  showValues = true,
  className,
}: BarChartWidgetProps) {
  const max = customMax || Math.max(...data.map(d => d.value), 1);

  return (
    <div className={cn('flex items-end gap-2', className)} style={{ height }}>
      {data.map((item, i) => {
        const barHeight = (item.value / max) * 100;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group">
            {showValues && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 + i * 0.05 }}
                className="text-[10px] font-medium font-display text-muted-foreground group-hover:text-foreground transition-colors"
              >
                {item.value}
              </motion.span>
            )}
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${barHeight}%` }}
              transition={{ duration: 0.6, delay: i * 0.08, ease: [0.25, 0.46, 0.45, 0.94] }}
              className={cn(
                'w-full rounded-t-lg min-h-[4px] transition-all duration-200 group-hover:opacity-100',
                item.color || 'bg-gradient-to-t from-primary to-primary-glow',
                'opacity-80 group-hover:shadow-glow-sm'
              )}
            />
            <span className="text-[9px] text-muted-foreground font-body truncate w-full text-center">
              {item.label}
            </span>
          </div>
        );
      })}
    </div>
  );
});
