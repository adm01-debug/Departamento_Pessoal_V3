import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageTitle } from '@/components/PageTitle';
import { PageLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { canalContabilidadeService, type ThreadCategoria, type ThreadPrioridade, type ThreadStatus } from '@/services/canalContabilidadeService';
import { useEmpresas } from '@/hooks';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/utils/safeError';
import { safeHref } from '@/utils/safeUrl';
import { MessageSquare, Plus, Send, Paperclip, CheckCircle2, Archive, UserPlus, ExternalLink, Inbox } from 'lucide-react';
import { formatDateTime } from '@/utils/format';

const categoriaLabels: Record<ThreadCategoria, string> = {
  folha: 'Folha', esocial: 'eSocial', admissao: 'Admissão', rescisao: 'Rescisão',
  tributos: 'Tributos', ferias: 'Férias', outro: 'Outro',
};
const prioridadeLabels: Record<ThreadPrioridade, string> = { baixa: 'Baixa', normal: 'Normal', alta: 'Alta', urgente: 'Urgente' };
const statusColors: Record<ThreadStatus, any> = { aberto: 'secondary', respondido: 'default', resolvido: 'outline', arquivado: 'outline' };
const statusLabels: Record<ThreadStatus, string> = { aberto: 'Aberto', respondido: 'Respondido', resolvido: 'Resolvido', arquivado: 'Arquivado' };

export default function CanalContabilidadePage() {
  const { empresaAtual } = useEmpresas();
  const qc = useQueryClient();
  const [activeThread, setActiveThread] = useState<string | null>(null);
  const [newThreadOpen, setNewThreadOpen] = useState(false);
  const [newContatoOpen, setNewContatoOpen] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState<ThreadStatus | 'todos'>('todos');
  const [novaMensagem, setNovaMensagem] = useState('');
  const [anexoFile, setAnexoFile] = useState<File | null>(null);
  const [threadForm, setThreadForm] = useState({
    assunto: '', categoria: 'outro' as ThreadCategoria, prioridade: 'normal' as ThreadPrioridade,
    contato_id: '', mensagemInicial: '',
  });
  const [contatoForm, setContatoForm] = useState({ nome: '', email: '', telefone: '', escritorio: '' });

  const { data: threads = [], isLoading: loadingThreads } = useQuery({
    queryKey: ['contab-threads', empresaAtual?.id, filtroStatus],
    queryFn: () => canalContabilidadeService.listThreads(empresaAtual!.id, filtroStatus === 'todos' ? undefined : filtroStatus),
    enabled: !!empresaAtual?.id,
  });
  const { data: contatos = [] } = useQuery({
    queryKey: ['contab-contatos', empresaAtual?.id],
    queryFn: () => canalContabilidadeService.listContatos(empresaAtual!.id),
    enabled: !!empresaAtual?.id,
  });
  const { data: mensagens = [] } = useQuery({
    queryKey: ['contab-msgs', activeThread],
    queryFn: () => canalContabilidadeService.listMensagens(activeThread!),
    enabled: !!activeThread,
    refetchInterval: 15000,
  });

  const criarThread = useMutation({
    mutationFn: () => canalContabilidadeService.criarThread(empresaAtual!.id, {
      ...threadForm,
      contato_id: threadForm.contato_id || null,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contab-threads'] });
      setNewThreadOpen(false);
      setThreadForm({ assunto: '', categoria: 'outro', prioridade: 'normal', contato_id: '', mensagemInicial: '' });
      toast.success('Solicitação enviada à contabilidade');
    },
    onError: (e: Error) => toast.error(safeErrorMessage(e, 'Erro ao processar solicitação.')),
  });

  const criarContato = useMutation({
    mutationFn: () => canalContabilidadeService.criarContato(empresaAtual!.id, contatoForm),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contab-contatos'] });
      setNewContatoOpen(false);
      setContatoForm({ nome: '', email: '', telefone: '', escritorio: '' });
      toast.success('Contato adicionado');
    },
    onError: (e: Error) => toast.error(safeErrorMessage(e, 'Erro ao processar solicitação.')),
  });

  const enviarMsg = useMutation({
    mutationFn: async () => {
      let anexos: any[] = [];
      if (anexoFile) {
        const meta = await canalContabilidadeService.uploadAnexo(empresaAtual!.id, activeThread!, anexoFile);
        anexos = [meta];
      }
      return canalContabilidadeService.enviarMensagem(activeThread!, empresaAtual!.id, novaMensagem, 'rh', anexos);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contab-msgs', activeThread] });
      qc.invalidateQueries({ queryKey: ['contab-threads'] });
      setNovaMensagem(''); setAnexoFile(null);
    },
    onError: (e: Error) => toast.error(safeErrorMessage(e, 'Erro ao processar solicitação.')),
  });

  const mudarStatus = useMutation({
    mutationFn: (s: ThreadStatus) => canalContabilidadeService.atualizarStatus(empresaAtual!.id, activeThread!, s),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contab-threads'] });
      toast.success('Status atualizado');
    },
  });

  const abrirAnexo = async (path: string) => {
    const url = await canalContabilidadeService.getAnexoUrl(path);
    if (url) window.open(safeHref(url), '_blank', 'noopener');
    else toast.error('Não foi possível abrir anexo');
  };

  const threadAtiva: any = threads.find((t: any) => t.id === activeThread);

  return (
    <>
      <PageTitle title="Canal Contabilidade" description="Comunicação direta com contabilidade externa" />
      <PageLayout title="Canal Contabilidade" description="Envie solicitações, arquivos e acompanhe respostas da contabilidade em um só lugar.">
        <Tabs defaultValue="mensagens">
          <TabsList>
            <TabsTrigger value="mensagens"><MessageSquare className="h-4 w-4 mr-2" />Mensagens</TabsTrigger>
            <TabsTrigger value="contatos"><UserPlus className="h-4 w-4 mr-2" />Contatos ({contatos.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="mensagens" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-260px)]">
              {/* Lista de threads */}
              <Card className="lg:col-span-1 flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-base">Conversas</CardTitle>
                    <Dialog open={newThreadOpen} onOpenChange={setNewThreadOpen}>
                      <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Nova</Button></DialogTrigger>
                      <DialogContent>
                        <DialogHeader><DialogTitle>Nova solicitação à contabilidade</DialogTitle></DialogHeader>
                        <div className="space-y-3">
                          <div><Label>Assunto</Label><Input value={threadForm.assunto} onChange={e => setThreadForm(p => ({ ...p, assunto: e.target.value }))} /></div>
                          <div className="grid grid-cols-2 gap-3">
                            <div><Label>Categoria</Label>
                              <Select value={threadForm.categoria} onValueChange={v => setThreadForm(p => ({ ...p, categoria: v as ThreadCategoria }))}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>{Object.entries(categoriaLabels).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
                              </Select>
                            </div>
                            <div><Label>Prioridade</Label>
                              <Select value={threadForm.prioridade} onValueChange={v => setThreadForm(p => ({ ...p, prioridade: v as ThreadPrioridade }))}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>{Object.entries(prioridadeLabels).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div><Label>Contato (opcional)</Label>
                            <Select value={threadForm.contato_id} onValueChange={v => setThreadForm(p => ({ ...p, contato_id: v }))}>
                              <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                              <SelectContent>{contatos.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.nome} — {c.email}</SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                          <div><Label>Mensagem</Label><Textarea rows={5} value={threadForm.mensagemInicial} onChange={e => setThreadForm(p => ({ ...p, mensagemInicial: e.target.value }))} /></div>
                          <Button className="w-full" onClick={() => criarThread.mutate()}
                            disabled={!threadForm.assunto || !threadForm.mensagemInicial || criarThread.isPending}>
                            {criarThread.isPending ? 'Enviando…' : 'Enviar solicitação'}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                  <Select value={filtroStatus} onValueChange={v => setFiltroStatus(v as any)}>
                    <SelectTrigger className="h-8 mt-2"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos os status</SelectItem>
                      {Object.entries(statusLabels).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto p-0">
                  {loadingThreads ? <div className="p-4"><Spinner /></div> :
                    threads.length === 0 ? (
                      <div className="p-6 text-center text-sm text-muted-foreground">
                        <Inbox className="h-8 w-8 mx-auto mb-2 opacity-40" />
                        Nenhuma conversa
                      </div>
                    ) : threads.map((t: any) => (
                      <button key={t.id} onClick={() => setActiveThread(t.id)}
                        className={`w-full text-left px-4 py-3 border-b hover:bg-accent transition ${activeThread === t.id ? 'bg-accent' : ''}`}>
                        <div className="flex justify-between items-start gap-2">
                          <p className="font-medium text-sm truncate flex-1">{t.assunto}</p>
                          <Badge variant={statusColors[t.status as ThreadStatus]} className="text-xs">{statusLabels[t.status as ThreadStatus]}</Badge>
                        </div>
                        <div className="flex justify-between items-center mt-1 text-xs text-muted-foreground">
                          <span>{categoriaLabels[t.categoria as ThreadCategoria]} · {prioridadeLabels[t.prioridade as ThreadPrioridade]}</span>
                          <span>{formatDateTime(t.ultima_atividade_em)}</span>
                        </div>
                      </button>
                    ))}
                </CardContent>
              </Card>

              {/* Thread ativa */}
              <Card className="lg:col-span-2 flex flex-col">
                {!activeThread ? (
                  <div className="flex-1 flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-40" />
                      <p>Selecione uma conversa</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <CardHeader className="border-b pb-3">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <CardTitle className="text-base">{threadAtiva?.assunto}</CardTitle>
                          <p className="text-xs text-muted-foreground mt-1">
                            {threadAtiva?.contato?.nome ? `Com ${threadAtiva.contato.nome} (${threadAtiva.contato.email})` : 'Sem contato específico'}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          {threadAtiva?.status !== 'resolvido' && (
                            <Button size="sm" variant="outline" onClick={() => mudarStatus.mutate('resolvido')}>
                              <CheckCircle2 className="h-4 w-4 mr-1" />Resolver
                            </Button>
                          )}
                          {threadAtiva?.status !== 'arquivado' && (
                            <Button size="sm" variant="ghost" onClick={() => mudarStatus.mutate('arquivado')}>
                              <Archive className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto space-y-3 py-4">
                      {mensagens.map((m: any) => (
                        <div key={m.id} className={`flex ${m.autor_tipo === 'rh' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[75%] rounded-lg px-3 py-2 ${m.autor_tipo === 'rh' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                            <p className="text-xs opacity-70 mb-1">{m.autor_nome || m.autor_tipo} · {formatDateTime(m.created_at)}</p>
                            <p className="whitespace-pre-wrap text-sm">{m.corpo}</p>
                            {Array.isArray(m.anexos) && m.anexos.map((a: any, i: number) => (
                              <button key={i} onClick={() => abrirAnexo(a.path)} className="mt-2 flex items-center gap-1 text-xs underline">
                                <Paperclip className="h-3 w-3" />{a.nome}<ExternalLink className="h-3 w-3" />
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </CardContent>
                    <div className="border-t p-3 space-y-2">
                      <Textarea placeholder="Escreva uma resposta…" rows={2} value={novaMensagem} onChange={e => setNovaMensagem(e.target.value)} />
                      <div className="flex items-center gap-2">
                        <Input type="file" className="flex-1 text-xs" onChange={e => setAnexoFile(e.target.files?.[0] ?? null)} />
                        <Button onClick={() => enviarMsg.mutate()} disabled={!novaMensagem.trim() || enviarMsg.isPending}>
                          <Send className="h-4 w-4 mr-1" />Enviar
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="contatos" className="mt-4">
            <div className="flex justify-end mb-3">
              <Dialog open={newContatoOpen} onOpenChange={setNewContatoOpen}>
                <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />Novo contato</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Novo contato</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div><Label>Nome *</Label><Input value={contatoForm.nome} onChange={e => setContatoForm(p => ({ ...p, nome: e.target.value }))} /></div>
                    <div><Label>Email *</Label><Input type="email" value={contatoForm.email} onChange={e => setContatoForm(p => ({ ...p, email: e.target.value }))} /></div>
                    <div><Label>Telefone</Label><Input value={contatoForm.telefone} onChange={e => setContatoForm(p => ({ ...p, telefone: e.target.value }))} /></div>
                    <div><Label>Escritório</Label><Input value={contatoForm.escritorio} onChange={e => setContatoForm(p => ({ ...p, escritorio: e.target.value }))} /></div>
                  </div>
                  <DialogFooter>
                    <Button onClick={() => criarContato.mutate()} disabled={!contatoForm.nome || !contatoForm.email || criarContato.isPending}>
                      {criarContato.isPending ? 'Salvando…' : 'Salvar'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {contatos.map((c: any) => (
                <Card key={c.id}>
                  <CardContent className="pt-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{c.nome}</p>
                        <p className="text-sm text-muted-foreground">{c.email}</p>
                        {c.telefone && <p className="text-xs text-muted-foreground">{c.telefone}</p>}
                        {c.escritorio && <p className="text-xs mt-1 italic">{c.escritorio}</p>}
                      </div>
                      <Badge variant={c.ativo ? 'default' : 'outline'}>{c.ativo ? 'Ativo' : 'Inativo'}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {contatos.length === 0 && <p className="col-span-full text-center text-muted-foreground py-8">Nenhum contato cadastrado</p>}
            </div>
          </TabsContent>
        </Tabs>
      </PageLayout>
    </>
  );
}
