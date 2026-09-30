/**
 * Dashboard da área de Admissões (aba "Dashboard").
 *
 * Estrutura em três faixas, seguindo a linguagem visual do restante do produto:
 *   1. KPIs  — `MetricCard` (mesmo card do Dashboard principal: ícone circular,
 *              título, valor em destaque e linha de apoio com indicador +
 *              frase completa, sem micro gráfico no canto direito);
 *   2. Analítico — dois painéis com cabeçalho próprio, subtítulo contextual e
 *              seletor de período (tempo médio de admissão + funil por etapa);
 *   3. Widgets — quatro painéis escaneáveis (ações prioritárias, próximas
 *              admissões, distribuição por área e SLA & alertas).
 *
 * Nada aqui usa cor/ícone/fonte fora do design system: só tokens (`primary`,
 * `info`, `success`, `warning`, `destructive`, `muted`), ícones `lucide-react`
 * já presentes no produto e as fontes `font-display` / `font-body`.
 */
import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MetricCard, cardVariants } from '@/components/dashboard/MetricCard';
import { DonutChart } from '@/components/dashboard/DonutChart';
import { donutColors } from '@/components/dashboard/analytics/widgets';
import { cn } from '@/lib/utils';
import { formatDate } from '@/utils/format';
import { AnimatePresence, motion } from 'framer-motion';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  CalendarClock,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  FileText,
  Gauge,
  ListTodo,
  PieChart,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  UserPlus,
  Zap,
} from 'lucide-react';
// MOCK VISUAL — ver src/mocks/admissoesMock.ts
import { isAdmissoesMockEnabled, MOCK_TEMPO_MEDIO_ADMISSAO } from '@/mocks/admissoesMock';

/** Registro mínimo que este dashboard lê (admissão real ou fictícia). */
type AdmissaoLike = {
  id?: string | number;
  nome?: string | null;
  cargo?: string | null;
  departamento?: string | null;
  etapa?: string | null;
  data_prevista?: string | null;
  created_at?: string | null;
};

type Tone = 'primary' | 'info' | 'success' | 'warning' | 'destructive';

const DIA_MS = 24 * 60 * 60 * 1000;

/** Rótulos de etapa — mesma nomenclatura usada nas demais abas do módulo. */
const ETAPA_LABELS: Record<string, string> = {
  solicitacao: 'Solicitação',
  documentos: 'Docs Pendentes',
  validacao: 'Em Validação',
  pendente: 'Pendente',
  exame: 'Exame',
  contrato: 'Contrato',
  assinatura: 'Assinatura',
  esocial: 'eSocial',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
};

/** Badge de etapa (ações prioritárias / próximas admissões). */
const ETAPA_BADGE: Record<string, string> = {
  solicitacao: 'bg-muted/60 text-muted-foreground',
  documentos: 'bg-warning/15 text-warning',
  validacao: 'bg-info/15 text-info',
  pendente: 'bg-warning/15 text-warning',
  exame: 'bg-warning/15 text-warning',
  contrato: 'bg-info/15 text-info',
  assinatura: 'bg-primary/15 text-primary',
  esocial: 'bg-primary/15 text-primary',
  concluida: 'bg-success/15 text-success',
  cancelada: 'bg-destructive/15 text-destructive',
};

/** Chip de ícone colorido e tinta de texto por tom semântico. */
const TONE_CHIP: Record<Tone, string> = {
  primary: 'bg-primary/10 text-primary',
  info: 'bg-info/10 text-info',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  destructive: 'bg-destructive/10 text-destructive',
};

const TONE_TEXT: Record<Tone, string> = {
  primary: 'text-primary',
  info: 'text-info',
  success: 'text-success',
  warning: 'text-warning',
  destructive: 'text-destructive',
};

/* ─── Derivações puras (mesma entrada → mesma saída) ──────────────────────── */

function dataValida(valor?: string | null): Date | null {
  if (!valor) return null;
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? null : data;
}

/** Início do dia (comparações por data, sem ruído de hora). */
function inicioDoDia(referencia: Date): number {
  return new Date(referencia.getFullYear(), referencia.getMonth(), referencia.getDate()).getTime();
}

/**
 * Recorte por período sobre `created_at`. Registros sem a coluna são mantidos
 * (não há como recortá-los) — no payload real a coluna sempre existe.
 */
function recortarPorPeriodo<T extends AdmissaoLike>(lista: T[], meses: number, agora: Date): T[] {
  if (!meses) return lista;
  const limite = new Date(agora.getFullYear(), agora.getMonth() - meses, agora.getDate()).getTime();
  return lista.filter((item) => {
    const data = dataValida(item.created_at);
    return data ? data.getTime() >= limite : true;
  });
}

/** Contagem por etapa em ordem decrescente — leitura de funil. */
function contarPorEtapa(lista: AdmissaoLike[]) {
  return Object.entries(ETAPA_LABELS)
    .map(([etapa, label]) => ({ etapa, label, total: lista.filter((a) => a.etapa === etapa).length }))
    .filter((item) => item.total > 0)
    .sort((a, b) => b.total - a.total);
}

/**
 * Variação percentual dos últimos 30 dias contra os 30 anteriores.
 * Sem base anterior (`0`) não existe comparação honesta → `undefined`, e o card
 * mostra o texto de apoio em vez de um número inventado.
 */
