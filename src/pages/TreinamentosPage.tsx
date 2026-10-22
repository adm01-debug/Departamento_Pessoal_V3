import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageLayout } from '@/components/layout';
import { PageTitle } from '@/components/PageTitle';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { EntradaPresenca, entradaCard } from '@/components/ui/entrada-cards';
import { supabase } from '@/integrations/supabase/client';
import { catalogoCursoService, colaboradorService } from '@/services';
import { useEmpresas } from '@/hooks';
import { toast } from 'sonner';
import { AnimatePresence, motion, MotionConfig } from 'framer-motion';
import { MOTION_REDUCED_MODE } from '@/lib/motionMode';
import {
  cascadeContainerVariants,
  cascadeItemVariants,
  cascadeOverlayVariants,
  cascadeShellVariants,
} from '@/components/ui/cascade-motion';
import {
  Award,
  BookOpen,
  CalendarDays,
  GraduationCap,
  Layers,
  Link,
  List,
  Plus,
  Trash2,
  Users,
  Video,
  X,
} from 'lucide-react';
import { TreinamentosFiltros } from '@/components/treinamentos/TreinamentosFiltros';
import { TreinamentosKpis } from '@/components/treinamentos/TreinamentosKpis';
import { TreinamentosTabela } from '@/components/treinamentos/TreinamentosTabela';
import {
  TREINAMENTOS_POR_PAGINA_PADRAO,
  agruparParticipantes,
  calcularIndicadoresTreinamentos,
  filtrarTreinamentos,
  opcoesCategoriaTreinamento,
  opcoesStatusTreinamento,
  paginarTreinamentos,
  resumirOcupacoes,
  type ParticipanteRegistro,
  type PeriodoTreinamento,
  type TreinamentoRegistro,
} from '@/components/treinamentos/treinamentosDerivacoes';
// MOCK VISUAL — ver src/mocks/treinamentosMock.ts.
import {
  bloquearEscritaTreinamentos,
  getMockCertificados,
  getMockCursos,
  getMockInscricoes,
  getMockInstancias,
  getMockParticipacaoTreinamentos,
  getMockTreinamentosLista,
  getMockTrilhas,
  isTreinamentosMockEnabled,
} from '@/mocks/treinamentosMock';

/**
 * Quantos blocos cascateiam no modal “Novo Treinamento” — cabeçalho + grade de
 * campos. A coreografia (números, easing e variants) NÃO é local: vem de
 * `cascade-motion.ts`, a mesma usada pelo popup “Pendências”. Este número só
 * define o atraso com que a caixa começa a encolher no fechamento.
 */
const BLOCOS_CASCATA_NOVO_TREINAMENTO = 2;

