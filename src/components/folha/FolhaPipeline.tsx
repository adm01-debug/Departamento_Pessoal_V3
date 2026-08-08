import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, FileText, Calculator, Shield, CheckCircle, ArrowRight, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const stepConfig = [
  { key: 'ponto', label: 'Importar Ponto', desc: 'Dados do ponto eletrônico', icon: Clock },
  { key: 'lancamentos', label: 'Lançamentos', desc: 'Eventos e variáveis', icon: FileText },
  { key: 'calculo', label: 'Cálculo', desc: 'Processamento da folha', icon: Calculator },
  { key: 'conferencia', label: 'Conferência', desc: 'Validação dos valores', icon: Shield },
  { key: 'fechamento', label: 'Fechamento', desc: 'Aprovação e envio', icon: CheckCircle },
];

const statusStyles: Record<string, { label: string }> = {
  pendente: { label: 'Pendente' },
  importado: { label: 'Importado' },
  conferido: { label: 'Conferido' },
  executado: { label: 'Executado' },
  aprovado: { label: 'Aprovado' },
  aberto: { label: 'Aberto' },
  fechado: { label: 'Fechado' }};

function PipelineStep({ step, status, index, isLast }: { step: typeof stepConfig[0]; status: string; index: number; isLast: boolean }) {
  const st = statusStyles[status] || statusStyles.pendente;
  const isDone = ['importado', 'conferido', 'executado', 'aprovado', 'fechado'].includes(status);
  const Icon = step.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className="flex items-center gap-3"
    >
      <div className="flex flex-col items-center">
        <div className={cn(
          "relative p-3 rounded-2xl border-2 transition-all",
          isDone ? "bg-success/10 border-success/30" : "bg-card border-border/30",
          !isDone && index === 0 && "border-primary/50 shadow-glow-sm"
        )}>
          <Icon className={cn("h-5 w-5", isDone ? "text-success" : "text-muted-foreground")} />
          {isDone && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-success flex items-center justify-center"
            >
              <CheckCircle className="h-3 w-3 text-success-foreground" />
            </motion.div>
          )}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn("text-body font-display font-semibold", isDone ? "text-success" : "text-foreground")}>{step.label}</p>
        <p className="text-caption text-muted-foreground font-body">{step.desc}</p>
      </div>
      <Badge variant="outline" className={cn("text-[10px] shrink-0 rounded-full", isDone ? "bg-success/10 text-success border-success/30" : "")}>
        {st.label}
      </Badge>
      {!isLast && <ChevronRight className="h-4 w-4 text-muted-foreground/30 shrink-0 hidden lg:block" />}
    </motion.div>
  );
}

interface FolhaPipelineProps {
  status: Record<string, string>;
  competencia: string;
}

export function FolhaPipeline({ status, competencia }: FolhaPipelineProps) {
  return (
    <Card className="border border-border/30 rounded-2xl overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2.5 text-h3 font-display">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-primary to-primary-glow">
            <ArrowRight className="h-4 w-4 text-primary-foreground" />
          </div>
          Pipeline de Processamento
          <Badge variant="outline" className="ml-auto text-[10px] rounded-full font-body">
            {competencia}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {stepConfig.map((step, i) => (
            <PipelineStep
              key={step.key}
              step={step}
              status={status[step.key] || 'pendente'}
              index={i}
              isLast={i === stepConfig.length - 1}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
