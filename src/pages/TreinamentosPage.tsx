import { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageLayout } from '@/components/layout';
import { PageTitle } from '@/components/PageTitle';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  TreinamentosCascadeDialog,
  TreinamentosCascadeItem,
} from '@/components/treinamentos/TreinamentosCascadeDialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { EntradaPresenca, entradaCard } from '@/components/ui/entrada-cards';
import { supabase } from '@/integrations/supabase/client';
import { catalogoCursoService, colaboradorService } from '@/services';
import { chaveConteudo } from '@/services/trainingImages';
import { useEmpresas } from '@/hooks';
import { useTrainingImages } from '@/hooks/useTrainingImages';
import { usePermissions } from '@/hooks/usePermissions';
import { toast } from 'sonner';
import { motion, MotionConfig } from 'framer-motion';
import { MOTION_REDUCED_MODE } from '@/lib/motionMode';
import { Eraser, GraduationCap, Layers, Plus, Search, Trash2, Video } from 'lucide-react';
import { TreinamentosFiltros } from '@/components/treinamentos/TreinamentosFiltros';
import { TreinamentosKpis } from '@/components/treinamentos/TreinamentosKpis';
import { TreinamentosTabela } from '@/components/treinamentos/TreinamentosTabela';
import { TreinamentosCatalogo } from '@/components/treinamentos/TreinamentosCatalogo';
import { TurmasPainel } from '@/components/treinamentos/TurmasPainel';
import { CertificadosPainel } from '@/components/treinamentos/CertificadosPainel';
import { CertificadoDetalheDialog } from '@/components/treinamentos/CertificadoDetalheDialog';
import { InscricoesPainel } from '@/components/treinamentos/InscricoesPainel';
import { montarCertificados, type Certificado } from '@/components/treinamentos/certificadosDerivacoes';
import { TreinamentosTabsList } from '@/components/treinamentos/TreinamentosTabsList';
import { NovaTurmaDialog, type NovaTurmaPayload } from '@/components/treinamentos/NovaTurmaDialog';
import { AppPagination } from '@/components/ui/app-pagination';
import { TrilhaCard } from '@/components/treinamentos/TrilhaCard';
import { TrilhaDetalheDialog } from '@/components/treinamentos/TrilhaDetalheDialog';
import { TrilhasFiltros } from '@/components/treinamentos/TrilhasFiltros';
import {
  TRILHAS_OPCOES_POR_PAGINA,
  TRILHAS_POR_PAGINA_PADRAO,
  filtrarTrilhas,
  opcoesStatusTrilha,
  type InscricaoTrilha,
  type TrilhaRegistro,
} from '@/components/treinamentos/trilhasDerivacoes';
import {
  TREINAMENTOS_POR_PAGINA_PADRAO,
  agruparInscricoesPorCurso,
  agruparParticipantes,
  calcularIndicadoresTreinamentos,
  filtrarTreinamentos,
  opcoesCategoriaTreinamento,
  opcoesStatusTreinamento,
  paginarTreinamentos,
  resumirOcupacoes,
  type CursoCatalogo,
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
  getMockParticipacaoCursos,
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
 * Ações de CRIAÇÃO do cabeçalho (canto superior direito).
 *
 * Padrão compacto, o mesmo já usado nos demais módulos administrativos:
 * 40 px de altura no desktop (44 px no toque, abaixo de `sm`), padding
 * horizontal de 16 px, texto 14 px/600, ícone 16 px, raio de 10 px e largura
 * ditada pelo conteúdo. Só a geometria muda — variantes, cores, hover, foco e
 * os handlers de cada botão continuam vindo do `Button` compartilhado.
 */
const ACAO_CABECALHO_CLASS =
  'h-11 w-auto shrink-0 gap-2 rounded-[10px] px-4 text-sm font-semibold shadow-sm transition-shadow hover:shadow-md sm:h-10';

export default function TreinamentosPage() {
  const { empresaAtual } = useEmpresas();
  const { pode } = usePermissions();
  const qc = useQueryClient();
  const [tab, setTab] = useState('treinamentos');
  /** Autorização real da matriz `permissions` (admin tem atalho true). */
  const podeCriarTurma = pode('treinamentos', 'create');

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
  const {
    data: inscricoes = [],
    isLoading: loadInsc,
    isError: erroInsc,
    refetch: recarregarInsc,
  } = useQuery({
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
  const {
    data: certificados = [],
    isLoading: loadCert,
    isError: erroCert,
    refetch: recarregarCert,
  } = useQuery({
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

  /**
   * CAPAS — leitura única por empresa (desligada por padrão). O mapa alimenta as
   * quatro áreas sem tocar em serviços de escrita: os registros continuam sendo
   * os mesmos, apenas ganham `imagem_url` quando existir uma capa concluída.
   * Turmas e certificados herdam a capa do curso automaticamente (o mapa é
   * indexado por curso), então NÃO há geração por turma/certificado.
   */
  const imagensTreinamento = useTrainingImages(empresaAtual?.id);

  const cursosComImagem = useMemo(() => {
    if (imagensTreinamento.size === 0) return cursos;
    return (cursos as CursoCatalogo[]).map((curso) => {
      const url = imagensTreinamento.get(chaveConteudo('course', String(curso.id)));
      return url ? { ...curso, imagem_url: url } : curso;
    });
  }, [cursos, imagensTreinamento]);

  /**
   * Certificados já carregados, no mesmo modelo de apresentação da aba
   * Certificados. Serve apenas para a ação contextual “Certificado” das
   * inscrições — nenhuma consulta nova e nenhum vínculo inventado.
   */
  const certificadosMapeados = useMemo(
    () => montarCertificados(certificados as any[], cursosComImagem as any[], colaboradores as any[]),
    [certificados, cursosComImagem, colaboradores]
  );

  const trilhasComImagem = useMemo(() => {
    if (imagensTreinamento.size === 0) return trilhas;
    return (trilhas as TrilhaRegistro[]).map((trilha) => {
      const url = imagensTreinamento.get(chaveConteudo('learning_path', String(trilha.id)));
      return url ? { ...trilha, imagem_url: url } : trilha;
    });
  }, [trilhas, imagensTreinamento]);

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
  const novoTreinamentoRef = useRef<HTMLButtonElement>(null);
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

  /**
   * Participação dos cards do Catálogo.
   *
   * Modo demonstração: mesma vitrine da referência aprovada (mock de leitura).
   * Caminho real: `inscricoes_cursos` agrupadas por curso + a lista de
   * colaboradores da empresa já carregada (nome/foto). Nenhuma consulta nova,
   * nenhum participante inventado — curso sem inscrição não entra no mapa.
   */
  const participantesPorCurso = useMemo(() => {
    const participacaoMock = getMockParticipacaoCursos();
    return participacaoMock ?? agruparInscricoesPorCurso(inscricoes, colaboradores);
  }, [inscricoes, colaboradores]);

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

  /** Ação do card do Catálogo — mesma confirmação e mesmas permissões de antes. */
  const excluirCursoCatalogo = (curso: CursoCatalogo) => {
    if (bloquearEscritaTreinamentos('Excluir curso')) return;
    excluirCurso.mutate(curso.id);
  };

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

  // === Aba Trilhas — filtros, paginação, detalhe e cascata de entrada ===
  const [buscaTrilha, setBuscaTrilha] = useState('');
  const [nivelTrilhaFiltro, setNivelTrilhaFiltro] = useState('todos');
  const [statusTrilhaFiltro, setStatusTrilhaFiltro] = useState('todos');
  const [paginaTrilhaAtual, setPaginaTrilhaAtual] = useState(1);
  const [porPaginaTrilhas, setPorPaginaTrilhas] = useState<number>(TRILHAS_POR_PAGINA_PADRAO);
  const [trilhaDetalhe, setTrilhaDetalhe] = useState<TrilhaRegistro | null>(null);

  /**
   * Latch da cascata: a entrada toca a cada acesso à aba Trilhas e depois os
   * cards passam a usar variants estáticas — filtrar, paginar, dar hover ou
   * receber dados novos não reinicia a animação. O cronômetro só começa quando
   * os cards já estão renderizados (carregamento lento não perde a entrada).
   */
  const [animarTrilhas, setAnimarTrilhas] = useState(true);
  const [entradaTrilhasPendente, setEntradaTrilhasPendente] = useState(true);
  const timerEntradaTrilhas = useRef<number | null>(null);
  useEffect(() => {
    if (tab !== 'trilhas' || loadTrilhas || !entradaTrilhasPendente) return;
    if (timerEntradaTrilhas.current) window.clearTimeout(timerEntradaTrilhas.current);
    timerEntradaTrilhas.current = window.setTimeout(() => {
      setAnimarTrilhas(false);
      setEntradaTrilhasPendente(false);
    }, 1400);
    return () => {
      if (timerEntradaTrilhas.current) window.clearTimeout(timerEntradaTrilhas.current);
    };
  }, [tab, loadTrilhas, entradaTrilhasPendente]);

  /** Troca de aba: ao ENTRAR em Trilhas, reabre o latch antes da montagem dos cards. */
  const mudarAba = (valor: string) => {
    setTab(valor);
    if (valor !== 'trilhas') return;
    setAnimarTrilhas(true);
    setEntradaTrilhasPendente(true);
  };

  const statusOpcoesTrilhas = useMemo(() => opcoesStatusTrilha(trilhas as TrilhaRegistro[]), [trilhas]);

  const trilhasFiltradas = useMemo(
    () =>
      filtrarTrilhas(trilhasComImagem as TrilhaRegistro[], {
        busca: buscaTrilha,
        nivel: nivelTrilhaFiltro,
        status: statusTrilhaFiltro,
      }),
    [trilhasComImagem, buscaTrilha, nivelTrilhaFiltro, statusTrilhaFiltro]
  );

  const paginaTrilhas = useMemo(
    () => paginarTreinamentos(trilhasFiltradas, paginaTrilhaAtual, porPaginaTrilhas),
    [trilhasFiltradas, paginaTrilhaAtual, porPaginaTrilhas]
  );

  const filtroTrilhaAtivo =
    Boolean(buscaTrilha.trim()) || nivelTrilhaFiltro !== 'todos' || statusTrilhaFiltro !== 'todos';

  const limparFiltrosTrilhas = () => {
    setBuscaTrilha('');
    setNivelTrilhaFiltro('todos');
    setStatusTrilhaFiltro('todos');
    setPaginaTrilhaAtual(1);
  };

  // === Inscrições ===
  const [openInsc, setOpenInsc] = useState(false);
  const novaInscricaoRef = useRef<HTMLButtonElement>(null);
  const [inscForm, setInscForm] = useState({ colaborador_id: '', curso_id: '', data_inicio: '' });
  const [certificadoInscricao, setCertificadoInscricao] = useState<Certificado | null>(null);
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

  // === Turmas / Instâncias ===
  // A criação usa a operação JÁ existente `criarInstancia`; não há API nova.
  const [openTurma, setOpenTurma] = useState(false);
  const criarTurma = useMutation({
    mutationFn: (dados: NovaTurmaPayload) => catalogoCursoService.criarInstancia(dados),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['treinamento_instancias'] });
      setOpenTurma(false);
      toast.success('Turma criada!');
    },
    onError: () => toast.error('Erro ao criar turma'),
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
          tab === 'trilhas' ? (
            <Button onClick={() => setOpenTrilha(true)} className={ACAO_CABECALHO_CLASS}>
              <Plus className="h-4 w-4" />
              Nova Trilha
            </Button>
          ) : tab === 'inscricoes' ? (
            <>
              <Button ref={novaInscricaoRef} onClick={() => setOpenInsc(true)} className={ACAO_CABECALHO_CLASS}>
                <Plus className="h-4 w-4" />
                Nova Inscrição
              </Button>
              <TreinamentosCascadeDialog
                open={openInsc}
                onOpenChange={setOpenInsc}
                blocks={2}
                onCloseAutoFocus={(event) => {
                  event.preventDefault();
                  novaInscricaoRef.current?.focus();
                }}
              >
                <TreinamentosCascadeItem>
                  <DialogHeader>
                    <DialogTitle>Inscrever Colaborador</DialogTitle>
                  </DialogHeader>
                </TreinamentosCascadeItem>
                <TreinamentosCascadeItem>
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
                </TreinamentosCascadeItem>
              </TreinamentosCascadeDialog>
            </>
          ) : (
            <div className="flex max-w-full flex-wrap items-center justify-end gap-2.5 xl:shrink-0">
              {/*
              AÇÕES DAS DEMAIS ABAS (a aba Inscrições tem CTA próprio acima):
              · “Novo Treinamento” cria uma linha em `treinamentos`;
              · “Novo Curso” cria um item em `catalogo_cursos` (aba Catálogo).
              Na aba Catálogo o CTA lime é “Novo Curso” (como na referência) e o
              “Novo Treinamento” vira secundário. Trilhas e Inscrições têm CTA
              próprios; Turmas/Certificados mantêm o comportamento anterior.
            */}
              <Button
                ref={novoTreinamentoRef}
                variant={tab === 'catalogo' ? 'outline' : 'default'}
                onClick={() => setOpenTrein(true)}
                className={`${ACAO_CABECALHO_CLASS}${
                  tab === 'catalogo'
                    ? ' border-border/60 bg-card/60 text-foreground hover:bg-card/80 hover:text-foreground'
                    : ''
                }`}
              >
                <Plus className="h-4 w-4" />
                Novo Treinamento
              </Button>
              {tab === 'catalogo' && (
                <Button onClick={() => setOpenCurso(true)} className={ACAO_CABECALHO_CLASS}>
                  <Plus className="h-4 w-4" />
                  Novo Curso
                </Button>
              )}
              <TreinamentosCascadeDialog
                open={openTrein}
                onOpenChange={setOpenTrein}
                blocks={BLOCOS_CASCATA_NOVO_TREINAMENTO}
                onCloseAutoFocus={(event) => {
                  event.preventDefault();
                  novoTreinamentoRef.current?.focus();
                }}
              >
                <TreinamentosCascadeItem>
                  <DialogHeader>
                    <DialogTitle>Novo Treinamento</DialogTitle>
                  </DialogHeader>
                </TreinamentosCascadeItem>

                <TreinamentosCascadeItem className="grid gap-3">
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
                </TreinamentosCascadeItem>
              </TreinamentosCascadeDialog>

              {/* NOVO CURSO — ação PRÓPRIA do catálogo (`catalogo_cursos`), distinta
              de “Novo Treinamento”. O formulário e a mutation são os mesmos de
              antes; só mudou o lugar do gatilho. */}
              <TreinamentosCascadeDialog open={openCurso} onOpenChange={setOpenCurso} blocks={2}>
                <TreinamentosCascadeItem>
                  <DialogHeader>
                    <DialogTitle>Novo Curso</DialogTitle>
                  </DialogHeader>
                </TreinamentosCascadeItem>
                <TreinamentosCascadeItem>
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
                </TreinamentosCascadeItem>
              </TreinamentosCascadeDialog>
            </div>
          )
        }
      >
        <TreinamentosKpis indicadores={indicadores} />

        {isLoading && tab !== 'catalogo' ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : (
          <Tabs value={tab} onValueChange={mudarAba}>
            <EntradaPresenca>
              <motion.div {...entradaCard(4)}>
                <TreinamentosTabsList value={tab} onValueChange={mudarAba} />
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
              <CertificadosPainel
                certificados={certificados as any[]}
                cursos={cursosComImagem as any[]}
                colaboradores={colaboradores as any[]}
                carregando={loadCert}
                erro={erroCert}
                onTentarNovamente={() => void recarregarCert()}
              />
            </TabsContent>

            {/* CATÁLOGO — grid de cards horizontais (substitui a tabela antiga).
                Filtros, busca, ordenação e paginação são de apresentação sobre a
                lista já carregada; nenhuma consulta/escrita nova. */}
            <TabsContent value="catalogo">
              <TreinamentosCatalogo
                cursos={cursosComImagem as CursoCatalogo[]}
                participantesPorCurso={participantesPorCurso}
                carregando={loadCursos}
                onExcluir={excluirCursoCatalogo}
              />
            </TabsContent>

            {/* TRILHAS — grade de jornadas de aprendizagem */}
            <TabsContent value="trilhas">
              <div className="space-y-4">
                <TrilhasFiltros
                  busca={buscaTrilha}
                  onBusca={(valor) => {
                    setBuscaTrilha(valor);
                    setPaginaTrilhaAtual(1);
                  }}
                  nivel={nivelTrilhaFiltro}
                  onNivel={(valor) => {
                    setNivelTrilhaFiltro(valor);
                    setPaginaTrilhaAtual(1);
                  }}
                  status={statusTrilhaFiltro}
                  onStatus={(valor) => {
                    setStatusTrilhaFiltro(valor);
                    setPaginaTrilhaAtual(1);
                  }}
                  statusOpcoes={statusOpcoesTrilhas}
                  filtroAtivo={filtroTrilhaAtivo}
                  onLimpar={limparFiltrosTrilhas}
                />

                {loadTrilhas ? (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-hidden>
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="h-[372px] animate-pulse rounded-2xl border border-border/60 bg-card" />
                    ))}
                  </div>
                ) : trilhas.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-border/70 bg-card/40 px-4 py-16 text-center">
                    <span className="mb-1 flex h-11 w-11 items-center justify-center rounded-full bg-muted/50 text-muted-foreground">
                      <Layers className="h-5 w-5" />
                    </span>
                    <p className="text-sm font-medium text-foreground">Nenhuma trilha cadastrada</p>
                    <p className="max-w-md text-xs text-muted-foreground">
                      Crie a primeira trilha para organizar os cursos em jornadas de aprendizagem.
                    </p>
                    <Button size="sm" className="mt-2 gap-2 rounded-lg" onClick={() => setOpenTrilha(true)}>
                      <Plus className="h-4 w-4" />
                      Nova Trilha
                    </Button>
                  </div>
                ) : trilhasFiltradas.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-border/70 bg-card/40 px-4 py-12 text-center">
                    <span className="mb-1 flex h-11 w-11 items-center justify-center rounded-full bg-muted/50 text-muted-foreground">
                      <Search className="h-5 w-5" />
                    </span>
                    <p className="text-sm font-medium text-foreground">Nenhuma trilha encontrada</p>
                    <p className="max-w-md text-xs text-muted-foreground">
                      Ajuste a busca ou limpe os filtros para ver todas as trilhas disponíveis.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 gap-2 rounded-lg"
                      onClick={limparFiltrosTrilhas}
                    >
                      <Eraser className="h-4 w-4" />
                      Limpar filtros
                    </Button>
                  </div>
                ) : (
                  <>
                    <EntradaPresenca>
                      <div className="grid items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {paginaTrilhas.itens.map((trilha, index) => (
                          <TrilhaCard
                            key={trilha.id}
                            trilha={trilha}
                            index={5 + index}
                            animar={animarTrilhas}
                            inscricoes={inscricoes as InscricaoTrilha[]}
                            onExplorar={() => setTrilhaDetalhe(trilha)}
                            onExcluir={() => {
                              if (bloquearEscritaTreinamentos('Excluir trilha')) return;
                              excluirTrilha.mutate(trilha.id);
                            }}
                          />
                        ))}
                      </div>
                    </EntradaPresenca>

                    <EntradaPresenca>
                      <motion.div {...entradaCard(5 + paginaTrilhas.itens.length)}>
                        <AppPagination
                          page={paginaTrilhas.pagina}
                          total={paginaTrilhas.total}
                          pageSize={porPaginaTrilhas}
                          pageSizeOptions={TRILHAS_OPCOES_POR_PAGINA}
                          onPageChange={setPaginaTrilhaAtual}
                          onPageSizeChange={(tamanho) => {
                            setPorPaginaTrilhas(tamanho);
                            setPaginaTrilhaAtual(1);
                          }}
                          selectorPosition="end"
                          linhasPorPaginaLabel="Itens por página"
                          label={
                            <>
                              Mostrando <span className="font-semibold text-foreground">{paginaTrilhas.inicio}</span>–
                              <span className="font-semibold text-foreground">{paginaTrilhas.fim}</span> de{' '}
                              <span className="font-semibold text-foreground">{paginaTrilhas.total}</span>{' '}
                              {paginaTrilhas.total === 1 ? 'trilha' : 'trilhas'}
                            </>
                          }
                        />
                      </motion.div>
                    </EntradaPresenca>
                  </>
                )}
              </div>

              {/* Criação da trilha: o gatilho é o botão do cabeçalho contextual. */}
              <TreinamentosCascadeDialog open={openTrilha} onOpenChange={setOpenTrilha} blocks={2}>
                <TreinamentosCascadeItem>
                  <DialogHeader>
                    <DialogTitle>Nova Trilha de Aprendizado</DialogTitle>
                  </DialogHeader>
                </TreinamentosCascadeItem>
                <TreinamentosCascadeItem>
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
                </TreinamentosCascadeItem>
              </TreinamentosCascadeDialog>

              <TrilhaDetalheDialog
                trilha={trilhaDetalhe}
                cursos={cursos}
                inscricoes={inscricoes as InscricaoTrilha[]}
                onClose={() => setTrilhaDetalhe(null)}
              />
            </TabsContent>

            {/* INSCRIÇÕES */}
            <TabsContent value="inscricoes">
              <InscricoesPainel
                inscricoes={inscricoes as any[]}
                cursos={cursosComImagem as any[]}
                colaboradores={colaboradores as any[]}
                certificados={certificadosMapeados}
                carregando={loadInsc}
                erro={erroInsc}
                onTentarNovamente={() => void recarregarInsc()}
                onVerCertificado={setCertificadoInscricao}
              />
              <CertificadoDetalheDialog
                certificado={certificadoInscricao}
                onOpenChange={(aberto) => {
                  if (!aberto) setCertificadoInscricao(null);
                }}
              />
            </TabsContent>

            {/* TURMAS */}
            <TabsContent value="turmas">
              <TurmasPainel
                instancias={instancias as any[]}
                cursos={cursosComImagem as any[]}
                colaboradores={colaboradores as any[]}
                carregando={loadInst}
                onNovaTurma={() => setOpenTurma(true)}
                podeCriarTurma={podeCriarTurma}
              />
            </TabsContent>
          </Tabs>
        )}

        <NovaTurmaDialog
          open={openTurma}
          cursos={cursos as any[]}
          colaboradores={colaboradores as any[]}
          onOpenChange={setOpenTurma}
          onCriar={(dados) => {
            if (!empresaAtual?.id) {
              toast.error('Selecione uma empresa antes de criar a turma');
              return;
            }
            if (bloquearEscritaTreinamentos('Criar turma')) return;
            criarTurma.mutate(dados);
          }}
          pendente={criarTurma.isPending}
        />
      </PageLayout>
    </MotionConfig>
  );
}
