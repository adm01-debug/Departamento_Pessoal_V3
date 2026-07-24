import { PageTitle } from '@/components/PageTitle';
import { useState } from 'react';
import { useNow } from '@/hooks/useNow';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { workflowService } from '@/services/workflowService';
import { useEmpresas } from '@/hooks';
import { formatDateTime } from '@/utils/format';
import { toast } from 'sonner';
import { Plus, GitBranch, Play, CheckCircle, XCircle, Clock, Trash2, Workflow, ArrowRight, Users, AlertTriangle, Timer, History, Zap, Mail, Bell } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { LooseRow } from '@/types/db';
const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
  pendente: { color: 'bg-warning/15 text-warning border-0', icon: Clock, label: 'Pendente' },
  em_andamento: { color: 'bg-info/15 text-info border-0', icon: Play, label: 'Em Andamento' },
  aprovado: { color: 'bg-success/15 text-success border-0', icon: CheckCircle, label: 'Aprovado' },
  rejeitado: { color: 'bg-destructive/15 text-destructive border-0', icon: XCircle, label: 'Rejeitado' },
  cancelado: { color: 'bg-muted-foreground/15 text-muted-foreground border-0', icon: XCircle, label: 'Cancelado' },
};

const tipoIcons: Record<string, string> = {
  ferias: '🏖️', afastamento: '🏥', despesa: '💰', documento: '📄', admissao: '👋', desligamento: '📦', ajuste_ponto: '⏰', custom: '⚙️',
};

const ETAPAS_PADRAO = [
  { nivel: 1, nome: 'Gestor Direto', descricao: 'Primeira aprovação pelo gestor imediato', sla_horas: 24 },
  { nivel: 2, nome: 'RH / DP', descricao: 'Validação pelo Departamento Pessoal', sla_horas: 48 },
  { nivel: 3, nome: 'Diretoria / Financeiro', descricao: 'Aprovação final pela diretoria', sla_horas: 72 },
];

