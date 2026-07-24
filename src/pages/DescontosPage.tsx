import { PageTitle } from '@/components/PageTitle';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageLayout } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresas } from '@/hooks';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/utils/safeError';
import {
  TrendingDown, Landmark, Wallet, Sparkles
} from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { FinancialSummaryCards } from '@/components/descontos/FinancialSummaryCards';
import { EmprestimosTable } from '@/components/descontos/EmprestimosTable';
import { AdiantamentosTable } from '@/components/descontos/AdiantamentosTable';
import { NewLoanDialog } from '@/components/descontos/NewLoanDialog';
import { NewAdvanceDialog } from '@/components/descontos/NewAdvanceDialog';

export default function DescontosPage() {
  const { empresaAtual } = useEmpresas();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState('emprestimos');

  const { data: colaboradores = [] } = useQuery({
    queryKey: ['colaboradores-descontos', empresaAtual?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('colaboradores').select('id, nome_completo').eq('empresa_id', empresaAtual?.id as string).eq('status', 'ativo');
      if (error) throw error;
      return data || [];
    },
    enabled: !!empresaAtual?.id,
  });

  const { data: emprestimos = [], isLoading: loadEmp } = useQuery({
    queryKey: ['emprestimos-consignados', empresaAtual?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('emprestimos_consignados')
        .select('*, colaborador:colaboradores(nome_completo)')
        .eq('empresa_id', empresaAtual?.id as string);
      if (error) throw error;
      return data || [];
    },
    enabled: !!empresaAtual?.id,
  });

  const { data: adiantamentos = [], isLoading: loadAdi } = useQuery({
    queryKey: ['adiantamentos-salariais', empresaAtual?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('adiantamentos_salariais')
        .select('*, colaborador:colaboradores(nome_completo)')
        .eq('empresa_id', empresaAtual?.id as string);
      if (error) throw error;
      return data || [];
    },
    enabled: !!empresaAtual?.id,
  });

  const criarEmprestimo = useMutation({
    mutationFn: async (values: any) => {
      const { error } = await supabase.from('emprestimos_consignados').insert({
        ...values,
        empresa_id: empresaAtual?.id,
        status: 'ativo'
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['emprestimos-consignados'] });
      toast.success('Empréstimo registrado com sucesso!');
    },
    onError: (err: any) => toast.error(safeErrorMessage(err, 'Erro ao registrar empréstimo.')),
  });

  const criarAdiantamento = useMutation({
    mutationFn: async (values: any) => {
      const { error } = await supabase.from('adiantamentos_salariais').insert({
        ...values,
        empresa_id: empresaAtual?.id,
        status: 'pendente'
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['adiantamentos-salariais'] });
      toast.success('Solicitação de adiantamento enviada!');
    },
    onError: (err: any) => toast.error(safeErrorMessage(err, 'Erro ao solicitar adiantamento.')),
  });

  const atualizarStatusAdiantamento = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: string }) => {
      const { error } = await supabase
        .from('adiantamentos_salariais')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['adiantamentos-salariais'] });
      toast.success('Status atualizado');
    }
  });

  const fmt = (v: number | null) => v ? `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'R$ 0,00';

  const cn = (...inputs: any[]) => inputs.filter(Boolean).join(' ');

  return (
    <>
      <PageTitle 
        title="Saúde Financeira" 
        description="Gestão de consignados, adiantamentos e bem-estar do colaborador" 
      />
      <PageLayout 
        title="Hub de Descontos Estratégicos" 
        description="Controle de margem consignável e conformidade com a Lei 10.820"
        icon={<TrendingDown className="h-5 w-5 text-primary-foreground" />}
      >
        <div className="flex items-center gap-2 mb-6 p-3 bg-primary/5 rounded-xl border border-primary/10">
          <Sparkles className="h-4 w-4 text-primary animate-pulse" />
          <span className="text-xs font-bold text-primary uppercase tracking-tighter">Financial Wellness Hub 10/10 Ativado</span>
        </div>

        <FinancialSummaryCards 
          emprestimos={emprestimos as any} 
          adiantamentos={adiantamentos as any} 
          fmt={fmt} 
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="flex items-center justify-between">
            <TabsList className="bg-muted/50 p-1 rounded-xl">
              <TabsTrigger value="emprestimos" className="rounded-lg gap-2">
                <Landmark className="h-4 w-4" /> Empréstimos
              </TabsTrigger>
              <TabsTrigger value="adiantamentos" className="rounded-lg gap-2">
                <Wallet className="h-4 w-4" /> Adiantamentos
              </TabsTrigger>
            </TabsList>

            <div className="flex gap-2">
              {activeTab === 'emprestimos' ? (
                <NewLoanDialog colaboradores={colaboradores} onSave={(v: any) => criarEmprestimo.mutate(v)} />
              ) : (
                <NewAdvanceDialog colaboradores={colaboradores} onSave={(v: any) => criarAdiantamento.mutate(v)} />
              )}
            </div>
          </div>

          <TabsContent value="emprestimos" className="space-y-4">
            <Card className="border-none shadow-xs overflow-hidden rounded-2xl">
              <CardContent className="p-0">
                {loadEmp ? <div className="p-12 flex justify-center"><Spinner /></div> : (
                  <EmprestimosTable emprestimos={emprestimos} fmt={fmt} />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="adiantamentos" className="space-y-4">
            <Card className="border-none shadow-xs overflow-hidden rounded-2xl">
              <CardContent className="p-0">
                {loadAdi ? <div className="p-12 flex justify-center"><Spinner /></div> : (
                  <AdiantamentosTable 
                    adiantamentos={adiantamentos} 
                    fmt={fmt} 
                    onUpdateStatus={(v: any) => atualizarStatusAdiantamento.mutate(v)} 
                    cn={cn}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </PageLayout>
    </>
  );
}
