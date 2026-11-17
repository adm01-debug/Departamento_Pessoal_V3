import { PageTitle } from '@/components/PageTitle';
import { PageLayout } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { recrutamentoService } from '@/services/recrutamentoService';
import { useEmpresas } from '@/hooks';
import { usePiiMask } from '@/hooks/usePiiMask';
import { UserSearch, Plus, Filter, Mail, Phone, Search, X } from 'lucide-react';
import { MotionConfig } from 'framer-motion';
import { MOTION_REDUCED_MODE } from '@/lib/motionMode';
import { Spinner } from '@/components/ui/spinner';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/utils/safeError';
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
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EntradaPresenca } from '@/components/ui/entrada-cards';
import { AnalyticsRecrutamento } from '@/components/recrutamento/AnalyticsRecrutamento';
import { CandidatoDetalhesDialog } from '@/components/recrutamento/CandidatoDetalhesDialog';
import { CandidatosPainel } from '@/components/recrutamento/CandidatosPainel';
import { PipelineBoard } from '@/components/recrutamento/PipelineBoard';
import { VagasPainel } from '@/components/recrutamento/VagasPainel';
import { ETAPAS, filtrarCandidaturas } from '@/components/recrutamento/pipelineEtapas';
import type { CandidaturaComRelacoes, VagaRow, CandidatoRow } from '@/types/recrutamento';

const VAGA_FORM_VAZIO = { titulo: '', departamento: '', modalidade: '', quantidade: '1', requisitos: '' };

