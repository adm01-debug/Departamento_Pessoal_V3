import { useState, type ChangeEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Spinner } from '@/components/ui/spinner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { ExternalLink, RefreshCw, XCircle, Settings, History, Plus, Zap } from 'lucide-react';
import { bitrix24Service } from '@/services/tabelasComplementaresService';
import { cnabService, webhookService } from '@/services/integracaoService';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/utils/safeError';
import type { WhatsAppConfig } from '@/services/whatsappService';
import { whatsappService } from '@/services/whatsappService';
import { useEmpresas } from '@/hooks/useEmpresas';

export function Bitrix24ConfigPanel() {
  const qc = useQueryClient();
  const [tab, setTab] = useState('config');

  const { data: config, isLoading: loadConfig } = useQuery({
    queryKey: ['bitrix24_config'],
    queryFn: () => bitrix24Service.getConfig(),
  });

  const { data: logs = [], isLoading: loadLogs } = useQuery({
    queryKey: ['bitrix24_sync_logs'],
    queryFn: () => bitrix24Service.getLogs(),
  });

  const [form, setForm] = useState({
    webhook_url: '',
    habilitado: false,
    sync_colaboradores: true,
    sync_departamentos: true,
    sync_cargos: true,
    intervalo_minutos: 60,
  });

  const [initialized, setInitialized] = useState(false);
  if (config && !initialized) {
    setForm({
      webhook_url: config.webhook_url || '',
      habilitado: config.habilitado || false,
      sync_colaboradores: config.sync_colaboradores ?? true,
      sync_departamentos: config.sync_departamentos ?? true,
      sync_cargos: config.sync_cargos ?? true,
      intervalo_minutos: config.intervalo_minutos || 60,
    });
    setInitialized(true);
  }

  const salvar = useMutation({
    mutationFn: () => {
      // E50-37: checagem de forma só para feedback imediato — a validação
      // que importa (resolução de IP privado/loopback) roda no servidor a
      // cada sincronização, porque essa é a fronteira de segurança real.
      if (form.webhook_url) {
        let parsed: URL;
        try {
          parsed = new URL(form.webhook_url);
        } catch {
          throw new Error('URL do webhook inválida.');
        }
        if (parsed.protocol !== 'https:') {
          throw new Error('URL do webhook deve usar https.');
        }
        if (['localhost', '127.0.0.1', '0.0.0.0', '::1'].includes(parsed.hostname.toLowerCase())) {
          throw new Error('URL do webhook não pode apontar para host local.');
        }
      }
      return bitrix24Service.saveConfig({ ...form, id: config?.id || undefined });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bitrix24_config'] });
      toast.success('Configuração salva!');
    },
    onError: (err: unknown) => toast.error(safeErrorMessage(err, 'Erro ao salvar')),
  });

  const sincronizar = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('sincronizar-bitrix', {
        body: { action: 'sync_all' },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['bitrix24_sync_logs'] });
      const { success: sucessos, errors: erros } = res.data.totals;
      // E50-36: a Edge agora reporta falha parcial de verdade (207/502) em
      // vez de sempre success:true — refletir isso na UI em vez do toast de
      // conclusão genérico.
      if (res.success === false || erros > 0) {
        toast.error(`Sincronização com falhas: ${sucessos} sucesso(s), ${erros} erro(s).`);
      } else {
        toast.success(`Sincronização concluída: ${sucessos} sucessos.`);
      }
    },
    onError: (err) => toast.error(safeErrorMessage(err, 'Falha no Sync.')),
  });

  if (loadConfig)
    return (
      <div className="flex justify-center py-8">
        <Spinner />
      </div>
    );

  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList className="mb-4">
        <TabsTrigger value="config">
          <Settings className="h-3.5 w-3.5 mr-1" />
          Configuração
        </TabsTrigger>
        <TabsTrigger value="logs">
          <History className="h-3.5 w-3.5 mr-1" />
          Logs de Sincronização
        </TabsTrigger>
      </TabsList>

      <TabsContent value="config">
        <div className="grid gap-4 max-w-lg">
          <div>
            <Label>Webhook URL *</Label>
            <Input
              value={form.webhook_url}
              onChange={(e) => setForm((p) => ({ ...p, webhook_url: e.target.value }))}
              placeholder="https://seu-bitrix.bitrix24.com.br/rest/..."
            />
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={form.habilitado} onCheckedChange={(v) => setForm((p) => ({ ...p, habilitado: v }))} />
            <Label>Integração Habilitada</Label>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="flex items-center gap-2">
              <Switch
                checked={form.sync_colaboradores}
                onCheckedChange={(v) => setForm((p) => ({ ...p, sync_colaboradores: v }))}
              />
              <Label className="text-sm">Colaboradores</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.sync_departamentos}
                onCheckedChange={(v) => setForm((p) => ({ ...p, sync_departamentos: v }))}
              />
              <Label className="text-sm">Departamentos</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.sync_cargos} onCheckedChange={(v) => setForm((p) => ({ ...p, sync_cargos: v }))} />
              <Label className="text-sm">Cargos</Label>
            </div>
          </div>
          <div>
            <Label>Intervalo de Sincronização (min)</Label>
            <Input
              type="number"
              value={form.intervalo_minutos}
              onChange={(e) => setForm((p) => ({ ...p, intervalo_minutos: Number(e.target.value) }))}
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={() => salvar.mutate()} disabled={!form.webhook_url || salvar.isPending} className="flex-1">
              {salvar.isPending ? 'Salvando...' : 'Salvar Configuração'}
            </Button>
            <Button
              variant="outline"
              onClick={() => sincronizar.mutate()}
              disabled={!config?.habilitado || sincronizar.isPending}
            >
              {sincronizar.isPending ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Sync Agora
            </Button>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="logs">
        {loadLogs ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Direção</TableHead>
                    <TableHead>Processados</TableHead>
                    <TableHead>Sucesso</TableHead>
                    <TableHead>Erros</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        Nenhum log de sincronização
                      </TableCell>
                    </TableRow>
                  ) : (
                    logs.map((l) => (
                      <TableRow key={l.id}>
                        <TableCell className="text-xs">
                          {l.created_at ? new Date(l.created_at).toLocaleString('pt-BR') : '—'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{l.tipo}</Badge>
                        </TableCell>
                        <TableCell>{l.direcao}</TableCell>
                        <TableCell>{l.registros_processados ?? 0}</TableCell>
                        <TableCell className="text-success">{l.registros_sucesso ?? l.sucesso ?? 0}</TableCell>
                        <TableCell className="text-destructive">{l.registros_erro ?? l.erros ?? 0}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </TabsContent>
    </Tabs>
  );
}

export function CnabConfigPanel() {
  const [tab, setTab] = useState('remessas');
  const { empresaAtual } = useEmpresas();
  const empresaId = empresaAtual?.id || '';
  const {
    data: config,
    isLoading: carregandoConfig,
    isError: erroConfig,
  } = useQuery({
    queryKey: ['cnab_config', empresaId],
    queryFn: () => cnabService.getConfig(empresaId),
    enabled: !!empresaId,
  });
  const { data: remessas = [], isLoading } = useQuery({
    queryKey: ['cnab_remessas', empresaId],
    queryFn: () => cnabService.getRemessas(empresaId),
    enabled: !!empresaId,
  });

  const qc = useQueryClient();
  const [form, setForm] = useState({
    nome_empresa: '',
    banco_codigo: '',
    agencia: '',
    conta: '',
    conta_digito: '',
    codigo_empresa: '',
    convenio: '',
  });
  // Recarrega o formulário quando chega a config salva (ou a ausência dela) de outra empresa.
  const [carregadoDe, setCarregadoDe] = useState<string | null>(null);
  const chaveConfig = config ? config.id : config === null ? `nova:${empresaId}` : null;
  if (chaveConfig && carregadoDe !== chaveConfig) {
    setForm({
      nome_empresa: config?.nome_empresa ?? '',
      banco_codigo: config?.banco_codigo ?? '',
      agencia: config?.agencia ?? '',
      conta: config?.conta ?? '',
      conta_digito: config?.conta_digito ?? '',
      codigo_empresa: config?.codigo_empresa ?? '',
      convenio: config?.convenio ?? '',
    });
    setCarregadoDe(chaveConfig);
  }
  const setCampo = (campo: keyof typeof form) => (e: ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [campo]: e.target.value }));

  const salvarConfig = useMutation({
    mutationFn: () => {
      const d = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v.trim()])) as typeof form;
      if (!d.banco_codigo || !d.agencia || !d.conta || !d.conta_digito || !d.convenio) {
        throw new Error('Preencha código do banco, agência, conta, dígito da conta e convênio.');
      }
      return cnabService.saveConfig(empresaId, {
        ...d,
        nome_empresa: d.nome_empresa || null,
        codigo_empresa: d.codigo_empresa || null,
        id: config?.id,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cnab_config', empresaId] });
      toast.success('Configuração bancária salva!');
    },
    onError: (err: unknown) => toast.error(safeErrorMessage(err, 'Erro ao salvar configuração bancária')),
  });

  return (
    <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col overflow-hidden">
      <div className="px-6 border-b border-border/20 bg-muted/20">
        <TabsList className="h-12 bg-transparent gap-4">
          <TabsTrigger
            value="remessas"
            className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
          >
            Remessas Geradas
          </TabsTrigger>
          <TabsTrigger
            value="config"
            className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
          >
            Configuração Bancária
          </TabsTrigger>
        </TabsList>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <TabsContent value="remessas" className="m-0">
          {isLoading ? (
            <Spinner />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Banco</TableHead>
                  <TableHead>Arquivo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {remessas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-muted-foreground italic">
                      Nenhuma remessa gerada
                    </TableCell>
                  </TableRow>
                ) : (
                  remessas.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs">
                        {r.created_at ? new Date(r.created_at).toLocaleString('pt-BR') : '—'}
                      </TableCell>
                      <TableCell className="font-medium text-sm">{r.banco_codigo || '—'}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {`REMESSA_${r.sequencial_arquivo ?? r.id.slice(0, 8)}.txt`}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-success/10 text-success border-0">
                          {r.status || 'Processado'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="h-8 rounded-lg">
                          <ExternalLink className="h-3 w-3 mr-2" />
                          Download
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="config" className="m-0">
          <div className="grid gap-6 max-w-2xl">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome da Empresa</Label>
                <Input
                  placeholder="Razão social no arquivo CNAB"
                  value={form.nome_empresa}
                  onChange={setCampo('nome_empresa')}
                />
              </div>
              <div className="space-y-2">
                <Label>Código do Banco</Label>
                <Input placeholder="Ex: 341" value={form.banco_codigo} onChange={setCampo('banco_codigo')} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Agência</Label>
                <Input placeholder="0000" value={form.agencia} onChange={setCampo('agencia')} />
              </div>
              <div className="grid grid-cols-[1fr_5rem] gap-2">
                <div className="space-y-2">
                  <Label>Conta Corrente</Label>
                  <Input placeholder="00000" value={form.conta} onChange={setCampo('conta')} />
                </div>
                <div className="space-y-2">
                  <Label>Dígito</Label>
                  <Input placeholder="0" value={form.conta_digito} onChange={setCampo('conta_digito')} />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Código da Empresa (CNAB)</Label>
                <Input placeholder="Ex: 0001" value={form.codigo_empresa} onChange={setCampo('codigo_empresa')} />
              </div>
              <div className="space-y-2">
                <Label>Convênio</Label>
                <Input placeholder="Código de convênio" value={form.convenio} onChange={setCampo('convenio')} />
              </div>
            </div>
            <Button
              className="w-fit px-8 rounded-xl shadow-lg shadow-primary/20"
              onClick={() => salvarConfig.mutate()}
              disabled={!empresaId || carregandoConfig || erroConfig || config === undefined || salvarConfig.isPending}
            >
              {salvarConfig.isPending ? 'Salvando...' : 'Salvar Configurações'}
            </Button>
          </div>
        </TabsContent>
      </div>
    </Tabs>
  );
}

export function WebhookConfigPanel() {
  const [tab, setTab] = useState('webhooks');
  const { empresaAtual } = useEmpresas();
  const empresaId = empresaAtual?.id || '';
  const { data: webhooks = [], isLoading: loadWebhooks } = useQuery({
    queryKey: ['webhooks', empresaId],
    queryFn: () => webhookService.listar(empresaId),
    enabled: !!empresaId,
  });
  const { data: logs = [], isLoading: loadLogs } = useQuery({
    queryKey: ['webhook_logs', empresaId],
    queryFn: () => webhookService.getLogs(empresaId),
    enabled: !!empresaId,
  });

  const qc = useQueryClient();
  const [novoOpen, setNovoOpen] = useState(false);
  const [novoUrl, setNovoUrl] = useState('');
  const [novoEventos, setNovoEventos] = useState('');

  const criarWebhook = useMutation({
    mutationFn: () => {
      const url = novoUrl.trim();
      let parsed: URL;
      try {
        parsed = new URL(url);
      } catch {
        throw new Error('URL do webhook inválida.');
      }
      if (parsed.protocol !== 'https:') throw new Error('URL do webhook deve usar https.');
      const eventos = novoEventos
        .split(',')
        .map((e) => e.trim())
        .filter(Boolean);
      if (eventos.length === 0) throw new Error('Informe ao menos um evento.');
      return webhookService.criar(empresaId, { url, eventos });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['webhooks', empresaId] });
      toast.success('Webhook criado!');
      setNovoOpen(false);
      setNovoUrl('');
      setNovoEventos('');
    },
    onError: (err: unknown) => toast.error(safeErrorMessage(err, 'Erro ao criar webhook')),
  });

  const removerWebhook = useMutation({
    mutationFn: (id: string) => webhookService.excluir(empresaId, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['webhooks', empresaId] });
      qc.invalidateQueries({ queryKey: ['webhook_logs', empresaId] });
      toast.success('Webhook removido.');
    },
    onError: (err: unknown) => toast.error(safeErrorMessage(err, 'Erro ao remover webhook')),
  });

  return (
    <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col overflow-hidden">
      <div className="px-6 border-b border-border/20 bg-muted/20">
        <TabsList className="h-12 bg-transparent gap-4">
          <TabsTrigger
            value="webhooks"
            className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
          >
            Webhooks Ativos
          </TabsTrigger>
          <TabsTrigger
            value="logs"
            className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
          >
            Logs de Entrega
          </TabsTrigger>
        </TabsList>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <TabsContent value="webhooks" className="m-0">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-semibold text-lg">Seus Webhooks</h3>
              <p className="text-sm text-muted-foreground">Configure URLs para receber eventos do sistema</p>
            </div>
            <Dialog open={novoOpen} onOpenChange={setNovoOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="rounded-xl" disabled={!empresaId}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Webhook
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Novo Webhook</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="novo-webhook-url">URL de destino</Label>
                    <Input
                      id="novo-webhook-url"
                      placeholder="https://..."
                      value={novoUrl}
                      onChange={(e) => setNovoUrl(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="novo-webhook-eventos">Eventos (separados por vírgula)</Label>
                    <Input
                      id="novo-webhook-eventos"
                      placeholder="Ex: colaborador.criado, ferias.aprovadas"
                      value={novoEventos}
                      onChange={(e) => setNovoEventos(e.target.value)}
                    />
                  </div>
                  <Button
                    className="w-full rounded-xl"
                    onClick={() => criarWebhook.mutate()}
                    disabled={!novoUrl.trim() || criarWebhook.isPending}
                  >
                    {criarWebhook.isPending ? 'Salvando...' : 'Salvar Webhook'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          {loadWebhooks ? (
            <Spinner />
          ) : (
            <div className="grid gap-4">
              {webhooks.length === 0 ? (
                <div className="p-12 text-center border border-dashed rounded-2xl text-muted-foreground">
                  Clique em "Novo Webhook" para começar
                </div>
              ) : (
                webhooks.map((w) => (
                  <Card key={w.id} className="border-border/30 overflow-hidden group">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-primary/10 rounded-xl">
                          <Zap className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-medium text-sm">
                            {(w.eventos as string[] | null)?.join(', ') || 'Webhook'}
                          </h4>
                          <p className="text-xs font-mono text-muted-foreground">{w.url}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="bg-success/10 text-success border-0">
                          Ativo
                        </Badge>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Remover"
                              className="text-destructive hover:bg-destructive/10"
                              disabled={removerWebhook.isPending}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remover webhook?</AlertDialogTitle>
                              <AlertDialogDescription>
                                {w.url} deixará de receber eventos e o histórico de entregas dele será apagado.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => removerWebhook.mutate(w.id)}>Remover</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="logs" className="m-0">
          {loadLogs ? (
            <Spinner />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Webhook</TableHead>
                  <TableHead>Evento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Resposta</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-muted-foreground italic">
                      Nenhum log de entrega
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="text-xs">
                        {l.created_at ? new Date(l.created_at).toLocaleString('pt-BR') : '—'}
                      </TableCell>
                      <TableCell className="text-sm">{l.webhook_id ? l.webhook_id.slice(0, 8) : 'Webhook'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {l.evento || 'colaborador.criado'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {l.status_code === 200 ? (
                          <Badge className="bg-success text-white">200 OK</Badge>
                        ) : (
                          <Badge variant="destructive">{l.status_code || 'Erro'}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs font-mono max-w-[150px] truncate text-muted-foreground">
                        {typeof l.resposta === 'string' ? l.resposta : '—'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </TabsContent>
      </div>
    </Tabs>
  );
}

export function WhatsAppConfigPanel() {
  const { empresaAtual } = useEmpresas();
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<Partial<WhatsAppConfig>>({
    instancia_url: '',
    api_key: '',
    instancia_nome: 'default',
    notificar_ponto: true,
    notificar_ferias: true,
    notificar_holerite: true,
  });

  const { data: existingConfig, isLoading } = useQuery({
    queryKey: ['whatsapp_config', empresaAtual?.id],
    queryFn: () => whatsappService.getConfig(empresaAtual!.id),
    enabled: !!empresaAtual?.id,
  });

  useState(() => {
    if (existingConfig) setConfig(existingConfig);
  });

  const salvar = async () => {
    if (!empresaAtual?.id) return;
    setLoading(true);
    try {
      await whatsappService.saveConfig({ ...config, empresa_id: empresaAtual.id, status: config?.status ?? 'active' });
      toast.success('Configuração de WhatsApp salva!');
    } catch {
      toast.error('Erro ao salvar configuração');
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) return <Spinner />;

  return (
    <div className="p-6 space-y-6">
      <div className="grid gap-4 max-w-lg">
        <div className="space-y-2">
          <Label>URL da Instância (Evolution API)</Label>
          <Input
            value={config.instancia_url || ''}
            onChange={(e) => setConfig((p) => ({ ...p, instancia_url: e.target.value }))}
            placeholder="https://sua-api.com"
          />
        </div>
        <div className="space-y-2">
          <Label>API Key</Label>
          <Input
            type="password"
            autoComplete="off"
            value={config.api_key || ''}
            onChange={(e) => setConfig((p) => ({ ...p, api_key: e.target.value }))}
            placeholder="Sua chave secreta"
          />
        </div>
        <div className="space-y-2">
          <Label>Nome da Instância</Label>
          <Input
            value={config.instancia_nome || ''}
            onChange={(e) => setConfig((p) => ({ ...p, instancia_nome: e.target.value }))}
            placeholder="default"
          />
        </div>

        <div className="pt-4 space-y-4">
          <h4 className="text-sm font-semibold border-b pb-2">Notificações Automáticas</h4>
          <div className="flex items-center justify-between">
            <Label>Notificar registro de ponto</Label>
            <Switch
              checked={!!config.notificar_ponto}
              onCheckedChange={(v) => setConfig((p) => ({ ...p, notificar_ponto: v }))}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>Notificar aviso de férias</Label>
            <Switch
              checked={!!config.notificar_ferias}
              onCheckedChange={(v) => setConfig((p) => ({ ...p, notificar_ferias: v }))}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>Notificar liberação de holerite</Label>
            <Switch
              checked={!!config.notificar_holerite}
              onCheckedChange={(v) => setConfig((p) => ({ ...p, notificar_holerite: v }))}
            />
          </div>
        </div>

        <Button onClick={salvar} disabled={loading} className="w-full rounded-xl mt-4">
          {loading ? 'Salvando...' : 'Salvar e Ativar Integração'}
        </Button>
      </div>
    </div>
  );
}
