import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, Clock, AlertTriangle, HardHat, TrendingUp, ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from '@/contexts';

interface SSTKPIsProps {
  validos: number;
  vencendo: number;
  vencidos: number;
  totalEpis: number;
  totalEntregas: number;
}

export function SSTKPIs({ validos, vencendo, vencidos, totalEpis, totalEntregas }: SSTKPIsProps) {
  const { empresaAtual } = useEmpresa();
  
  const { data: incidentesMes = 0 } = useQuery({
    queryKey: ['sst_kpi_incidentes', empresaAtual?.id],
    enabled: !!empresaAtual?.id,
    queryFn: async () => {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0,0,0,0);
      
      const { count, error } = await supabase
        .from('sst_incidentes')
        .select('*', { count: 'exact', head: true })
        .eq('empresa_id', empresaAtual!.id)
        .gte('data_hora', startOfMonth.toISOString());
      
      if (error) throw error;
      return count || 0;
    }
  });

  const totalAsos = validos + vencendo + vencidos;
  const healthRate = totalAsos > 0 ? (validos / totalAsos) * 100 : 100;

  const items = [
    { label: 'ASOs Válidos', value: validos, icon: CheckCircle, gradient: 'from-green-500 to-emerald-600', shadow: 'shadow-green-100' },
    { label: 'Vencendo 30d', value: vencendo, icon: Clock, gradient: 'from-amber-400 to-orange-500', shadow: 'shadow-amber-100' },
    { label: 'Vencidos', value: vencidos, icon: AlertTriangle, gradient: 'from-red-500 to-rose-600', shadow: 'shadow-red-100' },
    { label: 'EPIs Ativos', value: totalEpis, icon: HardHat, gradient: 'from-sky-500 to-blue-600', shadow: 'shadow-blue-100' },
    { label: 'Incidentes (Mês)', value: incidentesMes, icon: ShieldAlert, gradient: 'from-indigo-500 to-violet-600', shadow: 'shadow-indigo-100' },
  ];

  return (
    <div className="space-y-6 mb-8">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {items.map(({ label, value, icon: Icon, gradient, shadow }, i) => (
          <motion.div 
            key={label} 
            initial={{ opacity: 0, scale: 0.9 }} 
            animate={{ opacity: 1, scale: 1 }} 
            transition={{ delay: i * 0.05, type: 'spring', stiffness: 100 }}
            whileHover={{ y: -5 }}
          >
            <Card className={cn("border-none overflow-hidden group cursor-default transition-all duration-300", shadow)}>
              <div className={cn("h-[3px] bg-gradient-to-r", gradient)} />
              <CardContent className="p-5 flex flex-col items-center text-center">
                <div className={cn("p-3 rounded-2xl bg-gradient-to-br mb-3 group-hover:scale-110 transition-transform duration-300", gradient)}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <p className="text-2xl font-bold font-display tracking-tight">{value}</p>
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1 opacity-80">{label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="border-border/40 bg-card/60 backdrop-blur-md shadow-xs rounded-3xl overflow-hidden">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
              <div className="flex items-center gap-4 flex-1">
                <div className="p-4 bg-green-500/10 rounded-3xl">
                  <TrendingUp className="h-8 w-8 text-green-600" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-foreground">Índice de Conformidade SST</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">Métrica geral de saúde ocupacional e segurança da empresa.</p>
                </div>
              </div>
              
              <div className="flex-1 w-full max-w-md">
                <div className="flex justify-between items-end mb-2.5">
                  <span className="text-sm font-bold text-green-700">{Math.round(healthRate)}% Adequado</span>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">Meta: 95%</span>
                </div>
                <Progress value={healthRate} className="h-3 bg-green-100 rounded-full" />
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex gap-4">
                    <span className="text-[10px] flex items-center gap-1.5 font-medium text-muted-foreground">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500" /> {validos} ASOs Válidos
                    </span>
                    <span className="text-[10px] flex items-center gap-1.5 font-medium text-muted-foreground">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500" /> {vencidos} Vencidos
                    </span>
                  </div>
                  <Badge variant="outline" className="text-[9px] bg-green-50 border-green-200 text-green-700 h-5">ESTÁVEL</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
