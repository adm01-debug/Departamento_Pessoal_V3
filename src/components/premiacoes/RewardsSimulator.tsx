/**
 * ============================================================================
 * HUB DE PREMIAÇÕES — ABA SIMULADOR ROI (redesenho estrutural).
 *
 * Quatro regiões:
 *
 *   ┌───────────────────────────────┬──────────────────────────┐
 *   │ 1. Configure seu cenário      │ Resultados da simulação  │
 *   ├───────────────────────────────┼──────────────────────────┤
 *   │ 2. Visualize o impacto        │ 3. Compare cenários      │
 *   ├───────────────────────────────┴──────────────────────────┤
 *   │ Cenários salvos                                          │
 *   └──────────────────────────────────────────────────────────┘
 *
 * ── O QUE VEIO DO MIOLO CORRIGIDO (não regredir) ───────────────────────────
 *  · `CenarioROI` / `CenarioROIInput` do serviço (campos opcionais), com
 *    `s.nome` como nome real da coluna.
 *  · `buildCenarioInput`, `saveMutation` tipada e `deleteMutation` sobre
 *    `premiacoesService.excluirCenariosROI` — Duplicar e Excluir cenário
 *    funcionam de verdade, cada um com seu handler.
 *  · Os cinco parâmetros, seus limites de slider e as fórmulas, agora no motor
 *    puro `./simuladorRoiComum` (fonte única, com teste próprio).
 *
 * ── FÓRMULAS (iguais às anteriores — ver simuladorRoiComum.ts) ─────────────
 *   payout             = colaboradores × salário médio × (% bônus/100) × (meta/100)
 *   custo de reposição = salário médio × 3 × colaboradores × 0,15
 *   economia           = custo de reposição × (% redução turnover/100)
 *   ROI                = economia ÷ payout            (multiplicador, ex.: 0,26x)
 *   resultado líquido  = economia − payout            (derivada, só exibição)
 *
 * ── HONESTIDADE DOS INDICADORES ───────────────────────────────────────────
 *  · Sem payout (0 colaboradores, 0% de bônus ou 0% de meta) não existe ROI:
 *    o KPI, o resumo, a linha da comparação e o cartão do cenário salvo mostram
 *    "—", nunca "0,00x" afirmado como resultado.
 *  · Se a leitura dos cenários salvos falhar, a tela não afirma "nenhum cenário"
 *    nem conta zero: mostra a falha com "Tentar novamente" e o contador em "—".
 *  · "Por colaborador" e "custo por retido" só aparecem quando há divisor.
 *  · A visão temporal usa SOMENTE cenários salvos (um ponto na data de
 *    criação) mais a configuração atual. Sem cenário salvo não há evolução a
 *    mostrar: a visão exibe estado vazio. Nenhuma projeção é inventada.
 *  · Não há seletor de "Período": a fórmula é instantânea e não usa data.
 *
 * ── NÃO TRAZIDO DE PROPÓSITO ──────────────────────────────────────────────
 *  · Contagem animada dos KPIs: depende de `AnimatedNumber` com `decimals`,
 *    que não existe neste `src/components/dashboard/AnimatedNumber.tsx` (sem
 *    ele a contagem arredonda e um ROI de 0,26x exibe "0,00x").
 *  · Crescimento manual das barras/linhas por variáveis CSS (`.roi-grafico`):
 *    as regras não existem em `src/index.css`, o controlador ficaria sem
 *    leitor. O gráfico usa a animação nativa do Recharts.
 * ============================================================================
 */
import React from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  Check,
  ChevronDown,
  Copy,
  Eye,
  History,
  Landmark,
  Lightbulb,
  MoreVertical,
  Save,
  Scale,
  SlidersHorizontal,
  Target,
  Trash2,
  TrendingUp,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  LabelList,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { formatCurrency, formatDateTime } from '@/utils/format';
import { ScenarioParameterCard, type ScenarioParameterUnit } from './ScenarioParameterCard';
import { ComparacaoCenarios, type LinhaComparacao } from './ComparacaoCenarios';
import { premiacoesService, type CenarioROI, type CenarioROIInput } from '@/services/premiacoesService';
import { useEmpresas } from '@/hooks/useEmpresas';
import { EntradaPresenca, entradaSimulador } from './simuladorEntrada';
import { calcularMetricas, montarSerieTemporal, variacaoPercentual, type CenarioTemporal } from './simuladorRoiComum';

/* ─── Parâmetros ──────────────────────────────────────────────────────────── */

const BASE = {
  employees: 50,
  avgSalary: 4500,
  bonusPercent: 10,
  performanceLevel: 85,
  retentionImpact: 5,
} as const;

type ParametroChave = keyof typeof BASE;

/** Visões analíticas da seção 2. */
type VisaoImpacto = 'financeira' | 'retencao' | 'temporal' | 'colaborador';

/** Limites REAIS dos sliders (os mesmos da implementação anterior). */
const LIMITES: Record<ParametroChave, { min: number; max: number; step: number }> = {
  employees: { min: 0, max: 1000, step: 10 },
  avgSalary: { min: 1500, max: 30000, step: 500 },
  bonusPercent: { min: 0, max: 100, step: 1 },
  performanceLevel: { min: 0, max: 150, step: 5 },
  retentionImpact: { min: 0, max: 20, step: 0.5 },
};

const numero = (v: number, casas = 0) =>
  v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });

const percentual = (v: number, casas = 0) => `${numero(v, casas)}%`;

const moeda = (v: number) => formatCurrency(v);

/** Multiplicador de ROI no formato da referência: 0,26x. */
const multiplicador = (v: number) => `${numero(v, 2)}x`;

/** Eixo Y do gráfico sem centavos: R$ 30.000. */
const moedaEixo = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);

/** Indicador sem divisor válido não é zero: é desconhecido. */
const ouTraco = (v: number | null, formato: (valor: number) => string) => (v === null ? '—' : formato(v));

/** ROI só é resultado quando houve payout; sem payout é desconhecido, não zero. */
const roiHonesto = (payout: number, roiBruto: number) => (payout > 0 ? roiBruto : null);

const nomeDoCenario = (s: CenarioROI) => s.nome || 'Cenário';

/* ─── Peças visuais ───────────────────────────────────────────────────────── */

/** Cartão-base de cada região (mesmo raio/borda/fundo dos cards do Hub). */
const CARTAO = 'flex min-w-0 flex-col rounded-2xl border border-border/50 bg-card/60 p-4 sm:p-5';

