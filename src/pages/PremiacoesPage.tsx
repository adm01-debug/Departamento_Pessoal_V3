import React from 'react';
import { MotionConfig, motion } from 'framer-motion';
import { PageLayout } from '@/components/layout';
import { PageTitle } from '@/components/PageTitle';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { AnimatedTabsList, AnimatedTabsTrigger } from '@/components/ui/animated-tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ColoredFilterChip } from '@/components/avaliacao/ColoredFilterChip';
import { PALETAS_CHIP, TEMA_TODOS } from '@/components/avaliacao/chipFiltroComum';
import { EntradaPresenca, entradaCard } from '@/components/premiacoes/premiacoesEntrada';
import { MOTION_REDUCED_MODE } from '@/lib/motionMode';
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
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Calculator,
  CalendarDays,
  ChevronRight,
  Clock,
  DollarSign,
  Download,
  FileText,
  Filter,
  Layers,
  Plus,
  Search,
  ShieldCheck,
  Target,
  Trophy,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { premiacoesService, PERIODO_SEM_DATA } from '@/services/premiacoesService';
import { useEmpresas } from '@/hooks';
import { useAuth } from '@/hooks/useAuth';
import { Skeleton } from '@/components/ui/skeleton';
import { RewardsSimulator } from '@/components/premiacoes/RewardsSimulator';
import { CampaignWizard } from '@/components/premiacoes/CampaignWizard';
import { CampanhaTabela } from '@/components/premiacoes/CampanhaTabela';
import { CampanhaLateral } from '@/components/premiacoes/CampanhaLateral';
import { CampanhaDetalhesDialog } from '@/components/premiacoes/CampanhaDetalhesDialog';
import { Indicador } from '@/components/premiacoes/IndicadorPremiacoes';
import { PagamentosTab } from '@/components/premiacoes/PagamentosTab';
import { AuditoriaTab } from '@/components/premiacoes/AuditoriaTab';
import {
  FILTROS_HUB_INICIAIS,
  ORDENACAO_ROTULOS,
  STATUS_PAGAMENTO_PENDENTE,
  calcularVariacaoMensal,
  contarPorStatus,
  filtrarEOrdenarCampanhas,
  indiceEntrada,
  montarAcoesPendentes,
  montarAtividadeRecente,
  montarMetricas,
  numero,
  paginarCampanhas,
  type AuditoriaHub,
  type CampanhaHub,
  type FiltroPeriodoCampanha,
  type FiltrosHub,
  type MetricasCampanha,
  type OrdenacaoCampanha,
  type PagamentoHub,
} from '@/components/premiacoes/premiacoesComum';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/utils/format';
import { todayLocalISO } from '@/utils/dateLocal';
import { exportPontoCSV, exportPontoPDF } from '@/services/exportService';
import { registrarAcessoPII } from '@/services/piiAccessLogService';
import { toast } from 'sonner';

/* ─── Parâmetros da tela ───────────────────────────────────────────────────── */

/** Campanhas por página na tabela (paginação LOCAL — a API não pagina). */
const POR_PAGINA = 8;

/** Seções do hub, na ordem da barra superior. */
const ABAS: { valor: string; label: string; icone: typeof Trophy }[] = [
  { valor: 'campanhas', label: 'Campanhas', icone: Trophy },
  { valor: 'pagamentos', label: 'Pagamentos', icone: DollarSign },
  { valor: 'simulador', label: 'Simulador ROI', icone: Calculator },
  { valor: 'auditoria', label: 'Auditoria', icone: ShieldCheck },
];

/**
 * Pele das abas — a MESMA do módulo Gestão de Desempenho (`AvaliacaoPage`), para
 * que as tablists do produto sejam UM único padrão visual. Quem pinta a aba ativa
 * é o indicador deslizante do `ui/animated-tabs`, nunca o botão.
 */
const CLASSE_ABA =
  'group relative inline-flex h-8 shrink-0 items-center justify-center whitespace-nowrap gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset disabled:pointer-events-none disabled:opacity-50 lg:w-full';
const CLASSE_ABA_ICONE =
  'h-3.5 w-3.5 shrink-0 text-muted-foreground transition-colors group-data-[state=active]:text-primary';
const CLASSE_ABA_TEXTO =
  'min-w-0 truncate text-muted-foreground transition-colors group-data-[state=active]:text-foreground';

