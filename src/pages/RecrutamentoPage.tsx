import { PageTitle } from '@/components/PageTitle';
import { PageLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent } from '@/components/ui/tabs';
// TABLIST — mesma skin da área de Admissões. Não há classe de aba escrita nesta
// página: o container (`bg-muted/50 rounded-xl p-1 border border-border/30`), o
// indicador deslizante (`rounded-lg bg-background shadow-xs`) e o trigger
// (`data-[state=active]:bg-transparent data-[state=active]:text-primary`) vêm
// de `colaboradores/AnimatedDossieTabs`, que é a FONTE ÚNICA da tablist do app
// (o Dossiê de Colaboradores, Admissões e esta área consomem o mesmo par).
// O `<Tabs>`/`<TabsContent>` do Radix continua por fora controlando o conteúdo,
// pelo mesmo `value`/`onValueChange` — troca-se só a aparência, não a navegação.
import {
  AnimatedDossieTabsList as AnimatedTabsList,
  AnimatedDossieTabsTrigger as AnimatedTabsTrigger,
} from '@/components/colaboradores/AnimatedDossieTabs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { recrutamentoService } from '@/services/recrutamentoService';
import { useEmpresas } from '@/hooks';
import { UserSearch, Plus, Briefcase, Users, Filter, BarChart3, Search, X, LayoutGrid } from 'lucide-react';
import { motion, MotionConfig } from 'framer-motion';
import { MOTION_REDUCED_MODE } from '@/lib/motionMode';
import { Spinner } from '@/components/ui/spinner';
import { useState, useMemo, useEffect, useRef } from 'react';
import { toast } from 'sonner';
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
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// ENTRADA DE CARD — MESMO mecanismo do Dashboard Executivo (`cardVariants` de
// `components/dashboard/MetricCard.tsx`, empacotado aqui): fade + subida de
// 20px, 0.4s, ease `[0.25, 0.46, 0.45, 0.94]` e stagger de 0.08s por índice
// (teto no 9º item). Nenhum valor de animação é escrito nesta página: os cards
// usam `MotionCard`/`entradaCard(i)` e os blocos que NÃO são `Card` (card do
// kanban, cabeçalho de coluna, item da timeline) usam `motion.*` com o MESMO
// `{...entradaCard(i)}` — a cascata inteira sai de um único lugar.
import { EntradaPresenca } from '@/components/ui/entrada-cards';
import { CandidatoDetalhesDialog } from '@/components/recrutamento/CandidatoDetalhesDialog';
import { NovaVagaDialog } from '@/components/recrutamento/NovaVagaDialog';
import { montarPayloadVaga, type NovaVagaStatus, type RascunhoVaga } from '@/components/recrutamento/novaVagaRascunho';
import { opcoesDepartamento } from '@/components/recrutamento/vagasComum';
import { AnalyticsRecrutamento } from '@/components/recrutamento/AnalyticsRecrutamento';
import { VagasPainel } from '@/components/recrutamento/VagasPainel';
import { CandidatosPainel } from '@/components/recrutamento/CandidatosPainel';
import { PipelineBoard } from '@/components/recrutamento/PipelineBoard';
import { ETAPAS, filtrarCandidaturas } from '@/components/recrutamento/pipelineEtapas';
import type { CandidaturaComRelacoes, VagaRow, CandidatoRow } from '@/types/recrutamento';
// MOCK VISUAL — ver src/mocks/recrutamentoMock.ts.
import {
  avancarEtapaCandidaturaMock,
  excluirVagaMock,
  getMockCandidatos,
  getMockCandidaturas,
  getMockVagas,
  isRecrutamentoMockEnabled,
  moverCandidaturaMock,
  publicarVagaMock,
  simularAcaoRecrutamento,
} from '@/mocks/recrutamentoMock';
const TABS_PIPELINE = [
  { value: 'pipeline', label: 'Pipeline', icone: LayoutGrid },
  { value: 'vagas', label: 'Vagas', icone: Briefcase },
  { value: 'candidatos', label: 'Candidatos', icone: Users },
  { value: 'analytics', label: 'Analytics', icone: BarChart3 },
] as const;

