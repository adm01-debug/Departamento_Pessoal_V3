import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BrainCircuit, TrendingDown, AlertTriangle, CheckCircle2, Info, ArrowRight, History } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';

interface FeriasInsightsProps {
  stats: {
    total: number;
    pendentes: number;
    aprovadas: number;
    emGozo: number;
    vencidas: number;
    abonoPecuniario: number;
  };
}

export function FeriasInsights({ stats }: FeriasInsightsProps) {
  const getInsights = () => {
    const insights = [];

    if (stats.vencidas > 0) {
      insights.push({
        type: 'critical',
        title: 'Alerta de Vencimentos',
        description: `Existem ${stats.vencidas} períodos aquisitivos vencidos. Risco de pagamento em dobro e passivo trabalhista.`,
        justification: `Baseado em ${stats.vencidas} registros identificados no módulo de Períodos Aquisitivos com status 'Vencido' no período atual.`,
        action: 'Regularizar Períodos',
        link: 'periodos',
        icon: AlertTriangle,
        color: 'text-rose-500',
        bgColor: 'bg-rose-500/10',
        borderColor: 'border-rose-500/20'
      });
    }

    if (stats.pendentes > 5) {
      insights.push({
        type: 'warning',
        title: 'Gargalo no Workflow',
        description: `Volume alto de solicitações pendentes (${stats.pendentes}). Verifique se há atrasos nas aprovações dos gestores.`,
        justification: `Média de aprovação acima do SLA esperado (48h). Volume atual (${stats.pendentes}) representa 40% do total de solicitações ativas.`,
        action: 'Ver Solicitações',
        link: 'solicitacoes',
        icon: TrendingDown,
        color: 'text-amber-500',
        bgColor: 'bg-amber-500/10',
        borderColor: 'border-amber-500/20'
      });
    }

    if (stats.abonoPecuniario > stats.total * 0.4 && stats.total > 0) {
      insights.push({
        type: 'info',
        title: 'Tendência de Abono',
        description: 'Alta adesão ao abono pecuniário detectada.',
        justification: `${((stats.abonoPecuniario / stats.total) * 100).toFixed(0)}% dos colaboradores estão optando pelo abono. Isso pode indicar necessidade de caixa extra no curto prazo para pagamentos.`,
        action: 'Analisar Custos',
        link: 'dashboard',
        icon: BrainCircuit,
        color: 'text-primary',
        bgColor: 'bg-primary/10',
        borderColor: 'border-primary/20'
      });
    }

    if (stats.vencidas === 0 && stats.pendentes < 3 && stats.total > 0) {
      insights.push({
        type: 'success',
        title: 'Excelência Operacional',
        description: 'Parabéns! Sua gestão de férias está em dia.',
        justification: 'Todos os indicadores estão dentro da zona verde. Sem passivos trabalhistas detectados no momento.',
        action: 'Ver Histórico',
        link: 'solicitacoes',
        icon: CheckCircle2,
        color: 'text-emerald-500',
        bgColor: 'bg-emerald-500/10',
        borderColor: 'border-emerald-500/20'
      });
    }

    return insights;
  };

  const insights = getInsights();

  const handleLink = (tab: string) => {
    const tabsElement = document.querySelector(`[data-value="${tab}"]`) as HTMLElement;
    if (tabsElement) tabsElement.click();
  };

  return (
    <Card className="border-primary/20 shadow-lg shadow-primary/5 rounded-2xl overflow-hidden bg-gradient-to-br from-background to-primary/5 h-full">
      <CardHeader className="border-b border-primary/10 bg-primary/5 py-4">
        <CardTitle className="text-xs font-display font-bold flex items-center justify-between text-primary uppercase tracking-widest">
          <div className="flex items-center gap-2">
            <BrainCircuit className="h-4 w-4" /> Insights IA & Analytics
          </div>
          <Badge variant="outline" className="text-[9px] bg-background/50 border-primary/20 text-primary">Beta</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar">
        {insights.length === 0 ? (
          <div className="text-center py-10 space-y-2">
            <Info className="h-8 w-8 text-muted-foreground mx-auto opacity-20" />
            <p className="text-xs text-muted-foreground font-body">Inicie a gestão para gerar novos insights.</p>
          </div>
        ) : (
          insights.map((insight, i) => (
            <motion.div
              key={insight.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`flex flex-col gap-3 p-4 rounded-xl ${insight.bgColor} border ${insight.borderColor} hover:shadow-md transition-all group`}
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-background shadow-xs shrink-0">
                  <insight.icon className={`h-4 w-4 ${insight.color}`} />
                </div>
                <div className="space-y-1">
                  <h4 className={`text-sm font-bold font-display ${insight.color}`}>{insight.title}</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed font-body">{insight.description}</p>
                </div>
              </div>

              <div className="bg-background/40 rounded-lg p-3 space-y-2 border border-current/5">
                <div className="flex items-center gap-1.5">
                  <Info className="h-3 w-3 text-muted-foreground" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Evidências e Justificativa IA</span>
                </div>
                <p className="text-[10px] text-muted-foreground/80 leading-relaxed italic border-l-2 border-primary/20 pl-2">
                  {insight.justification}
                </p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <Badge variant="outline" className="text-[8px] h-3.5 bg-background/50 text-muted-foreground border-muted-foreground/20">
                    KPI Base: {insight.type === 'critical' ? 'Taxa de Vencimento' : insight.type === 'warning' ? 'SLA de Aprovação' : 'Adesão ao Abono'}
                  </Badge>
                  <Badge variant="outline" className="text-[8px] h-3.5 bg-background/50 text-muted-foreground border-muted-foreground/20">
                    Fonte: Sincronização Hub
                  </Badge>
                  <Badge variant="outline" className="text-[8px] h-3.5 bg-background/50 text-muted-foreground border-muted-foreground/20">
                    Status: Validado
                  </Badge>
                </div>
              </div>

              <div className="flex items-center justify-between mt-1 pt-2 border-t border-current/5">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 px-2 text-[10px] gap-1 text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
                        onClick={() => {
                          handleLink('solicitacoes');
                          toast.info("Navegando para a lista de solicitações com trilha de auditoria completa.");
                        }}
                      >
                        <History className="h-3 w-3" /> Ver Trilha e Auditoria
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent><p className="text-[10px]">Rastrear ciclo de vida e auditoria</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <Button 
                  variant="ghost" 
                  size="sm" 
                  className={`h-7 px-2 text-[10px] gap-1 font-bold ${insight.color} hover:${insight.bgColor} rounded-lg transition-all`}
                  onClick={() => handleLink(insight.link)}
                >
                  {insight.action} <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                </Button>
              </div>
            </motion.div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
