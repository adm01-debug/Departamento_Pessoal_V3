import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { motion } from 'framer-motion';
import { AlertTriangle, FileWarning, Ban, Gavel, Clock } from 'lucide-react';

interface MedidasStats {
  total: number;
  advertenciasVerbais: number;
  advertenciasEscritas: number;
  suspensoes: number;
  justaCausa: number;
  pendenteCiencia: number;
  recusas: number;
  ultimosMeses: number;
}

interface MedidasKPIsProps {
  stats: MedidasStats;
}

const kpis = [
  {
    key: 'total' as const,
    label: 'Total Registros',
    icon: AlertTriangle,
    color: 'text-foreground',
    bgColor: 'bg-muted/50',
    borderColor: 'border-border/40',
    tooltip: 'Total de medidas disciplinares registradas'},
  {
    key: 'advertenciasVerbais' as const,
    label: 'Adv. Verbais',
    icon: FileWarning,
    color: 'text-warning',
    bgColor: 'bg-warning/5',
    borderColor: 'border-warning/20',
    tooltip: 'Advertências verbais — menor gravidade, primeiro nível disciplinar'},
  {
    key: 'advertenciasEscritas' as const,
    label: 'Adv. Escritas',
    icon: FileWarning,
    color: 'text-accent-foreground',
    bgColor: 'bg-accent/30',
    borderColor: 'border-accent/40',
    tooltip: 'Advertências escritas — segundo nível, documentação formal'},
  {
    key: 'suspensoes' as const,
    label: 'Suspensões',
    icon: Ban,
    color: 'text-destructive',
    bgColor: 'bg-destructive/5',
    borderColor: 'border-destructive/20',
    tooltip: 'Suspensões disciplinares — afastamento temporário (CLT Art. 474, máx. 30 dias)'},
  {
    key: 'justaCausa' as const,
    label: 'Justa Causa',
    icon: Gavel,
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
    borderColor: 'border-destructive/30',
    tooltip: 'Rescisões por justa causa — CLT Art. 482'},
  {
    key: 'pendenteCiencia' as const,
    label: 'Pendente Ciência',
    icon: Clock,
    color: 'text-warning',
    bgColor: 'bg-warning/5',
    borderColor: 'border-warning/20',
    tooltip: 'Medidas aguardando ciência do colaborador'},
];

export function MedidasKPIs({ stats }: MedidasKPIsProps) {
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
                        {kpi.key === 'pendenteCiencia' && value > 0 && (
                          <span className="flex h-2 w-2 rounded-full bg-warning animate-pulse" />
                        )}
                      </div>
                      <p className="text-2xl font-display font-bold tracking-tight">{value}</p>
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

      {/* Alerta de governança */}
      {stats.recusas > 0 && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-4 flex items-center gap-3 p-3 rounded-xl bg-destructive/5 border border-destructive/20 text-sm"
        >
          <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
          <span className="text-foreground font-body">
            <strong>{stats.recusas}</strong> {stats.recusas === 1 ? 'registro com' : 'registros com'} recusa de assinatura — considere documentar com testemunhas para segurança jurídica.
          </span>
        </motion.div>
      )}
    </TooltipProvider>
  );
}
