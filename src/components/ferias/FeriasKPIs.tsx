import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { Calendar, Clock, CheckCircle, DollarSign, AlertTriangle, TrendingUp } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface FeriasStats {
  total: number;
  pendentes: number;
  aprovadas: number;
  emGozo: number;
  abonoPecuniario: number;
  vencidas: number;
}

const kpiConfig = [
  { key: 'total', label: 'Total', icon: Calendar, color: 'text-primary', bgColor: 'bg-primary/5', tooltip: 'Total de solicitações de férias no período' },
  { key: 'pendentes', label: 'Pendentes', icon: Clock, color: 'text-amber-500', bgColor: 'bg-amber-500/5', tooltip: 'Aguardando aprovação no workflow' },
  { key: 'aprovadas', label: 'Aprovadas', icon: CheckCircle, color: 'text-emerald-500', bgColor: 'bg-emerald-500/5', tooltip: 'Aprovadas pelo RH ou gestor' },
  { key: 'emGozo', label: 'Em Gozo', icon: TrendingUp, color: 'text-sky-500', bgColor: 'bg-sky-500/5', tooltip: 'Colaboradores atualmente em férias' },
  { key: 'abonoPecuniario', label: 'Abono', icon: DollarSign, color: 'text-purple-500', bgColor: 'bg-purple-500/5', tooltip: 'Solicitações com venda de até 1/3 das férias' },
  { key: 'vencidas', label: 'Vencidas', icon: AlertTriangle, color: 'text-rose-500', bgColor: 'bg-rose-500/5', tooltip: 'Períodos concessivos vencidos — ação urgente' },
] as const;

export function FeriasKPIs({ stats }: { stats: FeriasStats }) {
  return (
    <TooltipProvider>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {kpiConfig.map(({ key, label, icon: Icon, color, bgColor, tooltip }, i) => (
          <motion.div
            key={key}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.4 }}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <Card className="group border border-border/40 shadow-xs rounded-2xl hover:shadow-md hover:border-primary/20 transition-all duration-300 cursor-default overflow-hidden">
                  <CardContent className="p-5 flex flex-col items-center text-center gap-3">
                    <div className={cn("p-3 rounded-2xl transition-transform duration-300 group-hover:scale-110", bgColor)}>
                      <Icon className={cn("h-5 w-5", color)} />
                    </div>
                    <div className="space-y-1">
                      <p className="text-2xl font-display font-semibold tracking-tight">{stats[key as keyof FeriasStats]}</p>
                      <p className="text-[10px] text-muted-foreground font-display uppercase tracking-widest">{label}</p>
                    </div>
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="bg-popover/95 backdrop-blur-xs border-border/40"><p className="text-xs font-body max-w-[180px]">{tooltip}</p></TooltipContent>
            </Tooltip>
          </motion.div>
        ))}
      </div>
    </TooltipProvider>
  );
}
