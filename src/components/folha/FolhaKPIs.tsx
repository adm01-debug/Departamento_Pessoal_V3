import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info, Users, TrendingDown, DollarSign, Shield, Receipt } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { AnimatedNumber } from '@/components/dashboard/AnimatedNumber';
import { KPICardSkeleton } from '@/components/ui/module-skeleton';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }).format(value);
}

function FolhaKPI({ title, value, icon: Icon, gradient, index, tooltip }: {
  title: string; value: number; icon: React.ElementType; gradient: string; index: number; tooltip?: string;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06 }}>
      <Card className="border border-border/30 rounded-2xl overflow-hidden relative group hover:shadow-elevated transition-all">
        <div className={cn("absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r", gradient)} />
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className={cn("p-1.5 rounded-lg bg-gradient-to-br", gradient)}>
              <Icon className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            {tooltip && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger><Info className="h-3 w-3 text-muted-foreground/50" /></TooltipTrigger>
                  <TooltipContent className="max-w-[200px] text-xs">{tooltip}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          <p className="text-xl font-display font-semibold">
            <AnimatedNumber value={value} format={formatCurrency} />
          </p>
          <p className="text-[11px] text-muted-foreground font-body mt-1">{title}</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

interface FolhaResumo {
  colaboradores: number;
  totalProventos: number;
  totalDescontos: number;
  liquido: number;
  inss: number;
  fgts: number;
  irrf: number;
  custoTotalEmpresa?: number;
}

interface FolhaKPIsProps {
  resumo: FolhaResumo | undefined;
  isLoading: boolean;
}

export function FolhaKPIs({ resumo, isLoading }: FolhaKPIsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {Array(6).fill(0).map((_, i) => <KPICardSkeleton key={i} />)}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
      <FolhaKPI title="Colaboradores" value={resumo?.colaboradores || 0} icon={Users}
        gradient="from-primary to-primary-glow" index={0}
        tooltip="Total de colaboradores com folha processada nesta competência" />
      <FolhaKPI title="Total Bruto" value={resumo?.totalProventos || 0} icon={TrendingDown}
        gradient="from-success to-success/70" index={1}
        tooltip="Soma de todos os proventos: salário base, horas extras, gratificações" />
      <FolhaKPI title="Total Descontos" value={resumo?.totalDescontos || 0} icon={TrendingDown}
        gradient="from-destructive to-destructive/70" index={2}
        tooltip="INSS, IRRF e outros descontos dos colaboradores" />
      <FolhaKPI title="Líquido Total" value={resumo?.liquido || 0} icon={DollarSign}
        gradient="from-primary-glow to-primary" index={3}
        tooltip="Valor total líquido a ser pago aos colaboradores" />
      <FolhaKPI title="Encargos (INSS+FGTS)" value={(resumo?.inss || 0) + (resumo?.fgts || 0)} icon={Shield}
        gradient="from-info to-info/70" index={4}
        tooltip="Encargos patronais e sociais estimados (INSS + FGTS)" />
      <FolhaKPI title="IRRF Retido" value={resumo?.irrf || 0} icon={Receipt}
        gradient="from-warning to-warning/70" index={5}
        tooltip="Imposto de Renda Retido na Fonte (IRRF)" />
      <FolhaKPI title="Custo Empresa" value={resumo?.custoTotalEmpresa || (resumo?.totalProventos || 0) * 1.358} icon={DollarSign}
        gradient="from-purple-500 to-indigo-600" index={6}
        tooltip="Custo real estimado (Bruto + Encargos + Provisões 1/12)" />
    </div>
  );
}
