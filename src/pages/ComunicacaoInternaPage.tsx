import { PageTitle } from '@/components/PageTitle';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { comunicacaoService } from '@/services/comunicacaoService';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresas } from '@/hooks';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  Plus, Megaphone, Shield, AlertTriangle, Trash2, Pin, Search,
  Eye, EyeOff, Calendar, Clock, CheckCircle, Users, Bell,
  MessageSquare, Send, Filter, Star
} from 'lucide-react';
import { format } from 'date-fns';

const tipoColors: Record<string, string> = {
  aviso: 'bg-warning/15 text-warning', mural: 'bg-info/15 text-info',
  evento: 'bg-success/15 text-success', urgente: 'bg-destructive/15 text-destructive',
};
const tipoIcons: Record<string, React.ElementType> = {
  aviso: AlertTriangle, mural: MessageSquare, evento: Calendar, urgente: Bell,
};
const statusEticaColors: Record<string, string> = { aberto: 'default', em_analise: 'secondary', resolvido: 'outline', arquivado: 'outline' };

export default function ComunicacaoInternaPage() {
  const { empresaAtual } = useEmpresas();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [openCom, setOpenCom] = useState(false);
  const [openEtica, setOpenEtica] = useState(false);
  const [busca, setBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [formCom, setFormCom] = useState({ titulo: '', conteudo: '', tipo: 'aviso', prioridade: 1, fixado: false });
  const [formEtica, setFormEtica] = useState({ categoria: 'outro', descricao: '', anonimo: true });

  // Realtime for comunicados
  useEffect(() => {
    const channel = supabase
      .channel('comunicados-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comunicados' }, () => {
        qc.invalidateQueries({ queryKey: ['comunicados'] });
        toast.info('📢 Novo comunicado publicado!');
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc]);

  const { data: comunicados = [], isLoading: loadCom } = useQuery({
    queryKey: ['comunicados', empresaAtual?.id],
    queryFn: () => comunicacaoService.listarComunicados(empresaAtual!.id),
    enabled: !!empresaAtual?.id,
  });

  const { data: leituras = [] } = useQuery({
    queryKey: ['comunicados-leituras', empresaAtual?.id, user?.id],
    enabled: !!empresaAtual?.id && !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from('comunicados_leituras').select('comunicado_id').eq('usuario_id', user!.id);
      if (error) return [];
      return data?.map((l: any) => l.comunicado_id) || [];
    },
  });

  const { data: denuncias = [], isLoading: loadEtica } = useQuery({
    queryKey: ['canal_etica', empresaAtual?.id],
    queryFn: () => comunicacaoService.listarDenuncias(empresaAtual!.id),
    enabled: !!empresaAtual?.id,
  });

  const comunicadosFiltrados = comunicados.filter((c: any) => {
    if (filtroTipo !== 'todos' && c.tipo !== filtroTipo) return false;
    if (busca && !c.titulo?.toLowerCase().includes(busca.toLowerCase()) && !c.conteudo?.toLowerCase().includes(busca.toLowerCase())) return false;
    return true;
  });

  const fixados = comunicadosFiltrados.filter((c: any) => c.fixado);
  const normais = comunicadosFiltrados.filter((c: any) => !c.fixado);

  const criarCom = useMutation({
    mutationFn: () => comunicacaoService.criarComunicado({ ...formCom, empresa_id: empresaAtual?.id, ativo: true }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['comunicados'] }); setOpenCom(false); toast.success('Comunicado publicado!'); setFormCom({ titulo: '', conteudo: '', tipo: 'aviso', prioridade: 1, fixado: false }); },
    onError: () => toast.error('Erro ao publicar'),
  });

  const criarEtica = useMutation({
    mutationFn: () => comunicacaoService.criarDenuncia({ ...formEtica, empresa_id: empresaAtual?.id }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['canal_etica'] }); setOpenEtica(false); toast.success('Relato registrado!'); setFormEtica({ categoria: 'outro', descricao: '', anonimo: true }); },
    onError: () => toast.error('Erro ao registrar'),
  });

  const marcarLido = useMutation({
    mutationFn: async (comunicadoId: string) => {
      if (!user?.id) return;
      await comunicacaoService.marcarLido(comunicadoId, user.id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['comunicados-leituras'] }),
  });

  const excluirCom = useMutation({
    mutationFn: (id: string) => comunicacaoService.excluirComunicado(id, empresaAtual!.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['comunicados'] }); toast.success('Comunicado excluído'); },
  });

  const naoLidos = comunicados.filter((c: any) => !leituras.includes(c.id)).length;

  const renderComunicado = (c: any, i: number) => {
    const isLido = leituras.includes(c.id);
    const Icon = tipoIcons[c.tipo] || Megaphone;
    return (
      <motion.div key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
        <Card className={cn('border border-border/30 rounded-xl transition-all hover:shadow-elevated group', !isLido && 'border-l-4 border-l-primary bg-primary/[0.02]', c.fixado && 'ring-1 ring-warning/30')}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className={cn('p-2 rounded-xl shrink-0', tipoColors[c.tipo] || 'bg-muted')}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {c.fixado && <Pin className="h-3 w-3 text-warning" />}
                  <h3 className="font-display font-semibold text-sm">{c.titulo}</h3>
                  <Badge className={cn('text-[10px] border-0', tipoColors[c.tipo])}>{c.tipo}</Badge>
                  {c.ativo && <Badge variant="default" className="text-[10px]">Ativo</Badge>}
                </div>
                <p className="text-sm text-muted-foreground font-body line-clamp-3">{c.conteudo}</p>
                <div className="flex items-center gap-4 mt-2">
                  <span className="text-[11px] text-muted-foreground/60 flex items-center gap-1">
                    <Clock className="h-3 w-3" />{new Date(c.created_at).toLocaleDateString('pt-BR')}
                  </span>
                  {!isLido && (
                    <Button variant="ghost" size="sm" className="h-6 text-[11px] rounded-lg text-primary" onClick={() => marcarLido.mutate(c.id)}>
                      <Eye className="h-3 w-3 mr-1" />Marcar como lido
                    </Button>
                  )}
                  {isLido && <span className="text-[11px] text-success flex items-center gap-1"><CheckCircle className="h-3 w-3" />Lido</span>}
                </div>
              </div>
              <Button size="icon" variant="ghost" aria-label="Excluir" className="h-8 w-8 opacity-0 group-hover:opacity-100 text-destructive rounded-lg" onClick={() => excluirCom.mutate(c.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  return (
    <>
    <PageTitle title="Comunicação Interna" description="Comunicados e mensagens internas" />
    <PageLayout title="Comunicação Interna" description="Mural de comunicados e canal de ética"
      icon={<Megaphone className="h-5 w-5 text-primary-foreground" />} gradient="from-info to-primary"
    >
      {/* Realtime indicator */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
        <span className="text-xs text-muted-foreground font-body">Comunicados em tempo real</span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Comunicados', value: comunicados.length, icon: Megaphone, gradient: 'from-primary to-primary-glow' },
          { label: 'Não Lidos', value: naoLidos, icon: EyeOff, gradient: 'from-warning to-warning/70' },
          { label: 'Relatos Éticos', value: denuncias.length, icon: Shield, gradient: 'from-info to-info/70' },
          { label: 'Abertos', value: denuncias.filter((d: any) => d.status === 'aberto').length, icon: AlertTriangle, gradient: 'from-destructive to-destructive/70' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="border border-border/30 rounded-2xl overflow-hidden">
              <div className={cn("h-[2px] bg-gradient-to-r", s.gradient)} />
              <CardContent className="p-4 flex items-center gap-3">
                <div className={cn("p-2 rounded-xl bg-gradient-to-br", s.gradient)}><s.icon className="h-4 w-4 text-primary-foreground" /></div>
                <div><p className="text-xl font-display font-bold">{s.value}</p><p className="text-[11px] text-muted-foreground font-body">{s.label}</p></div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Tabs defaultValue="comunicados">
        <TabsList className="mb-4">
          <TabsTrigger value="comunicados"><Megaphone className="mr-1 h-4 w-4" />Mural {naoLidos > 0 && <Badge className="ml-1 bg-warning text-warning-foreground text-[9px] px-1.5">{naoLidos}</Badge>}</TabsTrigger>
          <TabsTrigger value="etica"><Shield className="mr-1 h-4 w-4" />Canal de Ética</TabsTrigger>
        </TabsList>

        <TabsContent value="comunicados">
          {/* Filters + Actions */}
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar comunicados..." value={busca} onChange={e => setBusca(e.target.value)} className="pl-9 rounded-xl" />
            </div>
            <Select value={filtroTipo} onValueChange={setFiltroTipo}>
              <SelectTrigger className="w-[140px] rounded-xl"><Filter className="h-4 w-4 mr-1" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="aviso">Avisos</SelectItem>
                <SelectItem value="mural">Mural</SelectItem>
                <SelectItem value="evento">Eventos</SelectItem>
                <SelectItem value="urgente">Urgentes</SelectItem>
              </SelectContent>
            </Select>
            <Dialog open={openCom} onOpenChange={setOpenCom}>
              <DialogTrigger asChild><Button className="rounded-xl"><Plus className="mr-2 h-4 w-4" />Novo Comunicado</Button></DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader><DialogTitle>Novo Comunicado</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div><Label>Título</Label><Input value={formCom.titulo} onChange={e => setFormCom(p => ({ ...p, titulo: e.target.value }))} placeholder="Título do comunicado" /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Tipo</Label>
                      <Select value={formCom.tipo} onValueChange={v => setFormCom(p => ({ ...p, tipo: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="aviso">Aviso</SelectItem><SelectItem value="mural">Mural</SelectItem><SelectItem value="evento">Evento</SelectItem><SelectItem value="urgente">Urgente</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end gap-2 pb-0.5">
                      <Switch checked={formCom.fixado} onCheckedChange={v => setFormCom(p => ({ ...p, fixado: v }))} />
                      <Label className="text-sm">Fixar no topo</Label>
                    </div>
                  </div>
                  <div><Label>Conteúdo</Label><Textarea value={formCom.conteudo} onChange={e => setFormCom(p => ({ ...p, conteudo: e.target.value }))} rows={5} placeholder="Escreva o comunicado..." /></div>
                  <Button className="w-full rounded-xl" onClick={() => criarCom.mutate()} disabled={!formCom.titulo || criarCom.isPending}>
                    <Send className="h-4 w-4 mr-2" />{criarCom.isPending ? 'Publicando...' : 'Publicar Comunicado'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {loadCom ? <div className="flex justify-center p-8"><Spinner size="lg" /></div> : comunicadosFiltrados.length === 0 ? (
            <Card className="border border-border/30 rounded-xl"><CardContent className="py-12 text-center text-muted-foreground"><Megaphone className="mx-auto h-12 w-12 mb-4 opacity-30" /><p className="font-body">Nenhum comunicado encontrado</p></CardContent></Card>
          ) : (
            <div className="space-y-3">
              {fixados.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground font-body flex items-center gap-1"><Pin className="h-3 w-3" />Fixados</p>
                  {fixados.map((c: any, i: number) => renderComunicado(c, i))}
                </div>
              )}
              {normais.length > 0 && (
                <div className="space-y-2">
                  {fixados.length > 0 && <p className="text-xs text-muted-foreground font-body mt-4">Recentes</p>}
                  {normais.map((c: any, i: number) => renderComunicado(c, i + fixados.length))}
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="etica">
          <div className="flex justify-end mb-4">
            <Dialog open={openEtica} onOpenChange={setOpenEtica}>
              <DialogTrigger asChild><Button variant="outline" className="rounded-xl"><Plus className="mr-2 h-4 w-4" />Novo Relato</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Canal de Ética — Novo Relato</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div><Label>Categoria</Label>
                    <Select value={formEtica.categoria} onValueChange={v => setFormEtica(p => ({ ...p, categoria: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="assedio">Assédio</SelectItem><SelectItem value="discriminacao">Discriminação</SelectItem><SelectItem value="fraude">Fraude</SelectItem><SelectItem value="seguranca">Segurança</SelectItem><SelectItem value="outro">Outro</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div><Label>Descrição</Label><Textarea value={formEtica.descricao} onChange={e => setFormEtica(p => ({ ...p, descricao: e.target.value }))} rows={4} placeholder="Descreva a situação..." /></div>
                  <Button className="w-full rounded-xl" onClick={() => criarEtica.mutate()} disabled={!formEtica.descricao || criarEtica.isPending}>{criarEtica.isPending ? 'Registrando...' : 'Enviar Relato (Anônimo)'}</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          {loadEtica ? <Spinner /> : (
            <Card className="border border-border/30 rounded-xl">
              <Table>
                <TableHeader><TableRow><TableHead>Protocolo</TableHead><TableHead>Categoria</TableHead><TableHead>Status</TableHead><TableHead>Prioridade</TableHead><TableHead>Data</TableHead></TableRow></TableHeader>
                <TableBody>
                  {denuncias.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum relato registrado</TableCell></TableRow> :
                    denuncias.map((d: any) => (
                      <TableRow key={d.id}>
                        <TableCell className="font-mono text-xs">{d.protocolo?.slice(0, 8)}</TableCell>
                        <TableCell><Badge variant="outline" className="text-[10px]">{d.categoria}</Badge></TableCell>
                        <TableCell><Badge variant={statusEticaColors[d.status] as any} className="text-[10px]">{d.status}</Badge></TableCell>
                        <TableCell className="text-xs">{d.prioridade}</TableCell>
                        <TableCell className="text-xs">{new Date(d.created_at).toLocaleDateString('pt-BR')}</TableCell>
                      </TableRow>
                    ))
                  }
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </PageLayout>
    </>
  );
}
