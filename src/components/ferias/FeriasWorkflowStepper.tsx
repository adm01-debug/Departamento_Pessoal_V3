import { UserCheck, Shield, Building2, Check, AlertCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const steps = [
  { key: 'aprovado_gestor', statusKey: 'status_aprovacao_gestor', label: 'Gestor', icon: UserCheck },
  { key: 'aprovado_rh', statusKey: 'status_aprovacao_rh', label: 'RH', icon: Shield },
  { key: 'enviado_contabilidade', statusKey: 'status_aprovacao_contabilidade', label: 'Contabilidade', icon: Building2 },
] as const;

export function FeriasWorkflowStepper({ solicitacao }: { solicitacao: Record<string, any> }) {
  return (
    <TooltipProvider>
      <div className="flex items-center gap-1">
        {steps.map(({ key, statusKey, label, icon: Icon }, i) => {
          const status = solicitacao[statusKey] || (solicitacao[key] ? 'aprovado' : 'pendente');
          const isDone = status === 'aprovado';
          const isRejected = status === 'rejeitado';
          const dateKey = `${key}_em`;
          
          return (
            <div key={key} className="flex items-center gap-0.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      'relative p-1.5 rounded-lg transition-colors',
                      isDone ? 'bg-success/15 text-success' : 
                      isRejected ? 'bg-destructive/15 text-destructive' :
                      'bg-muted/40 text-muted-foreground'
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {isDone && (
                      <div className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-success flex items-center justify-center">
                        <Check className="h-1.5 w-1.5 text-success-foreground" />
                      </div>
                    )}
                    {isRejected && (
                      <div className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-destructive flex items-center justify-center">
                        <AlertCircle className="h-1.5 w-1.5 text-destructive-foreground" />
                      </div>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  <p className="font-medium">
                    {label}: {isDone ? '✅ Aprovado' : isRejected ? '❌ Rejeitado' : '⏳ Pendente'}
                  </p>
                  {solicitacao[dateKey] && (
                    <p className="text-muted-foreground">{format(new Date(solicitacao[dateKey]), 'dd/MM/yyyy HH:mm')}</p>
                  )}
                </TooltipContent>
              </Tooltip>
              {i < steps.length - 1 && (
                <div className={cn('w-3 h-px', isDone ? 'bg-success/50' : 'bg-border')} />
              )}
            </div>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
