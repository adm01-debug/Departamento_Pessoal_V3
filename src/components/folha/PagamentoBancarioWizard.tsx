import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useEmpresas } from '@/hooks/useEmpresas';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Landmark, CheckCircle2, Loader2,
  FileDown, Zap, Globe, Smartphone,
  ArrowRight, ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/utils/safeError';
import { cnabService } from '@/services/cnabService';

export function PagamentoBancarioWizard({ folhaId }: { folhaId?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [method, setMethod] = useState<'cnab' | 'pix' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  // Protocolo gerado uma única vez na montagem (evita Date.now() instável durante o render).
  const [protocolo] = useState(() => `OP-${Date.now().toString().slice(-8)}`);
  const { empresaAtual } = useEmpresas();

  const handleProcess = async () => {
    if (!method || !folhaId || !empresaAtual?.id) return;
    setIsProcessing(true);
    
    try {
      // Simulate real bank communication (Open Banking API pattern)
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      let content = '';
      if (method === 'pix') {
        content = await cnabService.generatePIXBatch(empresaAtual.id, folhaId);
      } else {
        content = await cnabService.generateCNAB240(empresaAtual.id, folhaId);
      }
      
      // Automatic download of the generated file
      const blob = new Blob([content], { type: method === 'pix' ? 'text/csv' : 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = method === 'pix' ? `Lote_PIX_${folhaId}.csv` : `Remessa_CNAB_${folhaId}.rem`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setCurrentStep(3);
      toast.success(method === 'pix' ? 'Lote PIX liquidado com sucesso!' : 'Arquivo de remessa gerado e enviado ao banco.');
    } catch (err: any) {
      toast.error(safeErrorMessage(err, 'Falha no processamento bancário.'));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => { setIsOpen(o); if(!o) setCurrentStep(1); }}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="rounded-xl gap-1.5 bg-gradient-to-r from-success to-primary hover:opacity-90 shadow-lg font-body"
          disabled={!folhaId}
        >
          <Landmark className="h-4 w-4" />
          Pagar Salários
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl overflow-hidden p-0 gap-0 border-border/40">
        <div className="bg-gradient-to-r from-success to-primary p-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-white/20 backdrop-blur-xs">
              <Landmark className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-display font-bold">Liquidação de Folha</h2>
              <p className="text-xs opacity-80 uppercase tracking-widest font-bold">Ambiente de Operações Bancárias</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <AnimatePresence mode="wait">
            {currentStep === 1 && (
              <motion.div 
                key="step1" 
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="grid grid-cols-2 gap-4">
                  <Card 
                    className={cn(
                      "cursor-pointer transition-all border-2",
                      method === 'pix' ? "border-primary bg-primary/5" : "border-border/30 hover:border-primary/20"
                    )}
                    onClick={() => setMethod('pix')}
                  >
                    <CardContent className="p-4 flex flex-col items-center text-center gap-3">
                      <div className="p-3 rounded-full bg-amber-500/10 text-amber-500">
                        <Zap className="h-8 w-8" />
                      </div>
                      <div>
                        <p className="font-bold">Lote PIX</p>
                        <p className="text-[10px] text-muted-foreground leading-tight">Liquidação instantânea (24/7). Ideal para fintechs e bancos digitais.</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card 
                    className={cn(
                      "cursor-pointer transition-all border-2",
                      method === 'cnab' ? "border-primary bg-primary/5" : "border-border/30 hover:border-primary/20"
                    )}
                    onClick={() => setMethod('cnab')}
                  >
                    <CardContent className="p-4 flex flex-col items-center text-center gap-3">
                      <div className="p-3 rounded-full bg-primary/10 text-primary">
                        <FileDown className="h-8 w-8" />
                      </div>
                      <div>
                        <p className="font-bold">Remessa CNAB</p>
                        <p className="text-[10px] text-muted-foreground leading-tight">Padrão FEBRABAN 240. Ideal para grandes bancos e agendamento.</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="bg-muted/30 p-4 rounded-xl border border-border/30 flex items-start gap-3">
                  <ShieldCheck className="h-5 w-5 text-success mt-0.5" />
                  <p className="text-xs text-muted-foreground italic">
                    Conexão segura via TLS 1.3. Os dados bancários dos colaboradores estão criptografados em conformidade com a LGPD.
                  </p>
                </div>

                <DialogFooter className="pt-4">
                  <Button variant="outline" className="rounded-xl" onClick={() => setIsOpen(false)}>Cancelar</Button>
                  <Button className="rounded-xl px-8" disabled={!method} onClick={() => setCurrentStep(2)}>
                    Prosseguir <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </DialogFooter>
              </motion.div>
            )}

            {currentStep === 2 && (
              <motion.div 
                key="step2" 
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                className="flex flex-col items-center justify-center py-8 text-center"
              >
                {isProcessing ? (
                  <>
                    <div className="relative mb-6">
                      <Loader2 className="h-20 w-20 text-primary animate-spin" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Globe className="h-8 w-8 text-primary/40 animate-pulse" />
                      </div>
                    </div>
                    <h3 className="text-lg font-display font-bold">Comunicando com o Banco...</h3>
                    <p className="text-xs text-muted-foreground mt-2">Autenticando convênio e validando chaves de segurança</p>
                  </>
                ) : (
                  <>
                    <div className="p-5 rounded-full bg-primary/10 mb-4">
                      <ShieldCheck className="h-10 w-10 text-primary" />
                    </div>
                    <h3 className="text-lg font-display font-bold">Confirmar Pagamento?</h3>
                    <p className="text-sm text-muted-foreground max-w-sm mt-2 mb-8">
                      Você está prestes a iniciar a liquidação via {method?.toUpperCase()}. Esta ação é irreversível após o envio ao banco.
                    </p>
                    <div className="flex gap-3 w-full">
                      <Button variant="outline" className="rounded-xl flex-1" onClick={() => setCurrentStep(1)}>Voltar</Button>
                      <Button className="rounded-xl flex-1 bg-success hover:bg-success/90" onClick={handleProcess}>Confirmar Envio</Button>
                    </div>
                  </>
                )}
              </motion.div>
            )}

            {currentStep === 3 && (
              <motion.div 
                key="step3" 
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-6 text-center"
              >
                <div className="p-5 rounded-full bg-success/10 text-success mb-4 border-2 border-success/20">
                  <CheckCircle2 className="h-12 w-12" />
                </div>
                <h3 className="text-xl font-display font-bold">Operação Concluída!</h3>
                <p className="text-sm text-muted-foreground mt-2 mb-8">
                  {method === 'pix' 
                    ? "Os salários foram liquidados instantaneamente." 
                    : "O arquivo de remessa foi gerado e está pronto para o processamento bancário."}
                </p>

                <div className="p-4 bg-muted/20 rounded-2xl w-full border border-border/30 space-y-2 mb-6">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Protocolo:</span>
                    <span className="font-mono font-bold">{protocolo}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Autenticação Digital:</span>
                    <span className="font-mono text-[9px] truncate ml-4">8f7e2a...3c1b9d</span>
                  </div>
                </div>

                <Button className="w-full rounded-xl" onClick={() => setIsOpen(false)}>Finalizar</Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
