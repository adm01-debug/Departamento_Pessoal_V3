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
import { useNavigate } from 'react-router-dom';
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
  type LucideIcon,
  PieChart,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  UserPlus,
  Zap,
} from 'lucide-react';
// MOCK VISUAL — ver src/mocks/admissoesMock.ts
import { isAdmissoesMockEnabled, MOCK_TEMPO_MEDIO_ADMISSAO } from '@/mocks/admissoesMock';
// Fonte única dos rótulos/selos de etapa, do checklist e das tintas de tom —
// o mesmo módulo que os modais de detalhe leem, para que card e modal nunca
// mostrem rótulo ou cor diferentes para a mesma informação.
import {
  CHECKLIST_ADMISSAO,
  ETAPA_BADGE,
  ETAPA_FLUXO,
  ETAPA_LABELS,
  TONE_CHIP,
  TONE_TEXT,
  type CampoChecklist,
  type Tone,
} from './admissoesComum';
// Modais dos quatro widgets (mesma base/coreografia do popup de Pendências da
// área de Colaboradores). Eles recebem os dados JÁ derivados daqui — a
// matemática do card e a lista do modal saem sempre da mesma fonte.
import {
  AcoesPrioritariasDialog,
  DistribuicaoAreaDialog,
  ProximasAdmissoesDialog,
  SlaAlertasDialog,
  type AdmissaoDetalhe,
  type AreaDetalhe,
  type PrioridadeDetalhe,
  type SlaSegmento,
} from './admissoesDashboardModais';

/** Registro mínimo que este dashboard lê (admissão real ou fictícia). */
type AdmissaoLike = {
  id?: string | number;
  nome?: string | null;
  cargo?: string | null;
  departamento?: string | null;
  etapa?: string | null;
  data_prevista?: string | null;
  created_at?: string | null;
  /** Texto registrado pelo RH na admissão (andamento/pendência). */
  observacoes?: string | null;
  /** Situação e protocolo da transmissão do S-2200. */
  status_esocial?: string | null;
  protocolo_esocial?: string | null;
  /** Checklist obrigatório da admissão (colunas reais, podem vir nulas). */
  checklist_documentos_pessoais?: boolean | null;
  checklist_comprovante_endereco?: boolean | null;
  checklist_foto?: boolean | null;
  checklist_ctps?: boolean | null;
  checklist_exame_admissional?: boolean | null;
  checklist_contrato_assinado?: boolean | null;
  checklist_esocial_enviado?: boolean | null;
  /** JSON livre da admissão — é dele que sai o `responsavel` do processo. */
  metadata?: { responsavel?: string | null } | null;
};

const DIA_MS = 24 * 60 * 60 * 1000;

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

/**
 * Ordena por `data_prevista` crescente (a mais próxima primeiro). Registros sem
 * data válida vão para o fim — o card não os exibe, mas a função também é usada
 * por listas que podem contê-los.
 */
function ordenarPorDataPrevista<T extends AdmissaoLike>(itens: T[]): T[] {
  return [...itens].sort((a, b) => {
    const da = dataValida(a.data_prevista)?.getTime() ?? Number.POSITIVE_INFINITY;
    const db = dataValida(b.data_prevista)?.getTime() ?? Number.POSITIVE_INFINITY;
    return da - db;
  });
}

/**
 * Dias entre a data prevista e o início de HOJE, arredondados para cima:
 * `> 0` ainda falta, `0` vence hoje, `< 0` atraso e `null` sem data cadastrada.
 *
 * O arredondamento existe porque a coluna é uma data (hora zero): comparando o
 * timestamp direto, "amanhã" cairia em 0,x de dia. Com `ceil`, o número
 * mostrado no modal bate com a régua de classificação do card.
 */
function diasAteHoje(valor: string | null | undefined, hoje: number): number | null {
  const data = dataValida(valor);
  if (!data) return null;
  return Math.ceil((data.getTime() - hoje) / DIA_MS);
}

/**
 * Mesma régua de prazo que o card usa: `atrasada` quando a data prevista já
 * passou do início de hoje, `risco` quando vence nos próximos 7 dias e `dentro`
 * no restante — inclusive quando a admissão não tem data prevista cadastrada.
 */
