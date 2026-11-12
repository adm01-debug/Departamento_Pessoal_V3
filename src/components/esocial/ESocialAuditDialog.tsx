import { useMemo } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ShieldAlert, CheckCircle, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ESocialEvento } from '@/services/esocialService';
import { cn } from '@/lib/utils';

interface ESocialAuditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventos: ESocialEvento[];
}

export function ESocialAuditDialog({ open, onOpenChange, eventos }: ESocialAuditDialogProps) {
  // Sem eventos não há o que checar: não exibir score 100%/nota A nem "tudo conforme".
  const semEventos = eventos.length === 0;
  const results = useMemo(() => {
    // Regras determinísticas sobre os eventos carregados (sem IA).
    const pendentes = eventos.filter((e) => e.status === 'pendente');
    const erros = eventos.filter((e) => e.status === 'erro');

    const issues: { type: 'critical' | 'warning' | 'info'; message: string; event?: string }[] = [];

    if (erros.length > 0) {
      issues.push({
        type: 'critical' as const,
        message: `${erros.length} eventos estão com erro e bloqueiam o fechamento da folha.`,
      });
    }

    if (pendentes.length > 5) {
      issues.push({
        type: 'warning' as const,
        message: 'Volume alto de eventos pendentes para a competência atual.',
      });
    }

    const s1200WithoutS1210 = eventos.filter(
      (e) =>
        e.tipo_evento === 'S-1200' &&
        !eventos.some(
          (e2) =>
            e2.tipo_evento === 'S-1210' &&
            (e2.dados as { cpfTrab?: string } | null)?.cpfTrab === (e.dados as { cpfTrab?: string } | null)?.cpfTrab
        )
    );
    if (s1200WithoutS1210.length > 0) {
      issues.push({
        type: 'info' as const,
        message: `${s1200WithoutS1210.length} remunerações (S-1200) sem o respectivo pagamento (S-1210).`,
      });
    }

    if (issues.length === 0) {
      issues.push({
        type: 'info' as const,
        message: 'Todos os eventos analisados estão em conformidade com as regras básicas.',
      });
    }

    return {
      score: Math.max(0, 100 - erros.length * 20 - pendentes.length * 2),
      issues,
    };
  }, [eventos]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-border/30 shadow-elevated rounded-2xl p-0 overflow-hidden">
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-6 border-b border-primary/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/20 text-primary">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="font-display text-xl">Checagem de consistência</DialogTitle>
              <DialogDescription className="font-body text-primary/70">
                Regras básicas aplicadas aos {eventos.length} eventos carregados: erros, pendências e S-1200 sem S-1210
              </DialogDescription>
            </div>
          </div>
        </div>

        <div className="p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key="results"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6"
            >
              {semEventos ? (
                <div className="p-4 rounded-2xl bg-background border border-border/50 text-center">
                  <p className="text-sm font-medium">Nenhum evento para verificar</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Não há eventos carregados para esta empresa, então nenhuma regra foi aplicada e não há score.
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-background border border-border/50 shadow-xs">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
                        Score de Conformidade
                      </p>
                      <p className="text-3xl font-display font-bold text-primary">{results.score}%</p>
                    </div>
                    <div
                      className={cn(
                        'h-12 w-12 rounded-full border-4 flex items-center justify-center font-bold text-lg',
                        results.score > 80
                          ? 'border-success/30 text-success'
                          : results.score > 50
                            ? 'border-warning/30 text-warning'
                            : 'border-destructive/30 text-destructive'
                      )}
                    >
                      {results.score > 80 ? 'A' : results.score > 50 ? 'B' : 'C'}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">
                      Alertas Detectados
                    </p>
                    <div className="space-y-2 max-h-[200px] overflow-auto pr-1">
                      {results.issues.map((issue, i) => (
                        <div
                          key={i}
                          className={cn(
                            'p-3 rounded-xl border flex gap-3 items-start',
                            issue.type === 'critical'
                              ? 'bg-destructive/5 border-destructive/20 text-destructive'
                              : issue.type === 'warning'
                                ? 'bg-warning/5 border-warning/20 text-warning'
                                : 'bg-info/5 border-info/20 text-info'
                          )}
                        >
                          {issue.type === 'critical' ? (
                            <ShieldAlert className="h-4 w-4 mt-0.5" />
                          ) : issue.type === 'warning' ? (
                            <AlertTriangle className="h-4 w-4 mt-0.5" />
                          ) : (
                            <CheckCircle className="h-4 w-4 mt-0.5" />
                          )}
                          <p className="text-xs font-medium leading-relaxed">{issue.message}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <Button
                onClick={() => onOpenChange(false)}
                className="w-full rounded-xl border-primary/20 hover:bg-primary/5"
                variant="outline"
              >
                {semEventos ? 'Fechar' : 'Entendido, vou ajustar'}
              </Button>
            </motion.div>
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