// === Treinamentos Service (tabela treinamentos) ===
const treinamentosService = {
  listar: async (empresaId?: string) => {
    let q = supabase.from('treinamentos').select('*').order('created_at', { ascending: false });
    if (empresaId) q = q.eq('empresa_id', empresaId);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  },
  criar: async (d: {
    nome: string;
    descricao?: string;
    data?: string;
    carga_horaria?: number;
    empresa_id?: string;
  }) => {
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

/**
 * Classes de cada aba — MESMO padrão da TabList do Dashboard Executivo:
 * barra plana (sem fundo de botão), ícone + texto, ativo em texto claro e
 * linha Lime de 2 px na base (renderizada por `layoutId`), inativos em cinza.
 */
const ABA_CLASS =
  'relative flex min-h-[48px] items-center justify-center gap-1 rounded-none border-0 bg-transparent py-3 text-sm font-medium text-muted-foreground shadow-none outline-none transition-colors hover:bg-transparent hover:text-foreground/80 data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none';

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
    mutationFn: () =>
      catalogoCursoService.vincularCursoTrilha({
        trilha_id: trilhaId,
        curso_id: selCurso,
        ordem: vinculados.length + 1,
      }),
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

  const cursosDisponiveis = cursos.filter((c) => !vinculados.some((v: any) => v.curso_id === c.id));

  return (
    <div className="mt-4 pt-4 border-t border-border/40">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-medium flex items-center gap-2">
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
                  <SelectTrigger>
                    <SelectValue placeholder="Escolha um curso do catálogo" />
                  </SelectTrigger>
                  <SelectContent>
                    {cursosDisponiveis.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome} ({c.carga_horaria}h)
                      </SelectItem>
                    ))}
                    {cursosDisponiveis.length === 0 && (
                      <SelectItem value="none" disabled>
                        Nenhum curso disponível
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end pt-1">
                <Button
                  size="sm"
                  className="rounded-lg px-4"
                  onClick={() => {
                    if (bloquearEscritaTreinamentos('Vincular curso à trilha')) return;
                    vincular.mutate();
                  }}
                  disabled={!selCurso || vincular.isPending}
                >
                  {vincular.isPending ? 'Vinculando...' : 'Vincular à Trilha'}
                </Button>
              </div>
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
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-medium text-primary">
                  {i + 1}
                </div>
                <div>
                  <p className="text-sm font-semibold truncate max-w-[150px]">{(v as any).curso?.nome || 'Curso'}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {(v as any).curso?.carga_horaria || 0} horas de conteúdo
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Excluir"
                className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive"
                onClick={() => {
                  if (bloquearEscritaTreinamentos('Desvincular curso da trilha')) return;
                  desvincular.mutate(v.id);
                }}
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
  // MOCK VISUAL — ver src/mocks/treinamentosMock.ts. Com o mock ligado, cada
  // leitura curto-circuita o Supabase e `enabled` também vale sem empresa ativa.
  const mockAtivo = isTreinamentosMockEnabled();
  const { data: treinamentos = [], isLoading: loadTrein } = useQuery({
    queryKey: ['treinamentos', empresaAtual?.id],
    queryFn: async (): Promise<any[]> =>
      getMockTreinamentosLista() ?? (await treinamentosService.listar(empresaAtual?.id)),
    enabled: !!empresaAtual?.id || mockAtivo,
  });
  const { data: cursos = [], isLoading: loadCursos } = useQuery({
    queryKey: ['catalogo_cursos', empresaAtual?.id],
    queryFn: async (): Promise<any[]> => getMockCursos() ?? (await catalogoCursoService.listarCursos(empresaAtual!.id)),
    enabled: !!empresaAtual?.id || mockAtivo,
  });
  const { data: trilhas = [], isLoading: loadTrilhas } = useQuery({
    queryKey: ['trilhas', empresaAtual?.id],
    queryFn: async (): Promise<any[]> =>
      getMockTrilhas() ?? (await catalogoCursoService.listarTrilhas(empresaAtual!.id)),
    enabled: !!empresaAtual?.id || mockAtivo,
  });
  const { data: inscricoes = [], isLoading: loadInsc } = useQuery({
    queryKey: ['inscricoes_cursos', empresaAtual?.id],
    queryFn: async (): Promise<any[]> =>
      getMockInscricoes() ?? (await catalogoCursoService.listarInscricoes(empresaAtual!.id)),
    enabled: !!empresaAtual?.id || mockAtivo,
  });
  const { data: instancias = [], isLoading: loadInst } = useQuery({
    queryKey: ['treinamento_instancias', empresaAtual?.id],
    queryFn: async (): Promise<any[]> =>
      getMockInstancias() ?? (await catalogoCursoService.listarInstancias(empresaAtual!.id)),
    enabled: !!empresaAtual?.id || mockAtivo,
  });
  const { data: certificados = [], isLoading: loadCert } = useQuery({
    queryKey: ['treinamento_certificados', empresaAtual?.id],
    queryFn: async (): Promise<any[]> =>
      getMockCertificados() ?? (await catalogoCursoService.listarCertificados(empresaAtual!.id)),
    enabled: !!empresaAtual?.id || mockAtivo,
  });
  const { data: colaboradores = [] } = useQuery({
    queryKey: ['colaboradores', empresaAtual?.id],
    queryFn: () => colaboradorService.list(empresaAtual!.id),
    enabled: !!empresaAtual?.id,
  });

  // Participantes POR treinamento — única relação real disponível no schema
  // (`treinamento_participantes`). Os ids vêm da lista JÁ filtrada por empresa,
  // então a consulta continua isolada por tenant. No modo demonstração a
  // consulta real não roda: a coluna é alimentada por
  // `getMockParticipacaoTreinamentos()` (ver `participantesPorTreinamento`).
  const idsTreinamentos = useMemo(
    () => Array.from(new Set((treinamentos as TreinamentoRegistro[]).map((t) => String(t.id)))).sort(),
    [treinamentos]
  );
  const { data: participantes = [] } = useQuery<ParticipanteRegistro[]>({
    queryKey: ['treinamento_participantes', empresaAtual?.id, idsTreinamentos],
    queryFn: async () => {
      if (mockAtivo || idsTreinamentos.length === 0) return [];
      const { data, error } = await (supabase as any)
        .from('treinamento_participantes')
        .select(
          'id, treinamento_id, colaborador_id, presente, colaborador:colaboradores!treinamento_participantes_colaborador_id_fkey(nome_completo, foto_url)'
        )
        .in('treinamento_id', idsTreinamentos);
      if (error) throw error;
      return (data ?? []) as ParticipanteRegistro[];
    },
    enabled: !!empresaAtual?.id || mockAtivo,
  });

  // === Treinamentos ===
  const [openTrein, setOpenTrein] = useState(false);
  const [treinForm, setTreinForm] = useState({ nome: '', descricao: '', data: '', carga_horaria: '' });
  const criarTrein = useMutation({
    mutationFn: () =>
      treinamentosService.criar({
        ...treinForm,
        carga_horaria: treinForm.carga_horaria ? Number(treinForm.carga_horaria) : undefined,
        empresa_id: empresaAtual?.id,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['treinamentos'] });
      setOpenTrein(false);
      setTreinForm({ nome: '', descricao: '', data: '', carga_horaria: '' });
      toast.success('Treinamento criado!');
    },
    onError: () => toast.error('Erro ao criar treinamento'),
  });
  const excluirTrein = useMutation({
    mutationFn: (id: string) => treinamentosService.excluir(id, empresaAtual?.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['treinamentos'] });
      qc.invalidateQueries({ queryKey: ['treinamento_participantes'] });
      toast.success('Treinamento excluído');
    },
    onError: () => toast.error('Erro ao excluir treinamento'),
  });

  // === Filtros / paginação / indicadores (aba Treinamentos) ===
  const [busca, setBusca] = useState('');
  const [statusFiltro, setStatusFiltro] = useState('todos');
  const [categoriaFiltro, setCategoriaFiltro] = useState('todos');
  const [periodoFiltro, setPeriodoFiltro] = useState<PeriodoTreinamento>('todos');
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [porPagina, setPorPagina] = useState<number>(TREINAMENTOS_POR_PAGINA_PADRAO);

  const listaTreinamentos = useMemo(() => treinamentos as TreinamentoRegistro[], [treinamentos]);

  // Opções SEMPRE derivadas dos dados reais (nunca da imagem de referência).
  const statusOpcoes = useMemo(
    () => [{ value: 'todos', label: 'Todos' }, ...opcoesStatusTreinamento(listaTreinamentos)],
    [listaTreinamentos]
  );
  const categoriaOpcoes = useMemo(
    () => [{ value: 'todos', label: 'Todas' }, ...opcoesCategoriaTreinamento(listaTreinamentos)],
    [listaTreinamentos]
  );

  const filtroAtivo =
    busca.trim().length > 0 || statusFiltro !== 'todos' || categoriaFiltro !== 'todos' || periodoFiltro !== 'todos';

  const filtrados = useMemo(
    () =>
      filtrarTreinamentos(listaTreinamentos, {
        busca,
        status: statusFiltro,
        categoria: categoriaFiltro,
        periodo: periodoFiltro,
      }),
    [listaTreinamentos, busca, statusFiltro, categoriaFiltro, periodoFiltro]
  );

  const pagina = useMemo(
    () => paginarTreinamentos(filtrados, paginaAtual, porPagina),
    [filtrados, paginaAtual, porPagina]
  );

  // No modo demonstração a ocupação (avatares + "+N" + barra "X de Y") vem do
  // mock visual da referência aprovada; no caminho real vem da agregação de
  // `treinamento_participantes`. Um único formato (`ResumoParticipacao`) chega
  // à tabela.
  const participantesPorTreinamento = useMemo(() => {
    const ocupacaoMock = getMockParticipacaoTreinamentos();
    return ocupacaoMock ? resumirOcupacoes(ocupacaoMock) : agruparParticipantes(participantes);
  }, [participantes]);

  const indicadores = useMemo(
    () => calcularIndicadoresTreinamentos({ inscricoes, cursos, certificados }),
    [inscricoes, cursos, certificados]
  );

  const limparFiltros = () => {
    setBusca('');
    setStatusFiltro('todos');
    setCategoriaFiltro('todos');
    setPeriodoFiltro('todos');
    setPaginaAtual(1);
  };

  const excluirTreinamento = (treinamento: TreinamentoRegistro) => {
    if (bloquearEscritaTreinamentos('Excluir treinamento')) return;
    excluirTrein.mutate(treinamento.id);
  };

  // === Cursos ===
  const [openCurso, setOpenCurso] = useState(false);
  const [cursoForm, setCursoForm] = useState({
    nome: '',
    descricao: '',
    categoria: '',
    modalidade: 'presencial',
    carga_horaria: '',
    obrigatorio: false,
    nr_relacionada: '',
  });
  const criarCurso = useMutation({
    mutationFn: () =>
      catalogoCursoService.criarCurso({
        ...cursoForm,
        carga_horaria: cursoForm.carga_horaria ? Number(cursoForm.carga_horaria) : null,
        empresa_id: empresaAtual?.id,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['catalogo_cursos'] });
      setOpenCurso(false);
      setCursoForm({
        nome: '',
        descricao: '',
        categoria: '',
        modalidade: 'presencial',
        carga_horaria: '',
        obrigatorio: false,
        nr_relacionada: '',
      });
      toast.success('Curso criado!');
    },
    onError: () => toast.error('Erro ao criar curso'),
  });
  const excluirCurso = useMutation({
    mutationFn: (id: string) => catalogoCursoService.excluirCurso(id, empresaAtual!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['catalogo_cursos'] });
      toast.success('Curso excluído');
    },
  });

  // === Trilhas ===
  const [openTrilha, setOpenTrilha] = useState(false);
  const [trilhaForm, setTrilhaForm] = useState({ titulo: '', descricao: '', nivel: 'basico' });
  const criarTrilha = useMutation({
    mutationFn: () => catalogoCursoService.criarTrilha({ ...trilhaForm, empresa_id: empresaAtual?.id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trilhas'] });
      setOpenTrilha(false);
      setTrilhaForm({ titulo: '', descricao: '', nivel: 'basico' });
      toast.success('Trilha criada!');
    },
    onError: () => toast.error('Erro ao criar trilha'),
  });
  const excluirTrilha = useMutation({
    mutationFn: (id: string) => catalogoCursoService.excluirTrilha(id, empresaAtual!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trilhas'] });
      toast.success('Trilha excluída');
    },
  });

  // === Inscrições ===
  const [openInsc, setOpenInsc] = useState(false);
  const [inscForm, setInscForm] = useState({ colaborador_id: '', curso_id: '', data_inicio: '' });
  const criarInsc = useMutation({
    mutationFn: () =>
      catalogoCursoService.criarInscricao({ ...inscForm, empresa_id: empresaAtual?.id, status: 'inscrito' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inscricoes_cursos'] });
      setOpenInsc(false);
      setInscForm({ colaborador_id: '', curso_id: '', data_inicio: '' });
      toast.success('Inscrição realizada!');
    },
    onError: () => toast.error('Erro ao inscrever'),
  });

  const isLoading = loadTrein || loadCursos || loadTrilhas || loadInsc || loadInst || loadCert;

  return (
    <MotionConfig reducedMotion={MOTION_REDUCED_MODE}>
      <PageTitle
        title="Treinamentos 10/10"
        description="Gerencie os treinamentos da sua organização e acompanhe o desenvolvimento dos colaboradores."
      />
      <PageLayout
        title="Treinamentos"
        description="Gerencie os treinamentos da sua organização e acompanhe o desenvolvimento dos colaboradores."
        icon={<GraduationCap className="h-6 w-6 text-primary-foreground" />}
        gradient="from-primary to-success"
        className="space-y-4"
        actions={
          <DialogPrimitive.Root open={openTrein} onOpenChange={setOpenTrein}>
            <DialogPrimitive.Trigger asChild>
              <Button className="h-[46px] gap-2 rounded-xl px-5 text-sm font-semibold shadow-sm transition-shadow hover:shadow-md">
                <Plus className="h-4 w-4" />
                Novo Treinamento
              </Button>
            </DialogPrimitive.Trigger>

            {/* ANIMAÇÃO: MESMA coreografia do modal “Pendências”
                (`cascade-motion.ts`): o véu entra em fade + blur, a caixa nasce
                como um quadrado pequeno e estica (0,9 s, easeInOut) e só então o
                conteúdo cascateia. Foco, ESC, clique fora e bloqueio de rolagem
                continuam sendo do Radix. */}
            <AnimatePresence>
              {openTrein && (
                <DialogPrimitive.Portal forceMount>
                  <DialogPrimitive.Overlay asChild forceMount>
                    <motion.div
                      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
                      variants={cascadeOverlayVariants(BLOCOS_CASCATA_NOVO_TREINAMENTO)}
                      initial="closed"
                      animate="open"
                      exit="closed"
                    />
                  </DialogPrimitive.Overlay>

                  {/* CAIXA — MESMAS classes do DialogContent padrão (largura,
                      padding, borda, raio, sombra). Só a animação é nova. */}
                  <DialogPrimitive.Content asChild forceMount>
                    <motion.div
                      className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-[460px] translate-x-[-50%] translate-y-[-50%] gap-3 border bg-background p-5 shadow-lg sm:rounded-lg"
                      style={{ transformOrigin: 'top center' }}
                      variants={cascadeShellVariants(BLOCOS_CASCATA_NOVO_TREINAMENTO)}
                      initial="closed"
                      animate="open"
                      exit="closed"
                    >
                      <DialogPrimitive.Close className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-md opacity-70 transition-colors hover:bg-accent hover:opacity-100 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset">
                        <X className="h-4 w-4" />
                        <span className="sr-only">Fechar</span>
                      </DialogPrimitive.Close>

                      {/* `contents`: o contêiner só orquestra a cascata e não cria
                          caixa, então o grid do formulário permanece idêntico. */}
                      <motion.div
                        className="contents"
                        variants={cascadeContainerVariants}
                        initial="closed"
                        animate="open"
                        exit="closed"
                      >
                        <motion.div variants={cascadeItemVariants}>
                          <DialogHeader>
                            <DialogTitle>Novo Treinamento</DialogTitle>
                          </DialogHeader>
                        </motion.div>

                        <motion.div variants={cascadeItemVariants} className="grid gap-3">
                          <div>
                            <Label>Nome *</Label>
                            <Input
                              value={treinForm.nome}
                              onChange={(e) => setTreinForm((p) => ({ ...p, nome: e.target.value }))}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label>Data</Label>
                              <Input
                                type="date"
                                value={treinForm.data}
                                onChange={(e) => setTreinForm((p) => ({ ...p, data: e.target.value }))}
                              />
                            </div>
                            <div>
                              <Label>Carga Horária (h)</Label>
                              <Input
                                type="number"
                                value={treinForm.carga_horaria}
                                onChange={(e) => setTreinForm((p) => ({ ...p, carga_horaria: e.target.value }))}
                              />
                            </div>
                          </div>
                          <div>
                            <Label>Descrição</Label>
                            <Textarea
                              value={treinForm.descricao}
                              onChange={(e) => setTreinForm((p) => ({ ...p, descricao: e.target.value }))}
                            />
                          </div>
                          <div className="flex justify-end pt-1">
                            <Button
                              size="sm"
                              className="rounded-lg px-4"
                              onClick={() => {
                                if (bloquearEscritaTreinamentos('Criar treinamento')) return;
                                criarTrein.mutate();
                              }}
                              disabled={!treinForm.nome || criarTrein.isPending}
                            >
                              {criarTrein.isPending ? 'Salvando...' : 'Salvar'}
                            </Button>
                          </div>
                        </motion.div>
                      </motion.div>
                    </motion.div>
                  </DialogPrimitive.Content>
                </DialogPrimitive.Portal>
              )}
            </AnimatePresence>
          </DialogPrimitive.Root>
        }
      >
        <TreinamentosKpis indicadores={indicadores} />

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : (
          <Tabs value={tab} onValueChange={setTab}>
            <EntradaPresenca>
              <motion.div {...entradaCard(4)}>
                <TabsList className="mb-4 grid h-auto w-full grid-cols-2 gap-0 rounded-none border-b border-border/30 bg-transparent p-0 sm:grid-cols-3 xl:grid-cols-6">
                  <TabsTrigger value="treinamentos" className={ABA_CLASS}>
                    <List className="mr-1 h-4 w-4 shrink-0" />
                    Treinamentos
                    {tab === 'treinamentos' && (
                      <motion.div
                        layoutId="treinamentos-aba-ativa"
                        className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary"
                        transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                      />
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="catalogo" className={ABA_CLASS}>
                    <BookOpen className="mr-1 h-4 w-4 shrink-0" />
                    Catálogo
                    {tab === 'catalogo' && (
                      <motion.div
                        layoutId="treinamentos-aba-ativa"
                        className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary"
                        transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                      />
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="trilhas" className={ABA_CLASS}>
                    <Layers className="mr-1 h-4 w-4 shrink-0" />
                    Trilhas
                    {tab === 'trilhas' && (
                      <motion.div
                        layoutId="treinamentos-aba-ativa"
                        className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary"
                        transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                      />
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="inscricoes" className={ABA_CLASS}>
                    <Users className="mr-1 h-4 w-4 shrink-0" />
                    Inscrições
                    {tab === 'inscricoes' && (
                      <motion.div
                        layoutId="treinamentos-aba-ativa"
                        className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary"
                        transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                      />
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="turmas" className={ABA_CLASS}>
                    <CalendarDays className="mr-1 h-4 w-4 shrink-0" />
                    Turmas / Instâncias
                    {tab === 'turmas' && (
                      <motion.div
                        layoutId="treinamentos-aba-ativa"
                        className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary"
                        transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                      />
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="certificados" className={ABA_CLASS}>
                    <Award className="mr-1 h-4 w-4 shrink-0" />
                    Certificados
                    {tab === 'certificados' && (
                      <motion.div
                        layoutId="treinamentos-aba-ativa"
                        className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary"
                        transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                      />
                    )}
                  </TabsTrigger>
                </TabsList>
              </motion.div>
            </EntradaPresenca>

            {/* TREINAMENTOS */}
            <TabsContent value="treinamentos">
              <TreinamentosFiltros
                busca={busca}
                onBusca={(valor) => {
                  setBusca(valor);
                  setPaginaAtual(1);
                }}
                status={statusFiltro}
                onStatus={(valor) => {
                  setStatusFiltro(valor);
                  setPaginaAtual(1);
                }}
                categoria={categoriaFiltro}
                onCategoria={(valor) => {
                  setCategoriaFiltro(valor);
                  setPaginaAtual(1);
                }}
                periodo={periodoFiltro}
                onPeriodo={(valor) => {
                  setPeriodoFiltro(valor);
                  setPaginaAtual(1);
                }}
                statusOpcoes={statusOpcoes}
                categoriaOpcoes={categoriaOpcoes}
                filtroAtivo={filtroAtivo}
                onLimpar={limparFiltros}
              />

              <div className="mt-4">
                <TreinamentosTabela
                  pagina={pagina}
                  porPagina={porPagina}
                  onPaginaChange={setPaginaAtual}
                  onPorPaginaChange={(valor) => {
                    setPorPagina(valor);
                    setPaginaAtual(1);
                  }}
                  participantesPorTreinamento={participantesPorTreinamento}
                  onExcluir={excluirTreinamento}
                  filtroAtivo={filtroAtivo}
                />
              </div>
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
                                <Badge
                                  variant={new Date(cert.data_validade) < new Date() ? 'destructive' : 'outline'}
                                  className="text-[10px]"
                                >
                                  {new Date(cert.data_validade).toLocaleDateString('pt-BR')}
                                </Badge>
                              ) : (
                                'Vitalício'
                              )}
                            </TableCell>
                            <TableCell className="font-mono text-xs text-primary">{cert.codigo_autenticacao}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 gap-1.5"
                                onClick={() => toast.info('Impressão em breve')}
                              >
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
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Novo Curso
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Novo Curso</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-3">
                      <div>
                        <Label>Nome *</Label>
                        <Input
                          value={cursoForm.nome}
                          onChange={(e) => setCursoForm((p) => ({ ...p, nome: e.target.value }))}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label>Categoria</Label>
                          <Input
                            value={cursoForm.categoria}
                            onChange={(e) => setCursoForm((p) => ({ ...p, categoria: e.target.value }))}
                            placeholder="Ex: SST, Técnico"
                          />
                        </div>
                        <div>
                          <Label>Carga Horária (h)</Label>
                          <Input
                            type="number"
                            value={cursoForm.carga_horaria}
                            onChange={(e) => setCursoForm((p) => ({ ...p, carga_horaria: e.target.value }))}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label>Modalidade</Label>
                          <Select
                            value={cursoForm.modalidade}
                            onValueChange={(v) => setCursoForm((p) => ({ ...p, modalidade: v }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="presencial">Presencial</SelectItem>
                              <SelectItem value="online">Online</SelectItem>
                              <SelectItem value="hibrido">Híbrido</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>NR Relacionada</Label>
                          <Input
                            value={cursoForm.nr_relacionada}
                            onChange={(e) => setCursoForm((p) => ({ ...p, nr_relacionada: e.target.value }))}
                            placeholder="Ex: NR-35"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={cursoForm.obrigatorio}
                          onCheckedChange={(v) => setCursoForm((p) => ({ ...p, obrigatorio: v }))}
                        />
                        <Label>Obrigatório</Label>
                      </div>
                      <div>
                        <Label>Descrição</Label>
                        <Textarea
                          value={cursoForm.descricao}
                          onChange={(e) => setCursoForm((p) => ({ ...p, descricao: e.target.value }))}
                        />
                      </div>
                      <div className="flex justify-end pt-1">
                        <Button
                          size="sm"
                          className="rounded-lg px-4"
                          onClick={() => {
                            if (bloquearEscritaTreinamentos('Criar curso')) return;
                            criarCurso.mutate();
                          }}
                          disabled={!cursoForm.nome || criarCurso.isPending}
                        >
                          {criarCurso.isPending ? 'Salvando...' : 'Salvar'}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead>Modalidade</TableHead>
                        <TableHead>Carga Horária</TableHead>
                        <TableHead>Obrigatório</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cursos.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                            Nenhum curso cadastrado
                          </TableCell>
                        </TableRow>
                      ) : (
                        cursos.map((c: any) => (
                          <TableRow key={c.id}>
                            <TableCell className="font-medium">{c.nome}</TableCell>
                            <TableCell>{c.categoria || '—'}</TableCell>
                            <TableCell>{c.modalidade || '—'}</TableCell>
                            <TableCell>{c.carga_horaria ? `${c.carga_horaria}h` : '—'}</TableCell>
                            <TableCell>
                              <Badge variant={c.obrigatorio ? 'default' : 'secondary'}>
                                {c.obrigatorio ? 'Sim' : 'Não'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label="Excluir"
                                onClick={() => {
                                  if (bloquearEscritaTreinamentos('Excluir curso')) return;
                                  excluirCurso.mutate(c.id);
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
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

            {/* TRILHAS */}
            <TabsContent value="trilhas">
              <div className="flex justify-end mb-4 gap-2">
                <Dialog open={openTrilha} onOpenChange={setOpenTrilha}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Nova Trilha
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Nova Trilha de Aprendizado</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-3">
                      <div>
                        <Label>Título *</Label>
                        <Input
                          value={trilhaForm.titulo}
                          onChange={(e) => setTrilhaForm((p) => ({ ...p, titulo: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label>Nível</Label>
                        <Select
                          value={trilhaForm.nivel}
                          onValueChange={(v) => setTrilhaForm((p) => ({ ...p, nivel: v }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="basico">Básico</SelectItem>
                            <SelectItem value="intermediario">Intermediário</SelectItem>
                            <SelectItem value="avancado">Avançado</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Descrição</Label>
                        <Textarea
                          value={trilhaForm.descricao}
                          onChange={(e) => setTrilhaForm((p) => ({ ...p, descricao: e.target.value }))}
                        />
                      </div>
                      <div className="flex justify-end pt-1">
                        <Button
                          size="sm"
                          className="rounded-lg px-4"
                          onClick={() => {
                            if (bloquearEscritaTreinamentos('Criar trilha')) return;
                            criarTrilha.mutate();
                          }}
                          disabled={!trilhaForm.titulo || criarTrilha.isPending}
                        >
                          {criarTrilha.isPending ? 'Salvando...' : 'Salvar'}
                        </Button>
                      </div>
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
                        <p className="text-xs text-muted-foreground">
                          {t.nivel || '—'} • {t.descricao || 'Sem descrição'}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Excluir"
                        onClick={() => {
                          if (bloquearEscritaTreinamentos('Excluir trilha')) return;
                          excluirTrilha.mutate(t.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    <TrilhaCursosSection trilhaId={t.id} cursos={cursos} />
                  </CardContent>
                </Card>
              ))}
              {trilhas.length === 0 && (
                <Card>
                  <CardContent className="text-center text-muted-foreground py-8">
                    Nenhuma trilha cadastrada
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* INSCRIÇÕES */}
            <TabsContent value="inscricoes">
              <div className="flex justify-end mb-4">
                <Dialog open={openInsc} onOpenChange={setOpenInsc}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Nova Inscrição
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Inscrever Colaborador</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-3">
                      <div>
                        <Label>Colaborador *</Label>
                        <Select
                          value={inscForm.colaborador_id}
                          onValueChange={(v) => setInscForm((p) => ({ ...p, colaborador_id: v }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            {colaboradores.map((c: any) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.nome_completo}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Curso *</Label>
                        <Select
                          value={inscForm.curso_id}
                          onValueChange={(v) => setInscForm((p) => ({ ...p, curso_id: v }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            {cursos.map((c: any) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Data Início</Label>
                        <Input
                          type="date"
                          value={inscForm.data_inicio}
                          onChange={(e) => setInscForm((p) => ({ ...p, data_inicio: e.target.value }))}
                        />
                      </div>
                      <div className="flex justify-end pt-1">
                        <Button
                          size="sm"
                          className="rounded-lg px-4"
                          onClick={() => {
                            if (bloquearEscritaTreinamentos('Criar inscrição')) return;
                            criarInsc.mutate();
                          }}
                          disabled={!inscForm.colaborador_id || !inscForm.curso_id || criarInsc.isPending}
                        >
                          {criarInsc.isPending ? 'Salvando...' : 'Inscrever'}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Colaborador</TableHead>
                        <TableHead>Curso</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Data Início</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {inscricoes.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                            Nenhuma inscrição registrada
                          </TableCell>
                        </TableRow>
                      ) : (
                        inscricoes.map((i: any) => (
                          <TableRow key={i.id}>
                            <TableCell>{i.colaborador?.nome_completo || '—'}</TableCell>
                            <TableCell>{i.curso?.nome || '—'}</TableCell>
                            <TableCell>
                              <Badge variant={i.status === 'concluido' ? 'default' : 'secondary'}>
                                {i.status || 'inscrito'}
                              </Badge>
                            </TableCell>
                            <TableCell>{i.data_inicio || '—'}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TURMAS */}
            <TabsContent value="turmas">
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Curso</TableHead>
                        <TableHead>Instrutor</TableHead>
                        <TableHead>Início</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Vagas</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {instancias.map((i: any) => (
                        <TableRow key={i.id}>
                          <TableCell className="font-medium">{i.curso?.nome || '—'}</TableCell>
                          <TableCell>{i.instrutor?.nome_completo || '—'}</TableCell>
                          <TableCell>{new Date(i.data_inicio).toLocaleDateString('pt-BR')}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{i.status}</Badge>
                          </TableCell>
                          <TableCell>{i.capacidade_maxima || '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </PageLayout>
    </MotionConfig>
  );
}
