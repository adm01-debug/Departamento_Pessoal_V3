import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { motion } from 'framer-motion';
import { HardHat, Package, AlertTriangle, CheckCircle2, Clock, ShieldAlert } from 'lucide-react';

interface EpiStats {
  totalEpis: number;
  totalEntregas: number;
  categoriasCobertas: number;
  comCA: number;
  semCA: number;
  vencimentoProximo: number;
  estoqueBaixo: number;
  totalEstoque: number;
}

interface EpiKPIsProps {
  stats: EpiStats;
}

const kpis = [
  {
    key: 'totalEpis' as const,
    label: 'Modelos EPI',
    icon: HardHat,
    color: 'text-primary',
    bgColor: 'bg-primary/5',
    borderColor: 'border-primary/20',
    tooltip: 'Total de modelos de equipamentos no catálogo',
  },
  {
    key: 'totalEstoque' as const,
    label: 'Itens em Estoque',
    icon: Package,
    color: 'text-accent-foreground',
    bgColor: 'bg-accent/30',
    borderColor: 'border-accent/40',
    tooltip: 'Quantidade total de itens físicos em estoque somando todos os modelos',
  },
  {
    key: 'comCA' as const,
    label: 'Conformes (CA)',
    icon: CheckCircle2,
    color: 'text-primary',
    bgColor: 'bg-primary/5',
    borderColor: 'border-primary/20',
    tooltip: 'EPIs com Certificado de Aprovação válido (NR-6)',
  },
  {
    key: 'estoqueBaixo' as const,
    label: 'Estoque Baixo',
    icon: ShieldAlert,
    color: 'text-destructive',
    bgColor: 'bg-destructive/5',
    borderColor: 'border-destructive/20',
    tooltip: 'Modelos de EPI com estoque abaixo do mínimo configurado',
  },
  {
    key: 'vencimentoProximo' as const,
    label: 'A Substituir',
    icon: Clock,
    color: 'text-warning',
    bgColor: 'bg-warning/5',
    borderColor: 'border-warning/20',
    tooltip: 'Entregas com validade vencendo nos próximos 30 dias',
  },
  {
    key: 'semCA' as const,
    label: 'Irregulares',
    icon: AlertTriangle,
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
    borderColor: 'border-destructive/30',
    tooltip: 'EPIs sem CA — não conformidade NR-6',
  },
];

export function EpiKPIs({ stats }: EpiKPIsProps) {
  return (
    <TooltipProvider>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {kpis.map((kpi, i) => {
          const Icon = kpi.icon;
          const value = stats[kpi.key];
          return (
            <Tooltip key={kpi.key}>
              <TooltipTrigger asChild>
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.3 }}
                >
                  <Card className={`border ${kpi.borderColor} ${kpi.bgColor} shadow-xs rounded-2xl cursor-default hover:shadow-md transition-shadow`}>
                    <CardContent className="pt-4 pb-3 px-4">
                      <div className="flex items-center justify-between mb-2">
                        <Icon className={`h-4 w-4 ${kpi.color}`} />
                        {(kpi.key === 'semCA' || kpi.key === 'estoqueBaixo') && value > 0 && (
                          <span className="flex h-2 w-2 rounded-full bg-destructive animate-pulse" />
                        )}
                        {kpi.key === 'vencimentoProximo' && value > 0 && (
                          <span className="flex h-2 w-2 rounded-full bg-warning animate-pulse" />
                        )}
                      </div>
                      <p className="text-2xl font-display font-semibold tracking-tight">{value}</p>
                      <p className="text-xs text-muted-foreground font-body mt-0.5">{kpi.label}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[220px] text-xs">
                {kpi.tooltip}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>

      {stats.semCA > 0 && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-4 flex items-center gap-3 p-3 rounded-xl bg-destructive/5 border border-destructive/20 text-sm"
        >
          <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
          <span className="text-foreground font-body">
            <strong>{stats.semCA}</strong> EPI{stats.semCA > 1 ? 's' : ''} sem Certificado de Aprovação — obrigatório pela NR-6 para uso em ambiente de trabalho.
          </span>
        </motion.div>
      )}
    </TooltipProvider>
  );
}
