/**
 * ============================================================================
 * HUB DE PREMIAÇÕES — ABA SIMULADOR ROI (redesenho estrutural).
 *
 * A composição segue a referência aprovada (IMAGEM 3), em quatro regiões:
 *
 *   ┌───────────────────────────────┬──────────────────────────┐
 *   │ 1. Configure seu cenário      │ Resultados da simulação  │
 *   ├───────────────────────────────┼──────────────────────────┤
 *   │ 2. Visualize o impacto        │ 3. Compare cenários      │
 *   ├───────────────────────────────┴──────────────────────────┤
 *   │ Cenários salvos                                          │
 *   └──────────────────────────────────────────────────────────┘
 *
 * O que foi PRESERVADO do motor existente: os cinco parâmetros (estado e
 * limites), a fórmula financeira, o salvamento/carregamento via
 * `premiacoesService` e o modo demonstração (`premiacoesMock`). Nada de banco,
 * API, cálculo ou permissão mudou.
 *
 * O que foi REMOVIDO da composição (não escondido): cabeçalho independente do
 * simulador, card único de sliders + gráfico, card gigante de payout, card
 * isolado de economia, lista vertical de snapshots e os botões "Copiar" e
 * "Excluir", que não tinham implementação (não foram recriados como fachada).
 *
 * ── FÓRMULAS (as MESMAS de antes — nenhuma metodologia alterada) ───────────
 *   payout             = colaboradores × salário médio × (% bônus/100) × (meta/100)
 *   custo de reposição = salário médio × 3 × colaboradores × 0,15
 *   economia           = custo de reposição × (% redução turnover/100)
 *   ROI                = economia ÷ payout            (multiplicador, ex.: 0,26x)
 *   resultado líquido  = economia − payout            (derivada, só exibição)
 *
 * ── PERÍODO ───────────────────────────────────────────────────────────────
 * A referência mostra um seletor "Período". O simulador NÃO possui fonte de
 * dados nem comportamento de período — a fórmula é instantânea e não usa
 * data. Por isso o controle NÃO foi implementado (nada de seleção fictícia);
 * quando existir fonte real, ele entra ao lado do seletor de cenário.
 * ============================================================================
 */
import React from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  Check,
  ChevronDown,
  Eye,
  History,
  Landmark,
  Lightbulb,
  MoreVertical,
  Scale,
  Save,
  SlidersHorizontal,
  Target,
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
  Rectangle,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
  type BarShapeProps,
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
import { AnimatedNumber } from '@/components/dashboard/AnimatedNumber';
import { useMovimentoReduzido } from '@/lib/motionMode';
import { cn } from '@/lib/utils';
import { formatCurrency, formatDateTime } from '@/utils/format';
import { ScenarioParameterCard, type ScenarioParameterUnit } from './ScenarioParameterCard';
import { ComparacaoCenarios, type LinhaComparacao } from './ComparacaoCenarios';
import { premiacoesService } from '@/services/premiacoesService';
import { useEmpresas } from '@/hooks/useEmpresas';
// MOCK VISUAL — ver src/mocks/premiacoesMock.ts.
import { bloquearEscritaPremiacoes, getMockCenariosRoi, isPremiacoesMockEnabled } from '@/mocks/premiacoesMock';
import { EntradaPresenca, entradaSimulador } from './simuladorEntrada';
import { calcularMetricas, montarSerieTemporal, variacaoPercentual } from './simuladorRoiComum';

/* ─── Modelo e parâmetros ─────────────────────────────────────────────────── */

interface CenarioRoi {
  id: string;
  name?: string;
  nome?: string;
  configuracoes: {
    employees: number;
    avgSalary: number;
    bonusPercent: number;
    performanceLevel: number;
    retentionImpact: number;
  };
  resultados: { totalBudget: number; savings: number; roi: number };
  created_at?: string;
}

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

/**
 * Token da ativação atual da aba Simulador (publicado por `PremiacoesPage`) e
 * marca do último acesso em que a contagem dos KPIs já rodou. É um controle de
 * sessão: sobrevive a remontagens do subtree e é trocado quando o usuário sai
 * e volta à aba, permitindo uma nova contagem.
 */
const CHAVE_ACESSO_KPI = 'dp-premiacoes-roi-kpi-acesso';
const CHAVE_KPI_CONTADO = 'dp-premiacoes-roi-kpi-contado';

/** Eixo Y do gráfico sem centavos: R$ 30.000. */
const moedaEixo = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);

/**
 * Cálculo financeiro — agora vem do motor compartilhado
 * (`./simuladorRoiComum`), que concentra fórmulas e premissas.
 */

