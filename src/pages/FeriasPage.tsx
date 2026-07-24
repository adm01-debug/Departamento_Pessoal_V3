import { PageTitle } from '@/components/PageTitle';
import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { PageLayout } from '@/components/layout';
import { DataTableToolbar } from '@/components/ui/data-table-toolbar';
import { EmptyList } from '@/components/ui/empty-state';
import { TableSkeleton } from '@/components/ui/module-skeleton';
import { FeriasKPIs, FeriasTable, FeriasDashboard, FeriasInsights, FeriasAlertasPagamentoCard, FeriasReconciliacaoCard, FeriasReconciliacaoHistoricoCard } from '@/components/ferias';
import { FeriasColetivasTab } from '@/components/ferias/FeriasColetivasTab';
import { FeriasRelatorioDialog } from '@/components/ferias/FeriasRelatorioDialog';
import { feriasPDF } from '@/utils/feriasPDF';
import { useFerias } from '@/hooks/useFerias';
import { feriasService, auditoriaService } from '@/services';
import { useFeriasAprovacao } from '@/hooks/useFeriasAprovacao';
import { useEmpresas } from '@/hooks/useEmpresas';
import { useDataAccessLog } from '@/hooks/useDataAccessLog';
import { Calendar, Calculator, Loader2, List, CalendarDays, History, LayoutDashboard, FileDown, RefreshCw, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { edgeFunctionsService } from '@/services/edgeFunctionsService';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarioFerias } from '@/components/ferias/CalendarioFerias';
import { GerenciamentoPeriodos } from '@/components/ferias/GerenciamentoPeriodos';
import { calculoFerias } from '@/utils/calculoFerias';
const statusOptions = [
  { value: 'pendente', label: 'Pendente' },
  { value: 'aprovada', label: 'Aprovada' },
  { value: 'rejeitada', label: 'Rejeitada' },
  { value: 'em_gozo', label: 'Em Gozo' },
  { value: 'concluida', label: 'Concluída' },
  { value: 'cancelada', label: 'Cancelada' },
];

