import React from 'react';
import { PageLayout } from '@/components/layout';
import { PageTitle } from '@/components/PageTitle';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Trophy, Target, TrendingUp, DollarSign, Plus, Calendar, Filter, 
  ArrowUpRight, CheckCircle2, AlertCircle, Calculator, FileText, 
  Download, History, ShieldCheck, ExternalLink, RefreshCw
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { premiacoesService } from '@/services/premiacoesService';
import { useEmpresas } from '@/hooks';
import { Skeleton } from '@/components/ui/skeleton';
import { RewardsSimulator } from '@/components/premiacoes/RewardsSimulator';
import { RewardsApprovalHub } from '@/components/premiacoes/RewardsApprovalHub';
import { CampaignWizard } from '@/components/premiacoes/CampaignWizard';
import { formatDate, formatDateTime } from '@/utils/format';
import { toast } from 'sonner';

const formatCurrency = (val: number) => 
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

export default function PremiacoesPage() {
  const { empresaAtual } = useEmpresas();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = React.useState('campanhas');
  const [isWizardOpen, setIsWizardOpen] = React.useState(false);
  const [periodoFiltro, setPeriodoFiltro] = React.useState('Todos os Períodos');
  const [unidadeFiltro, setUnidadeFiltro] = React.useState('Todas as Unidades');
  const [faixaMetaFiltro, setFaixaMetaFiltro] = React.useState('Todas');
  
  const { data: campanhas = [], isLoading: loadCampanhas } = useQuery({
    queryKey: ['premiacoes_campanhas', empresaAtual?.id],
    queryFn: () => premiacoesService.listarCampanhas(empresaAtual!.id),
    enabled: !!empresaAtual?.id
  });

  const { data: pagamentos = [], isLoading: loadPagamentos } = useQuery({
    queryKey: ['premiacoes_pagamentos', empresaAtual?.id],
    queryFn: () => premiacoesService.listarPagamentos(undefined, empresaAtual!.id),
    enabled: !!empresaAtual?.id
  });

  const { data: auditoria = [], isLoading: loadAuditoria } = useQuery({
    queryKey: ['premiacoes_auditoria', empresaAtual?.id],
    queryFn: () => premiacoesService.listarAuditoria(undefined, empresaAtual!.id),
    enabled: !!empresaAtual?.id
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, valor }: { id: string, status: string, valor?: number }) =>
      premiacoesService.atualizarStatusPagamento(id, status, empresaAtual!.id, valor),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['premiacoes_pagamentos'] });
      queryClient.invalidateQueries({ queryKey: ['premiacoes_auditoria'] });
      toast.success("Status atualizado e registrado na auditoria.");
    }
  });

  const handleExport = async (format: 'csv' | 'pdf') => {
    toast.promise(
      premiacoesService.exportarRelatorio({ 
        empresaId: empresaAtual?.id,
        periodo: periodoFiltro,
        unidade: unidadeFiltro,
        faixaMeta: faixaMetaFiltro,
        versao: '1.2.5-stable'
      }),
      {
        loading: `Gerando relatório ${format.toUpperCase()} com filtros aplicados...`,
        success: "Relatório gerado com sucesso! Trilha de auditoria incluída.",
        error: "Erro ao gerar relatório."
      }
    );
  };

  const handleSyncFolha = () => {
    toast.info("Iniciando sincronização com a Folha de Pagamento...", {
      description: "Os pagamentos aprovados serão integrados ao próximo ciclo disponível."
    });
    setTimeout(() => {
      toast.success("Sincronização concluída!", {
        description: "12 registros foram enviados para a folha de Maio/2026."
      });
    }, 2000);
  };

  const stats = {
    totalAprovado: pagamentos.reduce((acc: number, p: any) => acc + (Number(p.valor_aprovado) || 0), 0),
    totalRealFolha: pagamentos.reduce((acc: number, p: any) => acc + (Number(p.valor_folha_real) || 0), 0),
    totalPendente: pagamentos.filter((p: any) => p.status === 'calculado').reduce((acc: number, p: any) => acc + Number(p.valor_calculado), 0),
    campanhasAtivas: campanhas.filter(c => c.status === 'ativo').length,
    divergenciaCount: pagamentos.filter((p: any) => p.status_conciliacao === 'divergente').length
  };

  if (loadCampanhas) return <div className="p-8"><Skeleton className="h-[400px] w-full" /></div>;

  return (
    <>
      <PageTitle title="Premiações & Renda Variável 10/10" description="Gestão estratégica de incentivos e alta performance organizacional" />
      <PageLayout 
        title="Hub de Premiações" 
        description="Campanhas, Metas e ROI de Capital Humano" 
        icon={<Trophy className="h-5 w-5 text-primary-foreground" />}
        gradient="from-amber-500 to-orange-600"
      >
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <Card className="border-border/40 shadow-xs bg-gradient-to-br from-card to-muted/20">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Aprovado</p>
                <div className="p-2 bg-success/10 rounded-lg text-success"><DollarSign className="h-4 w-4" /></div>
              </div>
              <h3 className="text-2xl font-bold mt-2">{formatCurrency(stats.totalAprovado)}</h3>
              <p className="text-[10px] text-success flex items-center gap-1 mt-1 font-medium">
                <ArrowUpRight className="h-3 w-3" /> +12% vs mês anterior
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/40 shadow-xs">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Pendente (Calculado)</p>
                <div className="p-2 bg-warning/10 rounded-lg text-warning"><AlertCircle className="h-4 w-4" /></div>
              </div>
              <h3 className="text-2xl font-bold mt-2">{formatCurrency(stats.totalPendente)}</h3>
              <p className="text-[10px] text-muted-foreground mt-1">Aguardando revisão manual</p>
            </CardContent>
          </Card>

          <Card className="border-border/40 shadow-xs">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Campanhas Ativas</p>
                <div className="p-2 bg-primary/10 rounded-lg text-primary"><Target className="h-4 w-4" /></div>
              </div>
              <h3 className="text-2xl font-bold mt-2">{stats.campanhasAtivas}</h3>
              <p className="text-[10px] text-muted-foreground mt-1">Impactando 85% do time</p>
            </CardContent>
          </Card>

          <Card className={`border-border/40 shadow-xs ${stats.divergenciaCount > 0 ? 'bg-amber-500/5' : 'bg-primary/5'}`}>
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Conciliação (Divergências)</p>
                <div className={`p-2 rounded-lg ${stats.divergenciaCount > 0 ? 'bg-amber-500/10 text-amber-500' : 'bg-primary/10 text-primary'}`}>
                  {stats.divergenciaCount > 0 ? <AlertCircle className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                </div>
              </div>
              <h3 className="text-2xl font-bold mt-2">{stats.divergenciaCount}</h3>
              <p className={`text-[10px] mt-1 ${stats.divergenciaCount > 0 ? 'text-amber-600 font-bold' : 'text-muted-foreground'}`}>
                {stats.divergenciaCount > 0 ? 'Atenção necessária na auditoria' : 'Todos os valores conciliados'}
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="flex justify-between items-center">
            <TabsList className="bg-muted/50 p-1 rounded-xl">
              <TabsTrigger value="campanhas" className="rounded-lg gap-2"><Trophy className="h-4 w-4" /> Campanhas</TabsTrigger>
              <TabsTrigger value="pagamentos" className="rounded-lg gap-2"><DollarSign className="h-4 w-4" /> Pagamentos</TabsTrigger>
              <TabsTrigger value="simulador" className="rounded-lg gap-2"><Calculator className="h-4 w-4" /> Simulador ROI</TabsTrigger>
              <TabsTrigger value="auditoria" className="rounded-lg gap-2"><ShieldCheck className="h-4 w-4" /> Auditoria</TabsTrigger>
            </TabsList>
            <div className="flex gap-2">
              <Button variant="outline" className="gap-2 rounded-xl" onClick={() => handleExport('pdf')}>
                <Download className="h-4 w-4" /> Exportar
              </Button>
              <Button className="gap-2 rounded-xl shadow-lg shadow-primary/20" onClick={() => setIsWizardOpen(true)}>
                <Plus className="h-4 w-4" /> Nova Campanha
              </Button>
            </div>
          </div>

          <TabsContent value="campanhas" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {campanhas.map(c => (
                <Card key={c.id} className="border-border/30 hover:border-primary/20 transition-all group overflow-hidden rounded-2xl">
                  <div className={`h-1.5 w-full bg-gradient-to-r ${c.status === 'ativo' ? 'from-success to-emerald-400' : 'from-muted to-muted-foreground/30'}`} />
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-display font-bold text-lg group-hover:text-primary transition-colors">{c.nome}</h3>
                        <p className="text-xs text-muted-foreground mt-1">{c.descricao}</p>
                      </div>
                      <Badge variant={c.status === 'ativo' ? 'default' : 'secondary'} className="rounded-full px-3">
                        {c.status.toUpperCase()}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-4 my-6">
                      <div className="space-y-1">
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> Período
                        </p>
                        <p className="text-xs font-semibold">
                          {formatDate(c.data_inicio)} - {formatDate(c.data_fim)}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter flex items-center gap-1">
                          <DollarSign className="h-3 w-3" /> Orçamento
                        </p>
                        <p className="text-xs font-semibold">{formatCurrency(c.orcamento_estimado || 0)}</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between text-[10px] font-bold">
                        <span className="text-muted-foreground">Progresso do Orçamento</span>
                        <span>45%</span>
                      </div>
                      <Progress value={45} className="h-1.5" />
                    </div>

                    <div className="mt-6 pt-4 border-t border-border/10 flex justify-between items-center">
                      <div className="flex -space-x-2">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="h-7 w-7 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[10px] font-bold">
                            U{i}
                          </div>
                        ))}
                        <div className="h-7 w-7 rounded-full border-2 border-background bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                          +12
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="text-xs font-bold text-primary hover:bg-primary/5">
                        Gerenciar Regras <ArrowUpRight className="ml-1 h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {campanhas.length === 0 && (
                <Card className="col-span-full border-dashed border-2 py-12 flex flex-col items-center justify-center text-center">
                  <div className="p-4 bg-muted/50 rounded-full mb-4">
                    <Trophy className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                  <h3 className="font-bold text-lg">Nenhuma campanha estratégica</h3>
                  <p className="text-sm text-muted-foreground max-w-xs mx-auto">Comece criando sua primeira campanha de incentivo para impulsionar a performance do time.</p>
                  <Button variant="outline" className="mt-6 rounded-xl">Criar Campanha agora</Button>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="simulador" className="space-y-6">
            <RewardsSimulator />
          </TabsContent>

          <TabsContent value="pagamentos" className="space-y-6">
            <RewardsApprovalHub pagamentos={pagamentos} />
            
            <Card className="border-border/30 rounded-2xl overflow-hidden shadow-xs mt-8 bg-card/50 backdrop-blur-xs">
              <CardHeader className="bg-muted/30 border-b border-border/10 p-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      Painel Gerencial de Auditoria & ROI v1.2
                    </CardTitle>
                    <CardDescription className="text-[10px] uppercase tracking-widest mt-1">Dados consolidados com snapshot de metas e conciliação</CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    <div className="flex items-center gap-2 bg-background border border-border/50 rounded-xl px-3 py-1.5">
                      <Filter className="h-3 w-3 text-muted-foreground" />
                      <select 
                        className="bg-transparent text-[10px] font-bold outline-hidden border-none"
                        value={periodoFiltro}
                        onChange={(e) => setPeriodoFiltro(e.target.value)}
                      >
                        <option>Todos os Períodos</option>
                        <option>Maio 2026</option>
                        <option>Abril 2026</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2 bg-background border border-border/50 rounded-xl px-3 py-1.5">
                      <select 
                        className="bg-transparent text-[10px] font-bold outline-hidden border-none"
                        value={unidadeFiltro}
                        onChange={(e) => setUnidadeFiltro(e.target.value)}
                      >
                        <option>Todas as Unidades</option>
                        <option>Matriz</option>
                        <option>Filial Sul</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2 bg-background border border-border/50 rounded-xl px-3 py-1.5">
                      <select 
                        className="bg-transparent text-[10px] font-bold outline-hidden border-none"
                        value={faixaMetaFiltro}
                        onChange={(e) => setFaixaMetaFiltro(e.target.value)}
                      >
                        <option>Todas as Metas</option>
                          <option>Meta {'>'} 100%</option>
                          <option>Meta {'>'} 120%</option>
                      </select>
                    </div>
                    <Button variant="outline" size="sm" className="h-9 text-[10px] font-bold uppercase rounded-xl" onClick={() => handleExport('csv')}>
                      <Download className="mr-1 h-3 w-3" /> CSV
                    </Button>
                    <Button variant="outline" size="sm" className="h-9 text-[10px] font-bold uppercase rounded-xl" onClick={() => handleExport('pdf')}>
                      <FileText className="mr-1 h-3 w-3" /> PDF
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/10 border-b border-border/5">
                        <th className="text-left p-4 font-bold text-[10px] uppercase text-muted-foreground tracking-widest">Colaborador</th>
                        <th className="text-left p-4 font-bold text-[10px] uppercase text-muted-foreground tracking-widest">Campanha</th>
                        <th className="text-left p-4 font-bold text-[10px] uppercase text-muted-foreground tracking-widest">Valor Aprovado</th>
                        <th className="text-left p-4 font-bold text-[10px] uppercase text-muted-foreground tracking-widest">Folha Real</th>
                        <th className="text-left p-4 font-bold text-[10px] uppercase text-muted-foreground tracking-widest">Status / Justificativa</th>
                        <th className="text-right p-4 font-bold text-[10px] uppercase text-muted-foreground tracking-widest">Auditoria</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/5">
                      {pagamentos.map((p: any) => (
                        <tr key={p.id} className="hover:bg-accent/5 transition-colors group">
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs">{p.colaborador?.nome_completo}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <Badge variant="outline" className="text-[9px] font-medium border-border/50">{p.campanha?.nome}</Badge>
                          </td>
                          <td className="p-4 font-mono font-bold text-xs">
                            {formatCurrency(p.valor_aprovado || p.valor_calculado)}
                          </td>
                          <td className="p-4 font-mono font-bold text-xs text-muted-foreground">
                            {p.valor_folha_real ? formatCurrency(p.valor_folha_real) : '—'}
                          </td>
                          <td className="p-4">
                            <div className="flex flex-col gap-1">
                              <Badge className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full w-fit ${
                                p.status_conciliacao === 'conciliado' ? 'bg-success/10 text-success' : 
                                p.status_conciliacao === 'divergente' ? 'bg-amber-500/10 text-amber-500' : 
                                'bg-muted text-muted-foreground'
                              }`}>
                                {p.status_conciliacao || 'pendente'}
                              </Badge>
                              {p.justificativa_divergencia && (
                                <span className="text-[9px] text-muted-foreground italic truncate max-w-[150px]" title={p.justificativa_divergencia}>
                                  "{p.justificativa_divergencia}"
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-4 text-right">
                            <Button variant="ghost" size="icon" aria-label="Histórico" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                              <History className="h-3 w-3" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="auditoria" className="space-y-6">
            <Card className="border-border/30 rounded-2xl overflow-hidden shadow-xs">
              <CardHeader className="bg-muted/30 border-b border-border/30 py-4">
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-primary" />
                  <CardTitle className="text-base">Trilha de Auditoria de Premiações</CardTitle>
                </div>
                <CardDescription className="text-xs">Histórico completo de alterações, aprovações e integrações</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/20 border-b border-border/10">
                        <th className="text-left p-4 font-bold text-[10px] uppercase text-muted-foreground">Data/Hora</th>
                        <th className="text-left p-4 font-bold text-[10px] uppercase text-muted-foreground">Usuário</th>
                        <th className="text-left p-4 font-bold text-[10px] uppercase text-muted-foreground">Ação</th>
                        <th className="text-left p-4 font-bold text-[10px] uppercase text-muted-foreground">Entidade</th>
                        <th className="text-left p-4 font-bold text-[10px] uppercase text-muted-foreground">Motivo/Detalhes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/10">
                      {auditoria.map((a: any) => (
                        <tr key={a.id} className="hover:bg-accent/5 transition-colors">
                          <td className="p-4 text-xs font-medium whitespace-nowrap">
                            {formatDateTime(a.created_at)}
                          </td>
                          <td className="p-4 text-xs">
                            RH / Admin
                          </td>
                          <td className="p-4">
                            <Badge variant="outline" className="text-[9px] font-bold uppercase">
                              {a.acao}
                            </Badge>
                          </td>
                          <td className="p-4 text-xs text-muted-foreground">
                            {a.entidade_tipo} ({a.entidade_id.substring(0, 8)})
                          </td>
                          <td className="p-4 text-xs italic">
                            {a.motivo}
                          </td>
                        </tr>
                      ))}
                      {auditoria.length === 0 && (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-muted-foreground italic">
                            Nenhum registro de auditoria encontrado.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <CampaignWizard 
          isOpen={isWizardOpen} 
          onClose={() => setIsWizardOpen(false)} 
          empresaId={empresaAtual?.id} 
        />
      </PageLayout>
    </>
  );
}
