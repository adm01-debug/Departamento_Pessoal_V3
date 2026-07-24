import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Bell, Plug, Plus, RefreshCw, Save, Settings, Trash2, Webhook } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { edgeFunctionsService } from '@/services/edgeFunctionsService';
import { safeErrorMessage } from '@/utils/safeError';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { FormField, FormSelect, FormSwitch } from '@/components/forms';

type AuthUser = { name?: string } | null | undefined;

export function PreferenciasTab({ user }: { user: AuthUser }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="border border-border/30 shadow-elevated rounded-2xl overflow-hidden bg-card">
        <div className="h-[2px] bg-gradient-to-r from-primary to-primary-glow" />
        <CardHeader>
          <CardTitle className="font-display">Preferências de Interface</CardTitle>
          <CardDescription className="font-body">Personalize sua experiência no sistema</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-2">
          <div className="space-y-4">
            <FormField label="Nome de Exibição" defaultValue={user?.name || 'Usuário'} className="max-w-md" />
            <FormSelect
              label="Idioma do Sistema"
              options={[{ value: 'pt-BR', label: 'Português (Brasil)' }, { value: 'en-US', label: 'English (US)' }]}
              className="max-w-md"
            />
            <div className="flex flex-col gap-4 p-4 rounded-2xl bg-muted/30 border border-border/20">
              <FormSwitch label="Modo Escuro" description="Alternar entre tema claro e escuro automaticamente" />
              <FormSwitch label="Animações Reduzidas" description="Desativar efeitos visuais para melhor performance" />
            </div>
          </div>
          <Button className="rounded-xl bg-gradient-to-r from-primary to-primary-glow hover:opacity-90 shadow-lg font-body px-8 h-11">
            Salvar Alterações
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function NotificacoesTab() {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="border border-border/30 shadow-elevated rounded-2xl overflow-hidden bg-card">
        <div className="h-[2px] bg-gradient-to-r from-primary to-primary-glow" />
        <CardHeader>
          <CardTitle className="font-display">Central de Notificações</CardTitle>
          <CardDescription>Configure alertas via E-mail, WhatsApp e Push</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-2 font-body">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-4 p-5 rounded-2xl bg-muted/20 border border-border/30">
              <h4 className="text-xs font-bold uppercase tracking-wider text-primary">Operacional</h4>
              <FormSwitch label="Novas Admissões" description="Notificar sobre novos processos iniciados" />
              <FormSwitch label="Férias Pendentes" description="Alertar sobre solicitações aguardando aprovação" />
              <FormSwitch label="Afastamentos" description="Informar quando um colaborador se afastar" />
            </div>
            <div className="space-y-4 p-5 rounded-2xl bg-muted/20 border border-border/30">
              <h4 className="text-xs font-bold uppercase tracking-wider text-warning">Compliance</h4>
              <FormSwitch label="Vencimento de ASO" description="Avisar 15 dias antes do vencimento" />
              <FormSwitch label="Treinamentos" description="Alertar sobre convocações de cursos" />
              <FormSwitch label="Logs de Erro" description="Notificar falhas críticas em integrações" />
            </div>
          </div>
          <div className="pt-2">
            <Button className="rounded-xl shadow-glow px-8 h-11">Salvar Preferências</Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function FolhaConfigTab() {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="border border-border/30 shadow-elevated rounded-2xl overflow-hidden bg-card">
        <div className="h-[2px] bg-gradient-to-r from-primary-glow to-primary" />
        <CardHeader>
          <CardTitle className="font-display">Parâmetros de Folha</CardTitle>
          <CardDescription>Defina os gatilhos para o processamento mensal</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-2">
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Dia de Fechamento" type="number" defaultValue="25" />
            <FormField label="Dia de Pagamento" type="number" defaultValue="5" />
          </div>
          <div className="p-4 rounded-2xl bg-muted/30 border border-border/20">
            <FormSwitch label="Cálculo Automático" description="Processar rubricas básicas no dia do fechamento" />
          </div>
          <Button className="rounded-xl bg-gradient-to-r from-primary-glow to-primary hover:opacity-90 shadow-lg font-body px-8 h-11">Salvar Configurações</Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function PontoConfigTab() {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="border border-border/30 shadow-elevated rounded-2xl overflow-hidden bg-card">
        <div className="h-[2px] bg-gradient-to-r from-primary/60 to-primary/90" />
        <CardHeader>
          <CardTitle className="font-display">Compliance de Jornada</CardTitle>
          <CardDescription>Configurações de REP-P e segurança de registros</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-2">
          <div className="max-w-md space-y-4">
            <FormField label="Tolerância de Atraso (min)" type="number" defaultValue="10" />
            <div className="space-y-4 p-4 rounded-2xl bg-muted/30 border border-border/20">
              <FormSwitch label="Exigir Geolocalização" description="Obriga o uso de GPS para bater ponto" />
              <FormSwitch label="Reconhecimento Facial" description="Capturar foto em cada registro de jornada" />
              <FormSwitch label="Ponto Offline" description="Permitir batidas sem conexão com internet" />
            </div>
          </div>
          <Button className="rounded-xl bg-gradient-to-r from-primary/60 to-primary/90 hover:opacity-90 shadow-lg font-body px-8 h-11">Atualizar Regras</Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function AlertasKpiTab() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ tipo: '', limite_atencao: '', limite_critico: '' });

  const { data: alertasConfig = [], isLoading } = useQuery({
    queryKey: ['config-alertas-indicadores'],
    queryFn: async () => {
      const { data, error } = await supabase.from('config_alertas_indicadores').select('*').order('tipo');
      if (error) throw error;
      return data || [];
    },
  });

  const criar = useMutation({
    mutationFn: async (d: typeof form) => {
      const { error } = await supabase.from('config_alertas_indicadores').insert({
        tipo: d.tipo,
        limite_atencao: Number(d.limite_atencao),
        limite_critico: Number(d.limite_critico),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['config-alertas-indicadores'] });
      setOpen(false);
      setForm({ tipo: '', limite_atencao: '', limite_critico: '' });
      toast.success('Configuração de alerta criada');
    },
    onError: () => toast.error('Erro ao criar configuração'),
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('config_alertas_indicadores').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['config-alertas-indicadores'] });
      toast.success('Configuração removida');
    },
  });

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="border border-border/30 shadow-elevated rounded-2xl overflow-hidden bg-card">
        <div className="h-[2px] bg-gradient-to-r from-warning to-destructive" />
        <CardHeader className="pb-4 px-6 pt-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="font-display text-xl flex items-center gap-2">
                <Bell className="h-5 w-5 text-warning" /> Monitoramento de Indicadores
              </CardTitle>
              <CardDescription className="font-body text-sm mt-1">Alertas automáticos baseados em limites de tolerância</CardDescription>
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="rounded-xl shadow-glow gap-2">
                  <Plus className="h-4 w-4" /> Novo Alerta
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-2xl max-w-md">
                <DialogHeader>
                  <DialogTitle className="font-display">Configurar Limite de Indicador</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Tipo de Indicador</Label>
                    <Input value={form.tipo} onChange={e => setForm(p => ({ ...p, tipo: e.target.value }))} placeholder="Ex: turnover, absenteismo, horas_extras" className="rounded-xl border-border/40" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Limite Atenção (%)</Label>
                      <Input type="number" value={form.limite_atencao} onChange={e => setForm(p => ({ ...p, limite_atencao: e.target.value }))} placeholder="Ex: 10" className="rounded-xl border-border/40" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Limite Crítico (%)</Label>
                      <Input type="number" value={form.limite_critico} onChange={e => setForm(p => ({ ...p, limite_critico: e.target.value }))} placeholder="Ex: 20" className="rounded-xl border-border/40" />
                    </div>
                  </div>
                  <Button onClick={() => criar.mutate(form)} disabled={!form.tipo || !form.limite_atencao || !form.limite_critico || criar.isPending} className="w-full rounded-xl shadow-glow h-11 mt-2">
                    {criar.isPending ? <Spinner size="sm" className="mr-2" /> : <Save className="mr-2 h-4 w-4" />}
                    Salvar Configuração
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            {isLoading ? <div className="p-12 flex justify-center"><Spinner size="lg" /></div> : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 border-b border-border/20">
                    <TableHead className="font-display font-semibold py-4 pl-6">Tipo de Indicador</TableHead>
                    <TableHead className="font-display font-semibold">Limite Atenção</TableHead>
                    <TableHead className="font-display font-semibold">Limite Crítico</TableHead>
                    <TableHead className="font-display font-semibold hidden sm:table-cell">Última Alteração</TableHead>
                    <TableHead className="w-[80px] text-right pr-6"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alertasConfig.map((a: any) => (
                    <TableRow key={a.id} className="hover:bg-accent/10 transition-colors group">
                      <TableCell className="font-body font-bold capitalize pl-6 py-4">{a.tipo?.replace(/_/g, ' ')}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30 font-bold px-2 py-0.5 rounded-lg">
                          {a.limite_atencao}%
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 font-bold px-2 py-0.5 rounded-lg">
                          {a.limite_critico}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground hidden sm:table-cell font-body">
                        {new Date(a.updated_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <Button variant="ghost" size="icon" aria-label="Excluir" onClick={() => excluir.mutate(a.id)} className="h-8 w-8 rounded-lg text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {alertasConfig.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-16 font-body opacity-40">
                        <div className="flex flex-col items-center gap-3">
                          <Bell className="h-10 w-10" />
                          <p>Nenhum alerta de KPI configurado.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function IntegracoesTab() {
  const { data: integracoes = [], isLoading } = useQuery({
    queryKey: ['integracoes'],
    queryFn: async () => {
      const { data, error } = await supabase.from('integracoes').select('*').order('nome');
      if (error) { if (error.code === '42P01') return []; throw error; }
      return data || [];
    },
  });

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="border border-border/30 rounded-2xl overflow-hidden shadow-elevated bg-card">
          <div className="h-[2px] bg-[#00AEEF]" />
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-display flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-[#00AEEF]/10 flex items-center justify-center">
                  <Plug className="w-3.5 h-3.5 text-[#00AEEF]" />
                </div>
                Bitrix24 CRM
              </CardTitle>
              <Badge variant="outline" className="text-success border-success/30 bg-success/5 text-[9px] uppercase font-bold px-2 py-0">Conectado</Badge>
            </div>
            <CardDescription className="text-[11px]">Sincronização de talentos e estrutura</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl gap-2 font-body text-xs justify-start h-9 hover:bg-[#00AEEF]/5 hover:border-[#00AEEF]/30 transition-all"
                onClick={async () => {
                  try {
                    await edgeFunctionsService.sincronizarBitrix({ action: 'sync_all' });
                    toast.success('Sincronização Bitrix24 iniciada!');
                  } catch (err: any) { toast.error(safeErrorMessage(err, 'Erro na sincronização.')); }
                }}
              >
                <RefreshCw className="h-3.5 w-3.5" /> Sincronizar Agora
              </Button>
              <Button variant="ghost" size="sm" className="rounded-xl gap-2 font-body text-xs justify-start h-9">
                <Settings className="h-3.5 w-3.5" /> Webhook de Mudanças
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/30 rounded-2xl overflow-hidden shadow-elevated bg-card opacity-70 group grayscale hover:grayscale-0 hover:opacity-100 transition-all">
          <div className="h-[2px] bg-[#FF3333]" />
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-display flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-[#FF3333]/10 flex items-center justify-center">
                  <Plug className="w-3.5 h-3.5 text-[#FF3333]" />
                </div>
                RD Station
              </CardTitle>
              <Badge variant="secondary" className="text-[9px] font-bold">EM BREVE</Badge>
            </div>
            <CardDescription className="text-[11px]">Exportação de dados para marketing</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <Button variant="outline" size="sm" disabled className="w-full rounded-xl text-xs font-body h-9 border-dashed">Conectar Plataforma</Button>
          </CardContent>
        </Card>

        <Card className="border border-border/30 rounded-2xl overflow-hidden shadow-elevated bg-card opacity-70 group grayscale hover:grayscale-0 hover:opacity-100 transition-all">
          <div className="h-[2px] bg-[#4285F4]" />
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-display flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-[#4285F4]/10 flex items-center justify-center">
                  <Plug className="w-3.5 h-3.5 text-[#4285F4]" />
                </div>
                Google Workspace
              </CardTitle>
              <Badge variant="secondary" className="text-[9px] font-bold">EM BREVE</Badge>
            </div>
            <CardDescription className="text-[11px]">Provisionamento de contas e e-mail</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <Button variant="outline" size="sm" disabled className="w-full rounded-xl text-xs font-body h-9 border-dashed">Configurar Domínio</Button>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-border/30 shadow-elevated rounded-2xl overflow-hidden bg-card">
        <div className="h-[2px] bg-gradient-to-r from-primary to-primary-glow" />
        <CardHeader className="pb-4 px-6 pt-6">
          <CardTitle className="font-display text-xl flex items-center gap-2">
            <Plug className="h-5 w-5 text-primary" /> Atividade de Integração
          </CardTitle>
          <CardDescription className="font-body text-sm mt-1">Status e controle de conexões de APIs de terceiros</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            {isLoading ? <div className="p-12 flex justify-center"><Spinner size="lg" /></div> : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 border-b border-border/20">
                    <TableHead className="font-display font-semibold py-4 pl-6">Nome</TableHead>
                    <TableHead className="font-display font-semibold">Tipo de Conector</TableHead>
                    <TableHead className="font-display font-semibold text-center">Status</TableHead>
                    <TableHead className="font-display font-semibold hidden sm:table-cell">Última Sincronização</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {integracoes.map((i: any) => (
                    <TableRow key={i.id} className="hover:bg-accent/10 transition-colors group">
                      <TableCell className="font-body font-bold pl-6 py-4">{i.nome}</TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">{i.tipo || '-'}</TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={i.ativo ? 'default' : 'secondary'}
                          className={`rounded-lg text-[10px] font-bold px-2 py-0.5 ${i.ativo ? 'bg-success/20 text-success border-success/30' : ''}`}
                        >
                          {i.ativo ? 'ATIVO' : 'INATIVO'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[10px] text-muted-foreground font-mono hidden sm:table-cell">
                        {i.ultima_sync ? new Date(i.ultima_sync).toLocaleString('pt-BR') : 'Nunca sincronizado'}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" aria-label="Configurações" className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {integracoes.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-16 font-body opacity-40">
                        <div className="flex flex-col items-center gap-3">
                          <Plug className="h-10 w-10" />
                          <p>Nenhuma integração personalizada ativa.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function WebhooksLogsTab() {
  const { data: webhooksLogs = [], isLoading } = useQuery({
    queryKey: ['webhooks-logs'],
    queryFn: async () => {
      const { data, error } = await supabase.from('webhooks_logs').select('*').order('created_at', { ascending: false }).limit(50);
      if (error) { if (error.code === '42P01') return []; throw error; }
      return data || [];
    },
  });

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="border border-border/30 shadow-elevated rounded-2xl overflow-hidden bg-card">
        <div className="h-[2px] bg-gradient-to-r from-primary-glow to-primary" />
        <CardHeader className="pb-4 px-6 pt-6">
          <CardTitle className="font-display text-xl flex items-center gap-2">
            <Webhook className="h-5 w-5 text-primary" /> Atividade de Webhooks
          </CardTitle>
          <CardDescription className="font-body text-sm mt-1">Últimos 50 eventos recebidos ou disparados via bridge</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            {isLoading ? <div className="p-12 flex justify-center"><Spinner size="lg" /></div> : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 border-b border-border/20">
                    <TableHead className="font-display font-semibold py-4 pl-6">Endpoint/URL</TableHead>
                    <TableHead className="font-display font-semibold">Evento</TableHead>
                    <TableHead className="font-display font-semibold text-center">Status</TableHead>
                    <TableHead className="font-display font-semibold hidden sm:table-cell pr-6 text-right">Data/Hora</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {webhooksLogs.map((w: any) => (
                    <TableRow key={w.id} className="hover:bg-accent/10 transition-colors">
                      <TableCell className="font-mono text-[10px] max-w-[200px] truncate pl-6 py-4 text-muted-foreground">{w.url || w.webhook_url || '-'}</TableCell>
                      <TableCell className="text-xs font-bold text-foreground">{w.evento || w.event || '-'}</TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={w.status_code === 200 ? 'outline' : 'destructive'}
                          className={`rounded-lg text-[10px] font-bold px-2 py-0.5 ${w.status_code === 200 ? 'bg-success/10 text-success border-success/30' : ''}`}
                        >
                          {w.status_code || w.status || '-'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[11px] text-muted-foreground font-body hidden sm:table-cell pr-6 text-right">
                        {w.created_at ? new Date(w.created_at).toLocaleString('pt-BR') : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                  {webhooksLogs.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-16 font-body opacity-40">
                        <div className="flex flex-col items-center gap-3">
                          <Webhook className="h-10 w-10" />
                          <p>Nenhum log de webhook registrado.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
