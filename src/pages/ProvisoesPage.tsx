import { PageTitle } from '@/components/PageTitle';
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageLayout } from '@/components/layout';
import { DataTableToolbar } from '@/components/ui/data-table-toolbar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyList, EmptyState } from '@/components/ui/empty-state';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { provisaoService } from '@/services';
import { Calculator, Wallet, TrendingUp, Landmark, PieChart, Info, Download, FileText, FileSpreadsheet, History, BarChart3, ShieldCheck, Activity, AlertCircle, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
  Legend
} from 'recharts';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { AnimatedNumber } from '@/components/dashboard/AnimatedNumber';
import { useEmpresas } from '@/hooks/useEmpresas';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/utils/safeError';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { exportPontoCSV, exportPontoPDF } from '@/services/exportService';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { currentCompetenciaLocal } from '@/utils/dateLocal';
import type { LooseRow } from '@/types/db';
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export default function ProvisoesPage() {
  const [competencia, setCompetencia] = useState(currentCompetenciaLocal());
  const [selectedLog, setSelectedLog] = useState<LooseRow<'provisao_logs'> | null>(null);
  const { empresaAtual } = useEmpresas();
  const queryClient = useQueryClient();

  const { data: provisoes, isLoading } = useQuery({
    queryKey: ['provisoes', empresaAtual?.id, competencia],
    queryFn: () => provisaoService.list(empresaAtual!.id, `${competencia}-01`),
    enabled: !!empresaAtual?.id,
  });


  const { data: inconsistencias } = useQuery({
    queryKey: ['provisao-inconsistencias', empresaAtual?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('colaboradores')
        .select('id, nome_completo')
        .eq('empresa_id', empresaAtual?.id as string)
        .eq('status', 'ativo')
        .or('salario_base.is.null,salario_base.eq.0');
      if (error) throw error;
      return data;
    },
    enabled: !!empresaAtual?.id
  });


  const mutation = useMutation({
    mutationFn: () => provisaoService.calcular(empresaAtual!.id, `${competencia}-01`),
    onSuccess: (data) => {
      toast.success(data.message || 'Provisões calculadas com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['provisoes'] });
    },
    onError: (error: any) => {
      toast.error(safeErrorMessage(error, 'Erro ao calcular provisões.'));
    }
  });

  const handleCalcular = () => {
    if (!empresaAtual?.id) {
      toast.error('Selecione uma empresa primeiro.');
      return;
    }
    mutation.mutate();
  };

  const totals = (provisoes || []).reduce(
    (acc, p) => ({
      principal: acc.principal + Number(p.valor_principal || 0),
      inss: acc.inss + Number(p.encargos_inss || 0),
      fgts: acc.fgts + Number(p.encargos_fgts || 0),
      total: acc.total + Number(p.total || 0),
    }),
    { principal: 0, inss: 0, fgts: 0, total: 0 }
  );

  const handleExport = (format: 'csv' | 'pdf') => {
    if (!provisoes || provisoes.length === 0) {
      toast.error('Não há dados para exportar.');
      return;
    }

    const dataToExport = provisoes.map(p => ({
      colaborador: (p.colaborador as any)?.nome_completo || 'N/A',
      tipo: p.tipo === 'ferias' ? 'Férias + 1/3' : '13º Salário',
      valor_principal: p.valor_principal,
      encargos_inss: p.encargos_inss,
      encargos_fgts: p.encargos_fgts,
      total: p.total
    }));

    if (format === 'csv') {
      exportPontoCSV(dataToExport, `provisoes-${competencia}.csv`);
    } else {
      exportPontoPDF(
        dataToExport, 
        `Relatório de Provisões - ${competencia}`, 
        ['colaborador', 'tipo', 'valor_principal', 'encargos_inss', 'encargos_fgts', 'total']
      );
    }
    toast.success('Relatório exportado com sucesso!');
  };

  const { data: auditLogs } = useQuery({
    queryKey: ['provisao-logs', empresaAtual?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('provisao_logs')
        .select('*')
        .eq('empresa_id', empresaAtual?.id as string)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: !!empresaAtual?.id
  });


  const { data: trendData } = useQuery({
    queryKey: ['provisao-trend', empresaAtual?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('provisao_logs')
        .select('competencia, valor_total_provisionado')
        .eq('empresa_id', empresaAtual?.id as string)
        .eq('status', 'CONCLUIDO')
        .order('competencia', { ascending: true })
        .limit(6);
      if (error) throw error;
      return data;
    },
    enabled: !!empresaAtual?.id
  });


  return (
    <>
      <PageTitle title="Provisões Mensais" description="Gestão de provisões de férias e 13º salário" />
      <PageLayout
        title="Provisões Mensais"
        description="Acompanhamento de provisões de férias, 13º e encargos"
        icon={<Wallet className="h-5 w-5 text-primary-foreground" />}
        gradient="from-primary-glow to-primary"
        actions={
          <Button 
            onClick={handleCalcular} 
            disabled={mutation.isPending}
            className="rounded-xl bg-gradient-to-r from-primary-glow to-primary hover:opacity-90 shadow-lg font-body gap-1.5"
          >
            {mutation.isPending ? <Spinner size="sm" className="text-primary-foreground" /> : <Calculator className="h-4 w-4" />}
            Calcular Provisões
          </Button>
        }
      >
        <Tabs defaultValue="relatorio" className="space-y-6">
          <TabsList className="bg-muted/50 p-1 rounded-xl">
            <TabsTrigger value="relatorio" className="rounded-lg">Relatório Consolidado</TabsTrigger>
            <TabsTrigger value="auditoria" className="rounded-lg">Logs e Auditoria</TabsTrigger>
          </TabsList>

          <TabsContent value="relatorio" className="space-y-6">
            {inconsistencias && inconsistencias.length > 0 && (
              <Card className="border-warning/30 bg-warning/5 rounded-2xl overflow-hidden shadow-xs">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-warning/10 text-warning">
                      <AlertCircle className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-warning-foreground">Inconsistências Detectadas</p>
                      <p className="text-xs text-muted-foreground">{inconsistencias.length} colaboradores ativos estão sem salário base definido. As provisões para estes colaboradores serão zero.</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="h-8 text-xs rounded-xl border-warning/20 hover:bg-warning/10 text-warning-foreground" onClick={() => window.location.href = '/colaboradores'}>
                    Corrigir
                  </Button>
                </CardContent>
              </Card>
            )}

            {!isLoading && provisoes && provisoes.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Total Provisionado', value: totals.total, icon: Wallet, gradient: 'from-primary to-primary-glow' },
                  { label: 'Valor Principal', value: totals.principal, icon: TrendingUp, gradient: 'from-success to-success/70' },
                  { label: 'Encargos INSS', value: totals.inss, icon: Landmark, gradient: 'from-blue-500 to-blue-400' },
                  { label: 'Encargos FGTS', value: totals.fgts, icon: PieChart, gradient: 'from-amber-500 to-amber-400' },
                ].map((kpi, i) => (
                  <motion.div key={kpi.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                    <Card className="border border-border/30 rounded-2xl overflow-hidden">
                      <div className={cn("h-[2px] bg-gradient-to-r", kpi.gradient)} />
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-1">
                          <div className={cn("p-1.5 rounded-lg bg-gradient-to-br", kpi.gradient)}>
                            <kpi.icon className="h-3 w-3 text-primary-foreground" />
                          </div>
                        </div>
                        <p className="text-xl font-display font-bold">
                          <AnimatedNumber value={kpi.value} format={formatCurrency} />
                        </p>
                        <p className="text-xs text-muted-foreground font-body">{kpi.label}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}

            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-muted/20 p-4 rounded-2xl border border-border/30">
              <div className="flex items-center gap-3">
                <span className="text-sm font-body font-medium text-muted-foreground whitespace-nowrap">Referência:</span>
                <input 
                  type="month" 
                  value={competencia} 
                  onChange={(e) => setCompetencia(e.target.value)}
                  className="bg-background border border-border/40 rounded-lg px-3 py-1.5 text-sm font-body focus:ring-2 focus:ring-primary/20 outline-hidden transition-all"
                />
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-9 gap-1.5 rounded-xl" onClick={() => handleExport('csv')}>
                  <FileSpreadsheet className="h-4 w-4" /> CSV
                </Button>
                <Button variant="outline" size="sm" className="h-9 gap-1.5 rounded-xl" onClick={() => handleExport('pdf')}>
                  <FileText className="h-4 w-4" /> PDF
                </Button>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 px-3 py-1.5 rounded-full border border-border/30">
                        <Info className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Base 1/12</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>O provisionamento inclui 1/3 de férias. Encargos: INSS (27,8%) e FGTS (8%).</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>

            {trendData && trendData.length > 1 && (
              <Card className="border border-border/30 rounded-2xl overflow-hidden shadow-xs bg-muted/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-display flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
                    <BarChart3 className="h-3.5 w-3.5" /> Tendência de Provisões (Últimos Meses)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                        <XAxis dataKey="competencia" fontSize={10} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                        <YAxis fontSize={10} tick={{ fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `R$${v / 1000}k`} />
                        <RechartsTooltip 
                          formatter={(v: any) => formatCurrency(v)}
                          contentStyle={{ backgroundColor: 'hsl(var(--background))', borderRadius: '12px', border: '1px solid hsl(var(--border))' }}
                        />
                        <Bar dataKey="valor_total_provisionado" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={40}>
                          {trendData.map((_, index) => (
                            <Cell key={`cell-${index}`} fillOpacity={0.8 + (index / trendData.length) * 0.2} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {isLoading ? (
              <div className="flex justify-center p-12"><Spinner size="lg" /></div>
            ) : !provisoes?.length ? (
              <EmptyState 
                icon={Wallet}
                title="Nenhuma provisão encontrada"
                description="Não há provisões calculadas para esta competência."
                action={{ label: 'Calcular Provisões', onClick: handleCalcular }} 
              />
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border border-border/30 overflow-hidden shadow-elevated bg-card">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableHead className="font-display font-semibold">Colaborador</TableHead>
                      <TableHead className="font-display font-semibold">Tipo</TableHead>
                      <TableHead className="font-display font-semibold text-right">Principal</TableHead>
                      <TableHead className="font-display font-semibold text-right">INSS</TableHead>
                      <TableHead className="font-display font-semibold text-right">FGTS</TableHead>
                      <TableHead className="font-display font-semibold text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {provisoes.map((p) => (
                      <TableRow key={p.id} className="hover:bg-accent/30 transition-colors group">
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-body font-semibold">{(p.colaborador as any)?.nome_completo || 'N/A'}</span>
                            <span className="text-[10px] text-muted-foreground uppercase">Salário: {formatCurrency((p.colaborador as any)?.salario_base || 0)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="capitalize font-body text-xs text-muted-foreground">
                          {p.tipo === 'ferias' ? 'Férias + 1/3' : '13º Salário'}
                        </TableCell>
                        <TableCell className="text-right font-body tabular-nums text-xs">{formatCurrency(p.valor_principal)}</TableCell>
                        <TableCell className="text-right font-body text-muted-foreground tabular-nums text-[10px]">{formatCurrency(p.encargos_inss)}</TableCell>
                        <TableCell className="text-right font-body text-muted-foreground tabular-nums text-[10px]">{formatCurrency(p.encargos_fgts)}</TableCell>
                        <TableCell className="text-right font-display font-bold tabular-nums text-primary">{formatCurrency(p.total || 0)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </motion.div>
            )}
          </TabsContent>

          <TabsContent value="auditoria" className="space-y-6">
            <Card className="border border-border/30 rounded-2xl overflow-hidden shadow-xs">
              <CardHeader className="bg-muted/30 pb-4">
                <CardTitle className="text-sm font-display flex items-center gap-2">
                  <History className="h-4 w-4 text-primary" /> Histórico de Execuções (Edge Function)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Data/Hora</TableHead>
                      <TableHead className="text-xs">Competência</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs">Duração</TableHead>
                      <TableHead className="text-xs">Colaboradores</TableHead>
                      <TableHead className="text-xs text-right">Valor Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!auditLogs?.length ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-xs text-muted-foreground">Nenhum log disponível</TableCell>
                      </TableRow>
                    ) : (
                      auditLogs.map((log: any) => (
                        <TableRow key={log.id} className="text-xs cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setSelectedLog(log)}>
                          <TableCell className="font-medium">{new Date(log.created_at).toLocaleString('pt-BR')}</TableCell>
                          <TableCell>{log.competencia}</TableCell>
                          <TableCell>
                            <Badge variant={log.status === 'CONCLUIDO' ? 'success' : log.status === 'ERRO' ? 'destructive' : 'secondary'} className="text-[10px] px-1.5 h-5">
                              {log.status === 'CONCLUIDO' ? <ShieldCheck className="h-3 w-3 mr-1" /> : log.status === 'PROCESSANDO' ? <Activity className="h-3 w-3 mr-1 animate-spin" /> : <AlertCircle className="h-3 w-3 mr-1" />}
                              {log.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{log.duracao_ms ? `${log.duracao_ms}ms` : '-'}</TableCell>
                          <TableCell className="font-medium">{log.total_colaboradores || 0}</TableCell>
                          <TableCell className="text-right font-mono font-bold text-primary">{formatCurrency(log.valor_total_provisionado || 0)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {selectedLog && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-xs z-50 flex items-center justify-center p-4" onClick={() => setSelectedLog(null)}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              className="bg-card border border-border/40 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden" 
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-muted/30 p-4 border-b border-border/40 flex items-center justify-between">
                <h3 className="font-display font-bold flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" /> Detalhes da Auditoria
                </h3>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setSelectedLog(null)} aria-label="Fechar"><X className="h-4 w-4" /></Button>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-muted/20 rounded-xl border border-border/30">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Status</p>
                    <Badge variant={selectedLog.status === 'CONCLUIDO' ? 'success' : 'destructive'} className="text-[10px]">
                      {selectedLog.status}
                    </Badge>
                  </div>
                  <div className="p-3 bg-muted/20 rounded-xl border border-border/30">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Duração</p>
                    <p className="text-sm font-mono">{selectedLog.duracao_ms || 0}ms</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">Rastreabilidade Técnica (JSON)</p>
                  <pre className="p-4 bg-slate-950 text-slate-400 rounded-xl text-[10px] overflow-auto max-h-48 font-mono">
                    {JSON.stringify(selectedLog.metadados, null, 2)}
                  </pre>
                </div>

                <div className="flex items-center gap-2 text-[10px] text-muted-foreground bg-info/5 p-3 rounded-xl border border-info/10">
                  <Info className="h-3.5 w-3.5 text-info" />
                  <span>Este registro é imutável e serve como prova de execução para auditorias de conformidade.</span>
                </div>
              </div>
              <div className="bg-muted/30 p-4 flex justify-end">
                <Button variant="secondary" size="sm" className="rounded-xl" onClick={() => setSelectedLog(null)}>Fechar</Button>
              </div>
            </motion.div>
          </div>
        )}
      </PageLayout>
    </>
  );
}
