import { PageTitle } from '@/components/PageTitle';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageLayout } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { EmptyList } from '@/components/ui/empty-state';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Bell, Check, CheckCheck, Info, AlertTriangle, CheckCircle, AlertCircle, History, Filter, Search, Trash2, RefreshCw, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useState, useEffect, useMemo } from 'react';
import { useNotificacoes } from '@/hooks/useNotificacoes';

const tipoIcon: Record<string, React.ElementType> = {
  info: Info, alerta: AlertTriangle, sucesso: CheckCircle, erro: AlertCircle,
  periodo_aquisitivo: AlertTriangle, contrato_vencendo: AlertCircle,
  documento_vencendo: Info, ferias_vencendo: CheckCircle,
};
const tipoGradient: Record<string, string> = {
  info: 'from-primary to-primary-glow', alerta: 'from-warning to-warning/70',
  sucesso: 'from-success to-success/70', erro: 'from-destructive to-destructive/70',
  periodo_aquisitivo: 'from-warning to-warning/70', contrato_vencendo: 'from-destructive to-destructive/70',
  documento_vencendo: 'from-info to-info/70', ferias_vencendo: 'from-success to-success/70',
};
const tipoLabels: Record<string, string> = {
  periodo_aquisitivo: 'Férias', contrato_vencendo: 'Contrato',
  documento_vencendo: 'Documento', ferias_vencendo: 'Férias',
  info: 'Info', alerta: 'Alerta', sucesso: 'Sucesso', erro: 'Erro',
};

const nivelColors: Record<string, string> = {
  atencao: 'bg-warning/15 text-warning', critico: 'bg-destructive/15 text-destructive', info: 'bg-info/15 text-info',
};

