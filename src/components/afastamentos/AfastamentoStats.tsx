import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Activity, AlertTriangle, Clock, Heart, Calendar, Percent } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AfastamentoStatsProps {
  stats: {
    total: number;
    ativos: number;
    pendentes: number;
    finalizados: number;
    diasTotais: number;
  };
}

export function AfastamentoStats({ stats }: AfastamentoStatsProps) {
  const inssRatio = stats.total > 0 ? (stats.pendentes / stats.total) * 100 : 0;

  const kpis = [
    { label: 'Total Registros', value: stats.total, icon: Activity, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Em Afastamento', value: stats.ativos, icon: AlertTriangle, color: 'text-warning', bg: 'bg-warning/10' },
    { label: 'Aguardando INSS', value: stats.pendentes, icon: Clock, color: 'text-info', bg: 'bg-info/10' },
    { label: 'Concluídos', value: stats.finalizados, icon: Heart, color: 'text-success', bg: 'bg-success/10' },
    { label: 'Dias Acumulados', value: stats.diasTotais, icon: Calendar, color: 'text-destructive', bg: 'bg-destructive/10' },
  ];

  return (
    <div className="space-y-6 mb-8">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {kpis.map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className="border-none shadow-xs hover:shadow-md transition-all duration-300 rounded-2xl overflow-hidden group">
              <CardContent className="p-5 flex flex-col items-center text-center relative">
                <div className={cn("p-3 rounded-xl mb-3 transition-transform group-hover:scale-110", kpi.bg)}>
                  <kpi.icon className={cn("h-6 w-6", kpi.color)} />
                </div>
                <p className={cn("text-2xl font-display font-medium", kpi.color)}>
                  {kpi.value}
                </p>
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest mt-1">
                  {kpi.label}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="border-border/40 bg-card/50 backdrop-blur-xs shadow-xs">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  <Percent className="h-4 w-4 text-primary" />
                  <h4 className="text-sm font-medium uppercase tracking-wider text-foreground">Distribuição de Encaminhamentos</h4>
                </div>
                <p className="text-xs text-muted-foreground">
                  Proporção de colaboradores que excederam o limite de 15 dias pagos pela empresa.
                </p>
              </div>
              
              <div className="flex-1 max-w-md">
                <div className="flex justify-between text-xs mb-2 font-semibold">
                  <span className="text-muted-foreground">Empresa ({100 - Math.round(inssRatio)}%)</span>
                  <span className="text-warning">INSS ({Math.round(inssRatio)}%)</span>
                </div>
                <Progress value={inssRatio} className="h-2 bg-primary/20" />
                <div className="mt-2 flex gap-4 text-[10px] text-muted-foreground italic">
                  <span>• {stats.total - stats.pendentes} colaboradores sob custo direto</span>
                  <span>• {stats.pendentes} colaboradores encaminhados</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