export default function FeriasPage() {
  const { empresaAtual } = useEmpresas();
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;
  const [openCalc, setOpenCalc] = useState(false);
  const [calcLoading, setCalcLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [calcForm, setCalcForm] = useState({ salario: '', diasFerias: '30', diasAbono: '0' });
  const [calcResult, setCalcResult] = useState<Record<string, any> | null>(null);
  const queryClient = useQueryClient();
  
  const { ferias, totalCount, isLoading, refetch } = useFerias({
    page,
    limit,
    search: search.length >= 3 ? search : undefined,
    status: statusFilter
  });

  useDataAccessLog('ferias', empresaAtual?.id, empresaAtual?.id);

  // Auto-sync effect
  useEffect(() => {
    if (!empresaAtual?.id) return;
    
    const intervalId = setInterval(() => {
      feriasService.syncWithHub(empresaAtual.id).then((result) => {
        if (result.recordsUpdated > 0) {
          refetch();
          toast.info(`${result.recordsUpdated} registros atualizados via Hub`);
        } else {
          refetch();
        }
      }).catch(err => console.error('Erro no auto-sync:', err));
    }, 60000); // 1 minuto de intervalo fixo para precisão

    return () => clearInterval(intervalId);
  }, [empresaAtual?.id, refetch]);

  const { 
    aprovarGestor, 
    aprovarRH, 
    enviarContabilidade, 
    rejeitar, 
    cancelar 
  } = useFeriasAprovacao();

  const handleSync = async () => {
    if (!empresaAtual?.id) return;
    setSyncLoading(true);
    try {
      const { feriasService } = await import('@/services');
      const result = await feriasService.syncWithHub(empresaAtual.id);
      if (result.success) {
        await refetch();
        toast.success('Sincronização concluída com o hub unificado');
      }
    } catch (err) {
      toast.error('Falha ao sincronizar dados');
    } finally {
      setSyncLoading(false);
    }
  };

  const handleCalcFerias = async () => {
    setCalcLoading(true);
    // Instant client-side calculation for better UX
    const instant = calculoFerias.calcular({
      salarioBase: parseFloat(calcForm.salario) || 0,
      diasFerias: parseInt(calcForm.diasFerias) || 30,
      diasAbono: parseInt(calcForm.diasAbono) || 0
    });
    setCalcResult(instant);
    
    try {
      // Refresh with authoritative backend calculation
      const result = await edgeFunctionsService.calcularFerias({
        salario_base: parseFloat(calcForm.salario) || 0,
        dias_ferias: parseInt(calcForm.diasFerias) || 30,
        dias_abono: parseInt(calcForm.diasAbono) || 0,
      });
      setCalcResult(result as Record<string, any>);
      toast.success('Cálculo validado pelo servidor');
    } catch (err: any) {
      console.error('Erro no cálculo server-side:', err);
    } finally {
      setCalcLoading(false);
    }
  };

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const stats = {
    total: totalCount,
    pendentes: ferias?.filter((s: any) => s.status === 'pendente').length || 0, // This is local but we might want global stats
    aprovadas: ferias?.filter((s: any) => s.status === 'aprovada' || s.aprovado_rh).length || 0,
    emGozo: ferias?.filter((s: any) => s.status === 'em_gozo').length || 0,
    abonoPecuniario: ferias?.filter((s: any) => s.abono_pecuniario).length || 0,
    vencidas: ferias?.filter((s: any) => s.status === 'vencida').length || 0,
  };


  return (
    <>
    <PageTitle title="Férias" description="Gestão de férias dos colaboradores" />
    <PageLayout
      title="Férias"
      description="Gestão de férias com workflow de aprovação em 3 níveis"
      icon={<Calendar className="h-5 w-5 text-primary-foreground" />}
      gradient="from-primary-glow to-primary"
      actions={
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="rounded-xl gap-1.5 font-body"
            asChild
          >
            <a href="/ferias/programacao">
              <CalendarDays className="h-4 w-4" /> Programação Anual
            </a>
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            className="rounded-xl gap-1.5 font-body"
            onClick={handleSync}
            disabled={syncLoading}
          >
            {syncLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Sincronizar
          </Button>
          <FeriasRelatorioDialog stats={stats} data={ferias} filters={{ search, status: statusFilter }} />
          <Dialog open={openCalc} onOpenChange={setOpenCalc}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="rounded-xl gap-1.5 font-body">
                <Calculator className="h-4 w-4" />Simulador
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md rounded-2xl">
              <DialogHeader><DialogTitle className="flex items-center gap-2 font-display"><Calculator className="h-5 w-5" /> Simulador de Férias</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2"><Label className="font-body">Salário Base (R$)</Label><Input type="number" placeholder="5000.00" value={calcForm.salario} onChange={e => setCalcForm(p => ({ ...p, salario: e.target.value }))} className="rounded-xl" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label className="font-body">Dias de Férias</Label><Input type="number" min="1" max="30" value={calcForm.diasFerias} onChange={e => setCalcForm(p => ({ ...p, diasFerias: e.target.value }))} className="rounded-xl" /></div>
                  <div className="space-y-2"><Label className="font-body">Dias Abono</Label><Input type="number" min="0" max="10" value={calcForm.diasAbono} onChange={e => setCalcForm(p => ({ ...p, diasAbono: e.target.value }))} className="rounded-xl" /></div>
                </div>
                <Button onClick={handleCalcFerias} disabled={calcLoading || !calcForm.salario} className="w-full rounded-xl bg-gradient-to-r from-primary-glow to-primary font-body">
                  {calcLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Calculator className="h-4 w-4 mr-2" />}Calcular
                </Button>
                {calcResult && (
                  <Card className="border border-border/30 rounded-xl">
                    <CardContent className="p-4 space-y-2 text-sm font-body">
                      {calcResult.ferias_brutas != null && <div className="flex justify-between"><span>Férias Brutas:</span><span className="font-bold">{fmt(calcResult.ferias_brutas)}</span></div>}
                      {calcResult.terco_constitucional != null && <div className="flex justify-between"><span>1/3 Constitucional:</span><span className="font-bold">{fmt(calcResult.terco_constitucional)}</span></div>}
                      {calcResult.abono_pecuniario != null && calcResult.abono_pecuniario > 0 && <div className="flex justify-between"><span>Abono Pecuniário:</span><span className="font-bold">{fmt(calcResult.abono_pecuniario)}</span></div>}
                      {calcResult.inss != null && <div className="flex justify-between"><span>INSS:</span><span className="text-destructive">-{fmt(calcResult.inss)}</span></div>}
                      {calcResult.irrf != null && <div className="flex justify-between"><span>IRRF:</span><span className="text-destructive">-{fmt(calcResult.irrf)}</span></div>}
                      {calcResult.liquido != null && <div className="border-t border-border/30 pt-2 flex justify-between text-base font-bold"><span>Líquido:</span><span className="text-primary">{fmt(calcResult.liquido)}</span></div>}
                    </CardContent>
                  </Card>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      }
    >
      <div className="grid lg:grid-cols-4 gap-6 mb-8">
        <div className="lg:col-span-3">
          <FeriasKPIs stats={stats} />
        </div>
        <div className="lg:col-span-1">
          <FeriasInsights stats={stats} />
        </div>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="dashboard" className="rounded-lg gap-2 font-display">
            <LayoutDashboard className="h-4 w-4" /> Dashboard
          </TabsTrigger>
          <TabsTrigger value="solicitacoes" className="rounded-lg gap-2 font-display">
            <List className="h-4 w-4" /> Solicitações
          </TabsTrigger>
          <TabsTrigger value="calendario" className="rounded-lg gap-2 font-display">
            <CalendarDays className="h-4 w-4" /> Calendário
          </TabsTrigger>
          <TabsTrigger value="periodos" className="rounded-lg gap-2 font-display">
            <History className="h-4 w-4" /> Períodos Aquisitivos
          </TabsTrigger>
          <TabsTrigger value="coletivas" className="rounded-lg gap-2 font-display">
            <FileDown className="h-4 w-4" /> Coletivas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <FeriasAlertasPagamentoCard />
            <FeriasReconciliacaoCard />
          </div>
          <FeriasReconciliacaoHistoricoCard />
          <FeriasDashboard data={ferias} />
        </TabsContent>

        <TabsContent value="solicitacoes" className="space-y-6">
          <DataTableToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Buscar colaborador..."
            filters={[{ key: 'status', label: 'Status', options: statusOptions, value: statusFilter, onChange: setStatusFilter }]}
            onClearFilters={() => { setStatusFilter(''); setSearch(''); }}
          />

          {isLoading ? (
            <TableSkeleton rows={6} columns={7} />
          ) : !ferias?.length ? (
            <EmptyList entityName="solicitação de férias" />
          ) : (
            <>
              <div className="relative">
                {isLoading && ferias.length > 0 && (
                  <div className="absolute inset-0 bg-background/40 backdrop-blur-[1px] z-10 flex items-center justify-center rounded-2xl">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                )}
                <FeriasTable
                  data={ferias}
                  onAprovarGestor={(id) => aprovarGestor(id)}
                  onAprovarRH={(id) => aprovarRH(id)}
                  onEnviarContabilidade={(id) => enviarContabilidade(id)}
                  onRejeitar={(id) => rejeitar(id)}
                  onCancelar={(id) => cancelar(id)}
                />
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 px-2">
                <p className="text-xs text-muted-foreground order-2 sm:order-1">
                  Mostrando <span className="font-bold text-foreground">{(page - 1) * limit + 1}</span> a <span className="font-bold text-foreground">{Math.min(page * limit, totalCount)}</span> de <span className="font-bold text-foreground">{totalCount}</span> solicitações
                </p>
                <div className="flex items-center gap-2 order-1 sm:order-2">
                  <div className="flex items-center gap-1">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-8 w-8 p-0 rounded-lg hover:bg-primary/5 hover:text-primary transition-colors"
                      onClick={() => setPage(1)}
                      disabled={page === 1}
                      title="Primeira página"
                    >
                      <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-8 rounded-lg gap-1 px-3 hover:bg-primary/5 hover:text-primary transition-colors font-body"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Anterior
                    </Button>
                    
                    <div className="flex items-center gap-1 mx-2">
                      {(() => {
                        const totalPages = Math.ceil(totalCount / limit);
                        const pages = [];
                        let startPage = Math.max(1, page - 2);
                        const endPage = Math.min(totalPages, startPage + 4);
                        
                        if (endPage - startPage < 4) {
                          startPage = Math.max(1, endPage - 4);
                        }

                        for (let i = startPage; i <= endPage; i++) {
                          pages.push(
                            <Button
                              key={i}
                              variant={page === i ? "default" : "outline"}
                              size="sm"
                              className={`h-8 w-8 p-0 rounded-lg transition-all font-body ${
                                page === i 
                                  ? 'shadow-md shadow-primary/20 bg-gradient-to-r from-primary-glow to-primary border-none text-white' 
                                  : 'hover:bg-primary/5 hover:text-primary'
                              }`}
                              onClick={() => setPage(i)}
                            >
                              {i}
                            </Button>
                          );
                        }
                        return pages;
                      })()}
                    </div>

                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-8 rounded-lg gap-1 px-3 hover:bg-primary/5 hover:text-primary transition-colors font-body"
                      onClick={() => setPage(p => p + 1)}
                      disabled={page * limit >= totalCount}
                    >
                      Próxima
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-8 w-8 p-0 rounded-lg hover:bg-primary/5 hover:text-primary transition-colors"
                      onClick={() => setPage(Math.ceil(totalCount / limit))}
                      disabled={page * limit >= totalCount}
                      title="Última página"
                    >
                      <ChevronsRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="calendario">
          <CalendarioFerias />
        </TabsContent>

        <TabsContent value="periodos">
          <div className="grid gap-6">
            <GerenciamentoPeriodos />
          </div>
        </TabsContent>

        <TabsContent value="coletivas">
          <FeriasColetivasTab />
        </TabsContent>

      </Tabs>
    </PageLayout>

    </>
  );
}
