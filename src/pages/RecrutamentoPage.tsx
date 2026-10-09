import { PageTitle } from '@/components/PageTitle';
import { PageLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { recrutamentoService } from '@/services/recrutamentoService';
import { useEmpresas } from '@/hooks';
import { UserSearch, Plus, Briefcase, Users, Filter, BarChart3, ChevronRight, Mail, Phone, Calendar, Star, Trash2, Clock } from 'lucide-react';
import { motion, MotionConfig } from 'framer-motion';
import { MOTION_REDUCED_MODE } from '@/lib/motionMode';
import { Spinner } from '@/components/ui/spinner';
import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
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
const ETAPAS = [
  { id: 'triagem', label: 'Triagem', color: 'bg-slate-100 border-slate-200' },
  { id: 'entrevista', label: 'Entrevista', color: 'bg-blue-50 border-blue-200' },
  { id: 'teste', label: 'Teste Técnico', color: 'bg-purple-50 border-purple-200' },
  { id: 'proposta', label: 'Proposta', color: 'bg-warning-foreground/10 border-warning' },
  { id: 'contratado', label: 'Contratado', color: 'bg-success-foreground/10 border-success' },
];

/** Alturas (px) das barras do gráfico "Distribuição por Etapa". */
const ALTURA_MAX_BARRA = 120;
const ALTURA_MIN_BARRA = 12;

export default function RecrutamentoPage() {
  const { empresaAtual } = useEmpresas();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState('pipeline');
  const [selectedVagaId, setSelectedVagaId] = useState<string>('all');
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

  // MOCK VISUAL — ver src/mocks/recrutamentoMock.ts. Com o mock ligado, cada
  // leitura curto-circuita o Supabase e `enabled` também vale sem empresa ativa.
  const mockAtivo = isRecrutamentoMockEnabled();
  const { data: vagas = [], isLoading: loadVagas } = useQuery<VagaRow[]>({
    queryKey: ['vagas', empresaAtual?.id],
    queryFn: async () => (getMockVagas() as VagaRow[] | undefined) ?? recrutamentoService.listarVagas(empresaAtual!.id),
    enabled: !!empresaAtual?.id || mockAtivo
  });

  const { data: candidaturas = [], isLoading: loadCandidaturas } = useQuery<CandidaturaComRelacoes[]>({
    queryKey: ['candidaturas', empresaAtual?.id, selectedVagaId],
    queryFn: async () => (getMockCandidaturas(selectedVagaId === 'all' ? undefined : selectedVagaId) as CandidaturaComRelacoes[] | undefined) ?? recrutamentoService.listarCandidaturas(empresaAtual!.id, selectedVagaId === 'all' ? undefined : selectedVagaId),
    enabled: !!empresaAtual?.id || mockAtivo
  });

  const { data: candidatos = [], isLoading: loadCandidatos } = useQuery<CandidatoRow[]>({
    queryKey: ['candidatos', empresaAtual?.id],
    queryFn: async () => (getMockCandidatos() as CandidatoRow[] | undefined) ?? recrutamentoService.listarCandidatos(empresaAtual!.id),
    enabled: !!empresaAtual?.id || mockAtivo
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
    queryFn: async () => (getMockCandidaturas() as CandidaturaComRelacoes[] | undefined) ?? recrutamentoService.listarCandidaturas(empresaAtual!.id),
    enabled: !!empresaAtual?.id || mockAtivo
  });

  // MOCK VISUAL: com o mock ligado a etapa muda no store em memória
  // (`moverCandidaturaMock`) e nada vai ao Supabase — os ids são fictícios.
  const updateEtapa = useMutation({
    mutationFn: async ({ id, etapa }: { id: string, etapa: string }) => {
      const daDemo = moverCandidaturaMock(id, etapa);
      return daDemo ?? recrutamentoService.atualizarCandidatura(id, { etapa }, empresaAtual!.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['candidaturas', empresaAtual?.id] });
      qc.invalidateQueries({ queryKey: ['candidaturas-todas', empresaAtual?.id] });
      toast.success('Etapa atualizada!');
    }
  });

  /**
   * Move a candidatura pelo seletor do card do kanban. No modo demonstração a
   * escrita acontece no store do mock (nada de rede); fora dele vai para o
   * Supabase como sempre. Se o dossiê dela estiver aberto, o estado local
   * acompanha na hora.
   */
  const moverEtapa = (id: string, etapa: string) => {
    updateEtapa.mutate({ id, etapa });
    if (selectedCandidatura?.id === id) setSelectedCandidatura({ ...selectedCandidatura, etapa });
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
  // Kanban: respeita o filtro do topo (é o filtro DELE).
  const contagemPorEtapa = useMemo(() => contarPorEtapa(candidaturas), [candidaturas]);
  // Analytics/gráfico: processo inteiro, sem o filtro do kanban.
  const contagemPorEtapaTotal = useMemo(() => contarPorEtapa(candidaturasTodas), [candidaturasTodas]);

  /** Candidaturas por vaga — número exibido no rodapé do card da vaga. */
  const contagemPorVaga = useMemo(() => {
    const base: Record<string, number> = {};
    for (const c of candidaturasTodas) base[c.vaga_id] = (base[c.vaga_id] ?? 0) + 1;
    return base;
  }, [candidaturasTodas]);

  const contratados = contagemPorEtapaTotal.contratado ?? 0;
  // KPI das Analytics derivado das próprias linhas (mock em demonstração, banco
  // fora dele) — antes era um "4.2%" chumbado na tela.
  const taxaConversao = candidaturasTodas.length > 0 ? ((contratados / candidaturasTodas.length) * 100).toFixed(1) : '0.0';

  /**
   * ORDEM DA CASCATA DO KANBAN — quem recebe qual índice na entrada de referência.
   *
   * O kanban é a única área da página em que "a ordem em que os elementos
   * aparecem" não é a ordem do DOM de um `map` só: são 5 colunas, cada uma com
   * um cabeçalho e N cards. O contador corre NA ORDEM DE LEITURA (cabeçalho da
   * coluna 1 → cards da coluna 1 → cabeçalho da coluna 2 → …), então a cascata
   * anda da esquerda para a direita e de cima para baixo, como um texto. É o
   * MESMO índice que `entradaCard` capa no 9º item (`MAX_ENTRADA_INDEX`): sem o
   * teto, 12 candidaturas + 5 cabeçalhos levariam mais de 1,3s para terminar de
   * entrar e o kanban só ficaria utilizável no fim.
   *
   * Nada de animação é calculado aqui: só os índices. Os valores continuam
   * vindo de `entradaCard` (fonte única, a mesma do Dashboard Executivo).
   * `candidaturas` já é a lista filtrada pelo seletor do topo — este memo não
   * filtra nada de novo, apenas reparte o que a tela já mostrava.
   */
  const kanbanPorEtapa = useMemo(() => {
    let indice = 0;
    return ETAPAS.map((etapa) => {
      const coluna = candidaturas.filter((c: CandidaturaComRelacoes) => (c.etapa || 'triagem') === etapa.id);
      const indiceCabecalho = indice++;
      const cards = coluna.map((cand: CandidaturaComRelacoes) => ({ cand, indice: indice++ }));
      return { etapa, coluna, indiceCabecalho, cards };
    });
  }, [candidaturas]);

  return (
    // `reducedMotion` vem da FONTE ÚNICA (`src/lib/motionMode.ts`): em produção
    // é `'user'` (respeita a preferência de acessibilidade); no dev o modo
    // completo é forçado centralmente, em vez de um `"user"` literal local que
    // ignorava o override.
    <MotionConfig reducedMotion={MOTION_REDUCED_MODE}>
      <PageTitle title="Recrutamento" description="Gestão de talentos e processos seletivos" />
      <PageLayout
        title="Recrutamento & Seleção"
        description="Gestão de vagas, candidatos e pipeline 10/10"
        icon={<UserSearch className="h-5 w-5 text-primary-foreground" />}
        gradient="from-success to-info"
        actions={
          <div className="flex gap-2">
            {/* Diálogo CONTROLADO: o card "Criar Nova Vaga" do grid abre este
                mesmo diálogo — um só formulário para as duas entradas. */}
            <Dialog open={novaVagaAberta} onOpenChange={setNovaVagaAberta}>
              <DialogTrigger asChild>
                <Button className="rounded-xl shadow-lg"><Plus className="h-4 w-4 mr-2" />Nova Vaga</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Anunciar Nova Vaga</DialogTitle></DialogHeader>
                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div className="grid gap-1"><Label>Título da Vaga</Label><Input placeholder="Ex: Desenvolvedor Senior" value={formVaga.titulo} onChange={(e) => setFormVaga({ ...formVaga, titulo: e.target.value })} /></div>
                  <div className="grid gap-1"><Label>Departamento</Label><Input placeholder="Ex: Tecnologia" value={formVaga.departamento} onChange={(e) => setFormVaga({ ...formVaga, departamento: e.target.value })} /></div>
                  <div className="grid gap-1"><Label>Modalidade</Label><Input placeholder="Remoto, Híbrido, Presencial" value={formVaga.modalidade} onChange={(e) => setFormVaga({ ...formVaga, modalidade: e.target.value })} /></div>
                  <div className="grid gap-1"><Label>Quantidade</Label><Input type="number" value={formVaga.quantidade} onChange={(e) => setFormVaga({ ...formVaga, quantidade: Number(e.target.value) })} /></div>
                  <div className="grid gap-1 col-span-2"><Label>Requisitos (separados por vírgula)</Label><Input placeholder="React, TypeScript, Node.js..." value={formVaga.requisitos} onChange={(e) => setFormVaga({ ...formVaga, requisitos: e.target.value })} /></div>
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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <TabsList className="bg-muted/50 p-1 rounded-xl">
              <TabsTrigger value="pipeline" className="rounded-lg">Pipeline</TabsTrigger>
              <TabsTrigger value="vagas" className="rounded-lg">Vagas</TabsTrigger>
              <TabsTrigger value="candidatos" className="rounded-lg">Candidatos</TabsTrigger>
              <TabsTrigger value="analytics" className="rounded-lg">Analytics</TabsTrigger>
            </TabsList>

            {activeTab === 'pipeline' && (
              <div className="flex items-center gap-2 w-full md:w-64">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={selectedVagaId} onValueChange={setSelectedVagaId}>
                  <SelectTrigger className="rounded-xl"><SelectValue placeholder="Filtrar por Vaga" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as Vagas</SelectItem>
                    {vagas.map((v: VagaRow) => <SelectItem key={v.id} value={v.id}>{v.titulo}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

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
              <div className="flex justify-center py-20"><Spinner size="lg" /></div>
            ) : (
              <>
                {/* PIPELINE KANBAN */}
                <TabsContent value="pipeline" className="mt-0">
                  <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar min-h-[600px] select-none">
                    {kanbanPorEtapa.map(({ etapa, coluna, indiceCabecalho, cards }) => (
                      <div key={etapa.id} className="shrink-0 w-72 flex flex-col gap-3">
                        {/* CABEÇALHO DA COLUNA — mesma entrada dos cards, com o
                            índice que ele ocupa na ordem de leitura
                            (`indiceCabecalho`, ver `kanbanPorEtapa`). A moldura
                            da coluna (a "lane" tracejada logo abaixo) NÃO
                            anima: ela é a superfície, e animar superfície +
                            filhos empilharia dois movimentos no mesmo eixo. */}
                        <motion.div {...entradaCard(indiceCabecalho)} className="flex items-center justify-between px-2">
                          <h3 className="font-display font-semibold text-sm flex items-center gap-2">
                            {etapa.label}
                            <Badge variant="secondary" className="rounded-full h-5 px-1.5 text-[10px] bg-muted/80">
                              {contagemPorEtapa[etapa.id] ?? 0}
                            </Badge>
                          </h3>
                        </motion.div>
                        
                        <div className={cn("flex-1 rounded-2xl border-2 border-dashed p-3 space-y-3 transition-colors duration-300", etapa.color)}>
                          {/* ENTRADA DO CARD DO KANBAN — o MESMO `entradaCard` dos
                              KPI do Dashboard Executivo (fade + subida de 20px,
                              0.4s, ease da casa, 0.08s por índice). O
                              `motion.div` continua sendo o próprio card: nenhum
                              wrapper novo no DOM, nenhuma classe nova.

                              O que saiu daqui e por quê:
                               • `initial`/`animate`/`exit` escritos à mão, com
                                 os `transition` PADRÃO do Framer: os cards do
                                 board entravam TODOS ao mesmo tempo, com um
                                 movimento (spring) que não existe em nenhum
                                 outro módulo — a linguagem divergia da
                                 referência;
                               • `exit={{ opacity: 0, scale: 0.95 }}`: sem um
                                 `AnimatePresence` em volta da lista ele nunca
                                 chegava a tocar; era config morta;
                               • `layoutId={cand.id}`: ligava o "shared layout"
                                 do Framer entre card de uma coluna e o mesmo
                                 card na coluna seguinte. Como o id desmonta
                                 numa coluna e monta na outra (mover etapa) e
                                 remonta ao trocar o filtro do topo, o Framer
                                 animava o card PARTINDO da posição antiga —
                                 eram os saltos/voo de card entre colunas. O
                                 movimento entre etapas segue visível para o
                                 usuário (o card sai de uma coluna e entra na
                                 outra já com a cascata) e nesta tela não existe
                                 arraste: a etapa muda pelo seletor do card. */}
                          {cards.map(({ cand, indice }) => (
                              <motion.div
                                key={cand.id}
                                {...entradaCard(indice)}
                                className="bg-white p-4 rounded-xl shadow-xs border border-border/40 hover:shadow-md hover:border-primary/20 transition-all cursor-pointer group relative"
                                onClick={() => setSelectedCandidatura(cand)}
                              >
                                <div className="flex justify-between items-start mb-2">
                                  <div>
                                    <h4 className="font-semibold text-sm truncate max-w-[180px]">{cand.candidato?.nome}</h4>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">{cand.vaga?.titulo}</p>
                                  </div>
                                  <Badge variant="outline" className="text-[9px] h-4 px-1 bg-muted/30">{cand.candidato?.origem || 'Direto'}</Badge>
                                </div>
                                
                                <div className="flex items-center gap-3 text-[10px] text-muted-foreground mb-4">
                                  <span className="flex items-center gap-1">
                                    <Star className={cn("h-3 w-3", (cand.nota_geral || 0) > 0 ? "text-warning fill-warning" : "text-slate-300")} /> 
                                    {cand.nota_geral || 'S/N'}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" /> 
                                    {new Date(cand.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                                  </span>
                                </div>

                                <div className="flex items-center justify-between">
                                  <div className="flex -space-x-2">
                                    <div className="h-6 w-6 rounded-full bg-primary/10 border-2 border-white flex items-center justify-center text-[10px] font-medium text-primary">
                                      {cand.candidato?.nome?.charAt(0)}
                                    </div>
                                  </div>
                                  
                                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 rounded-lg hover:bg-blue-50 hover:text-blue-600"
                                      aria-label="Contatar candidato"
                                      onClick={() => simularAcaoRecrutamento(`contato por e-mail com ${cand.candidato?.email || cand.candidato?.nome || 'o candidato'}`)}
                                    >
                                      <Mail className="h-3.5 w-3.5" />
                                    </Button>
                                    <Select 
                                      onValueChange={(val) => moverEtapa(cand.id, val)}
                                      defaultValue={etapa.id}
                                    >
                                      <SelectTrigger className="h-7 text-[9px] w-28 rounded-lg border-primary/20 bg-primary/5">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {ETAPAS.map(e => <SelectItem key={e.id} value={e.id}>{e.label}</SelectItem>)}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                              </motion.div>
                          ))}
                          {/* Estado vazio: mesma leitura de antes (coluna sem
                              candidaturas), agora pela lista que o próprio
                              `kanbanPorEtapa` já repartiu — sem um segundo
                              `filter` por coluna no render. O bloco é estático
                              de propósito: é um aviso de ausência, não conteúdo
                              que entra. */}
                          {coluna.length === 0 && (
                            <div className="h-32 flex flex-col items-center justify-center border border-dashed rounded-xl opacity-20 gap-2">
                              <Users className="h-6 w-6" />
                              <span className="text-xs font-medium">Sem candidatos</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                {/* VAGAS */}
                <TabsContent value="vagas" className="mt-0">
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {/* ENTRADA DAS VAGAS — `MotionCard` (o próprio `Card` do design
                        system animado, não um wrapper) com o índice do mapa, que é
                        literalmente o MESMO `index` que o Dashboard Executivo passa
                        aos seus KPI (`MetricCard` + `cardVariants`): os cards entram
                        um depois do outro na ordem do grid, e o botão "Criar Nova
                        Vaga" fecha a onda (é o último item da grade, então recebe o
                        índice seguinte). Hover/troca de filtro/refetch não reiniciam
                        nada — a entrada é por montagem. */}
                    {vagas.map((vaga: VagaRow, i: number) => (
                      <MotionCard key={vaga.id} {...entradaCard(i)} className="rounded-2xl border-border/40 hover:border-primary/30 hover:shadow-xl transition-all group overflow-hidden bg-card/50 backdrop-blur-xs">
                        <CardHeader className="pb-3">
                          <div className="flex justify-between items-start mb-2">
                            <Badge 
                              className={cn(
                                "rounded-lg px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider",
                                vaga.status === 'aberta' ? "bg-success/10 text-success border-success/20" : "bg-muted text-muted-foreground"
                              )}
                            >
                              {vaga.status}
                            </Badge>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/5" aria-label="Ver análises" onClick={() => setActiveTab('analytics')}><BarChart3 className="h-4 w-4" /></Button>
                              {/* Exclusão com confirmação: no modo demonstração a
                                  vaga (e as candidaturas dela) sai do store do mock. */}
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/5" aria-label="Excluir vaga"><Trash2 className="h-4 w-4" /></Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Excluir "{vaga.titulo}"?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      A vaga sai da listagem junto com as candidaturas vinculadas a ela. As demais vagas e candidatos não são afetados.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => excluirVaga.mutate(vaga.id)}>Excluir vaga</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                          <CardTitle className="text-xl font-display font-medium leading-tight group-hover:text-primary transition-colors">{vaga.titulo}</CardTitle>
                          <CardDescription className="flex items-center gap-2 text-xs font-medium mt-1">
                            <Briefcase className="h-3 w-3" /> {vaga.departamento} 
                            <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                            {vaga.modalidade}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div className="flex flex-wrap gap-1.5">
                              {(vaga.requisitos ?? '').split(',').filter(Boolean).slice(0, 3).map((req: string, i: number) => (
                                <Badge key={i} variant="secondary" className="text-[9px] bg-slate-100/50 text-slate-600 font-normal">{req.trim()}</Badge>
                              ))}
                              {(vaga.requisitos ?? '').split(',').filter(Boolean).length > 3 && (
                                <Badge variant="secondary" className="text-[9px] bg-slate-100/50 text-slate-600 font-normal">+{(vaga.requisitos ?? '').split(',').filter(Boolean).length - 3}</Badge>
                              )}
                            </div>

                            <div className="pt-4 border-t border-border/40 flex items-center justify-between">
                              <div className="flex flex-col">
                                <span className="text-[10px] text-muted-foreground uppercase font-medium tracking-wide">Candidatos</span>
                                <span className="text-lg font-display font-medium text-primary">
                                  {contagemPorVaga[vaga.id] ?? 0}
                                </span>
                              </div>
                              <Button
                                className="rounded-xl h-9 px-4 text-xs font-medium shadow-xs group-hover:shadow-md transition-all"
                                onClick={() => { setSelectedVagaId(vaga.id); setActiveTab('pipeline'); }}
                              >
                                Gerenciar Vaga
                                <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </MotionCard>
                    ))}
                    {/* "Criar Nova Vaga" fecha a MESMA onda dos cards (é o último
                        item do grid): `motion.button` com o índice seguinte, em vez
                        do `<button>` cru que aparecia pronto no meio de cards que
                        entravam em cascata — era o único salto visual da aba. */}
                    <motion.button
                      {...entradaCard(vagas.length)}
                      className="border-2 border-dashed border-border/60 rounded-3xl p-8 flex flex-col items-center justify-center gap-3 hover:border-primary/40 hover:bg-primary/5 transition-all group min-h-[250px]"
                      onClick={() => setNovaVagaAberta(true)}
                    >
                      <div className="h-12 w-12 rounded-2xl bg-muted group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                        <Plus className="h-6 w-6 text-muted-foreground group-hover:text-primary" />
                      </div>
                      <div className="text-center">
                        <p className="font-medium text-sm">Criar Nova Vaga</p>
                        <p className="text-xs text-muted-foreground">Inicie um novo processo seletivo</p>
                      </div>
                    </motion.button>
                  </div>
                </TabsContent>

                {/* CANDIDATOS */}
                <TabsContent value="candidatos" className="mt-0">
                   <Card className="rounded-3xl border-border/40 overflow-hidden shadow-xs">
                     <CardContent className="p-0">
                       <div className="overflow-x-auto">
                         <table className="w-full text-sm">
                           <thead>
                             <tr className="bg-muted/30 border-b">
                               <th className="px-6 py-4 text-left font-medium text-[11px] uppercase tracking-wider text-muted-foreground">Candidato</th>
                               <th className="px-6 py-4 text-left font-medium text-[11px] uppercase tracking-wider text-muted-foreground">Contato</th>
                               <th className="px-6 py-4 text-left font-medium text-[11px] uppercase tracking-wider text-muted-foreground">Experiência</th>
                               <th className="px-6 py-4 text-left font-medium text-[11px] uppercase tracking-wider text-muted-foreground">Pretensão</th>
                               <th className="px-6 py-4 text-right font-medium text-[11px] uppercase tracking-wider text-muted-foreground">Ações</th>
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
                                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><Mail className="h-3 w-3" /> {cand.email}</span>
                                      {cand.telefone && <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><Phone className="h-3 w-3" /> {cand.telefone}</span>}
                                   </div>
                                 </td>
                                 <td className="px-6 py-4">
                                   <Badge variant="secondary" className="rounded-lg bg-slate-100 font-medium">{cand.experiencia_anos} anos</Badge>
                                 </td>
                                 <td className="px-6 py-4 font-display font-medium text-success">
                                   {cand.pretensao_salarial ? `R$ ${cand.pretensao_salarial.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'N/D'}
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
                      { label: 'Vagas Abertas', value: vagas.filter((v: VagaRow) => v.status === 'aberta').length, icon: Briefcase, color: 'text-success' },
                      { label: 'Total Candidatos', value: candidatos.length, icon: Users, color: 'text-info' },
                      { label: 'Processos Ativos', value: candidaturasTodas.length, icon: UserSearch, color: 'text-primary' },
                      { label: 'Taxa de Conversão', value: `${taxaConversao}%`, icon: BarChart3, color: 'text-warning' },
                    ].map((stat, i) => (
                      <MotionCard key={i} {...entradaCard(i)} className="rounded-2xl border-border/40 shadow-xs">
                        <CardContent className="p-6 flex items-center gap-4">
                          <div className={cn("h-12 w-12 rounded-xl bg-muted/30 flex items-center justify-center", stat.color)}>
                            <stat.icon className="h-6 w-6" />
                          </div>
                          <div>
                            <p className="text-[10px] uppercase font-medium text-muted-foreground tracking-widest">{stat.label}</p>
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
                    <CardHeader className="pb-0"><CardTitle className="text-sm font-medium uppercase tracking-widest text-muted-foreground">Distribuição por Etapa</CardTitle></CardHeader>
                    <CardContent className="flex items-end gap-2 px-8 pb-8 pt-4">
                      {ETAPAS.map(e => {
                        const count = contagemPorEtapaTotal[e.id] ?? 0;
                        // Altura em PIXELS: com `height: %` dentro de um pai de
                        // altura automática a barra resolvia para 0px (gráfico vazio).
                        const altura = (count / (candidaturasTodas.length || 1)) * ALTURA_MAX_BARRA + ALTURA_MIN_BARRA;
                        return (
                          <div key={e.id} className="flex-1 flex flex-col items-center justify-end gap-2">
                            <div 
                              className={cn("w-full rounded-t-lg transition-all duration-500 bg-primary/20 hover:bg-primary/40")} 
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
        <Dialog open={!!selectedCandidatura} onOpenChange={(o) => { if(!o) setSelectedCandidatura(null); }}>
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
                      <p className="text-sm text-muted-foreground font-medium">{selectedCandidatura.vaga?.titulo} • {selectedCandidatura.vaga?.departamento}</p>
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
                        <span className="text-[10px] uppercase font-medium text-muted-foreground tracking-widest">Contato</span>
                        <p className="text-sm flex items-center gap-2"><Mail className="h-3.5 w-3.5" /> {selectedCandidatura.candidato?.email}</p>
                        <p className="text-sm flex items-center gap-2"><Phone className="h-3.5 w-3.5" /> {selectedCandidatura.candidato?.telefone || 'N/A'}</p>
                      </CardContent>
                    </MotionCard>
                    <MotionCard {...entradaCard(1)} className="border-border/40 bg-muted/10 shadow-none">
                      <CardContent className="p-4 flex flex-col gap-1">
                        <span className="text-[10px] uppercase font-medium text-muted-foreground tracking-widest">Status Atual</span>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className="rounded-lg px-2 bg-primary/10 text-primary border-primary/20 capitalize font-medium">
                            {ETAPAS.find(e => e.id === (selectedCandidatura.etapa || 'triagem'))?.label}
                          </Badge>
                          <span className="text-xs text-muted-foreground font-medium">Score: {selectedCandidatura.nota_geral || 'N/D'}</span>
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
                  <Button variant="outline" size="sm" className="rounded-lg font-medium" onClick={() => setSelectedCandidatura(null)}>Fechar Janela</Button>
                  <Button size="sm" className="rounded-lg font-medium" onClick={avancarEtapa}>Avançar para Próxima Etapa</Button>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </PageLayout>
    </MotionConfig>
  );
}