const nomeDoCenario = (s: CenarioRoi) => s.name || s.nome || 'Cenário';

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
  numero,
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
          {numero ? `${numero}. ` : ''}
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
  animarNumero = true,
  acesso,
}: {
  titulo: string;
  valor: number;
  /** Formata cada quadro da contagem (moeda BRL ou multiplicador de ROI). */
  formato: (valor: number) => string;
  descricao: string;
  Icone: LucideIcon;
  caixa: string;
  valorClasse?: string;
  tooltip?: string;
  indice?: number;
  /** Contagem inicial; é desligada após qualquer alteração de parâmetro. */
  animarNumero?: boolean;
  /** Token da ativação da aba, para garantir uma única contagem por acesso. */
  acesso: string;
}) {
  const reduzirMovimento = useMovimentoReduzido();
  const valorSeguro = Number.isFinite(valor) ? valor : 0;
  /**
   * Guard persistente por acesso: a primeira montagem dos quatro KPIs conta;
   * se o subtree remontar no mesmo acesso, os valores aparecem direto. Ao
   * voltar à aba, `PremiacoesPage` publica um token novo e a contagem volta.
   */
  const [contagemPermitida] = React.useState(() => {
    try {
      return sessionStorage.getItem(CHAVE_KPI_CONTADO) !== acesso;
    } catch {
      return true;
    }
  });
  React.useEffect(() => {
    if (!contagemPermitida) return;
    try {
      sessionStorage.setItem(CHAVE_KPI_CONTADO, acesso);
    } catch {
      /* sessionStorage indisponível: mantém a contagem desta montagem */
    }
  }, [acesso, contagemPermitida]);
  // A contagem do Dashboard roda na primeira exibição. Depois que o usuário
  // altera qualquer parâmetro, os valores passam a atualizar diretamente —
  // sem reiniciar a entrada do card nem a contagem a cada arrasto.
  const contar = contagemPermitida && animarNumero && !reduzirMovimento;

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
        <span className="text-numeric">
          {contar ? (
            <AnimatedNumber value={valorSeguro} format={formato} duration={1} decimals={2} />
          ) : (
            formato(valorSeguro)
          )}
        </span>
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


/* ─── Animação das barras: cascata de baixo para cima ─────────────────────── */

/**
 * Cronologia da cascata: cada barra cresce em 900 ms e a Economia começa
 * 100 ms depois do Payout — as duas concluem juntas em ~1.000 ms.
 */
const BARRA_CRESCIMENTO_MS = 900;
const BARRA_INTERVALO_MS = 100;
const BARRA_TOTAL_MS = BARRA_CRESCIMENTO_MS + BARRA_INTERVALO_MS;

/** Rolagem precisa ficar parada esse tempo antes do disparo automático. */
const ESTABILIZACAO_ROLAGEM_MS = 350;
/**
 * Fração do gráfico visível para entrar (e para sair) — histerese.
 *
 * O limiar é alto de propósito: as BARRAS ficam na BASE do gráfico. Com o
 * limiar antigo (0,35) o disparo acontecia com o topo do card já na tela e as
 * barras ainda abaixo da dobra — a cascata rodava escondida.
 *
 * A checagem extra "base do contêiner dentro da viewport" foi REMOVIDA: ela
 * reprovava o caso normal em que o rodapé do card fica 20–40 px fora da tela
 * (as barras, porém, estão visíveis) e o controlador ficava re-tentando em
 * silêncio por 20 s com as barras em zero — a "animação invisível" relatada.
 * Com 60% do gráfico visível a área das barras já está na tela.
 */
const LIMIAR_ENTRADA = 0.6;
const LIMIAR_SAIDA = 0.05;

/** Ease-in-out senoidal usado no progresso visual das barras. */
const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;
const limitar01 = (valor: number) => Math.min(1, Math.max(0, valor));

/* ─── Evolução temporal: desenho progressivo das linhas ──────────────────── */

/**
 * Mais lento que as barras, como aprovado: cada linha leva 2.200 ms para ser
 * desenhada e a Economia começa 180 ms depois do Payout.
 */
const LINHA_DESENHO_MS = 2200;
const LINHA_INTERVALO_MS = 180;
const LINHA_TOTAL_MS = LINHA_DESENHO_MS + LINHA_INTERVALO_MS;

const COR_LINHA_PAYOUT = '#F59E0B';
const COR_LINHA_ECONOMIA = '#10B981';

/**
 * `cubic-bezier(0.45, 0, 0.55, 1)` resolvido por Newton-Raphson. É a mesma
 * curva suave do CSS, aplicada ao progresso calculado em JS (sem transição
 * por elemento, que atrasaria/engasgaria o desenho).
 */
function criarEasingBezier(x1: number, y1: number, x2: number, y2: number) {
  const componente = (t: number, a: number, b: number) =>
    3 * (1 - t) * (1 - t) * t * a + 3 * (1 - t) * t * t * b + t * t * t;
  return (x: number) => {
    let t = x;
    for (let i = 0; i < 5; i += 1) {
      const erro = componente(t, x1, x2) - x;
      const derivada = 3 * (1 - t) * (1 - t) * x1 + 6 * (1 - t) * t * (x2 - x1) + 3 * t * t * (1 - x2);
      if (Math.abs(derivada) < 1e-6) break;
      t = limitar01(t - erro / derivada);
    }
    return componente(t, y1, y2);
  };
}

const easeLinha = criarEasingBezier(0.45, 0, 0.55, 1);

/**
 * Área do gráfico REALMENTE visível, limitada pela viewport e pelo container
 * rolável mais próximo. É a confirmação feita no instante do disparo — o
 * IntersectionObserver só sinaliza a entrada.
 */
function medirAreaVisivel(elemento: HTMLElement) {
  if (typeof window === 'undefined') return null;
  const alvo = elemento.getBoundingClientRect();
  if (alvo.height <= 0 || alvo.width <= 0) return null;

  let topo = 0;
  let base = window.innerHeight;
  let pai = elemento.parentElement;
  while (pai && pai !== document.body) {
    const estilo = window.getComputedStyle(pai);
    if (/(auto|scroll)/.test(estilo.overflowY) && pai.scrollHeight > pai.clientHeight) {
      const caixa = pai.getBoundingClientRect();
      topo = Math.max(topo, caixa.top);
      base = Math.min(base, caixa.bottom);
      break;
    }
    pai = pai.parentElement;
  }

  const visivel = Math.max(0, Math.min(alvo.bottom, base) - Math.max(alvo.top, topo));
  return { alvo, topo, base, razao: limitar01(visivel / alvo.height) };
}

/**
 * O gráfico está visível o suficiente para a cascata ser VISTA?
 *
 * O IntersectionObserver só sinaliza a entrada; esta confirmação refaz a
 * medição no instante do disparo, depois da rolagem estabilizar.
 */
function graficoProntoParaAnimar(elemento: HTMLElement): boolean {
  const area = medirAreaVisivel(elemento);
  if (!area) return false;
  return area.razao >= LIMIAR_ENTRADA;
}

/**
 * Observa o próprio gráfico (não o card). Entra quando a área mínima está
 * visível e só sai abaixo de 5% — oscilações pequenas não reiniciam nada.
 */
function useGraficoVisivel(elemento: HTMLElement | null) {
  const [visivel, setVisivel] = React.useState(false);

  React.useEffect(() => {
    if (!elemento) {
      setVisivel(false);
      return;
    }

    let dentro = false;
    const aplicar = (razao: number) => {
      if (!dentro && razao >= LIMIAR_ENTRADA) dentro = true;
      else if (dentro && razao <= LIMIAR_SAIDA) dentro = false;
      setVisivel(dentro);
    };
    const observador = new IntersectionObserver(
      (entradas) => aplicar(entradas[0]?.intersectionRatio ?? 0),
      { threshold: [0, 0.05, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1] },
    );
    observador.observe(elemento);

    return () => observador.disconnect();
  }, [elemento]);

  return visivel;
}

/**
 * Barra do simulador — o Recharts calcula e renderiza a geometria final.
 *
 * A entrada é feita por variáveis CSS no contêiner (`.roi-grafico`), lidas pelo
 * `transform: scaleY(...)` desta barra — sem estado React por frame e sem
 * remontar o gráfico.
 */
function BarraCascata({
  index = 0,
  x = 0,
  y = 0,
  width = 0,
  height = 0,
  radius,
  fill,
  fillOpacity,
  stroke,
  strokeOpacity,
  strokeWidth,
}: BarShapeProps) {
  const testId = index === 0 ? 'roi-bar-payout' : 'roi-bar-economia';

  return (
    <Rectangle
      x={x}
      y={y}
      width={width}
      height={height}
      radius={radius}
      fill={fill}
      fillOpacity={fillOpacity}
      stroke={stroke}
      strokeOpacity={strokeOpacity}
      strokeWidth={strokeWidth}
      className="roi-barra"
      {...{ 'data-testid': testId }}
    />
  );
}


/* ─── Gráfico: tick de duas linhas e tooltip do tema ──────────────────────── */

function TickCategoria({
  x = 0,
  y = 0,
  payload,
}: {
  x?: number;
  y?: number;
  payload?: { value?: string | number };
}) {
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
      <p className="text-numeric text-sm font-semibold text-foreground">
        {formato(Number(payload[0].value ?? 0))}
      </p>
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
        <p
          key={String(p.dataKey)}
          className="text-numeric text-[11px] font-medium"
          style={{ color: p.color }}
        >
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
  { chave: 'performanceLevel', rotulo: 'Atingimento de meta', formato: percentual, tipo: 'pp', direcao: 'maior-melhor' },
  { chave: 'retentionImpact', rotulo: 'Redução de turnover', formato: percentual, tipo: 'pp', direcao: 'maior-melhor' },
  { chave: 'totalBudget', rotulo: 'Payout estimado', formato: moeda, tipo: 'moeda', direcao: 'menor-melhor' },
  { chave: 'savings', rotulo: 'Economia estimada', formato: moeda, tipo: 'moeda', direcao: 'maior-melhor' },
  { chave: 'resultadoLiquido', rotulo: 'Resultado líquido', formato: moeda, tipo: 'moeda', direcao: 'maior-melhor' },
  { chave: 'roi', rotulo: 'ROI', formato: multiplicador, tipo: 'percentual', direcao: 'maior-melhor' },
];

/** Padronização visual: toda a coluna Variação usa o verde oficial do Design System. */
const CLASSE_VARIACAO = 'text-success';

/** Variação do cenário comparado em relação ao cenário base (atual). */
function variacao(atual: number, base: number, tipo: LinhaTipo) {
  const delta = atual - base;
  if (tipo === 'pp') {
    return { texto: `${delta > 0 ? '+' : ''}${numero(delta, Number.isInteger(delta) ? 0 : 1)} p.p.`, valor: delta };
  }
  if (tipo === 'numero') {
    return { texto: `${delta > 0 ? '+' : ''}${numero(delta)}`, valor: delta };
  }
  if (!Number.isFinite(base) || base === 0) return { texto: '—', valor: 0 };
  const pctDelta = (delta / Math.abs(base)) * 100;
  if (Math.abs(pctDelta) < 0.05) return { texto: '0,0%', valor: 0 };
  return { texto: `${pctDelta > 0 ? '+' : ''}${percentual(pctDelta, 1)}`, valor: pctDelta };
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
  /**
   * `false` enquanto os KPIs ainda exibem a configuração inicial; a contagem
   * do Dashboard roda nessa primeira exibição. Qualquer alteração do usuário
   * (slider, digitação, cenário salvo ou reset) liga o modo direto, para os
   * números não voltarem a zero a cada mudança.
   */
  const [parametrosAlterados, setParametrosAlterados] = React.useState(false);

  /** Token publicado pela aba ao ativá-la; identifica este acesso ao Simulador. */
  const acessoKpi = React.useMemo(() => {
    try {
      return sessionStorage.getItem(CHAVE_ACESSO_KPI) ?? 'base';
    } catch {
      return 'base';
    }
  }, []);

  /** id do cenário salvo carregado; `base` = configuração em edição. */
  const [cenarioAtual, setCenarioAtual] = React.useState('base');
  /** Seleção da comparação; `null` = ainda não tocada (usa o mais recente). */
  const [comparados, setComparados] = React.useState<string[] | null>(null);
  const [verTodos, setVerTodos] = React.useState(false);
  /** Visão analítica da seção "2. Visualize o impacto". */
  const [visao, setVisao] = React.useState<VisaoImpacto>('financeira');

  /** O gráfico só anima quando está realmente visível na viewport. */
  const graficoRef = React.useRef<HTMLDivElement | null>(null);
  const [graficoBarrasEl, setGraficoBarrasEl] = React.useState<HTMLDivElement | null>(null);
  const registrarGrafico = React.useCallback((elemento: HTMLDivElement | null) => {
    graficoRef.current = elemento;
    setGraficoBarrasEl(elemento);
  }, []);
  const graficoVisivel = useGraficoVisivel(graficoBarrasEl);

  /**
   * Instante da última rolagem/redimensionamento. É global ao componente
   * (não nasce junto com o efeito de disparo): assim a entrada por rolagem
   * continua esperando os 350 ms de estabilização, enquanto a troca de visão
   * pelo seletor — sem rolagem — pode animar assim que o SVG monta.
   */
  const ultimaRolagemRef = React.useRef(0);
  React.useEffect(() => {
    const marcar = () => {
      ultimaRolagemRef.current = performance.now();
    };
    document.addEventListener('scroll', marcar, true);
    window.addEventListener('resize', marcar);
    return () => {
      document.removeEventListener('scroll', marcar, true);
      window.removeEventListener('resize', marcar);
    };
  }, []);

  /**
   * A entrada do card do gráfico (cascata do Dashboard) precisa terminar antes
   * de a animação INTERNA (barras/linhas) começar. Sem isso, a cascata e o
   * crescimento disputavam o mesmo intervalo e o gráfico animava "escondido".
   */
  const [entradaGraficoConcluida, setEntradaGraficoConcluida] = React.useState(false);
  const emAndamentoRef = React.useRef(false);
  const autoExecutadoRef = React.useRef(false);
  const timerAutomatico = React.useRef<number | null>(null);
  const quadroAnimacao = React.useRef<number | null>(null);

  const definirCascata = React.useCallback((payout: number, economia: number, rotulos: number) => {
    const elemento = graficoRef.current;
    if (!elemento) return;
    elemento.style.setProperty('--roi-payout-scale', payout.toFixed(4));
    elemento.style.setProperty('--roi-economia-scale', economia.toFixed(4));
    elemento.style.setProperty('--roi-rotulos-opacity', rotulos.toFixed(3));
  }, []);

  /**
   * Progresso do desenho das linhas (0 → 1), também em variáveis CSS no
   * contêiner: paths recriados pelo Recharts herdam o estado atual e não há
   * render React por frame.
   *
   * As linhas usam `pathLength={1}` no SVG, então `stroke-dashoffset` é
   * `1 - progresso` (sem medir comprimento e imune a redimensionamentos).
   */
  const definirLinhas = React.useCallback((payout: number, economia: number) => {
    const elemento = graficoRef.current;
    if (!elemento) return;
    elemento.style.setProperty('--roi-linha-payout-offset', (1 - payout).toFixed(4));
    elemento.style.setProperty('--roi-linha-economia-offset', (1 - economia).toFixed(4));
    elemento.style.setProperty('--roi-linha-payout-revelado', payout.toFixed(4));
    elemento.style.setProperty('--roi-linha-economia-revelado', economia.toFixed(4));
  }, []);

  /**
   * Cada ponto deve aparecer quando a PONTA do traço o alcança. Como o desenho
   * avança por comprimento de arco (`stroke-dashoffset`), a fração de cada
   * ponto é medida no próprio path (`getPointAtLength`), não pelo índice.
   *
   * O valor vai para o CSS var `--roi-ponto-fracao` do <circle>. Se o Recharts
   * remontar os pontos no meio da animação, a próxima passagem recalcula.
   */
  const medirFracoesPontos = React.useCallback((alvo: HTMLElement, forcar = false) => {
    const series = [
      { sufixo: 'payout', seletor: '.roi-area-payout .recharts-area-curve' },
      { sufixo: 'economia', seletor: '.roi-area-economia .recharts-area-curve' },
    ] as const;

    for (const { sufixo, seletor } of series) {
      const pontos = Array.from(alvo.querySelectorAll<SVGCircleElement>(`.roi-ponto-${sufixo}`));
      if (!pontos.length) continue;
      if (!forcar && pontos.every((ponto) => ponto.style.getPropertyValue('--roi-ponto-fracao'))) {
        continue;
      }
      const caminho = alvo.querySelector<SVGPathElement>(seletor);
      if (!caminho) continue;
      const total = caminho.getTotalLength();
      if (!Number.isFinite(total) || total <= 0) continue;

      const passos = 160;
      const xs: number[] = [];
      for (let i = 0; i <= passos; i += 1) {
        xs.push(caminho.getPointAtLength((total * i) / passos).x);
      }

      for (const ponto of pontos) {
        const cx = Number(ponto.getAttribute('cx'));
        if (!Number.isFinite(cx)) continue;
        let indice = xs.findIndex((x) => x >= cx);
        if (indice < 0) indice = passos;
        ponto.style.setProperty('--roi-ponto-fracao', (indice / passos).toFixed(4));
      }
    }
  }, []);

  /**
   * Cancela SOMENTE a execução/preparação em curso. Nunca mexe nas alturas:
   * quem decide a altura final é sempre a função de reprodução.
   */
  const cancelarAnimacaoROI = React.useCallback(() => {
    if (timerAutomatico.current !== null) {
      window.clearTimeout(timerAutomatico.current);
      timerAutomatico.current = null;
    }
    if (quadroAnimacao.current !== null) {
      cancelAnimationFrame(quadroAnimacao.current);
      quadroAnimacao.current = null;
    }
    emAndamentoRef.current = false;
  }, []);

  /**
   * Função ÚNICA de reprodução — chamada pelo disparo automático. Sempre parte
   * do zero, pinta esse zero antes de crescer e termina nas alturas finais
   * (nunca deixa a barra em 0).
   *
   * Não há variante "sem animação": os dois gatilhos executam exatamente este
   * caminho. A preferência de movimento reduzido NÃO é consultada aqui — ela
   * transformava a entrada automática em um salto direto para a altura final,
   * que era justamente a animação "invisível" no uso normal. O próprio repo
   * já força movimento completo em desenvolvimento (`lib/motionMode`).
   */
  const reproduzirAnimacaoROI = React.useCallback(() => {
    const alvo = graficoRef.current;
    if (!alvo || !alvo.isConnected) return;

    // 1 · nenhuma execução anterior sobrevive (rAF e timer).
    cancelarAnimacaoROI();
    emAndamentoRef.current = true;

    // 2 · progresso das duas barras em zero.
    definirCascata(0, 0, 0);

    // 3 · dois quadros: um para o zero ser pintado, outro para começar a contar.
    quadroAnimacao.current = requestAnimationFrame(() => {
      if (!emAndamentoRef.current) return;
      // Força o navegador a aplicar/pintar o estado inicial antes do passo 1.
      void alvo.getBoundingClientRect();
      void window.getComputedStyle(alvo).getPropertyValue('--roi-payout-scale');

      quadroAnimacao.current = requestAnimationFrame(() => {
        if (!emAndamentoRef.current) return;
        const inicio = performance.now();

        const passo = (agora: number) => {
          if (!emAndamentoRef.current) return;
          // O gráfico foi remontado (troca de visão): esta execução morreu.
          if (graficoRef.current !== alvo) {
            emAndamentoRef.current = false;
            quadroAnimacao.current = null;
            return;
          }
          const decorrido = Math.max(0, agora - inicio);
          const progressoPayout = limitar01(decorrido / BARRA_CRESCIMENTO_MS);
          const progressoEconomia = limitar01((decorrido - BARRA_INTERVALO_MS) / BARRA_CRESCIMENTO_MS);

          definirCascata(
            easeInOutSine(progressoPayout),
            easeInOutSine(progressoEconomia),
            progressoEconomia >= 1 ? 1 : 0
          );

          if (decorrido < BARRA_TOTAL_MS) {
            // 4 · Payout imediato, Economia 100 ms depois — fim em ~1.000 ms.
            quadroAnimacao.current = requestAnimationFrame(passo);
            return;
          }

          // 5 · alturas finais preservadas.
          definirCascata(1, 1, 1);
          quadroAnimacao.current = null;
          emAndamentoRef.current = false;
        };

        quadroAnimacao.current = requestAnimationFrame(passo);
      });
    });
  }, [cancelarAnimacaoROI, definirCascata]);

  /**
   * Evolução temporal — desenho das linhas da esquerda para a direita.
   *
   * Mesmo controlador (rAF, estado e cancelamento) das barras, mas o progresso
   * vai para as variáveis CSS das linhas/áreas. O Payout desenha em 2.200 ms;
   * a Economia começa 180 ms depois. Nenhum render React por frame.
   */
  const reproduzirAnimacaoTemporal = React.useCallback(() => {
    const alvo = graficoRef.current;
    if (!alvo || !alvo.isConnected) return;

    const caminhos = alvo.querySelectorAll(
      '.roi-area-payout .recharts-area-curve, .roi-area-economia .recharts-area-curve'
    );
    if (caminhos.length < 2) return;

    // 1 · nenhuma execução anterior sobrevive (rAF e timer).
    cancelarAnimacaoROI();
    emAndamentoRef.current = true;

    // 2 · estado inicial: linhas recolhidas, áreas sem preenchimento e pontos
    //     ainda ocultos. Recalcula a fração de arco de cada ponto.
    alvo
      .querySelectorAll<SVGCircleElement>('.roi-ponto')
      .forEach((ponto) => ponto.style.removeProperty('--roi-ponto-fracao'));
    definirLinhas(0, 0);
    medirFracoesPontos(alvo, true);

    // 3 · dois quadros para o estado inicial ser efetivamente pintado.
    quadroAnimacao.current = requestAnimationFrame(() => {
      if (!emAndamentoRef.current) return;
      void alvo.getBoundingClientRect();
      void window.getComputedStyle(alvo).getPropertyValue('--roi-linha-payout-offset');

      quadroAnimacao.current = requestAnimationFrame(() => {
        if (!emAndamentoRef.current) return;
        const inicio = performance.now();

        const passo = (agora: number) => {
          if (!emAndamentoRef.current) return;
          // O gráfico foi remontado (troca de visão): esta execução morreu.
          if (graficoRef.current !== alvo) {
            emAndamentoRef.current = false;
            quadroAnimacao.current = null;
            return;
          }
          const decorrido = Math.max(0, agora - inicio);
          const progressoPayout = limitar01(decorrido / LINHA_DESENHO_MS);
          const progressoEconomia = limitar01((decorrido - LINHA_INTERVALO_MS) / LINHA_DESENHO_MS);

          definirLinhas(easeLinha(progressoPayout), easeLinha(progressoEconomia));
          // Só faz trabalho se algum ponto foi recriado sem a fração.
          medirFracoesPontos(alvo);

          if (decorrido < LINHA_TOTAL_MS) {
            quadroAnimacao.current = requestAnimationFrame(passo);
            return;
          }

          // 4 · linhas e áreas inteiras; pontos com fração <= 1 visíveis.
          definirLinhas(1, 1);
          quadroAnimacao.current = null;
          emAndamentoRef.current = false;
        };

        quadroAnimacao.current = requestAnimationFrame(passo);
      });
    });
  }, [cancelarAnimacaoROI, definirLinhas, medirFracoesPontos]);

  /** Entrada única do disparo automático, conforme a visão atual. */
  const reproduzirAnimacaoVisaoAtual = React.useCallback(() => {
    if (visao === 'temporal') reproduzirAnimacaoTemporal();
    else reproduzirAnimacaoROI();
  }, [visao, reproduzirAnimacaoTemporal, reproduzirAnimacaoROI]);

  /**
   * Cada troca de visão remonta o contêiner (`key={visao}`). Qualquer execução
   * anterior morre aqui e o novo gráfico começa do zero, com o disparo
   * automático rearmado — inclusive ao voltar para uma visão já acessada.
   *
   * Este efeito só depende do elemento e da visão: hover, tooltip ou qualquer
   * outro render comum não reinicia a animação.
   */
  React.useEffect(() => {
    if (!graficoBarrasEl) return;
    cancelarAnimacaoROI();
    autoExecutadoRef.current = false;
    if (visao === 'temporal') {
      definirLinhas(0, 0);
    } else {
      definirCascata(0, 0, 0);
    }
    // O conteúdo do gráfico foi remontado (troca de visão): a cascata de
    // entrada recomeça (reset feito no onValueChange do seletor) e a animação
    // interna espera o card terminar de entrar.
  }, [graficoBarrasEl, visao, cancelarAnimacaoROI, definirCascata, definirLinhas]);

  /**
   * Disparo automático. O IntersectionObserver apenas sinaliza a entrada: a
   * animação só começa depois que a rolagem estabiliza (350 ms), reconfirmando
   * que o gráfico continua visível e que os elementos SVG da visão atual já
   * estão montados.
   *
   * Trocar a visão pelo seletor não é rolagem: a espera já está vencida e a
   * animação começa assim que o novo gráfico monta.
   *
   * No máximo uma vez por entrada — oscilações do observador NÃO cancelam uma
   * animação em andamento (o observer nunca toca em rAF/progresso aqui).
   */
  React.useEffect(() => {
    if (!graficoBarrasEl) return;

    if (!graficoVisivel) {
      // A visibilidade só decide QUANDO tentar. Sair da viewport não rearma a
      // animação: o controle de execução é resetado apenas quando a visão
      // muda (nova seleção), nunca por rolagem/redimensionamento.
      return;
    }
    // A cascata de entrada do card do gráfico termina primeiro; só então a
    // animação interna (barras/linhas) pode começar.
    if (!entradaGraficoConcluida) return;
    if (emAndamentoRef.current || autoExecutadoRef.current) return;

    let cancelado = false;
    let tentativas = 0;
    /** Só a espera pela montagem do SVG é re-tentada (~2,4 s no máximo). */
    const TENTATIVAS_MAX = 16;

    const limparTimer = () => {
      if (timerAutomatico.current !== null) {
        window.clearTimeout(timerAutomatico.current);
        timerAutomatico.current = null;
      }
    };

    const reagendar = (atraso: number) => {
      if (cancelado || tentativas >= TENTATIVAS_MAX) return;
      tentativas += 1;
      timerAutomatico.current = window.setTimeout(iniciar, atraso);
    };

    const iniciar = () => {
      timerAutomatico.current = null;
      if (cancelado || emAndamentoRef.current || autoExecutadoRef.current) return;

      const alvo = graficoRef.current;
      if (!alvo || !alvo.isConnected) return;

      // 2 · o gráfico continua visível neste instante? Se a rolagem seguiu
      // para longe, não insiste: o próximo evento de scroll reagenda.
      if (!graficoProntoParaAnimar(alvo)) return;

      // 3 · os elementos do gráfico da visão atual já estão montados?
      const seletor =
        visao === 'temporal'
          ? '.roi-area-payout .recharts-area-curve, .roi-area-economia .recharts-area-curve'
          : '[data-testid="roi-bar-payout"], [data-testid="roi-bar-economia"]';
      if (alvo.querySelectorAll(seletor).length < 2) {
        reagendar(150);
        return;
      }

      // 4 e 5 · marca ANTES de iniciar (evita disparo simultâneo) e usa a
      // mesma função de reprodução da visão atual.
      autoExecutadoRef.current = true;
      reproduzirAnimacaoVisaoAtual();
    };

    const agendar = () => {
      if (cancelado || emAndamentoRef.current || autoExecutadoRef.current) return;
      limparTimer();
      // 1 · aguarda a rolagem estabilizar antes de confirmar a visibilidade.
      const espera = Math.max(0, ESTABILIZACAO_ROLAGEM_MS - (performance.now() - ultimaRolagemRef.current));
      timerAutomatico.current = window.setTimeout(iniciar, espera);
    };

    const aoRolar = () => {
      ultimaRolagemRef.current = performance.now();
      agendar();
    };

    agendar();
    document.addEventListener('scroll', aoRolar, true);
    window.addEventListener('resize', aoRolar);

    return () => {
      cancelado = true;
      limparTimer();
      document.removeEventListener('scroll', aoRolar, true);
      window.removeEventListener('resize', aoRolar);
    };
  }, [graficoVisivel, visao, graficoBarrasEl, entradaGraficoConcluida, reproduzirAnimacaoVisaoAtual]);

  React.useEffect(() => () => cancelarAnimacaoROI(), [cancelarAnimacaoROI]);

  const { data: scenarios = [] } = useQuery<CenarioRoi[]>({
    queryKey: ['premiacoes_cenarios_roi', empresaId],
    // MOCK VISUAL — ver src/mocks/premiacoesMock.ts.
    queryFn: async (): Promise<CenarioRoi[]> =>
      (getMockCenariosRoi() as CenarioRoi[] | undefined) ?? (await premiacoesService.listarCenariosROI(empresaId)),
    enabled: !!empresaId || isPremiacoesMockEnabled(),
  });

  const saveMutation = useMutation({
    mutationFn: (cenario: Record<string, unknown>) => {
      // MOCK VISUAL — aborta a escrita no modo demonstração.
      if (bloquearEscritaPremiacoes('Salvar cenário de ROI')) return Promise.reject(new Error('mock'));
      return premiacoesService.salvarCenarioROI(cenario, empresaId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['premiacoes_cenarios_roi', empresaId] });
      toast.success('Cenário salvo com sucesso.');
    },
    onError: (erro) => {
      if ((erro as Error)?.message !== 'mock') toast.error('Não foi possível salvar o cenário.');
    },
  });

  const metricas = calcularMetricas({
    employees,
    avgSalary,
    bonusPercent,
    performanceLevel,
    retentionImpact,
  });
  const { totalBudget, savings, roi, resultadoLiquido } = metricas;
  const positivo = resultadoLiquido >= 0;

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
    setParametrosAlterados(true);
    setters[chave](valor);
    setCenarioAtual('base');
  };

  const resetarBase = () => {
    setParametrosAlterados(true);
    setEmployees(BASE.employees);
    setAvgSalary(BASE.avgSalary);
    setBonusPercent(BASE.bonusPercent);
    setPerformanceLevel(BASE.performanceLevel);
    setRetentionImpact(BASE.retentionImpact);
    setCenarioAtual('base');
  };

  /** Carrega os parâmetros de um cenário salvo (operação real do serviço). */
  const aplicarCenario = (s: CenarioRoi) => {
    const c = s.configuracoes;
    if (!c) return;
    setParametrosAlterados(true);
    setEmployees(Number(c.employees));
    setAvgSalary(Number(c.avgSalary));
    setBonusPercent(Number(c.bonusPercent));
    setPerformanceLevel(Number(c.performanceLevel));
    setRetentionImpact(Number(c.retentionImpact));
    setCenarioAtual(s.id);
    toast.info(`Cenário "${nomeDoCenario(s)}" carregado.`);
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

  const saveScenario = () => {
    saveMutation.mutate({
      name: `Cenário ${scenarios.length + 1}`,
      employees,
      avgSalary,
      bonusPercent,
      performanceLevel,
      retentionImpact,
      totalBudget,
      savings,
      roi,
    });
  };

  const cenariosSelecionados = selecionados
    .map((id) => scenarios.find((s) => s.id === id))
    .filter((s): s is CenarioRoi => Boolean(s));

  const valorDoCenario = (s: CenarioRoi, chave: LinhaChave): number => {
    if (chave in s.configuracoes) return Number(s.configuracoes[chave as ParametroChave]);
    if (chave === 'totalBudget') return Number(s.resultados.totalBudget);
    if (chave === 'savings') return Number(s.resultados.savings);
    if (chave === 'roi') return Number(s.resultados.roi);
    return Number(s.resultados.savings) - Number(s.resultados.totalBudget);
  };

  const visiveis = verTodos ? scenarios : scenarios.slice(0, 3);

  /* ─── Dados das quatro visões (seção 2) ─────────────────────────────────── */

  const serieTemporal = montarSerieTemporal(scenarios, { metricas });
  const primeiroSalvo = serieTemporal.find((p) => !p.atual) ?? null;
  const variacaoEconomia = primeiroSalvo ? variacaoPercentual(savings, primeiroSalvo.economia) : null;

  const dadosFinanceiros = [
    { nome: 'Payout|Investimento', valor: totalBudget, cor: 'hsl(var(--warning))', contorno: '#F59E0B' },
    { nome: 'Economia|Redução de turnover', valor: savings, cor: 'hsl(var(--success))', contorno: '#10B981' },
  ];
  const dadosRetencao = [
    { nome: 'Elegíveis|Colaboradores', valor: employees, cor: 'hsl(var(--info))', contorno: 'hsl(var(--info))' },
    {
      nome: 'Retidos|Pela redução de turnover',
      valor: metricas.retidos,
      cor: 'hsl(var(--success))',
      contorno: '#10B981',
    },
  ];
  const dadosColaborador = [
    {
      nome: 'Payout|Por colaborador',
      valor: metricas.payoutPorColaborador,
      cor: 'hsl(var(--warning))',
      contorno: '#F59E0B',
    },
    {
      nome: 'Economia|Por colaborador',
      valor: metricas.economiaPorColaborador,
      cor: 'hsl(var(--success))',
      contorno: '#10B981',
    },
  ];
  const dadosBarras = visao === 'retencao' ? dadosRetencao : visao === 'colaborador' ? dadosColaborador : dadosFinanceiros;

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
            { cor: 'bg-warning', rotulo: 'Custo por retido', valor: moeda(metricas.custoPorRetido) },
          ],
          nota: 'Premissa: 15% de turnover e 3 salários por reposição; a redução configurada incide sobre esse total.',
        }
      : visao === 'temporal'
        ? {
            titulo: 'Resumo temporal',
            linhas: [
              { cor: 'bg-info', rotulo: 'Cenários salvos', valor: numero(scenarios.length) },
              { cor: 'bg-warning', rotulo: 'Payout atual', valor: moeda(totalBudget) },
              { cor: 'bg-success', rotulo: 'Economia atual', valor: moeda(savings) },
              {
                cor: variacaoEconomia !== null && variacaoEconomia < 0 ? 'bg-destructive' : 'bg-success',
                rotulo: 'Variação da economia',
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
                { cor: 'bg-warning', rotulo: 'Payout por colaborador', valor: moeda(metricas.payoutPorColaborador) },
                { cor: 'bg-success', rotulo: 'Economia por colaborador', valor: moeda(metricas.economiaPorColaborador) },
                {
                  cor: metricas.resultadoPorColaborador >= 0 ? 'bg-info' : 'bg-destructive',
                  rotulo: 'Resultado por colaborador',
                  valor: moeda(metricas.resultadoPorColaborador),
                },
                { cor: 'bg-xp', rotulo: 'Retorno por R$ 1,00', valor: multiplicador(roi) },
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
                { cor: 'bg-xp', rotulo: 'ROI (eficiência)', valor: multiplicador(roi) },
              ],
              nota: 'A economia é o custo de reposição (3 salários × 15% do quadro) multiplicado pela redução de turnover.',
            };

  /** Valor do cenário BASE (configuração em edição) para cada linha da tabela. */
  const valorBase = (chave: LinhaChave): number => {
    if (chave in valores) return valores[chave as ParametroChave];
    if (chave === 'totalBudget') return totalBudget;
    if (chave === 'savings') return savings;
    if (chave === 'roi') return roi;
    return resultadoLiquido;
  };

  /** Linhas formatadas — a comparação só apresenta; cálculo continua no pai. */
  const linhasComparadas: LinhaComparacao[] = LINHAS.map((linha) => {
    const base = valorBase(linha.chave);
    const ultimo = cenariosSelecionados[cenariosSelecionados.length - 1];
    const alvo = ultimo ? valorDoCenario(ultimo, linha.chave) : 0;
    const variacaoLinha = variacao(alvo, base, linha.tipo);
    return {
      chave: linha.chave,
      rotulo: linha.rotulo,
      base: linha.formato(base),
      selecionados: cenariosSelecionados.map((s) => ({
        id: s.id,
        nome: nomeDoCenario(s),
        valor: linha.formato(valorDoCenario(s, linha.chave)),
      })),
      variacao: variacaoLinha.texto,
      corVariacao: CLASSE_VARIACAO,
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
                animarNumero={!parametrosAlterados}
                acesso={acessoKpi}
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
                animarNumero={!parametrosAlterados}
                acesso={acessoKpi}
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
                animarNumero={!parametrosAlterados}
                acesso={acessoKpi}
                valorClasse={positivo ? 'text-success' : 'text-destructive'}
                descricao="Economia estimada − payout estimado"
                Icone={Wallet}
                caixa={positivo ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}
                tooltip="Resultado líquido = economia estimada − payout estimado."
                indice={3}
              />
              <KpiResultado
                titulo="ROI estimado"
                valor={roi}
                formato={multiplicador}
                animarNumero={!parametrosAlterados}
                acesso={acessoKpi}
                valorClasse="text-xp"
                descricao="Retorno sobre o investimento"
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
                  : 'border-[rgba(255,59,77,0.4)] bg-[rgba(255,59,77,0.1)] font-medium text-[#FF3B4D]',
              )}
            >
              <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <p>
                {totalBudget <= 0
                  ? 'Sem payout previsto, não há retorno sobre investimento a calcular.'
                  : positivo
                    ? `Para cada R$ 1,00 investido, a economia estimada é de R$ ${numero(roi, 2)}.`
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
                <Select
                  value={visao}
                  onValueChange={(v) => {
                    // Nova visão: a cascata do conteúdo remontado precisa
                    // terminar antes de a animação interna começar.
                    setEntradaGraficoConcluida(false);
                    setVisao(v as VisaoImpacto);
                  }}
                >
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

            {/* A `key` é SOMENTE do conteúdo do gráfico (transição entre
                visualizações, Tipo B). O card principal acima não é remontado,
                então a entrada dos cards (Tipo A) não reinicia ao trocar a
                visão — apenas a animação interna da nova visualização toca. */}
            <motion.div
              key={visao}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="mt-4 grid min-w-0 flex-1 grid-cols-1 items-stretch gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]"
            >
              <motion.div
                {...entradaSimulador(2)}
                onAnimationComplete={() => setEntradaGraficoConcluida(true)}
                className="flex min-w-0 flex-col rounded-xl border border-border/30 bg-background/30 p-2.5"
              >
                <div
                  ref={registrarGrafico}
                  className="roi-grafico relative min-h-[250px] w-full min-w-0 flex-1"
                >
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
                          isAnimationActive={false}
                          className="roi-area-payout"
                          dot={{
                            r: 2.5,
                            strokeWidth: 0,
                            fill: COR_LINHA_PAYOUT,
                            className: 'roi-ponto roi-ponto-payout',
                          }}
                          activeDot={{ r: 4 }}
                          {...{ pathLength: 1 }}
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
                          isAnimationActive={false}
                          className="roi-area-economia"
                          dot={{
                            r: 2.5,
                            strokeWidth: 0,
                            fill: COR_LINHA_ECONOMIA,
                            className: 'roi-ponto roi-ponto-economia',
                          }}
                          activeDot={{ r: 4 }}
                          {...{ pathLength: 1 }}
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
                        <Bar
                          dataKey="valor"
                          radius={[6, 6, 0, 0]}
                          maxBarSize={120}
                          shape={(props) => <BarraCascata {...props} />}
                          isAnimationActive={false}
                        >
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
                            style={{
                              fontSize: 10.5,
                              fontWeight: 600,
                              fill: 'hsl(var(--foreground))',
                            }}
                          />
                        </Bar>
                      </BarChart>
                    )}
                    </ResponsiveContainer>
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
            </motion.div>
          </motion.section>

          {/* ─── 3 · COMPARE CENÁRIOS ─────────────────────────────────────── */}
          <motion.section {...entradaSimulador(3)} className={CARTAO}>
            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <CabecalhoSecao
                  numero="3"
                  titulo="Compare cenários"
                  subtitulo="Analise diferentes estratégias lado a lado."
                  Icone={Scale}
                  indice={0}
                />
              </div>
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
                              marcado ? 'border-primary bg-primary text-primary-foreground' : 'border-border',
                            )}
                          >
                            {marcado && <Check className="h-2.5 w-2.5" />}
                          </span>
                          <span className="truncate">{nomeDoCenario(s)}</span>
                        </DropdownMenuItem>
                      );
                    })}
                    {scenarios.length === 0 && (
                      <p className="px-2 py-2 text-[11px] text-muted-foreground">Nenhum cenário salvo ainda.</p>
                    )}
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
                <motion.p
                  {...entradaSimulador(6)}
                  className="mt-2 text-[9px] leading-snug text-muted-foreground"
                >
                  Variação de <strong>{nomeDoCenario(cenariosSelecionados[cenariosSelecionados.length - 1])}</strong>{' '}
                  em relação ao cenário base em edição.
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
                  ROI {multiplicador(roi)}
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
                    {moeda(Number(s.resultados.totalBudget))}
                  </p>
                  <Badge
                    variant="outline"
                    className="h-4 shrink-0 border-success/25 bg-success/10 px-1.5 text-[8.5px] text-success"
                  >
                    ROI {multiplicador(Number(s.resultados.roi))}
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
                  </DropdownMenuContent>
                </DropdownMenu>
              </motion.div>
            ))}

            {scenarios.length === 0 && (
              <motion.div
                {...entradaSimulador(3)}
                className="flex min-h-[88px] flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border/50 bg-muted/10 p-3 text-center sm:col-span-1 xl:col-span-2"
              >
                <p className="text-[11px] font-medium">Nenhum cenário salvo ainda</p>
                <p className="text-[9.5px] text-muted-foreground">Ajuste os parâmetros e clique em “Salvar cenário”.</p>
              </motion.div>
            )}
          </div>
        </motion.section>
      </div>
    </EntradaPresenca>
  );
}