function variacaoDePeriodo(lista: AdmissaoLike[], agora: Date): { value: number; label: string } | undefined {
  const fim = agora.getTime();
  const inicioAtual = fim - 30 * DIA_MS;
  const inicioAnterior = inicioAtual - 30 * DIA_MS;

  let atual = 0;
  let anterior = 0;
  lista.forEach((item) => {
    const data = dataValida(item.created_at);
    if (!data) return;
    const t = data.getTime();
    if (t >= inicioAtual && t < fim) atual += 1;
    else if (t >= inicioAnterior && t < inicioAtual) anterior += 1;
  });

  if (anterior === 0) return undefined;
  return { value: Math.round(((atual - anterior) / anterior) * 100), label: 'vs. período anterior' };
}

/** Iniciais do candidato (avatar textual dos widgets). */
function iniciais(nome?: string | null): string {
  if (!nome) return '—';
  const partes = nome.trim().split(/\s+/);
  const primeira = partes[0]?.[0] ?? '';
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : '';
  return `${primeira}${ultima}`.toUpperCase() || '—';
}

function percentual(parcial: number, total: number): number {
  return total > 0 ? Math.round((parcial / total) * 100) : 0;
}

/* ─── Blocos de UI compartilhados ─────────────────────────────────────────── */

/**
 * Mesma animação de entrada dos KPI Cards do Dashboard Executivo: fade + subida
 * de 20px, stagger de 0.08s por índice e 0.4s de duração — reaproveitada via
 * `cardVariants` IMPORTADO de `dashboard/MetricCard.tsx` (não uma cópia), para
 * que os cards de Admissões nunca divirjam da referência. O `motion.create(Card)`
 * é o mesmo padrão usado lá (`DashboardExecutivoPage.tsx`): a Motion entra no
 * PRÓPRIO nó do card, sem wrapper novo — nada de `div` a mais entre a grade e o
 * casco, então layout, largura, altura, cores e o scroll interno seguem
 * exatamente os de antes.
 */
const MotionCard = motion.create(Card);

/**
 * Painel de conteúdo da área de Admissões: cabeçalho com chip de ícone, título,
 * subtítulo contextual e ação no canto direito. É o mesmo casco para os dois
 * painéis analíticos e para os quatro widgets — o que garante consistência
 * entre eles.
 *
 * `index` é a posição do card na ordem de leitura da tela: é o `custom` que o
 * `cardVariants` usa para o atraso da cascata (KPIs 0-3 → analíticos 4-5 →
 * widgets 6-9). Ele NÃO muda o casco nem a grade — só o `delay` da entrada.
 */
function PanelCard({
  icon: Icon,
  title,
  subtitle,
  action,
  children,
  className,
  contentClassName,
  compact = false,
  /**
   * Cabeçalho em duas linhas: (chip + título + ação) na primeira e subtítulo de
   * largura total na segunda — evita título/subtítulo quebrando em card estreito.
   */
  headerStacked = false,
  index = 0,
}: {
  icon: React.ElementType;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  /**
   * Casco denso: mesmo desenho, com paddings, chip e título um degrau menores.
   * Usado só pelos dois painéis analíticos — os widgets seguem no casco padrão.
   */
  compact?: boolean;
  /** Cabeçalho em duas linhas: título e ação em cima, subtítulo embaixo. */
  headerStacked?: boolean;
  /** Posição na cascata de entrada (ver o comentário do `PanelCard`). */
  index?: number;
}) {
  const chip = (
    <div
      className={cn(
        'grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-inset ring-primary/20',
        compact && 'h-8 w-8 rounded-lg'
      )}
    >
      <Icon className={cn('h-4 w-4', compact && 'h-3.5 w-3.5')} />
    </div>
  );
  const titulo = (
    <CardTitle className={cn('font-display leading-tight', compact ? 'text-sm' : 'text-heading')}>{title}</CardTitle>
  );
  const descricao = subtitle ? (
    <CardDescription className={cn(compact ? 'mt-0 leading-snug' : 'mt-0.5')}>{subtitle}</CardDescription>
  ) : null;
  const paddingCabecalho = compact ? 'px-4 pb-2 pt-3' : 'px-5 pb-3 pt-5';
  const gapTexto = compact ? 'gap-2' : 'gap-3';

  return (
    <MotionCard
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      variant="elevated"
      className={cn('flex h-full flex-col overflow-hidden rounded-2xl', className)}
    >
      {headerStacked ? (
        <CardHeader className={cn('flex flex-col space-y-0', compact ? 'gap-1.5' : 'gap-2', paddingCabecalho)}>
          <div className="flex items-start justify-between gap-2">
            <div className={cn('flex min-w-0 items-start', gapTexto)}>
              {chip}
              {titulo}
            </div>
            {action && <div className="shrink-0">{action}</div>}
          </div>
          {descricao}
        </CardHeader>
      ) : (
        <CardHeader className={cn('flex flex-row items-start justify-between space-y-0', gapTexto, paddingCabecalho)}>
          <div className={cn('flex min-w-0 items-start', gapTexto)}>
            {chip}
            <div className="min-w-0">
              {titulo}
              {descricao}
            </div>
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </CardHeader>
      )}
      {/* `min-h-0` é o que permite ao miolo encolher abaixo do conteúdo: sem ele
          as listas dos widgets (card com altura fixa) estouram o card em vez de
          rolar dentro dele. */}
      <CardContent
        className={cn('flex min-h-0 flex-1 flex-col pt-0', compact ? 'px-4 pb-4' : 'px-5 pb-5', contentClassName)}
      >
        {children}
      </CardContent>
    </MotionCard>
  );
}