interface DefinicaoParametro {
  chave: ParametroChave;
  nome: string;
  descricao: string;
  Icone: LucideIcon;
  caixa: string;
  tipo: ScenarioParameterUnit;
}

const PARAMETROS: DefinicaoParametro[] = [
  {
    chave: 'employees',
    nome: 'Colaboradores',
    descricao: 'Colaboradores elegíveis',
    Icone: Users,
    caixa: 'bg-success/10 text-success',
    tipo: 'integer',
  },
  {
    chave: 'avgSalary',
    nome: 'Salário médio',
    descricao: 'Salário bruto médio',
    Icone: Wallet,
    caixa: 'bg-success/10 text-success',
    tipo: 'currency',
  },
  {
    chave: 'bonusPercent',
    nome: '% Bônus-alvo',
    descricao: 'Percentual do salário',
    Icone: Target,
    caixa: 'bg-info/10 text-info',
    tipo: 'percentage',
  },
  {
    chave: 'performanceLevel',
    nome: 'Atingimento de meta',
    descricao: 'Média de atingimento',
    Icone: TrendingUp,
    caixa: 'bg-success/10 text-success',
    tipo: 'percentage',
  },
  {
    chave: 'retentionImpact',
    nome: 'Redução de turnover',
    descricao: 'Redução estimada',
    Icone: History,
    caixa: 'bg-success/10 text-success',
    tipo: 'percentage',
  },
];

/** Cabeçalho de seção numerada (ícone + título + subtítulo). */
function CabecalhoSecao({
  numero: ordem,
  titulo,
  subtitulo,
  Icone,
  caixa = 'bg-info/10 text-info',
  indice = 0,
}: {
  numero?: string;
  titulo: string;
  subtitulo: string;
  Icone: LucideIcon;
  caixa?: string;
  indice?: number;
}) {
  return (
    <motion.div {...entradaSimulador(indice)} className="flex min-w-0 items-start gap-3">
      <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', caixa)}>
        <Icone className="h-[18px] w-[18px]" />
      </span>
      <div className="min-w-0">
        <h2 className="text-[14.5px] font-semibold leading-tight">
          {ordem ? `${ordem}. ` : ''}
          {titulo}
        </h2>
        <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{subtitulo}</p>
      </div>
    </motion.div>
  );
}

/** KPI de resultado (2×2) — ícone, rótulo, valor e complemento real. */
function KpiResultado({
  titulo,
  valor,
  formato,
  descricao,
  Icone,
  caixa,
  valorClasse,
  tooltip,
  indice = 0,
}: {
  titulo: string;
  /** `null` = sem divisor/base válida; exibe "—" em vez de afirmar zero. */
  valor: number | null;
  formato: (valor: number) => string;
  descricao: string;
  Icone: LucideIcon;
  caixa: string;
  valorClasse?: string;
  tooltip?: string;
  indice?: number;
}) {
  return (
    <motion.div
      {...entradaSimulador(indice)}
      data-testid="kpi-resultado"
      className="flex min-w-0 flex-col rounded-xl border border-border/40 bg-background/40 p-3"
    >
      <div className="flex items-center gap-2">
        <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-lg', caixa)}>
          <Icone className="h-3.5 w-3.5" />
        </span>
        <p className="min-w-0 flex-1 truncate text-[10.5px] font-medium text-muted-foreground">{titulo}</p>
        {tooltip && <InfoTooltip content={tooltip} className="h-3 w-3" />}
      </div>
      <p
        data-testid="kpi-valor"
        className={cn('mt-2 truncate text-[21px] font-semibold leading-none tracking-tight', valorClasse)}
      >
        <span className="text-numeric">{ouTraco(valor, formato)}</span>
      </p>
      <p className="mt-1.5 line-clamp-2 text-[9.5px] leading-snug text-muted-foreground">{descricao}</p>
    </motion.div>
  );
}

/** Linha do resumo financeiro (bolinha + nome + valor). */
function LinhaResumo({
  cor,
  rotulo,
  valor,
  indice = 0,
}: {
  cor: string;
  rotulo: string;
  valor: string;
  indice?: number;
}) {
  return (
    <motion.li {...entradaSimulador(indice)} className="flex min-w-0 items-center gap-2">
      <span className={cn('h-2 w-2 shrink-0 rounded-full', cor)} aria-hidden />
      <span className="min-w-0 flex-1 text-[11px] leading-snug text-muted-foreground">{rotulo}</span>
      <span className="text-numeric shrink-0 text-[11.5px] font-semibold">{valor}</span>
    </motion.li>
  );
}

/* ─── Gráfico: tick de duas linhas e tooltips do tema ─────────────────────── */

const COR_LINHA_PAYOUT = '#F59E0B';
const COR_LINHA_ECONOMIA = '#10B981';

function TickCategoria({ x = 0, y = 0, payload }: { x?: number; y?: number; payload?: { value?: string | number } }) {
  const [linha1, linha2] = String(payload?.value ?? '').split('|');
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={14} textAnchor="middle" fill="hsl(var(--foreground))" style={{ fontSize: 10.5, fontWeight: 600 }}>
        {linha1}
      </text>
      <text x={0} y={27} textAnchor="middle" fill="hsl(var(--muted-foreground))" style={{ fontSize: 9 }}>
        {linha2}
      </text>
    </g>
  );
}

function TooltipGrafico({
  active,
  payload,
  label,
  formato = moeda,
}: {
  active?: boolean;
  payload?: { value?: number | string }[];
  label?: string | number;
  formato?: (v: number) => string;
}) {
  if (!active || !payload?.length) return null;
  const [titulo] = String(label ?? '').split('|');
  return (
    <div className="rounded-lg border border-border/60 bg-popover px-3 py-2 shadow-lg">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{titulo}</p>
      <p className="text-numeric text-sm font-semibold text-foreground">{formato(Number(payload[0].value ?? 0))}</p>
    </div>
  );
}

/** Tooltip da visão temporal — uma linha por série (Payout / Economia). */
function TooltipSerie({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name?: string; dataKey?: string | number; value?: number | string; color?: string }[];
  label?: string | number;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border/60 bg-popover px-3 py-2 shadow-lg">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      {payload.map((p) => (
        <p key={String(p.dataKey)} className="text-numeric text-[11px] font-medium" style={{ color: p.color }}>
          {p.name}: {moeda(Number(p.value ?? 0))}
        </p>
      ))}
    </div>
  );
}

/* ─── Linhas da comparação ────────────────────────────────────────────────── */

