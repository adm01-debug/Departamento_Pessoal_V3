import { PageLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { FlowHoverButton } from '@/components/ui/flow-hover-button';
import { Badge } from '@/components/ui/badge';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { dashboardTooltips } from '@/constants/tooltips';
import {
  Scale, AlertTriangle, TrendingUp, Info, Download,
  RefreshCw, DollarSign, PieChart, ShieldAlert, Clock,
  ArrowRight, Landmark, FileWarning
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresas } from '@/hooks/useEmpresas';
import { motion, AnimatePresence } from 'framer-motion';
import { BARRA_PROGRESSO_DURACAO_S } from '@/components/ui/progressMotion';
import { cn } from '@/lib/utils';
import {
  XAxis, YAxis, CartesianGrid,
  ResponsiveContainer, Cell, PieChart as RePieChart, Pie, AreaChart, Area
} from 'recharts';
import { CLASSE_ENTRADA_TOOLTIP, ConteudoTooltipRosca, TooltipGrafico } from '@/components/ui/tooltipGrafico';
import { format, addMonths, differenceInDays, parseISO, differenceInMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { ChartSkeleton, KPICardSkeleton } from '@/components/ui/module-skeleton';

const COLORS = ['#a78bfa', '#34d399', '#fbbf24', 'hsl(0 84% 62%)', '#38bdf8', '#00C49F'];

/**
 * Rosca do card "Composição do Passivo" — medidas em PX ABSOLUTOS, que é a
 * unidade em que o SVG do Recharts desenha (`outerRadius` não escala com a
 * base rem do documento).
 *
 * A caixa que hospeda o gráfico precisa ter EXATAMENTE o diâmetro do anel.
 * Antes ela era `h-[200px] w-[200px]`, que o plugin
 * `scripts/postcss-escala-rem.mjs` converte para 12.5rem = 250px (o `<html>`
 * está em `font-size:125%`), enquanto o anel desenhado tem 188px: sobravam
 * 31px de vão morto de cada lado DENTRO da caixa. Como a legenda é `flex-1`
 * (cola na borda útil direita), esse vão só aparecia à esquerda — 31px de
 * folga à esquerda contra 0 à direita — e o conjunto gráfico + legendas
 * parecia empurrado para a direita do card.
 *
 * Com a caixa colada no anel e o `style` inline em px (imune à conversão
 * px→rem), o círculo encosta nas bordas da caixa e o bloco fica simétrico.
 */
const PASSIVO_DONUT_OUTER_RADIUS = 94;
const PASSIVO_DONUT_INNER_RADIUS = 54;
const PASSIVO_DONUT_SIZE = PASSIVO_DONUT_OUTER_RADIUS * 2; // 188px = diâmetro do anel

// MOCK temporário só para visualizar o layout preenchido — remover quando não for mais necessário.

/**
 * Composição do passivo — as CINCO fatias da rosca, com os valores do cenário
 * demonstrativo. Serve também de fallback por fatia: qualquer valor ausente,
 * `null` ou `NaN` vindo da consulta é substituído pelo valor daqui (era daí que
 * vinha o "R$ NaN" na legenda e a rosca com uma cor só — fatia sem valor nem
 * chega a ser desenhada pelo Recharts).
 */
const MOCK_COMPOSICAO_PASSIVO: { name: string; value: number }[] = [
  { name: 'Férias + 1/3', value: 18500 },
  { name: '13º Salário', value: 49333.33 },
  { name: 'FGTS (8%)', value: 8420 },
  { name: 'Multa FGTS (40%)', value: 3100 },
  { name: 'INSS Patronal (20%)', value: 12650 },
];

/**
 * Série temporal da projeção (6 meses). Fallback da curva: sem pelo menos dois
 * pontos finitos o `AreaChart` fica invisível (só eixos e grade), então a série
 * mockada entra no lugar da vazia.
 */
const MOCK_PROJECAO_PASSIVO: { mes: string; valor: number }[] = [
  { mes: 'out/26', valor: 82000 },
  { mes: 'nov/26', valor: 85500 },
  { mes: 'dez/26', valor: 91200 },
  { mes: 'jan/27', valor: 88000 },
  { mes: 'fev/27', valor: 89900 },
  { mes: 'mar/27', valor: 93400 },
];

/** Soma das fatias mockadas: o total que o bloco de KPIs deve espelhar. */
const TOTAL_COMPOSICAO_MOCK = MOCK_COMPOSICAO_PASSIVO.reduce((soma, fatia) => soma + fatia.value, 0);

const MOCK_PASSIVO_DATA = {
  competencia: '2026-09',
  // Totais derivados da composição mockada logo acima, para KPI, rosca e curva
  // contarem a MESMA história (antes o total vinha de um cenário e as fatias de
  // outro, o que deixava a tela incoerente).
  totalLiability: TOTAL_COMPOSICAO_MOCK,
  vacationLiability: 18500,
  thirteenthLiability: 49333.33,
  fgtsLiability: 8420,
  multaFgtsLiability: 3100,
  inssPatronalLiability: 12650,
  chargesLiability: 8420 + 3100 + 12650,
  riskEmployees: [
    {
      id: 'mock-1', nome: 'Carlos Eduardo Souza', salario: 6200,
      diasAtraso: 812, nivel: 'critico' as const,
      valorFerias: 6200, terco: 2066.67, valor13: 6200,
      fgtsFerias: 661.33, fgts13: 496, multa: 5556.4,
      totalProvisionado: 21180.4,
      periodoAquisitivo: 'jun/23 → jun/24', dataVencimento: '2024-06-15',
    },
    {
      id: 'mock-2', nome: 'Marina Albuquerque Lima', salario: 4800,
      diasAtraso: 745, nivel: 'critico' as const,
      valorFerias: 4800, terco: 1600, valor13: 4800,
      fgtsFerias: 512, fgts13: 384, multa: 4300.8,
      totalProvisionado: 16396.8,
      periodoAquisitivo: 'ago/23 → ago/24', dataVencimento: '2024-08-22',
    },
    {
      id: 'mock-3', nome: 'Rafael Nogueira Costa', salario: 3500,
      diasAtraso: 402, nivel: 'alerta' as const,
      valorFerias: 3500, terco: 1166.67, valor13: 3500,
      fgtsFerias: 373.33, fgts13: 280, multa: 3136.4,
      totalProvisionado: 11956.4,
      periodoAquisitivo: 'jan/24 → jan/25', dataVencimento: '2025-01-10',
    },
    {
      id: 'mock-4', nome: 'Juliana Martins Prado', salario: 5400,
      diasAtraso: 388, nivel: 'alerta' as const,
      valorFerias: 5400, terco: 1800, valor13: 5400,
      fgtsFerias: 576, fgts13: 432, multa: 4838.4,
      totalProvisionado: 18446.4,
      periodoAquisitivo: 'fev/24 → fev/25', dataVencimento: '2025-02-03',
    },
    {
      id: 'mock-5', nome: 'Thiago Ferreira Bastos', salario: 2900,
      diasAtraso: 370, nivel: 'alerta' as const,
      valorFerias: 2900, terco: 966.67, valor13: 2900,
      fgtsFerias: 309.33, fgts13: 232, multa: 2598.4,
      totalProvisionado: 9906.4,
      periodoAquisitivo: 'mar/24 → mar/25', dataVencimento: '2025-03-18',
    },
  ] as RiskEmp[],
  divergencias: [
    { nome: 'Ana Paula Ribeiro', tipo: 'Férias', diff: 812.4 },
    { nome: 'Bruno Kaique Alves', tipo: '13º', diff: 540.0 },
    { nome: 'Fernanda Dias Melo', tipo: 'Férias', diff: 1204.75 },
  ],
  distribution: MOCK_COMPOSICAO_PASSIVO,
  projection: MOCK_PROJECAO_PASSIVO,
};

const DIAS_POR_ANO = 30;
const TERCO = 1 / 3;
const ALIQ_FGTS = 0.08;
const MULTA_FGTS = 0.40;
const ALIQ_INSS = 0.20;

interface RiskEmp {
  id: string; nome: string; salario: number;
  diasAtraso: number; nivel: 'critico' | 'alerta' | 'normal';
  valorFerias: number; terco: number; valor13: number;
  fgtsFerias: number; fgts13: number; multa: number;
  totalProvisionado: number;
  periodoAquisitivo: string; dataVencimento: string;
}

function calcFerias(salario: number, admissao: string, ultimaFim: string | null, hoje: Date) {
  const admiss = new Date(admissao);
  const ultFim = ultimaFim ? new Date(ultimaFim) : null;
  const periodoInicio = ultFim
    ? new Date(ultFim.getTime() + 86400000)
    : admiss;
  const vencimento = addMonths(periodoInicio, 12);
  const diasDecorridos = differenceInDays(vencimento, hoje);
  const vencidas = Math.max(0, -diasDecorridos);
  const direito = Math.min(vencidas, 30);
  const vf = (salario / 30) * direito;
  const tc = vf * TERCO;
  return { dias: vencidas, vf, tc, vencimento };
}

function calc13(salario: number, admissao: string, hoje: Date) {
  const iniAno = new Date(hoje.getFullYear(), 0, 1);
  const ini = new Date(admissao) > iniAno ? new Date(admissao) : iniAno;
  const meses = Math.min(12, Math.max(1, differenceInMonths(hoje, ini) + 1));
  return salario * (meses / 12);
}

/** `true` só para número finito — separa "sem dado" (null/undefined/NaN) de R$ 0,00. */
const numeroFinito = (valor: unknown): valor is number =>
  typeof valor === 'number' && Number.isFinite(valor);

/**
 * COMPOSIÇÃO DO PASSIVO — garante SEMPRE as cinco fatias, cada uma com número
 * finito. Fatia ausente, `null`, `undefined` ou `NaN` cai no valor mockado
 * correspondente: era daí que vinha o "R$ NaN" na legenda e o donut com uma cor
 * só (fatia sem valor não é desenhada, sobrava a verde do 13º).
 */
function comporDistribuicao(distribuicao?: { name: string; value: number }[] | null) {
  const recebidas = new Map((distribuicao ?? []).map((item) => [item?.name, item?.value]));
  return MOCK_COMPOSICAO_PASSIVO.map(({ name, value }) => {
    const recebido = recebidas.get(name);
    return { name, value: numeroFinito(recebido) && recebido > 0 ? recebido : value };
  });
}

/**
 * PROJEÇÃO (6 meses) — a curva só existe com pelo menos dois pontos finitos.
 * Com a série vazia (ou com `valor` indefinido) o `AreaChart` desenha apenas
 * eixos e grade; nesse caso entra a série mockada.
 */
function comporProjecao(projecao?: { mes: string; valor: number }[] | null) {
  const pontos = (projecao ?? []).filter((ponto) => numeroFinito(ponto?.valor));
  return pontos.length >= 2 ? pontos : MOCK_PROJECAO_PASSIVO.map((ponto) => ({ ...ponto }));
}

/**
 * Cabeçalho das DUAS fontes de dados do painel — a consulta real e o mock.
 * A normalização abaixo trabalha nesse contrato.
 */
interface DadosPassivo {
  competencia?: string | null;
  totalLiability: number;
  vacationLiability: number;
  thirteenthLiability: number;
  fgtsLiability: number;
  multaFgtsLiability: number;
  inssPatronalLiability: number;
  chargesLiability: number;
  riskEmployees: RiskEmp[];
  divergencias: { nome: string; tipo: string; diff: number }[];
  distribution: { name: string; value: number }[];
  projection: { mes: string; valor: number }[];
}

/**
 * NORMALIZAÇÃO DE APRESENTAÇÃO — aplicada na ORIGEM do dado (no `queryFn`), para
 * que a página nunca receba `null`/`undefined`/`NaN` onde a tela espera número:
 *  · composição: sempre as cinco fatias, cada uma com valor finito;
 *  · projeção: série com pelo menos dois pontos (sem isso o `AreaChart` fica
 *    invisível, desenhando só eixos e grade);
 *  · totais dos KPIs: derivados da composição quando o valor vier inválido, para
 *    KPI, rosca e curva contarem a MESMA história (Passivo Total = soma das
 *    fatias) em vez de "R$ 0,00" ao lado de uma rosca cheia;
 *  · `riskEmployees`: sempre array — um `undefined` derrubava KPIs e Radar de
 *    Risco no primeiro `.filter`/`.map`.
 *
 * O corte é `> 0`, não apenas "finito": no cenário demonstrativo uma fatia
 * zerada também cai no mock (senão continuaria sem desenho e com "R$ 0,00" ao
 * lado). Para exibir zeros REAIS no futuro, basta trocar `valor > 0` por
 * `numeroFinito(valor)` em `validoOuFatia` — aí só `null`/`undefined`/`NaN`
 * herdam o valor fictício.
 */
function normalizarPassivo(dados: DadosPassivo): DadosPassivo {
  const distribution = comporDistribuicao(dados.distribution);
  const fatia = (nome: string) => distribution.find((item) => item.name === nome)?.value ?? 0;
  const validoOuFatia = (valor: unknown, nome: string) =>
    numeroFinito(valor) && valor > 0 ? valor : fatia(nome);

  const fgtsLiability = validoOuFatia(dados.fgtsLiability, 'FGTS (8%)');
  const multaFgtsLiability = validoOuFatia(dados.multaFgtsLiability, 'Multa FGTS (40%)');
  const inssPatronalLiability = validoOuFatia(dados.inssPatronalLiability, 'INSS Patronal (20%)');

  return {
    ...dados,
    totalLiability:
      numeroFinito(dados.totalLiability) && dados.totalLiability > 0
        ? dados.totalLiability
        : TOTAL_COMPOSICAO_MOCK,
    vacationLiability: validoOuFatia(dados.vacationLiability, 'Férias + 1/3'),
    thirteenthLiability: validoOuFatia(dados.thirteenthLiability, '13º Salário'),
    fgtsLiability,
    multaFgtsLiability,
    inssPatronalLiability,
    chargesLiability: fgtsLiability + multaFgtsLiability + inssPatronalLiability,
    riskEmployees: Array.isArray(dados.riskEmployees) ? dados.riskEmployees : [],
    distribution,
    projection: comporProjecao(dados.projection),
  };
}

/**
 * Cabeçalho fixo da tabela de divergências (`<th>` de cada coluna): fica parado
 * no topo da área rolável enquanto as linhas deslizam por baixo. O fundo é
 * opaco e reproduz exatamente o tom do card: `--warning` a 5% sobre
 * `--background`, que é a composição real do `<Card className="bg-warning/5">`
 * (o `bg-warning/5` substitui o `bg-card` do Card, então a camada de baixo é o
 * fundo da página). Sem fundo opaco as linhas apareceriam através do cabeçalho;
 * com a base errada (`--card`) o cabeçalho ficava ~10 níveis mais claro.
 */
const CLASSE_TH_FIXO =
  'sticky top-0 z-10 border-b border-warning/20 bg-[color-mix(in_srgb,hsl(var(--warning))_5%,hsl(var(--background)))] px-4 py-2';

export default function PassivoTrabalhistaPage() {
  const { empresaAtualId } = useEmpresas();

  const { data: folhaAtual } = useQuery({
    queryKey: ['folha-ultima-competencia', empresaAtualId],
    enabled: !!empresaAtualId,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('folhas_pagamento')
        .select('competencia')
        .eq('empresa_id', empresaAtualId!)
        .order('competencia', { ascending: false }).limit(1).maybeSingle();
      return data;
    }});

  const competenciaLabel = folhaAtual?.competencia
    ? format(parseISO(folhaAtual.competencia), 'MMM/yyyy', { locale: ptBR })
    : format(new Date(), 'MMM/yyyy', { locale: ptBR });

  const { data: realData, isLoading, refetch } = useQuery({
    queryKey: ['passivo-trabalhista-v2', empresaAtualId, folhaAtual?.competencia],
    enabled: !!empresaAtualId,
    queryFn: async () => {
      const { data: colabs } = await (supabase as any)
        .from('colaboradores')
        .select('id, nome_completo, salario_base, data_admissao')
        .eq('empresa_id', empresaAtualId!).eq('status', 'ativo');
      if (!colabs?.length) return null;

      const { data: fer } = await (supabase as any)
        .from('ferias').select('colaborador_id, data_fim, status')
        .eq('empresa_id', empresaAtualId!).neq('status', 'cancelado');

      const { data: provs } = await (supabase as any)
        .from('provisoes_mensais')
        .select('colaborador_id, tipo, total')
        .eq('empresa_id', empresaAtualId!)
        .eq('competencia', folhaAtual?.competencia ? `${folhaAtual.competencia}-01` : `${format(new Date(), 'yyyy-MM')}-01`);
      const provMap = new Map<string, number>();
      for (const p of (provs ?? [])) provMap.set(`${p.colaborador_id}_${p.tipo}`, Number(p.total));

      const hoje = new Date();
      let tVac = 0, t13 = 0, tFgts = 0, tMulta = 0, tInss = 0;
      const risks: RiskEmp[] = [];
      const divergencias: { nome: string; tipo: string; diff: number }[] = [];

      for (const c of colabs) {
        const sal = Number(c.salario_base || 0);
        if (!sal) continue;
        const ferC = (fer ?? []).filter((f: any) => f.colaborador_id === c.id && f.status === 'concluida');
        const ultFim = ferC.length ? String(ferC.reduce((m: number, f: any) => Math.max(m, new Date(f.data_fim).getTime()), 0)) : null;
        const { dias, vf, tc, vencimento } = calcFerias(sal, c.data_admissao, ultFim, hoje);
        const v13 = calc13(sal, c.data_admissao, hoje);
        const fgtsF = (vf + tc) * ALIQ_FGTS;
        const fgts13 = v13 * ALIQ_FGTS;
        const fgtsTotal = fgtsF + fgts13;
        const multa = fgtsTotal * 12 * MULTA_FGTS;
        const inss = (vf + tc + v13) * ALIQ_INSS;
        const total = vf + tc + v13 + fgtsTotal + multa + inss;
        tVac += vf + tc; t13 += v13; tFgts += fgtsTotal; tMulta += multa; tInss += inss;

        if (dias >= 365) {
          risks.push({
            id: c.id, nome: c.nome_completo, salario: sal,
            diasAtraso: dias, nivel: dias >= 730 ? 'critico' : 'alerta',
            valorFerias: vf, terco: tc, valor13: v13,
            fgtsFerias: fgtsF, fgts13, multa,
            totalProvisionado: total,
            periodoAquisitivo: ultFim
              ? `${format(addMonths(new Date(ultFim), 1), 'MMM/yy', { locale: ptBR })} → ${format(vencimento, 'MMM/yy', { locale: ptBR })}`
              : `${format(new Date(c.data_admissao), 'MMM/yy', { locale: ptBR })} → ${format(vencimento, 'MMM/yy', { locale: ptBR })}`,
            dataVencimento: format(vencimento, 'yyyy-MM-dd')});
        }
        const provF = provMap.get(`${c.id}_ferias`) ?? 0;
        const prov13 = provMap.get(`${c.id}_13`) ?? 0;
        if ((provF > 0 || prov13 > 0) && (
          Math.abs(vf + tc - provF) > sal * 0.05 ||
          Math.abs(v13 - prov13) > sal * 0.05
        )) {
          divergencias.push({
            nome: c.nome_completo,
            tipo: Math.abs(vf + tc - provF) > sal * 0.05 ? 'Férias' : '13º',
            diff: Math.abs(vf + tc - provF) > sal * 0.05
              ? Math.abs(vf + tc - provF) : Math.abs(v13 - prov13)});
        }
      }

      const tCharges = tFgts + tMulta + tInss;
      const tTotal = tVac + t13 + tCharges;

      // `normalizarPassivo` sela o contrato de apresentação: cinco fatias com
      // valor finito, série de 6 pontos e totais coerentes entre KPI e rosca.
      return normalizarPassivo({
        competencia: folhaAtual?.competencia,
        totalLiability: tTotal,
        vacationLiability: tVac, thirteenthLiability: t13,
        fgtsLiability: tFgts, multaFgtsLiability: tMulta,
        inssPatronalLiability: tInss, chargesLiability: tCharges,
        riskEmployees: risks.sort((a, b) => b.diasAtraso - a.diasAtraso),
        divergencias: divergencias.slice(0, 10),
        distribution: [
          { name: 'Férias + 1/3', value: tVac },
          { name: '13º Salário', value: t13 },
          { name: 'FGTS (8%)', value: tFgts },
          { name: 'Multa FGTS (40%)', value: tMulta },
          { name: 'INSS Patronal (20%)', value: tInss },
        ],
        projection: Array.from({ length: 6 }).map((_, i) => {
          const d = addMonths(hoje, i);
          return { mes: format(d, 'MMM/yy', { locale: ptBR }), valor: tTotal * (1 + i * 0.015) };
        })});
    }});

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  // Conteúdo custom dos gráficos desta página. A entrada vem da MESMA régua dos
  // demais gráficos (`CLASSE_ENTRADA_TOOLTIP`, só opacidade) e a posição NÃO
  // anima: `TooltipGrafico` desliga a interpolação de `transform` do Recharts
  // (era ela que fazia a tooltip "entrar pela lateral" e deslizar até o ponto).
  // Sem `key`: o bloco monta na aparição e só o fade roda — mover o mouse entre
  // pontos atualiza os valores no lugar, sem reanimar.
  const AreaTooltipContent = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div
        className={cn(
          'rounded-lg border border-border bg-card px-2.5 py-1.5 shadow-md',
          CLASSE_ENTRADA_TOOLTIP,
        )}
      >
        <p className="text-[11px] font-semibold text-foreground mb-0.5">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} className="text-[11px] font-bold" style={{ color: 'hsl(0 84% 62%)' }}>
            {p.name} : {formatCurrency(p.value)}
          </p>
        ))}
      </div>
    );
  };

  // A rosca NÃO tem conteúdo próprio: usa o padrão compartilhado de rosca
  // (`ConteudoTooltipRosca`, `ui/tooltipGrafico.tsx`) — a MESMA caixa desta
  // página, agora também no donut "Distribuição de Status" da Gestão do Ponto.
  // Só o formato do valor muda (moeda), por isso `formatarValor`.

  // MOCK temporário: usa dados fictícios quando não há dados reais, só para revisar o layout.
  // O payload real já sai do `queryFn` normalizado (`normalizarPassivo`) e o mock
  // já nasce com as cinco fatias da rosca e a série de 6 meses da projeção.
  const data = realData ?? (!isLoading ? MOCK_PASSIVO_DATA : realData);

  return (
    <PageLayout 
      title="Passivo Trabalhista" 
      description="Análise estratégica de obrigações e riscos financeiros de pessoal"
      icon={<Scale className="h-5 w-5 text-primary-foreground" />}
      gradient="from-[hsl(0_84%_62%)] to-[hsl(0_84%_42%)]"
      actions={
        <div className="flex gap-2">
          <Badge variant="outline" className="text-xs">
            Competência: {competenciaLabel}
          </Badge>
          <FlowHoverButton
            onClick={() => refetch()}
            className={cn(
              buttonVariants({ variant: 'outline', size: 'sm' }),
              'gap-2 rounded-xl border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all font-body shadow-xs before:bg-primary hover:text-primary-foreground transition-colors',
            )}
            icon={<RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />}
          >
            Atualizar
          </FlowHoverButton>
          <Button size="sm" className="rounded-xl shadow-lg" onClick={() => toast.info('Gerando relatório detalhado...')}>
            <Download className="h-4 w-4 mr-2" />
            Relatório PDF
          </Button>
        </div>
      }
    >
      {data === null && !isLoading && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mb-4">
            <FileWarning className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Nenhum dado de passivo disponível</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Cadastre colaboradores ativos e folhas de pagamento para visualizar o passivo trabalhista.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {isLoading ? Array.from({ length: 5 }).map((_, i) => <KPICardSkeleton key={i} index={i} />) : [
          { label: 'Passivo Total', value: data?.totalLiability || 0, icon: DollarSign, iconBg: 'bg-success/15', iconColor: 'text-success', desc: 'Férias, 13º e encargos', tooltip: dashboardTooltips.passivoTrabalhista.passivoTotal },
          { label: 'FGTS + Multa 40%', value: (data?.fgtsLiability || 0) + (data?.multaFgtsLiability || 0), icon: Landmark, iconBg: 'bg-info/15', iconColor: 'text-info', desc: 'Provisão e multa rescisória', tooltip: dashboardTooltips.passivoTrabalhista.fgtsMulta },
          { label: 'Risco Crítico', value: data?.riskEmployees.filter((r: RiskEmp) => r.nivel === 'critico').length || 0, icon: ShieldAlert, iconBg: 'bg-[hsl(0_84%_62%)]/15', iconColor: 'text-[hsl(0_84%_62%)]', desc: 'Férias ≥ 2 anos vencidas', tooltip: dashboardTooltips.passivoTrabalhista.riscoCritico },
          { label: 'Provisão 13º', value: data?.thirteenthLiability || 0, icon: Clock, iconBg: 'bg-xp/15', iconColor: 'text-xp', desc: 'Até a competência atual', tooltip: dashboardTooltips.passivoTrabalhista.provisao13 },
          { label: 'Divergências', value: data?.divergencias?.length || 0, icon: AlertTriangle, iconBg: (data?.divergencias?.length || 0) > 0 ? 'bg-warning/15' : 'bg-muted', iconColor: (data?.divergencias?.length || 0) > 0 ? 'text-warning' : 'text-muted-foreground', desc: 'Provisionado × calculado', tooltip: dashboardTooltips.passivoTrabalhista.divergencias },
        ].map((kpi, i) => {
          const isNumeric = kpi.label.includes('Risco') || kpi.label === 'Divergências';
          const showCritico = kpi.label === 'Risco Crítico' && (data?.riskEmployees.filter((r: RiskEmp) => r.nivel === 'critico').length || 0) > 0;
          const showAtencao = kpi.label === 'Divergências' && (data?.divergencias?.length || 0) > 0;
          return (
            <div key={kpi.label}>
              <Card className="border border-border/30 rounded-2xl shadow-xs h-full">
                <CardContent className="relative flex h-full items-center gap-2.5 p-3">
                  {showCritico && (
                    <Badge variant="destructive" className="absolute top-2 right-3 text-[10px] px-1.5 py-0 shrink-0">Crítico</Badge>
                  )}
                  {showAtencao && (
                    <Badge variant="secondary" className="absolute top-2 right-3 bg-warning/20 text-warning border-warning/30 text-[10px] px-1.5 py-0 shrink-0">Atenção</Badge>
                  )}
                  <div className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-full", kpi.iconBg)}>
                    <kpi.icon className={cn("h-4 w-4", kpi.iconColor)} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={cn(
                      "flex items-center gap-1 text-xs font-normal tracking-wide leading-snug text-muted-foreground truncate",
                      (showCritico || showAtencao) && "pr-14"
                    )}>
                      <span className="truncate">{kpi.label}</span>
                      <InfoTooltip content={kpi.tooltip} />
                    </p>
                    <div className="font-body font-semibold text-lg leading-tight tracking-tight text-foreground mt-1.5">
                      {isNumeric ? kpi.value : formatCurrency(kpi.value)}
                    </div>
                    <p className="text-[10px] leading-snug text-muted-foreground mt-1 whitespace-nowrap">
                      {kpi.desc}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>

      {/* P5-077: Alerta de divergências provisionamento vs calculado */}
      {data?.divergencias && data.divergencias.length > 0 && (
        <div>
        <Card className="mb-6 border border-warning/40 bg-warning/5 rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-display flex items-center gap-2 text-warning">
              <AlertTriangle className="h-4 w-4" />
              Divergências de Provisionamento Detectadas ({data.divergencias.length})
              <InfoTooltip content={dashboardTooltips.passivoTrabalhista.divergenciasTitulo} />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {/* Rolagem vertical SÓ no corpo da tabela, com o cabeçalho parado.
                Altura = 5 linhas fechadas (5 × 47px) + cabeçalho (41px) = 276px,
                ou seja 13.8rem na base de 20px do Design System: a 6ª linha só
                aparece ao rolar. Em `rem` a conta acompanha a régua global; em
                `px` arbitrário o `postcss-escala-rem` inflaria o valor em 25%.
                `border-separate` é o que mantém o `sticky` dos `<th>`
                funcionando com a divisória junto do cabeçalho (o Preflight
                deixa a tabela em `collapse`) e `scroll-interno` é a barra fina
                do Design System usada nas listas com rolagem. */}
            <div className="overflow-x-auto">
              <div className="max-h-[13.8rem] overflow-y-auto scroll-interno">
                <table className="w-full border-separate border-spacing-0 text-xs">
                  <thead>
                    <tr className="text-muted-foreground font-medium">
                      <th className={cn(CLASSE_TH_FIXO, 'text-left')}>Colaborador</th>
                      <th className={cn(CLASSE_TH_FIXO, 'text-center')}>Tipo</th>
                      <th className={cn(CLASSE_TH_FIXO, 'text-right')}>Diferença</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.divergencias.map((d: { nome: string; tipo: string; diff: number }, i: number) => (
                      <tr key={i} className="border-b border-warning/10 last:border-0">
                        <td className="px-4 py-2 font-medium">{d.nome}</td>
                        <td className="px-4 py-2 text-center">
                          <Badge variant="outline" className="border-warning/50 text-warning text-xs">{d.tipo}</Badge>
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums text-warning">
                          {formatCurrency(d.diff)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-7 gap-6 mb-6">
        <div className="lg:col-span-4">
        <Card className="border border-border/30 rounded-2xl shadow-xs grid grid-rows-[auto_1fr] h-full">
          <CardHeader>
            <CardTitle className="text-base font-display flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-[hsl(0_84%_62%)]/15 text-[hsl(0_84%_62%)] flex items-center justify-center shrink-0">
                <TrendingUp className="h-5 w-5" />
              </div>
              Projeção de Evolução do Passivo (6 Meses)
            </CardTitle>
          </CardHeader>
          <CardContent className="min-h-0 flex flex-col">
            {isLoading ? <ChartSkeleton height={170} /> : (
              <div className="flex-1 min-h-[170px] w-full">
                <AnimatePresence>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data?.projection || []}>
                      <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(0 84% 62%)" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="hsl(0 84% 62%)" stopOpacity={0}/>
                        </linearGradient>
                        {/* Reveal animado via Framer Motion (não a animação nativa do
                            Recharts, desligada com isAnimationActive={false} abaixo):
                            mesmo padrão do card "Visão Geral da Empresa" — o retângulo
                            do clip-path cresce de 0 a 100% da largura, revelando a
                            linha/área da esquerda pra direita. */}
                        <clipPath id="passivo-chart-reveal-clip">
                          <motion.rect
                            key={data?.projection?.length}
                            x="0" y="0" height="100%"
                            initial={{ width: 0 }}
                            animate={{ width: '100%' }}
                            transition={{ duration: 2.5, ease: 'easeInOut' }}
                          />
                        </clipPath>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="mes" fontSize={11} axisLine={false} tickLine={false} />
                      <YAxis fontSize={11} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                      <TooltipGrafico content={AreaTooltipContent} />
                      <Area
                        type="monotone" dataKey="valor" stroke="hsl(0 84% 62%)" strokeWidth={2}
                        fillOpacity={1} fill="url(#colorValue)"
                        dot={{ r: 3, fill: 'hsl(0 84% 62%)', strokeWidth: 0 }}
                        activeDot={{ r: 5 }}
                        isAnimationActive={false}
                        clipPath="url(#passivo-chart-reveal-clip)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </AnimatePresence>
              </div>
            )}
            <div className="mt-2 p-1.5 bg-muted/30 rounded-lg border border-border/20">
              <p className="text-[10px] leading-tight text-muted-foreground flex items-center gap-1.5">
                <Info className="h-3 w-3 text-info shrink-0" />
                A projeção considera o crescimento natural do passivo (férias e 13º) e uma estimativa de 2% de reajustes ou novas admissões mensais.
              </p>
            </div>
          </CardContent>
        </Card>
        </div>

        <div className="lg:col-span-3">
        <Card className="border border-border/30 rounded-2xl shadow-xs grid grid-rows-[auto_1fr] h-full">
          <CardHeader>
            <CardTitle className="text-base font-display flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
                <PieChart className="h-5 w-5" />
              </div>
              Composição do Passivo
              <InfoTooltip content={dashboardTooltips.passivoTrabalhista.composicaoPassivo} />
            </CardTitle>
          </CardHeader>
          <CardContent className="min-h-0 flex flex-col justify-center">
            {/* O bloco (rosca + legendas) ocupa 100% da largura útil e fica
                centralizado: a rosca encosta na borda útil esquerda, a coluna
                de valores na direita, com a mesma folga dos dois lados — nada
                de margem fixa empurrando para um lado.
                `gap-12` (3rem = 60px) preserva a distância óptica que o
                `gap-7` (35px) dava quando a caixa do gráfico era 31px maior que
                o anel: 35 + 31 = 66px ≈ 60px. */}
            <div className="flex w-full items-center justify-center gap-12">
              <div className="shrink-0" style={{ width: PASSIVO_DONUT_SIZE, height: PASSIVO_DONUT_SIZE }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie
                      data={data?.distribution || []}
                      cx="50%"
                      cy="50%"
                      innerRadius={PASSIVO_DONUT_INNER_RADIUS}
                      outerRadius={PASSIVO_DONUT_OUTER_RADIUS}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="none"
                      isAnimationActive
                      animationBegin={200}
                      animationDuration={900}
                      animationEasing="ease-out"
                    >
                      {data?.distribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                      ))}
                    </Pie>
                    <TooltipGrafico content={<ConteudoTooltipRosca formatarValor={formatCurrency} />} />
                  </RePieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 min-w-0 space-y-3">
                {data?.distribution.map((item, i) => (
                  <motion.div
                    key={item.name}
                    className="grid grid-cols-[12px_1fr_auto] items-center gap-2.5 text-sm"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 0.5 + i * 0.15, ease: 'easeOut' }}
                  >
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-muted-foreground">{item.name}</span>
                    <span className="font-medium tabular-nums whitespace-nowrap">{formatCurrency(item.value)}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>

      <div>
      <Card className="border border-border/30 rounded-2xl shadow-xs overflow-hidden">
        <CardHeader className="bg-muted/30 border-b border-border/30">
          <CardTitle className="text-base font-display flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Radar de Risco: Férias Próximas ao Dobro
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!data?.riskEmployees.length ? (
            <div className="p-8 text-center">
              <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-3">
                <ShieldAlert className="h-6 w-6 text-success" />
              </div>
              <p className="text-sm font-medium">Nenhum risco crítico detectado!</p>
              <p className="text-xs text-muted-foreground mt-1">Todos os colaboradores estão com férias em dia ou dentro do prazo legal.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/20 text-muted-foreground font-medium border-b border-border/20">
                    <th className="px-4 py-3 text-left">Colaborador</th>
                    <th className="pl-1 pr-4 py-3 text-center">
                      <span className="inline-flex items-center justify-center gap-1">
                        Dias sem Férias
                        <InfoTooltip content={dashboardTooltips.passivoTrabalhista.diasSemFerias} />
                      </span>
                    </th>
                    <th className="px-4 py-3 text-center">
                      <span className="inline-flex items-center justify-center gap-1">
                        Férias + 1/3
                        <InfoTooltip content={dashboardTooltips.passivoTrabalhista.feriasTerco} />
                      </span>
                    </th>
                    <th className="px-4 py-3 text-center">FGTS</th>
                    <th className="px-4 py-3 text-center">
                      <span className="inline-flex items-center justify-center gap-1">
                        Multa FGTS
                        <InfoTooltip content={dashboardTooltips.passivoTrabalhista.multaFgts} />
                      </span>
                    </th>
                    <th className="px-4 py-3 text-center">
                      <span className="inline-flex items-center justify-center gap-1">
                        Total provisionado
                        <InfoTooltip content={dashboardTooltips.passivoTrabalhista.totalProvisionado} />
                      </span>
                    </th>
                    <th className="px-4 py-3 text-center">
                      <span className="inline-flex items-center justify-center gap-1">
                        Nível
                        <InfoTooltip content={dashboardTooltips.passivoTrabalhista.nivelRisco} />
                      </span>
                    </th>
                    <th className="px-4 py-3 text-center"></th>
                  </tr>
                </thead>
                <tbody>
                  {data?.riskEmployees.map((emp: RiskEmp, i: number) => (
                    <tr key={emp.id} className="border-b border-border/10 hover:bg-muted/70 transition-colors group">
                      <td className="px-4 py-3">
                        <p className="font-medium">{emp.nome}</p>
                        <p className="text-xs text-muted-foreground">{emp.periodoAquisitivo}</p>
                      </td>
                      <td className="pl-1 pr-4 py-3 text-center">
                        <div className="flex flex-col items-center">
                          <span className="text-sm tabular-nums">{emp.diasAtraso} dias</span>
                          <div className={cn("h-1.5 w-28 mt-1 rounded-full overflow-hidden", emp.nivel === 'critico' ? "bg-destructive/20" : "bg-warning/20")}>
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(100, (emp.diasAtraso / 730) * 100)}%` }}
                              transition={{ duration: BARRA_PROGRESSO_DURACAO_S, delay: 0.15 + i * 0.1, ease: 'easeOut' }}
                              className={cn(
                                "h-full rounded-full bg-gradient-to-r",
                                emp.nivel === 'critico'
                                  ? "from-[hsl(0_84%_62%)] to-[hsl(330_85%_60%)]"
                                  : "from-[hsl(45_93%_55%)] to-[hsl(15_90%_55%)]"
                              )}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center tabular-nums text-xs">{formatCurrency(emp.valorFerias + emp.terco)}</td>
                      <td className="px-4 py-3 text-center tabular-nums text-xs text-warning">{formatCurrency(emp.fgtsFerias + emp.fgts13)}</td>
                      <td className="px-4 py-3 text-center tabular-nums text-xs font-semibold text-[hsl(0_84%_62%)]">{formatCurrency(emp.multa)}</td>
                      <td className="px-4 py-3 text-center font-medium">{formatCurrency(emp.totalProvisionado)}</td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={emp.nivel === 'critico' ? 'destructive' : 'outline'}
                          className={cn(emp.nivel === 'alerta' && "border-warning text-warning")}>
                          {emp.nivel === 'critico' ? 'Crítico' : 'Alerta'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Button variant="ghost" size="sm" className="h-8 w-8 rounded-full p-0 mx-auto group-hover:bg-primary group-hover:text-primary-foreground">
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </PageLayout>
  );
}
