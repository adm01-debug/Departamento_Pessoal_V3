import { Card, CardContent } from '@/components/ui/card';
import { UserMinus, Clock, DollarSign, TrendingDown, BarChart3 } from 'lucide-react';
import { motion } from 'framer-motion';

interface KPIProps {
  desligamentos: any[];
}

export function DesligamentoKPIs({ desligamentos }: KPIProps) {
  const total = desligamentos.length;
  const pendentes = desligamentos.filter((d) => d.status === 'pendente' || d.status === 'em_andamento').length;
  const concluidos = desligamentos.filter((d) => d.status === 'concluido' || d.status === 'finalizado').length;
  const valorTotal = desligamentos.reduce((acc: number, d: any) => acc + (d.valor_liquido || 0), 0);

  // Turnover rate this month
  const now = new Date();
  const thisMonth = desligamentos.filter((d: any) => {
    if (!d.data_desligamento) return false;
    const dt = new Date(d.data_desligamento);
    return dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear();
  }).length;

  const kpis = [
    { label: 'Total Desligamentos', value: total, icon: UserMinus, color: 'text-destructive', bg: 'bg-destructive/10', shadow: 'shadow-glow-warning' },
    { label: 'Pendentes', value: pendentes, icon: Clock, color: 'text-warning', bg: 'bg-warning/10', shadow: '' },
    { label: 'Concluídos', value: concluidos, icon: TrendingDown, color: 'text-success', bg: 'bg-success/10', shadow: '' },
    { label: 'Este Mês', value: thisMonth, icon: BarChart3, color: 'text-info', bg: 'bg-info/10', shadow: '' },
    { label: 'Valor Total Rescisões', value: `R$ ${valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: DollarSign, color: 'text-foreground', bg: 'bg-primary/10', shadow: '' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
      {kpis.map((kpi, i) => (
        <motion.div
          key={kpi.label}
          initial={{ opacity: 0, y: 16, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: i * 0.06, type: 'spring', stiffness: 300, damping: 24 }}
          whileHover={{ y: -2, transition: { duration: 0.2 } }}
        >
          <Card className="border-border/30 rounded-2xl hover:shadow-elevated transition-all duration-normal">
            <CardContent className="p-4 flex items-center gap-3">
              <motion.div
                className={`rounded-xl p-2.5 ${kpi.bg}`}
                whileHover={{ rotate: [0, -8, 8, 0], transition: { duration: 0.4 } }}
              >
                <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
              </motion.div>
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground font-body truncate">{kpi.label}</p>
                <p className="text-lg font-display font-semibold truncate">{kpi.value}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
