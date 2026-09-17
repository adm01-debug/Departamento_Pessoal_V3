import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  gradient?: string;
  action?: React.ReactNode;
  className?: string;
}

export function SectionHeader({ title, subtitle, icon: Icon, gradient = 'from-primary to-primary-glow', action, className }: SectionHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn('flex items-center justify-between', className)}
    >
      <div className="flex items-center gap-3">
        <div className={cn('p-2 rounded-xl bg-gradient-to-br shadow-lg', gradient)}>
          <Icon className="h-4 w-4 text-primary-foreground" />
        </div>
        <div>
          <h2 className="text-sm font-display font-medium tracking-tight leading-snug">{title}</h2>
          {subtitle && <p className="text-caption text-muted-foreground font-body">{subtitle}</p>}
        </div>
      </div>
      {action}
    </motion.div>
  );
}