export default function RecrutamentoPage() {
  const { empresaAtual } = useEmpresas();
  const pii = usePiiMask();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState('pipeline');
  const [selectedVagaId, setSelectedVagaId] = useState<string>('all');
  const [busca, setBusca] = useState('');
  const buscaRef = useRef<HTMLInputElement>(null);
  const [selectedCandidatura, setSelectedCandidatura] = useState<CandidaturaComRelacoes | null>(null);
  /**
   * `selectedCandidatura` guarda os dados do dossiê e `detalhesAbertos` manda no
   * `open` do diálogo: fechar não descarta os dados, então o conteúdo continua
   * na tela durante a animação de saída.
   */
  const [detalhesAbertos, setDetalhesAbertos] = useState(false);
  const [vagaDialogOpen, setVagaDialogOpen] = useState(false);
  const [vagaEditandoId, setVagaEditandoId] = useState<string | null>(null);
  const [vagaForm, setVagaForm] = useState(VAGA_FORM_VAZIO);
  const [vagaParaExcluir, setVagaParaExcluir] = useState<VagaRow | null>(null);
  const [candidatoParaVaga, setCandidatoParaVaga] = useState<CandidatoRow | null>(null);
  const [vagaDaCandidatura, setVagaDaCandidatura] = useState('');

  const { data: vagas = [], isLoading: loadVagas } = useQuery({
    queryKey: ['vagas', empresaAtual?.id],
    queryFn: () => recrutamentoService.listarVagas(empresaAtual!.id),
    enabled: !!empresaAtual?.id,
  });

  const { data: candidaturas = [], isLoading: loadCandidaturas } = useQuery({
    queryKey: ['candidaturas', empresaAtual?.id, selectedVagaId],
    queryFn: () =>
      recrutamentoService.listarCandidaturas(empresaAtual!.id, selectedVagaId === 'all' ? undefined : selectedVagaId),
    enabled: !!empresaAtual?.id,
  });

  const { data: candidatos = [], isLoading: loadCandidatos } = useQuery({
    queryKey: ['candidatos', empresaAtual?.id],
    queryFn: () => recrutamentoService.listarCandidatos(empresaAtual!.id),
    enabled: !!empresaAtual?.id,
  });

  /**
   * Candidaturas SEM o filtro por vaga. O seletor do topo é o filtro do KANBAN
   * (só aparece na aba Pipeline); Vagas, Candidatos e Analytics são números de
   * TODO o processo — sem esta leitura separada, filtrar o Pipeline mudava os
   * KPIs das outras abas.
   */
  const {
    data: candidaturasTodas = [],
    isLoading: loadCandidaturasTodas,
    isError: erroCandidaturasTodas,
    refetch: recarregarCandidaturasTodas,
  } = useQuery({
    queryKey: ['candidaturas-todas', empresaAtual?.id],
    queryFn: () => recrutamentoService.listarCandidaturas(empresaAtual!.id),
    enabled: !!empresaAtual?.id,
  });

  // Atalho ⌘/Ctrl+K leva o foco à busca do pipeline (o mesmo hint do campo).
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

  const updateEtapa = useMutation({
    mutationFn: ({ id, etapa }: { id: string; etapa: string }) =>
      recrutamentoService.atualizarCandidatura(id, { etapa }, empresaAtual!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['candidaturas', empresaAtual?.id] });
      qc.invalidateQueries({ queryKey: ['candidaturas-todas', empresaAtual?.id] });
      toast.success('Etapa atualizada!');
    },
    onError: (e: Error) => toast.error(safeErrorMessage(e, 'Erro ao atualizar etapa.')),
  });

  const quantidadeVaga = Number.parseInt(vagaForm.quantidade, 10);
  const vagaFormValido = !!vagaForm.titulo.trim() && Number.isInteger(quantidadeVaga) && quantidadeVaga >= 1;

  const abrirNovaVaga = () => {
    setVagaEditandoId(null);
    setVagaForm(VAGA_FORM_VAZIO);
    setVagaDialogOpen(true);
  };

  const abrirEdicaoVaga = (vaga: VagaRow) => {
    setVagaEditandoId(vaga.id);
    setVagaForm({
      titulo: vaga.titulo ?? '',
      departamento: vaga.departamento ?? '',
      modalidade: vaga.modalidade ?? '',
      quantidade: String(vaga.quantidade ?? 1),
      requisitos: vaga.requisitos ?? '',
    });
    setVagaDialogOpen(true);
  };

  const salvarVaga = useMutation({
    mutationFn: () => {
      const dados = {
        titulo: vagaForm.titulo.trim(),
        departamento: vagaForm.departamento.trim() || null,
        modalidade: vagaForm.modalidade.trim() || null,
        quantidade: quantidadeVaga,
        requisitos: vagaForm.requisitos.trim() || null,
      };
      return vagaEditandoId
        ? recrutamentoService.atualizarVaga(vagaEditandoId, dados, empresaAtual!.id)
        : recrutamentoService.criarVaga({ ...dados, empresa_id: empresaAtual!.id });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vagas', empresaAtual?.id] });
      qc.invalidateQueries({ queryKey: ['candidaturas', empresaAtual?.id] });
      qc.invalidateQueries({ queryKey: ['candidaturas-todas', empresaAtual?.id] });
      toast.success(vagaEditandoId ? 'Vaga atualizada!' : 'Vaga publicada!');
      setVagaDialogOpen(false);
    },
    onError: (e: Error) => toast.error(safeErrorMessage(e, 'Erro ao salvar vaga.')),
  });

  const excluirVaga = useMutation({
    mutationFn: (id: string) => recrutamentoService.excluirVaga(id, empresaAtual!.id),
    onSuccess: (_data, id) => {
      if (selectedVagaId === id) setSelectedVagaId('all');
      qc.invalidateQueries({ queryKey: ['vagas', empresaAtual?.id] });
      qc.invalidateQueries({ queryKey: ['candidaturas', empresaAtual?.id] });
      qc.invalidateQueries({ queryKey: ['candidaturas-todas', empresaAtual?.id] });
      toast.success('Vaga excluída!');
      setVagaParaExcluir(null);
    },
    onError: (e: Error) => toast.error(safeErrorMessage(e, 'Erro ao excluir vaga.')),
  });

  const adicionarAVaga = useMutation({
    mutationFn: ({ candidatoId, vagaId }: { candidatoId: string; vagaId: string }) =>
      recrutamentoService.criarCandidatura({
        candidato_id: candidatoId,
        vaga_id: vagaId,
        empresa_id: empresaAtual!.id,
        etapa: 'triagem',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['candidaturas', empresaAtual?.id] });
      qc.invalidateQueries({ queryKey: ['candidaturas-todas', empresaAtual?.id] });
      toast.success('Candidato adicionado à vaga!');
      setCandidatoParaVaga(null);
    },
    onError: (e: Error) => toast.error(safeErrorMessage(e, 'Erro ao adicionar candidato.')),
  });

  /** Abre o dossiê do candidato (card do kanban e painel de processos). */
  const abrirDetalhes = (cand: CandidaturaComRelacoes) => {
    setSelectedCandidatura(cand);
    setDetalhesAbertos(true);
  };

  /**
   * Move a candidatura (menu do card E arrastar-e-soltar). Devolve `false`
   * quando a gravação falha, para o board desfazer o movimento otimista e
   * restaurar a coluna de origem.
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
    const proxima = ETAPAS[ETAPAS.findIndex((e) => e.id === (cand.etapa || 'triagem')) + 1];
    if (!proxima) {
      toast.info('Este candidato já está na última etapa do processo.');
      return;
    }
    updateEtapa.mutate({ id: cand.id, etapa: proxima.id });
    setSelectedCandidatura({ ...cand, etapa: proxima.id });
  };

  const isLoading = loadVagas || loadCandidaturas || loadCandidatos || loadCandidaturasTodas;

  /**
   * Kanban: respeita o filtro de vaga (query) + a busca do topo (client-side).
   * As habilidades vêm das vagas já carregadas — o join de `listarCandidaturas`
   * não traz `requisitos`, então o enriquecimento acontece aqui, sem nova consulta.
   */
  const candidaturasPipeline = useMemo(() => {
    const requisitosPorVaga = new Map(vagas.map((vaga: VagaRow) => [vaga.id, vaga.requisitos]));
    const enriquecidas = candidaturas.map((cand: CandidaturaComRelacoes) => ({
      ...cand,
      vaga: cand.vaga
        ? { ...cand.vaga, requisitos: requisitosPorVaga.get(cand.vaga_id) ?? cand.vaga.requisitos ?? null }
        : cand.vaga,
    }));
    return filtrarCandidaturas(enriquecidas, busca);
  }, [candidaturas, vagas, busca]);

  return (
    <MotionConfig reducedMotion={MOTION_REDUCED_MODE}>
      <PageTitle title="Recrutamento" description="Gestão de talentos e processos seletivos" />
      <PageLayout
        title="Recrutamento & Seleção"
        description="Gestão de vagas, candidatos e pipeline 10/10"
        icon={<UserSearch className="h-5 w-5 text-primary-foreground" />}
        gradient="from-success to-info"
        actions={
          <div className="flex gap-2">
            <Dialog open={vagaDialogOpen} onOpenChange={setVagaDialogOpen}>
              <DialogTrigger asChild>
                <Button className="rounded-xl shadow-lg" onClick={abrirNovaVaga}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Vaga
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-xl">
                <DialogHeader>
                  <DialogTitle>{vagaEditandoId ? 'Editar Vaga' : 'Anunciar Nova Vaga'}</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div className="grid gap-1">
                    <Label>Título da Vaga</Label>
                    <Input
                      placeholder="Ex: Desenvolvedor Senior"
                      value={vagaForm.titulo}
                      onChange={(e) => setVagaForm((f) => ({ ...f, titulo: e.target.value }))}
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label>Departamento</Label>
                    <Input
                      placeholder="Ex: Tecnologia"
                      value={vagaForm.departamento}
                      onChange={(e) => setVagaForm((f) => ({ ...f, departamento: e.target.value }))}
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label>Modalidade</Label>
                    <Input
                      placeholder="Remoto, Híbrido, Presencial"
                      value={vagaForm.modalidade}
                      onChange={(e) => setVagaForm((f) => ({ ...f, modalidade: e.target.value }))}
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label>Quantidade</Label>
                    <Input
                      type="number"
                      min={1}
                      value={vagaForm.quantidade}
                      onChange={(e) => setVagaForm((f) => ({ ...f, quantidade: e.target.value }))}
                    />
                  </div>
                  <div className="grid gap-1 col-span-2">
                    <Label>Requisitos (separados por vírgula)</Label>
                    <Input
                      placeholder="React, TypeScript, Node.js..."
                      value={vagaForm.requisitos}
                      onChange={(e) => setVagaForm((f) => ({ ...f, requisitos: e.target.value }))}
                    />
                  </div>
                  <Button
                    className="col-span-2 mt-2"
                    disabled={!vagaFormValido || salvarVaga.isPending || !empresaAtual?.id}
                    onClick={() => salvarVaga.mutate()}
                  >
                    {salvarVaga.isPending ? 'Salvando...' : vagaEditandoId ? 'Salvar Alterações' : 'Publicar Vaga'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        }
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <TabsList className="bg-muted/50 p-1 rounded-xl">
              <TabsTrigger value="pipeline" className="rounded-lg">
                Pipeline
              </TabsTrigger>
              <TabsTrigger value="vagas" className="rounded-lg">
                Vagas
              </TabsTrigger>
              <TabsTrigger value="candidatos" className="rounded-lg">
                Candidatos
              </TabsTrigger>
              <TabsTrigger value="processos" className="rounded-lg">
                Processos
              </TabsTrigger>
              <TabsTrigger value="analytics" className="rounded-lg">
                Analytics
              </TabsTrigger>
            </TabsList>

            {activeTab === 'pipeline' && (
              <div data-pipeline-toolbar className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center">
                <div className="relative min-w-0 md:w-80">
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
                    className="h-10 rounded-xl pl-9 pr-20 text-xs"
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

                <div className="flex items-center gap-2 md:w-64">
                  <Filter className="h-4 w-4 text-muted-foreground" aria-hidden />
                  <Select value={selectedVagaId} onValueChange={setSelectedVagaId}>
                    <SelectTrigger aria-label="Filtrar por vaga" className="rounded-xl">
                      <SelectValue placeholder="Filtrar por Vaga" />
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
            )}
          </div>

          {/* Entrada em cascata das abas: `EntradaPresenca` dá o contexto de
              presença à subárvore sem renderizar DOM nem animar por conta
              própria — quem cascateia são os cards de cada aba. */}
          <EntradaPresenca>
            {isLoading ? (
              <div className="flex justify-center py-20">
                <Spinner size="lg" />
              </div>
            ) : (
              <>
                {/* PIPELINE KANBAN */}
                <TabsContent value="pipeline" className="mt-0">
                  <PipelineBoard
                    candidaturas={candidaturasPipeline}
                    isActive={activeTab === 'pipeline'}
                    onAbrir={abrirDetalhes}
                    onMoverEtapa={moverEtapa}
                    onContatar={(cand) => {
                      const email = cand.candidato?.email;
                      if (!email) {
                        toast.info('Este candidato não tem e-mail cadastrado.');
                        return;
                      }
                      window.location.href = `mailto:${email}`;
                    }}
                  />
                </TabsContent>

                {/* VAGAS */}
                <TabsContent value="vagas" className="mt-0">
                  <VagasPainel
                    vagas={vagas}
                    candidaturas={candidaturasTodas}
                    onGerenciar={(vaga) => {
                      setSelectedVagaId(vaga.id);
                      setActiveTab('pipeline');
                    }}
                    onVerAnalises={() => setActiveTab('analytics')}
                    onEditar={abrirEdicaoVaga}
                    onExcluir={(vaga) => setVagaParaExcluir(vaga)}
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
                              <th className="px-6 py-4 text-left font-bold text-[11px] uppercase tracking-wider text-muted-foreground">
                                Candidato
                              </th>
                              <th className="px-6 py-4 text-left font-bold text-[11px] uppercase tracking-wider text-muted-foreground">
                                Contato
                              </th>
                              <th className="px-6 py-4 text-left font-bold text-[11px] uppercase tracking-wider text-muted-foreground">
                                Experiência
                              </th>
                              <th className="px-6 py-4 text-left font-bold text-[11px] uppercase tracking-wider text-muted-foreground">
                                Pretensão
                              </th>
                              <th className="px-6 py-4 text-right font-bold text-[11px] uppercase tracking-wider text-muted-foreground">
                                Ações
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/30">
                            {candidatos.map((cand: CandidatoRow) => (
                              <tr key={cand.id} className="hover:bg-primary/[0.02] transition-colors group">
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                    <div className="h-9 w-9 rounded-xl bg-primary/5 flex items-center justify-center text-primary font-bold">
                                      {cand.nome?.charAt(0)}
                                    </div>
                                    <div>
                                      <p className="font-bold text-sm text-foreground">{cand.nome}</p>
                                      <p className="text-[10px] text-muted-foreground">{cand.origem || 'Website'}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex flex-col gap-0.5">
                                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                      <Mail className="h-3 w-3" /> {cand.email ? pii.email(cand.email) : ''}
                                    </span>
                                    {cand.telefone && (
                                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                        <Phone className="h-3 w-3" /> {pii.phone(cand.telefone)}
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <Badge variant="secondary" className="rounded-lg bg-slate-100 font-medium">
                                    {cand.experiencia_anos} anos
                                  </Badge>
                                </td>
                                <td className="px-6 py-4 font-display font-bold text-success">
                                  {cand.pretensao_salarial
                                    ? `R$ ${cand.pretensao_salarial.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                                    : 'N/D'}
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label="Adicionar"
                                    disabled={vagas.length === 0}
                                    onClick={() => {
                                      setVagaDaCandidatura('');
                                      setCandidatoParaVaga(cand);
                                    }}
                                    className="rounded-xl hover:bg-primary/10 text-primary opacity-0 group-hover:opacity-100 transition-all"
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

                {/* PROCESSOS — candidaturas em andamento (filtros, seleção e
                    paginação). A aba "Candidatos" continua sendo o CADASTRO:
                    candidato sem candidatura só aparece (e só é inscrito) lá. */}
                <TabsContent value="processos" className="mt-0">
                  <CandidatosPainel
                    candidaturas={candidaturasTodas}
                    vagas={vagas}
                    onVerPerfil={abrirDetalhes}
                    onMoverEtapa={moverEtapa}
                    erro={erroCandidaturasTodas}
                    onTentarNovamente={() => void recarregarCandidaturasTodas()}
                  />
                </TabsContent>

                {/* ANALYTICS */}
                <TabsContent value="analytics" className="mt-0">
                  <AnalyticsRecrutamento candidaturas={candidaturasTodas} vagas={vagas} candidatos={candidatos} />
                </TabsContent>
              </>
            )}
          </EntradaPresenca>
        </Tabs>

        {/* Detalhes do Candidato — o componente concentra a apresentação (e a
            máscara de PII); a página continua dona dos dados, do fechamento e
            de `avancarEtapa`. */}
        <CandidatoDetalhesDialog
          open={detalhesAbertos}
          candidatura={selectedCandidatura}
          onClose={() => setDetalhesAbertos(false)}
          onAvancar={avancarEtapa}
        />

        {/* Confirmação de exclusão de vaga */}
        <AlertDialog
          open={!!vagaParaExcluir}
          onOpenChange={(o) => {
            if (!o) setVagaParaExcluir(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir a vaga "{vagaParaExcluir?.titulo}"?</AlertDialogTitle>
              <AlertDialogDescription>
                As candidaturas vinculadas a esta vaga também serão excluídas. Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={excluirVaga.isPending}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                disabled={excluirVaga.isPending}
                onClick={(e) => {
                  e.preventDefault();
                  if (vagaParaExcluir) excluirVaga.mutate(vagaParaExcluir.id);
                }}
              >
                {excluirVaga.isPending ? 'Excluindo...' : 'Excluir vaga'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Adicionar candidato a uma vaga */}
        <Dialog
          open={!!candidatoParaVaga}
          onOpenChange={(o) => {
            if (!o) setCandidatoParaVaga(null);
          }}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Adicionar {candidatoParaVaga?.nome} a uma vaga</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 pt-2">
              <div className="grid gap-1">
                <Label>Vaga</Label>
                <Select value={vagaDaCandidatura} onValueChange={setVagaDaCandidatura}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Selecione a vaga" />
                  </SelectTrigger>
                  <SelectContent>
                    {vagas.map((v: VagaRow) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.titulo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                disabled={!vagaDaCandidatura || adicionarAVaga.isPending || !empresaAtual?.id}
                onClick={() => {
                  if (candidatoParaVaga && vagaDaCandidatura)
                    adicionarAVaga.mutate({ candidatoId: candidatoParaVaga.id, vagaId: vagaDaCandidatura });
                }}
              >
                {adicionarAVaga.isPending ? 'Adicionando...' : 'Adicionar à Vaga'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </PageLayout>
    </MotionConfig>
  );
}