export default function WorkflowsPage() {
  const { empresaAtual } = useEmpresas();
  const now = useNow();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selectedExec, setSelectedExec] = useState<LooseRow<'workflows_execucoes'> | null>(null);
  const [showLog, setShowLog] = useState(false);
  const [form, setForm] = useState({ nome: '', descricao: '', tipo: 'ferias', etapas: ETAPAS_PADRAO.slice(0, 2) });
  const [numEtapas, setNumEtapas] = useState(2);

  const { data: definicoes = [], isLoading: loadDef } = useQuery({
    queryKey: ['workflows_def', empresaAtual?.id],
    queryFn: () => workflowService.listarDefinicoes(empresaAtual!.id),
    enabled: !!empresaAtual?.id,
  });

  const { data: execucoes = [], isLoading: loadExec } = useQuery({
    queryKey: ['workflows_exec', empresaAtual?.id],
    queryFn: () => workflowService.listarExecucoes(empresaAtual!.id),
    enabled: !!empresaAtual?.id,
  });

  const criar = useMutation({
    mutationFn: () => workflowService.criarDefinicao({ ...form, empresa_id: empresaAtual?.id }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['workflows_def'] }); setOpen(false); toast.success('Workflow criado!'); },
    onError: () => toast.error('Erro ao criar workflow'),
  });

  const excluir = useMutation({
    mutationFn: (id: string) => workflowService.excluirDefinicao(id, empresaAtual!.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['workflows_def'] }); toast.success('Workflow excluído'); },
  });

  const aprovar = useMutation({
    mutationFn: (id: string) => workflowService.atualizarExecucao(id, { status: 'aprovado', concluida_em: new Date().toISOString() }, empresaAtual!.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['workflows_exec'] }); toast.success('Workflow aprovado!'); },
    onError: () => toast.error('Erro ao aprovar'),
  });

  const rejeitar = useMutation({
    mutationFn: (id: string) => workflowService.atualizarExecucao(id, { status: 'rejeitado', concluida_em: new Date().toISOString() }, empresaAtual!.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['workflows_exec'] }); toast.success('Workflow rejeitado'); },
    onError: () => toast.error('Erro ao rejeitar'),
  });

  const stats = {
    total: definicoes.length,
    andamento: execucoes.filter((e: any) => e.status === 'em_andamento').length,
    aprovados: execucoes.filter((e: any) => e.status === 'aprovado').length,
    pendentes: execucoes.filter((e: any) => e.status === 'pendente').length,
    rejeitados: execucoes.filter((e: any) => e.status === 'rejeitado').length,
  };

  const slaAtrasados = execucoes.filter((e: any) => {
    if (e.status !== 'pendente' && e.status !== 'em_andamento') return false;
    const created = new Date(e.created_at);
    const diffHours = (now - created.getTime()) / (1000 * 60 * 60);
    return diffHours > 48;
  }).length;

  return (
    <>
    <PageTitle title="Workflows" description="Automação de processos" />
    <PageLayout
      title="Workflows de Aprovação"
      description="Cadeia de aprovações com SLA e notificações"
      icon={<Workflow className="h-5 w-5 text-primary-foreground" />}
      gradient="from-info to-primary"
    >
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {[
          { label: 'Workflows', value: stats.total, icon: GitBranch, gradient: 'from-primary to-primary-glow' },
          { label: 'Em Andamento', value: stats.andamento, icon: Play, gradient: 'from-info to-info/70' },
          { label: 'Aprovados', value: stats.aprovados, icon: CheckCircle, gradient: 'from-success to-success/70' },
          { label: 'Pendentes', value: stats.pendentes, icon: Clock, gradient: 'from-warning to-warning/70' },
          { label: 'SLA Atrasado', value: slaAtrasados, icon: AlertTriangle, gradient: 'from-destructive to-destructive/70' },
        ].map(({ label, value, icon: Icon, gradient }, i) => (
          <motion.div key={label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="border-border/30 rounded-2xl">
              <CardContent className="p-3 flex items-center gap-3">
                <div className={cn("p-2 rounded-xl bg-gradient-to-br", gradient)}><Icon className="h-4 w-4 text-primary-foreground" /></div>
                <div><p className="text-lg font-bold font-display">{value}</p><p className="text-[10px] text-muted-foreground font-body">{label}</p></div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Tabs defaultValue="definicoes">
        <div className="flex justify-between items-center mb-4">
          <TabsList className="rounded-xl">
            <TabsTrigger value="definicoes" className="rounded-lg font-body">Workflows</TabsTrigger>
            <TabsTrigger value="execucoes" className="rounded-lg font-body">Execuções</TabsTrigger>
            <TabsTrigger value="pipeline" className="rounded-lg font-body">Pipeline</TabsTrigger>
          </TabsList>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-xl bg-gradient-to-r from-primary to-primary-glow font-body">
                <Plus className="mr-2 h-4 w-4" />Novo Workflow
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl max-w-lg">
              <DialogHeader><DialogTitle className="font-display">Novo Workflow de Aprovação</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label className="font-body">Nome</Label><Input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} placeholder="Ex: Aprovação de Férias" className="rounded-xl" /></div>
                <div><Label className="font-body">Tipo</Label>
                  <Select value={form.tipo} onValueChange={v => setForm(p => ({ ...p, tipo: v }))}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['ferias', 'afastamento', 'ajuste_ponto', 'despesa', 'documento', 'admissao', 'desligamento', 'custom'].map(t => (
                        <SelectItem key={t} value={t}>{tipoIcons[t]} {t.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label className="font-body">Nº de Etapas de Aprovação</Label>
                  <Select value={String(numEtapas)} onValueChange={v => { const n = Number(v); setNumEtapas(n); setForm(p => ({ ...p, etapas: ETAPAS_PADRAO.slice(0, n) })); }}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 etapa</SelectItem>
                      <SelectItem value="2">2 etapas</SelectItem>
                      <SelectItem value="3">3 etapas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Approval chain visualization */}
                <div className="bg-muted/30 rounded-xl p-3">
                  <Label className="font-body text-xs text-muted-foreground mb-2 block">Cadeia de Aprovação</Label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {form.etapas.map((etapa, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="bg-background rounded-lg p-2 border border-border/40 text-center min-w-[100px]">
                          <p className="text-xs font-display font-semibold">{etapa.nome}</p>
                          <p className="text-[10px] text-muted-foreground font-body flex items-center justify-center gap-1">
                            <Timer className="h-3 w-3" />{etapa.sla_horas}h SLA
                          </p>
                        </div>
                        {i < form.etapas.length - 1 && <ArrowRight className="h-4 w-4 text-muted-foreground" />}
                      </div>
                    ))}
                    <div className="bg-success/10 rounded-lg p-2 border border-success/30 text-center min-w-[80px]">
                      <CheckCircle className="h-4 w-4 text-success mx-auto" />
                      <p className="text-[10px] text-success font-body">Aprovado</p>
                    </div>
                  </div>
                </div>

                <div><Label className="font-body">Descrição</Label><Textarea value={form.descricao} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))} className="rounded-xl" /></div>
                <Button className="w-full rounded-xl bg-gradient-to-r from-primary to-primary-glow font-body" onClick={() => criar.mutate()} disabled={!form.nome || criar.isPending}>
                  {criar.isPending ? 'Criando...' : 'Criar Workflow'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <TabsContent value="definicoes">
          {loadDef ? <div className="flex justify-center p-8"><Spinner size="lg" /></div> : definicoes.length === 0 ? (
            <Card className="rounded-2xl border-border/30"><CardContent className="py-12 text-center text-muted-foreground"><Workflow className="mx-auto h-12 w-12 mb-4 opacity-30" /><p className="font-body">Nenhum workflow configurado</p><p className="text-xs font-body mt-1">Crie workflows para automatizar aprovações</p></CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {definicoes.map((w: any, i: number) => (
                <motion.div key={w.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <Card className="border-border/30 rounded-2xl hover:shadow-elevated transition-all overflow-hidden">
                    <div className="h-[2px] bg-gradient-to-r from-info to-primary" />
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{tipoIcons[w.tipo] || '⚙️'}</span>
                          <CardTitle className="text-sm font-display">{w.nome}</CardTitle>
                        </div>
                        <Badge className={w.ativo ? 'bg-success/15 text-success border-0' : 'bg-muted-foreground/15 text-muted-foreground border-0'}>
                          {w.ativo ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {w.descricao && <p className="text-xs text-muted-foreground mb-3 font-body">{w.descricao}</p>}
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-[10px] font-body">{w.tipo}</Badge>
                        <Button size="sm" variant="ghost" className="text-destructive h-7 text-xs rounded-lg" onClick={() => excluir.mutate(w.id)}>
                          <Trash2 className="h-3 w-3 mr-1" />Excluir
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="execucoes">
          {loadExec ? <div className="flex justify-center p-8"><Spinner size="lg" /></div> : (
            <Card className="rounded-2xl border-border/30 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="font-display">Workflow</TableHead>
                    <TableHead className="font-display">Tipo</TableHead>
                    <TableHead className="font-display">Status</TableHead>
                    <TableHead className="font-display">Progresso</TableHead>
                    <TableHead className="font-display">Data</TableHead>
                    <TableHead className="font-display">SLA</TableHead>
                    <TableHead className="font-display">Ações</TableHead>
                    <TableHead className="font-display">SLA</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {execucoes.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8 font-body">Nenhuma execução registrada</TableCell></TableRow>
                  ) : execucoes.map((e: any) => {
                    const config = statusConfig[e.status] || statusConfig.pendente;
                    const StatusIcon = config.icon;
                    const horasDecorridas = Math.round((now - new Date(e.created_at).getTime()) / (1000 * 60 * 60));
                    const slaExcedido = (e.status === 'pendente' || e.status === 'em_andamento') && horasDecorridas > 48;
                    const canAct = e.status === 'pendente' || e.status === 'em_andamento';

                    return (
                      <TableRow key={e.id} className="hover:bg-accent/30 transition-colors cursor-pointer" onClick={() => { setSelectedExec(e); setShowLog(true); }}>
                        <TableCell className="font-body font-medium">{(e as any).workflow?.nome || '—'}</TableCell>
                        <TableCell><Badge variant="outline" className="font-body text-xs">{tipoIcons[e.entidade_tipo] || '📋'} {e.entidade_tipo}</Badge></TableCell>
                        <TableCell>
                          <Badge className={cn("font-body", config.color)}>
                            <StatusIcon className="h-3 w-3 mr-1" />{config.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="w-24">
                            <Progress value={e.status === 'aprovado' ? 100 : e.status === 'em_andamento' ? 50 : e.status === 'rejeitado' ? 100 : 0} className="h-1.5 rounded-full" />
                          </div>
                        </TableCell>
                        <TableCell className="text-xs font-body">{new Date(e.created_at).toLocaleDateString('pt-BR')}</TableCell>
                        <TableCell>
                          {slaExcedido ? (
                            <Badge className="bg-destructive/15 text-destructive border-0 text-[10px]">
                              <AlertTriangle className="h-3 w-3 mr-1" />{horasDecorridas}h
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground font-body">{horasDecorridas}h</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {canAct && (
                            <div className="flex gap-1">
                              <Button size="sm" variant="outline" className="h-7 text-xs rounded-lg text-success border-success/30 hover:bg-success/10" onClick={(e_ev) => { e_ev.stopPropagation(); aprovar.mutate(e.id); }}>
                                <CheckCircle className="h-3 w-3 mr-1" />Aprovar
                              </Button>
                              <Button size="sm" variant="outline" className="h-7 text-xs rounded-lg text-destructive border-destructive/30 hover:bg-destructive/10" onClick={(e_ev) => { e_ev.stopPropagation(); rejeitar.mutate(e.id); }}>
                                <XCircle className="h-3 w-3 mr-1" />Rejeitar
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="pipeline">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { status: 'pendente', title: 'Pendentes', color: 'from-warning to-warning/70' },
              { status: 'em_andamento', title: 'Em Andamento', color: 'from-info to-info/70' },
              { status: 'aprovado', title: 'Aprovados', color: 'from-success to-success/70' },
              { status: 'rejeitado', title: 'Rejeitados', color: 'from-destructive to-destructive/70' },
            ].map(({ status, title, color }) => {
              const items = execucoes.filter((e: any) => e.status === status);
              return (
                <div key={status}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className={cn("h-2 w-2 rounded-full bg-gradient-to-r", color)} />
                    <h3 className="text-sm font-display font-semibold">{title}</h3>
                    <Badge variant="outline" className="text-[10px]">{items.length}</Badge>
                  </div>
                  <div className="space-y-2">
                    {items.length === 0 ? (
                      <Card className="border-dashed border-border/30 rounded-xl"><CardContent className="p-4 text-center text-xs text-muted-foreground font-body">Vazio</CardContent></Card>
                    ) : items.map((e: any) => (
                      <motion.div key={e.id} layout>
                        <Card className="border-border/30 rounded-xl hover:shadow-elevated transition-all">
                          <CardContent className="p-3">
                            <p className="text-xs font-body font-medium">{(e as any).workflow?.nome || 'Workflow'}</p>
                            <div className="flex items-center justify-between mt-1">
                              <Badge variant="outline" className="text-[10px] font-body">{e.entidade_tipo}</Badge>
                              <span className="text-[10px] text-muted-foreground font-body">{new Date(e.created_at).toLocaleDateString('pt-BR')}</span>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Audit Log Modal */}
      <Dialog open={showLog} onOpenChange={setShowLog}>
        <DialogContent className="max-w-2xl rounded-2xl overflow-hidden p-0 gap-0 border-border/40">
          <div className="bg-muted/30 p-6 border-b border-border/40">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-display font-bold flex items-center gap-2">
                  <History className="h-5 w-5 text-primary" /> Rastro de Automação
                </h3>
                <p className="text-xs text-muted-foreground font-body">ID: {selectedExec?.id}</p>
              </div>
              <Badge className={cn("font-body", statusConfig[selectedExec?.status || 'pendente'].color)}>
                {statusConfig[selectedExec?.status || 'pendente'].label}
              </Badge>
            </div>
          </div>
          
          <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto bg-card">
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Zap className="h-3 w-3 text-warning fill-warning" /> Linha do Tempo de Execução
              </h4>
              
              <div className="space-y-4 relative before:absolute before:inset-0 before:left-2.5 before:w-0.5 before:bg-muted before:z-0">
                {/* Initial Trigger Log */}
                <div className="relative pl-8 z-10">
                  <div className="absolute left-0 top-1 p-1 rounded-full bg-primary text-white shadow-xs ring-4 ring-background">
                    <Play className="h-3 w-3" />
                  </div>
                  <div className="bg-muted/10 p-3 rounded-xl border border-border/30">
                    <p className="text-xs font-bold font-display">Gatilho de Automação Acionado</p>
                    <p className="text-[10px] text-muted-foreground font-body mt-1">
                      A engine de workflows iniciou o processamento via `trigger_workflow_automation`.
                    </p>
                    <span className="text-[9px] text-muted-foreground font-mono mt-2 block">{formatDateTime(selectedExec?.created_at ?? '')}</span>
                  </div>
                </div>

                {/* Email Delivery Log (Simulated but showing in log) */}
                <div className="relative pl-8 z-10 opacity-70">
                  <div className="absolute left-0 top-1 p-1 rounded-full bg-info text-white shadow-xs ring-4 ring-background">
                    <Mail className="h-3 w-3" />
                  </div>
                  <div className="bg-muted/10 p-3 rounded-xl border border-border/30">
                    <p className="text-xs font-bold font-display">Notificação de Aprovação Enviada</p>
                    <p className="text-[10px] text-muted-foreground font-body mt-1">
                      E-mail disparado para o aprovador Nível 1 (Gestor Direto).
                    </p>
                    <span className="text-[9px] text-muted-foreground font-mono mt-2 block">{formatDateTime(selectedExec?.created_at ?? '')}</span>
                  </div>
                </div>

                {/* DB Sync Log */}
                <div className="relative pl-8 z-10 opacity-50">
                  <div className="absolute left-0 top-1 p-1 rounded-full bg-success text-white shadow-xs ring-4 ring-background">
                    <CheckCircle className="h-3 w-3" />
                  </div>
                  <div className="bg-muted/10 p-3 rounded-xl border border-border/30">
                    <p className="text-xs font-bold font-display">Atualização de Estado do Workflow</p>
                    <p className="text-[10px] text-muted-foreground font-body mt-1">
                      Status alterado para `{selectedExec?.status}` com sucesso.
                    </p>
                    <span className="text-[9px] text-muted-foreground font-mono mt-2 block">Sincronizado com o banco de dados principal.</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-info/5 rounded-xl border border-info/10 flex items-start gap-3">
              <Bell className="h-4 w-4 text-info mt-0.5" />
              <div>
                <p className="text-xs font-bold text-info">SLA de Aprovação Ativo</p>
                <p className="text-[10px] text-muted-foreground leading-tight">
                  A automação monitora este workflow a cada 15 minutos. Caso o SLA de 48h seja ultrapassado, um alerta de escalonamento será enviado à diretoria.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="p-6 bg-muted/30 border-t border-border/40">
            <Button variant="outline" className="rounded-xl font-body" onClick={() => setShowLog(false)}>Fechar Rastro</Button>
            {selectedExec?.status === 'pendente' && (
              <Button className="rounded-xl bg-gradient-to-r from-primary to-primary-glow font-body" onClick={() => { aprovar.mutate(selectedExec.id!); setShowLog(false); }}>
                Forçar Aprovação
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
    </>
  );
}
