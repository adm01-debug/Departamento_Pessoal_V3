import { PageTitle } from '@/components/PageTitle';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { supabase } from '@/integrations/supabase/client';
import { catalogoCursoService, colaboradorService } from '@/services';
import { useEmpresas } from '@/hooks';
import { toast } from 'sonner';
import { GraduationCap, Plus, BookOpen, Award, Users, Trash2, Link, Calendar, CheckCircle2, Clock, Search, ChevronRight, MoreHorizontal, Video, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// === Treinamentos Service (tabela treinamentos) ===
const treinamentosService = {
  listar: async (empresaId?: string) => {
    let q = supabase.from('treinamentos').select('*').order('created_at', { ascending: false });
    if (empresaId) q = q.eq('empresa_id', empresaId);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  },
  criar: async (d: { nome: string; descricao?: string; data?: string; carga_horaria?: number; empresa_id?: string }) => {
    const { error } = await supabase.from('treinamentos').insert(d);
    if (error) throw error;
  },
  excluir: async (id: string, empresaId?: string) => {
    let q = supabase.from('treinamentos').delete().eq('id', id);
    if (empresaId) q = q.eq('empresa_id', empresaId);
    const { error } = await q;
    if (error) throw error;
  },
};

// Sub-component for managing courses within a trilha
function TrilhaCursosSection({ trilhaId, cursos }: { trilhaId: string; cursos: any[] }) {
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [selCurso, setSelCurso] = useState('');

  const { data: vinculados = [] } = useQuery({
    queryKey: ['trilhas_cursos', trilhaId],
    queryFn: () => catalogoCursoService.listarTrilhasCursos(trilhaId),
    enabled: !!trilhaId,
  });

  const vincular = useMutation({
    mutationFn: () => catalogoCursoService.vincularCursoTrilha({ trilha_id: trilhaId, curso_id: selCurso, ordem: vinculados.length + 1 }),
    onSuccess: () => { 
      qc.invalidateQueries({ queryKey: ['trilhas_cursos', trilhaId] }); 
      setAddOpen(false); 
      setSelCurso(''); 
      toast.success('Curso vinculado!'); 
    },
    onError: () => toast.error('Erro ao vincular'),
  });

  const desvincular = useMutation({
    mutationFn: (id: string) => catalogoCursoService.desvincularCursoTrilha(id, trilhaId),
    onSuccess: () => { 
      qc.invalidateQueries({ queryKey: ['trilhas_cursos', trilhaId] }); 
      toast.success('Curso desvinculado'); 
    },
  });

  const cursosDisponiveis = cursos.filter(c => !vinculados.some((v: any) => v.curso_id === c.id));

  return (
    <div className="mt-4 pt-4 border-t border-border/40">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-bold flex items-center gap-2">
          <Link className="h-3.5 w-3.5 text-primary" /> 
          Cursos na Trilha ({vinculados.length})
        </h4>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 rounded-lg">
              <Plus className="h-3.5 w-3.5 mr-1" />
              Adicionar Curso
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Curso à Trilha</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Selecione o Curso</Label>
                <Select value={selCurso} onValueChange={setSelCurso}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Escolha um curso do catálogo" />
                  </SelectTrigger>
                  <SelectContent>
                    {cursosDisponiveis.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.nome} ({c.carga_horaria}h)</SelectItem>
                    ))}
                    {cursosDisponiveis.length === 0 && <SelectItem value="none" disabled>Nenhum curso disponível</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
              <Button 
                onClick={() => vincular.mutate()} 
                disabled={!selCurso || vincular.isPending}
                className="rounded-xl w-full"
              >
                {vincular.isPending ? 'Vinculando...' : 'Vincular à Trilha'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      
      {vinculados.length === 0 ? (
        <div className="text-center py-6 border-2 border-dashed rounded-2xl bg-muted/20">
          <p className="text-xs text-muted-foreground font-medium">Nenhum curso vinculado a esta trilha ainda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {vinculados.map((v: any, i: number) => (
            <motion.div 
              key={v.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center justify-between p-3 bg-white/50 border border-border/40 rounded-xl hover:shadow-xs transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                  {i + 1}
                </div>
                <div>
                  <p className="text-sm font-semibold truncate max-w-[150px]">{(v as any).curso?.nome || 'Curso'}</p>
                  <p className="text-[10px] text-muted-foreground">{(v as any).curso?.carga_horaria || 0} horas de conteúdo</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Excluir"
                className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive"
                onClick={() => desvincular.mutate(v.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TreinamentosPage() {
  const { empresaAtual } = useEmpresas();
  const qc = useQueryClient();
  const [tab, setTab] = useState('treinamentos');

  // === Queries ===
  const { data: treinamentos = [], isLoading: loadTrein } = useQuery({ queryKey: ['treinamentos', empresaAtual?.id], queryFn: () => treinamentosService.listar(empresaAtual?.id), enabled: !!empresaAtual?.id });
  const { data: cursos = [], isLoading: loadCursos } = useQuery({ queryKey: ['catalogo_cursos', empresaAtual?.id], queryFn: () => catalogoCursoService.listarCursos(empresaAtual!.id), enabled: !!empresaAtual?.id });
  const { data: trilhas = [], isLoading: loadTrilhas } = useQuery({ queryKey: ['trilhas', empresaAtual?.id], queryFn: () => catalogoCursoService.listarTrilhas(empresaAtual!.id), enabled: !!empresaAtual?.id });
  const { data: inscricoes = [], isLoading: loadInsc } = useQuery({ queryKey: ['inscricoes_cursos', empresaAtual?.id], queryFn: () => catalogoCursoService.listarInscricoes(empresaAtual!.id), enabled: !!empresaAtual?.id });
  const { data: instancias = [], isLoading: loadInst } = useQuery({ queryKey: ['treinamento_instancias', empresaAtual?.id], queryFn: () => catalogoCursoService.listarInstancias(empresaAtual!.id), enabled: !!empresaAtual?.id });
  const { data: certificados = [], isLoading: loadCert } = useQuery({ queryKey: ['treinamento_certificados', empresaAtual?.id], queryFn: () => catalogoCursoService.listarCertificados(empresaAtual!.id), enabled: !!empresaAtual?.id });
  const { data: colaboradores = [] } = useQuery({ queryKey: ['colaboradores', empresaAtual?.id], queryFn: () => colaboradorService.list(empresaAtual!.id), enabled: !!empresaAtual?.id });

  // === Treinamentos ===
  const [openTrein, setOpenTrein] = useState(false);
  const [treinForm, setTreinForm] = useState({ nome: '', descricao: '', data: '', carga_horaria: '' });
  const criarTrein = useMutation({
    mutationFn: () => treinamentosService.criar({ ...treinForm, carga_horaria: treinForm.carga_horaria ? Number(treinForm.carga_horaria) : undefined, empresa_id: empresaAtual?.id }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['treinamentos'] }); setOpenTrein(false); setTreinForm({ nome: '', descricao: '', data: '', carga_horaria: '' }); toast.success('Treinamento criado!'); },
    onError: () => toast.error('Erro ao criar treinamento'),
  });
  const excluirTrein = useMutation({ mutationFn: (id: string) => treinamentosService.excluir(id, empresaAtual?.id), onSuccess: () => { qc.invalidateQueries({ queryKey: ['treinamentos'] }); toast.success('Treinamento excluído'); } });

  // === Cursos ===
  const [openCurso, setOpenCurso] = useState(false);
  const [cursoForm, setCursoForm] = useState({ nome: '', descricao: '', categoria: '', modalidade: 'presencial', carga_horaria: '', obrigatorio: false, nr_relacionada: '' });
  const criarCurso = useMutation({
    mutationFn: () => catalogoCursoService.criarCurso({ ...cursoForm, carga_horaria: cursoForm.carga_horaria ? Number(cursoForm.carga_horaria) : null, empresa_id: empresaAtual?.id }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['catalogo_cursos'] }); setOpenCurso(false); setCursoForm({ nome: '', descricao: '', categoria: '', modalidade: 'presencial', carga_horaria: '', obrigatorio: false, nr_relacionada: '' }); toast.success('Curso criado!'); },
    onError: () => toast.error('Erro ao criar curso'),
  });
  const excluirCurso = useMutation({ mutationFn: (id: string) => catalogoCursoService.excluirCurso(id, empresaAtual!.id), onSuccess: () => { qc.invalidateQueries({ queryKey: ['catalogo_cursos'] }); toast.success('Curso excluído'); } });

  // === Trilhas ===
  const [openTrilha, setOpenTrilha] = useState(false);
  const [trilhaForm, setTrilhaForm] = useState({ titulo: '', descricao: '', nivel: 'basico' });
  const criarTrilha = useMutation({
    mutationFn: () => catalogoCursoService.criarTrilha({ ...trilhaForm, empresa_id: empresaAtual?.id }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['trilhas'] }); setOpenTrilha(false); setTrilhaForm({ titulo: '', descricao: '', nivel: 'basico' }); toast.success('Trilha criada!'); },
    onError: () => toast.error('Erro ao criar trilha'),
  });
  const excluirTrilha = useMutation({ mutationFn: (id: string) => catalogoCursoService.excluirTrilha(id, empresaAtual!.id), onSuccess: () => { qc.invalidateQueries({ queryKey: ['trilhas'] }); toast.success('Trilha excluída'); } });

  // === Inscrições ===
  const [openInsc, setOpenInsc] = useState(false);
  const [inscForm, setInscForm] = useState({ colaborador_id: '', curso_id: '', data_inicio: '' });
  const criarInsc = useMutation({
    mutationFn: () => catalogoCursoService.criarInscricao({ ...inscForm, empresa_id: empresaAtual?.id, status: 'inscrito' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['inscricoes_cursos'] }); setOpenInsc(false); setInscForm({ colaborador_id: '', curso_id: '', data_inicio: '' }); toast.success('Inscrição realizada!'); },
    onError: () => toast.error('Erro ao inscrever'),
  });

  const isLoading = loadTrein || loadCursos || loadTrilhas || loadInsc || loadInst || loadCert;

  return (
    <PageLayout title="Treinamentos 10/10" description="Gestão de treinamentos e desenvolvimento" icon={<GraduationCap className="h-5 w-5 text-primary-foreground" />} gradient="from-info to-primary">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
        <Card><CardContent className="pt-4 text-center"><Calendar className="h-6 w-6 mx-auto text-accent mb-1" /><p className="text-2xl font-bold">{treinamentos.length}</p><p className="text-xs text-muted-foreground">Treinamentos</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><BookOpen className="h-6 w-6 mx-auto text-primary mb-1" /><p className="text-2xl font-bold">{cursos.length}</p><p className="text-xs text-muted-foreground">Cursos</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><Award className="h-6 w-6 mx-auto text-success mb-1" /><p className="text-2xl font-bold">{cursos.filter((c: any) => c.obrigatorio).length}</p><p className="text-xs text-muted-foreground">Obrigatórios</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><GraduationCap className="h-6 w-6 mx-auto text-warning mb-1" /><p className="text-2xl font-bold">{trilhas.length}</p><p className="text-xs text-muted-foreground">Trilhas</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><Users className="h-6 w-6 mx-auto text-info mb-1" /><p className="text-2xl font-bold">{inscricoes.length}</p><p className="text-xs text-muted-foreground">Inscrições</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><Video className="h-6 w-6 mx-auto text-purple-500 mb-1" /><p className="text-2xl font-bold">{instancias.length}</p><p className="text-xs text-muted-foreground">Turmas</p></CardContent></Card>
      </div>

      {isLoading ? <div className="flex justify-center py-12"><Spinner /></div> : (
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="treinamentos">Treinamentos</TabsTrigger>
            <TabsTrigger value="catalogo">Catálogo</TabsTrigger>
            <TabsTrigger value="trilhas">Trilhas</TabsTrigger>
            <TabsTrigger value="inscricoes">Inscrições</TabsTrigger>
            <TabsTrigger value="turmas">Turmas / Instâncias</TabsTrigger>
            <TabsTrigger value="certificados">Certificados</TabsTrigger>
          </TabsList>

          {/* TREINAMENTOS */}
          <TabsContent value="treinamentos">
            <div className="flex justify-end mb-4">
              <Dialog open={openTrein} onOpenChange={setOpenTrein}>
                <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Novo Treinamento</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Novo Treinamento</DialogTitle></DialogHeader>
                  <div className="grid gap-3">
                    <div><Label>Nome *</Label><Input value={treinForm.nome} onChange={e => setTreinForm(p => ({ ...p, nome: e.target.value }))} /></div>
                    <div className="grid grid-cols-2 gap-2">
                      <div><Label>Data</Label><Input type="date" value={treinForm.data} onChange={e => setTreinForm(p => ({ ...p, data: e.target.value }))} /></div>
                      <div><Label>Carga Horária (h)</Label><Input type="number" value={treinForm.carga_horaria} onChange={e => setTreinForm(p => ({ ...p, carga_horaria: e.target.value }))} /></div>
                    </div>
                    <div><Label>Descrição</Label><Textarea value={treinForm.descricao} onChange={e => setTreinForm(p => ({ ...p, descricao: e.target.value }))} /></div>
                    <Button onClick={() => criarTrein.mutate()} disabled={!treinForm.nome || criarTrein.isPending}>{criarTrein.isPending ? 'Salvando...' : 'Salvar'}</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <Card><CardContent className="p-0">
              <Table><TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Data</TableHead><TableHead>Carga Horária</TableHead><TableHead>Descrição</TableHead><TableHead></TableHead></TableRow></TableHeader>
                <TableBody>
                  {treinamentos.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum treinamento cadastrado</TableCell></TableRow> :
                    treinamentos.map((t: any) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium">{t.nome}</TableCell>
                        <TableCell>{t.data || '—'}</TableCell>
                        <TableCell>{t.carga_horaria ? `${t.carga_horaria}h` : '—'}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{t.descricao || '—'}</TableCell>
                        <TableCell><Button variant="ghost" size="icon" aria-label="Excluir" onClick={() => excluirTrein.mutate(t.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                      </TableRow>
                    ))
                  }
                </TableBody>
              </Table>
            </CardContent></Card>
          </TabsContent>

          {/* CERTIFICADOS */}
          <TabsContent value="certificados">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Colaborador</TableHead>
                      <TableHead>Curso / Treinamento</TableHead>
                      <TableHead>Emissão</TableHead>
                      <TableHead>Validade</TableHead>
                      <TableHead>Código Autenticação</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {certificados.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          Nenhum certificado emitido ainda.
                        </TableCell>
                      </TableRow>
                    ) : (
                      certificados.map((cert: any) => (
                        <TableRow key={cert.id} className="hover:bg-muted/30">
                          <TableCell className="font-medium">{cert.colaborador?.nome_completo}</TableCell>
                          <TableCell>{cert.curso?.nome}</TableCell>
                          <TableCell>{new Date(cert.data_emissao).toLocaleDateString('pt-BR')}</TableCell>
                          <TableCell>
                            {cert.data_validade ? (
                              <Badge variant={new Date(cert.data_validade) < new Date() ? 'destructive' : 'outline'} className="text-[10px]">
                                {new Date(cert.data_validade).toLocaleDateString('pt-BR')}
                              </Badge>
                            ) : 'Vitalício'}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-primary">{cert.codigo_autenticacao}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" className="h-8 gap-1.5" onClick={() => toast.info('Impressão em breve')}>
                              <Link className="h-3.5 w-3.5" /> Ver
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* CATÁLOGO */}
          <TabsContent value="catalogo">
            <div className="flex justify-end mb-4">
              <Dialog open={openCurso} onOpenChange={setOpenCurso}>
                <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Novo Curso</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Novo Curso</DialogTitle></DialogHeader>
                  <div className="grid gap-3">
                    <div><Label>Nome *</Label><Input value={cursoForm.nome} onChange={e => setCursoForm(p => ({ ...p, nome: e.target.value }))} /></div>
                    <div className="grid grid-cols-2 gap-2">
                      <div><Label>Categoria</Label><Input value={cursoForm.categoria} onChange={e => setCursoForm(p => ({ ...p, categoria: e.target.value }))} placeholder="Ex: SST, Técnico" /></div>
                      <div><Label>Carga Horária (h)</Label><Input type="number" value={cursoForm.carga_horaria} onChange={e => setCursoForm(p => ({ ...p, carga_horaria: e.target.value }))} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div><Label>Modalidade</Label>
                        <Select value={cursoForm.modalidade} onValueChange={v => setCursoForm(p => ({ ...p, modalidade: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="presencial">Presencial</SelectItem><SelectItem value="online">Online</SelectItem><SelectItem value="hibrido">Híbrido</SelectItem></SelectContent>
                        </Select>
                      </div>
                      <div><Label>NR Relacionada</Label><Input value={cursoForm.nr_relacionada} onChange={e => setCursoForm(p => ({ ...p, nr_relacionada: e.target.value }))} placeholder="Ex: NR-35" /></div>
                    </div>
                    <div className="flex items-center gap-2"><Switch checked={cursoForm.obrigatorio} onCheckedChange={v => setCursoForm(p => ({ ...p, obrigatorio: v }))} /><Label>Obrigatório</Label></div>
                    <div><Label>Descrição</Label><Textarea value={cursoForm.descricao} onChange={e => setCursoForm(p => ({ ...p, descricao: e.target.value }))} /></div>
                    <Button onClick={() => criarCurso.mutate()} disabled={!cursoForm.nome || criarCurso.isPending}>{criarCurso.isPending ? 'Salvando...' : 'Salvar'}</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <Card><CardContent className="p-0">
              <Table><TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Categoria</TableHead><TableHead>Modalidade</TableHead><TableHead>Carga Horária</TableHead><TableHead>Obrigatório</TableHead><TableHead></TableHead></TableRow></TableHeader>
                <TableBody>
                  {cursos.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum curso cadastrado</TableCell></TableRow> :
                    cursos.map((c: any) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.nome}</TableCell>
                        <TableCell>{c.categoria || '—'}</TableCell>
                        <TableCell>{c.modalidade || '—'}</TableCell>
                        <TableCell>{c.carga_horaria ? `${c.carga_horaria}h` : '—'}</TableCell>
                        <TableCell><Badge variant={c.obrigatorio ? 'default' : 'secondary'}>{c.obrigatorio ? 'Sim' : 'Não'}</Badge></TableCell>
                        <TableCell><Button variant="ghost" size="icon" aria-label="Excluir" onClick={() => excluirCurso.mutate(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                      </TableRow>
                    ))
                  }
                </TableBody>
              </Table>
            </CardContent></Card>
          </TabsContent>

          {/* TRILHAS */}
          <TabsContent value="trilhas">
            <div className="flex justify-end mb-4 gap-2">
              <Dialog open={openTrilha} onOpenChange={setOpenTrilha}>
                <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Nova Trilha</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Nova Trilha de Aprendizado</DialogTitle></DialogHeader>
                  <div className="grid gap-3">
                    <div><Label>Título *</Label><Input value={trilhaForm.titulo} onChange={e => setTrilhaForm(p => ({ ...p, titulo: e.target.value }))} /></div>
                    <div><Label>Nível</Label>
                      <Select value={trilhaForm.nivel} onValueChange={v => setTrilhaForm(p => ({ ...p, nivel: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="basico">Básico</SelectItem><SelectItem value="intermediario">Intermediário</SelectItem><SelectItem value="avancado">Avançado</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div><Label>Descrição</Label><Textarea value={trilhaForm.descricao} onChange={e => setTrilhaForm(p => ({ ...p, descricao: e.target.value }))} /></div>
                    <Button onClick={() => criarTrilha.mutate()} disabled={!trilhaForm.titulo || criarTrilha.isPending}>{criarTrilha.isPending ? 'Salvando...' : 'Salvar'}</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            {trilhas.map((t: any) => (
              <Card key={t.id} className="mb-4">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-medium">{t.titulo}</p>
                      <p className="text-xs text-muted-foreground">{t.nivel || '—'} • {t.descricao || 'Sem descrição'}</p>
                    </div>
                    <Button variant="ghost" size="icon" aria-label="Excluir" onClick={() => excluirTrilha.mutate(t.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                  <TrilhaCursosSection trilhaId={t.id} cursos={cursos} />
                </CardContent>
              </Card>
            ))}
            {trilhas.length === 0 && <Card><CardContent className="text-center text-muted-foreground py-8">Nenhuma trilha cadastrada</CardContent></Card>}
          </TabsContent>

          {/* INSCRIÇÕES */}
          <TabsContent value="inscricoes">
            <div className="flex justify-end mb-4">
              <Dialog open={openInsc} onOpenChange={setOpenInsc}>
                <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Nova Inscrição</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Inscrever Colaborador</DialogTitle></DialogHeader>
                  <div className="grid gap-3">
                    <div><Label>Colaborador *</Label>
                      <Select value={inscForm.colaborador_id} onValueChange={v => setInscForm(p => ({ ...p, colaborador_id: v }))}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>{colaboradores.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.nome_completo}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label>Curso *</Label>
                      <Select value={inscForm.curso_id} onValueChange={v => setInscForm(p => ({ ...p, curso_id: v }))}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>{cursos.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label>Data Início</Label><Input type="date" value={inscForm.data_inicio} onChange={e => setInscForm(p => ({ ...p, data_inicio: e.target.value }))} /></div>
                    <Button onClick={() => criarInsc.mutate()} disabled={!inscForm.colaborador_id || !inscForm.curso_id || criarInsc.isPending}>{criarInsc.isPending ? 'Salvando...' : 'Inscrever'}</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <Card><CardContent className="p-0">
              <Table><TableHeader><TableRow><TableHead>Colaborador</TableHead><TableHead>Curso</TableHead><TableHead>Status</TableHead><TableHead>Data Início</TableHead></TableRow></TableHeader>
                <TableBody>
                  {inscricoes.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Nenhuma inscrição registrada</TableCell></TableRow> :
                    inscricoes.map((i: any) => (
                      <TableRow key={i.id}>
                        <TableCell>{i.colaborador?.nome_completo || '—'}</TableCell>
                        <TableCell>{i.curso?.nome || '—'}</TableCell>
                        <TableCell><Badge variant={i.status === 'concluido' ? 'default' : 'secondary'}>{i.status || 'inscrito'}</Badge></TableCell>
                        <TableCell>{i.data_inicio || '—'}</TableCell>
                      </TableRow>
                    ))
                  }
                </TableBody>
              </Table>
            </CardContent></Card>
          </TabsContent>

          {/* TURMAS */}
          <TabsContent value="turmas">
            <Card><CardContent className="p-0">
              <Table><TableHeader><TableRow><TableHead>Curso</TableHead><TableHead>Instrutor</TableHead><TableHead>Início</TableHead><TableHead>Status</TableHead><TableHead>Vagas</TableHead></TableRow></TableHeader>
                <TableBody>
                  {instancias.map((i: any) => (
                    <TableRow key={i.id}>
                      <TableCell className="font-medium">{i.curso?.nome || '—'}</TableCell>
                      <TableCell>{i.instrutor?.nome_completo || '—'}</TableCell>
                      <TableCell>{new Date(i.data_inicio).toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell><Badge variant="outline">{i.status}</Badge></TableCell>
                      <TableCell>{i.capacidade_maxima || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent></Card>
          </TabsContent>
        </Tabs>
      )}
    </PageLayout>
  );
}