/** Filtro de período da TABELA — todos os recortes usam as datas da campanha. */
const OPCOES_PERIODO: { valor: FiltroPeriodoCampanha; label: string }[] = [
  { valor: 'todos', label: 'Todos' },
  { valor: 'mes_atual', label: 'Mês atual' },
  { valor: 'ultimos_90', label: 'Últimos 90 dias' },
  { valor: 'ano_atual', label: 'Ano atual' },
];

/** Snapshots da trilha só são objeto JSON (a coluna aceita qualquer `Json`). */
const objetoJson = (valor: unknown): Record<string, unknown> | null =>
  valor !== null && typeof valor === 'object' && !Array.isArray(valor) ? (valor as Record<string, unknown>) : null;

export default function PremiacoesPage() {
  const { empresaAtual } = useEmpresas();
  const { hasRole } = useAuth();
  const podeGerirCampanhas = hasRole('admin') || hasRole('rh');
  const queryClient = useQueryClient();
  const [rascunhoExcluir, setRascunhoExcluir] = React.useState<{ id: string; nome: string } | null>(null);
  const [activeTab, setActiveTab] = React.useState('campanhas');
  const [isWizardOpen, setIsWizardOpen] = React.useState(false);
  const [periodoFiltro, setPeriodoFiltro] = React.useState<{ ym: string; empresaId: string | undefined } | null>(null);

  // Estado da aba Campanhas: filtros (busca/status/período/ordenação), página
  // local e a campanha aberta no diálogo de detalhes.
  const [filtros, setFiltros] = React.useState<FiltrosHub>(FILTROS_HUB_INICIAIS);
  const [pagina, setPagina] = React.useState(1);
  const [detalhe, setDetalhe] = React.useState<MetricasCampanha | null>(null);
  const [visaoGeralExpandida, setVisaoGeralExpandida] = React.useState(false);

  /**
   * Cada ativação da aba Simulador ROI recebe um token novo: os KPIs do
   * simulador usam esse token para rodar a contagem UMA vez por acesso.
   */
  const selecionarAba = (valor: string) => {
    if (valor === 'simulador' && activeTab !== 'simulador') {
      try {
        sessionStorage.setItem('dp-premiacoes-roi-kpi-acesso', String(Date.now()));
      } catch {
        /* sessionStorage indisponível: a contagem segue pelo guard de mount */
      }
    }
    setActiveTab(valor);
  };

  const {
    data: campanhas = [],
    isLoading: loadCampanhas,
    isError: erroCampanhas,
    refetch: recarregarCampanhas,
  } = useQuery({
    queryKey: ['premiacoes_campanhas', empresaAtual?.id],
    queryFn: () => premiacoesService.listarCampanhas(empresaAtual!.id),
    enabled: !!empresaAtual?.id,
  });

  const {
    data: pagamentos = [],
    isLoading: loadPagamentos,
    isError: erroPagamentos,
    refetch: recarregarPagamentos,
  } = useQuery({
    queryKey: ['premiacoes_pagamentos', empresaAtual?.id],
    queryFn: () => premiacoesService.listarPagamentos(undefined, empresaAtual!.id),
    enabled: !!empresaAtual?.id,
  });

  const {
    data: auditoria = [],
    isLoading: loadAuditoria,
    isError: erroAuditoria,
    refetch: recarregarAuditoria,
  } = useQuery({
    queryKey: ['premiacoes_auditoria', empresaAtual?.id],
    queryFn: () => premiacoesService.listarAuditoria(undefined, empresaAtual!.id),
    enabled: !!empresaAtual?.id,
  });

  // Opções de período derivadas dos dados reais (data_pagamento, 'YYYY-MM').
  // Pagamentos sem data entram como opção própria — ficariam invisíveis para
  // qualquer mês (data_pagamento é nullable e não é preenchida na aprovação).
  const periodosDisponiveis = React.useMemo(() => {
    const mapa = new Map<string, string>();
    let temSemData = false;
    for (const p of pagamentos) {
      const dp = (p as { data_pagamento?: string | null }).data_pagamento;
      if (!dp) {
        temSemData = true;
        continue;
      }
      const ym = dp.slice(0, 7);
      const label = new Date(`${ym}-02T12:00:00`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      mapa.set(ym, label.charAt(0).toUpperCase() + label.slice(1));
    }
    const entradas = [...mapa.entries()].sort((a, b) => b[0].localeCompare(a[0]));
    if (temSemData) entradas.push([PERIODO_SEM_DATA, 'Sem data de pagamento']);
    return entradas;
  }, [pagamentos]);

  // A trilha chega com `motivo`/`created_at` nulos e snapshots `Json`; o motor
  // puro trabalha com o formato normalizado.
  const auditoriaHub: AuditoriaHub[] = React.useMemo(
    () =>
      auditoria.map((a) => ({
        id: a.id,
        entidade_tipo: a.entidade_tipo,
        entidade_id: a.entidade_id,
        acao: a.acao,
        motivo: a.motivo ?? '',
        created_at: a.created_at ?? '',
        usuario_id: a.usuario_id ?? null,
        dados_anteriores: objetoJson(a.dados_anteriores),
        dados_novos: objetoJson(a.dados_novos),
      })),
    [auditoria]
  );

  // A escolha pertence à empresa em que foi feita: trocar de empresa zera o
  // filtro mesmo quando a nova tem o mesmo mês, e a opção precisa existir nos
  // dados atuais. Estado derivado em vez de effect.
  const periodoEfetivo =
    periodoFiltro !== null &&
    periodoFiltro.empresaId === empresaAtual?.id &&
    periodosDisponiveis.some(([ym]) => ym === periodoFiltro.ym)
      ? periodoFiltro.ym
      : '';

  const lancarRascunho = useMutation({
    mutationFn: (id: string) => premiacoesService.lancarRascunhoCampanha(id, empresaAtual!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['premiacoes_campanhas'] });
      toast.success('Campanha lançada.');
    },
    onError: (e: Error) => toast.error(e.message || 'Erro ao lançar campanha.'),
  });

  const excluirRascunho = useMutation({
    mutationFn: (id: string) => premiacoesService.excluirRascunhoCampanha(id, empresaAtual!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['premiacoes_campanhas'] });
      toast.success('Rascunho excluído.');
      setRascunhoExcluir(null);
    },
    onError: (e: Error) => toast.error(e.message || 'Erro ao excluir rascunho.'),
  });

  const handleExport = async (format: 'csv' | 'pdf') => {
    toast.promise(
      (async () => {
        const pagamentos = (await premiacoesService.exportarRelatorio({
          empresaId: empresaAtual?.id,
          periodo: periodoEfetivo || undefined,
        })) as {
          valor_aprovado?: number | null;
          valor_folha_real?: number | null;
          status_conciliacao?: string | null;
          created_at?: string | null;
          colaborador?: { nome_completo?: string | null } | null;
          campanha?: { nome?: string | null } | null;
        }[];
        const linhas = pagamentos.map((p) => ({
          colaborador: p.colaborador?.nome_completo ?? null,
          campanha: p.campanha?.nome ?? null,
          valor_aprovado: p.valor_aprovado ?? null,
          valor_folha: p.valor_folha_real ?? null,
          status_conciliacao: p.status_conciliacao ?? null,
          created_at: p.created_at ?? null,
        }));
        if (linhas.length === 0) throw new Error('Nenhum pagamento para exportar.');
        // Trilha LGPD (art. 37) — export carrega nomes e valores por colaborador.
        void registrarAcessoPII('premiacoes_pagamentos', 'export', {
          empresaId: empresaAtual?.id,
          registroCount: linhas.length,
        });
        if (format === 'csv') {
          exportPontoCSV(linhas, `premiacoes-${todayLocalISO()}.csv`);
        } else {
          exportPontoPDF(linhas, 'Relatório de Premiações', Object.keys(linhas[0]), {
            seloSistema: 'DEPARTAMENTO PESSOAL v2.0',
            statusGeral: 'EXPORTADO',
            notaRodape: 'Documento gerado automaticamente — consulte o status de conciliação por pagamento',
          });
        }
      })(),
      {
        loading: `Gerando relatório ${format.toUpperCase()}${periodoEfetivo ? ' do período selecionado' : ''}...`,
        success: 'Relatório gerado e baixado com sucesso!',
        error: 'Erro ao gerar relatório.',
      }
    );
  };

  if (loadCampanhas)
    return (
      <div className="p-8">
        <Skeleton className="h-[400px] w-full" />
      </div>
    );

  // Toda a inteligência da aba Campanhas vem de `premiacoesComum` (funções
  // puras): "hoje" é fixado uma vez por render e nada é recalculado no JSX.
  const hoje = new Date(`${todayLocalISO()}T12:00:00`);
  const campanhasHub: CampanhaHub[] = campanhas;
  const pagamentosHub: PagamentoHub[] = pagamentos;
  const metricasCampanhas = montarMetricas(campanhasHub, pagamentosHub, hoje);
  const contagens = contarPorStatus(metricasCampanhas);
  const campanhasFiltradas = filtrarEOrdenarCampanhas(metricasCampanhas, filtros, hoje);
  // Paginação LOCAL: a página pedida é recortada para a faixa válida, então
  // mudar o filtro nunca deixa a tabela numa página vazia/inexistente.
  const { pagina: paginaAtual, linhas: linhasVisiveis } = paginarCampanhas(campanhasFiltradas, pagina, POR_PAGINA);
  const acoesPendentes = montarAcoesPendentes(metricasCampanhas, pagamentosHub);
  const atividadeRecente = montarAtividadeRecente(auditoriaHub, campanhasHub, pagamentosHub, 4);

  /* ─── Indicadores (mesmas fontes de sempre, só reorganizadas) ───────────── */

  const stats = {
    totalAprovado: pagamentosHub.reduce((acc, p) => acc + numero(p.valor_aprovado), 0),
    divergencias: pagamentosHub.filter((p) => p.status_conciliacao === 'divergente').length,
    // Premiados = colaboradores distintos com pagamento JÁ PAGO.
    colaboradoresPremiados: new Set(pagamentosHub.filter((p) => p.status === 'pago').map((p) => p.colaborador_id)).size,
    orcamentoConsolidado: metricasCampanhas.reduce((acc, m) => acc + m.orcamentoTotal, 0),
  };
  const listaPendentes = pagamentosHub.filter((p) =>
    (STATUS_PAGAMENTO_PENDENTE as readonly string[]).includes(p.status)
  );
  const totalPendente = listaPendentes.reduce((acc, p) => acc + numero(p.valor_calculado), 0);
  // Variação do total aprovado: mês atual vs anterior, pelas datas reais. Sem
  // base no mês anterior o motor devolve null e a variação não é exibida.
  const variacao = calcularVariacaoMensal(pagamentosHub, hoje);
  const variacaoMensal = variacao === null ? null : Math.round(variacao.percentual);

  const atualizarFiltros = (patch: Partial<FiltrosHub>) => {
    setFiltros((atual) => ({ ...atual, ...patch }));
    setPagina(1);
  };
  const irParaAba = (destino: string) => {
    setDetalhe(null);
    selecionarAba(destino);
  };

  const mensagemVazia =
    campanhasHub.length === 0
      ? 'Nenhuma campanha cadastrada ainda. Use “Nova Campanha” para criar a primeira.'
      : 'Nenhuma campanha corresponde aos filtros aplicados.';

  return (
    // Mesmo comportamento de movimento reduzido das telas que já usam a cascata
    // do Dashboard: com `prefers-reduced-motion` a Motion mantém o fade e
    // desliga o deslocamento — conteúdo 100% visível.
    <MotionConfig reducedMotion={MOTION_REDUCED_MODE}>
      <PageTitle
        title="Premiações & Renda Variável 10/10"
        description="Gestão estratégica de incentivos e alta performance organizacional"
      />
      <PageLayout
        title="Hub de Premiações"
        description="Campanhas, Metas e ROI de Capital Humano"
        icon={<Trophy className="h-5 w-5 text-primary-foreground" />}
        gradient="from-amber-500 to-orange-600"
        className="max-w-none space-y-3.5"
      >
        {/* A cascata de entrada precisa deste `AnimatePresence` aninhado: o
            `initial={false}` do `PageTransition` bloquearia o keyframe `hidden`
            dos `motion.*` descendentes. Não renderiza DOM próprio. */}
        <EntradaPresenca>
          <Tabs value={activeTab} onValueChange={selecionarAba} className="space-y-3.5">
            {/* 1 · Navegação: a MESMA tablist de Gestão de Desempenho, mais a
                exportação (com trilha LGPD) e a criação de campanha. */}
            <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center">
              <motion.div {...entradaCard(indiceEntrada('navegacao', 0))} className="min-w-0 lg:flex-1">
                <AnimatedTabsList
                  value={activeTab}
                  onValueChange={selecionarAba}
                  containerClassName="h-11 w-full rounded-xl border border-border/30 bg-card/50 p-1 overflow-x-auto lg:min-w-0 lg:flex-1 lg:overflow-visible"
                  highlightClassName="rounded-lg bg-background shadow-xs"
                  listClassName="flex h-full w-full items-center justify-start gap-1 text-muted-foreground lg:grid lg:grid-cols-4"
                >
                  {ABAS.map((aba) => (
                    <AnimatedTabsTrigger key={aba.valor} value={aba.valor} className={CLASSE_ABA}>
                      <aba.icone className={CLASSE_ABA_ICONE} />
                      <span className={CLASSE_ABA_TEXTO}>{aba.label}</span>
                    </AnimatedTabsTrigger>
                  ))}
                </AnimatedTabsList>
              </motion.div>

              {/* Exportação do relatório de pagamentos: o período vem das datas
                  REAIS (`data_pagamento`), com entrada própria para quem não tem
                  data, e o download registra o acesso a PII. */}
              <motion.div
                {...entradaCard(indiceEntrada('navegacao', 1))}
                className="flex min-w-0 shrink-0 flex-wrap items-center gap-2"
              >
                <div className="flex h-11 items-center gap-2 rounded-xl border border-border/50 bg-background px-3">
                  <Filter className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <select
                    className="bg-transparent text-[11px] font-medium outline-hidden border-none"
                    value={periodoEfetivo}
                    onChange={(e) =>
                      setPeriodoFiltro(
                        e.target.value === '' ? null : { ym: e.target.value, empresaId: empresaAtual?.id }
                      )
                    }
                    aria-label="Filtrar exportação por período"
                  >
                    <option value="">Todos os Períodos</option>
                    {periodosDisponiveis.map(([ym, label]) => (
                      <option key={ym} value={ym}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <Button
                  variant="outline"
                  className="h-11 gap-2 rounded-xl text-[11px] font-semibold uppercase"
                  onClick={() => handleExport('csv')}
                >
                  <Download className="h-3.5 w-3.5" /> CSV
                </Button>
                <Button
                  variant="outline"
                  className="h-11 gap-2 rounded-xl text-[11px] font-semibold uppercase"
                  onClick={() => handleExport('pdf')}
                >
                  <FileText className="h-3.5 w-3.5" /> PDF
                </Button>
              </motion.div>

              {podeGerirCampanhas && (
                <motion.div {...entradaCard(indiceEntrada('navegacao', 2))} className="w-full shrink-0 lg:w-[200px]">
                  <Button
                    onClick={() => setIsWizardOpen(true)}
                    className="h-11 w-full shrink-0 gap-2 rounded-xl bg-primary px-5 text-[14px] font-semibold text-primary-foreground hover:bg-primary/90"
                  >
                    <Plus className="h-[18px] w-[18px]" /> Nova Campanha
                  </Button>
                </motion.div>
              )}
            </div>

            {/* 2 · Indicadores + visão geral. Só nas abas que falam de CAMPANHAS:
                Pagamentos e Auditoria têm os indicadores próprios. */}
            {activeTab !== 'pagamentos' && activeTab !== 'auditoria' && (
              <div className="grid min-w-0 grid-cols-1 gap-3 min-[640px]:grid-cols-2 min-[1024px]:grid-cols-3 min-[1440px]:grid-cols-5">
                <Indicador
                  indice={indiceEntrada('kpis', 0)}
                  titulo="Total Aprovado"
                  valor={erroPagamentos ? '—' : formatCurrency(stats.totalAprovado)}
                  icone={DollarSign}
                  caixa="bg-success/15 text-success"
                  rodapeClasse={erroPagamentos ? 'text-destructive' : undefined}
                  rodape={
                    erroPagamentos ? (
                      'Falha ao carregar os pagamentos'
                    ) : variacaoMensal !== null ? (
                      <span
                        className={cn(
                          'flex items-center gap-1 font-medium',
                          variacaoMensal < 0 ? 'text-destructive' : 'text-success'
                        )}
                      >
                        {variacaoMensal < 0 ? (
                          <ArrowDownRight className="h-3 w-3" />
                        ) : (
                          <ArrowUpRight className="h-3 w-3" />
                        )}
                        {variacaoMensal > 0 ? '+' : ''}
                        {variacaoMensal}% vs mês anterior
                      </span>
                    ) : (
                      'Sem base de comparação'
                    )
                  }
                />

                <Indicador
                  indice={indiceEntrada('kpis', 1)}
                  titulo="Pendente de Aprovação"
                  valor={erroPagamentos ? '—' : formatCurrency(totalPendente)}
                  icone={Clock}
                  caixa="bg-warning/15 text-warning"
                  rodapeClasse={erroPagamentos ? 'text-destructive' : undefined}
                  rodape={
                    erroPagamentos
                      ? 'Falha ao carregar os pagamentos'
                      : listaPendentes.length === 1
                        ? '1 pagamento pendente'
                        : `${listaPendentes.length} pagamentos pendentes`
                  }
                />

                <Indicador
                  indice={indiceEntrada('kpis', 2)}
                  titulo="Campanhas Ativas"
                  valor={erroCampanhas ? '—' : String(contagens.ativo)}
                  icone={Layers}
                  caixa="bg-info/15 text-info"
                  rodapeClasse={erroCampanhas || erroPagamentos ? 'text-destructive' : undefined}
                  rodape={
                    erroCampanhas
                      ? 'Falha ao carregar as campanhas'
                      : erroPagamentos
                        ? 'Falha ao carregar os pagamentos'
                        : `${stats.colaboradoresPremiados} colaboradores premiados`
                  }
                />

                <Indicador
                  indice={indiceEntrada('kpis', 3)}
                  titulo="Conciliação (Divergências)"
                  valor={erroPagamentos ? '—' : String(stats.divergencias)}
                  icone={AlertTriangle}
                  caixa="bg-red-500/25 text-red-500"
                  rodapeClasse={
                    erroPagamentos
                      ? 'text-destructive'
                      : stats.divergencias > 0
                        ? 'font-medium text-red-500'
                        : 'text-muted-foreground'
                  }
                  rodape={
                    erroPagamentos
                      ? 'Falha ao carregar os pagamentos'
                      : stats.divergencias > 0
                        ? 'Requer atenção na auditoria'
                        : 'Todos os valores conciliados'
                  }
                  destaque={!erroPagamentos && stats.divergencias > 0}
                />

                {/* Visão geral: mesmo formato dos demais indicadores — ícone à
                    esquerda, título com o alternador e o detalhamento por status. */}
                <motion.div
                  {...entradaCard(indiceEntrada('kpis', 4))}
                  className="flex min-w-0 items-center gap-2.5 rounded-[14px] border border-border/50 bg-gradient-to-b from-card to-card/60 p-3"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-info/15 text-info">
                    <Target className="h-[18px] w-[18px]" />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <p className="flex-1 truncate text-[11px] font-medium leading-[17px] text-muted-foreground">
                        Visão geral
                      </p>
                      <button
                        type="button"
                        onClick={() => setVisaoGeralExpandida((v) => !v)}
                        aria-expanded={visaoGeralExpandida}
                        aria-label={
                          visaoGeralExpandida ? 'Recolher detalhamento das campanhas' : 'Detalhar campanhas por status'
                        }
                        className="text-muted-foreground transition-colors hover:text-primary"
                      >
                        <ChevronRight
                          className={cn('h-4 w-4 transition-transform', visaoGeralExpandida && 'rotate-90')}
                        />
                      </button>
                    </div>

                    {erroCampanhas || erroPagamentos ? (
                      <p className="text-[11px] leading-[17px] text-destructive">
                        Dados indisponíveis: a leitura do hub falhou.
                      </p>
                    ) : (
                      <>
                        <p className="text-[11px] leading-[17px]">
                          {contagens.todos === 1 ? '1 campanha' : `${contagens.todos} campanhas`}
                          {` · ${contagens.ativo} ${contagens.ativo === 1 ? 'ativa' : 'ativas'}`}
                        </p>
                        <p className="text-[11px] leading-[17px] text-muted-foreground">
                          {listaPendentes.length} {listaPendentes.length === 1 ? 'pendente' : 'pendentes'} ·{' '}
                          {stats.divergencias} {stats.divergencias === 1 ? 'divergência' : 'divergências'}
                        </p>

                        {visaoGeralExpandida && (
                          <ul className="mt-0.5 grid grid-cols-2 gap-x-3 gap-y-0.5 border-t border-border/30 pt-1.5 text-[11px] text-muted-foreground">
                            <li>Finalizadas: {contagens.finalizado}</li>
                            <li>Rascunhos: {contagens.rascunho}</li>
                            <li>Suspensas: {contagens.suspenso}</li>
                            <li>Orçamento: {formatCurrency(stats.orcamentoConsolidado)}</li>
                          </ul>
                        )}
                      </>
                    )}
                  </div>
                </motion.div>
              </div>
            )}

            <TabsContent value="campanhas" className="space-y-3.5">
              {/* 3 · Busca, filtros rápidos, ordenação e período. Com a leitura
                  das campanhas falha a barra sai de cena: os contadores dos chips
                  seriam zeros inventados. */}
              {!erroCampanhas && (
                <div className="flex min-h-[64px] min-w-0 flex-col gap-3 rounded-[14px] border border-border/50 bg-card/60 px-4 py-3 xl:flex-row xl:items-center xl:gap-6">
                  <div className="flex min-w-0 flex-wrap items-center gap-3 lg:flex-nowrap xl:flex-1">
                    <motion.div
                      {...entradaCard(indiceEntrada('filtros', 0))}
                      className="relative w-full min-w-[160px] lg:flex-1"
                    >
                      <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={filtros.busca}
                        onChange={(e) => atualizarFiltros({ busca: e.target.value })}
                        placeholder="Buscar campanhas..."
                        aria-label="Buscar campanhas"
                        className="h-10 rounded-xl border-border/50 bg-background pl-10 text-[13px]"
                      />
                    </motion.div>

                    {/* Chips de status: MESMO chip colorido da Gestão de Desempenho. */}
                    <div className="flex min-w-0 flex-wrap items-center gap-3">
                      {[
                        { label: 'Todos', valor: 'todos' as const, tema: TEMA_TODOS, total: contagens.todos },
                        {
                          label: 'Ativas',
                          valor: 'ativo' as const,
                          tema: PALETAS_CHIP.emerald,
                          total: contagens.ativo,
                        },
                        {
                          label: 'Finalizadas',
                          valor: 'finalizado' as const,
                          tema: PALETAS_CHIP.blue,
                          total: contagens.finalizado,
                        },
                        {
                          label: 'Rascunhos',
                          valor: 'rascunho' as const,
                          tema: PALETAS_CHIP.amber,
                          total: contagens.rascunho,
                        },
                      ].map((chip, indiceChip) => (
                        <motion.div key={chip.valor} {...entradaCard(indiceEntrada('filtros', 1 + indiceChip))}>
                          <ColoredFilterChip
                            label={chip.label}
                            count={chip.total}
                            tema={chip.tema}
                            selected={filtros.status === chip.valor}
                            onClick={() => atualizarFiltros({ status: chip.valor })}
                          />
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  <div className="flex min-w-0 flex-wrap items-center justify-end gap-3">
                    <motion.div
                      {...entradaCard(indiceEntrada('filtros', 5))}
                      className="flex h-10 items-center gap-2.5 rounded-xl border border-border/50 bg-background pl-3.5 pr-1"
                    >
                      <span className="whitespace-nowrap text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
                        Ordenar por
                      </span>
                      <Select
                        value={filtros.ordenacao}
                        onValueChange={(valor) => atualizarFiltros({ ordenacao: valor as OrdenacaoCampanha })}
                      >
                        <SelectTrigger
                          aria-label="Ordenar por"
                          className="h-10 w-[132px] border-0 bg-transparent px-2 text-[13px] focus:ring-0"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent align="end">
                          {ORDENACAO_ROTULOS.map((opcao) => (
                            <SelectItem key={opcao.valor} value={opcao.valor} className="text-xs">
                              {opcao.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </motion.div>

                    <motion.div
                      {...entradaCard(indiceEntrada('filtros', 6))}
                      className="flex h-10 items-center gap-2.5 rounded-xl border border-border/50 bg-background pl-3.5 pr-1"
                    >
                      <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <Select
                        value={filtros.periodo}
                        onValueChange={(valor) => atualizarFiltros({ periodo: valor as FiltroPeriodoCampanha })}
                      >
                        <SelectTrigger
                          aria-label="Período"
                          className="h-10 w-[118px] border-0 bg-transparent px-2 text-[13px] focus:ring-0"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent align="end">
                          {OPCOES_PERIODO.map((opcao) => (
                            <SelectItem key={opcao.valor} value={opcao.valor} className="text-xs">
                              {opcao.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </motion.div>
                  </div>
                </div>
              )}

              {/* 4 · Área principal: tabela (~80%) + lateral (~20%, mín. 212px). */}
              <div className="grid min-w-0 grid-cols-1 items-stretch gap-3.5 xl:grid-cols-[minmax(0,4.2fr)_minmax(212px,0.82fr)]">
                <CampanhaTabela
                  linhas={linhasVisiveis}
                  total={campanhasFiltradas.length}
                  pagina={paginaAtual}
                  porPagina={POR_PAGINA}
                  onPaginaChange={setPagina}
                  ordenacaoAtual={filtros.ordenacao}
                  onAbrirDetalhes={setDetalhe}
                  onVerPagamentos={() => irParaAba('pagamentos')}
                  onExportar={() => handleExport('csv')}
                  mensagemVazia={mensagemVazia}
                  podeGerir={podeGerirCampanhas}
                  onLancarRascunho={(id) => lancarRascunho.mutate(id)}
                  onExcluirRascunho={(id, nome) => setRascunhoExcluir({ id, nome })}
                  rascunhoOcupado={lancarRascunho.isPending || excluirRascunho.isPending}
                  pagamentosCarregando={loadPagamentos}
                  erro={erroCampanhas}
                  onTentarNovamente={() => void recarregarCampanhas()}
                />

                {/* `xl:contain-size`: a coluna não contribui com a própria altura
                    no cálculo da linha (só a tabela manda). */}
                <div className="min-w-0 xl:contain-size xl:min-h-0">
                  <CampanhaLateral
                    acoes={acoesPendentes}
                    eventos={atividadeRecente}
                    onNavegar={irParaAba}
                    erroAcoes={erroCampanhas || erroPagamentos}
                    onRecarregarAcoes={() => {
                      if (erroCampanhas) void recarregarCampanhas();
                      if (erroPagamentos) void recarregarPagamentos();
                    }}
                    erroEventos={erroAuditoria}
                    onRecarregarEventos={() => void recarregarAuditoria()}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="simulador" className="space-y-6">
              <RewardsSimulator />
            </TabsContent>

            <TabsContent value="pagamentos" className="space-y-6">
              <PagamentosTab
                pagamentos={pagamentosHub}
                auditoria={auditoriaHub}
                campanhas={campanhasHub}
                onNavegar={irParaAba}
                erro={erroPagamentos}
                onTentarNovamente={() => void recarregarPagamentos()}
              />
            </TabsContent>

            <TabsContent value="auditoria" className="space-y-6">
              <AuditoriaTab
                auditoria={auditoriaHub}
                pagamentos={pagamentosHub}
                campanhas={campanhasHub}
                carregando={loadAuditoria}
                erro={erroAuditoria}
                onTentarNovamente={() => void recarregarAuditoria()}
                onExportar={handleExport}
              />
            </TabsContent>
          </Tabs>
        </EntradaPresenca>

        {podeGerirCampanhas && (
          <CampaignWizard isOpen={isWizardOpen} onClose={() => setIsWizardOpen(false)} empresaId={empresaAtual?.id} />
        )}

        <CampanhaDetalhesDialog
          linha={detalhe}
          pagamentos={pagamentosHub}
          onClose={() => setDetalhe(null)}
          onVerPagamentos={() => irParaAba('pagamentos')}
        />

        <AlertDialog open={rascunhoExcluir !== null} onOpenChange={(o) => !o && setRascunhoExcluir(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir rascunho?</AlertDialogTitle>
              <AlertDialogDescription>
                O rascunho "{rascunhoExcluir?.nome}" e as regras dele serão excluídos permanentemente. Esta ação não
                pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={excluirRascunho.isPending}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                disabled={excluirRascunho.isPending}
                onClick={(e) => {
                  e.preventDefault();
                  if (rascunhoExcluir) excluirRascunho.mutate(rascunhoExcluir.id);
                }}
              >
                {excluirRascunho.isPending ? 'Excluindo...' : 'Excluir'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </PageLayout>
    </MotionConfig>
  );
}
