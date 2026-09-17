import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { motion } from 'framer-motion';
import { Stethoscope, CheckCircle2, XCircle, AlertTriangle, Clock, ShieldAlert } from 'lucide-react';
import { isBefore, parseISO, addMonths } from 'date-fns';

interface ExameKPIsProps {
  data: any[];
}

export function ExameKPIs({ data }: ExameKPIsProps) {
  const now = new Date();

  const total = data.length;
  const aptos = data.filter(e => e.resultado === 'apto').length;
  const inaptos = data.filter(e => e.resultado === 'inapto').length;
  const comRestricao = data.filter(e => e.resultado === 'apto_restricao').length;
  const pendentes = data.filter(e => !e.resultado).length;

  const vencidos = data.filter(e => {
    if (!e.data_validade) return false;
    try { return isBefore(parseISO(e.data_validade), now); } catch { return false; }
  }).length;

  const vencendoEm30d = data.filter(e => {
    if (!e.data_validade) return false;
    try {
      const val = parseISO(e.data_validade);
      return !isBefore(val, now) && isBefore(val, addMonths(now, 1));
    } catch { return false; }
  }).length;

  const kpis = [
    { label: 'Total de Exames', value: total, icon: Stethoscope, color: 'text-primary', bg: 'bg-primary/5', border: 'border-primary/20', tooltip: 'Total de exames ocupacionais registrados' },
    { label: 'Aptos', value: aptos, icon: CheckCircle2, color: 'text-primary', bg: 'bg-primary/5', border: 'border-primary/20', tooltip: 'Colaboradores aptos sem restrições' },
    { label: 'Inaptos', value: inaptos, icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/5', border: 'border-destructive/20', tooltip: 'Colaboradores inaptos — ação imediata necessária', alert: inaptos > 0 },
    { label: 'Com Restrição', value: comRestricao, icon: AlertTriangle, color: 'text-warning', bg: 'bg-warning/5', border: 'border-warning/20', tooltip: 'Aptos com restrições — monitorar condições' },
    { label: 'Pendentes', value: pendentes, icon: Clock, color: 'text-muted-foreground', bg: 'bg-muted/50', border: 'border-border/40', tooltip: 'Exames sem resultado registrado' },
    { label: 'Vencidos', value: vencidos, icon: ShieldAlert, color: 'text-destructive', bg: 'bg-destructive/5', border: 'border-destructive/20', tooltip: 'Exames com validade expirada — renovação obrigatória (NR-7)', alert: vencidos > 0 },
  ];

  return (
    <TooltipProvider>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {kpis.map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <Tooltip key={kpi.label}>
              <TooltipTrigger asChild>
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.3 }}
                >
                  <Card className={`border ${kpi.border} ${kpi.bg} shadow-xs rounded-2xl cursor-default hover:shadow-md transition-shadow`}>
                    <CardContent className="pt-4 pb-3 px-4">
                      <div className="flex items-center justify-between mb-2">
                        <Icon className={`h-4 w-4 ${kpi.color}`} />
                        {kpi.alert && (
                          <span className="flex h-2 w-2 rounded-full bg-destructive animate-pulse" />
                        )}
                      </div>
                      <p className="text-2xl font-display font-semibold tracking-tight">{kpi.value}</p>
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

      {vencendoEm30d > 0 && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-4 flex items-center gap-3 p-3 rounded-xl bg-warning/5 border border-warning/20 text-sm"
        >
          <Clock className="h-4 w-4 text-warning shrink-0" />
          <span className="text-foreground font-body">
            <strong>{vencendoEm30d}</strong> exame{vencendoEm30d > 1 ? 's' : ''} vencendo nos próximos 30 dias — agende renovação.
          </span>
        </motion.div>
      )}

      {vencidos > 0 && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-4 flex items-center gap-3 p-3 rounded-xl bg-destructive/5 border border-destructive/20 text-sm"
        >
          <ShieldAlert className="h-4 w-4 text-destructive shrink-0" />
          <span className="text-foreground font-body">
            <strong>{vencidos}</strong> exame{vencidos > 1 ? 's' : ''} com validade expirada — renovação obrigatória conforme NR-7.
          </span>
        </motion.div>
      )}
    </TooltipProvider>
  );
}
