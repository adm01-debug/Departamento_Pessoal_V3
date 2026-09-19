import { Users, Clock, LogOut, CalendarDays, AlertTriangle, type LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { StatCardSkeleton } from '@/components/ui/module-skeleton';
// Mesma animação de entrada dos cards do Dashboard principal (fade + subida
// + stagger por índice) — ver `components/dashboard/MetricCard.tsx`.
// Reaproveitar o `cardVariants` de lá (em vez de duplicar os números) garante
// que as duas telas fiquem literalmente com a mesma animação, não uma cópia
// aproximada.
import { cardVariants } from '@/components/dashboard/MetricCard';

interface StatusOption {
  value: string;
  label: string;
}

interface ColaboradorKpiCardsProps {
  statusOptions: StatusOption[];
  activeStatus: string;
  onToggle: (status: string) => void;
  summary?: Record<string, number> | null;
  isLoading: boolean;
}

// Ícone + cor semântica por status — mesmas cores do enum `status_colaborador`
// usadas em ColaboradorStatus/StatusBadge, só aplicadas aqui ao ícone do KPI.
const STATUS_ICON: Record<string, { icon: LucideIcon; tone: string }> = {
  ativo: { icon: Users, tone: 'bg-success/10 text-success' },
  pendente: { icon: Clock, tone: 'bg-warning/10 text-warning' },
  desligado: { icon: LogOut, tone: 'bg-destructive/10 text-destructive' },
  ferias: { icon: CalendarDays, tone: 'bg-info/10 text-info' },
  afastado: { icon: AlertTriangle, tone: 'bg-warning/10 text-warning' },
};
const DEFAULT_STATUS_ICON = { icon: Users, tone: 'bg-muted/40 text-muted-foreground' };

// Mesmos 5 KPIs de sempre (Ativos/Pendentes/Desligados/Em Férias/Afastados),
// clicáveis para filtrar — o percentual em relação ao total é calculado a
// partir do summary existente (nenhum número novo).
//
// Diagramação (padding, ícone circular h-9, tamanho/peso de fonte do label e
// do valor) copiada do `MetricCard` do Dashboard principal
// (`components/dashboard/MetricCard.tsx`) para os cards terem exatamente a
// mesma altura — só o indicador de filtro ativo (borda/fundo `primary`) é
// específico desta tela.
export function ColaboradorKpiCards({ statusOptions, activeStatus, onToggle, summary, isLoading }: ColaboradorKpiCardsProps) {
  const total = summary?.total || 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
      {statusOptions.map((opt, i) => {
        const isActive = activeStatus === opt.value;

        if (!summary && isLoading) return <StatCardSkeleton key={opt.value} />;

        const count = summary ? summary[opt.value] || 0 : 0;
        const percent = total > 0 ? Math.round((count / total) * 100) : 0;
        const { icon: Icon, tone } = STATUS_ICON[opt.value] || DEFAULT_STATUS_ICON;

        return (
          <motion.button
            key={opt.value}
            type="button"
            custom={i}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            whileHover={{ y: -2, transition: { duration: 0.2 } }}
            onClick={() => onToggle(opt.value)}
            className={cn(
              'rounded-2xl border overflow-hidden text-left h-full transition-colors',
              isActive
                ? 'border-primary bg-primary/5 shadow-xs'
                : 'border-border/30 bg-card/50 hover:border-primary/20 hover:bg-card'
            )}
          >
            <div className="flex h-full items-center gap-2.5 p-3">
              <div className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-full', tone)}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-normal tracking-wide leading-snug text-muted-foreground truncate">{opt.label}</p>
                <p className={cn('text-2xl font-display font-medium leading-none mt-1.5 truncate', isActive ? 'text-primary' : 'text-foreground')}>
                  {count}
                </p>
                <p className="text-xs text-muted-foreground mt-1 truncate">{percent}% do total</p>
              </div>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