type LinhaChave = ParametroChave | 'totalBudget' | 'savings' | 'resultadoLiquido' | 'roi';
type LinhaTipo = 'numero' | 'moeda' | 'pp' | 'percentual';
/** Semântica da variação: define se subir é bom, ruim ou indiferente. */
type LinhaDirecao = 'maior-melhor' | 'menor-melhor' | 'neutro';

const LINHAS: {
  chave: LinhaChave;
  rotulo: string;
  formato: (v: number) => string;
  tipo: LinhaTipo;
  direcao: LinhaDirecao;
}[] = [
  { chave: 'employees', rotulo: 'Colaboradores', formato: (v) => numero(v), tipo: 'numero', direcao: 'neutro' },
  { chave: 'avgSalary', rotulo: 'Salário médio', formato: moeda, tipo: 'moeda', direcao: 'menor-melhor' },
  { chave: 'bonusPercent', rotulo: '% Bônus-alvo', formato: percentual, tipo: 'pp', direcao: 'neutro' },
  {
    chave: 'performanceLevel',
    rotulo: 'Atingimento de meta',
    formato: percentual,
    tipo: 'pp',
    direcao: 'maior-melhor',
  },
  { chave: 'retentionImpact', rotulo: 'Redução de turnover', formato: percentual, tipo: 'pp', direcao: 'maior-melhor' },
  { chave: 'totalBudget', rotulo: 'Payout estimado', formato: moeda, tipo: 'moeda', direcao: 'menor-melhor' },
  { chave: 'savings', rotulo: 'Economia estimada', formato: moeda, tipo: 'moeda', direcao: 'maior-melhor' },
  { chave: 'resultadoLiquido', rotulo: 'Resultado líquido', formato: moeda, tipo: 'moeda', direcao: 'maior-melhor' },
  { chave: 'roi', rotulo: 'ROI', formato: multiplicador, tipo: 'percentual', direcao: 'maior-melhor' },
];

/** Variação do cenário comparado em relação ao cenário base (atual). */
function variacao(atual: number, base: number, tipo: LinhaTipo) {
  const delta = atual - base;
  if (tipo === 'pp') {
    return { texto: `${delta > 0 ? '+' : ''}${numero(delta, Number.isInteger(delta) ? 0 : 1)} p.p.`, valor: delta };
  }
  if (tipo === 'numero') {
    return { texto: `${delta > 0 ? '+' : ''}${numero(delta)}`, valor: delta };
  }
  const pctDelta = variacaoPercentual(atual, base);
  if (pctDelta === null) return { texto: '—', valor: 0 };
  if (Math.abs(pctDelta) < 0.05) return { texto: '0,0%', valor: 0 };
  return { texto: `${pctDelta > 0 ? '+' : ''}${percentual(pctDelta, 1)}`, valor: pctDelta };
}

/** Verde quando a variação é boa para o negócio, vermelho quando é ruim. */
function corDaVariacao(direcao: LinhaDirecao, valor: number): string {
  if (direcao === 'neutro' || valor === 0) return 'text-muted-foreground';
  const bom = direcao === 'maior-melhor' ? valor > 0 : valor < 0;
  return bom ? 'text-success' : 'text-[hsl(var(--destructive-vivid))]';
}

/* ─── Componente ─────────────────────────────────────────────────────────── */