function slaDaAdmissao(a: AdmissaoLike, hoje: number): SlaSegmento {
  const data = dataValida(a.data_prevista);
  if (!data) return 'dentro';
  const t = data.getTime();
  if (t < hoje) return 'atrasada';
  return t < hoje + 7 * DIA_MS ? 'risco' : 'dentro';
}

/**
 * Checklist da admissão: quantos itens estão marcados e quais faltam.
 * Retorna `null` quando a base não traz nenhum dos sete campos (aí o modal
 * avisa, em vez de mostrar um checklist vazio como se tudo estivesse ok).
 */
function checklistDaAdmissao(a: AdmissaoLike) {
  const itens = CHECKLIST_ADMISSAO.filter((item) => typeof a[item.campo] === 'boolean');
  if (itens.length === 0) return null;
  const faltantes = itens.filter((item) => a[item.campo] !== true).map((item) => item.label);
  return { total: itens.length, concluidos: itens.length - faltantes.length, faltantes };
}

/**
 * Progresso da admissão em 0-100, com a origem do número:
 *   • checklist preenchido → itens concluídos ÷ total de itens do checklist;
 *   • sem checklist na base → posição da etapa no fluxo de 8 etapas (aproximação).
 * O rótulo da origem acompanha o valor para o modal nunca mostrar um percentual
 * sem dizer de onde ele veio.
 */
function progressoDaAdmissao(a: AdmissaoLike): { valor: number; base: string } {
  const checklist = checklistDaAdmissao(a);
  if (checklist) {
    return {
      valor: percentual(checklist.concluidos, checklist.total),
      base: `checklist ${checklist.concluidos}/${checklist.total}`,
    };
  }
  const indice = ETAPA_FLUXO.indexOf((a.etapa ?? '') as (typeof ETAPA_FLUXO)[number]);
  if (indice < 0) return { valor: 0, base: 'etapa não reconhecida no fluxo' };
  return { valor: percentual(indice + 1, ETAPA_FLUXO.length), base: `etapa ${indice + 1}/${ETAPA_FLUXO.length}` };
}

/**
 * Traduz uma admissão para o formato dos modais: os campos do banco como
 * vieram + os derivados (dias, SLA, progresso, pendências e responsável).
 * `indice` só serve de chave estável quando a admissão não tem `id`.
 */
function detalharAdmissao(a: AdmissaoLike, hoje: number, indice: number): AdmissaoDetalhe {
  const checklist = checklistDaAdmissao(a);
  const progresso = progressoDaAdmissao(a);
  return {
    id: String(a.id ?? `admissao-${indice}`),
    nome: a.nome?.trim() || 'Candidato sem nome',
    cargo: a.cargo ?? null,
    departamento: a.departamento ?? null,
    etapa: a.etapa ?? null,
    dataPrevista: a.data_prevista ?? null,
    dias: diasAteHoje(a.data_prevista, hoje),
    sla: slaDaAdmissao(a, hoje),
    responsavel: a.metadata?.responsavel?.trim() || 'Não atribuído',
    progresso: progresso.valor,
    progressoBase: progresso.base,
    pendencias: checklist
      ? checklist.faltantes
      : ['Checklist de documentos não preenchido nesta base — conferir no detalhe da admissão.'],
    observacao: a.observacoes ?? null,
    statusEsocial: a.status_esocial ?? null,
    protocoloEsocial: a.protocolo_esocial ?? null,
  };
}