export default function RecrutamentoPage() {
  const { empresaAtual } = useEmpresas();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState('pipeline');
  const [selectedVagaId, setSelectedVagaId] = useState<string>('all');
  const [busca, setBusca] = useState('');
  const buscaRef = useRef<HTMLInputElement>(null);
  const [selectedCandidatura, setSelectedCandidatura] = useState<CandidaturaComRelacoes | null>(null);
  /**
   * `selectedCandidatura` guarda o DOSSÊ do candidato (dados) e `detalhesAbertos`
   * é quem manda no `open` do diálogo — o mesmo par usado pela janela de
   * Detalhes da Admissão (`admissaoDoModal` + `selectedAdmissao`). Fechar NÃO
   * descarta os dados: assim o conteúdo permanece na tela durante a animação de
   * saída do `AnimatePresence` e o próximo clique só troca o candidato.
   */
  const [detalhesAbertos, setDetalhesAbertos] = useState(false);
  // "Nova Vaga": diálogo CONTROLADO pelo botão do cabeçalho. O formulário em si
  // mora no `NovaVagaDialog` — a página só guarda se ele está aberto.
  const [novaVagaAberta, setNovaVagaAberta] = useState(false);

  // Atalho ⌘/Ctrl+K leva o foco à busca do pipeline (o mesmo hint exibido no campo).
  useEffect(() => {
    const aoTeclar = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        buscaRef.current?.focus();
      }
    };
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, []);

  // MOCK VISUAL — ver src/mocks/recrutamentoMock.ts. Com o mock ligado, cada
  // leitura curto-circuita o Supabase e `enabled` também vale sem empresa ativa.
  const mockAtivo = isRecrutamentoMockEnabled();
  const { data: vagas = [], isLoading: loadVagas } = useQuery<VagaRow[]>({
    queryKey: ['vagas', empresaAtual?.id],
    queryFn: async () => (getMockVagas() as VagaRow[] | undefined) ?? recrutamentoService.listarVagas(empresaAtual!.id),
    enabled: !!empresaAtual?.id || mockAtivo,
  });

  const { data: candidaturas = [], isLoading: loadCandidaturas } = useQuery<CandidaturaComRelacoes[]>({
    queryKey: ['candidaturas', empresaAtual?.id, selectedVagaId],
    queryFn: async () =>
      (getMockCandidaturas(selectedVagaId === 'all' ? undefined : selectedVagaId) as
        CandidaturaComRelacoes[] | undefined) ??
      recrutamentoService.listarCandidaturas(empresaAtual!.id, selectedVagaId === 'all' ? undefined : selectedVagaId),
    enabled: !!empresaAtual?.id || mockAtivo,
  });

  const { data: candidatos = [], isLoading: loadCandidatos } = useQuery<CandidatoRow[]>({
    queryKey: ['candidatos', empresaAtual?.id],
    queryFn: async () =>
      (getMockCandidatos() as CandidatoRow[] | undefined) ?? recrutamentoService.listarCandidatos(empresaAtual!.id),
    enabled: !!empresaAtual?.id || mockAtivo,
  });

  /**
   * Candidaturas SEM o filtro por vaga. O seletor do topo é o filtro do
   * KANBAN (ele só aparece na aba Pipeline); as Analytics, a contagem por vaga
   * dos cards de vaga e a distribuição por etapa são números de TODO o
   * processo — sem esta leitura separada, filtrar o Pipeline mudava os KPIs das
   * outras abas.
   */
  const {
    data: candidaturasTodas = [],
    isLoading: loadCandidaturasTodas,
    isError: erroCandidaturasTodas,
    refetch: recarregarCandidaturasTodas,
  } = useQuery<CandidaturaComRelacoes[]>({
    queryKey: ['candidaturas-todas', empresaAtual?.id],
    queryFn: async () =>
      (getMockCandidaturas() as CandidaturaComRelacoes[] | undefined) ??
      recrutamentoService.listarCandidaturas(empresaAtual!.id),
    enabled: !!empresaAtual?.id || mockAtivo,
  });

  // MOCK VISUAL: com o mock ligado a etapa muda no store em memória
  // (`moverCandidaturaMock`) e nada vai ao Supabase — os ids são fictícios.
  const updateEtapa = useMutation({
    mutationFn: async ({ id, etapa }: { id: string; etapa: string }) => {
      const daDemo = moverCandidaturaMock(id, etapa);
      return daDemo ?? recrutamentoService.atualizarCandidatura(id, { etapa }, empresaAtual!.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['candidaturas', empresaAtual?.id] });
      qc.invalidateQueries({ queryKey: ['candidaturas-todas', empresaAtual?.id] });
      toast.success('Etapa atualizada!');
    },
    onError: () => toast.error('Não foi possível mover o candidato de etapa. Tente novamente.'),
  });

  /** Abre o dossiê do candidato (card do kanban e listagem de candidatos). */
  const abrirDetalhes = (cand: CandidaturaComRelacoes) => {
    setSelectedCandidatura(cand);
    setDetalhesAbertos(true);
  };

  /**
   * Move a candidatura (menu do card E arrastar-e-soltar). No modo demonstração
   * a escrita acontece no store do mock (nada de rede); fora dele vai para o
   * Supabase como sempre. Devolve `false` quando a gravação falha para o board
   * desfazer a movimentação otimista e restaurar a coluna de origem.
   */
  const moverEtapa = async (id: string, etapa: string): Promise<boolean> => {
    try {
      await updateEtapa.mutateAsync({ id, etapa });
      if (selectedCandidatura?.id === id) {
        setSelectedCandidatura((atual) => (atual ? { ...atual, etapa } : atual));
      }
      return true;
    } catch {
      return false;
    }
  };

  /** "Avançar para Próxima Etapa" do dossiê do candidato. */
  const avancarEtapa = () => {
    const cand = selectedCandidatura;
    if (!cand) return;
    // MOCK VISUAL: avança no store do mock e devolve de/para para o feedback.
    if (mockAtivo) {
      const resultado = avancarEtapaCandidaturaMock(cand.id);
      if (!resultado.ok) {
        toast.info(`${cand.candidato?.nome ?? 'Candidato'} já está na última etapa do processo.`);
        return;
      }
      qc.invalidateQueries({ queryKey: ['candidaturas', empresaAtual?.id] });
      qc.invalidateQueries({ queryKey: ['candidaturas-todas', empresaAtual?.id] });
      qc.invalidateQueries({ queryKey: ['candidato-timeline', cand.id] });
      // Relê a linha do store: além da etapa, o avanço pode mexer no score.
      const atualizada = getMockCandidaturas()?.find((c) => c.id === cand.id) as CandidaturaComRelacoes | undefined;
      setSelectedCandidatura(atualizada ?? { ...cand, etapa: resultado.para! });
      toast.success(`${resultado.candidato} avançou para "${ETAPAS.find((e) => e.id === resultado.para)?.label}"!`);
      return;
    }
    const i = ETAPAS.findIndex((e) => e.id === (cand.etapa || 'triagem'));
    const proxima = ETAPAS[i + 1];
    if (!proxima) {
      toast.info('Este candidato já está na última etapa do processo.');
      return;
    }
    updateEtapa.mutate({ id: cand.id, etapa: proxima.id });
    setSelectedCandidatura({ ...cand, etapa: proxima.id });
  };

  /**
   * Cria a vaga a partir do assistente "Anunciar Nova Vaga".
   *
   * A página continua dona da escrita (o diálogo é só apresentação): o rascunho
   * do formulário vira payload de `vagas` em `montarPayloadVaga`, o mock em
   * memória responde primeiro quando a demonstração está ligada e, fora dela, o
   * INSERT vai para o Supabase — mesmo desenho das outras mutações desta página.
   * `status` decide o destino: `aberta` (publicar) ou `rascunho` (salvar para
   * depois).
   */
  const criarVaga = useMutation({
    mutationFn: async ({ rascunho, status }: { rascunho: RascunhoVaga; status: NovaVagaStatus }) => {
      const payload = montarPayloadVaga(rascunho, { empresaId: empresaAtual?.id, status });
      const daDemo = publicarVagaMock({
        titulo: payload.titulo,
        departamento: payload.departamento,
        modalidade: payload.modalidade,
        quantidade: payload.quantidade,
        requisitos: payload.requisitos,
        status,
        tipoContrato: payload.tipo_contrato,
        descricao: payload.descricao,
        beneficios: payload.beneficios_oferecidos ?? undefined,
        faixaMin: payload.faixa_salarial_min ?? 0,
        faixaMax: payload.faixa_salarial_max ?? 0,
      });
      return daDemo ?? recrutamentoService.criarVaga(payload);
    },
    onSuccess: (vaga, { status }) => {
      qc.invalidateQueries({ queryKey: ['vagas', empresaAtual?.id] });
      setNovaVagaAberta(false);
      const titulo = vaga?.titulo ?? 'Nova vaga';
      if (status === 'rascunho') {
        toast.success(`Rascunho de "${titulo}" salvo!`);
      } else {
        toast.success(`Vaga "${titulo}" publicada!`);
      }
    },
    onError: (_erro, { status }) =>
      toast.error(
        status === 'rascunho'
          ? 'Não foi possível salvar o rascunho. Tente novamente.'
          : 'Não foi possível publicar a vaga. Tente novamente.'
      ),
  });

  /** Exclui a vaga (e, no mock, as candidaturas dela em cascata). */
  const excluirVaga = useMutation({
    mutationFn: async (id: string) => {
      if (excluirVagaMock(id)) return;
      return recrutamentoService.excluirVaga(id, empresaAtual!.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vagas', empresaAtual?.id] });
      qc.invalidateQueries({ queryKey: ['candidaturas', empresaAtual?.id] });
      qc.invalidateQueries({ queryKey: ['candidaturas-todas', empresaAtual?.id] });
      setSelectedVagaId('all');
      toast.success('Vaga excluída!');
    },
    onError: () => toast.error('Não foi possível excluir a vaga.'),
  });

  const isLoading = loadVagas || loadCandidaturas || loadCandidatos || loadCandidaturasTodas;

  /**
   * Sugestões de departamento do assistente: os departamentos que as vagas da
   * empresa já usam. É o MESMO critério do filtro de departamento das outras
   * telas (`opcoesDepartamento`) — não há catálogo fixo no repositório.
   */
  const departamentosConhecidos = useMemo(() => opcoesDepartamento(vagas), [vagas]);

  // Kanban: respeita o filtro da vaga (query) + a busca do topo (client-side).
  // As habilidades vêm da vaga já carregada pela página (sem consulta nova).
  const candidaturasPipeline = useMemo(() => {
    const requisitosPorVaga = new Map(vagas.map((vaga) => [vaga.id, vaga.requisitos]));
    const enriquecidas = candidaturas.map((cand) => ({
      ...cand,
      vaga: cand.vaga
        ? { ...cand.vaga, requisitos: requisitosPorVaga.get(cand.vaga_id) ?? cand.vaga.requisitos ?? null }
        : cand.vaga,
    }));
    return filtrarCandidaturas(enriquecidas, busca);
  }, [candidaturas, vagas, busca]);

  return (
    // `reducedMotion` vem da FONTE ÚNICA (`src/lib/motionMode.ts`): em produção
    // é `'user'` (respeita a preferência de acessibilidade); no dev o modo
    // completo é forçado centralmente, em vez de um `"user"` literal local que
    // ignorava o override.
    <MotionConfig reducedMotion={MOTION_REDUCED_MODE}>
      <PageTitle title="Recrutamento" description="Gestão de talentos e processos seletivos" />
      <PageLayout
        title="Recrutamento & Seleção"
        description="Gestão de vagas, candidatos e pipeline"
        icon={<UserSearch className="h-5 w-5 text-primary-foreground" />}
        gradient="from-[hsl(var(--aqua))] to-[hsl(var(--info))]"
        actions={
          <div className="flex gap-2">
            {/* Único gatilho da criação: o assistente do cabeçalho (o grid de
                vagas aponta para cá no estado vazio). */}
            <Button
              type="button"
              onClick={() => setNovaVagaAberta(true)}
              className="h-10 gap-2 rounded-xl px-4 text-sm font-semibold shadow-none transition-transform hover:-translate-y-0.5 hover:shadow-none"
            >
              <Plus className="h-4 w-4" />
              Nova Vaga
            </Button>
          </div>
        }
      >
        {activeTab === 'pipeline' ? (
          <div
            data-pipeline-toolbar
            className="flex flex-col gap-2 rounded-2xl border border-border/50 bg-card/30 p-2 shadow-[inset_0_1px_0_hsl(var(--foreground)/0.03)] backdrop-blur-xs lg:flex-row lg:items-center"
          >
            <div className="relative min-w-0 lg:w-[400px] lg:flex-none">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                ref={buscaRef}
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
                placeholder="Buscar candidatos por nome, vaga, habilidade..."
                aria-label="Buscar candidatos"
                className="h-10 rounded-xl border-border/50 bg-background/60 pl-9 pr-20 text-[12px] placeholder:text-muted-foreground/70 focus-visible:ring-primary/40"
              />
              {busca ? (
                <button
                  type="button"
                  onClick={() => setBusca('')}
                  aria-label="Limpar busca"
                  className="absolute right-11 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
              <kbd className="pointer-events-none absolute right-2 top-1/2 hidden h-5 -translate-y-1/2 items-center rounded border border-border/60 bg-muted/40 px-1.5 text-[9px] font-medium text-muted-foreground sm:flex">
                ⌘K
              </kbd>
            </div>

            <div className="flex items-center gap-2 lg:ml-auto lg:shrink-0">
              <Filter className="hidden h-4 w-4 text-muted-foreground sm:block" aria-hidden />
              <Select value={selectedVagaId} onValueChange={setSelectedVagaId}>
                <SelectTrigger
                  aria-label="Filtrar por vaga"
                  className="h-10 w-full rounded-xl border-border/50 bg-background/60 text-[12px] lg:w-[210px]"
                >
                  <SelectValue placeholder="Todas as Vagas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Vagas</SelectItem>
                  {vagas.map((v: VagaRow) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.titulo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ) : null}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Tablist PADRONIZADA com a de Admissões — é o mesmo par de
            componentes, portanto a mesma altura, o mesmo raio, o mesmo fundo de
            container (`bg-muted/50 rounded-xl p-1 border border-border/30`), o
            mesmo trigger transparente com `text-primary` no estado ativo e o
            MESMO indicador deslizante (`rounded-lg bg-background shadow-xs`,
            mola `stiffness 220 / damping 24 / mass 0.7`). Quem pinta a aba ativa
            é o indicador, nunca o botão.

            O que NÃO existe mais aqui (era só desta área): a linha Lime de 2px
            no topo do trigger ativo (`<span>` absoluto), o fundo esverdeado
            `data-[state=active]:bg-primary/10`, a sombra interna Lime, o
            container `bg-card/35 p-1.5` e o `grid-cols-2 sm:grid-cols-4` — o
            layout agora é `flex w-full` com `flex-1` por aba, exatamente como em
            Admissões. Nada mais mudou: os quatro valores, os rótulos e os ícones
            (`LayoutGrid`, `Briefcase`, `Users`, `BarChart3`) continuam os de
            `TABS_PIPELINE`, e a navegação segue no `<Tabs>` do Radix acima.

            Mesma leitura responsiva da referência: `flex-1` ( = `flex: 1 1 0%` )
            mantém o `min-width: auto`, então em telas estreitas a aba para no
            tamanho natural do conteúdo em vez de cortar o rótulo, e o
            `overflow-x-auto` do container assume com scroll. */}
          <AnimatedTabsList value={activeTab} onValueChange={setActiveTab} listClassName="flex w-full items-stretch">
            {TABS_PIPELINE.map((tab) => {
              const Icone = tab.icone;
              return (
                <AnimatedTabsTrigger key={tab.value} value={tab.value} className="flex-1">
                  <Icone className="h-3.5 w-3.5" aria-hidden />
                  {tab.label}
                </AnimatedTabsTrigger>
              );
            })}
          </AnimatedTabsList>

          {/* ────────────────────────────────────────────────────────────────
              ENTRADA EM CASCATA DAS ABAS — e não `AnimatePresence mode="wait"`.

              `EntradaPresenca` é o `AnimatePresence` sem props:
               • dá à subárvore o contexto de presença com `initial` VERDADEIRO,
                 que o `initial={false}` do `PageTransition` bloqueava — sem ele
                 nenhum `motion.*` abaixo toca o keyframe `hidden` numa carga
                 direta da página e tudo nasce pronto (o mesmo bloqueio já
                 contornado em Admissões, Auditoria e Desligamentos);
               • NÃO renderiza DOM e NÃO anima nada por conta própria: quem
                 cascateia são os cards e os blocos de cada aba, cada um com o
                 seu índice.

              O `mode="wait"` que existia aqui foi REMOVIDO de propósito: ele
              segurava a montagem do conteúdo novo até o anterior terminar de
              sair, e o "anterior" era a página inteira (todos os cards do
              kanban com `exit`), então trocar de aba piscava/atrasava. Sem ele,
              a aba nova monta e cascateia na hora, e nada reanima por hover,
              refetch do react-query, resize ou re-render — a entrada é por
              montagem, com `animate` constante. */}
          <EntradaPresenca>
            {isLoading ? (
              <div className="flex justify-center py-20">
                <Spinner size="lg" />
              </div>
            ) : (
              <>
                {/* PIPELINE — board visual (5 etapas) */}
                <TabsContent value="pipeline" className="mt-5 sm:mt-6">
                  <PipelineBoard
                    candidaturas={candidaturasPipeline}
                    isActive={activeTab === 'pipeline'}
                    onAbrir={abrirDetalhes}
                    onMoverEtapa={moverEtapa}
                    onContatar={(cand) =>
                      simularAcaoRecrutamento(
                        `contato por e-mail com ${cand.candidato?.email || cand.candidato?.nome || 'o candidato'}`
                      )
                    }
                    onSimular={simularAcaoRecrutamento}
                  />
                </TabsContent>

                {/* VAGAS */}
                <TabsContent value="vagas" className="mt-4">
                  <VagasPainel
                    vagas={vagas}
                    candidaturas={candidaturasTodas}
                    onGerenciar={(vaga) => {
                      setSelectedVagaId(vaga.id);
                      setActiveTab('pipeline');
                    }}
                    onVerAnalises={() => setActiveTab('analytics')}
                    onExcluir={(vaga) => excluirVaga.mutate(vaga.id)}
                  />
                </TabsContent>
                {/* CANDIDATOS */}
                <TabsContent value="candidatos" className="mt-4">
                  <CandidatosPainel
                    candidaturas={candidaturasTodas}
                    vagas={vagas}
                    onVerPerfil={abrirDetalhes}
                    onMoverEtapa={moverEtapa}
                    erro={erroCandidaturasTodas}
                    onTentarNovamente={() => void recarregarCandidaturasTodas()}
                  />
                </TabsContent>

                {/* ANALYTICS — dashboard completo; toda a matemática e os
                    painéis vivem em `components/recrutamento/Analytics*`. A
                    página só entrega as listas que já carregou (sem consulta
                    nova e sem filtro do kanban). */}
                <TabsContent value="analytics" className="mt-4">
                  <AnalyticsRecrutamento candidaturas={candidaturasTodas} vagas={vagas} candidatos={candidatos} />
                </TabsContent>
              </>
            )}
          </EntradaPresenca>
        </Tabs>

        {/* Detalhes do Candidato — janela compacta em faixas. O componente
            concentra a apresentação; a página continua dona dos dados, do
            fechamento e de `avancarEtapa` (nenhuma regra de etapa é duplicada). */}
        <CandidatoDetalhesDialog
          open={detalhesAbertos}
          candidatura={selectedCandidatura}
          onClose={() => setDetalhesAbertos(false)}
          onAvancar={avancarEtapa}
        />

        {/* Anunciar Nova Vaga — assistente de 3 etapas. A página segue dona da
            escrita (`criarVaga`): o diálogo só monta o rascunho e devolve por
            `onPublicar`/`onSalvarRascunho`. */}
        <NovaVagaDialog
          open={novaVagaAberta}
          onOpenChange={setNovaVagaAberta}
          departamentos={departamentosConhecidos}
          salvando={criarVaga.isPending}
          onPublicar={(rascunho) => criarVaga.mutate({ rascunho, status: 'aberta' })}
          onSalvarRascunho={(rascunho) => criarVaga.mutate({ rascunho, status: 'rascunho' })}
        />
      </PageLayout>
    </MotionConfig>
  );
}
