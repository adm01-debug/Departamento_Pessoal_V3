import React from 'react';
import { motion, MotionConfig } from 'framer-motion';
import { PageLayout } from '@/components/layout';
import { PageTitle } from '@/components/PageTitle';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { AnimatedTabsList, AnimatedTabsTrigger } from '@/components/ui/animated-tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ColoredFilterChip } from '@/components/avaliacao/ColoredFilterChip';
import { PALETAS_CHIP, TEMA_TODOS } from '@/components/avaliacao/chipFiltroComum';
import { EntradaPresenca, entradaCard } from '@/components/premiacoes/premiacoesEntrada';
import { MOTION_REDUCED_MODE } from '@/lib/motionMode';
import {
  AlertTriangle,
  ArrowUpRight,
  Calculator,
  CalendarDays,
  ChevronRight,
  Clock,
  DollarSign,
  History,
  Layers,
  Plus,
  Search,
  ShieldCheck,
  Target,
  Trophy,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { premiacoesService } from '@/services/premiacoesService';
import { useEmpresas } from '@/hooks';
import { Skeleton } from '@/components/ui/skeleton';
import { RewardsSimulator } from '@/components/premiacoes/RewardsSimulator';
import { CampaignWizard } from '@/components/premiacoes/CampaignWizard';
import { CampanhaTabela } from '@/components/premiacoes/CampanhaTabela';
import { CampanhaLateral } from '@/components/premiacoes/CampanhaLateral';
import { CampanhaDetalhesDialog } from '@/components/premiacoes/CampanhaDetalhesDialog';
import { Indicador } from '@/components/premiacoes/IndicadorPremiacoes';
import { PagamentosTab } from '@/components/premiacoes/PagamentosTab';
import { PainelAuditoriaRoi } from '@/components/premiacoes/PainelAuditoriaRoi';
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
import { formatCurrency, formatDateTime } from '@/utils/format';
import { toast } from 'sonner';
// MOCK VISUAL — ver src/mocks/premiacoesMock.ts.
import {
  bloquearEscritaPremiacoes,
  getMockAuditoriaPremiacoes,
  getMockCampanhas,
  getMockPagamentos,
  isPremiacoesMockEnabled,
  simularExportacaoPremiacoes,
} from '@/mocks/premiacoesMock';

/* ─── Parâmetros da tela ───────────────────────────────────────────────────── */

/** Campanhas por página na tabela (paginação LOCAL — a API não pagina). */
const POR_PAGINA = 8;

/** Seções do hub, na ordem da barra superior (rota real de cada aba). */
const ABAS: { valor: string; label: string; icone: typeof Trophy }[] = [
  { valor: 'campanhas', label: 'Campanhas', icone: Trophy },
  { valor: 'pagamentos', label: 'Pagamentos', icone: DollarSign },
  { valor: 'simulador', label: 'Simulador ROI', icone: Calculator },
  { valor: 'auditoria', label: 'Auditoria', icone: ShieldCheck },
];

/**
 * Pele das abas — a MESMA do módulo Gestão de Desempenho (`AvaliacaoPage`), para
 * que as tablists do produto sejam UM único padrão visual. Quem pinta a aba ativa
 * é o indicador deslizante do `ui/animated-tabs` (`rounded-lg bg-background`),
 * NUNCA o botão: por isso não há fundo próprio nem `::after` (linha inferior
 * lime) aqui.
 *
 * `group` + `data-[state=active]` fazem o ícone (lime) e o texto (claro)
 * reagirem à seleção — os três conjuntos abaixo são idênticos aos do módulo de
 * referência, preservando apenas os ícones/rótulos próprios de Campanhas.
 */
const CLASSE_ABA =
  'group relative inline-flex h-8 shrink-0 items-center justify-center whitespace-nowrap gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset disabled:pointer-events-none disabled:opacity-50 lg:w-full';
const CLASSE_ABA_ICONE =
  'h-3.5 w-3.5 shrink-0 text-muted-foreground transition-colors group-data-[state=active]:text-primary';
const CLASSE_ABA_TEXTO =
  'min-w-0 truncate text-muted-foreground transition-colors group-data-[state=active]:text-foreground';

/** Filtro de período — todos os recortes usam as datas reais da campanha. */
const OPCOES_PERIODO: { valor: FiltroPeriodoCampanha; label: string }[] = [
  { valor: 'todos', label: 'Todos' },
  { valor: 'mes_atual', label: 'Mês atual' },
  { valor: 'ultimos_90', label: 'Últimos 90 dias' },
  { valor: 'ano_atual', label: 'Ano atual' },
];

/* ─── Indicadores (blocos compactos da faixa superior) ──────────────────────
 * O componente do cartão mora em `premiacoes/IndicadorPremiacoes.tsx` — é o
 * MESMO cartão usado pelos indicadores financeiros da aba Pagamentos. */


export default function PremiacoesPage() {
  const { empresaAtual } = useEmpresas();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = React.useState('campanhas');

  /**
   * Cada ativação da aba Simulador ROI recebe um token novo. Os KPIs usam esse
   * token para rodar a contagem UMA vez por acesso — inclusive se o subtree
   * remontar durante transições do React — e voltam a contar quando o usuário
   * sai e retorna à aba.
   */
  const selecionarAba = (valor: string) => {
    if (valor === 'simulador') {
      try {
        sessionStorage.setItem('dp-premiacoes-roi-kpi-acesso', String(Date.now()));
      } catch {
        /* sessionStorage indisponível: a contagem segue pelo guard de mount */
      }
    }
    setActiveTab(valor);
  };

  const [isWizardOpen, setIsWizardOpen] = React.useState(false);
  const [periodoFiltro, setPeriodoFiltro] = React.useState('Todos os Períodos');
  const [unidadeFiltro, setUnidadeFiltro] = React.useState('Todas as Unidades');
  const [faixaMetaFiltro, setFaixaMetaFiltro] = React.useState('Todas');

  // Estado da aba Campanhas: filtros (busca/status/período/ordenação), página
  // local e a campanha aberta no diálogo de detalhes.
  const [filtros, setFiltros] = React.useState<FiltrosHub>(FILTROS_HUB_INICIAIS);
  const [pagina, setPagina] = React.useState(1);
  const [detalhe, setDetalhe] = React.useState<MetricasCampanha | null>(null);
  const [visaoGeralExpandida, setVisaoGeralExpandida] = React.useState(false);

  // MOCK VISUAL — ver src/mocks/premiacoesMock.ts. Com o mock ligado, cada
  // leitura curto-circuita o Supabase e `enabled` também vale sem empresa ativa.
  const mockAtivo = isPremiacoesMockEnabled();
  const { data: campanhas = [], isLoading: loadCampanhas } = useQuery({
    queryKey: ['premiacoes_campanhas', empresaAtual?.id],
    queryFn: async (): Promise<any[]> => getMockCampanhas() ?? (await premiacoesService.listarCampanhas(empresaAtual!.id)),
    enabled: !!empresaAtual?.id || mockAtivo
  });

  const { data: pagamentos = [], isLoading: loadPagamentos } = useQuery({
    queryKey: ['premiacoes_pagamentos', empresaAtual?.id],
    queryFn: async (): Promise<any[]> => getMockPagamentos() ?? (await premiacoesService.listarPagamentos(undefined, empresaAtual!.id)),
    enabled: !!empresaAtual?.id || mockAtivo
  });

  const { data: auditoria = [], isLoading: loadAuditoria } = useQuery({
    queryKey: ['premiacoes_auditoria', empresaAtual?.id],
    queryFn: async (): Promise<any[]> => getMockAuditoriaPremiacoes() ?? (await premiacoesService.listarAuditoria(undefined, empresaAtual!.id)),
    enabled: !!empresaAtual?.id || mockAtivo
  });

  const updateStatusMutation = useMutation({
    // MOCK VISUAL — ver src/mocks/premiacoesMock.ts. Aborta a escrita no modo demo.
    mutationFn: ({ id, status, valor }: { id: string, status: string, valor?: number }) => {
      if (bloquearEscritaPremiacoes('Atualizar status do pagamento')) return Promise.reject(new Error('mock'));
      return premiacoesService.atualizarStatusPagamento(id, status, empresaAtual!.id, valor);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['premiacoes_pagamentos'] });
      queryClient.invalidateQueries({ queryKey: ['premiacoes_auditoria'] });
      toast.success("Status atualizado e registrado na auditoria.");
    }
  });

  const handleExport = async (format: 'csv' | 'pdf') => {
    // MOCK VISUAL — ver src/mocks/premiacoesMock.ts. Evita chamar
    // `listarPagamentos` com empresa inexistente; apenas confirma no toast.
    const totalFicticio = simularExportacaoPremiacoes();
    if (totalFicticio !== undefined) {
      toast.success(`Relatório ${format.toUpperCase()} gerado (demonstração).`, {
        description: `${totalFicticio} registros fictícios exportados.`,
      });
      return;
    }
    toast.promise(
      premiacoesService.exportarRelatorio({
        empresaId: empresaAtual?.id,
        periodo: periodoFiltro,
        unidade: unidadeFiltro,
        faixaMeta: faixaMetaFiltro,
        versao: '1.2.5-stable'
      }),
      {
        loading: `Gerando relatório ${format.toUpperCase()} com filtros aplicados...`,
        success: "Relatório gerado com sucesso! Trilha de auditoria incluída.",
        error: "Erro ao gerar relatório."
      }
    );
  };

  const handleSyncFolha = () => {
    toast.info("Iniciando sincronização com a Folha de Pagamento...", {
      description: "Os pagamentos aprovados serão integrados ao próximo ciclo disponível."
    });
    setTimeout(() => {
      toast.success("Sincronização concluída!", {
        description: "12 registros foram enviados para a folha de Maio/2026."
      });
    }, 2000);
  };

  if (loadCampanhas) return <div className="p-8"><Skeleton className="h-[400px] w-full" /></div>;

  // Toda a inteligência da aba Campanhas vem de `premiacoesComum` (funções
  // puras): as métricas usam os pagamentos já carregados, o "hoje" é fixado uma
  // vez por render da página e nada é recalculado dentro do JSX.
  const hoje = new Date();
  const metricasCampanhas = montarMetricas(campanhas as CampanhaHub[], pagamentos as PagamentoHub[], hoje);
  const contagens = contarPorStatus(metricasCampanhas);
  const campanhasFiltradas = filtrarEOrdenarCampanhas(metricasCampanhas, filtros, hoje);
  // Paginação LOCAL: a página pedida é recortada para a faixa válida, então
  // mudar o filtro nunca deixa a tabela numa página vazia/inexistente.
  const { pagina: paginaAtual, linhas: linhasVisiveis } = paginarCampanhas(campanhasFiltradas, pagina, POR_PAGINA);
  const acoesPendentes = montarAcoesPendentes(metricasCampanhas, pagamentos as PagamentoHub[]);
  const atividadeRecente = montarAtividadeRecente(
    auditoria as AuditoriaHub[],
    campanhas as CampanhaHub[],
    pagamentos as PagamentoHub[],
    4,
  );

  /* ─── Indicadores (mesmas fontes de sempre, só reorganizadas) ───────────── */

  const totalAprovado = pagamentos.reduce((acc: number, p: any) => acc + numero(p.valor_aprovado), 0);
  const listaPendentes = pagamentos.filter((p: any) => (STATUS_PAGAMENTO_PENDENTE as readonly string[]).includes(p.status));
  const totalPendente = listaPendentes.reduce((acc: number, p: any) => acc + numero(p.valor_calculado), 0);
  const variacaoAprovado = calcularVariacaoMensal(pagamentos as PagamentoHub[], hoje);
  const divergencias = pagamentos.filter((p: any) => p.status_conciliacao === 'divergente').length;
  const orcamentoConsolidado = metricasCampanhas.reduce((acc, m) => acc + m.orcamentoTotal, 0);

  const atualizarFiltros = (patch: Partial<FiltrosHub>) => {
    setFiltros((atual) => ({ ...atual, ...patch }));
    setPagina(1);
  };
  const irParaAba = (destino: string) => {
    setDetalhe(null);
    selecionarAba(destino);
  };

  const mensagemVazia =
    campanhas.length === 0
      ? 'Nenhuma campanha cadastrada ainda. Use “Nova Campanha” para criar a primeira.'
      : 'Nenhuma campanha corresponde aos filtros aplicados.';

  return (
    // Mesmo comportamento de movimento reduzido das telas que já usam a cascata
    // do Dashboard (`DesligamentosPage`): com `prefers-reduced-motion` ligado a
    // Motion mantém o fade e desliga o deslocamento — conteúdo 100% visível.
    <MotionConfig reducedMotion={MOTION_REDUCED_MODE}>
      <PageTitle title="Premiações & Renda Variável 10/10" description="Gestão estratégica de incentivos e alta performance organizacional" />
      {/* `max-w-none` + `space-y-3.5` (14px): a página usa toda a largura útil e o
          espaçamento entre blocos principais é o da especificação (§3.1/§3.2). */}
      <PageLayout className="max-w-none space-y-3.5">
        {/* Toda a área visual entra em cascata com a MESMA linguagem dos KPI Cards
            do Dashboard Executivo, na cadência própria do hub
            (`premiacoesEntrada.ts`). `EntradaPresenca` é obrigatória aqui: o
            `AnimatePresence initial={false}` do
            `PageTransition` bloqueia o keyframe `hidden` de qualquer `motion.*`
            descendente — o `AnimatePresence` aninhado (sem props) devolve a
            cascata à subárvore e NÃO renderiza DOM (layout idêntico). */}
        <EntradaPresenca>
        {/* Cabeçalho (§4): ícone 50×50 raio 14 · gap 14 · título 30px/600 · subtítulo 18px */}
        <header className="flex items-center gap-3.5">
          <motion.div
            {...entradaCard(indiceEntrada('cabecalho', 0))}
            className="flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-[14px] bg-gradient-to-br from-amber-500 to-orange-600"
          >
            <Trophy className="h-6 w-6 text-primary-foreground" />
          </motion.div>
          <div className="min-w-0">
            <motion.h1
              {...entradaCard(indiceEntrada('cabecalho', 1))}
              className="text-[30px] font-semibold leading-9 tracking-tight"
            >
              Hub de Premiações
            </motion.h1>
            <motion.p
              {...entradaCard(indiceEntrada('cabecalho', 2))}
              className="text-[18px] leading-6 text-muted-foreground"
            >
              Campanhas, Metas e ROI de Capital Humano
            </motion.p>
          </div>
        </header>

        <Tabs value={activeTab} onValueChange={selecionarAba} className="space-y-3.5">
          {/* 1 · Navegação das seções (§5): a MESMA tablist de Gestão de Desempenho
              (`ui/animated-tabs` — contêiner azul-marinho arredondado, `p-1`, aba
              ativa como pílula escura que desliza, ícone lime e texto claro),
              preservando ícones e rótulos próprios de Campanhas. O botão Exportar
              saiu desta barra (não existe na referência) — a exportação continua
              acessível pelas ações da tabela de Campanhas e pelos botões CSV/PDF
              do Painel Gerencial de Auditoria (aba Auditoria). */}
          <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center">
            {/* Wrapper = ITEM FLEX da linha (o `AnimatedTabsList` renderiza um
                `div` por fora das classes de `containerClassName`, então o
                `lg:flex-1`/`lg:min-w-0` de dentro não alcançam o item flex). */}
            {/* O wrapper da tablist é UMA unidade da cascata. Os triggers em si
                NÃO recebem `motion` individual: o indicador deslizante do
                `ui/animated-tabs` mede `getBoundingClientRect()` do trigger ativo
                e um `y` por aba deslocaria essa medida (o indicador ficaria
                desalinhado depois da entrada). Animar o wrapper preserva o
                indicador 100% e mantém a barra na sequência da página. */}
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

            {/* Nova Campanha no extremo direito, na MESMA altura externa (h-11) da
                barra de abas — mantendo o amarelo-lima e a criação de campanhas.
                O wrapper é o ITEM FLEX (leva o `w-full`/`lg:w-[200px]`), então o
                botão continua com a mesma largura e o mesmo alinhamento. */}
            <motion.div
              {...entradaCard(indiceEntrada('navegacao', 1))}
              className="w-full shrink-0 lg:w-[200px]"
            >
              <Button
                onClick={() => setIsWizardOpen(true)}
                className="h-11 w-full shrink-0 gap-2 rounded-xl bg-primary px-5 text-[14px] font-semibold text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="h-[18px] w-[18px]" /> Nova Campanha
              </Button>
            </motion.div>
          </div>
          {/* 2 · Indicadores + visão geral (§6): uma linha, cartões compactos com
              ícone à esquerda e informação à direita.
              Só nas abas que falam de CAMPANHAS: a aba Pagamentos tem a própria
              faixa de indicadores FINANCEIROS (IMAGEM 4 — quatro cartões do mesmo
              padrão dimensional), então a faixa genérica não é duplicada lá. */}
          {activeTab !== 'pagamentos' && (
          <div className="grid min-w-0 grid-cols-1 gap-3 min-[640px]:grid-cols-2 min-[1024px]:grid-cols-3 min-[1440px]:grid-cols-5">
            <Indicador
              indice={indiceEntrada('kpis', 0)}
              titulo="Total Aprovado"
              valor={formatCurrency(totalAprovado)}
              icone={DollarSign}
              caixa="bg-success/15 text-success"
              rodape={
                variacaoAprovado ? (
                  <span className="flex items-center gap-1 font-medium text-success">
                    <ArrowUpRight className="h-3 w-3" />
                    {variacaoAprovado.percentual >= 0 ? '+' : ''}
                    {variacaoAprovado.percentual.toFixed(1).replace('.', ',')}% vs mês anterior
                  </span>
                ) : (
                  'Sem base de comparação'
                )
              }
            />

            <Indicador
              indice={indiceEntrada('kpis', 1)}
              titulo="Pendente de Aprovação"
              valor={formatCurrency(totalPendente)}
              icone={Clock}
              caixa="bg-warning/15 text-warning"
              rodape={
                listaPendentes.length === 1
                  ? '1 pagamento pendente'
                  : `${listaPendentes.length} pagamentos pendentes`
              }
            />

            <Indicador
              indice={indiceEntrada('kpis', 2)}
              titulo="Campanhas Ativas"
              valor={String(contagens.ativo)}
              icone={Layers}
              caixa="bg-info/15 text-info"
              rodape={`de ${contagens.todos} ${contagens.todos === 1 ? 'campanha' : 'campanhas'}`}
            />

            <Indicador
              indice={indiceEntrada('kpis', 3)}
              titulo="Conciliação (Divergências)"
              valor={String(divergencias)}
              icone={AlertTriangle}
              caixa="bg-red-500/25 text-red-500"
              rodapeClasse={divergencias > 0 ? 'font-medium text-red-500' : 'text-muted-foreground'}
              rodape={divergencias > 0 ? 'Requer atenção na auditoria' : 'Todos os valores conciliados'}
              destaque={divergencias > 0}
            />

            {/* Visão geral (§6.5): mesmo formato dos demais indicadores — ícone à
                ESQUERDA e o texto à direita (título na 1ª linha com o alternador,
                campanhas na 2ª e pendências na 3ª); nunca mais alto que os
                outros cartões. */}
            <motion.div
              {...entradaCard(indiceEntrada('kpis', 4))}
              className="flex min-w-0 items-center gap-2.5 rounded-[14px] border border-border/50 bg-gradient-to-b from-card to-card/60 p-3"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-info/15 text-info">
                <Target className="h-[18px] w-[18px]" />
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex items-center gap-2">
                  <p className="flex-1 truncate text-[11px] font-medium leading-[17px] text-muted-foreground">Visão geral</p>
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

                <p className="text-[11px] leading-[17px]">
                  {contagens.todos === 1 ? '1 campanha' : `${contagens.todos} campanhas`}
                  {` · ${contagens.ativo} ${contagens.ativo === 1 ? 'ativa' : 'ativas'}`}
                </p>
                <p className="text-[11px] leading-[17px] text-muted-foreground">
                  {listaPendentes.length} {listaPendentes.length === 1 ? 'pendente' : 'pendentes'} ·{' '}
                  {divergencias} {divergencias === 1 ? 'divergência' : 'divergências'}
                </p>

                {visaoGeralExpandida && (
                  <ul className="mt-0.5 grid grid-cols-2 gap-x-3 gap-y-0.5 border-t border-border/30 pt-1.5 text-[11px] text-muted-foreground">
                    <li>Finalizadas: {contagens.finalizado}</li>
                    <li>Rascunhos: {contagens.rascunho}</li>
                    <li>Suspensas: {contagens.suspenso}</li>
                    <li>Orçamento: {formatCurrency(orcamentoConsolidado)}</li>
                  </ul>
                )}
              </div>
            </motion.div>
          </div>
          )}

          <TabsContent value="campanhas" className="space-y-3.5">
            {/* 3 · Busca, filtros rápidos, ordenação e período (§7).
                DOIS GRUPOS: à ESQUERDA a busca (que CRESCE para absorver a folga)
                com os filtros de status compactos logo ao lado; à DIREITA, sem
                folga artificial, a ordenação e o período. Em telas estreitas o
                grupo da direita desce inteiro — nada de sobreposição/corte. */}
            <div className="flex min-h-[64px] min-w-0 flex-col gap-3 rounded-[14px] border border-border/50 bg-card/60 px-4 py-3 xl:flex-row xl:items-center xl:gap-6">
              <div className="flex min-w-0 flex-wrap items-center gap-3 lg:flex-nowrap xl:flex-1">
                {/* Busca: `lg:flex-1` faz o campo ocupar todo o espaço que sobra
                    entre os chips e o grupo da direita (a `min-width` o mantém
                    legível em telas estreitas, onde ele ocupa a linha inteira). */}
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

                {/* Filtros de status: MESMO chip colorido da Gestão de Desempenho
                    (`avaliacao/ColoredFilterChip` + `PALETAS_CHIP`) — pill de 32px,
                    com bolinha, texto e contador na cor da categoria; só o nome, a
                    contagem e a cor variam. Sem `shrink-0` de grupo: assim eles
                    QUEBRAM por dentro em telas estreitas em vez de estourar a barra. */}
                <div className="flex min-w-0 flex-wrap items-center gap-3">
                  {[
                    { label: 'Todos', valor: 'todos' as const, tema: TEMA_TODOS, total: contagens.todos },
                    { label: 'Ativas', valor: 'ativo' as const, tema: PALETAS_CHIP.emerald, total: contagens.ativo },
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
                    // O chip é um `<button>` do design system (sem `motion`), então
                    // cada um entra por dentro de um wrapper que é o ITEM FLEX —
                    // mesma largura de conteúdo, nenhuma mudança de layout.
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
            {/* 4 · Área principal (§8): tabela (~80%) + lateral (~20%, mín. 240px).
                `items-stretch` + `contain-size` na coluna lateral fazem a ALTURA
                DA LINHA ser ditada pela TABELA: a lateral recebe exatamente essa
                altura e rola por dentro (sem cortar conteúdo), terminando na
                MESMA linha horizontal da borda inferior da tabela. */}
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
              />

              {/* `xl:contain-size`: a coluna deixa de contribuir com a própria
                  altura intrínseca no cálculo da linha (só a tabela manda);
                  abaixo de `xl` as colunas empilham e a restrição não se aplica. */}
              <div className="min-w-0 xl:contain-size xl:min-h-0">
                <CampanhaLateral acoes={acoesPendentes} eventos={atividadeRecente} onNavegar={irParaAba} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="simulador" className="space-y-6">
            <RewardsSimulator />
          </TabsContent>

          <TabsContent value="pagamentos" className="space-y-6">
            {/* Aba Pagamentos — nova composição (IMAGEM 4): cabeçalho próprio,
                quatro indicadores financeiros, fluxo horizontal, filtros, tabela
                e coluna lateral (resumo, próximas ações e atividade). As escritas
                e os filtros são os MESMOS do quadro de aprovação anterior. */}
            <PagamentosTab
              pagamentos={pagamentos}
              auditoria={auditoria}
              campanhas={campanhas}
              onNavegar={irParaAba}
            />
            
          </TabsContent>

          <TabsContent value="auditoria" className="space-y-6">
            {/* Painel Gerencial de Auditoria & ROI v1.2 — REALOCADO da aba
                Pagamentos para a aba de AUDITORIA (o lugar dele, ao lado da
                trilha). A implementação é a MESMA (`PainelAuditoriaRoi`):
                filtros de período/unidade/meta, exportação CSV/PDF e a tabela
                consolidada sobre os pagamentos reais. */}
            <PainelAuditoriaRoi
              pagamentos={pagamentos}
              periodoFiltro={periodoFiltro}
              unidadeFiltro={unidadeFiltro}
              faixaMetaFiltro={faixaMetaFiltro}
              onPeriodoFiltroChange={setPeriodoFiltro}
              onUnidadeFiltroChange={setUnidadeFiltro}
              onFaixaMetaFiltroChange={setFaixaMetaFiltro}
              onExportar={handleExport}
            />

            <Card className="border-border/30 rounded-2xl overflow-hidden shadow-xs">
              <CardHeader className="bg-muted/30 border-b border-border/30 py-4">
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-primary" />
                  <CardTitle className="text-base">Trilha de Auditoria de Premiações</CardTitle>
                </div>
                <CardDescription className="text-xs">Histórico completo de alterações, aprovações e integrações</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/20 border-b border-border/10">
                        <th className="text-left p-4 font-medium text-[10px] uppercase text-muted-foreground">Data/Hora</th>
                        <th className="text-left p-4 font-medium text-[10px] uppercase text-muted-foreground">Usuário</th>
                        <th className="text-left p-4 font-medium text-[10px] uppercase text-muted-foreground">Ação</th>
                        <th className="text-left p-4 font-medium text-[10px] uppercase text-muted-foreground">Entidade</th>
                        <th className="text-left p-4 font-medium text-[10px] uppercase text-muted-foreground">Motivo/Detalhes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/10">
                      {auditoria.map((a: any) => (
                        <tr key={a.id} className="hover:bg-accent/5 transition-colors">
                          <td className="p-4 text-xs font-medium whitespace-nowrap">
                            {formatDateTime(a.created_at)}
                          </td>
                          <td className="p-4 text-xs">
                            RH / Admin
                          </td>
                          <td className="p-4">
                            <Badge variant="outline" className="text-[9px] font-medium uppercase">
                              {a.acao}
                            </Badge>
                          </td>
                          <td className="p-4 text-xs text-muted-foreground">
                            {a.entidade_tipo} ({a.entidade_id.substring(0, 8)})
                          </td>
                          <td className="p-4 text-xs italic">
                            {a.motivo}
                          </td>
                        </tr>
                      ))}
                      {auditoria.length === 0 && (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-muted-foreground italic">
                            Nenhum registro de auditoria encontrado.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        </EntradaPresenca>

        <CampaignWizard
          isOpen={isWizardOpen}
          onClose={() => setIsWizardOpen(false)}
          empresaId={empresaAtual?.id}
        />

        <CampanhaDetalhesDialog
          linha={detalhe}
          pagamentos={pagamentos as PagamentoHub[]}
          onClose={() => setDetalhe(null)}
          onVerPagamentos={() => irParaAba('pagamentos')}
        />
      </PageLayout>
    </MotionConfig>
  );
}