/** Ação secundária do cabeçalho ("Ver todas" / "Ver detalhes"). */
function PanelAction({ label, onClick }: { label: string; onClick?: () => void }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      className="h-6 gap-1 rounded-lg px-1.5 text-caption font-body text-primary hover:bg-primary/10 hover:text-primary"
    >
      {label}
      <ChevronRight className="h-3 w-3" />
    </Button>
  );
}

/** Seletor de período do cabeçalho analítico (recorta a série já carregada). */
function PeriodoSelector({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  const atual = options.find((opcao) => opcao.value === value) ?? options[0];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label={label}
          className="h-7 gap-1.5 rounded-lg border-border/50 bg-card/60 px-2 text-caption font-body text-muted-foreground hover:border-primary/30 hover:text-foreground"
        >
          <Calendar className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{atual?.label}</span>
          <ChevronDown className="h-3.5 w-3.5 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="rounded-xl">
        {options.map((opcao) => (
          <DropdownMenuItem
            key={opcao.value}
            onSelect={() => onChange(opcao.value)}
            className={cn('cursor-pointer gap-2 text-caption', opcao.value === value && 'text-primary')}
          >
            {opcao.label}
            {opcao.value === value && <Check className="ml-auto h-3.5 w-3.5" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Linha escaneável dos widgets: chip de ícone, conteúdo livre e chevron. */
function WidgetRow({ icon: Icon, tone, children }: { icon: React.ElementType; tone: Tone; children: React.ReactNode }) {
  return (
    <div className="group/row flex items-center gap-2 rounded-xl px-2 py-1 transition-colors hover:bg-muted/40">
      <div className={cn('grid h-7 w-7 shrink-0 place-items-center rounded-lg', TONE_CHIP[tone])}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">{children}</div>
      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50 transition-transform group-hover/row:translate-x-0.5" />
    </div>
  );
}

/** Estado vazio discreto dos painéis (mesma linguagem em todos). */
function PanelEmpty({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-border/50 px-4 py-8 text-center">
      <p className="text-caption font-body text-muted-foreground">{children}</p>
    </div>
  );
}

/* ─── Dashboard ───────────────────────────────────────────────────────────── */

const PERIODOS_TEMPO = [
  { value: '12', label: 'Últimos 12 meses' },
  { value: '6', label: 'Últimos 6 meses' },
  { value: '3', label: 'Últimos 3 meses' },
];

const PERIODOS_FUNIL = [
  { value: '6', label: 'Últimos 6 meses' },
  { value: '12', label: 'Últimos 12 meses' },
  { value: '0', label: 'Todo o período' },
];

/** Série usada fora do modo demonstrativo (não há histórico real de tempo médio). */
const TEMPO_MEDIO_FALLBACK = [
  { month: 'Jan', days: 12 },
  { month: 'Fev', days: 10 },
  { month: 'Mar', days: 15 },
  { month: 'Abr', days: 9 },
];

/**
 * Altura fixa dos quatro widgets: as listas internas rolam (`overflow-y-auto`
 * + `scroll-interno`) e o card nunca cresce — os quatro ficam sempre com a
 * mesma altura, qualquer que seja o volume de itens.
 *
 * 256px é o valor medido do casco em 1024/1440/1920 (header 75px + miolo
 * 180px, mais a borda de 1px de cada lado), inclusive com o título quebrando
 * em duas linhas.
 *
 * O scroll é sempre do MIOLO, nunca do cabeçalho: o `<CardHeader>` do
 * `PanelCard` fica fora do container com `overflow-y-auto`. Quem recebe
 * `overflow-y-auto scroll-interno` são exatamente três containers:
 *   • "Ações Prioritárias" — div das 4 contagens;
 *   • "Próximas Admissões" — div dos colaboradores; o selo de etapa está
 *     dentro da linha e rola junto com ela (nunca sobra para o selo sair do
 *     card);
 *   • "SLA & Alertas" — div dos 3 indicadores + o bloco "Taxa de conclusão",
 *     que agora é o último filho DELA e rola junto (ver `ALTURA_LISTA_WIDGET`).
 * A barra é fina e discreta (6px, tinta de `--muted-foreground`, só quando há
 * overflow) e cai na faixa de 8px que o `-mx-2` já deixa fora da área de texto
 * — por isso ela nunca encosta no nome nem no selo à direita.
 */
const ALTURA_WIDGET = 'h-[256px]';

/**
 * Altura fixa da VIEWPORT rolável das três listas: é ela — e não o `flex-1` —
 * que decide quanto conteúdo aparece antes do corte.
 *
 * Medido no card real (312×256 na grade de 4 colunas, viewport 1600px): header
 * 75px + miolo 180px, dos quais 16px são o `pb-4` do `CardContent` — sobram
 * 164px para a lista. Com `min-h-0 flex-1` o container CRESCIA até esses 164px
 * enquanto o conteúdo real cabia inteiro (4 linhas de 36px + 2px de
 * `space-y-0.5` = 150px em "Ações Prioritárias" e "Próximas Admissões"; 3
 * linhas + 8px + rodapé = 155px em "SLA & Alertas"), então
 * `scrollHeight === clientHeight` e nenhuma barra era desenhada.
 *
 * 136px é a altura que exibe 3 linhas COMPLETAS (3×36 + 2 gaps de 2px = 112px)
 * e a maior parte da 4ª — a linha cortada fica sendo a dica de "há mais
 * abaixo":
 *   • "Ações Prioritárias" / "Próximas Admissões" → 150 − 136 = 14px ocultos;
 *   • "SLA & Alertas" → 155 − 136 = 19px ocultos (a "Taxa de conclusão" mostra
 *     o topo e o restante vem pela roda do mouse/arrasto da barra).
 * Os 24px que sobram no miolo (164 − 4 do `mt-1` − 136) são respiro antes do
 * `pb-4` do card; a altura EXTERNA (`h-[256px]`) não muda em nenhum dos três.
 * Como o container não é mais `flex-1`, ele mantém o `flex-shrink` padrão do
 * flexbox: em telas estreitas, onde o cabeçalho quebra e o miolo encolhe, a
 * viewport cede junto em vez de estourar o `overflow-hidden` do casco.
 */
const ALTURA_LISTA_WIDGET = 'h-[136px]';

/**
 * Tipografia da legenda do card "Distribuição por Área".
 *
 * O donut tem 112px de diâmetro e anel de 13px: 9,7% menor que os 124px/14px
 * que este card usava antes e 12,5% menor que os 128px/14px do
 * `DepartmentsCard` (a referência) — é o mesmo par do `EventTypesSummary`
 * (112/13). O anel mantém a espessura relativa na mesma ordem (~11,6% do
 * diâmetro, contra 11,3% e 10,9%), então o gráfico continua visualmente
 * dominante — só um degrau menor, para abrir o respiro entre o anel e a
 * lista. Ele é `shrink-0`: NUNCA encolhe para a legenda caber. O espaço que a
 * legenda ganha vem de dentro do próprio card — fonte 2px menor que a do
 * `text-caption` (12px) com entrelinha curta, `px-2.5` no miolo (10px em vez
 * dos 16px do modo compacto), `gap-x` de
 * 4px entre nome/percentual/quantidade, `tracking-tight` no nome (mesmo do
 * título) e percentual/quantidade em colunas próprias alinhadas à direita
 * (`tabular-nums`), sem largura fixa. Nada é truncado e nada usa reticências:
 * os nomes saem completos, em uma única linha (`whitespace-nowrap`).
 *
 * O `gap` entre donut e legenda é de 8px (era 2px) com o donut 12px menor: o
 * respiro sai de graça, porque a legenda termina com ~6px MAIS largura útil
 * que antes.
 *
 * A variante de container (`@max-[240px]`) é o último recurso: quando a linha
 * inteira (donut + legenda, ver `@container` no invólucro) fica abaixo de
 * 240px — o que só acontece em viewports < ~1400px, onde a grade de 4 colunas
 * espreme o card — a legenda cai para 9px em vez de encostar no percentual.
 * Em 1280px de viewport o card fica mais estreito que o próprio conteúdo
 * (232px de card para 112px de donut + 6 nomes completos): é um limite físico
 * do layout de 4 colunas, e a escolha é manter o gráfico no tamanho da
 * referência em vez de encolher mais ou cortar nome.
 */
const LEGENDA_AREA = 'text-[10px] leading-tight @max-[240px]:text-[9px]';

export function OnboardingDashboard({ admissoes }: { admissoes: any[] }) {
  // MOCK VISUAL — ver src/mocks/admissoesMock.ts (dev + VITE_ADMISSOES_MOCK=true).
  const mockAtivo = isAdmissoesMockEnabled();
  const [periodoTempo, setPeriodoTempo] = useState('12');
  const [periodoFunil, setPeriodoFunil] = useState('6');

  const agora = useMemo(() => new Date(), []);
  const hoje = useMemo(() => inicioDoDia(agora), [agora]);
  const lista = useMemo<AdmissaoLike[]>(() => (Array.isArray(admissoes) ? admissoes : []), [admissoes]);

  const stats = useMemo(() => {
    const concluidas = lista.filter((a) => a.etapa === 'concluida');
    const canceladas = lista.filter((a) => a.etapa === 'cancelada');
    const emAndamento = lista.filter((a) => a.etapa !== 'concluida' && a.etapa !== 'cancelada');

    const atrasadas = emAndamento.filter((a) => {
      const data = dataValida(a.data_prevista);
      return data ? data.getTime() < hoje : false;
    });
    const emRisco = emAndamento.filter((a) => {
      const data = dataValida(a.data_prevista);
      if (!data) return false;
      const t = data.getTime();
      return t >= hoje && t < hoje + 7 * DIA_MS;
    });

    const proximas = [...emAndamento]
      .filter((a) => dataValida(a.data_prevista))
      .sort((a, b) => dataValida(a.data_prevista)!.getTime() - dataValida(b.data_prevista)!.getTime())
      .slice(0, 4);

    const porArea = (() => {
      const mapa = new Map<string, number>();
      lista.forEach((a) => {
        const area = a.departamento?.trim() || 'Não informado';
        mapa.set(area, (mapa.get(area) ?? 0) + 1);
      });
      const ordenado = [...mapa.entries()].map(([nome, count]) => ({ nome, count })).sort((a, b) => b.count - a.count);
      // Acima de 6 áreas o restante vira "Outros" para a rosca continuar fechando
      // no total real (o centro do `DonutChart` soma os segmentos exibidos).
      if (ordenado.length <= 6) return ordenado;
      const resto = ordenado.slice(5).reduce((acc, item) => acc + item.count, 0);
      return [...ordenado.slice(0, 5), { nome: 'Outros', count: resto }];
    })();

    const prioridades: { id: string; label: string; total: number; icon: React.ElementType; tone: Tone }[] = [
      {
        id: 'documentos',
        label: 'documentos pendentes',
        total: lista.filter((a) => a.etapa === 'documentos').length,
        icon: FileText,
        tone: 'destructive',
      },
      {
        id: 'exames',
        label: 'exames em atraso',
        total: emAndamento.filter((a) => {
          if (a.etapa !== 'exame') return false;
          const data = dataValida(a.data_prevista);
          return data ? data.getTime() < hoje : false;
        }).length,
        icon: CalendarClock,
        tone: 'warning',
      },
      {
        id: 'contratos',
        label: 'contratos aguardando assinatura',
        total: lista.filter((a) => a.etapa === 'contrato' || a.etapa === 'assinatura').length,
        icon: ListTodo,
        tone: 'warning',
      },
      {
        id: 'esocial',
        label: 'falha no eSocial',
        total: canceladas.length,
        icon: ShieldAlert,
        tone: 'destructive',
      },
    ];

    const kpis = [
      {
        label: 'Total Iniciadas',
        valor: lista.length,
        icon: UserPlus,
        tone: 'primary' as Tone,
        descricao: 'processos no período',
        amostra: lista,
      },
      {
        label: 'Em Andamento',
        valor: emAndamento.length,
        icon: Clock,
        tone: 'info' as Tone,
        descricao: 'em pipeline agora',
        amostra: emAndamento,
      },
      {
        label: 'Finalizadas',
        valor: concluidas.length,
        icon: CheckCircle,
        tone: 'success' as Tone,
        descricao: 'concluídas no período',
        amostra: concluidas,
      },
      {
        label: 'Canceladas',
        valor: canceladas.length,
        icon: AlertCircle,
        tone: 'destructive' as Tone,
        descricao: 'processos encerrados no período',
        amostra: canceladas,
      },
    ].map((kpi) => ({
      ...kpi,
      trend: variacaoDePeriodo(kpi.amostra, agora),
    }));

    return {
      concluidas,
      canceladas,
      emAndamento,
      atrasadas,
      emRisco,
      noSla: emAndamento.length - atrasadas.length - emRisco.length,
      proximas,
      porArea,
      prioridades,
      kpis,
      funil: contarPorEtapa(lista),
      taxaConclusao: percentual(concluidas.length, lista.length),
      variacaoConclusao: variacaoDePeriodo(concluidas, agora),
    };
  }, [lista, agora, hoje]);

  /** Série do gráfico de tempo médio, recortada pelo seletor de período. */
  const serieTempo = useMemo(() => {
    // MOCK VISUAL — com o modo demonstrativo ligado usa a série de 12 meses de
    // src/mocks/admissoesMock.ts (o payload real não traz histórico de tempo médio).
    const base = mockAtivo ? MOCK_TEMPO_MEDIO_ADMISSAO : TEMPO_MEDIO_FALLBACK;
    const meses = Number(periodoTempo);
    return meses > 0 ? base.slice(-meses) : base;
  }, [mockAtivo, periodoTempo]);

  /** Funil recortado pelo período escolhido no cabeçalho do painel. */
  const funil = useMemo(
    () => contarPorEtapa(recortarPorPeriodo(lista, Number(periodoFunil), agora)),
    [lista, periodoFunil, agora]
  );

  const maiorFunil = funil[0]?.total ?? 1;
  const totalFunil = funil.reduce((acc, item) => acc + item.total, 0);

  return (
    <div className="space-y-4">
      {/* `AnimatePresence` local, sem props: a rota de Admissões já vive dentro de
          <AnimatePresence initial={false}> (PageTransition.tsx) e esse contexto de
          presença é lido por QUALQUER `motion.*` descendente — com
          `initial={false}` a Motion pula o keyframe inicial e a cascata nem chega
          a tocar (é o mesmo caso já documentado e contornado em
          OrganogramaTree.tsx, HistoricoColaborador.tsx e
          HeadcountOverviewCard.tsx). Um contexto de presença novo aqui
          (initial=true por padrão) devolve o keyframe `hidden` a todos os cards
          desta tela de uma vez, sem repetir a blindagem card a card. Ele não
          renderiza DOM: layout, cores, tipografia, tamanhos e o scroll interno
          dos widgets seguem idênticos.
          A cascata é a MESMA dos KPI Cards do Dashboard Executivo e segue a
          ordem visual da página — KPIs (0-3, o `index` do `MetricCard`),
          analíticos (4-5) e widgets (6-9), na leitura esquerda → direita,
          linha de cima antes da de baixo. Como a animação é por
          `initial="hidden"` + `animate="visible"` com alvo constante, hover e
          re-render (trocar o período de um gráfico, por exemplo) NÃO
          reanimam: só a montagem da tela. */}
      <AnimatePresence>
        {/* ── 1. KPIs ───────────────────────────────────────────────────────── */}
        {/* Sem `sparkline`: os KPI de Admissões não têm micro gráfico no canto
          direito — toda a largura do card fica com o ícone, o título, o valor e
          a frase de apoio, que assim aparece inteira (ver `MetricCard`).
          A entrada em cascata vem do próprio `MetricCard` (o `index` alimenta o
          `custom` do `cardVariants`, o mesmo do Dashboard Executivo): aqui o
          `index` do `.map` já entrega 0-3, os quatro primeiros da fila. */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.kpis.map((kpi, index) => (
            <MetricCard
              key={kpi.label}
              index={index}
              title={kpi.label}
              value={String(kpi.valor)}
              icon={kpi.icon}
              tone={kpi.tone}
              trend={kpi.trend}
              description={kpi.trend ? undefined : kpi.descricao}
              className="rounded-2xl border-border/40 shadow-elevated"
            />
          ))}
        </div>

        {/* ── 2. Área analítica ─────────────────────────────────────────────── */}
        <div className="grid gap-4 xl:grid-cols-2">
          <PanelCard
            icon={TrendingUp}
            title="Tempo Médio de Admissão (dias)"
            subtitle="Média do fluxo completo, da abertura ao eSocial"
            compact
            index={4}
            action={
              <PeriodoSelector
                label="Período do tempo médio de admissão"
                options={PERIODOS_TEMPO}
                value={periodoTempo}
                onChange={setPeriodoTempo}
              />
            }
          >
            {/* Sem cartão flutuante e sem rodapé de média: o gráfico ocupa a
              altura inteira do miolo (`flex-1`) e centraliza a série. */}
            <div className="relative mt-1 min-h-[188px] w-full flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={serieTempo} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="adm-tempo-fill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.32} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    dy={4}
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    width={34}
                    allowDecimals={false}
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip
                    cursor={{ stroke: 'hsl(var(--primary))', strokeDasharray: '4 4' }}
                    contentStyle={{
                      background: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 12,
                      fontSize: 12,
                      color: 'hsl(var(--popover-foreground))',
                    }}
                    formatter={(value) => [`${value} dias`, 'Tempo médio']}
                    labelFormatter={(label) => `Mês: ${label}`}
                  />
                  <Area
                    type="monotone"
                    dataKey="days"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill="url(#adm-tempo-fill)"
                    dot={{ r: 2.5, fill: 'hsl(var(--primary))', strokeWidth: 0 }}
                    activeDot={{ r: 4, stroke: 'hsl(var(--card))', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </PanelCard>

          <PanelCard
            icon={ShieldCheck}
            title="Funil de Onboarding por Etapa"
            subtitle="Total de admissões no período"
            compact
            index={5}
            action={
              <PeriodoSelector
                label="Período do funil de onboarding"
                options={PERIODOS_FUNIL}
                value={periodoFunil}
                onChange={setPeriodoFunil}
              />
            }
          >
            {funil.length === 0 ? (
              <PanelEmpty>Nenhuma admissão no período selecionado.</PanelEmpty>
            ) : (
              <ul className="mt-1 flex flex-1 flex-col justify-between gap-1.5">
                {funil.map((item, index) => (
                  <li key={item.etapa} className="grid grid-cols-[96px_1fr_32px_40px] items-center gap-2.5">
                    <span
                      className="truncate text-right text-caption font-body text-muted-foreground"
                      title={item.label}
                    >
                      {item.label}
                    </span>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted/40">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-primary/70 to-primary"
                        initial={{ width: 0 }}
                        animate={{ width: `${percentual(item.total, maiorFunil)}%` }}
                        transition={{ duration: 0.6, delay: index * 0.05, ease: [0.25, 0.46, 0.45, 0.94] }}
                      />
                    </div>
                    <span className="text-right font-display text-caption font-medium tabular-nums text-foreground">
                      {item.total}
                    </span>
                    <span className="text-right text-overline font-body tabular-nums text-muted-foreground">
                      {percentual(item.total, totalFunil)}%
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </PanelCard>
        </div>

        {/* ── 3. Widgets ────────────────────────────────────────────────────── */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <PanelCard
            icon={Zap}
            title="Ações Prioritárias"
            subtitle="Itens que precisam da sua atenção"
            action={<PanelAction label="Ver todas" />}
            compact
            index={6}
            headerStacked
            className={ALTURA_WIDGET}
          >
            {stats.prioridades.every((item) => item.total === 0) ? (
              <PanelEmpty>Nenhuma pendência aberta.</PanelEmpty>
            ) : (
              <div className={cn('-mx-2 mt-1 min-h-0 space-y-0.5 overflow-y-auto scroll-interno', ALTURA_LISTA_WIDGET)}>
                {stats.prioridades.map((item) => (
                  <WidgetRow key={item.id} icon={item.icon} tone={item.tone}>
                    <div className="flex items-baseline gap-2">
                      <span className={cn('font-display text-base font-medium tabular-nums', TONE_TEXT[item.tone])}>
                        {item.total}
                      </span>
                      <span className="truncate text-caption font-body text-foreground">{item.label}</span>
                    </div>
                  </WidgetRow>
                ))}
              </div>
            )}
          </PanelCard>

          <PanelCard
            icon={Calendar}
            title="Próximas Admissões"
            subtitle="Colaboradores com início em breve"
            action={<PanelAction label="Ver todas" />}
            compact
            index={7}
            headerStacked
            className={ALTURA_WIDGET}
          >
            {stats.proximas.length === 0 ? (
              <PanelEmpty>Sem admissões agendadas.</PanelEmpty>
            ) : (
              <div className={cn('-mx-2 mt-1 min-h-0 space-y-0.5 overflow-y-auto scroll-interno', ALTURA_LISTA_WIDGET)}>
                {stats.proximas.map((admissao) => (
                  <div
                    key={String(admissao.id ?? admissao.nome)}
                    className="flex items-center gap-2 rounded-xl px-2 py-1 transition-colors hover:bg-muted/40"
                  >
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-xl bg-muted/60 font-display text-[11px] font-medium text-muted-foreground">
                      {iniciais(admissao.nome)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-caption font-body font-medium leading-tight text-foreground">
                        {admissao.nome}
                      </p>
                      <p className="truncate text-overline leading-none font-body text-muted-foreground">
                        {formatDate(admissao.data_prevista)}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      size="sm"
                      className={cn(
                        'shrink-0 border-0',
                        ETAPA_BADGE[admissao.etapa ?? ''] ?? 'bg-muted/50 text-muted-foreground'
                      )}
                    >
                      {ETAPA_LABELS[admissao.etapa ?? ''] ?? admissao.etapa}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </PanelCard>

          <PanelCard
            icon={PieChart}
            title="Distribuição por Área"
            subtitle="Total de admissões no período"
            action={<PanelAction label="Ver detalhes" />}
            compact
            index={8}
            headerStacked
            className={ALTURA_WIDGET}
            // `px-2.5` no lugar do `px-4` do modo compacto: 12px a mais de
            // largura útil para a legenda, sem mexer na largura nem na altura do
            // card (o cabeçalho continua no `px-4` de sempre).
            contentClassName="px-2.5"
          >
            {stats.porArea.length === 0 ? (
              <PanelEmpty>Sem áreas com admissões.</PanelEmpty>
            ) : (
              <div className="@container mt-2 flex min-h-0 flex-1 items-center gap-2">
                {/* `@container` no invólucro (donut + legenda): é a largura desta
                  linha que serve de referência para a variante de container de
                  `LEGENDA_AREA` (fallback dos cards estreitos). O `gap-2` (8px,
                  era `gap-0.5`/2px) é o respiro horizontal entre o anel e a
                  lista. O `mt-2` (8px) é o recentro vertical do gráfico: o casco
                  do card tem mais respiro embaixo (`pb-4`, 16px, do miolo) do
                  que acima (`pb-2`, 8px, do cabeçalho), então sem essa folga o
                  donut ficava ~4,5px acima do centro óptico. Com ela, o vão
                  subtítulo→anel e o vão anel→base do card ficam praticamente
                  iguais (33,7px acima × 34,8px abaixo em 1440; o ~1px que resta
                  é a entrelinha do subtítulo), e o `items-center` mantém donut e
                  legenda centrados entre si. */}
                {/* Coluna esquerda: largura fixa do donut, ~10% menor que os
                  124px/14px que este card usava antes (112px de diâmetro, anel
                  de 13px — mesma ordem de espessura relativa do anel dos
                  128px/14px de `DepartmentsCard`), para o gráfico continuar
                  dominante mas com mais respiro até a legenda. O `shrink-0`
                  garante que ele nunca encolhe: quem cede espaço é a legenda,
                  que continua exibindo todos os nomes por inteiro. */}
                <DonutChart
                  segments={stats.porArea.map((area, index) => ({
                    label: area.nome,
                    value: area.count,
                    color: donutColors[index % donutColors.length],
                  }))}
                  size={112}
                  strokeWidth={13}
                  showLegend={false}
                  className="shrink-0"
                />
                {/* Coluna direita: `flex-1 min-w-0` recebe toda a sobra (12px do
                  donut menor, menos 6px do `gap` maior). */}
                <ul className="grid min-w-0 flex-1 gap-1.5">
                  {stats.porArea.map((area, index) => (
                    <li
                      key={area.nome}
                      // `minmax(0,1fr)` deixa a coluna do nome encolher até o
                      // próprio texto; percentual e quantidade ficam em colunas
                      // próprias alinhadas à direita, então os números se alinham
                      // na vertical em todas as linhas (`tabular-nums`).
                      className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-1"
                    >
                      <span className="flex min-w-0 items-center gap-1">
                        <i
                          className="h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{ backgroundColor: donutColors[index % donutColors.length] }}
                          aria-hidden
                        />
                        {/* Sem `truncate`/`text-ellipsis` e sem reticências: o
                          nome é sempre exibido por inteiro e em uma única linha
                          (`whitespace-nowrap`); o `tracking-tight` (mesmo do
                          título do card) só aperta o espacejamento entre as
                          letras, sem cortar nada. */}
                        <span
                          className={cn(
                            'min-w-0 whitespace-nowrap font-body tracking-tight text-muted-foreground',
                            LEGENDA_AREA
                          )}
                        >
                          {area.nome}
                        </span>
                      </span>
                      <span className={cn('text-right tabular-nums text-muted-foreground', LEGENDA_AREA)}>
                        {percentual(area.count, lista.length)}%
                      </span>
                      {/* Sem `min-w`: `tabular-nums` + alinhamento à direita já
                        alinham 1, 2 ou 3 dígitos na mesma coluna. */}
                      <span
                        className={cn('text-right font-display font-medium tabular-nums text-foreground', LEGENDA_AREA)}
                      >
                        {area.count}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </PanelCard>

          <PanelCard
            icon={Gauge}
            title="SLA & Alertas"
            subtitle="Status do processo de admissão"
            action={<PanelAction label="Ver detalhes" />}
            compact
            index={9}
            headerStacked
            className={ALTURA_WIDGET}
          >
            {stats.emAndamento.length === 0 ? (
              <PanelEmpty>Nenhum processo em andamento.</PanelEmpty>
            ) : (
              <div
                className={cn(
                  '-mx-2 mt-1 flex min-h-0 flex-col gap-2 overflow-y-auto scroll-interno',
                  ALTURA_LISTA_WIDGET
                )}
              >
                {/* Agora rola o MIOLO INTEIRO — os três indicadores e, no fim, o
                  bloco "Taxa de conclusão": juntos somam ~155px (3×36 + os
                  gaps + o rodapé), 19px a mais que os 136px da viewport
                  (`ALTURA_LISTA_WIDGET`). É esse excedente que garante
                  `scrollHeight > clientHeight` — sem ele a barra nem aparecia.
                  Os filhos não encolhem (o `min-height: auto` do flexbox trava
                  cada um no tamanho do próprio conteúdo), então o excesso vira
                  rolagem em vez de achatamento.
                  O `-mx-2` do container abre a faixa onde a barra corre e o
                  `mx-2` do rodapé mantém o bloco dentro dela (medido: o rodapé
                  termina 8px antes da barra) — sem esse `mx-2` a barra passaria
                  por cima da borda arredondada da direita. O preço é o rodapé
                  nascer com a largura do miolo já descontada a barra: os 10px
                  do `scrollbar-width: thin` do Chromium, que ignora o
                  `width: 6px` do `::-webkit-scrollbar` declarado em
                  `src/index.css`. */}
                <div className="space-y-0.5">
                  {[
                    {
                      id: 'sla',
                      label: 'Dentro do SLA',
                      total: stats.noSla,
                      icon: CheckCircle,
                      tone: 'success' as Tone,
                    },
                    {
                      id: 'risco',
                      label: 'Em risco',
                      total: stats.emRisco.length,
                      icon: AlertTriangle,
                      tone: 'warning' as Tone,
                    },
                    {
                      id: 'atrasadas',
                      label: 'Atrasadas',
                      total: stats.atrasadas.length,
                      icon: AlertCircle,
                      tone: 'destructive' as Tone,
                    },
                  ].map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-2 rounded-xl px-2 py-1 transition-colors hover:bg-muted/40"
                    >
                      <div className={cn('grid h-7 w-7 shrink-0 place-items-center rounded-lg', TONE_CHIP[item.tone])}>
                        <item.icon className="h-3.5 w-3.5" />
                      </div>
                      <span className="min-w-0 flex-1 truncate text-caption font-body text-foreground">
                        {item.label}
                      </span>
                      <span className="font-display text-caption font-medium tabular-nums text-foreground">
                        {item.total}
                      </span>
                      <span className={cn('w-9 text-right text-overline font-body tabular-nums', TONE_TEXT[item.tone])}>
                        {percentual(item.total, stats.emAndamento.length)}%
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mx-2 flex shrink-0 items-center justify-between gap-2 rounded-xl border border-border/40 bg-muted/20 px-2.5 py-2">
                  <span className="flex items-center gap-1.5 text-caption font-body text-muted-foreground">
                    <TrendingUp className="h-3.5 w-3.5 text-primary" />
                    Taxa de conclusão
                  </span>
                  <span className="flex items-baseline gap-1.5">
                    <span className="font-display text-base font-medium leading-none tabular-nums text-foreground">
                      {stats.taxaConclusao}%
                    </span>
                    {stats.variacaoConclusao && (
                      <span
                        className={cn(
                          'text-caption font-medium tabular-nums',
                          stats.variacaoConclusao.value >= 0 ? 'text-success' : 'text-destructive'
                        )}
                      >
                        {stats.variacaoConclusao.value >= 0 ? '+' : ''}
                        {stats.variacaoConclusao.value}%
                      </span>
                    )}
                  </span>
                </div>
              </div>
            )}
          </PanelCard>
        </div>
      </AnimatePresence>
    </div>
  );
}
