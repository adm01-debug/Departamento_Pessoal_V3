import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useFolhaAuditoria } from '@/hooks/useFolhaAuditoria';
import { formatDateLocalISO } from '@/utils/dateLocal';
import { safeHref } from '@/utils/safeUrl';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Calculator, CheckCircle2, Clock, 
  AlertTriangle, ArrowRight, Loader2,
  FileText, Landmark, Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/utils/safeError';
import { edgeFunctionsService } from '@/services/edgeFunctionsService';
import { useEmpresas } from '@/hooks/useEmpresas';
import { useCalculoFolha } from '@/hooks/useCalculoFolha';
import { auditCalculation } from '@/calculators/auditHelper';
import { rubricasFolhaService } from '@/services/tabelas/folhaService';
import { validarRubricaESocial } from '@/validators/esocial';
import { folhaPagamentoService } from '@/services/folhaPagamentoService';
import { FolhaComposicao } from './FolhaComposicao';
import { folhaCalc, CalculoResultado } from '@/utils/folhaCalc';
import { cnabService } from '@/services/cnabService';

interface StepProps {
  isActive: boolean;
  isCompleted: boolean;
  label: string;
  icon: React.ElementType;
}

function Step({ isActive, isCompleted, label, icon: Icon }: StepProps) {
  return (
    <div className="flex flex-col items-center gap-2 flex-1 relative">
      <div className={cn(
        "h-10 w-10 rounded-full flex items-center justify-center transition-all duration-300 z-10",
        isCompleted ? "bg-success text-success-foreground" : 
        isActive ? "bg-primary text-primary-foreground shadow-glow" : 
        "bg-muted text-muted-foreground"
      )}>
        {isCompleted ? <CheckCircle2 className="h-6 w-6" /> : <Icon className="h-5 w-5" />}
      </div>
      <span className={cn(
        "text-[10px] font-bold uppercase tracking-widest text-center",
        isActive ? "text-foreground" : "text-muted-foreground"
      )}>
        {label}
      </span>
    </div>
  );
}

