import { PageTitle } from '@/components/PageTitle';
import { useRealTimeSubscription } from '@/hooks/useRealTimeSubscription';
import { PageLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuRadioGroup, DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';
import { Tabs } from '@base-ui-components/react/tabs';
import { KPICardSkeleton, ChartSkeleton } from '@/components/ui/module-skeleton';

import { useEmpresas } from '@/hooks/useEmpresas';
import { useExecutiveKPIs, useStrategicFinancials } from '@/hooks/useExecutiveDashboard';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3, TrendingUp, TrendingDown, Users, DollarSign, Calendar, Clock, Bell,
  ArrowUpRight, ArrowDownRight, Building2, ChevronDown,
  RefreshCw, AlertTriangle, ShieldCheck, Landmark, Wallet,
  Activity, UserPlus, UserMinus, Lightbulb, Minus, Layers, Briefcase, IdCard, UserCheck,
  Target, Scale, Info, FileText, MoreHorizontal
} from 'lucide-react';
import { AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cardVariants } from '@/components/dashboard/MetricCard';
import { DonutChart } from '@/components/dashboard/DonutChart';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { dashboardTooltips } from '@/constants/tooltips';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--warning))', 'hsl(var(--success))', 'hsl(var(--info))', 'hsl(var(--destructive))', 'hsl(var(--accent))'];

// Mesma animação de entrada dos cards do Dashboard (MetricCard.tsx): fade + subida de
// 20px, stagger de 0.08s por índice, 0.4s de duração — reaproveitada via `cardVariants`
// importado de lá (não uma cópia) para nunca divergir da referência.
const MotionCard = motion.create(Card);

// Rótulos exibidos nos dois dropdowns de período (DropdownMenu não tem um
// equivalente ao `<SelectValue />`, que mostrava o texto do item selecionado
// automaticamente — o rótulo precisa ser resolvido manualmente a partir de
// `periodo`).
const PERIODO_LABELS: Record<string, string> = { '3': '3 meses', '6': '6 meses', '12': '12 meses' };
const PERIODO_LABELS_CARD: Record<string, string> = { '3': 'Últimos 3 meses', '6': 'Últimos 6 meses', '12': 'Últimos 12 meses' };

// TODO: dados fictícios para visualizar o layout — remover quando os hooks reais retornarem dados
const USE_MOCK_DATA = true;

const MOCK_KPI_DATA = {
  totalAtivos: 142,
  evolucao: [
    { mes: 'Abr/26', admissoes: 6, demissoes: 4, saldo: 2 },
    { mes: 'Mai/26', admissoes: 5, demissoes: 3, saldo: 2 },
    { mes: 'Jun/26', admissoes: 8, demissoes: 5, saldo: 3 },
    { mes: 'Jul/26', admissoes: 4, demissoes: 6, saldo: -2 },
    { mes: 'Ago/26', admissoes: 7, demissoes: 4, saldo: 3 },
    { mes: 'Set/26', admissoes: 5, demissoes: 3, saldo: 2 },
  ],
  departamentos: [
    { nome: 'Operações', value: 42 },
    { nome: 'Comercial', value: 31 },
    { nome: 'Logística', value: 24 },
    { nome: 'Financeiro', value: 18 },
    { nome: 'TI', value: 15 },
    { nome: 'RH', value: 12 },
  ],
  custosMensal: [
    { mes: 'Abr/26', bruto: 560000, liquido: 452000, descontos: 108000 },
    { mes: 'Mai/26', bruto: 575000, liquido: 464000, descontos: 111000 },
    { mes: 'Jun/26', bruto: 590000, liquido: 476000, descontos: 114000 },
    { mes: 'Jul/26', bruto: 583000, liquido: 470000, descontos: 113000 },
    { mes: 'Ago/26', bruto: 601000, liquido: 485000, descontos: 116000 },
    { mes: 'Set/26', bruto: 612500, liquido: 494000, descontos: 118500 },
  ],
  totalFolhaAtual: 494000,
  variacaoFolha: 3.2,
  feriasPendentes: 18,
  afastamentosAtivos: 5,
  custoMedio: 3479,
  turnover: 2.8,
  absenteismo: 3.1,
  pontoPendentes: 9,
};

const MOCK_STRATEGIC_DATA = {
  projections: [
    { mes_ref: '2026-10-01', total_estimado: 618000 },
    { mes_ref: '2026-11-01', total_estimado: 625000 },
    { mes_ref: '2026-12-01', total_estimado: 753000 },
    { mes_ref: '2027-01-01', total_estimado: 610000 },
    { mes_ref: '2027-02-01', total_estimado: 615000 },
    { mes_ref: '2027-03-01', total_estimado: 622000 },
  ],
  budgets: [
    { departamento: 'Operações', valor_orcado: 205000 },
    { departamento: 'Comercial', valor_orcado: 150000 },
    { departamento: 'Logística', valor_orcado: 118000 },
    { departamento: 'Financeiro', valor_orcado: 88000 },
    { departamento: 'TI', valor_orcado: 75000 },
    { departamento: 'RH', valor_orcado: 58000 },
  ],
  actuals: { total_proventos: 612500, total_liquido: 494000, total_descontos: 118500 },
};

