import { PageTitle } from '@/components/PageTitle';
import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Calculator, RefreshCw, Shield, Loader2, Banknote, Lock, History } from 'lucide-react';
import { edgeFunctionsService } from '@/services/edgeFunctionsService';
import { PageLayout } from '@/components/layout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useEmpresas } from '@/hooks/useEmpresas';
import { useIdempotencyKey } from '@/hooks/useIdempotencyKey';
import { auditLogger } from '@/utils/auditLogger';
import { useDataAccessLog } from '@/hooks/useDataAccessLog';
import { safeErrorMessage } from '@/utils/safeError';
import { Card, CardContent } from '@/components/ui/card';
import { FolhaKPIs, FolhaPipeline, FolhaValidationAlerts, FolhaComposicao, Simulador13Dialog, SimuladorWhatIf, CNABDialog, RelatorioContabilDialog, FGTSDigitalDashboard, RubricasDialog, CalculoFolhaWizard, PagamentoBancarioWizard, FolhaAuditTimeline, FolhaDashboard, FolhaESocialSync } from '@/components/folha';
import { folhaCalc } from '@/utils/folhaCalc';



/* ─── Helpers ─── */
function gerarCompetencias(): string[] {
  const competencias: string[] = [];
  const hoje = new Date();
  for (let i = -12; i <= 2; i++) {
    const data = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1);
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    competencias.push(`${mes}/${data.getFullYear()}`);
  }
  return competencias.reverse();
}

function getCompetenciaAtual(): string {
  const hoje = new Date();
  return `${String(hoje.getMonth() + 1).padStart(2, '0')}/${hoje.getFullYear()}`;
}

/* ─── Data Hook ─── */
interface FolhaResumo {
  id?: string;
  colaboradores: number;
  totalProventos: number;
  totalDescontos: number;
  liquido: number;
  inss: number;
  fgts: number;
  irrf: number;
  custoTotalEmpresa: number;
  status: Record<string, string>;
}

function useFolhaResumo(competencia: string, empresaId?: string) {
  return useQuery<FolhaResumo>({
    queryKey: ['folha-resumo', competencia, empresaId],
    queryFn: async () => {
      const [mes, ano] = competencia.split('/');
      const competenciaDB = `${ano}-${mes}`;
      
      const { data: folhaData, error } = await supabase
        .from('folha_itens')
        .select(`
          *,
          folha:folhas_pagamento(*)
        `)
        .eq('folha.competencia', competenciaDB)
        .eq('folha.empresa_id', empresaId!);

      if (error) throw error;

      const colaboradores = folhaData?.length || 0;
      const totalProventos = folhaData?.reduce((acc, f) => acc + (f.total_proventos || 0), 0) || 0;
      const totalDescontos = folhaData?.reduce((acc, f) => acc + (f.total_descontos || 0), 0) || 0;
      const inss = folhaData?.reduce((acc, f) => acc + (f.inss_mes || 0), 0) || 0;
      const irrf = folhaData?.reduce((acc, f) => acc + (f.irrf_mes || 0), 0) || 0;
      const fgts = folhaData?.reduce((acc, f) => acc + (f.fgts_mes || 0), 0) || 0;

      // Estimativa de Encargos Patronais (INSS Patronal + RAT + Terceiros ~ 27.8%)
      const inssPatronal = totalProventos * 0.278;
      const custoTotalEmpresa = totalProventos + inssPatronal + fgts;

      const hasData = colaboradores > 0;
      return {
        id: folhaData?.[0]?.folha_id,
        colaboradores, totalProventos, totalDescontos, inss, fgts, irrf,
        liquido: totalProventos - totalDescontos,
        custoTotalEmpresa,
        status: {
          ponto: hasData ? 'importado' : 'pendente',
          lancamentos: hasData ? 'conferido' : 'pendente',
          beneficios: hasData ? 'processado' : 'pendente',
          calculo: hasData ? 'executado' : 'pendente',
          conferencia: 'pendente',
          fechamento: (folhaData?.[0]?.folha as any)?.status || 'aberto',
        },
      };
    },
    enabled: !!empresaId,
    staleTime: 2 * 60 * 1000,
  });
}

