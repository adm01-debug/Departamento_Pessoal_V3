import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ShieldAlert, CheckCircle, AlertTriangle, Loader2, Sparkles, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ESocialEvento } from '@/services/esocialService';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface ESocialAuditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventos: ESocialEvento[];
}

export function ESocialAuditDialog({ open, onOpenChange, eventos }: ESocialAuditDialogProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<{
    score: number;
    issues: { type: 'critical' | 'warning' | 'info'; message: string; event?: string }[];
  } | null>(null);

  const startScan = () => {
    setIsScanning(true);
    setResults(null);
    setProgress(0);

    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          finishScan();
          return 100;
        }
        return prev + 5;
      });
    }, 100);
  };

  const finishScan = () => {
    // Simulated audit logic based on actual events
    const pendentes = eventos.filter(e => e.status === 'pendente');
    const erros = eventos.filter(e => e.status === 'erro');
    
    const issues = [];
    
    if (erros.length > 0) {
      issues.push({
        type: 'critical' as const,
        message: `${erros.length} eventos estão com erro e bloqueiam o fechamento da folha.`});
    }
    
    if (pendentes.length > 5) {
      issues.push({
        type: 'warning' as const,
        message: 'Volume alto de eventos pendentes para a competência atual.'});
    }

    const s1200WithoutS1210 = eventos.filter(e => e.tipo_evento === 'S-1200' && !eventos.some(e2 => e2.tipo_evento === 'S-1210' && (e2.dados as any)?.cpfTrab === (e.dados as any)?.cpfTrab));
    if (s1200WithoutS1210.length > 0) {
      issues.push({
        type: 'info' as const,
        message: `${s1200WithoutS1210.length} remunerações (S-1200) sem o respectivo pagamento (S-1210).`});
    }

    if (issues.length === 0) {
      issues.push({
        type: 'info' as const,
        message: 'Todos os eventos analisados estão em conformidade com as regras básicas.'});
    }

    setResults({
      score: Math.max(0, 100 - (erros.length * 20) - (pendentes.length * 2)),
      issues
    });
    setIsScanning(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-border/30 shadow-elevated rounded-2xl p-0 overflow-hidden">
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-6 border-b border-primary/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/20 text-primary">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="font-display text-xl">Auditoria Proativa IA</DialogTitle>
              <DialogDescription className="font-body text-primary/70">
                Verificação profunda de conformidade eSocial
              </DialogDescription>
            </div>
          </div>
        </div>

        <div className="p-6">
          <AnimatePresence mode="wait">
            {!isScanning && !results ? (
              <motion.div 
                key="initial"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-center space-y-4"
              >
                <div className="p-6 rounded-2xl bg-muted/30 border border-dashed border-border/50">
                  <Sparkles className="h-10 w-10 text-primary/40 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Nossa IA analisará todos os eventos da competência atual, buscando inconsistências, dados faltantes e riscos de autuação fiscal.
                  </p>
                </div>
                <Button onClick={startScan} className="w-full rounded-xl bg-gradient-to-r from-primary to-primary-glow h-11">
                  Iniciar Varredura Completa
                </Button>
              </motion.div>
            ) : isScanning ? (
              <motion.div 
                key="scanning"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="py-12 text-center space-y-6"
              >
                <div className="relative inline-block">
                  <Loader2 className="h-16 w-16 text-primary animate-spin opacity-20" />
                  <ShieldCheck className="h-8 w-8 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                </div>
                <div className="space-y-2">
                  <p className="font-bold text-sm animate-pulse">Analisando layouts e cruzando dados...</p>
                  <Progress value={progress} className="h-1.5 w-64 mx-auto bg-primary/10" />
                  <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">{progress}% COMPLETO</p>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="results"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between p-4 rounded-2xl bg-background border border-border/50 shadow-xs">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Score de Conformidade</p>
                    <p className="text-3xl font-display font-bold text-primary">{results?.score}%</p>
                  </div>
                  <div className={cn(
                    "h-12 w-12 rounded-full border-4 flex items-center justify-center font-bold text-lg",
                    results!.score > 80 ? "border-success/30 text-success" : 
                    results!.score > 50 ? "border-warning/30 text-warning" : 
                    "border-destructive/30 text-destructive"
                  )}>
                    {results!.score > 80 ? 'A' : results!.score > 50 ? 'B' : 'C'}
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">Alertas Detectados</p>
                  <div className="space-y-2 max-h-[200px] overflow-auto pr-1">
                    {results?.issues.map((issue, i) => (
                      <div key={i} className={cn(
                        "p-3 rounded-xl border flex gap-3 items-start",
                        issue.type === 'critical' ? "bg-destructive/5 border-destructive/20 text-destructive" :
                        issue.type === 'warning' ? "bg-warning/5 border-warning/20 text-warning" :
                        "bg-info/5 border-info/20 text-info"
                      )}>
                        {issue.type === 'critical' ? <ShieldAlert className="h-4 w-4 mt-0.5" /> : 
                         issue.type === 'warning' ? <AlertTriangle className="h-4 w-4 mt-0.5" /> : 
                         <CheckCircle className="h-4 w-4 mt-0.5" />}
                        <p className="text-xs font-medium leading-relaxed">{issue.message}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <Button onClick={() => onOpenChange(false)} className="w-full rounded-xl border-primary/20 hover:bg-primary/5" variant="outline">
                  Entendido, vou ajustar
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
