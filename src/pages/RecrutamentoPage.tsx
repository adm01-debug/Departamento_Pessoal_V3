import { PageTitle } from '@/components/PageTitle';
import { PageLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { recrutamentoService } from '@/services/recrutamentoService';
import { useEmpresas } from '@/hooks';
import {
  UserSearch,
  Plus,
  Briefcase,
  Users,
  Filter,
  BarChart3,
  Mail,
  Phone,
  Clock,
  Search,
  X,
  LayoutGrid,
} from 'lucide-react';
import { motion, MotionConfig } from 'framer-motion';
import { MOTION_REDUCED_MODE } from '@/lib/motionMode';
import { Spinner } from '@/components/ui/spinner';
import { useState, useMemo, useEffect, useRef } from 'react';
import { toast } from 'sonner';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
// ENTRADA DE CARD — MESMO mecanismo do Dashboard Executivo (`cardVariants` de
// `components/dashboard/MetricCard.tsx`, empacotado aqui): fade + subida de
// 20px, 0.4s, ease `[0.25, 0.46, 0.45, 0.94]` e stagger de 0.08s por índice
// (teto no 9º item). Nenhum valor de animação é escrito nesta página: os cards
// usam `MotionCard`/`entradaCard(i)` e os blocos que NÃO são `Card` (card do
// kanban, cabeçalho de coluna, item da timeline) usam `motion.*` com o MESMO
// `{...entradaCard(i)}` — a cascata inteira sai de um único lugar.
import { EntradaPresenca, MotionCard, entradaCard } from '@/components/ui/entrada-cards';
import { CandidatoTimeline } from '@/components/recrutamento/CandidatoTimeline';
import { VagasPainel } from '@/components/recrutamento/VagasPainel';
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
  type NovaVagaMock,
} from '@/mocks/recrutamentoMock';
const TABS_PIPELINE = [
  { value: 'pipeline', label: 'Pipeline', icone: LayoutGrid },
  { value: 'vagas', label: 'Vagas', icone: Briefcase },
  { value: 'candidatos', label: 'Candidatos', icone: Users },
  { value: 'analytics', label: 'Analytics', icone: BarChart3 },
] as const;

/** Alturas (px) das barras do gráfico "Distribuição por Etapa". */
const ALTURA_MAX_BARRA = 120;
const ALTURA_MIN_BARRA = 12;