export default function NotificacoesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('notificacoes');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [filtroStatus, setFiltroStatus] = useState('todas');
  const [busca, setBusca] = useState('');
  const { notificacoes: notificacoesHook, naoLidas, gerarNotificacoesAutomaticas, isGerando, limparAntigas } = useNotificacoes();

  // Realtime subscription for instant notifications
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel('notificacoes-realtime-page')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notificacoes' }, (payload) => {
        queryClient.invalidateQueries({ queryKey: ['notificacoes'] });
        queryClient.invalidateQueries({ queryKey: ['notificacoes-db'] });
        const nova = payload.new as any;
        if (nova?.titulo) toast.info(`🔔 ${nova.titulo}`, { description: nova.mensagem?.slice(0, 80) });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, queryClient]);

  const { data: notificacoesDB, isLoading } = useQuery({
    queryKey: ['notificacoes-db', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from('notificacoes').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }).limit(100);
      if (error) throw error;
      return data || [];
    },
  });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const notificacoes = notificacoesDB || notificacoesHook || [];

  const filtradas = useMemo(() => {
    return notificacoes.filter((n: any) => {
      if (filtroTipo !== 'todos' && n.tipo !== filtroTipo) return false;
      if (filtroStatus === 'lidas' && !n.lida) return false;
      if (filtroStatus === 'nao_lidas' && n.lida) return false;
      if (busca && !n.titulo?.toLowerCase().includes(busca.toLowerCase()) && !n.mensagem?.toLowerCase().includes(busca.toLowerCase())) return false;
      return true;
    });
  }, [notificacoes, filtroTipo, filtroStatus, busca]);

  const marcarLida = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('notificacoes').update({ lida: true }).eq('id', id).eq('user_id', user!.id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['notificacoes-db'] }); queryClient.invalidateQueries({ queryKey: ['notificacoes'] }); },
  });

  const marcarTodasLidas = useMutation({
    mutationFn: async () => { const { error } = await supabase.from('notificacoes').update({ lida: true }).eq('user_id', user!.id).eq('lida', false); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['notificacoes-db'] }); queryClient.invalidateQueries({ queryKey: ['notificacoes'] }); toast.success('Todas marcadas como lidas'); },
  });

  const excluirNotificacao = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('notificacoes').delete().eq('id', id).eq('user_id', user!.id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['notificacoes-db'] }); queryClient.invalidateQueries({ queryKey: ['notificacoes'] }); toast.success('Notificação removida'); },
  });

  const { data: historicoAlertas = [], isLoading: loadAlertas } = useQuery({
    queryKey: ['historico-alertas'],
    queryFn: async () => {
      const { data, error } = await supabase.from('historico_alertas').select('*').order('created_at', { ascending: false }).limit(100);
      if (error) throw error;
      return data || [];
    },
  });

  const tiposDisponiveis = [...new Set(notificacoes.map((n: any) => n.tipo))];

  return (
    <>
    <PageTitle title="Notificações" description="Central de notificações" />
    <PageLayout title="Centro de Notificações" description={`${naoLidas} não lida${naoLidas !== 1 ? 's' : ''} — Tempo real ativo`}
      icon={<Bell className="h-5 w-5 text-primary-foreground" />} gradient="from-primary/60 to-primary/90"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => gerarNotificacoesAutomaticas()} disabled={isGerando} className="rounded-xl font-body">
            <Zap className="h-4 w-4 mr-1" />{isGerando ? 'Gerando...' : 'Gerar Alertas'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => limparAntigas()} className="rounded-xl font-body">
            <Trash2 className="h-4 w-4 mr-1" />Limpar Antigas
          </Button>
          {naoLidas > 0 && (
            <Button variant="outline" size="sm" onClick={() => marcarTodasLidas.mutate()} className="rounded-xl font-body">
              <CheckCheck className="h-4 w-4 mr-1" />Marcar Lidas
            </Button>
          )}
        </div>
      }
    >
      {/* Realtime indicator */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
        <span className="text-xs text-muted-foreground font-body">Atualização em tempo real ativa</span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total', value: notificacoes.length, gradient: 'from-primary to-primary-glow' },
          { label: 'Não Lidas', value: naoLidas, gradient: 'from-warning to-warning/70' },
          { label: 'Lidas', value: notificacoes.length - naoLidas, gradient: 'from-success to-success/70' },
          { label: 'Hoje', value: notificacoes.filter((n: any) => new Date(n.created_at).toDateString() === new Date().toDateString()).length, gradient: 'from-info to-info/70' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="border border-border/30 rounded-2xl overflow-hidden">
              <div className={cn("h-[2px] bg-gradient-to-r", s.gradient)} />
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-display font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground font-body">{s.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="notificacoes"><Bell className="mr-1 h-4 w-4" />Notificações</TabsTrigger>
          <TabsTrigger value="historico"><History className="mr-1 h-4 w-4" />Histórico de Alertas</TabsTrigger>
        </TabsList>

        <TabsContent value="notificacoes">
          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar notificações..." value={busca} onChange={e => setBusca(e.target.value)} className="pl-9 rounded-xl" />
            </div>
            <Select value={filtroTipo} onValueChange={setFiltroTipo}>
              <SelectTrigger className="w-[160px] rounded-xl"><Filter className="h-4 w-4 mr-1" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os tipos</SelectItem>
                {tiposDisponiveis.map(t => <SelectItem key={t} value={t}>{tipoLabels[t] || t}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger className="w-[140px] rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                <SelectItem value="nao_lidas">Não lidas</SelectItem>
                <SelectItem value="lidas">Lidas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="flex justify-center p-8"><Spinner size="lg" /></div>
          ) : filtradas.length === 0 ? (
            <EmptyList entityName="notificação" />
          ) : (
            <div className="space-y-2 max-w-4xl">
              <AnimatePresence>
                {filtradas.map((n: any, i: number) => {
                  const Icon = tipoIcon[n.tipo] || Info;
                  const gradient = tipoGradient[n.tipo] || 'from-primary to-primary-glow';
                  return (
                    <motion.div key={n.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ delay: i * 0.02 }}>
                      <Card className={cn('border border-border/30 rounded-xl transition-all hover:shadow-elevated group', !n.lida && 'border-l-4 border-l-primary bg-primary/[0.02]')}>
                        <CardContent className="flex items-start gap-3 p-4">
                          <div className={cn('p-2 rounded-xl bg-gradient-to-br shrink-0', gradient)}>
                            <Icon className="h-4 w-4 text-primary-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-body font-medium text-sm">{n.titulo}</p>
                              <Badge variant="outline" className="text-[10px]">{tipoLabels[n.tipo] || n.tipo}</Badge>
                            </div>
                            {n.mensagem && <p className="text-muted-foreground font-body text-xs mt-0.5">{n.mensagem}</p>}
                            <p className="text-muted-foreground/60 font-body text-[11px] mt-1">{new Date(n.created_at).toLocaleString('pt-BR')}</p>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {!n.lida && (
                              <Button variant="ghost" size="icon" className="rounded-lg h-8 w-8" onClick={() => marcarLida.mutate(n.id)} title="Marcar como lida">
                                <Check className="h-4 w-4" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" className="rounded-lg h-8 w-8 text-destructive" onClick={() => excluirNotificacao.mutate(n.id)} title="Excluir">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </TabsContent>

        <TabsContent value="historico">
          <Card><CardContent className="p-0">
            {loadAlertas ? <div className="p-8 flex justify-center"><Spinner /></div> : (
              <Table>
                <TableHeader><TableRow><TableHead>Tipo</TableHead><TableHead>Mensagem</TableHead><TableHead>Nível</TableHead><TableHead>Valor</TableHead><TableHead>Limite</TableHead><TableHead>Data</TableHead></TableRow></TableHeader>
                <TableBody>
                  {historicoAlertas.map((a: any) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium capitalize">{a.tipo}</TableCell>
                      <TableCell className="max-w-xs truncate">{a.mensagem}</TableCell>
                      <TableCell><Badge className={`text-xs ${nivelColors[a.nivel] || 'bg-muted text-muted-foreground'} border-0`}>{a.nivel}</Badge></TableCell>
                      <TableCell>{a.valor}</TableCell>
                      <TableCell>{a.limite}</TableCell>
                      <TableCell>{new Date(a.created_at).toLocaleString('pt-BR')}</TableCell>
                    </TableRow>
                  ))}
                  {historicoAlertas.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum alerta no histórico</TableCell></TableRow>}
                </TableBody>
              </Table>
            )}
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </PageLayout>
    </>
  );
}