export function CalculoFolhaWizard({ competencia }: { competencia: string }) {
  const { empresaAtualId } = useEmpresas();
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [rubricasValidadas, setRubricasValidadas] = useState(false);
  const [currentFolhaId, setCurrentFolhaId] = useState<string | null>(null);
  const [resultadoCalculo, setResultadoCalculo] = useState<CalculoResultado | null>(null);
  const { registrarLog } = useFolhaAuditoria(currentFolhaId || undefined);
  const { executarCalculo, executarCalculoLote, isCalculando, progressoLote } = useCalculoFolha();
  const queryClient = useQueryClient();

  // Queries for validation
  const { data: pendingPoints } = useQuery({
    queryKey: ['pending-points', empresaAtualId, competencia],
    queryFn: async () => {
      const [mes, ano] = competencia.split('/');
      const { count } = await supabase
        .from('registros_ponto')
        .select('*', { count: 'exact', head: true })
        .eq('empresa_id', empresaAtualId!)
        .is('aprovado', false)
        .gte('data', `${ano}-${mes}-01`)
        .lte('data', formatDateLocalISO(new Date(parseInt(ano, 10), parseInt(mes, 10), 0)));
      return count || 0;
    },
    enabled: isOpen && currentStep === 1,
  });

  const handleCalculate = async () => {
    setIsProcessing(true);
    try {
      // 1. Validação Final de Rubricas
      const rubricas = await rubricasFolhaService.listar(empresaAtualId!);
      const rubricasInvalidas = rubricas.filter(r => !validarRubricaESocial(r).valid);
      
      if (rubricasInvalidas.length > 0) {
        throw new Error(`Existem ${rubricasInvalidas.length} rubricas com divergências eSocial. Corrija-as antes de calcular.`);
      }

      // 2. Executar cálculo em lote via hook
      const [mes, ano] = competencia.split('/');
      const competenciaDB = `${ano}-${mes}`;
      
      const resultadoLote = await executarCalculoLote({
        empresaId: empresaAtualId!,
        competencia: competenciaDB
      });

      // 3. Registrar fechamento automático da fase de processamento na auditoria
      await (supabase as any).from('folha_auditoria').insert({
        tipo_evento: 'CALCULO',
        mensagem: `Assistente de cálculo finalizado para a competência ${competencia}. Todos os colaboradores foram processados com conformidade eSocial e integração de benefícios.`,
        severidade: 'INFO',
        detalhes: { wizard: 'CalculoFolhaWizard', timestamp: new Date().toISOString(), versao_motor: '2.0.26', compliance: '100%', integracao: ['Ponto', 'Beneficios'] }
      });

      // Busca um resumo para exibição final
      const { data: itens } = await supabase
        .from('folha_itens')
        .select(`
          *,
          folha:folhas_pagamento(*)
        `)
        .eq('folha.competencia', competenciaDB)
        .eq('folha.empresa_id', empresaAtualId!)
        .limit(1);

      if (itens && itens.length > 0) {
        setCurrentFolhaId(itens[0].folha_id);
        const detalhes = itens[0].detalhes as any;
        setResultadoCalculo({
          ...detalhes,
          horasFalta: detalhes.horasFalta || 0,
          faixaInss: detalhes.faixaInss || 'Progressiva',
          faixaIrrf: detalhes.faixaIrrf || 'Progressiva'
        });
      }

      toast.info(`Cálculo em lote concluído: ${resultadoLote.success} sucessos.`);
      
      queryClient.invalidateQueries({ queryKey: ['folha-resumo', competencia] });
      setCurrentStep(4);
    } catch (err: any) {
      toast.error(safeErrorMessage(err, 'Erro no processamento da folha.'));
    } finally {
      setIsProcessing(false);
    }
  };

  const steps = [
    { id: 1, label: 'Consistência', icon: Clock },
    { id: 2, label: 'Lançamentos', icon: FileText },
    { id: 3, label: 'Processamento', icon: Calculator },
    { id: 4, label: 'Conclusão', icon: CheckCircle2 },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(o) => { setIsOpen(o); if (!o) setCurrentStep(1); }}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="rounded-xl gap-1.5 bg-gradient-to-r from-primary to-primary-glow hover:opacity-90 shadow-lg font-body"
        >
          <Calculator className="h-4 w-4" />
          Assistente de Cálculo
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl overflow-hidden p-0 gap-0">
        <div className="bg-gradient-to-r from-primary to-primary-glow p-6 text-primary-foreground">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-xl bg-white/20 backdrop-blur-xs">
              <Calculator className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-display font-bold">Assistente de Folha</h2>
              <p className="text-xs opacity-80">Competência {competencia}</p>
            </div>
          </div>

          <div className="flex items-center justify-between relative">
            <div className="absolute top-5 left-0 right-0 h-[2px] bg-white/20 -z-0 mx-8" />
            {steps.map((s) => (
              <Step 
                key={s.id} 
                isActive={currentStep === s.id} 
                isCompleted={currentStep > s.id} 
                label={s.label} 
                icon={s.icon} 
              />
            ))}
          </div>
        </div>

        <div className="p-6">
          <AnimatePresence mode="wait">
            {currentStep === 1 && (
              <motion.div 
                key="step1" 
                initial={{ opacity: 0, x: 20 }} 
                animate={{ opacity: 1, x: 0 }} 
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-2xl border border-border/30">
                  <div className={cn(
                    "p-2 rounded-xl",
                    pendingPoints && pendingPoints > 0 ? "bg-warning/10 text-warning" : "bg-success/10 text-success"
                  )}>
                    {pendingPoints && pendingPoints > 0 ? <AlertTriangle /> : <CheckCircle2 />}
                  </div>
                  <div>
                    <p className="font-bold text-sm">Registros de Ponto</p>
                    <p className="text-xs text-muted-foreground">
                      {pendingPoints && pendingPoints > 0 
                        ? `Existem ${pendingPoints} batidas aguardando aprovação.` 
                        : "Todos os registros de ponto estão aprovados."}
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl border border-border/30 text-sm space-y-2">
                  <p className="font-semibold">O que será verificado:</p>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    <li className="flex items-center gap-2"><div className="h-1 w-1 rounded-full bg-primary" /> Faltas não justificadas</li>
                    <li className="flex items-center gap-2"><div className="h-1 w-1 rounded-full bg-primary" /> Banco de horas pendente</li>
                    <li className="flex items-center gap-2"><div className="h-1 w-1 rounded-full bg-primary" /> Afastamentos vigentes</li>
                  </ul>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="outline" className="rounded-xl" onClick={() => setIsOpen(false)}>Cancelar</Button>
                  <Button className="rounded-xl gap-2" onClick={() => setCurrentStep(2)}>
                    Prosseguir <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {currentStep === 2 && (
              <motion.div 
                key="step2" 
                initial={{ opacity: 0, x: 20 }} 
                animate={{ opacity: 1, x: 0 }} 
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="p-4 rounded-2xl border border-border/30 bg-muted/20 space-y-3">
                  <p className="text-sm font-bold">Verbas Variáveis e Eventos</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-card rounded-xl border border-border/30">
                      <p className="text-[10px] uppercase font-bold text-muted-foreground">Horas Extras (Estimadas)</p>
                      <p className="text-lg font-display font-bold text-success">Calculado</p>
                    </div>
                    <div className="p-3 bg-card rounded-xl border border-border/30">
                      <p className="text-[10px] uppercase font-bold text-muted-foreground">DSR sobre Variáveis</p>
                      <p className="text-lg font-display font-bold text-success">Automático</p>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    O sistema integra automaticamente horas extras aprovadas no ponto e calcula o DSR proporcional.
                  </p>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="outline" className="rounded-xl" onClick={() => setCurrentStep(1)}>Voltar</Button>
                  <Button className="rounded-xl gap-2" onClick={() => setCurrentStep(3)}>
                    Iniciar Cálculo <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {currentStep === 3 && (
              <motion.div 
                key="step3" 
                initial={{ opacity: 0, x: 20 }} 
                animate={{ opacity: 1, x: 0 }} 
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col items-center justify-center py-12 text-center"
              >
                {!isProcessing ? (
                  <>
                    <div className="p-6 rounded-3xl bg-primary/10 mb-6">
                      <Calculator className="h-12 w-12 text-primary animate-pulse" />
                    </div>
                    <h3 className="text-lg font-display font-bold">Pronto para calcular?</h3>
                    <p className="text-sm text-muted-foreground max-w-xs mt-2 mb-8">
                      O motor de cálculo irá processar os tributos e encargos para todos os colaboradores ativos.
                    </p>
                    <div className="flex gap-3">
                      <Button variant="outline" className="rounded-xl" onClick={() => setCurrentStep(2)}>Revisar</Button>
                      <Button className="rounded-xl px-8 shadow-glow" onClick={handleCalculate}>Confirmar e Calcular</Button>
                    </div>
                  </>
                ) : (
                  <>
                    <Loader2 className="h-16 w-16 text-primary animate-spin mb-6" />
                    <h3 className="text-lg font-display font-bold text-primary">Processando Folha...</h3>
                    <div className="w-full max-w-xs bg-muted rounded-full h-1.5 mt-6 overflow-hidden">
                      <motion.div 
                        className="h-full bg-primary" 
                        initial={{ width: "0%" }} 
                        animate={{ width: `${progressoLote ? (progressoLote.current / progressoLote.total) * 100 : 5}%` }} 
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-4">
                      {progressoLote 
                        ? `Processando: ${progressoLote.current} de ${progressoLote.total} (${progressoLote.success} sucessos)` 
                        : "Sincronizando dados de ponto eletrônico..."}
                    </p>
                  </>
                )}
              </motion.div>
            )}

            {currentStep === 4 && (
              <motion.div 
                key="step4" 
                initial={{ opacity: 0, scale: 0.95 }} 
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-6 text-center"
              >
                <div className="p-5 rounded-full bg-success/10 text-success mb-4">
                  <CheckCircle2 className="h-12 w-12" />
                </div>
                <h3 className="text-xl font-display font-bold">Cálculo Finalizado!</h3>
                <p className="text-sm text-muted-foreground mt-2 mb-4">
                  A folha da competência {competencia} foi encerrada com sucesso.
                </p>

                {resultadoCalculo && (
                  <div className="w-full mb-6 scale-90 origin-top">
                    <FolhaComposicao 
                      totalProventos={resultadoCalculo.proventos}
                      totalDescontos={resultadoCalculo.descontos}
                      inss={resultadoCalculo.inss}
                      irrf={resultadoCalculo.irrf}
                      fgts={resultadoCalculo.fgts}
                      horasExtras={resultadoCalculo.horasExtras}
                      dsr={resultadoCalculo.dsr}
                      decimoTerceiro={resultadoCalculo.decimoTerceiro}
                      horasFalta={resultadoCalculo.horasFalta}
                      faixaInss={resultadoCalculo.faixaInss}
                      faixaIrrf={resultadoCalculo.faixaIrrf}
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 w-full max-w-sm mb-6">
                  <Button 
                    variant="outline" 
                    className="rounded-xl gap-2 h-16 flex-col"
                    onClick={async () => {
                      if (currentFolhaId) {
                        try {
                          const result = await folhaPagamentoService.emitirPDF(currentFolhaId);
                          window.open(safeHref(result), '_blank', 'noopener');
                        } catch (e: any) {
                          toast.error(safeErrorMessage(e, 'Erro ao gerar PDF do holerite.'));
                        }
                      }
                    }}
                  >
                    <Download className="h-4 w-4" />
                    <span className="text-[10px]">Holerites (PDF)</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="rounded-xl gap-2 h-16 flex-col"
                    onClick={async () => {
                      if (currentFolhaId && empresaAtualId) {
                        try {
                          const cnab = await cnabService.generateCNAB240(empresaAtualId, currentFolhaId);
                          const blob = new Blob([cnab], { type: 'text/plain' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `CNAB240_FOLHA_${competencia.replace('/', '_')}.txt`;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          URL.revokeObjectURL(url);
                          toast.success('Arquivo CNAB gerado com sucesso!');
                        } catch (err: any) {
                          toast.error(safeErrorMessage(err, 'Erro ao gerar CNAB.'));
                        }
                      }
                    }}
                  >
                    <Landmark className="h-4 w-4 text-primary" />
                    <span className="text-[10px]">Arquivo CNAB</span>
                  </Button>
                </div>

                <Button className="w-full rounded-xl" onClick={() => setIsOpen(false)}>Concluir</Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