export default function RecrutamentoPage() {
  const { empresaAtual } = useEmpresas();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState('pipeline');
  const [selectedVagaId, setSelectedVagaId] = useState<string>('all');
  const [busca, setBusca] = useState('');
  const buscaRef = useRef<HTMLInputElement>(null);
  const [selectedCandidatura, setSelectedCandidatura] = useState<CandidaturaComRelacoes | null>(null);
  // "Nova Vaga": diálogo CONTROLADO (o card "Criar Nova Vaga" do grid abre o
  // mesmo diálogo do cabeçalho) + campos do formulário.
  const [novaVagaAberta, setNovaVagaAberta] = useState(false);
  const [formVaga, setFormVaga] = useState<NovaVagaMock>({
    titulo: '',
    departamento: '',
    modalidade: '',
    quantidade: 1,
    requisitos: '',
  });

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
  const { data: candidaturasTodas = [], isLoading: loadCandidaturasTodas } = useQuery<CandidaturaComRelacoes[]>({
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

  /** Publica a vaga do diálogo "Nova Vaga" (mock em memória ou Supabase). */
  const publicarVaga = useMutation({
    mutationFn: async (dados: NovaVagaMock) => {
      const daDemo = publicarVagaMock(dados);
      return daDemo ?? recrutamentoService.criarVaga({ ...dados, empresa_id: empresaAtual!.id });
    },
    onSuccess: (vaga) => {
      qc.invalidateQueries({ queryKey: ['vagas', empresaAtual?.id] });
      setNovaVagaAberta(false);
      setFormVaga({ titulo: '', departamento: '', modalidade: '', quantidade: 1, requisitos: '' });
      toast.success(`Vaga "${vaga?.titulo ?? 'nova'}" publicada!`);
    },
    onError: () => toast.error('Não foi possível publicar a vaga.'),
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
   * Contagem por etapa do funil — fonte única do kanban, do estado vazio de cada
   * coluna e do gráfico "Distribuição por Etapa" (as três filtravam a mesma
   * lista de novo, várias vezes por render).
   */
  const contarPorEtapa = (lista: CandidaturaComRelacoes[]) => {
    const base: Record<string, number> = Object.fromEntries(ETAPAS.map((e) => [e.id, 0]));
    for (const c of lista) {
      const etapa = c.etapa || 'triagem';
      base[etapa] = (base[etapa] ?? 0) + 1;
    }
    return base;
  };
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
  // Analytics/gráfico: processo inteiro, sem o filtro do kanban.
  const contagemPorEtapaTotal = useMemo(() => contarPorEtapa(candidaturasTodas), [candidaturasTodas]);

  const contratados = contagemPorEtapaTotal.contratado ?? 0;
  // KPI das Analytics derivado das próprias linhas (mock em demonstração, banco
  // fora dele) — antes era um "4.2%" chumbado na tela.
  const taxaConversao =
    candidaturasTodas.length > 0 ? ((contratados / candidaturasTodas.length) * 100).toFixed(1) : '0.0';

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
            {/* Diálogo CONTROLADO: o card "Criar Nova Vaga" do grid abre este
                mesmo diálogo — um só formulário para as duas entradas. */}
            <Dialog open={novaVagaAberta} onOpenChange={setNovaVagaAberta}>
              <DialogTrigger asChild>
                <Button className="h-10 gap-2 rounded-xl px-4 text-sm font-semibold shadow-none transition-transform hover:-translate-y-0.5 hover:shadow-none">
                  <Plus className="h-4 w-4" />
                  Nova Vaga
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Anunciar Nova Vaga</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div className="grid gap-1">
                    <Label>Título da Vaga</Label>
                    <Input
                      placeholder="Ex: Desenvolvedor Senior"
                      value={formVaga.titulo}
                      onChange={(e) => setFormVaga({ ...formVaga, titulo: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label>Departamento</Label>
                    <Input
                      placeholder="Ex: Tecnologia"
                      value={formVaga.departamento}
                      onChange={(e) => setFormVaga({ ...formVaga, departamento: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label>Modalidade</Label>
                    <Input
                      placeholder="Remoto, Híbrido, Presencial"
                      value={formVaga.modalidade}
                      onChange={(e) => setFormVaga({ ...formVaga, modalidade: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label>Quantidade</Label>
                    <Input
                      type="number"
                      value={formVaga.quantidade}
                      onChange={(e) => setFormVaga({ ...formVaga, quantidade: Number(e.target.value) })}
                    />
                  </div>
                  <div className="grid gap-1 col-span-2">
                    <Label>Requisitos (separados por vírgula)</Label>
                    <Input
                      placeholder="React, TypeScript, Node.js..."
                      value={formVaga.requisitos}
                      onChange={(e) => setFormVaga({ ...formVaga, requisitos: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2 flex justify-end pt-1">
                    <Button
                      size="sm"
                      className="rounded-lg px-4"
                      disabled={!formVaga.titulo.trim() || publicarVaga.isPending}
                      onClick={() => publicarVaga.mutate(formVaga)}
                    >
                      Publicar Vaga
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
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
          <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-xl border border-border/50 bg-card/35 p-1.5 sm:grid-cols-4">
            {TABS_PIPELINE.map((tab) => {
              const Icone = tab.icone;
              return (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="relative flex h-10 items-center justify-center gap-2 rounded-lg px-3 text-[12px] font-medium text-muted-foreground transition-all hover:bg-muted/40 hover:text-foreground data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-[inset_0_1px_0_hsl(var(--primary)/0.18)]"
                >
                  <Icone className="h-4 w-4 shrink-0" aria-hidden />
                  {tab.label}
                  {activeTab === tab.value ? (
                    <span aria-hidden className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-primary" />
                  ) : null}
                </TabsTrigger>
              );
            })}
          </TabsList>

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
                    onAbrir={setSelectedCandidatura}
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
                <TabsContent value="candidatos" className="mt-0">
                  <Card className="rounded-3xl border-border/40 overflow-hidden shadow-xs">
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-muted/30 border-b">
                              <th className="px-6 py-4 text-left font-medium text-[11px] uppercase tracking-wider text-muted-foreground">
                                Candidato
                              </th>
                              <th className="px-6 py-4 text-left font-medium text-[11px] uppercase tracking-wider text-muted-foreground">
                                Contato
                              </th>
                              <th className="px-6 py-4 text-left font-medium text-[11px] uppercase tracking-wider text-muted-foreground">
                                Experiência
                              </th>
                              <th className="px-6 py-4 text-left font-medium text-[11px] uppercase tracking-wider text-muted-foreground">
                                Pretensão
                              </th>
                              <th className="px-6 py-4 text-right font-medium text-[11px] uppercase tracking-wider text-muted-foreground">
                                Ações
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/30">
                            {candidatos.map((cand: CandidatoRow) => (
                              <tr key={cand.id} className="hover:bg-primary/[0.02] transition-colors group">
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                    <div className="h-9 w-9 rounded-xl bg-primary/5 flex items-center justify-center text-primary font-medium">
                                      {cand.nome?.charAt(0)}
                                    </div>
                                    <div>
                                      <p className="font-medium text-sm text-foreground">{cand.nome}</p>
                                      <p className="text-[10px] text-muted-foreground">{cand.origem || 'Website'}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex flex-col gap-0.5">
                                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                      <Mail className="h-3 w-3" /> {cand.email}
                                    </span>
                                    {cand.telefone && (
                                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                        <Phone className="h-3 w-3" /> {cand.telefone}
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <Badge variant="secondary" className="rounded-lg bg-slate-100 font-medium">
                                    {cand.experiencia_anos} anos
                                  </Badge>
                                </td>
                                <td className="px-6 py-4 font-display font-medium text-success">
                                  {cand.pretensao_salarial
                                    ? `R$ ${cand.pretensao_salarial.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                                    : 'N/D'}
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label="Adicionar"
                                    className="rounded-xl hover:bg-primary/10 text-primary opacity-0 group-hover:opacity-100 transition-all"
                                    onClick={() => simularAcaoRecrutamento(`inclusão de ${cand.nome} em outra vaga`)}
                                  >
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* ANALYTICS */}
                <TabsContent value="analytics" className="mt-0">
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
                    {/* RESUMO/KPI DA ABA — `MotionCard` com o índice do mapa, mesma
                        cascata do Dashboard Executivo (os KPI dele são exatamente
                        isto: `cardVariants` com `custom={i}`). Antes estes quatro
                        cards apareciam prontos, sem nenhuma entrada. */}
                    {[
                      {
                        label: 'Vagas Abertas',
                        value: vagas.filter((v: VagaRow) => v.status === 'aberta').length,
                        icon: Briefcase,
                        color: 'text-success',
                      },
                      { label: 'Total Candidatos', value: candidatos.length, icon: Users, color: 'text-info' },
                      {
                        label: 'Processos Ativos',
                        value: candidaturasTodas.length,
                        icon: UserSearch,
                        color: 'text-primary',
                      },
                      {
                        label: 'Taxa de Conversão',
                        value: `${taxaConversao}%`,
                        icon: BarChart3,
                        color: 'text-warning',
                      },
                    ].map((stat, i) => (
                      <MotionCard key={i} {...entradaCard(i)} className="rounded-2xl border-border/40 shadow-xs">
                        <CardContent className="p-6 flex items-center gap-4">
                          <div
                            className={cn(
                              'h-12 w-12 rounded-xl bg-muted/30 flex items-center justify-center',
                              stat.color
                            )}
                          >
                            <stat.icon className="h-6 w-6" />
                          </div>
                          <div>
                            <p className="text-[10px] uppercase font-medium text-muted-foreground tracking-widest">
                              {stat.label}
                            </p>
                            <p className="text-2xl font-display font-medium">{stat.value}</p>
                          </div>
                        </CardContent>
                      </MotionCard>
                    ))}
                  </div>

                  {/* Card do gráfico — entra como o 5º item da aba (depois dos 4
                      KPI), fechando a MESMA cascata. As barras continuam
                      estáticas (só a cor muda no hover): o gráfico entra como um
                      card, não como uma segunda animação de dados. */}
                  <MotionCard {...entradaCard(4)} className="rounded-3xl border-border/40 overflow-hidden shadow-xs">
                    <CardHeader className="pb-0">
                      <CardTitle className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
                        Distribuição por Etapa
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-end gap-2 px-8 pb-8 pt-4">
                      {ETAPAS.map((e) => {
                        const count = contagemPorEtapaTotal[e.id] ?? 0;
                        // Altura em PIXELS: com `height: %` dentro de um pai de
                        // altura automática a barra resolvia para 0px (gráfico vazio).
                        const altura = (count / (candidaturasTodas.length || 1)) * ALTURA_MAX_BARRA + ALTURA_MIN_BARRA;
                        return (
                          <div key={e.id} className="flex-1 flex flex-col items-center justify-end gap-2">
                            <div
                              className={cn(
                                'w-full rounded-t-lg transition-all duration-500 bg-primary/20 hover:bg-primary/40'
                              )}
                              style={{ height: `${altura}px` }}
                            />
                            <span className="text-[10px] uppercase font-medium opacity-60">{e.label}</span>
                          </div>
                        );
                      })}
                    </CardContent>
                  </MotionCard>
                </TabsContent>
              </>
            )}
          </EntradaPresenca>
        </Tabs>

        {/* Detalhes do Candidato */}
        <Dialog
          open={!!selectedCandidatura}
          onOpenChange={(o) => {
            if (!o) setSelectedCandidatura(null);
          }}
        >
          <DialogContent className="max-w-2xl rounded-3xl h-[85vh] flex flex-col p-0 overflow-hidden border-none shadow-elevated">
            {selectedCandidatura && (
              <>
                <DialogHeader className="p-5 border-b bg-muted/20">
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-medium text-xl">
                      {selectedCandidatura.candidato?.nome?.charAt(0)}
                    </div>
                    <div>
                      <DialogTitle className="font-display">{selectedCandidatura.candidato?.nome}</DialogTitle>
                      <p className="text-sm text-muted-foreground font-medium">
                        {selectedCandidatura.vaga?.titulo} • {selectedCandidatura.vaga?.departamento}
                      </p>
                    </div>
                  </div>
                </DialogHeader>
                {/* CORPO DO DOSSIÊ — `EntradaPresenca` (sem DOM) para que os
                    blocos de conteúdo cascateiem quando a janela abre, com o
                    mesmo `entradaCard` do resto do módulo: contato (0), status
                    (1) e, em seguida, os itens da timeline dentro do
                    `CandidatoTimeline`. A moldura da janela continua com a
                    animação de entrada do próprio diálogo do design system —
                    aqui só o conteúdo entra em cascata, sem segunda animação no
                    container. */}
                <EntradaPresenca>
                  <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
                    <div className="grid grid-cols-2 gap-4">
                      <MotionCard {...entradaCard(0)} className="border-border/40 bg-muted/10 shadow-none">
                        <CardContent className="p-4 flex flex-col gap-1">
                          <span className="text-[10px] uppercase font-medium text-muted-foreground tracking-widest">
                            Contato
                          </span>
                          <p className="text-sm flex items-center gap-2">
                            <Mail className="h-3.5 w-3.5" /> {selectedCandidatura.candidato?.email}
                          </p>
                          <p className="text-sm flex items-center gap-2">
                            <Phone className="h-3.5 w-3.5" /> {selectedCandidatura.candidato?.telefone || 'N/A'}
                          </p>
                        </CardContent>
                      </MotionCard>
                      <MotionCard {...entradaCard(1)} className="border-border/40 bg-muted/10 shadow-none">
                        <CardContent className="p-4 flex flex-col gap-1">
                          <span className="text-[10px] uppercase font-medium text-muted-foreground tracking-widest">
                            Status Atual
                          </span>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className="rounded-lg px-2 bg-primary/10 text-primary border-primary/20 capitalize font-medium">
                              {ETAPAS.find((e) => e.id === (selectedCandidatura.etapa || 'triagem'))?.label}
                            </Badge>
                            <span className="text-xs text-muted-foreground font-medium">
                              Score: {selectedCandidatura.nota_geral || 'N/D'}
                            </span>
                          </div>
                        </CardContent>
                      </MotionCard>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
                        <Clock className="h-4 w-4 text-primary" /> Timeline do Processo Seletivo
                      </h3>
                      <CandidatoTimeline candidaturaId={selectedCandidatura.id} />
                    </div>
                  </div>
                </EntradaPresenca>
                <div className="p-5 border-t bg-muted/10 flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-lg font-medium"
                    onClick={() => setSelectedCandidatura(null)}
                  >
                    Fechar Janela
                  </Button>
                  <Button size="sm" className="rounded-lg font-medium" onClick={avancarEtapa}>
                    Avançar para Próxima Etapa
                  </Button>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </PageLayout>
    </MotionConfig>
  );
}
