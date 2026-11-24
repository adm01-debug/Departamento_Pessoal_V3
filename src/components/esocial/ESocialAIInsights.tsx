import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, ArrowRight, AlertTriangle, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

export function ESocialAIInsights() {
  const insights = [
    {
      title: 'Otimização de Rubricas',
      desc: 'Detectamos 3 rubricas com incidências de INSS que podem ser revisadas para reduzir o risco de autuação.',
      type: 'warning',
      impact: 'Médio'
    },
    {
      title: 'Aviso de Afastamento',
      desc: 'O colaborador João Silva possui um atestado que expira em 2 dias. Prepare o evento S-2230 de retorno.',
      type: 'info',
      impact: 'Alto'
    }
  ];

  return (
    <Card className="border-none shadow-none bg-transparent">
      <CardHeader className="px-0 pt-0 pb-4">
        <CardTitle className="text-sm font-display flex items-center gap-2 text-primary">
          <Sparkles className="h-4 w-4 fill-primary/20" />
          Insights da IA Lovable
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0 space-y-3">
        {insights.map((insight, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="p-3 rounded-xl bg-background border border-border/40 hover:border-primary/30 transition-all cursor-pointer group"
          >
            <div className="flex items-start gap-3">
              <div className={`p-1.5 rounded-lg ${insight.type === 'warning' ? 'bg-warning/10 text-warning' : 'bg-info/10 text-info'}`}>
                {insight.type === 'warning' ? <AlertTriangle className="h-3.5 w-3.5" /> : <Lightbulb className="h-3.5 w-3.5" />}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <h4 className="text-xs font-medium">{insight.title}</h4>
                  <span className="text-[9px] uppercase font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">Impacto {insight.impact}</span>
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed">{insight.desc}</p>
                <button className="flex items-center gap-1 text-[9px] font-medium text-primary mt-2 group-hover:gap-2 transition-all">
                  VER RECOMENDAÇÃO <ArrowRight className="h-2.5 w-2.5" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
        
        <Button variant="ghost" className="w-full text-[10px] h-8 text-muted-foreground hover:text-primary rounded-xl">
          Ver todos os insights (12)
        </Button>
      </CardContent>
    </Card>
  );
}