/** Detalha uma lista inteira na ordem em que ela veio. */
function detalharLista(itens: AdmissaoLike[], hoje: number): AdmissaoDetalhe[] {
  return itens.map((item, indice) => detalharAdmissao(item, hoje, indice));
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
 * Painel de conteúdo da área de Admissões: cabeçalho com ícone SOLTO, título,
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
   * Cabeçalho em duas linhas: (ícone + título + ação) na primeira e subtítulo de
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
   * Casco denso: mesmo desenho, com paddings e título um degrau menores.
   * Usado só pelos dois painéis analíticos — os widgets seguem no casco padrão.
   * O ícone do título NÃO encolhe junto: ele tem 20px nas duas variantes, para
   * que os seis cabeçalhos fiquem idênticos (ver `icone`).
   */
  compact?: boolean;
  /** Cabeçalho em duas linhas: título e ação em cima, subtítulo embaixo. */
  headerStacked?: boolean;
  /** Posição na cascata de entrada (ver o comentário do `PanelCard`). */
  index?: number;
}) {
  /**
   * Ícone do título — SOLTO, direto sobre o fundo do card: sem caixa, sem
   * `background`, sem `ring`/borda e sem `rounded`. É o mesmo desenho da
   * referência da área de Colaboradores (`ColaboradorDetalhesPage.tsx`:
   * `flex items-center gap-2` + `<Icon className="h-5 w-5 text-primary" />`),
   * então são 20px de ícone com 8px de folga até o texto, na cor `primary` —
   * a mesma que o antigo chip já aplicava.
   */
  const icone = <Icon className="h-5 w-5 shrink-0 text-primary" />;
  const titulo = (
    <CardTitle className={cn('font-display leading-tight', compact ? 'text-sm' : 'text-heading')}>{title}</CardTitle>
  );
  const descricao = subtitle ? (
    <CardDescription className={cn(compact ? 'mt-0 leading-snug' : 'mt-0.5')}>{subtitle}</CardDescription>
  ) : null;
  const paddingCabecalho = compact ? 'px-4 pb-2 pt-3' : 'px-5 pb-3 pt-5';
  const gapTexto = compact ? 'gap-2' : 'gap-3';
  /** Folga entre o ícone do título e o texto (8px, igual à referência). */
  const gapIcone = 'gap-2';

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
            {/* `items-center`: o ícone centraliza na LINHA do título (aqui ele é
                o único vizinho do `<CardTitle>`), como na referência. */}
            <div className={cn('flex min-w-0 items-center', gapIcone)}>
              {icone}
              {titulo}
            </div>
            {action && <div className="shrink-0">{action}</div>}
          </div>
          {descricao}
        </CardHeader>
      ) : (
        <CardHeader className={cn('flex flex-row items-start justify-between space-y-0', gapTexto, paddingCabecalho)}>
          {/* Aqui o vizinho do ícone é a coluna título + subtítulo: `items-start`
              prende o ícone à primeira linha (o título) e mantém o subtítulo
              exatamente onde estava, alinhado sob o título — nenhum `px`
              adicional, nenhum recuo novo. */}
          <div className={cn('flex min-w-0 items-start', gapIcone)}>
            {icone}
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

/**
 * Linha escaneável do widget "Ações Prioritárias": chip de ícone + conteúdo.
 *
 * SEM chevron à direita (e como consequência sem o grupo `group/row`, que só
 * existia para animar a seta no hover): as linhas não navegam para lugar
 * nenhum — quem leva à fila completa é o "Ver todas" do cabeçalho —, então a
 * seta era ruído visual e reservava 14px de largura + os 8px do `gap` só para
 * si. Sem ela o conteúdo recebe esses 22px e passa a alinhar com a borda de
 * texto do card, o mesmo eixo do título e do botão de ação.
 *
 * O resto da linha é o de sempre: `px-2 py-1` (a caixa de 36px de altura, que
 * depende do chip de 28px + os 2×4px do padding, não muda), `rounded-xl`,
 * `gap-2` entre chip e conteúdo, `min-w-0 flex-1` no miolo e o
 * `transition-colors` + `HOVER_LINHA_WIDGET` do hover escuro.
 */
function WidgetRow({ icon: Icon, tone, children }: { icon: React.ElementType; tone: Tone; children: React.ReactNode }) {
  return (
    <div className={cn('flex items-center gap-2 rounded-xl px-2 py-1 transition-colors', HOVER_LINHA_WIDGET)}>
      <div className={cn('grid h-7 w-7 shrink-0 place-items-center rounded-lg', TONE_CHIP[tone])}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">{children}</div>
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
 * 256px é o valor medido do casco em 1024/1440/1920 (header 69,5px + miolo
 * 185,5px, mais a borda de 1px de cada lado), inclusive com o título quebrando
 * em duas linhas. O header é 6px mais baixo que antes do ícone solto: o antigo
 * chip do título (`h-8 w-8`) era o item mais alto da linha do cabeçalho e agora
 * quem manda é o botão de ação, de 24px. O casco segue com os MESMOS 256px —
 * os 6px só viram respiro a mais no miolo, e a viewport rolável (`h-[136px]`)
 * não muda em nada.
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
 * 69,5px + miolo 185,5px, dos quais 16px são o `pb-4` do `CardContent` — sobram
 * 169,5px para a lista. Com `min-h-0 flex-1` o container CRESCIA até esses
 * 169,5px enquanto o conteúdo real cabia inteiro (4 linhas de 36px + 2px de
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
 * Os ~30px que sobram no miolo (169,5 − 4 do `mt-1` − 136) são respiro antes do
 * `pb-4` do card; a altura EXTERNA (`h-[256px]`) não muda em nenhum dos três.
 * Como o container não é mais `flex-1`, ele mantém o `flex-shrink` padrão do
 * flexbox: em telas estreitas, onde o cabeçalho quebra e o miolo encolhe, a
 * viewport cede junto em vez de estourar o `overflow-hidden` do casco.
 */
const ALTURA_LISTA_WIDGET = 'h-[136px]';

/**
 * Hover das linhas internas dos três widgets — "Ações Prioritárias", "Próximas
 * Admissões" e "SLA & Alertas".
 *
 * É a MESMA classe do card "Últimos 7 dias" (`PontoWeekSummary.tsx`:
 * `hover:bg-background/70 transition-colors`) e não o `bg-muted/40` que estas
 * três listas usavam: sobre o navy do card (`--card`, L 12%) o `--muted` deste
 * tema é mais CLARO (L 14%), então o realce antigo acendia a linha em vez de
 * escurecê-la — o oposto do que a referência faz. O `--background` (L 8%) é a
 * única superfície mais escura que o card nos dois temas, então `/70` dá o
 * mesmo escurecimento discreto do card de referência, sem virar faixa opaca.
 *
 * Sem borda, sem `ring` e sem sombra: a referência também não usa, e um
 * `border` novo mudaria a caixa da linha (o requisito é não alterar
 * dimensões). `transition-colors` já cobre `background-color` e
 * `border-color`, e as linhas não têm `onClick` — logo nenhuma recebe
 * `cursor-pointer` (a referência também não tem: lá o realce é só leitura).
 */
const HOVER_LINHA_WIDGET = 'hover:bg-background/70';

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

/**
 * Abas internas de Admissões para onde os modais podem levar o RH. O módulo não
 * cria rota nova: as ações dos modais só existem quando há um destino REAL —
 * uma aba desta própria página, `/exames` ou `/esocial`.
 */
export type AbaAdmissoes = 'gestao' | 'kanban' | 'onboarding';

export function OnboardingDashboard({
  admissoes,
  onAbrirAba,
}: {
  admissoes: any[];
  /**
   * Leva o usuário para uma aba interna do módulo (ex.: "Gestão de Candidatos").
   * Opcional: sem ela, os itens que só têm uma aba como destino não exibem o
   * botão "Resolver agora" — melhor não mostrar ação do que mostrar uma que não
   * leva a lugar nenhum.
   */
  onAbrirAba?: (aba: AbaAdmissoes) => void;
}) {
  // MOCK VISUAL — ver src/mocks/admissoesMock.ts (dev + VITE_ADMISSOES_MOCK=true).
  const mockAtivo = isAdmissoesMockEnabled();
  const navigate = useNavigate();
  const [periodoTempo, setPeriodoTempo] = useState('12');
  const [periodoFunil, setPeriodoFunil] = useState('6');
  // Abertura dos quatro modais de detalhe (um por widget com atalho no cabeçalho).
  const [acoesAbertas, setAcoesAbertas] = useState(false);
  const [proximasAbertas, setProximasAbertas] = useState(false);
  const [areasAbertas, setAreasAbertas] = useState(false);
  const [slaAberto, setSlaAberto] = useState(false);

  /**
   * Destino real de cada família de pendência (o "Resolver agora" do modal).
   * Documentos e contratos são resolvidos na aba "Gestão de Candidatos" — é lá
   * que ficam a validação do documento e o reenvio do link de contratação. O ASO
   * tem tela própria em `/exames` e o S-2200 em `/esocial`.
   */
  const resolverDaPrioridade = (id: string): (() => void) | undefined => {
    if (id === 'exames') return () => navigate('/exames');
    if (id === 'esocial') return () => navigate('/esocial');
    if (!onAbrirAba) return undefined;
    return () => onAbrirAba('gestao');
  };

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

    // A fila ordenada é a MESMA para o card (que exibe as 4 primeiras) e para o
    // modal (que exibe todas) — o card só fatia o resultado, sem recalcular.
    const proximasOrdenadas = ordenarPorDataPrevista(emAndamento.filter((a) => dataValida(a.data_prevista)));
    const proximas = proximasOrdenadas.slice(0, 4);

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

    // As quatro FAMÍLIAS de pendência do card. Cada fila é derivada uma única
    // vez e alimenta tanto o número do card (`total`) quanto o detalhe do modal
    // — assim os dois nunca divergem. Os filtros são exatamente os de antes.
    const filaDocumentos = lista.filter((a) => a.etapa === 'documentos');
    const filaExamesAtrasados = emAndamento.filter((a) => {
      if (a.etapa !== 'exame') return false;
      const data = dataValida(a.data_prevista);
      return data ? data.getTime() < hoje : false;
    });
    const filaContratos = lista.filter((a) => a.etapa === 'contrato' || a.etapa === 'assinatura');
    const filaEsocial = canceladas;
    const filaPorPrioridade: Record<string, AdmissaoLike[]> = {
      documentos: filaDocumentos,
      exames: filaExamesAtrasados,
      contratos: filaContratos,
      esocial: filaEsocial,
    };

    const prioridades: Omit<PrioridadeDetalhe, 'candidatos'>[] = [
      {
        id: 'documentos',
        label: 'documentos pendentes',
        total: filaDocumentos.length,
        icon: FileText,
        tone: 'destructive',
      },
      {
        id: 'exames',
        label: 'exames em atraso',
        total: filaExamesAtrasados.length,
        icon: CalendarClock,
        tone: 'warning',
      },
      {
        id: 'contratos',
        label: 'contratos aguardando assinatura',
        total: filaContratos.length,
        icon: ListTodo,
        tone: 'warning',
      },
      {
        id: 'esocial',
        label: 'falha no eSocial',
        total: filaEsocial.length,
        icon: ShieldAlert,
        tone: 'destructive',
      },
    ];

    // Detalhe de cada família: a MESMA fila, ordenada pela data prevista mais
    // próxima (as vencidas primeiro) e traduzida para leitura no modal.
    const prioridadesDetalhe: PrioridadeDetalhe[] = prioridades.map((item) => ({
      ...item,
      candidatos: detalharLista(ordenarPorDataPrevista(filaPorPrioridade[item.id] ?? []), hoje),
    }));

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

    /**
     * Lista de TODAS as áreas, sem o agrupamento em "Outros" que o card faz
     * acima de 6 fatias — é ela que o modal exibe. A ordenação (quantidade
     * decrescente) é a mesma do `porArea`, então as cinco primeiras posições
     * batem com as do anel; `variacao` reusa a mesma janela de 30 dias dos KPIs
     * e fica `null` quando não há base anterior (nenhum número é inventado).
     */
    const areasCompletas: AreaDetalhe[] = (() => {
      const mapa = new Map<string, AdmissaoLike[]>();
      lista.forEach((a) => {
        const area = a.departamento?.trim() || 'Não informado';
        mapa.set(area, [...(mapa.get(area) ?? []), a]);
      });
      return [...mapa.entries()]
        .map(([nome, registros]) => ({
          nome,
          count: registros.length,
          percentual: percentual(registros.length, lista.length),
          variacao: variacaoDePeriodo(registros, agora)?.value ?? null,
        }))
        .sort((a, b) => b.count - a.count)
        .map((area, indice) => ({ ...area, posicao: indice + 1 }));
    })();

    // Partição exata de `emAndamento` pela régua de prazo: todo processo cai em
    // um — e só um — dos três grupos. `noSla` é derivado DELA (e não de uma
    // subtração) para o número do card e a lista do modal nunca divergirem.
    const dentroDoSla = emAndamento.filter((a) => slaDaAdmissao(a, hoje) === 'dentro');

    return {
      concluidas,
      canceladas,
      emAndamento,
      atrasadas,
      emRisco,
      noSla: dentroDoSla.length,
      proximas,
      porArea,
      prioridades,
      kpis,
      funil: contarPorEtapa(lista),
      taxaConclusao: percentual(concluidas.length, lista.length),
      variacaoConclusao: variacaoDePeriodo(concluidas, agora),
      /* Detalhes consumidos pelos modais dos quatro widgets. */
      prioridadesDetalhe,
      proximasDetalhe: detalharLista(proximasOrdenadas, hoje),
      areasCompletas,
      dentroDoSlaDetalhe: detalharLista(dentroDoSla, hoje),
      emRiscoDetalhe: detalharLista(emRisco, hoje),
      atrasadasDetalhe: detalharLista(atrasadas, hoje),
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
          `index` do `.map` já entrega 0-3, os quatro primeiros da fila.
          `vividRed`: pede ao `MetricCard` a variante VIBRANTE do vermelho
          (`--destructive-vivid`, ver `src/index.css`) — o `--destructive` do
          tema é um vinho escuro que desaparece no navy. Vale para o chip do KPI
          "Canceladas" e para o selo de tendência negativa; é a flag que mantém
          o vermelho legível sem tocar no vermelho do Dashboard Executivo. */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.kpis.map((kpi, index) => (
            <MetricCard
              key={kpi.label}
              index={index}
              title={kpi.label}
              value={String(kpi.valor)}
              icon={kpi.icon}
              tone={kpi.tone}
              vividRed
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
              {/* `AnimatePresence` local (sem props): mesma técnica do card
                  "Visão Geral da Empresa" (`HeadcountOverviewCard.tsx`) — blinda o
                  `motion.rect` do clip-path abaixo contra o `initial={false}` de
                  `PageTransition.tsx`, que se propagaria por contexto e bloquearia
                  a animação de entrada quando /admissoes é a primeira rota da
                  sessão (login novo, F5, restart). */}
              <AnimatePresence>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={serieTempo} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <defs>
                      <linearGradient id="adm-tempo-fill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.32} />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                      {/* Clip-path animado (Framer Motion, não a animação nativa do
                        Recharts): a linha e a área ficam escondidas além do limite
                        direito deste retângulo, que cresce de 0 a 100% da largura —
                        revelando o desenho da esquerda pra direita. Mesma técnica,
                        mesma duração (2.5s) e mesmo easing (`easeInOut`) do card
                        "Visão Geral da Empresa" (`HeadcountOverviewCard.tsx`). */}
                      <clipPath id="adm-tempo-reveal-clip">
                        <motion.rect
                          key={serieTempo.length}
                          x="0"
                          y="0"
                          height="100%"
                          initial={{ width: 0 }}
                          animate={{ width: '100%' }}
                          transition={{ duration: 2.5, ease: 'easeInOut' }}
                        />
                      </clipPath>
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
                      isAnimationActive={false}
                      clipPath="url(#adm-tempo-reveal-clip)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </AnimatePresence>
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
                      {/* Preenchimento: degradê HORIZONTAL verde success → verde
                          lime, direto dos tokens do design system (`--success` →
                          `--primary` — o tema "Bombon Lime"; o mesmo par já usado
                          em `PagamentoBancarioWizard.tsx` e
                          `FGTSDigitalDashboard.tsx`). Trilho (`bg-muted/40`),
                          altura (`h-2`), arredondamento (`rounded-full`) e a
                          largura animada (logo abaixo) seguem intactos. */}
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-success to-primary"
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
            action={<PanelAction label="Ver todas" onClick={() => setAcoesAbertas(true)} />}
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
                      {/* `shrink-0` no número: com os 22px que a antiga seta
                          liberava, quem cresce é a label (`truncate` logo ao
                          lado, agora com a largura útil inteira) e quem cede
                          em card estreito também é ela — o número nunca é
                          cortado nem comprimido. */}
                      <span
                        className={cn('shrink-0 font-display text-base font-medium tabular-nums', TONE_TEXT[item.tone])}
                      >
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
            action={<PanelAction label="Ver todas" onClick={() => setProximasAbertas(true)} />}
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
                    className={cn('flex items-center gap-2 rounded-xl px-2 py-1 transition-colors', HOVER_LINHA_WIDGET)}
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
            action={<PanelAction label="Ver detalhes" onClick={() => setAreasAbertas(true)} />}
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
            action={<PanelAction label="Ver detalhes" onClick={() => setSlaAberto(true)} />}
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
                      className={cn(
                        'flex items-center gap-2 rounded-xl px-2 py-1 transition-colors',
                        HOVER_LINHA_WIDGET
                      )}
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

                {/* Rodapé de RESUMO do card: é o único item de leitura POSITIVA
                    dos quatro, então é o único pintado com a cor semântica de
                    sucesso — ícone, rótulo e valor no mesmo tom, sobre o fundo
                    `success/10` e a borda `success/20`. Nada de glow (o sistema
                    não usa brilho em superfícies) e nada de verde neon: só o
                    token `--success` já existente (142 71% 38% no claro /
                    142 76% 40% no escuro). Contraste medido no browser: 5,4:1
                    no tema dark — o "contraste alto" pedido — e 2,9:1 no claro,
                    que é o teto do próprio token quando o texto é verde sobre
                    tinta verde: `text-success` sobre o card branco já é 3,2:1,
                    como no "27%" de "Dentro do SLA" e no delta "+x%" daqui.
                    Geometria intacta: mesmo `rounded-xl`, mesmo `border` de
                    1px, mesmos `px-2.5 py-2` e o mesmo `mx-2` de antes — mudou
                    só a tinta, então nem o card, nem a altura (136px) da
                    viewport de rolagem se movem. */}
                <div className="mx-2 flex shrink-0 items-center justify-between gap-2 rounded-xl border border-success/20 bg-success/10 px-2.5 py-2">
                  <span className="flex items-center gap-1.5 text-caption font-body text-success">
                    {/* O ícone não declara cor própria: herda o `text-success`
                        do rótulo, para que os dois nunca saiam de sincronia. */}
                    <TrendingUp className="h-3.5 w-3.5" />
                    Taxa de conclusão
                  </span>
                  <span className="flex items-baseline gap-1.5">
                    <span className="font-display text-base font-medium leading-none tabular-nums text-success">
                      {stats.taxaConclusao}%
                    </span>
                    {stats.variacaoConclusao && (
                      <span
                        className={cn(
                          'text-caption font-medium tabular-nums',
                          stats.variacaoConclusao.value >= 0 ? 'text-success' : 'text-destructive-vivid'
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

      {/* ── Modais de detalhe dos quatro widgets ───────────────────────────────
          Cada atalho do cabeçalho ("Ver todas" / "Ver detalhes") abre o modal
          correspondente, construído sobre o MESMO `AnimatedCascadeDialog` do
          popup "Pendências" da área de Colaboradores — overlay, blur, botão X,
          tamanho, transição e scroll interno idênticos (nada de um segundo
          padrão de modal). Ficam FORA do `AnimatePresence` das faixas de cards
          porque não pertencem ao fluxo do layout: eles abrem em portal, por
          cima da tela, e não empurram nem medem nada dos cards.

          Os dados vêm do `stats` (o mesmo objeto que alimenta os cards), então
          o número exibido no card e a lista do modal nunca divergem. A única
          coisa montada aqui, no ato do render, é o destino do "Resolver agora",
          que depende da navegação (aba interna, `/exames` ou `/esocial`). */}
      <AcoesPrioritariasDialog
        open={acoesAbertas}
        onOpenChange={setAcoesAbertas}
        itens={stats.prioridadesDetalhe.map((item) => ({ ...item, resolver: resolverDaPrioridade(item.id) }))}
      />
      <ProximasAdmissoesDialog
        open={proximasAbertas}
        onOpenChange={setProximasAbertas}
        admissoes={stats.proximasDetalhe}
      />
      <DistribuicaoAreaDialog
        open={areasAbertas}
        onOpenChange={setAreasAbertas}
        areas={stats.areasCompletas}
        total={lista.length}
      />
      <SlaAlertasDialog
        open={slaAberto}
        onOpenChange={setSlaAberto}
        dentro={stats.dentroDoSlaDetalhe}
        risco={stats.emRiscoDetalhe}
        atrasadas={stats.atrasadasDetalhe}
        taxaConclusao={stats.taxaConclusao}
        variacaoConclusao={stats.variacaoConclusao?.value ?? null}
      />
    </div>
  );
}