export default function DashboardExecutivoPage() {
  const navigate = useNavigate();
  const { empresaAtualId } = useEmpresas();
  const [periodo, setPeriodo] = useState('6');
  const [activeTab, setActiveTab] = useState('evolucao');

  const realKpis = useExecutiveKPIs(empresaAtualId ?? undefined, periodo);
  const realStrategic = useStrategicFinancials(empresaAtualId ?? undefined);
  const data = USE_MOCK_DATA ? MOCK_KPI_DATA : realKpis.data;
  const isLoading = USE_MOCK_DATA ? false : realKpis.isLoading;
  const refetch = realKpis.refetch;
  const strategic = USE_MOCK_DATA ? MOCK_STRATEGIC_DATA : realStrategic.data;
  const isStrategicLoading = USE_MOCK_DATA ? false : realStrategic.isLoading;

  // Subscribe to real-time updates for KPIs
  useRealTimeSubscription('colaboradores', ['executive-kpis', empresaAtualId, periodo], empresaAtualId ?? undefined);
  useRealTimeSubscription('folhas_pagamento', ['executive-kpis', empresaAtualId, periodo], empresaAtualId ?? undefined);
  useRealTimeSubscription('ferias', ['executive-kpis', empresaAtualId, periodo], empresaAtualId ?? undefined);
  useRealTimeSubscription('afastamentos', ['executive-kpis', empresaAtualId, periodo], empresaAtualId ?? undefined);

  const formatValue = (v: number, fmt: string) => {
    if (fmt === 'currency') return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
    if (fmt === 'percent') return `${v.toFixed(1)}%`;
    return v.toString();
  };

  const evolucao = data?.evolucao || [];
  const ultimoMes = evolucao[evolucao.length - 1];
  const penultimoMes = evolucao[evolucao.length - 2];
  const saldoPeriodo = evolucao.reduce((acc, e) => acc + e.saldo, 0);

  // Variação mês atual vs. mês anterior — mesma série já carregada em `evolucao`, sem dado novo.
  const pctDelta = (curr?: number, prev?: number) => {
    if (curr === undefined || prev === undefined || prev === 0) return undefined;
    return ((curr - prev) / Math.abs(prev)) * 100;
  };
  const admissoesDelta = pctDelta(ultimoMes?.admissoes, penultimoMes?.admissoes);
  const desligamentosDelta = pctDelta(ultimoMes?.demissoes, penultimoMes?.demissoes);
  const saldoDelta = pctDelta(ultimoMes?.saldo, penultimoMes?.saldo);

  // Mesma fórmula já usada no gráfico de "Turnover Mensal" abaixo, aplicada aos dois últimos meses.
  const turnoverSerieProxy = evolucao.map(e => (data && data.totalAtivos > 0) ? (e.demissoes / data.totalAtivos) * 100 : 0);
  const turnoverDeltaPP = turnoverSerieProxy.length >= 2
    ? turnoverSerieProxy[turnoverSerieProxy.length - 1] - turnoverSerieProxy[turnoverSerieProxy.length - 2]
    : undefined;
  // Série do gráfico de "Turnover no Período" — extraída para variável (era um `.map()`
  // inline no JSX) para dar um array estável ao `data` do AreaChart e à `key` do clip-path
  // de entrada (`turnoverSerie.length`), mesma técnica de `HeadcountOverviewCard.tsx`.
  const turnoverSerie = data?.evolucao?.map(e => ({ ...e, turnover: data.totalAtivos > 0 ? (e.demissoes / data.totalAtivos * 100).toFixed(1) : 0 })) || [];

  // Headcount ao fim de cada mês, calculado de trás pra frente a partir do total atual real
  // e do saldo (admissões - demissões) de cada mês — mesmos campos de `evolucao`, sem dado novo.
  const headcountEvolucao = (() => {
    const result: { mes: string; headcount: number; admissoes: number; demissoes: number; saldo: number }[] = new Array(evolucao.length);
    let current = data?.totalAtivos || 0;
    for (let i = evolucao.length - 1; i >= 0; i--) {
      const e = evolucao[i];
      result[i] = { mes: e.mes, headcount: current, admissoes: e.admissoes, demissoes: e.demissoes, saldo: e.saldo };
      current -= e.saldo;
    }
    return result;
  })();
  const headcountInicioPeriodo = (data?.totalAtivos || 0) - saldoPeriodo;
  const headcountDeltaPct = headcountInicioPeriodo > 0 ? (saldoPeriodo / headcountInicioPeriodo) * 100 : undefined;

  // Meta fixa definida na UI (não é um dado computado do backend) — usada tanto no badge do card
  // de Turnover quanto para avaliar, com o dado real de `data.turnover`, se está dentro do limite.
  const META_TURNOVER = 3.0;

  // TODO: revisar se a regra de negócio deveria considerar percentual (±2% sobre o
  // headcount, não o saldo absoluto).
  const tendenciaLabel = saldoPeriodo > 0 ? 'Tendência positiva' : saldoPeriodo < 0 ? 'Tendência negativa' : 'Tendência estável';
  const tendenciaDesc = saldoPeriodo > 0 ? 'Aumento consistente no período selecionado' : saldoPeriodo < 0 ? 'Redução consistente no período selecionado' : 'Quadro estável no período selecionado';

  // Deltas fictícios (mesma flag USE_MOCK_DATA do topo do arquivo) só para preencher a
  // variação de Absenteísmo e Pendências no layout — nenhum dado histórico equivalente
  // existe hoje em `evolucao` para calculá-los de verdade (ver headcountDeltaPct/turnoverDeltaPP
  // acima, que usam dados reais). Remover junto com USE_MOCK_DATA quando o backend expuser
  // a série histórica dessas duas métricas.
  const MOCK_ABSENTEISMO_DELTA_PP = -0.3;
  const MOCK_PENDENCIAS_DELTA_PCT = 28;

  type KpiTrend = { value: number; suffix: '%' | 'p.p.'; goodIfPositive: boolean };
  // `tone`: mesmo padrão de ícone plano usado no MetricCard.tsx do Dashboard principal
  // (bg-{cor}/10 text-{cor}, sem gradiente) — reaproveitado aqui em vez do
  // `bg-gradient-to-br` anterior para os dois dashboards seguirem a mesma linguagem visual.
  const kpis: { label: string; value: number; icon: typeof Users; tone: string; format: string; alert?: boolean; trend?: KpiTrend; tooltip: string }[] = [
    { label: 'Headcount', value: data?.totalAtivos || 0, icon: Users, tone: 'bg-primary/10 text-primary', format: 'number',
      trend: headcountDeltaPct !== undefined ? { value: headcountDeltaPct, suffix: '%', goodIfPositive: true } : undefined,
      tooltip: dashboardTooltips.dashboardExecutivo.kpis.headcount },
    { label: 'Folha Mensal', value: data?.totalFolhaAtual || 0, icon: DollarSign, tone: 'bg-success/10 text-success', format: 'currency',
      trend: data?.variacaoFolha !== undefined ? { value: data.variacaoFolha, suffix: '%', goodIfPositive: true } : undefined,
      tooltip: dashboardTooltips.dashboardExecutivo.kpis.folhaMensal },
    { label: 'Turnover', value: data?.turnover || 0, icon: RefreshCw, tone: 'bg-[hsl(var(--xp))]/10 text-[hsl(var(--xp))]', format: 'percent', alert: (data?.turnover || 0) > 10,
      trend: turnoverDeltaPP !== undefined ? { value: turnoverDeltaPP, suffix: 'p.p.', goodIfPositive: false } : undefined,
      tooltip: dashboardTooltips.dashboardExecutivo.kpis.turnover },
    { label: 'Absenteísmo', value: data?.absenteismo || 0, icon: Clock, tone: 'bg-info/10 text-info', format: 'percent', alert: (data?.absenteismo || 0) > 5,
      trend: USE_MOCK_DATA ? { value: MOCK_ABSENTEISMO_DELTA_PP, suffix: 'p.p.', goodIfPositive: false } : undefined,
      tooltip: dashboardTooltips.dashboardExecutivo.kpis.absenteismo },
    { label: 'Pendências', value: data?.feriasPendentes || 0, icon: Bell, tone: 'bg-warning/10 text-warning', format: 'number',
      trend: USE_MOCK_DATA ? { value: MOCK_PENDENCIAS_DELTA_PCT, suffix: '%', goodIfPositive: false } : undefined,
      tooltip: dashboardTooltips.dashboardExecutivo.kpis.pendencias },
  ];

  // Deltas fictícios (mesma flag/padrão de MOCK_ABSENTEISMO_DELTA_PP acima) para bater
  // exatamente com a referência visual do card "Movimentação no Período": 25%/-40%/100%,
  // com a cor sempre subindo=verde e descendo=vermelho (sem a inversão de "lower-better"
  // para Desligamentos, como a referência mostra). Os valores das três métricas (5/3/+2)
  // já vêm certos de `ultimoMes`, só a variação percentual e sua cor são fictícias aqui.
  const MOCK_ADMISSOES_DELTA_PCT = 25;
  const MOCK_DESLIGAMENTOS_DELTA_PCT = -40;
  const MOCK_SALDO_DELTA_PCT = 100;

  // Card "Movimentação no Período" — ícone ao lado do número (não em cima), rótulo e
  // variação logo abaixo, cada item numa linha própria (layout pedido explicitamente
  // pela referência visual, diferente do MiniStat empilhado/centralizado usado alhures).
  const movimentacaoItems: {
    label: string; value: number; icon: typeof UserPlus; tone: string; numberColor: string;
    deltaPct?: number; deltaDirection: 'higher-better' | 'lower-better'; showSign?: boolean;
  }[] = [
    { label: 'Admissões', value: ultimoMes?.admissoes || 0, icon: UserPlus, tone: 'bg-success/10 text-success', numberColor: 'text-success',
      deltaPct: USE_MOCK_DATA ? MOCK_ADMISSOES_DELTA_PCT : admissoesDelta, deltaDirection: 'higher-better' },
    { label: 'Desligamentos', value: ultimoMes?.demissoes || 0, icon: UserMinus, tone: 'bg-destructive/10 text-destructive', numberColor: 'text-destructive',
      deltaPct: USE_MOCK_DATA ? MOCK_DESLIGAMENTOS_DELTA_PCT : desligamentosDelta,
      deltaDirection: USE_MOCK_DATA ? 'higher-better' : 'lower-better' },
    { label: 'Saldo', value: ultimoMes?.saldo || 0, icon: TrendingUp, tone: 'bg-info/10 text-info', numberColor: 'text-info',
      deltaPct: USE_MOCK_DATA ? MOCK_SALDO_DELTA_PCT : saldoDelta, deltaDirection: 'higher-better', showSign: true },
  ];

  // Aba "Custos" — variação da folha líquida entre o primeiro e o último mês do
  // período selecionado (mesma forma de cálculo de `pctDelta`, mas ponta-a-ponta
  // em vez de mês-a-mês) e o mês com o maior aumento mensal dentro da série.
  const custosMensal = data?.custosMensal || [];
  const variacaoLiquidoPeriodo = custosMensal.length >= 2
    ? ((custosMensal[custosMensal.length - 1].liquido - custosMensal[0].liquido) / Math.abs(custosMensal[0].liquido)) * 100
    : undefined;
  // Faixas alinhadas ao texto do tooltip `dashboardTooltips.dashboardExecutivo.custos.tendencia`
  // (<5% estável, 5–15% moderada, >15% alta) — precisam mudar juntos se a regra de negócio mudar.
  const tendenciaCustosLabel = variacaoLiquidoPeriodo === undefined ? undefined
    : Math.abs(variacaoLiquidoPeriodo) < 5 ? 'Tendência estável'
    : Math.abs(variacaoLiquidoPeriodo) < 15 ? 'Tendência moderada'
    : 'Tendência alta';
  const tendenciaCustosDesc = variacaoLiquidoPeriodo === undefined ? undefined
    : variacaoLiquidoPeriodo >= 0 ? 'Crescimento gradual nos últimos meses' : 'Redução gradual nos últimos meses';
  const custosVariacoesMensais = custosMensal.map((c, i) => i === 0 ? undefined : ((c.liquido - custosMensal[i - 1].liquido) / Math.abs(custosMensal[i - 1].liquido)) * 100);
  const maiorVariacaoIdx = custosVariacoesMensais.reduce<number>((best, v, i) => (v !== undefined && (best === -1 || v > (custosVariacoesMensais[best] as number))) ? i : best, -1);
  const maiorVariacaoMes = maiorVariacaoIdx >= 0 ? custosMensal[maiorVariacaoIdx].mes : undefined;
  const maiorVariacaoValor = maiorVariacaoIdx >= 0 ? custosVariacoesMensais[maiorVariacaoIdx] : undefined;

  // "Provisões & Obrigações" — sem hook próprio ainda (mesmo padrão USE_MOCK_DATA do
  // restante do arquivo); fallback fora do mock estima cada encargo como proporção da
  // folha atual, só para o card não ficar zerado antes do backend expor esses valores.
  const MOCK_PROVISOES_DATA = { decimoTerceiro: 42600, ferias: 31800, feriasColaboradores: 6, inss: 48200, fgts: 26900 };
  const provisoes = USE_MOCK_DATA ? MOCK_PROVISOES_DATA : {
    decimoTerceiro: Math.round((data?.totalFolhaAtual || 0) / 12),
    ferias: Math.round((data?.totalFolhaAtual || 0) * 0.08),
    feriasColaboradores: data?.feriasPendentes || 0,
    inss: Math.round((data?.totalFolhaAtual || 0) * 0.20),
    fgts: Math.round((data?.totalFolhaAtual || 0) * 0.08),
  };

  // Aba "Estrutura" — sem hook/endpoint próprio ainda (mesmo padrão USE_MOCK_DATA do
  // restante do arquivo). Mapa da estrutura, amplitude de liderança, senioridade,
  // tipo de vínculo e tempo de casa não têm fonte real hoje; usa-se o mock sempre,
  // sem fallback calculado (diferente de `provisoes` acima), até o backend expor
  // esses agregados organizacionais.
  const MOCK_ESTRUTURA_DATA = {
    mapa: { departamentos: 6, times: 18, cargos: 37, liderancas: 9, niveis: 4 },
    amplitudeLideranca: {
      media: 11.8,
      liderancasAcimaDaFaixa: 1,
      faixas: [
        { label: 'Até 5', pct: 27 },
        { label: '6 – 10', pct: 34 },
        { label: '11 – 15', pct: 26 },
        { label: '16+', pct: 13 },
      ],
    },
    senioridade: [
      { nome: 'Júnior', pct: 28 },
      { nome: 'Pleno', pct: 20 },
      { nome: 'Sênior', pct: 24 },
      { nome: 'Especialista', pct: 16 },
      { nome: 'Liderança', pct: 12 },
    ],
    tipoVinculo: [
      { nome: 'CLT', value: 111 },
      { nome: 'PJ', value: 17 },
      { nome: 'Estágio', value: 7 },
      { nome: 'Aprendiz', value: 4 },
      { nome: 'Temporário', value: 3 },
    ],
    tempoDeCasa: [
      { label: '< 1 ano', pct: 32 },
      { label: '1 – 2 anos', pct: 28 },
      { label: '2 – 5 anos', pct: 25 },
      { label: '5+ anos', pct: 15 },
    ],
  };
  const estrutura = MOCK_ESTRUTURA_DATA;
  const totalVinculo = estrutura.tipoVinculo.reduce((acc, v) => acc + v.value, 0);

  // Aba "Estratégia & Orçamento" — sem hook/endpoint próprio ainda (mesmo padrão
  // USE_MOCK_DATA do restante do arquivo). Resumo orçamentário anual, compromissos
  // previstos e plano de pessoas não têm fonte real hoje; usa-se o mock sempre,
  // sem fallback calculado, até o backend expor esses agregados financeiros.
  const MOCK_ORCAMENTO_RESUMO = {
    orcadoAnual: 4_000_000,
    realizado: 2_610_000,
    forecastFechamento: 4_080_000,
    custoPessoalReceitaPct: 42,
    metaCustoPessoalReceitaPct: 45,
  };
  const orcamentoResumo = MOCK_ORCAMENTO_RESUMO;
  const desvioOrcamentoAnual = orcamentoResumo.forecastFechamento - orcamentoResumo.orcadoAnual;
  const desvioOrcamentoAnualPct = (desvioOrcamentoAnual / orcamentoResumo.orcadoAnual) * 100;
  const custoPessoalDentroMeta = orcamentoResumo.custoPessoalReceitaPct <= orcamentoResumo.metaCustoPessoalReceitaPct;

  const MOCK_COMPROMISSOS_PREVISTOS = [
    { label: '13º salário', quando: 'Dez/26' },
    { label: 'Férias provisionadas', quando: 'próximas competências' },
    { label: 'Reajustes previstos', quando: 'Jan/27' },
  ];
  const compromissosPrevistos = MOCK_COMPROMISSOS_PREVISTOS;

  // Projeção de desembolso (linha "Orçado" x "Forecast") — reaproveita a mesma série
  // de `strategic.projections` já usada no card antigo, sem inventar um novo dado: o
  // "orçado" é a média dos meses sem pico, e o destaque ("13º salário") só aparece
  // quando o mês de maior desembolso projetado cai em dezembro.
  const projecaoSerie = strategic?.projections || [];
  const picoProjecao = projecaoSerie.reduce<typeof projecaoSerie[number] | null>(
    (max, p) => (!max || p.total_estimado > max.total_estimado) ? p : max, null,
  );
  const projecaoSemPico = projecaoSerie.filter(p => p !== picoProjecao);
  const orcadoMensalBase = projecaoSemPico.length > 0
    ? Math.round(projecaoSemPico.reduce((s, p) => s + p.total_estimado, 0) / projecaoSemPico.length)
    : 0;
  const impactoPico = picoProjecao ? picoProjecao.total_estimado - orcadoMensalBase : 0;
  // Lê o mês direto da string 'YYYY-MM-DD' (sem passar por `Date`/fuso local):
  // `mes_ref` representa um mês-calendário, não um instante, e `new Date(...).getMonth()`
  // pode "voltar" um mês em fusos negativos (ex.: UTC-3) para uma data-only ISO.
  const picoEhDezembro = picoProjecao ? picoProjecao.mes_ref.slice(5, 7) === '12' : false;
  const picoLabel = picoEhDezembro ? '13º salário' : 'Maior desembolso';
  const desembolsoProjecao = projecaoSerie.map(p => ({
    mes_ref: p.mes_ref,
    orcado: orcadoMensalBase,
    forecast: p.total_estimado,
    isPico: p === picoProjecao,
  }));

  // "Aderência Orçamentária por Depto." — mesmos valores orçados de `strategic.budgets`
  // (MOCK_STRATEGIC_DATA acima), com um forecast fictício por depto só pra dar uma
  // variação plausível por área até o backend expor o realizado projetado por depto.
  const MOCK_FORECAST_POR_DEPTO: Record<string, number> = {
    'Operações': 209_000, 'Comercial': 159_000, 'Logística': 131_000,
    'Financeiro': 84_000, 'TI': 71_000, 'RH': 54_000,
  };
  type StatusAderencia = 'acima' | 'atencao' | 'dentro';
  // `barGradient`: degradê montado com `color-mix()` (claro = mistura com branco,
  // escuro = a própria cor do token, sem diluir em opacidade) — opacidade contra o
  // fundo do card (`from-X/40`) deixava o tom "apagado"; `color-mix` preserva a
  // saturação plena da cor em ambas as pontas do degradê.
  const ADERENCIA_STATUS_META: Record<StatusAderencia, { label: string; badge: 'destructive' | 'warning' | 'success'; text: string; barGradient: string }> = {
    acima: { label: 'Acima', badge: 'destructive', text: 'text-destructive', barGradient: 'linear-gradient(to right, color-mix(in srgb, hsl(var(--destructive)) 100%, white 25%), hsl(var(--destructive)))' },
    atencao: { label: 'Atenção', badge: 'warning', text: 'text-warning', barGradient: 'linear-gradient(to right, color-mix(in srgb, hsl(var(--warning)) 100%, white 25%), hsl(var(--warning)))' },
    dentro: { label: 'Dentro', badge: 'success', text: 'text-success', barGradient: 'linear-gradient(to right, color-mix(in srgb, hsl(var(--success)) 100%, white 25%), hsl(var(--success)))' },
  };
  type AderenciaDepto = { departamento: string; orcado: number; forecast: number; desvioPct: number; status: StatusAderencia };
  const aderenciaDepartamentos: AderenciaDepto[] = (strategic?.budgets || []).map((b: any) => {
    const departamento = b.departamento as string;
    const orcado = b.valor_orcado as number;
    const forecast: number = MOCK_FORECAST_POR_DEPTO[departamento] ?? orcado;
    const desvioPct = orcado > 0 ? ((forecast - orcado) / orcado) * 100 : 0;
    const status: StatusAderencia = desvioPct > 10 ? 'acima' : desvioPct > 5 ? 'atencao' : 'dentro';
    return { departamento, orcado, forecast, desvioPct, status };
  });
  const aderenciaMaiorDesvio = aderenciaDepartamentos.reduce<AderenciaDepto | null>(
    (max, d) => (!max || d.desvioPct > max.desvioPct) ? d : max, null,
  );

  const MOCK_PLANO_PESSOAS = {
    posicoesAprovadas: 6,
    contratacoesPrevistas: 3,
    promocoes: 2,
    reajustesPlanejados: 1,
    impactoMensal: 48_000,
    impactoAnualizado: 576_000,
    cronograma: [
      { mes: 'Out/26', descricao: '2 contratações', tone: 'bg-info' },
      { mes: 'Nov/26', descricao: '1 promoção', tone: 'bg-primary' },
      { mes: 'Jan/27', descricao: '3 contratações + 1 reajuste', tone: 'bg-success' },
    ],
  };
  const planoPessoas = MOCK_PLANO_PESSOAS;

  // Aba "Análise Detalhada" — sem hook/endpoint próprio ainda (mesmo padrão USE_MOCK_DATA
  // do restante do arquivo). Prioridades executivas, exposição trabalhista, compliance
  // eSocial, pendências críticas, eventos sensíveis e insights não têm fonte real hoje;
  // usa-se o mock sempre, sem fallback calculado, até o backend expor esses agregados.
  type Severidade = 'critico' | 'alto' | 'atencao';
  const SEVERIDADE_META: Record<Severidade, { label: string; icon: typeof AlertTriangle; pill: string; boxBorder: string; boxBg: string; bar: string; button: string }> = {
    critico: {
      label: 'CRÍTICO', icon: AlertTriangle,
      pill: 'bg-destructive text-destructive-foreground',
      boxBorder: 'border-destructive/20', boxBg: 'bg-destructive/5', bar: 'bg-destructive',
      button: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
    },
    alto: {
      label: 'ALTO', icon: AlertTriangle,
      pill: 'bg-warning text-warning-foreground',
      boxBorder: 'border-warning/20', boxBg: 'bg-warning/5', bar: 'bg-warning',
      button: 'bg-warning text-warning-foreground hover:bg-warning/90',
    },
    atencao: {
      label: 'ATENÇÃO', icon: Info,
      pill: 'bg-info text-info-foreground',
      boxBorder: 'border-info/20', boxBg: 'bg-info/5', bar: 'bg-info',
      button: 'bg-info text-info-foreground hover:bg-info/90',
    },
  };
  const MOCK_PRIORIDADES_EXECUTIVAS: { severidade: Severidade; titulo: string; detalhe: string; acao: string; rota: string }[] = [
    { severidade: 'critico', titulo: '2 eventos eSocial rejeitados', detalhe: 'Prazo: hoje', acao: 'Resolver', rota: '/esocial' },
    { severidade: 'alto', titulo: '4 férias fora do SLA', detalhe: 'Mais antiga: 11 dias', acao: 'Revisar', rota: '/ferias' },
    { severidade: 'alto', titulo: 'Exposição trabalhista +12%', detalhe: 'R$ 187.320', acao: 'Analisar', rota: '/passivo-trabalhista' },
    { severidade: 'atencao', titulo: '2 ajustes de ponto vencidos', detalhe: 'Departamentos: Operações, TI', acao: 'Revisar', rota: '/ponto' },
  ];
  const prioridadesExecutivas = MOCK_PRIORIDADES_EXECUTIVAS;

  const MOCK_EXPOSICAO_TRABALHISTA = {
    valor: 187_320,
    variacaoPct: 12,
    provisionamentoPct: 85,
    processosAtivos: 24,
    altoRisco: 6,
    emAuditoria: 12,
    valorPotencial: 42_500,
  };
  const exposicaoTrabalhista = MOCK_EXPOSICAO_TRABALHISTA;

  const MOCK_COMPLIANCE_ESOCIAL = {
    processados: 148,
    rejeitados: 2,
    pendentes: 0,
    aceitacaoPct: 98,
    certificadoValidadeDias: 224,
    ultimoEnvio: 'Hoje, 14:30',
    proximoVencimento: '12/03/2027',
  };
  const complianceEsocial = MOCK_COMPLIANCE_ESOCIAL;
  const totalEventosEsocial = complianceEsocial.processados + complianceEsocial.rejeitados + complianceEsocial.pendentes;
  // Anel de compliance eSocial: mesma técnica de arco de `DonutChart.tsx` (círculo de
  // fundo + um `<circle>` por segmento com `strokeDasharray`/`strokeDashoffset`
  // calculados manualmente), mas sem o componente compartilhado — o centro precisa
  // mostrar "98% / Aceitação" em vez do padrão fixo "total / Total" do `DonutChart`.
  const ESOCIAL_DONUT_SIZE = 96;
  const ESOCIAL_DONUT_STROKE = 12;
  const esocialRaio = (ESOCIAL_DONUT_SIZE - ESOCIAL_DONUT_STROKE) / 2;
  const esocialCircunferencia = 2 * Math.PI * esocialRaio;
  const esocialSegmentosBase = [
    { label: 'Processados', value: complianceEsocial.processados, color: 'hsl(var(--success))' },
    { label: 'Rejeitados', value: complianceEsocial.rejeitados, color: 'hsl(var(--destructive))' },
    { label: 'Pendentes', value: complianceEsocial.pendentes, color: 'hsl(var(--warning))' },
  ];
  let esocialAcumulado = 0;
  const esocialArcos = esocialSegmentosBase.map((seg) => {
    const length = totalEventosEsocial > 0 ? (seg.value / totalEventosEsocial) * esocialCircunferencia : 0;
    const arco = { ...seg, length, offset: esocialAcumulado };
    esocialAcumulado += length;
    return arco;
  });

  // Mesmo padrão visual do "Principais Insights" das abas "Estrutura"/"Estratégia &
  // Orçamento" (card colorido com barra de destaque à esquerda + ícone sólido em
  // círculo), não a lista com chevron usada antes só aqui — por pedido explícito de
  // manter os 3 "Principais Insights" do dashboard consistentes entre si.
  const INSIGHT_BOX_META: Record<'destructive' | 'info' | 'warning', { border: string; bg: string; bar: string; icon: string; shadow: string }> = {
    destructive: { border: 'border-destructive/20', bg: 'bg-destructive/5', bar: 'bg-destructive', icon: 'bg-destructive text-destructive-foreground', shadow: 'shadow-[0_0_0_4px_hsl(var(--destructive)/0.12)]' },
    info: { border: 'border-info/20', bg: 'bg-info/5', bar: 'bg-info', icon: 'bg-info text-info-foreground', shadow: 'shadow-[0_0_0_4px_hsl(var(--info)/0.12)]' },
    warning: { border: 'border-warning/20', bg: 'bg-warning/5', bar: 'bg-warning', icon: 'bg-warning text-warning-foreground', shadow: 'shadow-[0_0_0_4px_hsl(var(--warning)/0.12)]' },
  };

  type StatusPendencia = 'critico' | 'atencao';
  const PENDENCIA_STATUS_META: Record<StatusPendencia, { label: string; badge: 'destructive' | 'warning'; iconBox: string }> = {
    critico: { label: 'Crítico', badge: 'destructive', iconBox: 'bg-destructive/10 text-destructive' },
    atencao: { label: 'Atenção', badge: 'warning', iconBox: 'bg-warning/10 text-warning' },
  };
  const MOCK_PENDENCIAS_CRITICAS: { categoria: string; icon: typeof Calendar; pendentes: number; foraSla: number; maisAntiga: string; status: StatusPendencia }[] = [
    { categoria: 'Férias', icon: Calendar, pendentes: 18, foraSla: 4, maisAntiga: '11 dias', status: 'atencao' },
    { categoria: 'Ponto', icon: Clock, pendentes: 9, foraSla: 2, maisAntiga: '8 dias', status: 'atencao' },
    { categoria: 'Documentos', icon: FileText, pendentes: 3, foraSla: 1, maisAntiga: 'Hoje', status: 'critico' },
    { categoria: 'Afastamentos', icon: UserMinus, pendentes: 2, foraSla: 1, maisAntiga: '6 dias', status: 'atencao' },
  ];
  const pendenciasCriticas = MOCK_PENDENCIAS_CRITICAS;

  type TomEvento = 'success' | 'info' | 'warning' | 'destructive';
  const EVENTO_ICON_CLASS: Record<TomEvento, string> = {
    success: 'bg-success/10 text-success',
    info: 'bg-info/10 text-info',
    warning: 'bg-warning/10 text-warning',
    destructive: 'bg-destructive/10 text-destructive',
  };
  const MOCK_EVENTOS_SENSIVEIS: { evento: string; icon: typeof DollarSign; tom: TomEvento; colaborador: string; detalhes: string; quando: string; por: string }[] = [
    { evento: 'Alteração salarial', icon: DollarSign, tom: 'success', colaborador: 'Maria Souza', detalhes: 'R$ 4.200 → R$ 5.100', quando: 'Hoje, 09:42', por: 'João Silva' },
    { evento: 'Mudança de gestor', icon: UserCheck, tom: 'info', colaborador: 'Pedro Lima', detalhes: 'Operações → Comercial', quando: 'Ontem, 17:31', por: 'Sistema' },
    { evento: 'Dados bancários alterados', icon: Landmark, tom: 'warning', colaborador: 'Camila Rocha', detalhes: '—', quando: 'Ontem, 15:18', por: 'Paula Mendes' },
    { evento: 'Afastamento médico', icon: UserMinus, tom: 'destructive', colaborador: 'Rafael Costa', detalhes: 'INSS - 15 dias', quando: '08/09/2026', por: 'Sistema' },
  ];
  const eventosSensiveis = MOCK_EVENTOS_SENSIVEIS;

  const MOCK_INSIGHTS_ANALISE: { icon: typeof TrendingUp; tom: 'destructive' | 'info' | 'warning'; titulo: string; descricao: string }[] = [
    { icon: TrendingUp, tom: 'destructive', titulo: 'Aumento de absenteísmo em Operações', descricao: '+0.8 p.p. nos últimos 3 meses. Acima da média da empresa.' },
    { icon: Users, tom: 'info', titulo: 'Concentração de pendências', descricao: '72% dos ajustes de ponto estão em Operações e Logística.' },
    { icon: DollarSign, tom: 'warning', titulo: 'Custo com horas extras', descricao: '+16% sem aumento proporcional do headcount. Oportunidade de revisão de jornada.' },
  ];
  const insightsAnalise = MOCK_INSIGHTS_ANALISE;

  const formatK = (v: number) => `R$${Math.round(v / 1000)}k`;
  const formatMil = (v: number) => `R$ ${Math.round(Math.abs(v) / 1000)} mil`;

  return (
    <>
    <PageTitle title="Dashboard Executivo" description="Painel executivo de indicadores" />
    <PageLayout title="Dashboard Executivo" description="Indicadores estratégicos de RH"
      icon={<BarChart3 className="h-5 w-5 text-primary-foreground" />} gradient="from-primary to-primary-glow"
      actions={
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
            Atualizado há 2 min
          </div>
          {/* `h-8 shadow-xs` + hover: mesmo padrão dos botões "Sincronizar"/"Exportar"
              do Dashboard (DashboardHeader.tsx). Migrado de `Select` pra `DropdownMenu`
              (RadioGroup/RadioItem — mesma técnica de animação nativa do Radix que
              `DropdownMenuCheckboxes`, só que RadioItem porque é seleção única entre
              3 opções mutuamente exclusivas, não toggles independentes). Classe/estilo
              do gatilho copiados 1:1 do `SelectTrigger` anterior — nada mudou visualmente. */}
          <DropdownMenu>
            <DropdownMenuTrigger className="group flex items-center justify-between border bg-background px-3 py-2 text-sm ring-offset-background focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 w-[140px] h-8 rounded-xl border-border/50 shadow-xs hover:border-primary/30 hover:bg-primary/5 transition-all">
              {PERIODO_LABELS[periodo]}
              <ChevronDown className="dp-dropdown-anim-chevron h-4 w-4 opacity-50 transition-transform duration-[165ms] ease-out group-data-[state=open]:rotate-180" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className={cn(
                'dp-dropdown-anim-content',
                'data-[state=open]:animate-in data-[state=closed]:animate-out',
                'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
                'data-[state=closed]:zoom-out-[.98] data-[state=open]:zoom-in-[.98]',
                'data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2',
                'data-[state=open]:duration-[180ms] data-[state=closed]:duration-[150ms] ease-out',
              )}
            >
              <DropdownMenuRadioGroup value={periodo} onValueChange={setPeriodo}>
                <DropdownMenuRadioItem value="3">3 meses</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="6">6 meses</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="12">12 meses</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="h-8 w-8 p-0 rounded-xl shadow-xs hover:bg-background hover:text-foreground hover:shadow-glow"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      }
    >
      {/* KPI Cards — mesmo layout compacto (ícone à esquerda, texto empilhado à direita,
          `p-3`) do MetricCard usado no Dashboard padrão (`components/dashboard/MetricCard.tsx`),
          pelo mesmo motivo que motivou reaproveitar `cardVariants` de lá: manter os dois
          dashboards com a mesma "unidade" de card. Não usamos o componente `MetricCard` em
          si porque seu `trend` sempre trata valor positivo como "bom" (seta pra cima + verde);
          aqui Turnover/Absenteísmo/Pendências precisam do inverso (queda = bom), via
          `goodIfPositive`, que o MetricCard não suporta. */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
        {isLoading ? Array.from({ length: 5 }).map((_, i) => <KPICardSkeleton key={i} />) :
          kpis.map((kpi, i) => {
            const trendGood = kpi.trend ? (kpi.trend.goodIfPositive ? kpi.trend.value >= 0 : kpi.trend.value <= 0) : undefined;
            return (
              <MotionCard key={kpi.label} custom={i} initial="hidden" animate="visible" variants={cardVariants} className="border border-border/30 rounded-2xl overflow-hidden h-full">
                <CardContent className="flex h-full items-center gap-2.5 p-3">
                  <div className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-full', kpi.tone)}>
                    <kpi.icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1 text-xs font-normal tracking-wide leading-snug text-muted-foreground truncate">
                      <span className="truncate">{kpi.label}</span>
                      <InfoTooltip content={kpi.tooltip} />
                      {kpi.alert && <AlertTriangle className="h-3.5 w-3.5 text-destructive animate-pulse shrink-0 ml-auto" />}
                    </p>
                    <p className="text-2xl font-display font-semibold leading-none mt-1.5 truncate">{formatValue(kpi.value, kpi.format)}</p>
                    {kpi.trend && (
                      // `text-[9px]`+ícone menor (era `text-xs`/`h-3.5`): testado num harness
                      // isolado (Playwright) contra a largura real disponível nessa linha em
                      // telas de laptop comuns (~116–200px, 5 cards por linha) — no tamanho
                      // anterior, "vs período anterior" só cabia numa linha só nos 2 cards com
                      // trend mais curto (%), quebrando nos 3 com "X,X p.p." (mais largo).
                      <div className="mt-1 flex items-center gap-0.5 text-[9px] min-w-0">
                        <span className={cn('inline-flex items-center gap-0 font-medium shrink-0 whitespace-nowrap', trendGood ? 'text-success' : 'text-destructive')}>
                          {kpi.trend.value >= 0 ? <ArrowUpRight className="h-2.5 w-2.5 shrink-0" /> : <ArrowDownRight className="h-2.5 w-2.5 shrink-0" />}
                          {Math.abs(kpi.trend.value).toFixed(1)}{kpi.trend.suffix === 'p.p.' ? ' p.p.' : '%'}
                        </span>
                        <span className="text-muted-foreground min-w-0 whitespace-nowrap">vs período anterior</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </MotionCard>
            );
          })
        }
      </div>

      {/* Base UI Tabs (Tabs.Root/List/Tab/Panel) + framer-motion `layoutId` no
          indicador — troca a barrinha ativa (antes um `border-b-2` estático,
          cortando de uma aba pra outra sem transição) por um `motion.div`
          compartilhado entre as abas: como só a aba ativa renderiza o
          indicador, o framer-motion re-anima (FLIP) a posição/largura dele
          suavemente sempre que `activeTab` muda, em vez de sumir e reaparecer
          na aba seguinte. Mesmo padrão do exemplo "Base UI: Tabs" do Motion. */}
      <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
        <Tabs.List className="mb-4 grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 border-b border-border/30">
          {[
            { value: 'evolucao', label: 'Evolução', Icon: TrendingUp },
            { value: 'custos', label: 'Custos', Icon: DollarSign },
            { value: 'estrutura', label: 'Estrutura', Icon: Building2 },
            { value: 'estrategia', label: 'Estratégia & Orçamento', Icon: ShieldCheck },
            { value: 'analitico', label: 'Análise Detalhada', Icon: Activity },
          ].map(({ value, label, Icon }) => {
            const isActive = activeTab === value;
            return (
              <Tabs.Tab
                key={value}
                value={value}
                className={cn(
                  'relative flex items-center justify-center gap-1 py-3 text-sm font-medium outline-none transition-colors',
                  isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground/80',
                )}
              >
                <Icon className="mr-1 h-4 w-4" />{label}
                {isActive && (
                  <motion.div
                    layoutId="active-indicator"
                    className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary"
                    transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                  />
                )}
              </Tabs.Tab>
            );
          })}
        </Tabs.List>

        <Tabs.Panel value="evolucao" className="space-y-2.5">
          {/* Área principal: card grande de evolução à esquerda + coluna de cards secundários à direita.
              Sem `items-start` (grid volta ao stretch padrão): a coluna direita (2 cards empilhados)
              define a altura da linha, e o card esquerdo — em `flex flex-col` — estica junto. O
              gráfico, dentro de um `flex-1 min-h-0`, ocupa exatamente o espaço que sobra depois do
              cabeçalho e dos chips, em vez de uma altura fixa que ora sobrava, ora zerava. */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
            <MotionCard custom={5} initial="hidden" animate="visible" variants={cardVariants} className="lg:col-span-3 border border-border/30 rounded-2xl overflow-hidden flex flex-col">
              <CardHeader className="p-3 pb-2 flex flex-row items-start justify-between gap-3 shrink-0">
                <div>
                  <CardTitle className="text-sm font-display flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Users className="h-4 w-4" />
                    </div>
                    Evolução do Quadro
                  </CardTitle>
                  <p className="text-[11px] text-muted-foreground mt-1">Variação histórica de colaboradores no período selecionado</p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger className="group flex items-center justify-between border bg-background px-3 py-2 ring-offset-background focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 w-[150px] h-8 rounded-lg text-xs shrink-0">
                    {PERIODO_LABELS_CARD[periodo]}
                    <ChevronDown className="dp-dropdown-anim-chevron h-4 w-4 opacity-50 transition-transform duration-[165ms] ease-out group-data-[state=open]:rotate-180" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className={cn(
                      'dp-dropdown-anim-content',
                      'data-[state=open]:animate-in data-[state=closed]:animate-out',
                      'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
                      'data-[state=closed]:zoom-out-[.98] data-[state=open]:zoom-in-[.98]',
                      'data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2',
                      'data-[state=open]:duration-[180ms] data-[state=closed]:duration-[150ms] ease-out',
                    )}
                  >
                    <DropdownMenuRadioGroup value={periodo} onValueChange={setPeriodo}>
                      <DropdownMenuRadioItem value="3">Últimos 3 meses</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="6">Últimos 6 meses</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="12">Últimos 12 meses</DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent className="p-3 pt-1 flex-1 flex flex-col min-h-0">
                {/* Resumo do período, acima do gráfico — mesmos dados da série abaixo, só destacados.
                    Um único contorno colorido (tom conforme o saldo do período) envolvendo os dois
                    blocos, cada um encostado numa ponta (`justify-between`) — mesmo modelo de badge
                    de ícone (`rounded-lg`) usado no título do card, em vez do círculo anterior. */}
                <div className={cn(
                  'flex items-center justify-between gap-4 rounded-xl border p-3 mb-3 shrink-0',
                  saldoPeriodo >= 0 ? 'border-success/30 bg-success/5' : 'border-destructive/30 bg-destructive/5'
                )}>
                  <div className="flex items-center gap-2">
                    <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center shrink-0', saldoPeriodo >= 0 ? 'bg-success text-success-foreground' : 'bg-destructive text-destructive-foreground')}>
                      {saldoPeriodo >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Crescimento no período</p>
                      <p className={cn('text-sm font-display font-semibold', saldoPeriodo >= 0 ? 'text-success' : 'text-destructive')}>
                        {saldoPeriodo >= 0 ? '+' : ''}{saldoPeriodo} colaboradores
                      </p>
                      <p className="text-[10px] text-muted-foreground">vs início do período</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center shrink-0', saldoPeriodo >= 0 ? 'bg-success/15 text-success' : 'bg-destructive/15 text-destructive')}>
                      <BarChart3 className="h-4 w-4" />
                    </div>
                    <div>
                      <p className={cn('text-sm font-display font-semibold', saldoPeriodo >= 0 ? 'text-success' : 'text-destructive')}>
                        {tendenciaLabel}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{tendenciaDesc}</p>
                    </div>
                  </div>
                </div>
                {isLoading ? <ChartSkeleton /> : (
                  <div className="flex-1 min-h-[160px]">
                  {/* `AnimatePresence` local (sem props): mesma técnica de
                      `HeadcountOverviewCard.tsx` ("Visão Geral da Empresa") — blinda
                      o `motion.rect` do clip-path abaixo contra o `initial={false}`
                      de `PageTransition.tsx`, que se propagaria por contexto e
                      bloquearia a animação de entrada quando esta rota é a primeira
                      da sessão (login novo, F5, restart). */}
                  <AnimatePresence>
                  <ResponsiveContainer width="100%" height="100%">
                    {/* `margin.right` compensa a largura que o YAxis reserva só do lado
                        esquerdo (labels "160"/"120"/...) — sem isso a área plotada fica
                        visualmente puxada pra direita dentro do card. */}
                    <AreaChart data={headcountEvolucao} margin={{ top: 8, right: 24, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorHeadcountExec" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                        {/* Clip-path animado (Framer Motion, não a animação nativa do
                            Recharts): a linha/área ficam escondidas além do limite direito
                            deste retângulo, que cresce de 0 a 100% da largura — revelando o
                            desenho da esquerda pra direita, mesma técnica de
                            `HeadcountOverviewCard.tsx` ("Visão Geral da Empresa"). */}
                        <clipPath id="headcountExec-reveal-clip">
                          <motion.rect
                            key={headcountEvolucao.length}
                            x="0" y="0" height="100%"
                            initial={{ width: 0 }}
                            animate={{ width: '100%' }}
                            transition={{ duration: 2.5, ease: 'easeInOut' }}
                          />
                        </clipPath>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (!active || !payload?.length) return null;
                          const d = payload[0].payload as typeof headcountEvolucao[number];
                          return (
                            <div className="rounded-xl border border-border bg-card px-3 py-2 text-xs shadow-lg space-y-0.5">
                              <p className="font-display font-medium mb-1">{label}</p>
                              <p>Headcount: <span className="font-medium">{d.headcount}</span></p>
                              <p className="text-success">Admissões: {d.admissoes}</p>
                              <p className="text-destructive">Desligamentos: {d.demissoes}</p>
                              <p className="text-muted-foreground">Saldo: {d.saldo >= 0 ? '+' : ''}{d.saldo}</p>
                            </div>
                          );
                        }}
                      />
                      <Area type="monotone" dataKey="headcount" name="Headcount" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#colorHeadcountExec)" dot={{ r: 4, fill: 'hsl(var(--primary))', strokeWidth: 0 }} activeDot={{ r: 5 }} isAnimationActive={false} clipPath="url(#headcountExec-reveal-clip)" />
                    </AreaChart>
                  </ResponsiveContainer>
                  </AnimatePresence>
                  </div>
                )}
              </CardContent>
            </MotionCard>

            <div className="lg:col-span-2 flex flex-col gap-2.5">
              <MotionCard custom={6} initial="hidden" animate="visible" variants={cardVariants} className="border border-border/30 rounded-2xl overflow-hidden">
                <CardHeader className="p-3 pb-2">
                  <CardTitle className="text-sm font-display flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Users className="h-4 w-4" />
                    </div>
                    Movimentação no Período
                  </CardTitle>
                  <p className="text-[11px] text-muted-foreground">Entradas, saídas e saldo de colaboradores</p>
                </CardHeader>
                <CardContent className="p-3 pt-1">
                  {isLoading ? <ChartSkeleton /> : (
                    <div className="grid grid-cols-3 gap-2.5">
                      {movimentacaoItems.map((item, i) => {
                        const deltaIsGood = item.deltaPct !== undefined && (item.deltaDirection === 'higher-better' ? item.deltaPct >= 0 : item.deltaPct <= 0);
                        return (
                          // Ícone à esquerda, sozinho na coluna — número, rótulo e variação
                          // empilhados numa coluna só à direita dele (nenhum desses três textos
                          // fica embaixo do ícone, fechando o espaço vazio que sobrava ali).
                          <motion.div key={item.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="flex items-start gap-2">
                            <div className={cn('h-8 w-8 rounded-full flex items-center justify-center shrink-0', item.tone)}>
                              <item.icon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <p className={cn('text-lg font-display font-bold leading-none', item.numberColor)}>
                                {item.showSign && item.value >= 0 ? '+' : ''}{item.value}
                              </p>
                              <p className="mt-1 text-[11px] text-muted-foreground truncate">{item.label}</p>
                              {item.deltaPct !== undefined && (
                                <div className="mt-1">
                                  <span className={cn('inline-flex items-center gap-0.5 text-[10px] font-medium', deltaIsGood ? 'text-success' : 'text-destructive')}>
                                    {item.deltaPct >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                                    {Math.abs(item.deltaPct).toFixed(0)}%
                                  </span>
                                  <p className="text-[9px] text-muted-foreground">vs. período anterior</p>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </MotionCard>

              {/* `flex-1 flex flex-col`: esse card absorve toda a sobra vertical da coluna
                  direita (que o grid estica pra bater com a altura de "Evolução do Quadro"),
                  em vez de deixar esse espaço sobrando embaixo dele sem dono — e o conteúdo
                  abaixo usa essa sobra pra se centralizar de verdade, não só encostar no topo. */}
              <MotionCard custom={7} initial="hidden" animate="visible" variants={cardVariants} className="border border-border/30 rounded-2xl overflow-hidden flex-1 flex flex-col">
                {/* Ícone fora do CardTitle, centralizado ao lado das DUAS linhas (título+subtítulo)
                    — antes ele ficava só ao lado do título, deixando o subtítulo "solto" embaixo
                    dele; agora nenhum texto sobra abaixo do ícone. */}
                <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg flex items-center justify-center bg-[hsl(var(--xp))]/10 shrink-0">
                      <TrendingDown className="h-4 w-4 text-[hsl(var(--xp))]" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-display">Turnover no Período</CardTitle>
                      <p className="text-[11px] text-muted-foreground">Taxa de rotatividade mensal</p>
                    </div>
                  </div>
                  <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-muted px-3.5 py-2 text-xs font-medium text-muted-foreground">
                    Meta: ≤ {META_TURNOVER.toFixed(1).replace('.', ',')}%
                    <InfoTooltip content={dashboardTooltips.dashboardExecutivo.turnoverPeriodo.meta} />
                  </span>
                </CardHeader>
                {/* Valor + variação à esquerda, sparkline à direita, cada lado com metade do
                    card (`grid-cols-2`) — antes o gráfico usava `flex-1` e acabava ocupando
                    quase o card inteiro, sobrando pouco espaço pro valor. */}
                <CardContent className="p-3 pt-0 flex-1 grid grid-cols-2 items-center content-center gap-3">
                  <div className="flex items-center gap-2">
                    <p className="text-4xl font-display font-bold leading-none">{formatValue(data?.turnover || 0, 'percent')}</p>
                    {/* "vs. período anterior" agora embaixo do "0,7 p.p." (mesma coluna), não
                        embaixo do valor "2,8%" inteiro. */}
                    {turnoverDeltaPP !== undefined && (
                      <div>
                        <span className={cn(
                          'inline-flex items-center gap-0.5 text-sm font-semibold',
                          turnoverDeltaPP <= 0 ? 'text-success' : 'text-destructive',
                        )}>
                          {turnoverDeltaPP <= 0 ? <ArrowDownRight className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                          {Math.abs(turnoverDeltaPP).toFixed(1)} p.p.
                        </span>
                        <p className="text-[11px] text-muted-foreground">vs. período anterior</p>
                      </div>
                    )}
                  </div>
                  <div className="h-16">
                    {/* `AnimatePresence` local (sem props) + clip-path animado: mesma
                        técnica de `HeadcountOverviewCard.tsx` ("Visão Geral da Empresa"),
                        ver comentário equivalente no gráfico de "Evolução do Quadro" acima. */}
                    <AnimatePresence>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={turnoverSerie}>
                        <defs>
                          <linearGradient id="colorTurnoverExec" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--xp))" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="hsl(var(--xp))" stopOpacity={0} />
                          </linearGradient>
                          <clipPath id="turnoverExec-reveal-clip">
                            <motion.rect
                              key={turnoverSerie.length}
                              x="0" y="0" height="100%"
                              initial={{ width: 0 }}
                              animate={{ width: '100%' }}
                              transition={{ duration: 2.5, ease: 'easeInOut' }}
                            />
                          </clipPath>
                        </defs>
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px' }} />
                        <Area type="monotone" dataKey="turnover" name="Turnover %" fill="url(#colorTurnoverExec)" stroke="hsl(var(--xp))" strokeWidth={2} dot={{ r: 3, fill: 'hsl(var(--xp))', strokeWidth: 0 }} isAnimationActive={false} clipPath="url(#turnoverExec-reveal-clip)" />
                      </AreaChart>
                    </ResponsiveContainer>
                    </AnimatePresence>
                  </div>
                </CardContent>
              </MotionCard>
            </div>
          </div>

          {/* Insights: resumo do período selecionado, com atalho para a análise detalhada já existente */}
          <MotionCard custom={8} initial="hidden" animate="visible" variants={cardVariants} className="border border-border/30 rounded-2xl overflow-hidden">
            <CardHeader className="p-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-display flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg flex items-center justify-center bg-warning/10 text-warning shrink-0">
                    <Lightbulb className="h-4 w-4" />
                  </div>
                  Principais Insights
                </CardTitle>
                <p className="text-[10px] text-muted-foreground mt-1">Resumo automático dos dados do período selecionado</p>
              </div>
              {/* Pill sólido em vez do ghost apagado — mais contraste/peso visual pro CTA. */}
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  size="sm"
                  className="rounded-full bg-primary/15 text-primary text-xs font-semibold border border-primary/30 hover:bg-primary/25 hover:border-primary/50 shadow-none"
                  onClick={() => setActiveTab('analitico')}
                >
                  Ver análise completa <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                </Button>
                <InfoTooltip content={dashboardTooltips.dashboardExecutivo.evolucao.verAnaliseCompleta} />
              </div>
            </CardHeader>
            {/* Cada insight ganhou seu próprio "mini card": tarja lateral + fundo levemente
                tingidos na cor do próprio ícone (verde/azul/laranja) e o ícone virou um badge
                sólido com leve glow — em vez do cinza uniforme anterior, sem nenhum destaque
                próprio, que fazia os 3 itens se misturarem com o fundo do card. */}
            <CardContent className="p-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <motion.div custom={9} initial="hidden" animate="visible" variants={cardVariants} className="relative overflow-hidden rounded-xl border border-success/20 bg-success/5 py-3.5 pl-4 pr-3.5">
                  <div className="absolute inset-y-0 left-0 w-1 bg-success" />
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-full bg-success text-success-foreground shrink-0 shadow-[0_0_0_4px_hsl(var(--success)/0.12)]"><ArrowUpRight className="h-4 w-4" /></div>
                    <div>
                      <p className="text-xs font-semibold">
                        {saldoPeriodo >= 0 ? `Aumento de ${saldoPeriodo}` : `Redução de ${Math.abs(saldoPeriodo)}`} colaboradores
                      </p>
                      <p className="text-[10px] text-muted-foreground">Saldo acumulado no período selecionado</p>
                    </div>
                  </div>
                </motion.div>
                <motion.div custom={10} initial="hidden" animate="visible" variants={cardVariants} className="relative overflow-hidden rounded-xl border border-info/20 bg-info/5 py-3.5 pl-4 pr-3.5">
                  <div className="absolute inset-y-0 left-0 w-1 bg-info" />
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-full bg-info text-info-foreground shrink-0 shadow-[0_0_0_4px_hsl(var(--info)/0.12)]"><Minus className="h-4 w-4" /></div>
                    <div>
                      <p className="text-xs font-semibold">Turnover {(data?.turnover || 0) <= META_TURNOVER ? 'dentro da meta' : 'acima da meta'}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {(data?.turnover || 0) <= META_TURNOVER ? 'Em linha com o esperado da meta.' : `Acima do limite de ${META_TURNOVER.toFixed(1).replace('.', ',')}% definido.`}
                      </p>
                    </div>
                  </div>
                </motion.div>
                <motion.div custom={11} initial="hidden" animate="visible" variants={cardVariants} className="relative overflow-hidden rounded-xl border border-warning/20 bg-warning/5 py-3.5 pl-4 pr-3.5">
                  <div className="absolute inset-y-0 left-0 w-1 bg-warning" />
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-full bg-warning text-warning-foreground shrink-0 shadow-[0_0_0_4px_hsl(var(--warning)/0.12)]"><AlertTriangle className="h-4 w-4" /></div>
                    <div>
                      <p className="flex items-center gap-1 text-xs font-semibold">
                        Atenção às férias pendentes
                        <InfoTooltip content={dashboardTooltips.dashboardExecutivo.insights.feriasPendentes} />
                      </p>
                      <p className="text-[10px] text-muted-foreground">{data?.feriasPendentes || 0} solicitações aguardando aprovação.</p>
                    </div>
                  </div>
                </motion.div>
              </div>
            </CardContent>
          </MotionCard>
        </Tabs.Panel>

        <Tabs.Panel value="custos" className="space-y-3">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 items-stretch">
            <MotionCard custom={0} initial="hidden" animate="visible" variants={cardVariants} className="lg:col-span-2 border border-border/30 rounded-2xl overflow-hidden">
              <CardHeader className="p-3 pb-2 flex flex-row items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-sm font-display flex items-center gap-2">
                      <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <TrendingUp className="h-4 w-4" />
                      </div>
                      Evolução dos Custos
                    </CardTitle>
                    <p className="text-[11px] text-muted-foreground mt-1">Variação mensal da folha bruta e líquida no período selecionado</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 pt-1">
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="h-2 w-2 rounded-full bg-primary" />Bruto
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="h-2 w-2 rounded-full bg-success" />Líquido
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="p-3 pt-1">
                  {variacaoLiquidoPeriodo !== undefined && (
                    <div className={cn(
                      'flex items-center justify-between gap-4 rounded-xl border p-3 mb-3',
                      variacaoLiquidoPeriodo >= 0 ? 'border-success/30 bg-success/5' : 'border-destructive/30 bg-destructive/5'
                    )}>
                      <div className="flex items-center gap-2">
                        <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center shrink-0', variacaoLiquidoPeriodo >= 0 ? 'bg-success text-success-foreground' : 'bg-destructive text-destructive-foreground')}>
                          {variacaoLiquidoPeriodo >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground">Variação no período</p>
                          <p className={cn('text-sm font-display font-semibold', variacaoLiquidoPeriodo >= 0 ? 'text-success' : 'text-destructive')}>{variacaoLiquidoPeriodo >= 0 ? '+' : ''}{variacaoLiquidoPeriodo.toFixed(1)}%</p>
                          <p className="text-[10px] text-muted-foreground">vs. período anterior</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center shrink-0', variacaoLiquidoPeriodo >= 0 ? 'bg-success/15 text-success' : 'bg-destructive/15 text-destructive')}>
                          <BarChart3 className="h-4 w-4" />
                        </div>
                        <div>
                          <p className={cn('flex items-center gap-1 text-sm font-display font-semibold', variacaoLiquidoPeriodo >= 0 ? 'text-success' : 'text-destructive')}>
                            {tendenciaCustosLabel}
                            <InfoTooltip content={dashboardTooltips.dashboardExecutivo.custos.tendencia} />
                          </p>
                          <p className="text-[10px] text-muted-foreground">{tendenciaCustosDesc}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="h-[220px]">
                    {/* `AnimatePresence` local (sem props) + clip-path animado: mesma
                        técnica de `HeadcountOverviewCard.tsx` ("Visão Geral da Empresa"),
                        ver comentário equivalente no gráfico de "Evolução do Quadro". */}
                    <AnimatePresence>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={custosMensal}>
                        <defs>
                          <linearGradient id="colorCustosBruto" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="colorCustosLiquido" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.35} />
                            <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                          </linearGradient>
                          <clipPath id="custosExec-reveal-clip">
                            <motion.rect
                              key={custosMensal.length}
                              x="0" y="0" height="100%"
                              initial={{ width: 0 }}
                              animate={{ width: '100%' }}
                              transition={{ duration: 2.5, ease: 'easeInOut' }}
                            />
                          </clipPath>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                        <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `R$ ${(v / 1000).toFixed(0)}k`} />
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px' }} formatter={(v: any) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} />
                        <Area type="monotone" dataKey="bruto" name="Bruto" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#colorCustosBruto)" dot={{ r: 3, fill: 'hsl(var(--primary))', strokeWidth: 0 }} activeDot={{ r: 5 }} isAnimationActive={false} clipPath="url(#custosExec-reveal-clip)" />
                        <Area type="monotone" dataKey="liquido" name="Líquido" stroke="hsl(var(--success))" strokeWidth={2.5} fill="url(#colorCustosLiquido)" dot={{ r: 3, fill: 'hsl(var(--success))', strokeWidth: 0 }} activeDot={{ r: 5 }} isAnimationActive={false} clipPath="url(#custosExec-reveal-clip)" />
                      </AreaChart>
                    </ResponsiveContainer>
                    </AnimatePresence>
                  </div>
                </CardContent>
            </MotionCard>

            <MotionCard custom={1} initial="hidden" animate="visible" variants={cardVariants} className="border border-border/30 rounded-2xl overflow-hidden">
              <CardHeader className="p-3 pb-2">
                <CardTitle className="text-sm font-display flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg flex items-center justify-center bg-primary/10 text-primary shrink-0">
                    <Clock className="h-4 w-4" />
                  </div>
                  Provisões & Obrigações
                </CardTitle>
                <p className="text-[11px] text-muted-foreground">Compromissos financeiros relacionados à folha</p>
              </CardHeader>
              <CardContent className="p-3 pt-1 grid grid-cols-2 gap-2.5">
                <motion.div custom={2} initial="hidden" animate="visible" variants={cardVariants} className="rounded-xl border border-border/30 bg-background/50 p-3">
                  <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-[hsl(var(--xp))]/10 text-[hsl(var(--xp))] mb-2"><Wallet className="h-4 w-4" /></div>
                  <p className="text-[11px] text-muted-foreground">13º Salário</p>
                  <p className="text-lg font-display font-semibold mt-0.5">{formatValue(provisoes.decimoTerceiro, 'currency')}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Provisão acumulada</p>
                </motion.div>
                <motion.div custom={3} initial="hidden" animate="visible" variants={cardVariants} className="rounded-xl border border-border/30 bg-background/50 p-3">
                  <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-success/10 text-success mb-2"><Calendar className="h-4 w-4" /></div>
                  <p className="text-[11px] text-muted-foreground">Férias</p>
                  <p className="text-lg font-display font-semibold mt-0.5">{formatValue(provisoes.ferias, 'currency')}</p>
                  <p className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
                    {provisoes.feriasColaboradores} colaboradores • próximos 30 dias
                    <InfoTooltip content={dashboardTooltips.dashboardExecutivo.custos.feriasVencendo(provisoes.feriasColaboradores)} />
                  </p>
                </motion.div>
                <motion.div custom={4} initial="hidden" animate="visible" variants={cardVariants} className="rounded-xl border border-border/30 bg-background/50 p-3">
                  <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-info/10 text-info mb-2"><Landmark className="h-4 w-4" /></div>
                  <p className="text-[11px] text-muted-foreground">INSS</p>
                  <p className="text-lg font-display font-semibold mt-0.5">{formatValue(provisoes.inss, 'currency')}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Estimativa da competência</p>
                </motion.div>
                <motion.div custom={5} initial="hidden" animate="visible" variants={cardVariants} className="rounded-xl border border-border/30 bg-background/50 p-3">
                  <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-warning/10 text-warning mb-2"><Building2 className="h-4 w-4" /></div>
                  <p className="text-[11px] text-muted-foreground">FGTS</p>
                  <p className="text-lg font-display font-semibold mt-0.5">{formatValue(provisoes.fgts, 'currency')}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Estimativa da competência</p>
                </motion.div>
              </CardContent>
            </MotionCard>
          </div>

          <MotionCard custom={6} initial="hidden" animate="visible" variants={cardVariants} className="border border-border/30 rounded-2xl overflow-hidden">
            <CardHeader className="p-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-display flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg flex items-center justify-center bg-warning/10 text-warning shrink-0">
                    <Lightbulb className="h-4 w-4" />
                  </div>
                  Principais Insights
                </CardTitle>
                <p className="text-[10px] text-muted-foreground mt-1">Leitura automática dos dados do período</p>
              </div>
              <Button
                size="sm"
                className="rounded-full bg-primary/15 text-primary text-xs font-semibold border border-primary/30 hover:bg-primary/25 hover:border-primary/50 shadow-none"
                onClick={() => setActiveTab('analitico')}
              >
                Ver análise completa <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </CardHeader>
            <CardContent className="p-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <motion.div custom={7} initial="hidden" animate="visible" variants={cardVariants} className="relative overflow-hidden rounded-xl border border-success/20 bg-success/5 py-3.5 pl-4 pr-3.5">
                  <div className="absolute inset-y-0 left-0 w-1 bg-success" />
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-full bg-success text-success-foreground shrink-0 shadow-[0_0_0_4px_hsl(var(--success)/0.12)]"><ArrowUpRight className="h-4 w-4" /></div>
                    <div>
                      <p className="text-xs font-semibold">
                        Folha líquida {variacaoLiquidoPeriodo === undefined || variacaoLiquidoPeriodo >= 0 ? 'cresceu' : 'recuou'} no período
                      </p>
                      <p className="text-[10px] text-muted-foreground">A folha líquida apresentou {variacaoLiquidoPeriodo === undefined || variacaoLiquidoPeriodo >= 0 ? 'alta' : 'queda'} de {Math.abs(variacaoLiquidoPeriodo ?? 0).toFixed(1)}% no comparativo com o período anterior.</p>
                    </div>
                  </div>
                </motion.div>
                <motion.div custom={8} initial="hidden" animate="visible" variants={cardVariants} className="relative overflow-hidden rounded-xl border border-info/20 bg-info/5 py-3.5 pl-4 pr-3.5">
                  <div className="absolute inset-y-0 left-0 w-1 bg-info" />
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-full bg-info text-info-foreground shrink-0 shadow-[0_0_0_4px_hsl(var(--info)/0.12)]"><BarChart3 className="h-4 w-4" /></div>
                    <div>
                      <p className="text-xs font-semibold">
                        {maiorVariacaoMes ? `Maior variação ocorreu em ${maiorVariacaoMes}` : 'Sem variações no período'}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {maiorVariacaoMes ? `${maiorVariacaoMes} registrou o maior aumento mensal na folha, com alta de ${(maiorVariacaoValor ?? 0).toFixed(1)}%.` : 'Não há dados suficientes para comparação no período selecionado.'}
                      </p>
                    </div>
                  </div>
                </motion.div>
                <motion.div custom={9} initial="hidden" animate="visible" variants={cardVariants} className="relative overflow-hidden rounded-xl border border-warning/20 bg-warning/5 py-3.5 pl-4 pr-3.5">
                  <div className="absolute inset-y-0 left-0 w-1 bg-warning" />
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-full bg-warning text-warning-foreground shrink-0 shadow-[0_0_0_4px_hsl(var(--warning)/0.12)]"><Clock className="h-4 w-4" /></div>
                    <div>
                      <p className="text-xs font-semibold">Provisões futuras ganham relevância</p>
                      <p className="text-[10px] text-muted-foreground">13º e férias já representam {formatValue(provisoes.decimoTerceiro + provisoes.ferias, 'currency')} em compromissos provisionados.</p>
                    </div>
                  </div>
                </motion.div>
              </div>
            </CardContent>
          </MotionCard>
        </Tabs.Panel>

        <Tabs.Panel value="estrutura" className="space-y-3">
          {/* Linha superior: Mapa da Estrutura (4/7) + Amplitude de Liderança (3/7) — testado
              com um harness isolado (Playwright, fora do app) pra achar a largura mínima em
              que "Distribuição de liderados por gestor" e o badge de alerta cabem cada um em
              uma linha só: com o cabeçalho abaixo (ícones/paddings/badge enxutos), isso exige
              >= ~440px de card. Em 3/5 (grid-cols-5) o card fica abaixo disso em telas de
              laptop comuns (~1366px); em 4/7 sobra margem confortável a partir de ~1366px. */}
          <div className="grid grid-cols-1 lg:grid-cols-7 gap-3">
            <MotionCard custom={0} initial="hidden" animate="visible" variants={cardVariants} className="lg:col-span-4 border border-border/30 rounded-2xl overflow-hidden flex flex-col">
              {/* Ícone sólido, arredondado (era `rounded-lg`, mais quadrado) + fora do
                  CardTitle, ao lado do bloco título+subtítulo. */}
              <CardHeader className="p-3 pb-2 flex flex-row items-start gap-2">
                <div className="h-8 w-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                  <Building2 className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-display">Mapa da Estrutura</CardTitle>
                  <p className="text-[11px] text-muted-foreground">Visão consolidada da organização</p>
                </div>
              </CardHeader>
              {/* Redesenhado: sem organograma nem botão (removidos por pedido explícito) — cada
                  estatística agora é seu próprio card (borda + fundo), com um badge de ícone
                  colorido, número e uma tarja curta embaixo do rótulo, batendo com a
                  referência visual. */}
              <CardContent className="p-3 pt-2 flex-1 grid grid-cols-5 gap-2.5">
                {[
                  { label: 'Departamentos', value: estrutura.mapa.departamentos, icon: Building2 },
                  { label: 'Times', value: estrutura.mapa.times, icon: Users },
                  { label: 'Cargos', value: estrutura.mapa.cargos, icon: IdCard },
                  { label: 'Lideranças', value: estrutura.mapa.liderancas, icon: UserCheck },
                  { label: 'Níveis hierárquicos', value: estrutura.mapa.niveis, icon: Layers },
                ].map((item, i) => (
                  <motion.div key={item.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="rounded-xl border border-border/30 bg-background/50 p-3 flex flex-col justify-center min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-success/15 flex items-center justify-center shrink-0">
                        <item.icon className="h-4 w-4 text-success" />
                      </div>
                      <p className="text-2xl font-display font-bold leading-none truncate">{item.value}</p>
                    </div>
                    <p className="mt-2.5 text-xs text-muted-foreground leading-tight">{item.label}</p>
                    <div className="mt-1.5 h-0.5 w-6 rounded-full bg-primary" />
                  </motion.div>
                ))}
              </CardContent>
            </MotionCard>

            <MotionCard custom={1} initial="hidden" animate="visible" variants={cardVariants} className="lg:col-span-3 border border-border/30 rounded-2xl overflow-hidden flex flex-col">
              {/* Linha única sempre (sem `flex-wrap` — o badge não pode "cair" pra baixo do
                  título): cada lado tem `min-w-0` pra poder encolher e deixar seu PRÓPRIO
                  texto quebrar em 2 linhas quando o card fica estreito, em vez de (a) o badge
                  inteiro descer de linha ou (b) o texto ser cortado com "...". Padding/gaps do
                  cabeçalho e do badge um pouco mais enxutos pra sobrar largura suficiente pro
                  subtítulo caber numa linha só ao lado do badge, também numa linha só. */}
              <CardHeader className="p-2.5 pb-1.5 flex flex-row items-start justify-between gap-1">
                <div className="flex items-start gap-1 min-w-0">
                  <div className="h-6 w-6 rounded-lg bg-info/10 text-info flex items-center justify-center shrink-0">
                    <Users className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0">
                    <CardTitle className="text-sm font-display">Amplitude de Liderança</CardTitle>
                    <p className="text-[11px] text-muted-foreground">Distribuição de liderados por gestor</p>
                  </div>
                </div>
                {/* Badge sólido (antes contorno translúcido, pouco visível) + ícone piscando —
                    mesmo tratamento de "chamar atenção" usado no alerta dos KPI cards
                    (`kpi.alert && <AlertTriangle ... animate-pulse .../>`), agora também com
                    fundo cheio em vez de `bg-destructive/10`. `shrink-0`+`whitespace-nowrap`
                    mantêm o texto em uma linha só; padding/fonte um pouco maiores que a versão
                    anterior (testado num harness isolado — ainda cabe numa linha só ao lado do
                    subtítulo em larguras de card reais, sem sobra pra ir muito além disso). */}
                {estrutura.amplitudeLideranca.liderancasAcimaDaFaixa > 0 && (
                  <div className="shrink-0 flex items-center gap-0.5 rounded-full bg-destructive px-2 py-1 text-[9.5px] font-medium text-destructive-foreground whitespace-nowrap shadow-[0_0_0_4px_hsl(var(--destructive)/0.18)] transition-shadow duration-300 hover:shadow-[0_0_0_4px_hsl(var(--destructive)/0.18),0_0_30px_2px_hsl(var(--destructive)/0.85)]">
                    <AlertTriangle className="h-2.5 w-2.5 shrink-0 animate-pulse" />
                    {estrutura.amplitudeLideranca.liderancasAcimaDaFaixa} liderança{estrutura.amplitudeLideranca.liderancasAcimaDaFaixa > 1 ? 's' : ''} acima da faixa recomendada
                    <InfoTooltip content={dashboardTooltips.dashboardExecutivo.estrutura.alertaAmplitude(estrutura.amplitudeLideranca.liderancasAcimaDaFaixa)} />
                  </div>
                )}
              </CardHeader>
              {/* Sem `items-center` (que centralizava a única linha de conteúdo no meio da
                  altura do card, esticado pra bater com "Mapa da Estrutura" ao lado — sobrava
                  um vão grande logo abaixo do subtítulo). Conteúdo ancorado no topo, com
                  números/barras um pouco maiores para ocupar melhor o espaço vertical. */}
              <CardContent className="p-3 pt-2 flex-1 flex flex-col">
                <div className="flex items-center gap-4">
                  <div className="shrink-0">
                    <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      Média
                      <InfoTooltip content={dashboardTooltips.dashboardExecutivo.estrutura.amplitudeLideranca} />
                    </p>
                    <p className="text-4xl font-display font-bold leading-none mt-1.5">{estrutura.amplitudeLideranca.media.toFixed(1).replace('.', ',')}</p>
                    <p className="mt-1.5 text-[10px] text-muted-foreground whitespace-nowrap">liderados por líder</p>
                  </div>
                  <div className="flex-1 min-w-0 space-y-3">
                    {estrutura.amplitudeLideranca.faixas.map((faixa, i) => (
                      <div key={faixa.label} className="flex items-center gap-2">
                        <span className="w-9 shrink-0 text-[10px] text-muted-foreground">{faixa.label}</span>
                        <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${faixa.pct}%` }}
                            transition={{ duration: 0.6, delay: 0.15 + i * 0.1, ease: 'easeOut' }}
                            className={cn(
                              'h-full rounded-full bg-gradient-to-r',
                              i === estrutura.amplitudeLideranca.faixas.length - 1 ? 'from-warning/60 to-warning' : 'from-success to-primary',
                            )}
                          />
                        </div>
                        <span className="w-8 shrink-0 text-right text-[10px] font-medium text-muted-foreground">{faixa.pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </MotionCard>
          </div>

          {/* Linha do meio: Senioridade, Tipo de Vínculo, Tempo de Casa */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <MotionCard custom={2} initial="hidden" animate="visible" variants={cardVariants} className="border border-border/30 rounded-2xl overflow-hidden flex flex-col">
              {/* Ícone fora do CardTitle, ao lado do bloco título+subtítulo (mesmo ajuste do
                  card "Amplitude de Liderança"): como sibling do CardTitle, o subtítulo nascia
                  colado na borda esquerda do card, embaixo do ícone, em vez de alinhado com o
                  início de "Senioridade". */}
              <CardHeader className="p-3 pb-2 flex flex-row items-start gap-2">
                <div className="h-7 w-7 rounded-lg bg-success/10 text-success flex items-center justify-center shrink-0">
                  <Layers className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-display">Senioridade</CardTitle>
                  <p className="text-[11px] text-muted-foreground">Distribuição por nível de senioridade</p>
                </div>
              </CardHeader>
              {/* `flex-1 flex flex-col justify-between` (mesmo ajuste do "Tempo de Casa" ao
                  lado): as 5 linhas se distribuem por toda a altura do card em vez de um
                  `space-y-2` fixo colado no topo. */}
              <CardContent className="p-3 pt-1 flex-1 flex flex-col justify-between">
                {estrutura.senioridade.map((item, i) => (
                  <div key={item.nome} className="flex items-center gap-2">
                    <span className="w-20 shrink-0 text-[11px] text-muted-foreground truncate">{item.nome}</span>
                    <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${item.pct}%` }}
                        transition={{ duration: 0.6, delay: 0.1 + i * 0.08, ease: 'easeOut' }}
                        className="h-full rounded-full bg-gradient-to-r from-success to-primary"
                      />
                    </div>
                    <span className="w-8 shrink-0 text-right text-[11px] font-medium">{item.pct}%</span>
                  </div>
                ))}
              </CardContent>
            </MotionCard>

            <MotionCard custom={3} initial="hidden" animate="visible" variants={cardVariants} className="border border-border/30 rounded-2xl overflow-hidden">
              {/* Ícone fora do CardTitle (mesmo ajuste dos outros cards desta linha). Tom trocado
                  de `accent` pra `xp` (roxo, já usado alhures nesta página): no dark mode,
                  `--accent` é um cinza quase idêntico ao fundo do card — o badge ficava
                  praticamente invisível — mas o padrão do resto do sistema é o badge "chapado"
                  (`bg-{cor}/10 text-{cor}`, sem preenchimento sólido), não uma exceção sólida
                  só neste card. */}
              <CardHeader className="p-3 pb-2 flex flex-row items-start gap-2">
                <div className="h-7 w-7 rounded-lg bg-[hsl(var(--xp))]/10 text-[hsl(var(--xp))] flex items-center justify-center shrink-0">
                  <Briefcase className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-display">Tipo de Vínculo</CardTitle>
                  <p className="text-[11px] text-muted-foreground">Distribuição por regime de contratação</p>
                </div>
              </CardHeader>
              <CardContent className="p-3 pt-1 flex items-center gap-3">
                <DonutChart
                  segments={estrutura.tipoVinculo.map((v, i) => ({ label: v.nome, value: v.value, color: COLORS[i % COLORS.length] }))}
                  size={104}
                  strokeWidth={13}
                  showLegend={false}
                  className="shrink-0"
                />
                {/* `divide-y`: uma linha fina separando cada item da legenda (pedido
                    explicitamente), em vez do `space-y` anterior sem nenhuma divisão visual.
                    Percentual adicionado antes da contagem — só a contagem não dizia a fatia
                    relativa de cada vínculo no total. */}
                <ul className="min-w-0 flex-1 divide-y divide-border/70">
                  {estrutura.tipoVinculo.map((v, i) => (
                    <li key={v.nome} className="flex items-center gap-1.5 py-1.5 text-[11px] first:pt-0 last:pb-0">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="min-w-0 flex-1 truncate text-muted-foreground">{v.nome}</span>
                      <span className="font-display font-medium">
                        {Math.round((v.value / totalVinculo) * 100)}% <span className="text-muted-foreground font-normal">({v.value})</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </MotionCard>

            <MotionCard custom={4} initial="hidden" animate="visible" variants={cardVariants} className="border border-border/30 rounded-2xl overflow-hidden flex flex-col">
              {/* Ícone fora do CardTitle, ao lado do bloco título+subtítulo (mesmo ajuste dos
                  cards "Amplitude de Liderança" e "Senioridade"): como sibling do CardTitle, o
                  subtítulo nascia colado na borda esquerda do card, embaixo do ícone, em vez de
                  alinhado com o início de "Tempo de Casa". */}
              <CardHeader className="p-3 pb-2 flex flex-row items-start gap-2">
                <div className="h-7 w-7 rounded-lg bg-warning/10 text-warning flex items-center justify-center shrink-0">
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-display">Tempo de Casa</CardTitle>
                  <p className="text-[11px] text-muted-foreground">Distribuição por tempo de empresa</p>
                </div>
              </CardHeader>
              {/* `flex-1 flex flex-col justify-between` (em vez de `space-y-2` fixo): este
                  card tem só 4 faixas, contra 5 do "Senioridade" ao lado — como o grid estica
                  os três cards da linha pra mesma altura, um espaçamento fixo sobrava como um
                  vão vazio embaixo da última barra. Distribuindo as 4 linhas por todo o
                  espaço disponível, a "sobra" vira gap entre as barras (mais uniforme e sem
                  vão), em vez de ficar concentrada no rodapé do card. */}
              <CardContent className="p-3 pt-1 flex-1 flex flex-col justify-between">
                {estrutura.tempoDeCasa.map((item, i) => (
                  <div key={item.label} className="flex items-center gap-2">
                    <span className="w-20 shrink-0 text-[11px] text-muted-foreground truncate">{item.label}</span>
                    <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${item.pct}%` }}
                        transition={{ duration: 0.6, delay: 0.1 + i * 0.08, ease: 'easeOut' }}
                        className="h-full rounded-full bg-gradient-to-r from-success to-primary"
                      />
                    </div>
                    <span className="w-8 shrink-0 text-right text-[11px] font-medium">{item.pct}%</span>
                  </div>
                ))}
              </CardContent>
            </MotionCard>
          </div>

          {/* Insights: leitura executiva da estrutura atual */}
          <MotionCard custom={5} initial="hidden" animate="visible" variants={cardVariants} className="border border-border/30 rounded-2xl overflow-hidden">
            <CardHeader className="p-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-display flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg flex items-center justify-center bg-warning/10 text-warning shrink-0">
                    <Lightbulb className="h-4 w-4" />
                  </div>
                  Principais Insights
                </CardTitle>
                <p className="text-[10px] text-muted-foreground mt-1">Leitura executiva da estrutura atual</p>
              </div>
              <Button
                size="sm"
                className="rounded-full bg-primary/15 text-primary text-xs font-semibold border border-primary/30 hover:bg-primary/25 hover:border-primary/50 shadow-none shrink-0"
                onClick={() => navigate('/organograma')}
              >
                Ver análise completa <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </CardHeader>
            <CardContent className="p-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* `h-full` + `items-center` (em vez de `items-start`): o card do meio quebra
                    em 2 linhas ("62% do quadro está concentrado em Operações e Comercial") e
                    fica mais alto que os outros dois — o grid estica todos os 3 pra mesma
                    altura, e com `items-start` o ícone+texto dos cards mais curtos ficava
                    "preso" no topo, sobrando vão vazio embaixo. Agora o conteúdo de cada card
                    fica centralizado verticalmente dentro dele. */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 + 0 * 0.06 }} className="relative h-full overflow-hidden rounded-xl border border-destructive/20 bg-destructive/5 py-3.5 pl-4 pr-3.5">
                  <div className="absolute inset-y-0 left-0 w-1 bg-destructive" />
                  <div className="flex h-full items-center gap-3">
                    <div className="p-2 rounded-full bg-destructive text-destructive-foreground shrink-0 shadow-[0_0_0_4px_hsl(var(--destructive)/0.12)]"><Users className="h-4 w-4" /></div>
                    <div>
                      <p className="text-xs font-semibold">{estrutura.amplitudeLideranca.liderancasAcimaDaFaixa} liderança com mais de 15 liderados</p>
                      <p className="text-[10px] text-muted-foreground">Revisar distribuição para maior equilíbrio.</p>
                    </div>
                  </div>
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 + 1 * 0.06 }} className="relative h-full overflow-hidden rounded-xl border border-info/20 bg-info/5 py-3.5 pl-4 pr-3.5">
                  <div className="absolute inset-y-0 left-0 w-1 bg-info" />
                  <div className="flex h-full items-center gap-3">
                    <div className="p-2 rounded-full bg-info text-info-foreground shrink-0 shadow-[0_0_0_4px_hsl(var(--info)/0.12)]"><Building2 className="h-4 w-4" /></div>
                    <div>
                      <p className="text-xs font-semibold">62% do quadro está concentrado em Operações e Comercial</p>
                      <p className="text-[10px] text-muted-foreground">Atenção à concentração de equipe.</p>
                    </div>
                  </div>
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 + 2 * 0.06 }} className="relative h-full overflow-hidden rounded-xl border border-success/20 bg-success/5 py-3.5 pl-4 pr-3.5">
                  <div className="absolute inset-y-0 left-0 w-1 bg-success" />
                  <div className="flex h-full items-center gap-3">
                    <div className="p-2 rounded-full bg-success text-success-foreground shrink-0 shadow-[0_0_0_4px_hsl(var(--success)/0.12)]"><Layers className="h-4 w-4" /></div>
                    <div>
                      <p className="text-xs font-semibold">48% dos colaboradores estão nos níveis Júnior e Pleno</p>
                      <p className="text-[10px] text-muted-foreground">Oportunidades de desenvolvimento e carreira.</p>
                    </div>
                  </div>
                </motion.div>
              </div>
            </CardContent>
          </MotionCard>
        </Tabs.Panel>

        <Tabs.Panel value="estrategia" className="space-y-3">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
            {/* Projeção de Desembolso com Pessoal */}
            <MotionCard custom={0} initial="hidden" animate="visible" variants={cardVariants} className="lg:col-span-3 border border-border/30 rounded-2xl overflow-hidden">
              <CardHeader className="p-2.5 pb-1.5 flex-row items-center space-y-0 gap-2">
                <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-sm font-display">Projeção de Desembolso com Pessoal</CardTitle>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Orçado vs. forecast dos próximos 6 meses</p>
                </div>
              </CardHeader>
              <CardContent className="p-3 pt-1">
                <div className="flex items-center justify-between gap-3 rounded-xl border border-border/30 bg-background/50 py-1.5 px-3 mb-1.5">
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 * 0.06 }} className="flex items-center gap-2 min-w-0">
                    <div className="h-7 w-7 rounded-lg flex items-center justify-center bg-success/10 text-success shrink-0"><DollarSign className="h-4 w-4" /></div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-muted-foreground truncate">Orçamento anual</p>
                      <p className="text-sm font-display font-semibold truncate">{formatValue(orcamentoResumo.orcadoAnual, 'currency')}</p>
                    </div>
                  </motion.div>
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 * 0.06 }} className="flex items-center gap-2 min-w-0">
                    <div className="h-7 w-7 rounded-lg flex items-center justify-center bg-success/10 text-success shrink-0"><BarChart3 className="h-4 w-4" /></div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-muted-foreground truncate">Forecast de fechamento</p>
                      <p className="text-sm font-display font-semibold truncate">{formatValue(orcamentoResumo.forecastFechamento, 'currency')}</p>
                    </div>
                  </motion.div>
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 2 * 0.06 }} className="flex items-center gap-2 min-w-0">
                    <div className="h-7 w-7 rounded-lg flex items-center justify-center bg-destructive/10 text-destructive shrink-0"><AlertTriangle className="h-4 w-4" /></div>
                    <div className="min-w-0">
                      <p className="flex items-center gap-1 text-[10px] text-muted-foreground truncate">
                        Desvio projetado
                        <InfoTooltip content={dashboardTooltips.dashboardExecutivo.estrategia.desvioProjetado} />
                      </p>
                      <p className="text-sm font-display font-semibold text-destructive truncate">{desvioOrcamentoAnualPct >= 0 ? '+' : ''}{desvioOrcamentoAnualPct.toFixed(1)}%</p>
                    </div>
                  </motion.div>
                </div>
                <div className="flex items-center justify-end gap-6 mb-0.5">
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="h-2 w-2 rounded-full border-2 border-muted-foreground/50" />Orçado
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="h-2 w-2 rounded-full bg-primary" />Forecast
                  </span>
                </div>
                <div className="h-[154px] my-2">
                  {/* `AnimatePresence` local (sem props) + clip-path animado: mesma
                      técnica de `HeadcountOverviewCard.tsx` ("Visão Geral da Empresa"),
                      ver comentário equivalente no gráfico de "Evolução do Quadro". */}
                  <AnimatePresence>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={desembolsoProjecao} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorProjecaoForecast" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                        <clipPath id="projecaoExec-reveal-clip">
                          <motion.rect
                            key={desembolsoProjecao.length}
                            x="0" y="0" height="100%"
                            initial={{ width: 0 }}
                            animate={{ width: '100%' }}
                            transition={{ duration: 2.5, ease: 'easeInOut' }}
                          />
                        </clipPath>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="mes_ref" tickFormatter={(v) => format(new Date(v), 'MMM/yy', { locale: ptBR })} fontSize={10} />
                      <YAxis fontSize={10} tickFormatter={(v) => `R$${v / 1000}k`} />
                      <Tooltip
                        labelFormatter={(v: any) => format(new Date(v), 'MMM/yy', { locale: ptBR })}
                        formatter={(v: any) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', padding: '4px 8px', fontSize: '10px' }}
                        labelStyle={{ fontSize: '10px', marginBottom: 2 }}
                        itemStyle={{ fontSize: '10px', padding: 0 }}
                      />
                      <Line type="monotone" dataKey="orcado" name="Orçado" stroke="hsl(var(--muted-foreground))" strokeWidth={2} strokeDasharray="4 4" dot={false} isAnimationActive={false} clipPath="url(#projecaoExec-reveal-clip)" />
                      <Area
                        type="monotone" dataKey="forecast" name="Forecast" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#colorProjecaoForecast)" isAnimationActive={false}
                        dot={{ r: 3, fill: 'hsl(var(--primary))', strokeWidth: 0 }}
                        activeDot={{ r: 5 }}
                        clipPath="url(#projecaoExec-reveal-clip)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                  </AnimatePresence>
                </div>
                <div className="@container mt-2 p-2 bg-info/5 rounded-xl border border-info/10 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-info shrink-0" />
                  {/* `cqw` (não px fixo): o tamanho da fonte escala com a largura do
                      próprio card azul (`@container` no pai) — como a frase tem
                      comprimento fixo, isso mantém a linha sempre ocupando ~toda a
                      largura disponível, numa linha só, em qualquer tamanho de tela. */}
                  <p className="min-w-0 whitespace-nowrap truncate text-[1.3cqw] leading-tight text-muted-foreground">
                    A projeção considera a média das últimas folhas, provisões de férias/13º acumuladas e encargos patronais. Não considera admissões futuras não aprovadas.
                  </p>
                </div>
              </CardContent>
            </MotionCard>

            {/* Resumo Orçamentário */}
            <MotionCard
              custom={1}
              initial="hidden"
              animate="visible"
              variants={cardVariants}
              className="lg:col-span-2 self-start min-w-0 border border-border/30 rounded-2xl overflow-hidden flex flex-col"
            >
              <CardHeader className="p-3 pb-2 flex-row items-center space-y-0 gap-2 shrink-0">
                <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Wallet className="h-4 w-4" />
                </div>

                <div className="min-w-0">
                  <CardTitle className="text-sm font-display">
                    Resumo Orçamentário
                  </CardTitle>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Situação consolidada do planejamento
                  </p>
                </div>
              </CardHeader>

              <CardContent className="p-3 pt-1 flex-1 min-h-0 flex flex-col gap-3">

                {/* Métricas superiores — grid 2×2 */}
                <div className="grid grid-cols-2 gap-3 shrink-0">

                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 + 0 * 0.06 }} className="rounded-xl border border-border/30 bg-background/50 p-3 flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-success/10 text-success shrink-0">
                      <DollarSign className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] text-muted-foreground truncate">
                        Orçamento anual
                      </p>
                      <p className="text-base font-display font-semibold truncate">
                        {formatValue(orcamentoResumo.orcadoAnual, 'currency')}
                      </p>
                    </div>
                  </motion.div>

                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 + 1 * 0.06 }} className="rounded-xl border border-border/30 bg-background/50 p-3 flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-primary/10 text-primary shrink-0">
                      <BarChart3 className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] text-muted-foreground truncate">
                        Realizado
                      </p>
                      <p className="text-base font-display font-semibold truncate">
                        {formatValue(orcamentoResumo.realizado, 'currency')}
                      </p>
                    </div>
                  </motion.div>

                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 + 2 * 0.06 }} className="rounded-xl border border-border/30 bg-background/50 p-3 flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-info/10 text-info shrink-0">
                      <TrendingUp className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] text-muted-foreground truncate">
                        Forecast
                      </p>
                      <p className="text-base font-display font-semibold truncate">
                        {formatValue(orcamentoResumo.forecastFechamento, 'currency')}
                      </p>
                    </div>
                  </motion.div>

                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 + 3 * 0.06 }} className="rounded-xl border border-border/30 bg-background/50 p-3 flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-destructive/10 text-destructive shrink-0">
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] text-muted-foreground truncate">
                        Desvio
                      </p>
                      <p className="text-base font-display font-semibold text-destructive truncate">
                        {desvioOrcamentoAnual >= 0 ? '+' : '-'}
                        {formatMil(desvioOrcamentoAnual)}
                      </p>
                    </div>
                  </motion.div>

                </div>

                {/* Bloco inferior — dois cards lado a lado, altura pelo próprio conteúdo
                    (não mais esticados a preencher toda a sobra vertical do card).
                    `items-start` (não `items-center`): o bloco fica colado logo
                    abaixo do grid de métricas — só a folga que sobrar vai para o
                    rodapé do card, sem abrir um vão grande entre as métricas e
                    "Compromissos previstos"/"Custo pessoal / receita". */}
                <div className="flex-1 min-h-0 flex items-start">
                  <div className="w-full grid grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)] gap-3">

                    {/* Compromissos previstos */}
                    <div className="min-w-0 rounded-xl border border-border/30 bg-background/50 p-3 flex flex-col">

                      <p className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground mb-2 shrink-0">
                        <Calendar className="h-3.5 w-3.5" />
                        Compromissos previstos
                      </p>

                      <div className="flex flex-col gap-2">

                        {compromissosPrevistos.map((c, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.08 + i * 0.06 }}
                            className="flex items-center justify-between gap-2 min-w-0"
                          >
                            <span className="flex items-center gap-1.5 text-xs min-w-0">
                              <Calendar className="h-3.5 w-3.5 text-info shrink-0" />
                              <span className="truncate">
                                {c.label}
                              </span>
                            </span>

                            <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
                              {c.quando}
                            </span>
                          </motion.div>
                        ))}

                      </div>
                    </div>

                    {/* Custo pessoal / receita */}
                    <div className="min-w-0 rounded-xl border border-border/30 bg-background/50 p-3 flex flex-col">

                      <p className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground mb-2 shrink-0 whitespace-nowrap">
                        Custo pessoal / receita
                        <InfoTooltip content={dashboardTooltips.dashboardExecutivo.estrategia.custoPessoalReceita} />
                      </p>

                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 + 4 * 0.06 }} className="flex items-center justify-center">

                        <div className="grid grid-cols-[48px_minmax(0,1fr)] items-center gap-3 min-w-0">

                          <div className="relative h-12 w-12 shrink-0">
                            <svg
                              width={48}
                              height={48}
                              viewBox="0 0 48 48"
                              className="-rotate-90"
                            >
                              <circle
                                cx={24}
                                cy={24}
                                r={19}
                                fill="none"
                                stroke="hsl(var(--muted))"
                                strokeWidth={6}
                                opacity={0.3}
                              />

                              <circle
                                cx={24}
                                cy={24}
                                r={19}
                                fill="none"
                                stroke={
                                  custoPessoalDentroMeta
                                    ? 'hsl(var(--success))'
                                    : 'hsl(var(--destructive))'
                                }
                                strokeWidth={6}
                                strokeLinecap="round"
                                strokeDasharray={`${(orcamentoResumo.custoPessoalReceitaPct / 100) * (2 * Math.PI * 19)} ${2 * Math.PI * 19}`}
                              />
                            </svg>
                          </div>

                          <div className="min-w-0">
                            <p className="text-3xl font-display font-semibold leading-none whitespace-nowrap">
                              {orcamentoResumo.custoPessoalReceitaPct}%
                            </p>

                            <p className="text-xs text-muted-foreground mt-2 whitespace-nowrap">
                              Meta ≤ {orcamentoResumo.metaCustoPessoalReceitaPct}%
                            </p>
                          </div>

                        </div>

                      </motion.div>
                    </div>

                  </div>
                </div>
              </CardContent>
            </MotionCard>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-7 gap-3">
            {/* Aderência Orçamentária por Depto. */}
            <MotionCard custom={2} initial="hidden" animate="visible" variants={cardVariants} className="lg:col-span-4 border border-border/30 rounded-2xl overflow-hidden">
              <CardHeader className="p-3 pb-2 flex flex-row items-start justify-between gap-3">
                <div className="flex items-start gap-2 min-w-0">
                  <div className="h-7 w-7 rounded-lg bg-warning/10 text-warning flex items-center justify-center shrink-0">
                    <Landmark className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <CardTitle className="text-sm font-display">Aderência Orçamentária por Depto.</CardTitle>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Desvio entre orçamento e forecast por área</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  className="rounded-full bg-primary/15 text-primary text-xs font-semibold border border-primary/30 hover:bg-primary/25 hover:border-primary/50 shadow-none shrink-0"
                >
                  Gerenciar orçamento <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                </Button>
              </CardHeader>
              <CardContent className="p-3 pt-1">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/30 hover:bg-transparent">
                      <TableHead className="h-7 px-2 text-xs font-normal text-muted-foreground w-[300px]">Departamento</TableHead>
                      <TableHead className="h-7 px-2 pl-8 text-xs font-normal text-muted-foreground text-left">Orçado / Forecast</TableHead>
                      <TableHead className="h-7 px-2 text-xs font-normal text-muted-foreground text-center">Variação</TableHead>
                      <TableHead className="h-7 px-2 text-xs font-normal text-muted-foreground text-center">
                        <span className="inline-flex items-center gap-1">
                          Status
                          <InfoTooltip content={dashboardTooltips.dashboardExecutivo.estrategia.statusAderencia} />
                        </span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {aderenciaDepartamentos.map((d, i) => {
                      const meta = ADERENCIA_STATUS_META[d.status];
                      return (
                        <TableRow key={d.departamento} className="border-border/50">
                          <TableCell className="p-1.5">
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-medium w-[70px] shrink-0 truncate">{d.departamento}</span>
                              <div className="flex-1 max-w-[230px] h-2 rounded-full bg-muted-foreground/25 border border-muted-foreground/40 overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${Math.min(100, (d.forecast / d.orcado) * 100)}%` }}
                                  transition={{ duration: 0.6, delay: 0.15 + i * 0.1, ease: 'easeOut' }}
                                  className="h-full rounded-full"
                                  style={{ backgroundImage: meta.barGradient }}
                                />
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="p-1.5 pl-8 text-left text-xs text-muted-foreground whitespace-nowrap">{formatK(d.orcado)} / {formatK(d.forecast)}</TableCell>
                          <TableCell className={cn('p-1.5 text-center text-xs font-semibold whitespace-nowrap', meta.text)}>
                            {d.desvioPct >= 0 ? '+' : ''}{d.desvioPct.toFixed(1)}%
                          </TableCell>
                          <TableCell className="p-1.5 text-center">
                            <Badge variant={meta.badge} size="sm">{meta.label}</Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </MotionCard>

            {/* Plano de Pessoas */}
            <MotionCard custom={3} initial="hidden" animate="visible" variants={cardVariants} className="lg:col-span-3 border border-border/30 rounded-2xl overflow-hidden">
              <CardHeader className="p-3 pb-2 flex flex-row items-start justify-between gap-3">
                <div className="flex items-start gap-2 min-w-0">
                  <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Briefcase className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <CardTitle className="text-sm font-display">Plano de Pessoas</CardTitle>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Posições e investimentos previstos</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  className="rounded-full bg-primary/15 text-primary text-xs font-semibold border border-primary/30 hover:bg-primary/25 hover:border-primary/50 shadow-none shrink-0"
                >
                  Gerenciar planejamento <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                </Button>
              </CardHeader>
              <CardContent className="p-3 pt-1 space-y-2.5">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 + 0 * 0.06 }} className="rounded-xl border border-border/30 bg-background/50 p-2 flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-success/10 text-success shrink-0"><Users className="h-4 w-4" /></div>
                    <div className="min-w-0 pr-2">
                      <p className="text-base font-display font-semibold leading-none">{planoPessoas.posicoesAprovadas}</p>
                      <p className="text-[9px] text-muted-foreground mt-1 leading-tight">posições aprovadas</p>
                    </div>
                  </motion.div>
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 + 1 * 0.06 }} className="rounded-xl border border-border/30 bg-background/50 p-2 flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-warning/10 text-warning shrink-0"><UserPlus className="h-4 w-4" /></div>
                    <div className="min-w-0 pr-2">
                      <p className="text-base font-display font-semibold leading-none">{planoPessoas.contratacoesPrevistas}</p>
                      <p className="text-[9px] text-muted-foreground mt-1 leading-tight">contratações previstas</p>
                    </div>
                  </motion.div>
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 + 2 * 0.06 }} className="rounded-xl border border-border/30 bg-background/50 p-2 flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-info/10 text-info shrink-0"><TrendingUp className="h-4 w-4" /></div>
                    <div className="min-w-0 pr-2">
                      <p className="text-base font-display font-semibold leading-none">{planoPessoas.promocoes}</p>
                      <p className="text-[9px] text-muted-foreground mt-1 leading-tight">promoções</p>
                    </div>
                  </motion.div>
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 + 3 * 0.06 }} className="rounded-xl border border-border/30 bg-background/50 p-2 flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-muted text-muted-foreground shrink-0"><IdCard className="h-4 w-4" /></div>
                    <div className="min-w-0 pr-2">
                      <p className="text-base font-display font-semibold leading-none">{planoPessoas.reajustesPlanejados}</p>
                      <p className="text-[9px] text-muted-foreground mt-1 leading-tight">reajuste planejado</p>
                    </div>
                  </motion.div>
                </div>

                <div className="flex items-center justify-between gap-4 rounded-xl border border-border/30 bg-background/50 p-3">
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 + 0 * 0.06 }} className="flex items-center gap-2 min-w-0">
                    <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-success/10 text-success shrink-0"><DollarSign className="h-4 w-4" /></div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-muted-foreground truncate">Impacto mensal</p>
                      <p className="text-sm font-display font-semibold truncate">{formatValue(planoPessoas.impactoMensal, 'currency')}</p>
                    </div>
                  </motion.div>
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 + 1 * 0.06 }} className="flex items-center gap-2 min-w-0">
                    <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-primary/10 text-primary shrink-0"><BarChart3 className="h-4 w-4" /></div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-muted-foreground truncate">Impacto anualizado</p>
                      <p className="text-sm font-display font-semibold truncate">{formatValue(planoPessoas.impactoAnualizado, 'currency')}</p>
                    </div>
                  </motion.div>
                </div>

                <div>
                  <p className="text-[11px] font-medium text-muted-foreground mb-3">Cronograma de contratações e movimentações</p>
                  <div className="relative flex items-start justify-between px-1">
                    <div className="absolute left-1 right-1 top-[5px] h-px bg-border" />
                    {planoPessoas.cronograma.map((item, i) => (
                      <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 + i * 0.06 }} className="relative z-10 flex flex-col items-center gap-1.5 text-center flex-1 px-1">
                        <span className={cn('h-2.5 w-2.5 rounded-full ring-4 ring-background', item.tone)} />
                        <span className="text-[10px] font-semibold">{item.mes}</span>
                        <span className="text-[10px] text-muted-foreground leading-tight">{item.descricao}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </MotionCard>
          </div>

          {/* Principais insights */}
          <MotionCard custom={4} initial="hidden" animate="visible" variants={cardVariants} className="border border-border/30 rounded-2xl overflow-hidden">
            <CardHeader className="p-3 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <div className="h-7 w-7 rounded-lg flex items-center justify-center bg-warning/10 text-warning shrink-0">
                  <Lightbulb className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-sm font-display">Principais Insights</CardTitle>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Análise automática dos dados do período</p>
                </div>
              </div>
              <Button
                size="sm"
                className="rounded-full bg-primary/15 text-primary text-xs font-semibold border border-primary/30 hover:bg-primary/25 hover:border-primary/50 shadow-none"
                onClick={() => setActiveTab('analitico')}
              >
                Ver análise completa <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </CardHeader>
            <CardContent className="p-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 + 0 * 0.06 }} className="relative overflow-hidden rounded-xl border border-destructive/20 bg-destructive/5 py-3.5 pl-4 pr-3.5">
                  <div className="absolute inset-y-0 left-0 w-1 bg-destructive" />
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-full bg-destructive text-destructive-foreground shrink-0 shadow-[0_0_0_4px_hsl(var(--destructive)/0.12)]"><TrendingDown className="h-4 w-4" /></div>
                    <div>
                      <p className="text-xs font-semibold">Fechamento projetado {desvioOrcamentoAnualPct.toFixed(1)}% acima do orçamento</p>
                      <p className="text-[10px] text-muted-foreground">Se mantido o cenário atual, o custo com pessoal fecha acima do planejado.</p>
                    </div>
                  </div>
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 + 1 * 0.06 }} className="relative overflow-hidden rounded-xl border border-info/20 bg-info/5 py-3.5 pl-4 pr-3.5">
                  <div className="absolute inset-y-0 left-0 w-1 bg-info" />
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-full bg-info text-info-foreground shrink-0 shadow-[0_0_0_4px_hsl(var(--info)/0.12)]"><Calendar className="h-4 w-4" /></div>
                    <div>
                      <p className="text-xs font-semibold">Pico de desembolso em {picoProjecao ? format(new Date(picoProjecao.mes_ref), 'MMM/yy', { locale: ptBR }) : '—'}</p>
                      <p className="text-[10px] text-muted-foreground">{picoLabel} adicionará aproximadamente {formatMil(impactoPico)} ao fechamento do mês.</p>
                    </div>
                  </div>
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 + 2 * 0.06 }} className="relative overflow-hidden rounded-xl border border-success/20 bg-success/5 py-3.5 pl-4 pr-3.5">
                  <div className="absolute inset-y-0 left-0 w-1 bg-success" />
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-full bg-success text-success-foreground shrink-0 shadow-[0_0_0_4px_hsl(var(--success)/0.12)]"><TrendingUp className="h-4 w-4" /></div>
                    <div>
                      <p className="text-xs font-semibold">Oportunidade em {aderenciaMaiorDesvio?.departamento || 'Logística'}</p>
                      <p className="text-[10px] text-muted-foreground">Revisão de horas extras pode economizar cerca de R$ 12 mil/mês.</p>
                    </div>
                  </div>
                </motion.div>
              </div>
            </CardContent>
          </MotionCard>
        </Tabs.Panel>
        <Tabs.Panel value="analitico" className="space-y-3">
          {/* Prioridades Executivas */}
          <MotionCard custom={0} initial="hidden" animate="visible" variants={cardVariants} className="border border-border/30 rounded-2xl overflow-hidden">
            <CardHeader className="p-3 pb-2 flex flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <div className="h-9 w-9 rounded-xl bg-destructive text-destructive-foreground flex items-center justify-center shrink-0 shadow-[0_0_0_4px_hsl(var(--destructive)/0.15)]">
                  <Target className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-sm font-display">Prioridades Executivas</CardTitle>
                  <p className="text-[11px] text-muted-foreground mt-0.5">O que precisa de atenção agora</p>
                </div>
              </div>
              <button type="button" className="shrink-0 flex items-center text-primary text-[11px] font-semibold hover:underline">
                Ver todas <ArrowUpRight className="ml-0.5 h-3 w-3" />
              </button>
            </CardHeader>
            <CardContent className="p-3 pt-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {prioridadesExecutivas.map((p, i) => {
                const meta = SEVERIDADE_META[p.severidade];
                const Icon = meta.icon;
                return (
                  <motion.div
                    key={p.titulo}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className={cn('relative h-full overflow-hidden rounded-xl border py-3 pl-3.5 pr-3 flex flex-col gap-2', meta.boxBorder, meta.boxBg)}
                  >
                    <div className={cn('absolute inset-y-0 left-0 w-1', meta.bar)} />
                    <span className={cn('inline-flex items-center gap-1.5 self-start rounded-full px-2.5 py-1 text-xs font-bold tracking-wide', meta.pill)}>
                      <Icon className="h-3.5 w-3.5" /> {meta.label}
                      <InfoTooltip content={dashboardTooltips.dashboardExecutivo.analiseDetalhada.severidade} />
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold leading-snug">{p.titulo}</p>
                    </div>
                    <div className="flex items-end justify-between gap-2">
                      <p className="min-w-0 truncate text-xs text-muted-foreground">{p.detalhe}</p>
                      <Button
                        size="sm"
                        className={cn('shrink-0 rounded-full text-xs h-7 px-3 shadow-none', meta.button)}
                        onClick={() => navigate(p.rota)}
                      >
                        {p.acao} <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </CardContent>
          </MotionCard>

          {/* Exposição Trabalhista + Compliance eSocial + Pendências Críticas */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <MotionCard custom={1} initial="hidden" animate="visible" variants={cardVariants} className="border border-border/30 rounded-2xl overflow-hidden flex flex-col">
              <CardHeader className="p-3 pb-2 flex flex-row items-start justify-between gap-2">
                <div className="flex items-start gap-2 min-w-0">
                  <div className="h-9 w-9 rounded-xl bg-destructive text-destructive-foreground flex items-center justify-center shrink-0 shadow-[0_0_0_4px_hsl(var(--destructive)/0.15)]">
                    <Scale className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <CardTitle className="text-sm font-display">Exposição Trabalhista</CardTitle>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Visão detalhada dos riscos e provisionamentos</p>
                  </div>
                </div>
                <button type="button" className="shrink-0 flex items-center text-primary text-[11px] font-semibold hover:underline" onClick={() => navigate('/passivo-trabalhista')}>
                  Ver análise <ArrowUpRight className="ml-0.5 h-3 w-3" />
                </button>
              </CardHeader>
              <CardContent className="p-3 pt-1 flex-1 flex flex-col gap-3">
                <div>
                  <p className="text-3xl font-display font-bold leading-none">{formatValue(exposicaoTrabalhista.valor, 'currency')}</p>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className="inline-flex items-center gap-1 rounded-full border-2 border-destructive bg-destructive/15 text-destructive-foreground text-[10.5px] font-semibold px-1.5 py-0.5">
                      <TrendingUp className="h-3 w-3" /> +{exposicaoTrabalhista.variacaoPct}%
                    </span>
                    <span className="text-[11px] text-muted-foreground">vs. período anterior</span>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                    <span className="flex items-center gap-1">
                      Provisionamento
                      <InfoTooltip content={dashboardTooltips.dashboardExecutivo.analiseDetalhada.provisionamento} />
                    </span>
                    <span className="font-semibold text-foreground">{exposicaoTrabalhista.provisionamentoPct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${exposicaoTrabalhista.provisionamentoPct}%` }}
                      transition={{ duration: 0.6, delay: 0.18, ease: 'easeOut' }}
                      className="h-full rounded-full bg-gradient-to-r from-warning to-destructive"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-auto">
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 + 0 * 0.06 }} className="rounded-xl border border-border/30 bg-background/50 p-2 flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <FileText className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-base font-display font-semibold leading-none">{exposicaoTrabalhista.processosAtivos}</p>
                      <p className="text-[9px] text-muted-foreground mt-1 leading-tight">Processos ativos</p>
                    </div>
                  </motion.div>
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 + 1 * 0.06 }} className="rounded-xl border border-border/30 bg-background/50 p-2 flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
                      <AlertTriangle className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-base font-display font-semibold leading-none text-destructive">{exposicaoTrabalhista.altoRisco}</p>
                      <p className="flex items-center gap-0.5 text-[9px] text-muted-foreground mt-1 leading-tight">
                        Alto risco
                        <InfoTooltip content={dashboardTooltips.dashboardExecutivo.analiseDetalhada.altoRisco} />
                      </p>
                    </div>
                  </motion.div>
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 + 2 * 0.06 }} className="rounded-xl border border-border/30 bg-background/50 p-2 flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-info/10 text-info flex items-center justify-center shrink-0">
                      <Users className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-base font-display font-semibold leading-none">{exposicaoTrabalhista.emAuditoria}</p>
                      <p className="text-[9px] text-muted-foreground mt-1 leading-tight">Em auditoria</p>
                    </div>
                  </motion.div>
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 + 3 * 0.06 }} className="rounded-xl border border-border/30 bg-background/50 p-2 flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-success/10 text-success flex items-center justify-center shrink-0">
                      <DollarSign className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-base font-display font-semibold leading-none">{formatValue(exposicaoTrabalhista.valorPotencial, 'currency')}</p>
                      <p className="text-[9px] text-muted-foreground mt-1 leading-tight">Valor potencial</p>
                    </div>
                  </motion.div>
                </div>
              </CardContent>
            </MotionCard>

            <MotionCard custom={2} initial="hidden" animate="visible" variants={cardVariants} className="border border-border/30 rounded-2xl overflow-hidden flex flex-col">
              <CardHeader className="p-3 pb-2 flex flex-row items-start justify-between gap-2">
                <div className="flex items-start gap-2 min-w-0">
                  <div className="h-7 w-7 rounded-lg bg-info/10 text-info flex items-center justify-center shrink-0">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <CardTitle className="text-sm font-display">Compliance eSocial</CardTitle>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Acompanhamento dos eventos e conformidade legal</p>
                  </div>
                </div>
                <button type="button" className="shrink-0 flex items-center text-primary text-[11px] font-semibold hover:underline" onClick={() => navigate('/esocial')}>
                  Ver detalhes <ArrowUpRight className="ml-0.5 h-3 w-3" />
                </button>
              </CardHeader>
              <CardContent className="p-3 pt-1 flex-1 flex flex-col gap-3">
                <div className="flex items-center gap-4">
                  <div className="relative h-24 w-24 shrink-0">
                    <svg width={ESOCIAL_DONUT_SIZE} height={ESOCIAL_DONUT_SIZE} viewBox={`0 0 ${ESOCIAL_DONUT_SIZE} ${ESOCIAL_DONUT_SIZE}`} className="-rotate-90">
                      <circle cx={ESOCIAL_DONUT_SIZE / 2} cy={ESOCIAL_DONUT_SIZE / 2} r={esocialRaio} fill="none" stroke="hsl(var(--muted))" strokeWidth={ESOCIAL_DONUT_STROKE} opacity={0.3} />
                      {/* Traçado progressivo do `strokeDasharray`, mesma técnica do
                          `DonutChart.tsx` ("Tipo de Vínculo") — mas sem `useInView`: lá o
                          gate por scroll faz sentido porque o componente pode ficar
                          abaixo da dobra em qualquer página; aqui o SVG só existe no DOM
                          quando a aba "Análise Detalhada" já está ativa (`Tabs.Panel`
                          desmonta o painel inativo), então o próprio mount já É o
                          momento certo de disparar — um `useInView` com ref declarado no
                          componente da página (que monta uma vez só, antes de a aba
                          existir) nunca reobserva o SVG depois que ele aparece, e o anel
                          fica travado em 0 (foi o bug reportado: nada desenhava). */}
                      {esocialArcos.map((seg, i) => {
                        const dashArray = `${Math.max(seg.length - (esocialArcos.length > 1 ? 2 : 0), 0)} ${esocialCircunferencia}`;
                        return (
                          <motion.circle
                            key={seg.label}
                            cx={ESOCIAL_DONUT_SIZE / 2}
                            cy={ESOCIAL_DONUT_SIZE / 2}
                            r={esocialRaio}
                            fill="none"
                            stroke={seg.color}
                            strokeWidth={ESOCIAL_DONUT_STROKE}
                            strokeDashoffset={-seg.offset}
                            strokeLinecap="round"
                            initial={{ strokeDasharray: `0 ${esocialCircunferencia}` }}
                            animate={{ strokeDasharray: dashArray }}
                            transition={{ duration: 0.6, delay: 0.2 + i * 0.15, ease: 'easeOut' }}
                          />
                        );
                      })}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-xl font-display font-bold leading-none">{complianceEsocial.aceitacaoPct}%</span>
                      <span className="flex items-center gap-0.5 text-[9px] text-muted-foreground mt-0.5">
                        Aceitação
                        <InfoTooltip content={dashboardTooltips.dashboardExecutivo.analiseDetalhada.aceitacaoEsocial} />
                      </span>
                    </div>
                  </div>
                  <ul className="min-w-0 flex-1 space-y-2">
                    {esocialSegmentosBase.map((seg) => (
                      <li key={seg.label} className="flex items-center gap-2 text-xs">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: seg.color }} />
                        <span className="min-w-0 flex-1 truncate text-muted-foreground">{seg.label}</span>
                        <span className="font-display font-medium">{seg.value}</span>
                      </li>
                    ))}
                    <li className="flex items-center gap-2 text-xs pt-2 mt-0.5 border-t border-border/50">
                      <span className="min-w-0 flex-1 text-muted-foreground">Total</span>
                      <span className="font-display font-medium">{totalEventosEsocial}</span>
                    </li>
                  </ul>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-auto">
                  <div className="min-w-0 rounded-xl border border-border/30 bg-background/50 p-2.5 flex flex-col gap-1.5">
                    <div className="h-7 w-7 rounded-lg bg-success/10 text-success flex items-center justify-center shrink-0">
                      <ShieldCheck className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-muted-foreground leading-tight">Certificado</p>
                      <p className="flex items-center gap-0.5 text-xs font-semibold text-success leading-tight mt-0.5">
                        Válido ({complianceEsocial.certificadoValidadeDias}d)
                        <InfoTooltip content={dashboardTooltips.dashboardExecutivo.analiseDetalhada.certificadoEsocial} />
                      </p>
                    </div>
                  </div>
                  <div className="min-w-0 rounded-xl border border-border/30 bg-background/50 p-2.5 flex flex-col gap-1.5">
                    <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Clock className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-muted-foreground leading-tight">Último envio</p>
                      <p className="text-xs font-semibold leading-tight mt-0.5">{complianceEsocial.ultimoEnvio}</p>
                    </div>
                  </div>
                  <div className="min-w-0 rounded-xl border border-border/30 bg-background/50 p-2.5 flex flex-col gap-1.5">
                    <div className="h-7 w-7 rounded-lg bg-warning/10 text-warning flex items-center justify-center shrink-0">
                      <Calendar className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-muted-foreground leading-tight">Próx. vencimento</p>
                      <p className="text-xs font-semibold leading-tight mt-0.5">{complianceEsocial.proximoVencimento}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </MotionCard>

            <MotionCard custom={3} initial="hidden" animate="visible" variants={cardVariants} className="border border-border/30 rounded-2xl overflow-hidden flex flex-col">
              <CardHeader className="p-3 pb-2 flex flex-row items-start gap-2">
                <div className="h-7 w-7 rounded-lg bg-warning/10 text-warning flex items-center justify-center shrink-0">
                  <Calendar className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-sm font-display">Pendências Críticas</CardTitle>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Tarefas fora do controle com risco de impacto</p>
                </div>
              </CardHeader>
              {/* Linhas num grid com `auto-rows-fr` (não `flex` + `justify-between`,
                  que só espaça igualmente ENTRE as linhas, sem garantir que cada
                  linha em si tenha a mesma altura): este card divide a linha com
                  "Exposição Trabalhista"/"Compliance eSocial", bem mais cheios, e o
                  grid pai estica os 3 pra mesma altura. `auto-rows-fr` faz as 4
                  linhas dividirem essa altura em faixas idênticas — preenche todo o
                  espaço (sem vão vazio embaixo) e cada faixa fica com a mesma altura
                  (espaçamento uniforme), com o conteúdo centralizado dentro dela via
                  `items-center` (o Status fica alinhado no meio de cada faixa). */}
              <CardContent className="p-3 pt-1 flex-1 flex flex-col">
                <div className="grid grid-cols-[minmax(0,1fr)_40px_60px_68px_66px] gap-2 px-1 pb-1.5 border-b border-border/30">
                  <span className="text-[10px] font-normal text-muted-foreground">Categoria</span>
                  <span className="text-[10px] font-normal text-muted-foreground text-center">Pend.</span>
                  <span className="text-[10px] font-normal text-muted-foreground text-center">
                    <span className="inline-flex items-center gap-0.5">
                      SLA
                      <InfoTooltip content={dashboardTooltips.dashboardExecutivo.analiseDetalhada.slaPendencias} />
                    </span>
                  </span>
                  <span className="text-[10px] font-normal text-muted-foreground text-center">Antiga</span>
                  <span className="text-[10px] font-normal text-muted-foreground text-center">
                    <span className="inline-flex items-center gap-0.5">
                      Status
                      <InfoTooltip content={dashboardTooltips.dashboardExecutivo.analiseDetalhada.statusPendencias} />
                    </span>
                  </span>
                </div>
                <div className="flex-1 grid auto-rows-fr">
                  {pendenciasCriticas.map((p, i) => {
                    const meta = PENDENCIA_STATUS_META[p.status];
                    const Icon = p.icon;
                    return (
                      <motion.div
                        key={p.categoria}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.24 + i * 0.06 }}
                        className="grid grid-cols-[minmax(0,1fr)_40px_60px_68px_66px] items-center gap-2 px-1 border-b border-border/50 last:border-0"
                      >
                        <span className="flex items-center gap-2 min-w-0">
                          <span className={cn('h-6 w-6 rounded-md flex items-center justify-center shrink-0', meta.iconBox)}>
                            <Icon className="h-3.5 w-3.5" />
                          </span>
                          <span className="text-xs font-medium leading-tight">{p.categoria}</span>
                        </span>
                        <span className="text-center text-xs">{p.pendentes}</span>
                        <span className="text-center text-xs">{p.foraSla}</span>
                        <span className="text-center text-xs text-muted-foreground whitespace-nowrap">{p.maisAntiga}</span>
                        <span className="flex justify-center">
                          <Badge variant={meta.badge} size="sm">{meta.label}</Badge>
                        </span>
                      </motion.div>
                    );
                  })}
                </div>
              </CardContent>
            </MotionCard>
          </div>

          {/* Eventos Sensíveis & Auditoria */}
          <MotionCard custom={4} initial="hidden" animate="visible" variants={cardVariants} className="border border-border/30 rounded-2xl overflow-hidden">
            <CardHeader className="p-3 pb-2 flex flex-row items-start justify-between gap-2">
              <div className="flex items-start gap-2 min-w-0">
                <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-sm font-display">Eventos Sensíveis &amp; Auditoria</CardTitle>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Movimentações relevantes no cadastro de colaboradores</p>
                </div>
              </div>
              <button type="button" className="shrink-0 flex items-center text-primary text-[11px] font-semibold hover:underline" onClick={() => navigate('/auditoria')}>
                Ver todos <ArrowUpRight className="ml-0.5 h-3 w-3" />
              </button>
            </CardHeader>
            <CardContent className="p-3 pt-1">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/30 hover:bg-transparent">
                    <TableHead className="h-7 px-2 text-xs font-semibold text-muted-foreground">Evento</TableHead>
                    <TableHead className="h-7 px-2 text-xs font-semibold text-muted-foreground text-center">Colaborador</TableHead>
                    <TableHead className="h-7 px-2 text-xs font-semibold text-muted-foreground text-center">Detalhes</TableHead>
                    <TableHead className="h-7 px-2 text-xs font-semibold text-muted-foreground text-center">Quando</TableHead>
                    <TableHead className="h-7 px-2 text-xs font-semibold text-muted-foreground text-center">
                      <span className="inline-flex items-center gap-1">
                        Por
                        <InfoTooltip content={dashboardTooltips.dashboardExecutivo.analiseDetalhada.origemEvento} />
                      </span>
                    </TableHead>
                    <TableHead className="h-7 px-2 w-8" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {eventosSensiveis.map((e) => {
                    const Icon = e.icon;
                    return (
                      <TableRow key={e.evento + e.colaborador} className="border-border/50">
                        <TableCell className="p-1.5">
                          <span className="flex items-center gap-2 text-xs font-medium whitespace-nowrap">
                            <span className={cn('h-6 w-6 rounded-md flex items-center justify-center shrink-0', EVENTO_ICON_CLASS[e.tom])}>
                              <Icon className="h-3.5 w-3.5" />
                            </span>
                            {e.evento}
                          </span>
                        </TableCell>
                        <TableCell className="p-1.5 text-xs text-center whitespace-nowrap">{e.colaborador}</TableCell>
                        <TableCell className="p-1.5 text-xs text-muted-foreground text-center whitespace-nowrap">{e.detalhes}</TableCell>
                        <TableCell className="p-1.5 text-xs text-muted-foreground text-center whitespace-nowrap">{e.quando}</TableCell>
                        <TableCell className="p-1.5 text-xs text-muted-foreground text-center whitespace-nowrap">{e.por}</TableCell>
                        <TableCell className="p-1.5">
                          <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </MotionCard>

          {/* Principais Insights — card único, largura cheia, embaixo de todos os
              outros: mesmo padrão de posicionamento usado nas abas "Estrutura" e
              "Estratégia & Orçamento" (não dividindo linha com nenhum outro card). */}
          <MotionCard custom={5} initial="hidden" animate="visible" variants={cardVariants} className="border border-border/30 rounded-2xl overflow-hidden">
            <CardHeader className="p-3 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <div className="h-7 w-7 rounded-lg flex items-center justify-center bg-warning/10 text-warning shrink-0">
                  <Lightbulb className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-sm font-display">Principais Insights</CardTitle>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Análise cruzada dos dados para apoiar decisões estratégicas</p>
                </div>
              </div>
              <Button
                size="sm"
                className="rounded-full bg-primary/15 text-primary text-xs font-semibold border border-primary/30 hover:bg-primary/25 hover:border-primary/50 shadow-none shrink-0"
                onClick={() => navigate('/auditoria')}
              >
                Ver análise completa <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </CardHeader>
            <CardContent className="p-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {insightsAnalise.map((ins, i) => {
                  const Icon = ins.icon;
                  const meta = INSIGHT_BOX_META[ins.tom];
                  return (
                    <motion.div
                      key={ins.titulo}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 + i * 0.06 }}
                      className={cn('relative h-full overflow-hidden rounded-xl border py-3.5 pl-4 pr-3.5', meta.border, meta.bg)}
                    >
                      <div className={cn('absolute inset-y-0 left-0 w-1', meta.bar)} />
                      <div className="flex h-full items-center gap-3">
                        <div className={cn('p-2 rounded-full shrink-0', meta.icon, meta.shadow)}><Icon className="h-4 w-4" /></div>
                        <div>
                          <p className="text-xs font-semibold">{ins.titulo}</p>
                          <p className="text-[10px] text-muted-foreground">{ins.descricao}</p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </CardContent>
          </MotionCard>
        </Tabs.Panel>
        </Tabs.Root>
    </PageLayout>
    </>
  );
}