/* ─── Main Page ─── */
export default function FolhaPagamentoPage() {
  const { empresaAtual } = useEmpresas();
  const competencias = useMemo(() => gerarCompetencias(), []);
  const [competencia, setCompetencia] = useState(getCompetenciaAtual());
  const { data: resumo, isLoading, refetch } = useFolhaResumo(competencia, empresaAtual?.id);
  const queryClient = useQueryClient();
  const [calcServidor, setCalcServidor] = useState(false);

  useDataAccessLog('folhas_pagamento', resumo?.id, empresaAtual?.id);

  const calcularFolha = useMutation({
    mutationFn: async (comp: string) => {
      const [mes, ano] = comp.split('/');
      const competenciaDB = `${ano}-${mes}`;
      const { data: existing } = await supabase.from('folhas_pagamento').select('id').eq('competencia', competenciaDB).maybeSingle();
      if (existing) {
        const { data, error } = await supabase.from('folhas_pagamento')
          .update({ status: 'calculada' as const, data_calculo: new Date().toISOString() })
          .eq('id', existing.id).select().single();
        if (error) throw error;
        return data;
      }
      const { data, error } = await supabase.from('folhas_pagamento')
        .insert({ competencia: competenciaDB, tipo: 'mensal' }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folha-resumo', competencia] });
      toast.success('Folha calculada com sucesso!');
    },
    onError: (error: Error) => toast.error(safeErrorMessage(error, 'Erro na operação da folha.')),
  });

  const { key: idemKey, reset: idemReset } = useIdempotencyKey();
  const calcularFolhaServidor = async () => {
    setCalcServidor(true);
    const [mes, ano] = competencia.split('/');
    const empresaId = empresaAtual?.id || '';
    const compServer = `${ano}-${mes}`;
    const intent = `calcular-folha:${empresaId}:${compServer}`;
    try {
      await edgeFunctionsService.calcularFolha({
        empresaId,
        competencia: compServer,
        idempotencyKey: idemKey(intent),
      });
      idemReset(intent); // sucesso → habilita nova operação legítima
      queryClient.invalidateQueries({ queryKey: ['folha-resumo', competencia] });
      toast.success('Folha calculada no servidor com sucesso!');
    } catch (err: any) {
      // Falha: mantém a mesma chave para permitir REPLAY seguro em retry manual
      toast.error(safeErrorMessage(err, 'Erro ao calcular folha no servidor.'));
    } finally {
      setCalcServidor(false);
    }
  };

  const encerrarFolha = useMutation({
    mutationFn: async () => {
      if (!resumo?.id) throw new Error('Nenhuma folha encontrada para encerramento');
      const { data, error } = await supabase.from('folhas_pagamento')
        .update({ status: 'fechada' as any, data_fechamento: new Date().toISOString() })
        .eq('id', resumo.id).select().single();
      if (error) throw error;
      
      await auditLogger.log({
        tabela: 'folhas_pagamento',
        registro_id: resumo.id,
        acao: 'UPDATE',
        dados_novos: { status: 'fechada', evento: 'ENCERRAMENTO_FOLHA' }
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folha-resumo', competencia] });
      toast.success('Folha de pagamento encerrada com sucesso!');
    },
    onError: (error: Error) => toast.error(safeErrorMessage(error, 'Erro na operação da folha.')),
  });


  return (
    <>
      <PageTitle title="Cálculo de Folha" description="Processamento de folha de pagamento" />
      <PageLayout
        title="Processamento de Folha"
        description={`Competência ${competencia}`}
        icon={<Banknote className="h-5 w-5 text-primary-foreground" />}
        gradient="from-primary to-primary-glow"
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={competencia} onValueChange={setCompetencia}>
              <SelectTrigger className="w-[130px] rounded-xl" aria-label="Selecionar competência">
                <SelectValue placeholder="Mês/Ano" />
              </SelectTrigger>
              <SelectContent>
                {competencias.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="rounded-xl" aria-label="Atualizar dados">
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            </Button>
            <Button variant="outline" size="sm" className="rounded-xl gap-1.5 font-body">
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline">Importar Ponto</span>
            </Button>
            <CalculoFolhaWizard competencia={competencia} />
            <Button
              size="sm" variant="outline"
              onClick={calcularFolhaServidor}
              disabled={calcServidor}
              className="rounded-xl gap-1.5 font-body"
            >
              {calcServidor ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
              <span className="hidden sm:inline">Servidor</span>
            </Button>
            <RubricasDialog />
            <Simulador13Dialog />
            <SimuladorWhatIf />
            <Button
              size="sm" 
              variant="outline"
              onClick={() => encerrarFolha.mutate()}
              disabled={encerrarFolha.isPending || resumo?.status?.fechamento === 'fechado'}
              className="rounded-xl gap-1.5 font-body border-destructive/30 text-destructive hover:bg-destructive/10"
            >
              {encerrarFolha.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
              <span className="hidden sm:inline">Encerrar</span>
            </Button>
            {resumo?.id && <PagamentoBancarioWizard folhaId={resumo.id} />}
            {resumo?.id && <CNABDialog folhaId={resumo.id} />}
            {resumo?.id && <RelatorioContabilDialog folhaId={resumo.id} />}
          </div>
        }
      >
        <FolhaKPIs resumo={resumo} isLoading={isLoading} />
        
        {!isLoading && <FolhaDashboard competencia={competencia} />}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {resumo && <FolhaPipeline status={resumo.status} competencia={competencia} />}
            
            {!isLoading && resumo && <FolhaValidationAlerts resumo={resumo} competencia={competencia} />}

            {!isLoading && resumo && resumo.colaboradores > 0 && (
              <FolhaComposicao
                totalProventos={resumo.totalProventos}
                inss={resumo.inss}
                irrf={resumo.irrf}
                fgts={resumo.fgts}
                totalDescontos={resumo.totalDescontos}
                faixaInss="Progressiva"
                faixaIrrf="Progressiva"
              />
            )}
          </div>
          
          <div className="space-y-6">
            <FolhaESocialSync competencia={competencia} />
            <FolhaAuditTimeline competencia={competencia} />
            <Card className="border border-border/30 rounded-2xl bg-primary/5">
              <CardContent className="p-4 flex items-center gap-3">
                <Shield className="h-5 w-5 text-primary" />
                <div>
                   <p className="text-xs font-bold">Cálculo Auditado</p>
                   <p className="text-[10px] text-muted-foreground">Motor de cálculo validado pela Portaria 671 MTP.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        
        <FGTSDigitalDashboard />

      </PageLayout>
    </>
  );
}