export function RewardsSimulator() {
  const queryClient = useQueryClient();
  const { empresaAtual } = useEmpresas();
  const empresaId = empresaAtual?.id || '';

  const [employees, setEmployees] = React.useState<number>(BASE.employees);
  const [avgSalary, setAvgSalary] = React.useState<number>(BASE.avgSalary);
  const [bonusPercent, setBonusPercent] = React.useState<number>(BASE.bonusPercent);
  const [performanceLevel, setPerformanceLevel] = React.useState<number>(BASE.performanceLevel);
  const [retentionImpact, setRetentionImpact] = React.useState<number>(BASE.retentionImpact);

  /** id do cenário salvo carregado; `base` = configuração em edição. */
  const [cenarioAtual, setCenarioAtual] = React.useState('base');
  /** Seleção da comparação; `null` = ainda não tocada (usa o mais recente). */
  const [comparados, setComparados] = React.useState<string[] | null>(null);
  const [verTodos, setVerTodos] = React.useState(false);
  /** Visão analítica da seção "2. Visualize o impacto". */
  const [visao, setVisao] = React.useState<VisaoImpacto>('financeira');

  const {
    data: scenarios = [],
    isError: erroCenarios,
    refetch: recarregarCenarios,
  } = useQuery({
    queryKey: ['premiacoes_cenarios_roi', empresaId],
    queryFn: () => premiacoesService.listarCenariosROI(empresaId),
    enabled: !!empresaId,
  });

  /** Leitura falhou e nada em cache: a tela não pode afirmar ausência de registro. */
  const semLeitura = erroCenarios && scenarios.length === 0;

  const saveMutation = useMutation({
    mutationFn: (cenario: CenarioROIInput) => premiacoesService.salvarCenarioROI(cenario, empresaId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['premiacoes_cenarios_roi', empresaId] });
      toast.success('Cenário salvo com sucesso.');
    },
    onError: () => toast.error('Não foi possível salvar o cenário.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (ids: string[]) => premiacoesService.excluirCenariosROI(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['premiacoes_cenarios_roi', empresaId] });
      toast.success('Cenário excluído.');
    },
    onError: () => toast.error('Não foi possível excluir o cenário.'),
  });

  const metricas = calcularMetricas({ employees, avgSalary, bonusPercent, performanceLevel, retentionImpact });
  const { totalBudget, savings, roi, resultadoLiquido } = metricas;
  const positivo = resultadoLiquido >= 0;

  /** Sem payout não há retorno a calcular; sem quadro não há valor por pessoa. */
  const roiExibido = totalBudget > 0 ? roi : null;
  const porColaborador = (v: number) => (employees > 0 ? v : null);
  const custoPorRetido = metricas.retidos > 0 ? metricas.custoPorRetido : null;

  const valores: Record<ParametroChave, number> = {
    employees,
    avgSalary,
    bonusPercent,
    performanceLevel,
    retentionImpact,
  };

  const setters: Record<ParametroChave, (v: number) => void> = {
    employees: setEmployees,
    avgSalary: setAvgSalary,
    bonusPercent: setBonusPercent,
    performanceLevel: setPerformanceLevel,
    retentionImpact: setRetentionImpact,
  };

  /** Qualquer ajuste manual vira o novo "cenário base" (a config em edição). */
  const alterarParametro = (chave: ParametroChave, valor: number) => {
    setters[chave](valor);
    setCenarioAtual('base');
  };

  const resetarBase = () => {
    setEmployees(BASE.employees);
    setAvgSalary(BASE.avgSalary);
    setBonusPercent(BASE.bonusPercent);
    setPerformanceLevel(BASE.performanceLevel);
    setRetentionImpact(BASE.retentionImpact);
    setCenarioAtual('base');
  };

  /** Carrega os parâmetros de um cenário salvo (operação real do serviço). */
  const aplicarCenario = (s: CenarioROI) => {
    setEmployees(s.configuracoes.employees ?? 0);
    setAvgSalary(s.configuracoes.avgSalary ?? 0);
    setBonusPercent(s.configuracoes.bonusPercent ?? 0);
    setPerformanceLevel(s.configuracoes.performanceLevel ?? 0);
    setRetentionImpact(s.configuracoes.retentionImpact ?? 0);
    setCenarioAtual(s.id);
    toast.info(`Cenário "${nomeDoCenario(s)}" carregado.`);
  };

  const buildCenarioInput = (
    name: string,
    cfg: Pick<CenarioROIInput, 'employees' | 'avgSalary' | 'bonusPercent' | 'performanceLevel' | 'retentionImpact'>,
    res: Pick<CenarioROIInput, 'totalBudget' | 'savings' | 'roi'>
  ): CenarioROIInput => ({ name, ...cfg, ...res });

  const saveScenario = () => {
    saveMutation.mutate(
      buildCenarioInput(
        `Cenário ${scenarios.length + 1}`,
        { employees, avgSalary, bonusPercent, performanceLevel, retentionImpact },
        { totalBudget, savings, roi }
      )
    );
  };

  /** Duplicar snapshot: mesma configuração e mesmos resultados já gravados. */
  const duplicarCenario = (s: CenarioROI) => {
    saveMutation.mutate(
      buildCenarioInput(
        `${nomeDoCenario(s)} (cópia)`,
        {
          employees: s.configuracoes.employees ?? 0,
          avgSalary: s.configuracoes.avgSalary ?? 0,
          bonusPercent: s.configuracoes.bonusPercent ?? 0,
          performanceLevel: s.configuracoes.performanceLevel ?? 0,
          retentionImpact: s.configuracoes.retentionImpact ?? 0,
        },
        {
          totalBudget: s.resultados.totalBudget ?? 0,
          savings: s.resultados.savings ?? 0,
          roi: s.resultados.roi ?? 0,
        }
      )
    );
  };

  const selecionados = comparados ?? (scenarios[0] ? [scenarios[0].id] : []);

  const alternarComparado = (id: string) => {
    if (selecionados.includes(id)) {
      setComparados(selecionados.filter((x) => x !== id));
      return;
    }
    if (selecionados.length >= 2) {
      toast.info('Compare no máximo dois cenários por vez.');
      return;
    }
    setComparados([...selecionados, id]);
  };

  const cenariosSelecionados = selecionados
    .map((id) => scenarios.find((s) => s.id === id))
    .filter((s): s is CenarioROI => Boolean(s));

  const valorDoCenario = (s: CenarioROI, chave: LinhaChave): number => {
    switch (chave) {
      case 'totalBudget':
        return s.resultados.totalBudget ?? 0;
      case 'savings':
        return s.resultados.savings ?? 0;
      case 'roi':
        return s.resultados.roi ?? 0;
      case 'resultadoLiquido':
        return (s.resultados.savings ?? 0) - (s.resultados.totalBudget ?? 0);
      default:
        return s.configuracoes[chave] ?? 0;
    }
  };

  const visiveis = verTodos ? scenarios : scenarios.slice(0, 3);

  /* ─── Dados das quatro visões (seção 2) ─────────────────────────────────── */

  /** Cenários salvos no formato do motor puro (campos opcionais resolvidos). */
  const cenariosTemporais: CenarioTemporal[] = scenarios.map((s) => ({
    id: s.id,
    configuracoes: {
      employees: s.configuracoes.employees ?? 0,
      avgSalary: s.configuracoes.avgSalary ?? 0,
      bonusPercent: s.configuracoes.bonusPercent ?? 0,
      performanceLevel: s.configuracoes.performanceLevel ?? 0,
      retentionImpact: s.configuracoes.retentionImpact ?? 0,
    },
    resultados: { totalBudget: s.resultados.totalBudget ?? 0, savings: s.resultados.savings ?? 0 },
    created_at: s.created_at ?? undefined,
  }));

  const serieTemporal = montarSerieTemporal(cenariosTemporais, { metricas });
  const pontosSalvos = serieTemporal.filter((p) => !p.atual);
  /** Sem cenário salvo com data não existe evolução: nada a desenhar. */
  const temHistorico = pontosSalvos.length > 0;
  /** Base declarada da variação: o cenário salvo mais recente (não o mais antigo). */
  const ultimoSalvo = pontosSalvos[pontosSalvos.length - 1];
  const variacaoEconomia = ultimoSalvo ? variacaoPercentual(savings, ultimoSalvo.economia) : null;

  const dadosFinanceiros = [
    { nome: 'Payout|Investimento', valor: totalBudget, contorno: COR_LINHA_PAYOUT },
    { nome: 'Economia|Redução de turnover', valor: savings, contorno: COR_LINHA_ECONOMIA },
  ];
  const dadosRetencao = [
    { nome: 'Elegíveis|Colaboradores', valor: employees, contorno: 'hsl(var(--info))' },
    { nome: 'Retidos|Pela redução de turnover', valor: metricas.retidos, contorno: COR_LINHA_ECONOMIA },
  ];
  const dadosColaborador = [
    { nome: 'Payout|Por colaborador', valor: metricas.payoutPorColaborador, contorno: COR_LINHA_PAYOUT },
    { nome: 'Economia|Por colaborador', valor: metricas.economiaPorColaborador, contorno: COR_LINHA_ECONOMIA },
  ];
  const dadosBarras =
    visao === 'retencao' ? dadosRetencao : visao === 'colaborador' ? dadosColaborador : dadosFinanceiros;

  const formatarNaVisao = visao === 'retencao' ? (v: number) => numero(v, Number.isInteger(v) ? 0 : 1) : moeda;
  const formatarEixoNaVisao = visao === 'retencao' ? (v: number) => numero(v) : moedaEixo;

  /** Título, quatro linhas e nota metodológica do painel direito. */
  const resumoVisao: { titulo: string; linhas: { cor: string; rotulo: string; valor: string }[]; nota: string } =
    visao === 'retencao'
      ? {
          titulo: 'Resumo de retenção',
          linhas: [
            { cor: 'bg-info', rotulo: 'Taxa de retenção', valor: percentual(retentionImpact) },
            {
              cor: 'bg-success',
              rotulo: 'Colaboradores retidos',
              valor: numero(metricas.retidos, Number.isInteger(metricas.retidos) ? 0 : 1),
            },
            { cor: 'bg-success', rotulo: 'Reposição evitada', valor: moeda(savings) },
            { cor: 'bg-warning', rotulo: 'Custo por retido', valor: ouTraco(custoPorRetido, moeda) },
          ],
          nota: 'Premissa: 15% de turnover e 3 salários por reposição; a redução configurada incide sobre esse total.',
        }
      : visao === 'temporal'
        ? {
            titulo: 'Resumo temporal',
            linhas: [
              { cor: 'bg-info', rotulo: 'Cenários salvos', valor: semLeitura ? '—' : numero(scenarios.length) },
              { cor: 'bg-warning', rotulo: 'Payout atual', valor: moeda(totalBudget) },
              { cor: 'bg-success', rotulo: 'Economia atual', valor: moeda(savings) },
              {
                cor: variacaoEconomia !== null && variacaoEconomia < 0 ? 'bg-destructive' : 'bg-success',
                rotulo: 'Variação vs. último cenário salvo',
                valor:
                  variacaoEconomia === null
                    ? '—'
                    : `${variacaoEconomia > 0 ? '+' : ''}${percentual(variacaoEconomia, 1)}`,
              },
            ],
            nota: 'Cada ponto é um cenário salvo; “Agora” é a configuração em edição. Sem projeção futura — histórico real (até 9 cenários + atual).',
          }
        : visao === 'colaborador'
          ? {
              titulo: 'Resumo por colaborador',
              linhas: [
                {
                  cor: 'bg-warning',
                  rotulo: 'Payout por colaborador',
                  valor: ouTraco(porColaborador(metricas.payoutPorColaborador), moeda),
                },
                {
                  cor: 'bg-success',
                  rotulo: 'Economia por colaborador',
                  valor: ouTraco(porColaborador(metricas.economiaPorColaborador), moeda),
                },
                {
                  cor: employees > 0 && metricas.resultadoPorColaborador < 0 ? 'bg-destructive' : 'bg-info',
                  rotulo: 'Resultado por colaborador',
                  valor: ouTraco(porColaborador(metricas.resultadoPorColaborador), moeda),
                },
                { cor: 'bg-xp', rotulo: 'Retorno por R$ 1,00', valor: ouTraco(roiExibido, multiplicador) },
              ],
              nota: 'Divide os totais pelo número de colaboradores elegíveis. O retorno por real é a economia estimada ÷ payout estimado.',
            }
          : {
              titulo: 'Resumo financeiro',
              linhas: [
                { cor: 'bg-warning', rotulo: 'Payout estimado', valor: moeda(totalBudget) },
                { cor: 'bg-success', rotulo: 'Economia estimada', valor: moeda(savings) },
                {
                  cor: positivo ? 'bg-info' : 'bg-destructive',
                  rotulo: 'Resultado líquido',
                  valor: moeda(resultadoLiquido),
                },
                { cor: 'bg-xp', rotulo: 'ROI (eficiência)', valor: ouTraco(roiExibido, multiplicador) },
              ],
              nota: 'A economia é o custo de reposição (3 salários × 15% do quadro) multiplicado pela redução de turnover.',
            };

  /** Valor do cenário BASE (configuração em edição) para cada linha da tabela. */
  const valorBase = (chave: LinhaChave): number => {
    switch (chave) {
      case 'totalBudget':
        return totalBudget;
      case 'savings':
        return savings;
      case 'roi':
        return roi;
      case 'resultadoLiquido':
        return resultadoLiquido;
      default:
        return valores[chave];
    }
  };

  /** Linhas formatadas — a comparação só apresenta; cálculo continua no pai. */
  const linhasComparadas: LinhaComparacao[] = LINHAS.map((linha) => {
    const base = valorBase(linha.chave);
    const ultimo = cenariosSelecionados[cenariosSelecionados.length - 1];
    const variacaoLinha = variacao(ultimo ? valorDoCenario(ultimo, linha.chave) : base, base, linha.tipo);
    /** A linha ROI segue a regra do KPI: sem payout mostra "—", nunca "0,00x". */
    const exibir = (valor: number, payout: number) =>
      linha.chave === 'roi' ? ouTraco(roiHonesto(payout, valor), multiplicador) : linha.formato(valor);
    return {
      chave: linha.chave,
      rotulo: linha.rotulo,
      base: exibir(base, totalBudget),
      selecionados: cenariosSelecionados.map((s) => ({
        id: s.id,
        nome: nomeDoCenario(s),
        valor: exibir(valorDoCenario(s, linha.chave), s.resultados.totalBudget ?? 0),
      })),
      variacao: variacaoLinha.texto,
      corVariacao: corDaVariacao(linha.direcao, variacaoLinha.valor),
    };
  });
  const cenariosComparados = cenariosSelecionados.map((s) => ({ id: s.id, nome: nomeDoCenario(s) }));

  return (
    <EntradaPresenca>
      <div className="space-y-4">
        <div className="grid min-w-0 grid-cols-1 items-stretch gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          {/* ─── 1 · CONFIGURE SEU CENÁRIO ───────────────────────────────── */}
          <motion.section {...entradaSimulador(0)} className={CARTAO}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <CabecalhoSecao
                numero="1"
                titulo="Configure seu cenário"
                subtitulo="Ajuste os parâmetros e veja o impacto nos resultados em tempo real."
                Icone={SlidersHorizontal}
                indice={0}
              />
              <motion.div {...entradaSimulador(1)}>
                <Select
                  value={cenarioAtual}
                  onValueChange={(v) => {
                    if (v === 'base') {
                      resetarBase();
                      return;
                    }
                    const cenario = scenarios.find((s) => s.id === v);
                    if (cenario) aplicarCenario(cenario);
                  }}
                >
                  <SelectTrigger
                    aria-label="Cenário de simulação"
                    className="h-9 w-[180px] rounded-lg border-border/50 bg-background text-label"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent align="end">
                    <SelectItem value="base" className="text-xs">
                      Cenário base
                    </SelectItem>
                    {scenarios.map((s) => (
                      <SelectItem key={s.id} value={s.id} className="text-xs">
                        {nomeDoCenario(s)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </motion.div>
            </div>

            <div className="mt-4 grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {PARAMETROS.slice(0, 3).map((p, indice) => (
                <ScenarioParameterCard
                  key={p.chave}
                  indice={2 + indice}
                  label={p.nome}
                  description={p.descricao}
                  value={valores[p.chave]}
                  min={LIMITES[p.chave].min}
                  max={LIMITES[p.chave].max}
                  step={LIMITES[p.chave].step}
                  unit={p.tipo}
                  icon={<p.Icone className="h-3.5 w-3.5" />}
                  iconClassName={p.caixa}
                  onChange={(v) => alterarParametro(p.chave, v)}
                />
              ))}
            </div>
            <div className="mt-3 grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2">
              {PARAMETROS.slice(3).map((p, indice) => (
                <ScenarioParameterCard
                  key={p.chave}
                  indice={5 + indice}
                  label={p.nome}
                  description={p.descricao}
                  value={valores[p.chave]}
                  min={LIMITES[p.chave].min}
                  max={LIMITES[p.chave].max}
                  step={LIMITES[p.chave].step}
                  unit={p.tipo}
                  icon={<p.Icone className="h-3.5 w-3.5" />}
                  iconClassName={p.caixa}
                  onChange={(v) => alterarParametro(p.chave, v)}
                />
              ))}
            </div>
          </motion.section>

          {/* ─── RESULTADOS DA SIMULAÇÃO ─────────────────────────────────── */}
          <motion.section {...entradaSimulador(1)} className={CARTAO}>
            <CabecalhoSecao
              titulo="Resultados da simulação"
              subtitulo="Impacto financeiro estimado para o cenário configurado."
              Icone={BarChart3}
              caixa="bg-success/10 text-success"
              indice={0}
            />

            <div className="mt-4 grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
              <KpiResultado
                titulo="Payout estimado"
                valor={totalBudget}
                formato={moeda}
                descricao={`${percentual(bonusPercent)} de bônus sobre ${percentual(performanceLevel)} de atingimento`}
                Icone={Landmark}
                caixa="bg-warning/10 text-warning"
                tooltip="Payout estimado = colaboradores × salário médio × % bônus × atingimento de meta."
                indice={1}
              />
              <KpiResultado
                titulo="Economia estimada"
                valor={savings}
                formato={moeda}
                descricao={`Redução de ${percentual(retentionImpact, Number.isInteger(retentionImpact) ? 0 : 1)} no turnover`}
                Icone={TrendingUp}
                caixa="bg-success/10 text-success"
                tooltip="Economia estimada = salário médio × 3 × 15% do quadro × redução de turnover."
                indice={2}
              />
              <KpiResultado
                titulo="Resultado líquido"
                valor={resultadoLiquido}
                formato={moeda}
                valorClasse={positivo ? 'text-success' : 'text-destructive'}
                descricao="Economia estimada − payout estimado"
                Icone={Wallet}
                caixa={positivo ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}
                tooltip="Resultado líquido = economia estimada − payout estimado."
                indice={3}
              />
              <KpiResultado
                titulo="ROI estimado"
                valor={roiExibido}
                formato={multiplicador}
                valorClasse="text-xp"
                descricao={
                  roiExibido === null ? 'Sem payout, não há retorno a calcular' : 'Retorno sobre o investimento'
                }
                Icone={Target}
                caixa="bg-xp/10 text-xp"
                tooltip="ROI = economia estimada ÷ payout estimado (retorno por R$ 1,00 investido)."
                indice={4}
              />
            </div>

            <motion.footer
              {...entradaSimulador(5)}
              className={cn(
                'mt-3 flex items-start gap-2 rounded-xl border px-3 py-2 text-[10.5px] leading-relaxed',
                positivo
                  ? 'border-success/25 bg-success/10 text-success'
                  : cn(
                      'border-[hsl(var(--destructive-vivid)/0.4)] bg-[hsl(var(--destructive-vivid)/0.1)]',
                      'font-medium text-[hsl(var(--destructive-vivid))]'
                    )
              )}
            >
              <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <p>
                {roiExibido === null
                  ? 'Sem payout previsto, não há retorno sobre investimento a calcular.'
                  : positivo
                    ? `Para cada R$ 1,00 investido, a economia estimada é de R$ ${numero(roiExibido, 2)}.`
                    : `O payout previsto supera a economia estimada em ${moeda(Math.abs(resultadoLiquido))}.`}
              </p>
            </motion.footer>
          </motion.section>

          {/* ─── 2 · VISUALIZE O IMPACTO ──────────────────────────────────── */}
          <motion.section {...entradaSimulador(2)} className={CARTAO}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <CabecalhoSecao
                numero="2"
                titulo="Visualize o impacto"
                subtitulo="Compare o investimento com a economia gerada pelo programa."
                Icone={BarChart3}
                indice={0}
              />
              <motion.div {...entradaSimulador(1)}>
                <Select value={visao} onValueChange={(v) => setVisao(v as VisaoImpacto)}>
                  <SelectTrigger
                    aria-label="Visão do impacto"
                    className="h-9 w-[168px] rounded-lg border-border/50 bg-background text-label"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent align="end">
                    <SelectItem value="financeira" className="text-xs">
                      Financeira
                    </SelectItem>
                    <SelectItem value="retencao" className="text-xs">
                      Retenção
                    </SelectItem>
                    <SelectItem value="temporal" className="text-xs">
                      Evolução temporal
                    </SelectItem>
                    <SelectItem value="colaborador" className="text-xs">
                      Por colaborador
                    </SelectItem>
                  </SelectContent>
                </Select>
              </motion.div>
            </div>

            <div className="mt-4 grid min-w-0 flex-1 grid-cols-1 items-stretch gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
              <motion.div
                {...entradaSimulador(2)}
                className="flex min-w-0 flex-col rounded-xl border border-border/30 bg-background/30 p-2.5"
              >
                <div key={visao} className="relative min-h-[250px] w-full min-w-0 flex-1">
                  {visao === 'temporal' && !temHistorico ? (
                    <div className="flex h-full min-h-[250px] flex-col items-center justify-center gap-1.5 px-6 text-center">
                      <History className="h-4 w-4 text-muted-foreground" />
                      <p className="text-[11.5px] font-medium">Sem histórico para mostrar</p>
                      <p className="max-w-[280px] text-[10px] leading-snug text-muted-foreground">
                        A evolução usa apenas cenários já salvos, na data em que foram criados. Salve um cenário para
                        começar a série.
                      </p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      {visao === 'temporal' ? (
                        <ComposedChart data={serieTemporal} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="roiPayoutGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={COR_LINHA_PAYOUT} stopOpacity={0.2} />
                              <stop offset="55%" stopColor={COR_LINHA_PAYOUT} stopOpacity={0.08} />
                              <stop offset="100%" stopColor={COR_LINHA_PAYOUT} stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="roiEconomiaGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={COR_LINHA_ECONOMIA} stopOpacity={0.18} />
                              <stop offset="55%" stopColor={COR_LINHA_ECONOMIA} stopOpacity={0.07} />
                              <stop offset="100%" stopColor={COR_LINHA_ECONOMIA} stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
                          <XAxis
                            dataKey="rotulo"
                            tickLine={false}
                            axisLine={false}
                            minTickGap={12}
                            height={28}
                            tick={{ fontSize: 9.5, fill: 'hsl(var(--muted-foreground))' }}
                          />
                          <YAxis
                            tickFormatter={moedaEixo}
                            tickLine={false}
                            axisLine={false}
                            width={64}
                            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                          />
                          <RechartsTooltip content={<TooltipSerie />} cursor={{ stroke: 'hsl(var(--border))' }} />
                          <Area
                            type="monotone"
                            dataKey="payout"
                            name="Payout"
                            stroke={COR_LINHA_PAYOUT}
                            strokeWidth={2.5}
                            strokeLinecap="round"
                            fill="url(#roiPayoutGradient)"
                            fillOpacity={1}
                            baseValue={0}
                            dot={{ r: 2.5, strokeWidth: 0, fill: COR_LINHA_PAYOUT }}
                            activeDot={{ r: 4 }}
                          />
                          <Area
                            type="monotone"
                            dataKey="economia"
                            name="Economia"
                            stroke={COR_LINHA_ECONOMIA}
                            strokeWidth={2.5}
                            strokeLinecap="round"
                            fill="url(#roiEconomiaGradient)"
                            fillOpacity={1}
                            baseValue={0}
                            dot={{ r: 2.5, strokeWidth: 0, fill: COR_LINHA_ECONOMIA }}
                            activeDot={{ r: 4 }}
                          />
                        </ComposedChart>
                      ) : (
                        <BarChart
                          data={dadosBarras}
                          margin={{ top: 26, right: 8, left: 0, bottom: 4 }}
                          barCategoryGap="28%"
                        >
                          <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
                          <XAxis
                            dataKey="nome"
                            tickLine={false}
                            axisLine={false}
                            interval={0}
                            height={40}
                            tick={<TickCategoria />}
                          />
                          <YAxis
                            tickFormatter={formatarEixoNaVisao}
                            tickLine={false}
                            axisLine={false}
                            width={visao === 'retencao' ? 46 : 64}
                            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                          />
                          <RechartsTooltip
                            cursor={{ fill: 'hsl(var(--muted) / 0.35)' }}
                            content={<TooltipGrafico formato={formatarNaVisao} />}
                          />
                          <Bar dataKey="valor" radius={[6, 6, 0, 0]} maxBarSize={120}>
                            {dadosBarras.map((d) => (
                              <Cell
                                key={d.nome}
                                fill={d.contorno}
                                fillOpacity={0.2}
                                stroke={d.contorno}
                                strokeOpacity={1}
                                strokeWidth={1.5}
                              />
                            ))}
                            <LabelList
                              dataKey="valor"
                              position="top"
                              offset={8}
                              formatter={(v: unknown) => formatarNaVisao(Number(v))}
                              style={{ fontSize: 10.5, fontWeight: 600, fill: 'hsl(var(--foreground))' }}
                            />
                          </Bar>
                        </BarChart>
                      )}
                    </ResponsiveContainer>
                  )}
                </div>
              </motion.div>

              <motion.div
                {...entradaSimulador(3)}
                className="flex min-w-0 flex-col rounded-xl border border-border/40 bg-muted/10 p-3.5"
              >
                <p className="text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {resumoVisao.titulo}
                </p>
                <ul className="mt-2.5 flex flex-1 flex-col gap-2.5">
                  {resumoVisao.linhas.map((linha, indice) => (
                    <LinhaResumo
                      key={linha.rotulo}
                      cor={linha.cor}
                      rotulo={linha.rotulo}
                      valor={linha.valor}
                      indice={4 + indice}
                    />
                  ))}
                </ul>
                <motion.div
                  {...entradaSimulador(8)}
                  className="mt-3 flex items-start gap-2 rounded-lg bg-background/50 p-2.5 text-[9.5px] leading-relaxed text-muted-foreground"
                >
                  <Lightbulb className="mt-0.5 h-3 w-3 shrink-0 text-warning" />
                  <p>{resumoVisao.nota}</p>
                </motion.div>
              </motion.div>
            </div>
          </motion.section>

          {/* ─── 3 · COMPARE CENÁRIOS ─────────────────────────────────────── */}
          <motion.section {...entradaSimulador(3)} className={CARTAO}>
            <div className="flex items-center justify-between gap-4">
              <CabecalhoSecao
                numero="3"
                titulo="Compare cenários"
                subtitulo="Analise diferentes estratégias lado a lado."
                Icone={Scale}
                indice={0}
              />
              <motion.div {...entradaSimulador(1)} className="shrink-0">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 w-fit shrink-0 gap-1 rounded-lg border-border/50 bg-background px-2 text-[11px]"
                    >
                      <Scale className="h-3.5 w-3.5" />
                      Selecionar cenários ({selecionados.length})
                      <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64">
                    <DropdownMenuLabel className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      Até dois cenários
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {scenarios.map((s) => {
                      const marcado = selecionados.includes(s.id);
                      return (
                        <DropdownMenuItem
                          key={s.id}
                          onSelect={(e) => {
                            e.preventDefault();
                            alternarComparado(s.id);
                          }}
                          className="gap-2 text-xs"
                        >
                          <span
                            className={cn(
                              'flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border',
                              marcado ? 'border-primary bg-primary text-primary-foreground' : 'border-border'
                            )}
                          >
                            {marcado && <Check className="h-2.5 w-2.5" />}
                          </span>
                          <span className="truncate">{nomeDoCenario(s)}</span>
                        </DropdownMenuItem>
                      );
                    })}
                    {scenarios.length === 0 &&
                      (semLeitura ? (
                        <div className="px-2 py-2">
                          <p className="text-[11px] text-muted-foreground">
                            Não foi possível carregar os cenários salvos.
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-1.5 h-7 w-full rounded-md text-[11px]"
                            onClick={() => void recarregarCenarios()}
                          >
                            Tentar novamente
                          </Button>
                        </div>
                      ) : (
                        <p className="px-2 py-2 text-[11px] text-muted-foreground">Nenhum cenário salvo ainda.</p>
                      ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </motion.div>
            </div>

            {cenariosSelecionados.length === 0 ? (
              <motion.div
                {...entradaSimulador(2)}
                className="mt-4 flex flex-1 flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-border/50 bg-muted/10 p-6 text-center"
              >
                <Scale className="h-4 w-4 text-muted-foreground" />
                <p className="text-[11.5px] font-medium">Nenhum cenário selecionado</p>
                <p className="max-w-[260px] text-[10px] leading-snug text-muted-foreground">
                  Salve uma simulação e use “Selecionar cenários” para comparar com o cenário base em edição.
                </p>
              </motion.div>
            ) : (
              <div className="mt-3 min-w-0 flex-1">
                <ComparacaoCenarios linhas={linhasComparadas} cenarios={cenariosComparados} />
                <motion.p {...entradaSimulador(6)} className="mt-2 text-[9px] leading-snug text-muted-foreground">
                  Variação de <strong>{nomeDoCenario(cenariosSelecionados[cenariosSelecionados.length - 1])}</strong> em
                  relação ao cenário base em edição.
                </motion.p>
              </div>
            )}
          </motion.section>
        </div>

        {/* ─── CENÁRIOS SALVOS ───────────────────────────────────────────── */}
        <motion.section {...entradaSimulador(4)} className={CARTAO}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CabecalhoSecao
              titulo="Cenários salvos"
              subtitulo="Gerencie seus cenários de simulação."
              Icone={History}
              indice={0}
            />
            <div className="flex items-center gap-2">
              {scenarios.length > 3 && (
                <motion.div {...entradaSimulador(1)}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 gap-1.5 rounded-lg border-border/50 bg-background px-2.5 text-[11px]"
                    onClick={() => setVerTodos((v) => !v)}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    {verTodos ? 'Mostrar menos' : `Ver todos (${scenarios.length})`}
                  </Button>
                </motion.div>
              )}
              <motion.div {...entradaSimulador(2)}>
                <Button
                  size="sm"
                  className="h-9 gap-1.5 rounded-lg px-3 text-[11px]"
                  onClick={saveScenario}
                  disabled={saveMutation.isPending}
                >
                  <Save className="h-3.5 w-3.5" />
                  {saveMutation.isPending ? 'Salvando…' : 'Salvar cenário'}
                </Button>
              </motion.div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {/* Cenário base — a configuração em edição (não é um snapshot). */}
            <motion.div
              {...entradaSimulador(3)}
              className="flex flex-col rounded-xl border border-primary/30 bg-primary/5 p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-[12px] font-semibold">Cenário base</p>
                <Badge className="h-4 shrink-0 border-transparent bg-primary/15 px-1.5 text-[8.5px] text-primary hover:bg-primary/15">
                  Atual
                </Badge>
              </div>
              <p className="mt-0.5 text-[10px] text-muted-foreground">Configuração em edição</p>
              <motion.div {...entradaSimulador(1)} className="mt-2 flex items-end justify-between gap-2">
                <p className="text-numeric text-[13.5px] font-semibold text-primary">{moeda(totalBudget)}</p>
                <Badge
                  variant="outline"
                  className="h-4 shrink-0 border-primary/25 bg-primary/10 px-1.5 text-[8.5px] text-primary"
                >
                  ROI {ouTraco(roiExibido, multiplicador)}
                </Badge>
              </motion.div>
            </motion.div>

            {visiveis.map((s, indice) => (
              <motion.div
                key={s.id}
                {...entradaSimulador(4 + indice)}
                className="relative flex flex-col rounded-xl border border-border/40 bg-background/40 p-3 transition-colors hover:border-primary/30"
              >
                <button
                  type="button"
                  onClick={() => aplicarCenario(s)}
                  className="flex w-full min-w-0 flex-col pr-6 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                >
                  <span className="truncate text-[12px] font-semibold">{nomeDoCenario(s)}</span>
                  <span className="mt-0.5 truncate text-[10px] text-muted-foreground">
                    {s.created_at ? formatDateTime(s.created_at) : 'Data não registrada'}
                  </span>
                </button>
                <motion.div {...entradaSimulador(1)} className="mt-2 flex items-end justify-between gap-2">
                  <p className="text-numeric truncate text-[13.5px] font-semibold text-primary">
                    {moeda(s.resultados.totalBudget ?? 0)}
                  </p>
                  <Badge
                    variant="outline"
                    className="h-4 shrink-0 border-success/25 bg-success/10 px-1.5 text-[8.5px] text-success"
                  >
                    ROI {ouTraco(roiHonesto(s.resultados.totalBudget ?? 0, s.resultados.roi ?? 0), multiplicador)}
                  </Badge>
                </motion.div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1.5 top-1.5 h-6 w-6 text-muted-foreground"
                      aria-label={`Ações de ${nomeDoCenario(s)}`}
                    >
                      <MoreVertical className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => aplicarCenario(s)} className="gap-2 text-xs">
                      <History className="h-3.5 w-3.5" /> Carregar cenário
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => alternarComparado(s.id)} className="gap-2 text-xs">
                      <Scale className="h-3.5 w-3.5" />
                      {selecionados.includes(s.id) ? 'Remover da comparação' : 'Comparar cenário'}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => duplicarCenario(s)}
                      disabled={saveMutation.isPending}
                      className="gap-2 text-xs"
                    >
                      <Copy className="h-3.5 w-3.5" /> Duplicar cenário
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => deleteMutation.mutate([s.id])}
                      disabled={deleteMutation.isPending}
                      className="gap-2 text-xs text-[hsl(var(--destructive-vivid))]"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Excluir cenário
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </motion.div>
            ))}

            {scenarios.length === 0 && (
              <motion.div
                {...entradaSimulador(3)}
                className="flex min-h-[88px] flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border/50 bg-muted/10 p-3 text-center sm:col-span-1 xl:col-span-2"
              >
                {semLeitura ? (
                  <>
                    <p className="text-[11px] font-medium">Não foi possível carregar os cenários salvos</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-1 h-7 gap-1.5 rounded-lg border-border/50 bg-background px-2.5 text-[11px]"
                      onClick={() => void recarregarCenarios()}
                    >
                      Tentar novamente
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="text-[11px] font-medium">Nenhum cenário salvo ainda</p>
                    <p className="text-[9.5px] text-muted-foreground">
                      Ajuste os parâmetros e clique em “Salvar cenário”.
                    </p>
                  </>
                )}
              </motion.div>
            )}
          </div>
        </motion.section>
      </div>
    </EntradaPresenca>
  );
}
