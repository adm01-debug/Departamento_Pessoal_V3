/**
 * ============================================================================
 * Gestão de Candidatos — aba "Gestão de Candidatos" do módulo de Admissões.
 *
 * RECONSTRUÇÃO COMPLETA da área (antes: grade de cards grandes). A tela agora
 * segue a referência de painel operacional, em quatro faixas:
 *   1. KPIs compactos (4 `MetricCard` — MESMO card do Dashboard de Admissões);
 *   2. barra de filtros horizontal (busca em destaque + selects compactos +
 *      "Mais filtros" + "Limpar filtros");
 *   3. faixa de etapas em pills (filtro rápido, contador em badge);
 *   4. container principal da listagem com cabeçalho interno (título, contador,
 *      alternância Tabela/Cards e ordenação), a TABELA (padrão) ou a grade de
 *      cards densos e o rodapé de paginação.
 *
 * REGRA DE IDENTIDADE: só permanecem fiéis ao sistema as CORES (tokens de
 * `src/index.css`), os ÍCONES (`lucide-react`) e a TIPOGRAFIA (`font-display` /
 * `font-body`). Layout, densidade, hierarquia e organização foram refeitos.
 *
 * Toda a matemática (prazo, progresso, iniciais) vem de `admissoesDerivacoes.ts`
 * — a MESMA régua do Dashboard, para que card e tabela nunca mostrem números
 * diferentes para o mesmo candidato. A lógica de dados (admissões, envio de
 * link/WhatsApp, abertura do detalhe) continua na página; aqui só há
 * apresentação + estado de UI (filtros, ordenação, página, visualização).
 * ============================================================================
 */
import { useMemo, useState, useTransition, type ElementType } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  ArrowUpDown,
  Building2,
  Calendar,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock,
  Eye,
  ExternalLink,
  FileText,
  FilterX,
  LayoutGrid,
  List,
  Mail,
  MessageSquare,
  MoreHorizontal,
  Search,
  Send,
  SlidersHorizontal,
  Table2,
  Users,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Table, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CascadeTableBody, CascadeTableRow } from '@/components/ui/cascade-table';
import { EmptyList, EmptySearch } from '@/components/ui/empty-state';
import { SlidingIndicator } from '@/components/ui/sliding-indicator';
import { Spinner } from '@/components/ui/spinner';
import { MetricCard, cardVariants } from '@/components/dashboard/MetricCard';
import { cn } from '@/lib/utils';
import { formatCurrency, formatDate } from '@/utils/format';
import { ETAPA_BADGE } from './admissoesComum';
import {
  DIA_MS,
  dataValida,
  diasAteHoje,
  inicioDoDia,
  iniciais,
  progressoValor,
  type AdmissaoLike,
} from './admissoesDerivacoes';

/* ─── Constantes de apresentação ─────────────────────────────────────────── */

/**
 * Etapas na ordem do fluxo, com os rótulos que o RH usa nesta tela (os mesmos
 * da referência: "Aguardando Exame" / "Contrato Gerado" em vez de "Exame" /
 * "Contrato"). `todos` é o item ativo padrão.
 */
const ETAPA_PILULAS: readonly { value: string; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'solicitacao', label: 'Solicitação' },
  { value: 'documentos', label: 'Docs Pendentes' },
  { value: 'validacao', label: 'Em Validação' },
  { value: 'exame', label: 'Aguardando Exame' },
  { value: 'contrato', label: 'Contrato Gerado' },
  { value: 'assinatura', label: 'Assinatura' },
  { value: 'esocial', label: 'eSocial' },
  { value: 'concluida', label: 'Concluída' },
  { value: 'cancelada', label: 'Cancelada' },
];

const ETAPA_LABELS: Record<string, string> = Object.fromEntries(
  ETAPA_PILULAS.filter((p) => p.value !== 'todos').map((p) => [p.value, p.label])
);

/** Ordem usada pela ordenação "Etapa" (índice do rótulo na faixa de pills). */
const ETAPA_ORDEM: Record<string, number> = Object.fromEntries(ETAPA_PILULAS.map((p, i) => [p.value, i]));

const STATUS_LABELS: Record<string, string> = {
  rascunho: 'Rascunho',
  em_andamento: 'Em andamento',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
};

const PERIODOS: readonly { value: string; label: string }[] = [
  { value: 'todos', label: 'Todo o período' },
  { value: '30', label: 'Últimos 30 dias' },
  { value: '90', label: 'Últimos 90 dias' },
  { value: '180', label: 'Últimos 6 meses' },
  { value: '365', label: 'Último ano' },
];

const ORDENACOES: readonly { value: string; label: string }[] = [
  { value: 'recentes', label: 'Mais recentes' },
  { value: 'antigos', label: 'Mais antigos' },
  { value: 'maior_prazo', label: 'Maior prazo' },
  { value: 'menor_prazo', label: 'Menor prazo' },
  { value: 'etapa', label: 'Etapa' },
  { value: 'responsavel', label: 'Responsável' },
];

/** Idade máxima da cascata de entrada (mesma trava do restante do módulo). */
const MAX_STAGGER = 5;

/* ─── Orquestração da ENTRADA em ONDAS (overlap suave) ──────────────────────
 * A animação VISUAL de cada peça continua sendo a MESMA `cardVariants` dos KPI
 * Cards do Dashboard Executivo (opacity 0→1, y 20→0, 0.4s, `[0.25, 0.46, 0.45,
 * 0.94]`), importada de `dashboard/MetricCard.tsx`.
 *
 * A ORDEM continua de cima para baixo (filtros → chips → card → linhas), mas as
 * ondas se SOBREPÕEM: cada grupo tem um deslocamento ABSOLUTO curto a partir do
 * mount e o próximo começa ~120–200ms depois — ninguém fica "esperando a vez".
 * Nada de `PRÓXIMA_ETAPA = ETAPA_ANTERIOR_FIM`; offsets absolutos, fáceis de
 * afinar no olho:
 *
 *   FILTROS   início 0,05s · stagger 28ms
 *   CHIPS     início 0,18s · stagger 22ms
 *   CARD      início 0,38s
 *   LINHAS    início 0,52s · stagger 40ms (valores em `ui/table-row-reveal.ts`)
 *
 * Os KPIs (acima) rodam a própria animação, intactos, em paralelo.
 * `cardVariants` calcula `delay = custom × 0.08s`; `slot()` converte o atraso em
 * SEGUNDOS para o `custom` que ela espera — nenhum valor visual é reescrito. */
const INICIO_FILTROS = 0.05;
const PASSO_FILTROS = 0.028;
const INICIO_CHIPS = 0.18;
const PASSO_CHIPS = 0.022;
const INICIO_CARD = 0.38;

const PASSO_CARD_VARIANTS = 0.08; // == passo de delay da `cardVariants`
const slot = (segundos: number) => segundos / PASSO_CARD_VARIANTS;

/** `custom` da `cardVariants` para o item `i` da onda de FILTROS. */
const slotFiltro = (i: number) => slot(INICIO_FILTROS + i * PASSO_FILTROS);
/** `custom` da `cardVariants` para o chip `j` da onda de CHIPS. */
const slotChip = (j: number) => slot(INICIO_CHIPS + j * PASSO_CHIPS);

/* A cascata de ENTRADA das linhas da tabela (variant + timings) vem de
 * `ui/table-row-reveal.ts` — FONTE ÚNICA compartilhada com a Auditoria Global,
 * para que as duas listas nunca divirjam. */

/** `Card` animável pela MESMA `cardVariants` dos KPIs — `motion.create(Card)`,
 *  exatamente o caminho do `DashboardExecutivoPage`. */
const MotionCard = motion.create(Card);

export type GestaoVisualizacao = 'tabela' | 'cards';

/**
 * Quantidade por página POR MODO. A Tabela mantém o de sempre (10/20/50); os
 * Cards usam múltiplos de 3 — a grade entrega 3 cards por linha no desktop, e
 * 12 = 4 linhas COMPLETAS (10 deixaria a última linha pela metade: 3+3+3+1).
 */
const POR_PAGINA_POR_MODO: Record<GestaoVisualizacao, readonly number[]> = {
  tabela: [10, 20, 50],
  cards: [12, 24, 36],
};

/** Itens por página padrão de cada modo (o 1º da respectiva lista). */
const PADRAO_POR_MODO: Record<GestaoVisualizacao, number> = {
  tabela: 10,
  cards: 12,
};

/** Props do componente: dados + os três handlers que a página já possuía. */
export interface GestaoCandidatosProps {
  admissoes: AdmissaoLike[];
  isLoading: boolean;
  sendingLink: string | null;
  onEnviarLink: (admissao: any) => void | Promise<void>;
  onEnviarWhatsApp: (admissao: any) => void | Promise<void>;
  onOpenDetalhes: (admissao: any) => void;
}

/** Ações repassadas às linhas da tabela e aos cards. */
type AcoesProps = Pick<
  GestaoCandidatosProps,
  'sendingLink' | 'onEnviarLink' | 'onEnviarWhatsApp' | 'onOpenDetalhes'
> & {
  admissao: AdmissaoLike;
};

/* ─── Helpers puros de filtro/derivação de tela ──────────────────────────── */

/** Responsável do processo (vem do metadata; sem valor cai no rótulo padrão). */
function responsavelDe(a: AdmissaoLike): string {
  return (a.metadata?.responsavel ?? '').trim() || 'Não atribuído';
}

/** Salário proposto (a coluna pode não existir em toda base). */
function salarioDe(a: AdmissaoLike): number {
  const valor = (a as { salario_proposto?: number | string | null }).salario_proposto;
  const numero = typeof valor === 'string' ? Number(valor) : valor;
  return typeof numero === 'number' && Number.isFinite(numero) ? numero : 0;
}

/** Valores únicos e ordenados (alimenta os selects de filtro). */
function valoresUnicos(valores: (string | null | undefined)[]): string[] {
  return Array.from(new Set(valores.map((v) => (v ?? '').trim()).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, 'pt-BR')
  );
}

/**
 * Variação percentual dos últimos 30 dias contra os 30 anteriores (`created_at`).
 * `referencia` entra por parâmetro (e não `Date.now()` aqui dentro) para a
 * função continuar PURA — mesma entrada, mesma saída. Sem base anterior não
 * existe comparação honesta → `undefined`.
 */
function variacaoRecente(lista: AdmissaoLike[], referencia: number): { value: number; label: string } | undefined {
  const fim = referencia;
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

/* ─── Peças de célula (reaproveitadas pela tabela e pelo modo cards) ──────── */

function CandidatoAvatar({ nome, className }: { nome?: string | null; className?: string }) {
  return (
    <Avatar className={cn('h-8 w-8 border border-border/40', className)}>
      <AvatarFallback className="bg-primary/10 text-[11px] font-medium text-primary">{iniciais(nome)}</AvatarFallback>
    </Avatar>
  );
}

/**
 * Selo de etapa — MESMO mapa de cores de `admissoesComum.ts` (card e modal).
 *
 * O selo ocupa SEMPRE uma única linha. O `Badge` é um `inline-flex` sem
 * `whitespace-nowrap`, então quando a coluna "Etapa Atual" apertava o rótulo
 * quebrava no espaço ("Docs Pendentes", "Em Validação", "Aguardando Exame",
 * "Contrato Gerado") e o selo virava dois andares — medido em Chromium real a
 * 1366px: 83x37px contra 123x21px do rótulo inteiro. Com `whitespace-nowrap` o
 * `min-content` do selo passa a ser o rótulo completo e a coluna (automática,
 * sem largura fixa) cresce só o necessário para ele; se a tabela não couber, o
 * `overflow-auto` de `ui/table` rola na horizontal — o rótulo NUNCA é cortado
 * nem empilhado (mesma régua já adotada nas pills de etapa desta tela).
 * `shrink-0` é o mesmo contrato na visão Cards, onde o selo divide um `flex`
 * com o bloco do nome e seria esmagado pelo `min-w-0` vizinho.
 */
function EtapaBadge({ etapa }: { etapa?: string | null }) {
  const chave = etapa ?? '';
  return (
    <Badge
      variant="outline"
      className={cn(
        'shrink-0 whitespace-nowrap border-0 font-medium',
        ETAPA_BADGE[chave] || 'bg-muted/60 text-muted-foreground'
      )}
    >
      {ETAPA_LABELS[chave] || etapa || '—'}
    </Badge>
  );
}

/** Barra de progresso compacta + percentual — identidade cromática do sistema. */
function ProgressoBar({ admissao }: { admissao: AdmissaoLike }) {
  const valor = progressoValor(admissao);
  return (
    <div className="flex items-center gap-2">
      <Progress value={valor} className="h-1.5 w-16 bg-muted" indicatorClassName="bg-primary" />
      <span className="w-9 text-right text-xs font-medium tabular-nums text-foreground">{valor}%</span>
    </div>
  );
}

/**
 * Prazo com o texto auxiliar do estado. Estados críticos ganham destaque:
 * atraso na variante vibrante da área, vencimento em <= 7 dias em âmbar.
 */
function PrazoCell({ admissao, hoje }: { admissao: AdmissaoLike; hoje: number }) {
  const data = dataValida(admissao.data_prevista);
  const dias = diasAteHoje(admissao.data_prevista, hoje);
  if (!data || dias === null) {
    return <span className="text-xs text-muted-foreground">Sem data prevista</span>;
  }
  const auxiliar = dias < 0 ? `atrasado ${Math.abs(dias)}d` : dias === 0 ? 'vence hoje' : `em ${dias} dias`;
  const tom = dias < 0 ? 'text-destructive-vivid' : dias <= 7 ? 'text-warning' : 'text-muted-foreground';
  return (
    <div className="leading-tight">
      <span className="block text-xs font-medium tabular-nums text-foreground">{data.toLocaleDateString('pt-BR')}</span>
      <span className={cn('block text-[11px]', tom, dias < 0 && 'font-medium')}>{auxiliar}</span>
    </div>
  );
}

/** Responsável: avatar pequeno com iniciais + nome. */
function ResponsavelCell({ nome }: { nome: string }) {
  return (
    <div className="flex items-center gap-2">
      <Avatar className="h-6 w-6 border border-border/40">
        <AvatarFallback className="bg-muted text-[9px] font-medium text-muted-foreground">
          {iniciais(nome)}
        </AvatarFallback>
      </Avatar>
      <span className="truncate text-xs text-foreground">{nome}</span>
    </div>
  );
}

/**
 * Botões de ação de uma linha/card: atalho para o detalhe + menu com o envio de
 * link (mesmas ações e mesmo tratamento de `sendingLink` da tela anterior).
 *
 * COR (contrato): o olho ("Ver detalhes") repousa no AZUL do design system —
 * `text-info`, o mesmo par dos botões de "Ver perfil"/"Visualizar" do projeto
 * (`ColaboradorTable` / `ColaboradorDirectoryGrid`: `h-8 w-8 rounded-lg
 * hover:bg-info/10 text-info`). Só a COR mudou: tamanho, posição, espaçamento e
 * hover seguem idênticos, sem glow e sem pintar a linha (o `hover:bg-muted/50`
 * do `TableRow` é do componente base e continua sendo o único fundo de linha).
 * O trigger de três pontos fica NEUTRO (`text-muted-foreground`): ele abre um
 * menu, não navega — só a ação com destino carrega o azul semântico.
 */
function AcoesCandidato({ admissao, sendingLink, onEnviarLink, onEnviarWhatsApp, onOpenDetalhes }: AcoesProps) {
  const enviando = sendingLink === admissao.id;
  return (
    <div className="flex items-center justify-end gap-1">
      <InfoTooltip content="Ver detalhes">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-lg text-info hover:bg-info/10 hover:text-info"
          onClick={() => onOpenDetalhes(admissao)}
          aria-label={`Ver detalhes de ${admissao.nome ?? 'candidato'}`}
        >
          <Eye className="h-4 w-4" />
        </Button>
      </InfoTooltip>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
            disabled={enviando}
            aria-label={`Mais ações de ${admissao.nome ?? 'candidato'}`}
          >
            {enviando ? <Spinner size="sm" /> : <MoreHorizontal className="h-4 w-4" />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="rounded-xl">
          <DropdownMenuItem onClick={() => onOpenDetalhes(admissao)} className="gap-2 cursor-pointer">
            <ExternalLink className="h-4 w-4 text-info" /> Abrir detalhes
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => onEnviarLink(admissao)} className="gap-2 cursor-pointer">
            <Mail className="h-4 w-4 text-primary" /> Enviar por e-mail
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onEnviarWhatsApp(admissao)} className="gap-2 cursor-pointer">
            <MessageSquare className="h-4 w-4 text-success" /> Enviar por WhatsApp
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

/* ─── Controles da barra de filtros / faixa de etapas ────────────────────── */

/**
 * Select compacto de duas linhas (rótulo pequeno + valor), no padrão da
 * referência. O valor `'todos'` é o sentinela de "sem filtro" (o Radix Select
 * não aceita string vazia).
 *
 * CORTE DO VALOR EM UMA LINHA: o `@radix-ui/react-select` (2.3.7) desestrutura
 * o `className` do `SelectValue` e NUNCA o repassa ao `<span>` que ele mesmo
 * renderiza (`const { className, style, ...valueProps } = props` → o span do
 * valor sai com `style={{ pointerEvents: 'none' }}` e sem classe alguma), então
 * `truncate`/`text-xs`/... postos no `SelectValue` são letra morta — e o valor
 * ficava livre para QUEBRAR em duas linhas ("Todo o período" → "Todo o" /
 * "período", estourando a altura do trigger). O corte tem de vir do PAI, via
 * `[&>span:last-child]` (o 1º span é o rótulo, o último é o valor do Radix):
 * `w-full` prende o valor à largura disponível (sem isso o `nowrap` o deixaria
 * estourar por cima do chevron) e `truncate` troca a quebra por "…" só quando
 * a coluna encolhe além do necessário para caber o texto inteiro.
 */
function FiltroSelect({
  label,
  value,
  onChange,
  options,
  className,
}: {
  label: string;
  value: string;
  onChange: (valor: string) => void;
  options: readonly { value: string; label: string }[];
  className?: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={cn('h-10 rounded-lg border-border/40 bg-card px-3', className)}>
        <div className="flex min-w-0 flex-col items-start gap-0.5 text-left [&>span:last-child]:w-full [&>span:last-child]:truncate">
          <span className="text-[10px] uppercase leading-none tracking-wide text-muted-foreground">{label}</span>
          <SelectValue />
        </div>
      </SelectTrigger>
      {/* ABERTURA SEMPRE PARA BAIXO — `side="bottom"` + `align="start"` +
          `avoidCollisions={false}` (bottom-start, alinhado ao próprio trigger,
          com o `sideOffset = 4` que o `SelectContent` do app já aplica).
          Por que: com o padrão do Radix, o Floating UI troca o lado do popup
          quando ele não cabe abaixo do trigger (middleware `flip`) — e na
          página real, com o header + tablist acima, a faixa de filtros fica
          perto do fim da janela. Medido em Chromium real (1366x700, sidebar
          aberta): "Departamento" (10 opções ≈ 325px) e "Cargo" (39 opções, teto
          de 384px) abriam PARA CIMA e passavam por cima dos KPI cards.
          `avoidCollisions={false}` desliga `flip` E `shift`, congelando o
          `bottom-start` — o menu nunca mais sobe.
          O `max-h` pela altura disponível do popper é o contrapeso
          obrigatório: sem o `flip`, um menu mais alto que o espaço abaixo
          passaria da janela com as últimas opções inalcançáveis. O middleware
          `size` continua ativo mesmo com `avoidCollisions={false}` (ele não
          está atrás dessa flag no `PopperContent`) e escreve
          `--radix-popper-available-height` no próprio elemento flutuante — do
          qual o Radix deriva `--radix-select-content-available-height` — então
          o menu assume a altura do espaço real e ROLA por dentro dele. */}
      <SelectContent
        side="bottom"
        align="start"
        avoidCollisions={false}
        className="max-h-[var(--radix-select-content-available-height)]"
      >
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/**
 * Faixa de etapas: filtro rápido em pills, com o contador no badge.
 *
 * Diagramação: UMA única linha contínua, sem quebra (`flex-nowrap` na faixa e
 * `whitespace-nowrap` na pílula) — o defeito era a última pílula ("Cancelada")
 * caindo para a segunda linha. Como os rótulos/fonte são inegociáveis, a folga
 * necessária saiu só do que É permitido encolher: `gap` da faixa (6px), `gap`
 * interno da pílula (6px), `px` da pílula (6px) e `min-w` do badge (16px) —
 * ritmo único de 6px na faixa inteira.
 *
 * LARGURA: a faixa ocupa 100% da coluna e os chips a dividem
 * (`flex-1` em cada pílula + `justify-center` no conteúdo). Antes cada pílula
 * era `shrink-0` e a faixa simplesmente parava na última, deixando um vazio à
 * direita que crescia com a tela — medido em Chromium real: 12px em 1440px,
 * 109px em 1536px e 276px em 1920px de viewport. Com `flex-1`
 * (= `flex: 1 1 0%`) a soma das pílulas passa a ser sempre a largura da coluna,
 * então a última pílula termina no limite direito da área útil.
 * `flex-1` NÃO esmaga nem corta rótulo: o `min-width: auto` do flex continua
 * valendo e o piso de cada pílula é o próprio `min-content` (o rótulo inteiro,
 * com `whitespace-nowrap`) — mesmo mecanismo da tablist animada desta página,
 * que usa `flex-1` + `flex w-full` com a mesma justificativa. Quando a pílula
 * igual não couber o rótulo, ela para no tamanho natural; e se a coluna ficar
 * mais estreita que a soma dos 10 (medido: 1123px, contra 1062px de coluna em
 * 1366px com a sidebar aberta, 1136px em 1440px e 1400px em 1920px), a faixa
 * ROLA na horizontal (`overflow-x-auto`) — nunca empilha. O badge segue
 * `tabular-nums` + `shrink-0` para os números manterem o mesmo ritmo.
 */
function EtapaPills({
  ativo,
  contagens,
  onSelecionar,
}: {
  ativo: string;
  contagens: Record<string, number>;
  onSelecionar: (etapa: string) => void;
}) {
  return (
    <div className="flex flex-nowrap items-center gap-1.5 overflow-x-auto">
      {ETAPA_PILULAS.map((pill, index) => {
        const isAtivo = ativo === pill.value;
        const count = contagens[pill.value] ?? 0;
        return (
          <motion.button
            key={pill.value}
            type="button"
            custom={slotChip(index)}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            onClick={() => onSelecionar(pill.value)}
            aria-pressed={isAtivo}
            className={cn(
              'inline-flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border px-1.5 py-1.5 text-xs font-medium transition-colors duration-150',
              isAtivo
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border/40 bg-muted/30 text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            {pill.label}
            <span
              className={cn(
                'min-w-[16px] shrink-0 rounded-full px-1 text-center text-[10px] font-semibold leading-4 tabular-nums',
                isAtivo
                  ? 'bg-primary-foreground/20 text-primary-foreground'
                  : 'bg-muted-foreground/15 text-muted-foreground'
              )}
            >
              {count}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}

/**
 * Alternância Tabela/Cards (Tabela é o padrão).
 *
 * INDICADOR ÚNICO, CSS PURO (SEM Framer Motion): dois botões de largura IDÊNTICA
 * e UMA `div` lime permanente, `absolute`, do tamanho de UM botão, POR BAIXO
 * deles (`relative z-10`). O slide é uma `transition` NATIVA de `transform`
 * (`translate3d`), que roda no compositor/GPU — nenhum JS anima quadro a quadro.
 *
 * ESTADO VISUAL SEPARADO DA TROCA PESADA (a causa das microtravadas): `visual`
 * (local) move o indicador IMEDIATAMENTE no clique; a troca REAL de conteúdo
 * (Tabela ↔ Cards, que remonta tabela/grade) é disparada em `startTransition`,
 * isto é, como atualização NÃO urgente. O React pinta o novo `transform` no
 * trabalho urgente e processa o render pesado DEPOIS — o slide já está rodando
 * na GPU e não é bloqueado pelo commit da lista.
 *
 * POR QUE `grid-cols-2` E NÃO `flex-1`: num container de largura automática,
 * dois itens `flex-1` NÃO ficam com a mesma largura quando os rótulos diferem
 * ("Tabela" é mais largo que "Cards"): o item mais largo trava no próprio
 * `min-content` e o outro fica menor — e aí o indicador (50%) desalinha. Duas
 * colunas `1fr` garantem larguras IGUAIS, sem cortar texto.
 *
 * GEOMETRIA (sem medir DOM): container `p-1` (4px). O indicador fica em
 * `left: 4px` e `width: calc(50% - 4px)` — metade da caixa de padding (que é o
 * referencial de um filho absoluto) menos os 4px de padding —, ou seja,
 * exatamente a largura de UM botão. Assim `translate3d(100%,0,0)` (100% da
 * PRÓPRIA largura) cai exatamente sobre o 2º botão.
 */
function VisualizacaoToggle({
  value,
  onChange,
}: {
  value: GestaoVisualizacao;
  onChange: (v: GestaoVisualizacao) => void;
}) {
  const opcoes: { value: GestaoVisualizacao; label: string; icon: ElementType }[] = [
    { value: 'tabela', label: 'Tabela', icon: Table2 },
    { value: 'cards', label: 'Cards', icon: LayoutGrid },
  ];
  // Estado VISUAL (só do indicador): muda na hora e dirige apenas o `transform`.
  const [visual, setVisual] = useState<GestaoVisualizacao>(value);
  const [, startTransition] = useTransition();

  const trocar = (v: GestaoVisualizacao) => {
    if (v === visual) return;
    // 1) URGENTE: aplica o `transform` novo agora → o navegador inicia a
    //    transição de `transform` (GPU) já neste quadro.
    setVisual(v);
    // 2) NÃO urgente: a troca REAL de visão (render pesado de tabela/grade) vai
    //    como transição do React, fora do caminho crítico do slide.
    startTransition(() => onChange(v));
  };

  return (
    <div className="relative grid grid-cols-2 rounded-xl border border-border/40 bg-card/50 p-1">
      {/* UM contorno único e permanente — CSS puro, só `transform` (GPU).
          Peça COMPARTILHADA (`SlidingIndicator`): a MESMA animação também roda
          nos tabs de status da Jornada de Onboarding. */}
      <SlidingIndicator atual={visual === 'cards' ? 1 : 0} />
      {opcoes.map(({ value: v, label, icon: Icon }) => {
        const ativo = visual === v;
        return (
          <Button
            key={v}
            type="button"
            size="sm"
            variant="ghost"
            aria-pressed={ativo}
            onClick={() => trocar(v)}
            className={cn(
              'relative z-10 h-8 gap-1.5 rounded-lg border border-transparent px-3',
              ativo ? 'text-primary hover:bg-primary/10 hover:text-primary' : 'text-muted-foreground'
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </Button>
        );
      })}
    </div>
  );
}

/* ─── Tabela (visão padrão) ──────────────────────────────────────────────── */

/** Chave estável de uma linha (usa o id; sem ele, cai no nome). */
function chaveDe(a: AdmissaoLike): string {
  return String(a.id ?? a.nome ?? '');
}

/** Cabeçalho compartilhado pelas duas visões (mesma régua de colunas). */
const HEAD_CLASS = 'h-11 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground';

function TabelaCandidatos({
  itens,
  hoje,
  selecionados,
  onToggleTodos,
  onToggleLinha,
  chaveCascata,
  sendingLink,
  onEnviarLink,
  onEnviarWhatsApp,
  onOpenDetalhes,
}: {
  itens: AdmissaoLike[];
  hoje: number;
  selecionados: Set<string>;
  onToggleTodos: (marcar: boolean) => void;
  onToggleLinha: (id: string, marcar: boolean) => void;
  /** Muda quando a LISTA muda de identidade (página/ordenação/filtros). É o
   *  `key` do `<tbody>`, então reativa a cascata de entrada das linhas. */
  chaveCascata: string;
} & Omit<AcoesProps, 'admissao'>) {
  const idsPagina = itens.map(chaveDe);
  const todosMarcados = idsPagina.length > 0 && idsPagina.every((id) => selecionados.has(id));
  const algumMarcado = idsPagina.some((id) => selecionados.has(id));
  const cabecalho: boolean | 'indeterminate' = todosMarcados ? true : algumMarcado ? 'indeterminate' : false;

  return (
    <Table>
      <TableHeader>
        <TableRow className="border-border/30 bg-muted/40 hover:bg-muted/40">
          <TableHead className="h-11 w-10 pr-0">
            <Checkbox
              checked={cabecalho}
              onCheckedChange={(v) => onToggleTodos(v === true)}
              aria-label="Selecionar todos os candidatos da página"
            />
          </TableHead>
          <TableHead className={HEAD_CLASS}>Candidato</TableHead>
          <TableHead className={HEAD_CLASS}>Cargo</TableHead>
          <TableHead className={HEAD_CLASS}>Departamento</TableHead>
          <TableHead className={HEAD_CLASS}>Etapa Atual</TableHead>
          <TableHead className={cn(HEAD_CLASS, 'w-[150px]')}>Progresso</TableHead>
          <TableHead className={cn(HEAD_CLASS, 'w-[130px]')}>Prazo</TableHead>
          <TableHead className={cn(HEAD_CLASS, 'w-[170px]')}>Responsável</TableHead>
          <TableHead className={cn(HEAD_CLASS, 'w-[96px] text-right')}>Ações</TableHead>
        </TableRow>
      </TableHeader>
      {/* MECANISMO da cascata de entrada das linhas: `CascadeTableBody` +
          `CascadeTableRow` (ui/cascade-table.tsx) — a MESMA unidade usada pela
          lista da Auditoria, então as duas nunca divergem. A moldura
          (`AnimatePresence` sem props + `TableBody key={chaveCascata}`) e a
          linha (`motion.tr` com o variant compartilhado) vêm prontas de lá;
          aqui só passamos o `key` da cascata, o índice e o visual desta tela. */}
      <CascadeTableBody cascadeKey={chaveCascata}>
        {itens.map((a, i) => {
          const id = chaveDe(a);
          const marcado = selecionados.has(id);
          return (
            <CascadeTableRow
              key={id}
              index={i}
              data-state={marcado ? 'selected' : undefined}
              // Classes BASE do `TableRow` (ui/table) + ajustes desta tela.
              // (O `origin-center` do mecanismo fica no componente compartilhado.)
              className={cn(
                'border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted',
                'border-border/20 hover:bg-muted/30'
              )}
            >
              <TableCell className="py-3 pr-0">
                <Checkbox
                  checked={marcado}
                  onCheckedChange={(v) => onToggleLinha(id, v === true)}
                  aria-label={`Selecionar ${a.nome ?? 'candidato'}`}
                />
              </TableCell>
              <TableCell className="py-3">
                <div className="flex items-center gap-2.5">
                  <CandidatoAvatar nome={a.nome} />
                  <span className="truncate text-sm font-medium text-foreground">{a.nome || 'Candidato sem nome'}</span>
                </div>
              </TableCell>
              <TableCell className="py-3 text-xs text-muted-foreground">{a.cargo || '—'}</TableCell>
              <TableCell className="py-3 text-xs text-muted-foreground">{a.departamento || '—'}</TableCell>
              <TableCell className="py-3">
                <EtapaBadge etapa={a.etapa} />
              </TableCell>
              <TableCell className="py-3">
                <ProgressoBar admissao={a} />
              </TableCell>
              <TableCell className="py-3">
                <PrazoCell admissao={a} hoje={hoje} />
              </TableCell>
              <TableCell className="py-3">
                <ResponsavelCell nome={responsavelDe(a)} />
              </TableCell>
              <TableCell className="py-3 text-right">
                <AcoesCandidato
                  admissao={a}
                  sendingLink={sendingLink}
                  onEnviarLink={onEnviarLink}
                  onEnviarWhatsApp={onEnviarWhatsApp}
                  onOpenDetalhes={onOpenDetalhes}
                />
              </TableCell>
            </CascadeTableRow>
          );
        })}
      </CascadeTableBody>
    </Table>
  );
}

/* ─── Cards (visão alternativa, densa e horizontal) ──────────────────────── */

/**
 * Bloco de informação da ficha compacta: ícone + rótulo pequeno e o valor logo
 * abaixo — a leitura de três colunas laterais da referência.
 *
 * O ícone fica INLINE com o rótulo (mesma linha, `flex items-center gap-1`) e o
 * valor nasce abaixo, na borda esquerda do bloco: assim o ícone marca o tipo do
 * dado (departamento / data / salário) e o valor usa a LARGURA INTEIRA da
 * coluna — era o recuo do valor atrás do ícone que roubava 20px da coluna mais
 * estreita.
 *
 * UMA LINHA E SEM CORTE: rótulo e valor saem SEM
 * `truncate`/`line-clamp`/`text-ellipsis`. O VALOR é curto e fica em
 * `whitespace-nowrap` (nunca quebra nem sai da coluna: o maior valor dos dados
 * reais — "R$ 11.200,00", 74px medidos — cabe nos ≈91px da coluna mais estreita,
 * a 1280px em 3 colunas). O RÓTULO é a exceção deliberada: se a coluna ficar
 * mais estreita que o texto ("Admissão prevista" ≈ 103px com o ícone, contra
 * ≈91px de coluna a 1280px), ele quebra ENTRE PALAVRAS — "Admissão" /
 * "prevista" — em vez de virar "Admissão previs…" (proibido pela referência) ou
 * de empurrar o bloco inteiro para baixo do vizinho. Uma linha de 12,5px a mais
 * nessa coluna estreita é o preço de manter os TRÊS blocos sempre na horizontal.
 */
function InfoCandidato({
  icon: Icon,
  label,
  value,
  valueClassName,
}: {
  icon: ElementType;
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="min-w-0 flex-1">
      <p className="flex min-w-0 items-center gap-1 text-[10px] leading-tight text-muted-foreground">
        <Icon className="h-3 w-3 shrink-0" aria-hidden />
        <span className="min-w-0">{label}</span>
      </p>
      <p className={cn('mt-0.5 whitespace-nowrap text-xs font-medium leading-tight text-foreground', valueClassName)}>
        {value}
      </p>
    </div>
  );
}

/**
 * Menu ⋮ do card (canto superior direito). Repete EXATAMENTE o conteúdo do menu
 * da coluna "Ações" da tabela (`AcoesCandidato`) — "Abrir detalhes", "Enviar por
 * e-mail" e "Enviar por WhatsApp" —, só mudando a POSIÇÃO: no card ele mora no
 * topo, ao lado do selo de etapa, e as duas ações de destino ganham botão
 * próprio no rodapé ("Enviar Link" / "Detalhes"). As ações continuam sendo as
 * MESMAS props (`sendingLink` desabilita e mostra o spinner), sem lógica nova.
 */
function MenuCardCandidato({ admissao, sendingLink, onEnviarLink, onEnviarWhatsApp, onOpenDetalhes }: AcoesProps) {
  const enviando = sendingLink === admissao.id;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
          disabled={enviando}
          aria-label={`Mais ações de ${admissao.nome ?? 'candidato'}`}
        >
          {enviando ? <Spinner size="sm" /> : <MoreHorizontal className="h-4 w-4" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="rounded-xl">
        <DropdownMenuItem onClick={() => onOpenDetalhes(admissao)} className="gap-2 cursor-pointer">
          <ExternalLink className="h-4 w-4 text-info" /> Abrir detalhes
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onEnviarLink(admissao)} className="gap-2 cursor-pointer">
          <Mail className="h-4 w-4 text-primary" /> Enviar por e-mail
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onEnviarWhatsApp(admissao)} className="gap-2 cursor-pointer">
          <MessageSquare className="h-4 w-4 text-success" /> Enviar por WhatsApp
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Grade de cards — a ficha compacta da referência do RH, em quatro faixas:
 *   1. TOPO: `[avatar] [Nome + Cargo] … [Selo] [⋮]` — a tag/status fica SEMPRE
 *      no canto superior direito e NUNCA desce para baixo do nome (ver o
 *      contrato do header);
 *   2. PROGRESSO: barra larga + percentual, em uma linha baixa;
 *   3. INFORMAÇÕES: `Departamento` / `Admissão prevista` / `Salário` LADO A
 *      LADO (summary card), cada um com ícone + rótulo pequeno + valor;
 *   4. RODAPÉ: responsável à esquerda, ações ("Enviar Link" / "Detalhes") à
 *      direita.
 *
 * DENSIDADE (o objetivo desta rodada): o card é montado como faixas de ALTURA
 * MÍNIMA, com o espaço distribuído na HORIZONTAL. Medido em Chromium real
 * (Playwright, com os dados reais da tela): com os três blocos de informação
 * empilhados o card tinha 258px de altura a 1920px (e 329px a 1280px); com a
 * terceira faixa na horizontal a altura cai para ≈180px a 1920px (≈30% mais
 * baixo). O TOPO NUNCA QUEBRA: a tag/status fica sempre no canto superior
 * direito e, quando falta largura, quem trunca é o NOME (ver o contrato do
 * header). No RODAPÉ, se o nome do responsável for longo, o par de ações
 * [Enviar Link + Detalhes] desce UMA linha inteiro — o card ainda segue mais
 * largo do que alto.
 * Os respiros são curtos de propósito (`gap-3` no topo, `mt-1.5`/`mt-2` +
 * `pt-2` entre as faixas) e as duas divisórias são as MESMAS bordas sutis de
 * antes (`border-border/20`): elas separam identidade / resumo / ações sem
 * virar "card dentro de card".
 *
 * `flex flex-col` no card + `mt-*` dão a altura uniforme entre os cards da
 * mesma linha.
 *
 * GRADE EM 3 COLUNAS (contrato da rodada anterior, mantido): o `auto-fit`
 * antigo abria 4+ colunas em desktop largo e espremia cada card a ≈266px —
 * nome, cargo, departamento, data, salário e responsável saíam com "…",
 * apertados e desalinhados. Agora a grade é EXPLÍCITA — 1 coluna no mobile, 2
 * no tablet (`sm`) e 3 no desktop LARGO (`xl`), ocupando 100% da largura do
 * container, com gap uniforme de 16px. O `xl` (1280px) não é arbitrário: com a
 * sidebar aberta (256px) sobram ≈974px de conteúdo a 1280px e ≈794px a 1100px,
 * e em 3 colunas isso daria cards de ≈303px e ≈243px — a 243px de card (213px
 * úteis) o PRÓPRIO nome não cabe em uma linha ao lado do avatar ("Débora
 * Figueiredo Antunes" mede 183px + 40px de avatar + gap), e o texto vazava para
 * fora do card. Com 2 colunas nessa faixa o card fica com ≈389px e tudo entra
 * completo; de 1280px para cima são exatamente 3 colunas (≈303px a 1280 e
 * ≈357px a 1440), nunca 4 — o mesmo breakpoint `xl` que a grade de KPIs desta
 * tela já usa.
 *
 * FUNDO DO CARD (rodada desta vez — SÓ pintura: nenhum tamanho, espaçamento,
 * tipografia, ícone, selo ou botão mudou): o card é uma superfície NEUTRA —
 * separa-se do fundo pelo degrau de luminância + borda + sombra, NUNCA por
 * colorir a superfície. A base é `bg-card/85` (navy/charcoal de `--card` a 85%
 * sobre o `--background` da página — ≈ rgb(17,27,41) sobre rgb(11,18,30), só um
 * nível de diferença, sem gradiente). Foi REMOVIDO o degradê vertical com o
 * verde `--success` (`from-success/12 … to-success/8`) que pesava a superfície e
 * competia com as cores semânticas dos badges — o verde agora existe SÓ nos
 * badges/indicadores/barra de progresso, nunca no fundo permanente do card. A
 * borda é neutra e discreta (`border-border/40`) e a sombra é mínima
 * (`shadow-sm shadow-black/25`, 1–2px, sem glow). No hover a base fecha em
 * `bg-card` cheio (um degrau mais claro, ainda navy) e a borda recebe um fio
 * neutro de destaque (`hover:border-primary/25`); a sombra sobe discretamente
 * (`hover:shadow-md`). Como só `background-color` é usada, nada mais no card
 * precisa de `relative`/`overflow-hidden`.
 *
 * NADA além do LAYOUT (na rodada da densidade) e do FUNDO (nesta rodada) mudou:
 * ícones (`lucide-react`), tipografia (`font-*`), `rounded-xl` do card e TODA a
 * matemática (`progressoValor`, `diasAteHoje`, `iniciais`, `salarioDe`,
 * `formatDate`, `formatCurrency`) continuam as MESMAS da tabela e do dashboard.
 * "Salário" só aparece quando o dado existe na base (`salario_proposto > 0`) —
 * sem valor, mostra "—", nunca um número inventado.
 */

function CardsCandidatos({
  itens,
  hoje,
  sendingLink,
  onEnviarLink,
  onEnviarWhatsApp,
  onOpenDetalhes,
}: { itens: AdmissaoLike[]; hoje: number } & Omit<AcoesProps, 'admissao'>) {
  return (
    <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3">
      {itens.map((a, i) => {
        const progresso = progressoValor(a);
        const salario = salarioDe(a);
        const responsavel = responsavelDe(a);
        const dias = diasAteHoje(a.data_prevista, hoje);
        const tomData = dias === null || dias > 7 ? '' : dias < 0 ? 'text-destructive-vivid' : 'text-warning';
        const enviando = sendingLink === a.id;
        return (
          <motion.div
            key={chaveDe(a)}
            custom={Math.min(i, MAX_STAGGER)}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            className="flex flex-col rounded-xl border border-border/40 bg-card/85 p-3.5 shadow-sm shadow-black/25 transition-[background-color,border-color,box-shadow] hover:border-primary/25 hover:bg-card hover:shadow-md"
          >
            {/* TOPO — identidade à esquerda e status/ações FIXOS no topo-direita.
                REGRA DEFINITIVA: TODA tag/status fica SEMPRE no canto superior
                direito — nunca abaixo do nome, nunca em 2 linhas, em card nenhum.
                O header é UMA linha em `flex items-start` e NÃO tem `flex-wrap`
                (num flex sem wrap um item JAMAIS desce para a linha de baixo).
                São três blocos, nesta ordem:
                  a) AVATAR à esquerda, `shrink-0`;
                  b) bloco de texto nome+cargo (`flex-1 min-w-0` + `flex-col`) —
                     é o ÚNICO que cede espaço: nome e cargo truncam em 1 linha
                     com reticências (`truncate` + `overflow-hidden` +
                     `whitespace-nowrap` + `text-ellipsis`);
                  c) bloco status/ações (`shrink-0 whitespace-nowrap self-start
                     items-center`): o `shrink-0` RESERVA a largura natural da tag
                     + menu (a maior tag do sistema — "Aguardando Exame",
                     "Em Validação", "Docs Pendentes" — cabe inteira), o
                     `whitespace-nowrap` impede qualquer quebra e o `self-start`
                     ancora o bloco ao TOPO-direita.
                Quando falta espaço, quem trunca é o NOME (prioridade menor que a
                tag): a tag nunca é esmagada nem reposicionada. */}

            <div className="flex items-start gap-3">
              <CandidatoAvatar nome={a.nome} className="h-9 w-9 shrink-0" />
              <div className="flex min-w-0 flex-1 flex-col">
                <p className="truncate overflow-hidden text-ellipsis whitespace-nowrap text-[15px] font-semibold leading-tight text-foreground">
                  {a.nome || 'Candidato sem nome'}
                </p>
                <p className="mt-0.5 truncate overflow-hidden text-ellipsis whitespace-nowrap text-xs leading-tight text-muted-foreground">
                  {a.cargo || '—'}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2 self-start whitespace-nowrap">
                <EtapaBadge etapa={a.etapa} />
                <MenuCardCandidato
                  admissao={a}
                  sendingLink={sendingLink}
                  onEnviarLink={onEnviarLink}
                  onEnviarWhatsApp={onEnviarWhatsApp}
                  onOpenDetalhes={onOpenDetalhes}
                />
              </div>
            </div>

            {/* PROGRESSO — faixa 2: barra larga + percentual, uma linha baixa
                (a barra ocupa toda a sobra horizontal; o `w-9` fixa a coluna do
                percentual para os cards da linha ficarem alinhados). */}
            <div className="mt-1.5 flex items-center gap-2">
              <Progress value={progresso} className="h-1.5 flex-1 bg-muted" indicatorClassName="bg-primary" />
              <span className="w-9 shrink-0 text-right text-xs font-semibold tabular-nums text-foreground">
                {progresso}%
              </span>
            </div>

            {/* INFORMAÇÕES — faixa 3: os três blocos LADO A LADO, ocupando um
                TERÇO cada (`flex-1` = `flex: 1 1 0%` + `min-w-0`). É a grade
                lateral da referência — Departamento / Admissão prevista /
                Salário — e a distribuição é FIXA (frações iguais), não
                "largura natural + quebra": assim os três NUNCA se empilham, em
                viewport nenhum, e as colunas ficam alinhadas de um card para o
                outro.
                Cabe sem aperto: a soma das larguras naturais (≈266px — cada
                bloco é o máximo entre "Admissão prevista" com o ícone, 103px, e
                os valores) fica abaixo dos ≈415px úteis a 1920px, dos ≈327px a
                1440px e do ≈114px por coluna da faixa de 2 colunas. Só abaixo de
                ~1400px (card de 332px a 1366 e de 303px a 1280) a coluna de
                1/3 fica menor que o rótulo mais longo — aí ele quebra em duas
                linhas, o que custa 12,5px e mantém os três blocos na mesma
                horizontal, como pede a referência.
                A divisória superior é a MESMA borda sutil do rodapé
                (`border-border/20`): separa identidade / resumo / ações sem
                criar "cards dentro do card". */}
            <div className="mt-2 flex items-start gap-x-2 border-t border-border/20 pt-2">
              <InfoCandidato icon={Building2} label="Departamento" value={a.departamento || '—'} />
              <InfoCandidato
                icon={Calendar}
                label="Admissão prevista"
                value={formatDate(a.data_prevista)}
                valueClassName={tomData}
              />
              <InfoCandidato
                icon={CircleDollarSign}
                label="Salário"
                value={salario > 0 ? formatCurrency(salario) : '—'}
              />
            </div>

            {/* RODAPÉ — faixa 4: responsável à esquerda, ações à direita. Aqui NÃO
                há truncamento (ao contrário do header): `flex-wrap` + nome em
                `whitespace-nowrap`. Se o nome do responsável for longo, o bloco
                [Enviar Link + Detalhes] (atômico, `shrink-0`) desce inteiro — o
                nome continua completo, sem "…". */}
            <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 border-t border-border/20 pt-2">
              <div className="flex flex-1 items-center gap-2">
                <Avatar className="h-6 w-6 shrink-0 border border-border/40">
                  <AvatarFallback className="bg-muted text-[9px] font-medium text-muted-foreground">
                    {iniciais(responsavel)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="whitespace-nowrap text-xs font-medium leading-tight text-foreground">{responsavel}</p>
                  <p className="text-[10px] leading-tight text-muted-foreground">Responsável</p>
                </div>
              </div>
              <div className="ml-auto flex shrink-0 items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1.5 rounded-lg border-border/40 px-2 text-xs"
                  disabled={enviando}
                  onClick={() => onEnviarLink(a)}
                >
                  {enviando ? <Spinner size="sm" /> : <Send className="h-3.5 w-3.5" />}
                  Enviar Link
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1.5 rounded-lg border-border/40 px-2 text-xs"
                  aria-label={`Ver detalhes de ${a.nome ?? 'candidato'}`}
                  onClick={() => onOpenDetalhes(a)}
                >
                  <FileText className="h-3.5 w-3.5" />
                  Detalhes
                </Button>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

/* ─── Paginação ──────────────────────────────────────────────────────────── */

/** Janela de números de página com marcador de omissão (`gap`). */
function janelaPaginas(atual: number, total: number): (number | 'gap')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const alvo = new Set<number>([1, total, atual - 1, atual, atual + 1]);
  const ordenado = [...alvo].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const saida: (number | 'gap')[] = [];
  let anterior = 0;
  ordenado.forEach((pagina) => {
    if (pagina - anterior > 1) saida.push('gap');
    saida.push(pagina);
    anterior = pagina;
  });
  return saida;
}

function Paginacao({
  inicio,
  fim,
  total,
  pagina,
  totalPaginas,
  porPagina,
  opcoesPorPagina,
  onPagina,
  onPorPagina,
}: {
  inicio: number;
  fim: number;
  total: number;
  pagina: number;
  totalPaginas: number;
  porPagina: number;
  /** Opções do seletor — mudam com o modo (Tabela 10/20/50, Cards 12/24/36). */
  opcoesPorPagina: readonly number[];
  onPagina: (pagina: number) => void;
  onPorPagina: (porPagina: number) => void;
}) {
  return (
    <div className="flex flex-col gap-3 border-t border-border/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-muted-foreground">
        Exibindo <span className="font-semibold text-foreground">{inicio}</span>–
        <span className="font-semibold text-foreground">{fim}</span> de{' '}
        <span className="font-semibold text-foreground">{total}</span> candidatos
      </p>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg"
            onClick={() => onPagina(pagina - 1)}
            disabled={pagina <= 1}
            aria-label="Página anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {janelaPaginas(pagina, totalPaginas).map((item, indice) =>
            item === 'gap' ? (
              <span key={`gap-${indice}`} className="px-1 text-xs text-muted-foreground">
                …
              </span>
            ) : (
              <Button
                key={item}
                variant={item === pagina ? 'default' : 'ghost'}
                size="icon"
                className="h-8 w-8 rounded-lg text-xs"
                onClick={() => onPagina(item)}
                aria-label={`Página ${item}`}
                aria-current={item === pagina ? 'page' : undefined}
              >
                {item}
              </Button>
            )
          )}

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg"
            onClick={() => onPagina(pagina + 1)}
            disabled={pagina >= totalPaginas}
            aria-label="Próxima página"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <Select value={String(porPagina)} onValueChange={(v) => onPorPagina(Number(v))}>
          <SelectTrigger className="h-8 w-[128px] rounded-lg border-border/40 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {opcoesPorPagina.map((n) => (
              <SelectItem key={n} value={String(n)}>
                {n} por página
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

/* ─── Tela ───────────────────────────────────────────────────────────────── */

export function GestaoCandidatos({
  admissoes,
  isLoading,
  sendingLink,
  onEnviarLink,
  onEnviarWhatsApp,
  onOpenDetalhes,
}: GestaoCandidatosProps) {
  const lista = admissoes;
  // Referência temporal única da tela (mesmo padrão do Dashboard de Admissões):
  // `agora` é memoizada e tudo que depende de "agora" lê dela — nada de
  // `Date.now()` no meio do render.
  const agora = useMemo(() => new Date(), []);
  const agoraMs = agora.getTime();
  const hoje = useMemo(() => inicioDoDia(agora), [agora]);

  // Filtros
  const [busca, setBusca] = useState('');
  const [etapa, setEtapa] = useState('todos');
  const [departamento, setDepartamento] = useState('todos');
  const [cargo, setCargo] = useState('todos');
  const [status, setStatus] = useState('todos');
  const [responsavel, setResponsavel] = useState('todos');
  const [periodo, setPeriodo] = useState('todos');
  const [salarioMin, setSalarioMin] = useState('');
  const [somenteAtrasados, setSomenteAtrasados] = useState(false);
  const [maisFiltros, setMaisFiltros] = useState(false);

  // Visualização / ordenação / paginação / seleção
  const [visualizacao, setVisualizacao] = useState<GestaoVisualizacao>('tabela');
  const [ordenacao, setOrdenacao] = useState('recentes');
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState<number>(PADRAO_POR_MODO.tabela);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());

  /* Opções dos selects (derivadas dos próprios dados; `todos` = sem filtro). */
  const opcoesDepartamento = useMemo(
    () => [
      { value: 'todos', label: 'Todos' },
      ...valoresUnicos(lista.map((a) => a.departamento)).map((v) => ({ value: v, label: v })),
    ],
    [lista]
  );
  const opcoesCargo = useMemo(
    () => [
      { value: 'todos', label: 'Todos' },
      ...valoresUnicos(lista.map((a) => a.cargo)).map((v) => ({ value: v, label: v })),
    ],
    [lista]
  );
  const opcoesStatus = useMemo(
    () => [
      { value: 'todos', label: 'Todos' },
      ...valoresUnicos(lista.map((a) => a.status)).map((v) => ({ value: v, label: STATUS_LABELS[v] ?? v })),
    ],
    [lista]
  );
  const opcoesResponsavel = useMemo(
    () => [
      { value: 'todos', label: 'Todos' },
      ...valoresUnicos(lista.map(responsavelDe)).map((v) => ({ value: v, label: v })),
    ],
    [lista]
  );

  /**
   * Base = todos os filtros EXCETO a etapa. É dela que saem tanto as contagens
   * das pills (para os números nunca mentirem sobre o que cada pill mostraria)
   * quanto a lista final (só filtra a etapa por cima).
   */
  const base = useMemo(() => {
    let out = lista;
    if (departamento !== 'todos') out = out.filter((a) => (a.departamento ?? '').trim() === departamento);
    if (cargo !== 'todos') out = out.filter((a) => (a.cargo ?? '').trim() === cargo);
    if (status !== 'todos') out = out.filter((a) => (a.status ?? '') === status);
    if (responsavel !== 'todos') out = out.filter((a) => responsavelDe(a) === responsavel);
    if (periodo !== 'todos') {
      const limite = agoraMs - Number(periodo) * DIA_MS;
      out = out.filter((a) => {
        const d = dataValida(a.created_at);
        return d ? d.getTime() >= limite : true;
      });
    }
    const min = Number(salarioMin);
    if (salarioMin.trim() && !Number.isNaN(min)) out = out.filter((a) => salarioDe(a) >= min);
    if (somenteAtrasados) {
      out = out.filter((a) => {
        const d = diasAteHoje(a.data_prevista, hoje);
        return d !== null && d < 0;
      });
    }
    if (busca.trim()) {
      const q = busca.trim().toLowerCase();
      out = out.filter((a) =>
        [a.nome, a.cargo, a.departamento].some((v) =>
          String(v ?? '')
            .toLowerCase()
            .includes(q)
        )
      );
    }
    return out;
  }, [lista, departamento, cargo, status, responsavel, periodo, salarioMin, somenteAtrasados, busca, hoje, agoraMs]);

  const contagens = useMemo(() => {
    const c: Record<string, number> = { todos: base.length };
    ETAPA_PILULAS.forEach((p) => {
      if (p.value !== 'todos') c[p.value] = 0;
    });
    base.forEach((a) => {
      const k = a.etapa ?? '';
      if (k in c) c[k] += 1;
    });
    return c;
  }, [base]);

  const filtrados = useMemo(
    () => (etapa === 'todos' ? base : base.filter((a) => (a.etapa ?? '') === etapa)),
    [base, etapa]
  );

  const ordenados = useMemo(() => {
    const arr = [...filtrados];
    switch (ordenacao) {
      case 'antigos':
        return arr.sort(
          (a, b) => (dataValida(a.created_at)?.getTime() ?? 0) - (dataValida(b.created_at)?.getTime() ?? 0)
        );
      case 'maior_prazo':
        return arr.sort(
          (a, b) => (dataValida(b.data_prevista)?.getTime() ?? 0) - (dataValida(a.data_prevista)?.getTime() ?? 0)
        );
      case 'menor_prazo':
        return arr.sort(
          (a, b) =>
            (dataValida(a.data_prevista)?.getTime() ?? Number.POSITIVE_INFINITY) -
            (dataValida(b.data_prevista)?.getTime() ?? Number.POSITIVE_INFINITY)
        );
      case 'etapa':
        return arr.sort((a, b) => (ETAPA_ORDEM[a.etapa ?? ''] ?? 99) - (ETAPA_ORDEM[b.etapa ?? ''] ?? 99));
      case 'responsavel':
        return arr.sort((a, b) => responsavelDe(a).localeCompare(responsavelDe(b), 'pt-BR'));
      case 'recentes':
      default:
        return arr.sort(
          (a, b) => (dataValida(b.created_at)?.getTime() ?? 0) - (dataValida(a.created_at)?.getTime() ?? 0)
        );
    }
  }, [filtrados, ordenacao]);
  /* LOGIC_MARKER */
  const totalPaginas = Math.max(1, Math.ceil(ordenados.length / porPagina));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const inicioIdx = (paginaAtual - 1) * porPagina;
  const visiveis = useMemo(() => ordenados.slice(inicioIdx, inicioIdx + porPagina), [ordenados, inicioIdx, porPagina]);

  /**
   * Chave da CASCATA de entrada da tabela: muda quando a LISTA muda de
   * identidade — página, ordenação e filtros. É o `key` do `<tbody>`, então
   * qualquer uma dessas trocas remonta as linhas e a cascata toca de novo.
   * A BUSCA textual fica FORA de propósito: reanimar a cada tecla seria o
   * "exagero" a evitar (a tabela piscaria enquanto se digita).
   */
  const cascataChave = `${paginaAtual}|${ordenacao}|${departamento}|${cargo}|${status}|${responsavel}|${periodo}|${salarioMin}|${somenteAtrasados}|${etapa}`;

  /**
   * Toda troca de filtro/ordenação/quantidade volta para a 1ª página — feito no
   * PRÓPRIO handler (mesmo padrão de `ColaboradoresPage`) em vez de um efeito,
   * que só reagiria depois do render.
   */
  const comReset =
    <T,>(aplicar: (valor: T) => void) =>
    (valor: T) => {
      aplicar(valor);
      setPagina(1);
    };

  const aoBuscar = (valor: string) => {
    setBusca(valor);
    setPagina(1);
  };

  const aoFiltrarSalario = (valor: string) => {
    setSalarioMin(valor);
    setPagina(1);
  };

  const aoMarcarAtrasados = (valor: boolean) => {
    setSomenteAtrasados(valor);
    setPagina(1);
  };

  const aoTrocarPorPagina = (valor: number) => {
    setPorPagina(valor);
    setPagina(1);
  };

  /**
   * Troca Tabela/Cards. Cada modo tem o SEU tamanho de página (Tabela 10,
   * Cards 12), então alternar aplica o padrão do modo de destino e volta para a
   * 1ª página — evita "página inválida" (ex.: pág. 4 da Tabela, com 10 itens, e
   * os Cards passando a renderizar 12) e já entrega a 1ª página coerente com a
   * grade de Cards (12 = 4 linhas cheias de 3).
   */
  const aoTrocarVisualizacao = (modo: GestaoVisualizacao) => {
    setVisualizacao(modo);
    setPorPagina(PADRAO_POR_MODO[modo]);
    setPagina(1);
  };

  const toggleLinha = (id: string, marcar: boolean) =>
    setSelecionados((prev) => {
      const proximo = new Set(prev);
      if (marcar) proximo.add(id);
      else proximo.delete(id);
      return proximo;
    });

  const toggleTodos = (marcar: boolean) =>
    setSelecionados((prev) => {
      const proximo = new Set(prev);
      visiveis.forEach((a) => {
        const id = chaveDe(a);
        if (marcar) proximo.add(id);
        else proximo.delete(id);
      });
      return proximo;
    });

  const limparFiltros = () => {
    setBusca('');
    setEtapa('todos');
    setDepartamento('todos');
    setCargo('todos');
    setStatus('todos');
    setResponsavel('todos');
    setPeriodo('todos');
    setSalarioMin('');
    setSomenteAtrasados(false);
  };

  /* Os dois campos do painel "Mais filtros" têm nome próprio para entrarem na
     condição abaixo sem virar cauda anônima de um `or` comprido. */
  const outrosFiltrosAtivos = salarioMin.trim() !== '' || somenteAtrasados;

  /**
   * ÚNICO critério de "existe filtro ativo" — o mesmo que acende o botão
   * "Limpar filtros". Declarado FILTRO A FILTRO (e não como um `!== 'todos'`
   * genérico sobre um objeto) justamente para ser auditável: cada estado que
   * `limparFiltros` zera aparece aqui, um a um. Se algum dia um filtro novo
   * entrar na tela, o compilador não avisa — mas a leitura linha a linha avisa.
   *
   * `etapa` entrou por último na história do componente, e é o caso que mais
   * importa: as pills de etapa ("eSocial", "Concluída", "Solicitação"...) são
   * filtro igual aos selects. Pill lime ⇒ `etapa !== 'todos'` ⇒ `true` aqui.
   */
  const possuiFiltroAtivo =
    busca.trim() !== '' ||
    etapa !== 'todos' ||
    departamento !== 'todos' ||
    cargo !== 'todos' ||
    status !== 'todos' ||
    responsavel !== 'todos' ||
    periodo !== 'todos' ||
    outrosFiltrosAtivos;

  /* KPIs — MESMO `MetricCard` do Dashboard de Admissões e MESMA composição
     aprovada para esta tela: ícone circular à esquerda + UM único bloco
     textual (título, valor em destaque e linha de apoio). SEM micro gráfico no
     canto direito — o card é de área única, sem coluna lateral decorativa. */
  const kpis = useMemo(() => {
    const finalizados = lista.filter((a) => a.etapa === 'concluida');
    const cancelados = lista.filter((a) => a.etapa === 'cancelada');
    const andamento = lista.filter((a) => a.etapa !== 'concluida' && a.etapa !== 'cancelada');
    return [
      {
        key: 'total',
        label: 'Total de Candidatos',
        icon: Users,
        tone: 'primary' as const,
        valor: lista.length,
        amostra: lista,
        descricao: 'processos no pipeline',
      },
      {
        key: 'andamento',
        label: 'Em Andamento',
        icon: Clock,
        tone: 'info' as const,
        valor: andamento.length,
        amostra: andamento,
        descricao: 'em pipeline agora',
      },
      {
        key: 'finalizados',
        label: 'Finalizados',
        icon: CheckCircle,
        tone: 'success' as const,
        valor: finalizados.length,
        amostra: finalizados,
        descricao: 'processos concluídos',
      },
      {
        key: 'cancelados',
        label: 'Cancelados',
        icon: AlertCircle,
        tone: 'destructive' as const,
        valor: cancelados.length,
        amostra: cancelados,
        descricao: 'processos encerrados',
      },
    ].map((kpi) => ({
      ...kpi,
      trend: variacaoRecente(kpi.amostra, agoraMs),
    }));
  }, [lista, agoraMs]);

  const acoes = { sendingLink, onEnviarLink, onEnviarWhatsApp, onOpenDetalhes };

  return (
    <div className="space-y-5">
      {/* ── 1. KPIs ───────────────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi, index) => (
          <MetricCard
            key={kpi.key}
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
      {/* ── 2. Filtros + 3. Etapas ────────────────────────────────────────── */}
      <div className="space-y-2.5">
        <Collapsible open={maisFiltros} onOpenChange={setMaisFiltros}>
          {/* BLOCO 1 — busca + filtros + ações numa ÚNICA linha, SEMPRE.
              · `flex-nowrap` (sem prefixo): a linha NUNCA quebra, em nenhum
                viewport — era o defeito ("Limpar filtros" caindo para baixo).
              · Quem absorve a sobra da linha é SÓ a busca (`flex-1`), que por
                isso é sempre o maior elemento; os filtros ficam com largura
                fixa e controlada.
              · Se a coluna ficar mais estreita que a soma dos `min-w`, o
                `overflow-auto` do `<main>` (MainLayout) rola na horizontal —
                encolher/rolar, nunca empilhar. */}
          <div className="flex flex-nowrap items-center gap-2">
            {/* Busca: único item elástico (`flex-1` = basis 0 + grow 1) e com
                piso de `min-w-[180px]` para nunca ser esmagada — é sempre o
                maior elemento da linha. `h-10` = mesma altura dos filtros. */}
            <motion.div
              custom={slotFiltro(0)}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              className="relative min-w-[180px] flex-1"
            >
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={busca}
                onChange={(e) => aoBuscar(e.target.value)}
                placeholder="Buscar por nome, cargo, departamento..."
                aria-label="Buscar candidatos"
                className="h-10 rounded-lg border-border/40 bg-card pl-9"
              />
            </motion.div>

            {/* Filtros: MESMA largura controlada (136px), mesma altura (h-10) e
                mesmo gap — ritmo uniforme. Os 136px saem da medição real do
                MAIOR conteúdo dos cinco, que é o VALOR "Todo o período" (94px) —
                o rótulo mais largo ("Departamento") fica em 82px, mas quem
                manda é o valor, que era o defeito: com os 124px antigos (que só
                mediam o rótulo) sobravam 86px e o texto quebrava em duas linhas.
                Conteúdo (94px) + padding (24px) + chevron (14px) + folga = 136px,
                então nenhum rótulo/valor é cortado nem colide com o chevron.
                `min-w-[100px]` deixa encolher quando a coluna aperta (aí sim o
                valor corta com "…" — `[&>span:last-child]:truncate` —, nunca
                quebra a linha). */}
            <motion.div custom={slotFiltro(1)} variants={cardVariants} initial="hidden" animate="visible">
              <FiltroSelect
                label="Departamento"
                value={departamento}
                onChange={comReset(setDepartamento)}
                options={opcoesDepartamento}
                className="w-[136px] min-w-[100px]"
              />
            </motion.div>
            <motion.div custom={slotFiltro(2)} variants={cardVariants} initial="hidden" animate="visible">
              <FiltroSelect
                label="Cargo"
                value={cargo}
                onChange={comReset(setCargo)}
                options={opcoesCargo}
                className="w-[136px] min-w-[100px]"
              />
            </motion.div>
            <motion.div custom={slotFiltro(3)} variants={cardVariants} initial="hidden" animate="visible">
              <FiltroSelect
                label="Status"
                value={status}
                onChange={comReset(setStatus)}
                options={opcoesStatus}
                className="w-[136px] min-w-[100px]"
              />
            </motion.div>
            <motion.div custom={slotFiltro(4)} variants={cardVariants} initial="hidden" animate="visible">
              <FiltroSelect
                label="Responsável"
                value={responsavel}
                onChange={comReset(setResponsavel)}
                options={opcoesResponsavel}
                className="w-[136px] min-w-[100px]"
              />
            </motion.div>
            <motion.div custom={slotFiltro(5)} variants={cardVariants} initial="hidden" animate="visible">
              <FiltroSelect
                label="Período"
                value={periodo}
                onChange={comReset(setPeriodo)}
                options={PERIODOS}
                className="w-[136px] min-w-[100px]"
              />
            </motion.div>

            {/* Ações: bloco atômico (`shrink-0`) no fim da MESMA linha — como a
                busca (`flex-1`) consome toda a sobra, não sobra espaço livre
                para `ml-auto` (que fica em 0, inócuo, mas mantido por clareza
                caso a linha passe a ter folga). */}
            <motion.div
              custom={slotFiltro(6)}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              className="ml-auto flex shrink-0 items-center gap-2"
            >
              <CollapsibleTrigger asChild>
                <Button variant="outline" size="sm" className="h-10 gap-2 rounded-lg border-border/40 bg-card text-xs">
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  Mais filtros
                  <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', maisFiltros && 'rotate-180')} />
                </Button>
              </CollapsibleTrigger>

              {/* "Limpar filtros" tem DOIS estados, e a cor comunica qual está
                  ativo — tamanho, padding, tipografia e posição não mudam.
                  (1) NEUTRO — nenhum filtro aplicado (`possuiFiltroAtivo` falso):
                  preenchimento e borda neutros com sombra discreta sobre texto
                  `foreground`. O `ghost` puro herdava `text-muted-foreground`
                  sem fundo nem borda — ficava com contraste baixo e lia como
                  texto "apagado" ao lado do "Mais filtros" (`outline` com
                  `bg-card`). Continua sendo ação SECUNDÁRIA, daí nada de lime.
                  (2) LIME — qualquer filtro ativo: o lime do sistema é o
                  próprio `--primary` (tema "Bombon Lime", 68 100% 48%) com
                  `text-primary-foreground` (240 20% 6%, quase preto) — MESMA
                  dupla `bg-primary`/`text-primary-foreground` da pill de etapa
                  ativa logo abaixo, 15,61:1 de contraste nos dois temas. O
                  ícone não tem cor própria (só `h-3.5 w-3.5`): herda o
                  `currentColor` do botão e vem escuro junto com o texto.
                  Hover = `bg-primary/90`, a mesma variação de lime que o
                  variant `default` do Button já usa — um degrau mais escuro,
                  sem glow (o `shadow-xs` continua sendo só a elevação), com
                  `hover:text-primary-foreground` fixando o texto: o variant
                  `ghost` injeta `hover:text-accent-foreground`, que vazava para
                  DENTRO do estado lime (no hover o texto trocava de cor). Os
                  dois estados agora declaram fundo, texto e borda por inteiro —
                  nada de cor herdada do variant: o `cn` do próprio Button passa
                  por `twMerge` e, vendo `hover:bg-primary/90` DEPOIS das
                  classes do variant, descarta `hover:bg-accent` e
                  `hover:text-accent-foreground` (e o `h-8`/`rounded-md` do
                  `size="sm"`): a string final do `class` só tem o que está
                  escrito aqui.
                  `possuiFiltroAtivo` é o único critério, com cada filtro
                  NOMEADO um a um — busca, etapa, departamento, cargo, status,
                  responsável, período e os 2 extras do "Mais filtros". Só o
                  painel ABERTO não entra — é disclosure de UI e `limparFiltros`
                  não o fecha; contá-lo impediria o botão de voltar ao neutro ao
                  limpar. No neutro desabilitado o `opacity-50` do próprio
                  Button cai sobre fundo/borda visíveis: segue legível, só sem
                  afordância. */}
              <Button
                variant="ghost"
                size="sm"
                onClick={limparFiltros}
                disabled={!possuiFiltroAtivo}
                /* Espelho do estado no DOM: permite conferir no DevTools, em um
                   olhar, QUAL ramo da condição foi renderizado (não pinta nada). */
                data-filtro-ativo={possuiFiltroAtivo ? 'true' : 'false'}
                className={cn(
                  'h-10 gap-2 rounded-lg border text-xs shadow-xs',
                  possuiFiltroAtivo
                    ? 'border-primary bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground'
                    : 'border-border/60 bg-muted/60 text-foreground hover:border-border hover:bg-muted hover:text-foreground disabled:border-border/30 disabled:bg-muted/30 disabled:text-muted-foreground'
                )}
              >
                <FilterX className="h-3.5 w-3.5" />
                Limpar filtros
              </Button>
            </motion.div>
          </div>

          {/* `forceMount` + framer-motion no lugar do `animate-accordion-down`
              (keyframe do Tailwind): aquela classe lê
              `--radix-accordion-content-height`, variável que só o primitivo
              Accordion define — o Collapsible usa outro nome, então a transição
              CSS nunca dispara o `animationend` que ele espera. Controlando a
              ALTURA aqui (0 ↔ "auto") a ABERTURA e o FECHAMENTO animam nos dois
              sentidos, sem depender de variável do Radix — MESMO padrão do
              `HistoryYearGroup` (ease/durações idênticos). O
              `AnimatePresence initial={false}` é local; o `motion.div` só entra
              quando o painel abre, e é o `CardsEntrada` da aba (ver
              `AdmissoesPage`) que garante o contexto de presença com `initial`
              verdadeiro. */}
          <CollapsibleContent forceMount>
            <AnimatePresence initial={false}>
              {maisFiltros && (
                <motion.div
                  key="mais-filtros"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{
                    height: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] as const },
                    opacity: { duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] as const },
                  }}
                  style={{ overflow: 'hidden' }}
                >
                  <div className="mt-2 flex flex-wrap items-center gap-4 rounded-xl border border-border/30 bg-muted/20 p-3">
                    <div className="flex items-center gap-2">
                      <label htmlFor="gestao-salario-min" className="text-xs text-muted-foreground">
                        Salário mínimo
                      </label>
                      <Input
                        id="gestao-salario-min"
                        type="number"
                        inputMode="numeric"
                        min={0}
                        value={salarioMin}
                        onChange={(e) => aoFiltrarSalario(e.target.value)}
                        placeholder="R$ 0"
                        className="h-8 w-28 rounded-lg border-border/40 bg-card text-xs"
                      />
                    </div>
                    <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                      <Checkbox checked={somenteAtrasados} onCheckedChange={(v) => aoMarcarAtrasados(v === true)} />
                      Somente em atraso
                    </label>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CollapsibleContent>
        </Collapsible>

        <EtapaPills ativo={etapa} contagens={contagens} onSelecionar={comReset(setEtapa)} />
      </div>
      {/* ── 4-7. Container principal: cabeçalho + tabela/cards + paginação ── */}
      <MotionCard
        custom={slot(INICIO_CARD)}
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        className="overflow-hidden rounded-2xl border-border/40 bg-card/60 shadow-xs"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/30 px-4 py-3">
          <h2 className="flex items-center gap-2 font-display text-sm font-medium text-foreground">
            <List className="h-4 w-4 text-primary" />
            Candidatos
            <span className="text-sm font-normal text-muted-foreground">({ordenados.length})</span>
          </h2>

          <div className="flex flex-wrap items-center gap-2">
            <VisualizacaoToggle value={visualizacao} onChange={aoTrocarVisualizacao} />

            {/* Ordenação — mesma altura EXTERNA da MOLDURA do grupo
                Tabela/Cards: `h-[42px]` (`p-1` 4px + `border` 1px + `h-8` 32px
                + `border` 1px + `p-1` 4px). Nivelar pela moldura — e não pelos
                32px dos botões internos — é o que faz os DOIS BLOCOS caírem no
                mesmo centro: eles são irmãos no `flex items-center` do
                cabeçalho, então mesma altura = mesmo alinhamento vertical.
                `rounded-lg` e `border-border/40` mantidos: cores, tipografia,
                ícones, opções e a lógica de ordenação ficam intocados.
                Largura enxuta mas FIXA (`w-[150px]`, não `w-auto`) — o rótulo
                mais largo é "Mais recentes" (85,1px na fonte do app) e os 150px
                o mantêm em UMA linha com folga até o chevron; sendo fixa, o
                controle não encolhe/empurra o grupo quando a ordenação muda
                ("Etapa" é bem mais curto). Padding enxuto (`px-2.5 py-0` no
                lugar do `px-3 py-1.5` base).
                DIAGRAMAÇÃO `[↕ Mais recentes ˅]` EM UMA LINHA: o trigger já é
                `flex items-center justify-between` na base do `select.tsx` e o
                grupo interno é `flex flex-row items-center gap-2 min-w-0` — o
                ícone fica à ESQUERDA do texto (mesmo eixo Y, nunca acima), o
                rótulo nasce encostado nele (o `justify-between` não o empurra
                para o meio, porque quem é "o conteúdo" da linha é o grupo todo)
                e o chevron herdado fecha o controle no extremo DIREITO.
                ARMADILHA — ERA O DEFEITO: o `SelectTrigger` base carrega
                `[&>span]:line-clamp-1`, que compila para
                `.\[\&\>span\]\:line-clamp-1 > span` — especificidade (0,1,1),
                que GANHA do `.flex` (0,1,0). Com o grupo em um `<span>` (filho
                DIRETO do trigger), o `display` virava `-webkit-box` com
                `-webkit-box-orient: vertical` e o `ArrowUpDown` subia para cima
                do texto. Por isso o grupo é um `<div>` (o variante só casa
                `> span`) — mesmo recurso do `FiltroSelect` acima, que também usa
                `<div>` como filho do trigger. `whitespace-nowrap` no trigger
                (herdado pelo grupo) e `[&>span]:whitespace-nowrap` no grupo
                travam o rótulo numa linha só: o `SelectValue` do Radix descarta
                `className`, então o corte tem de vir do PAI. */}
            <Select value={ordenacao} onValueChange={comReset(setOrdenacao)}>
              <SelectTrigger className="flex h-[42px] w-[150px] flex-row items-center justify-between gap-2 whitespace-nowrap rounded-lg border-border/40 bg-card px-2.5 py-0">
                <div className="flex min-w-0 flex-row items-center gap-2 [&>span]:whitespace-nowrap">
                  <ArrowUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <SelectValue />
                </div>
              </SelectTrigger>
              {/* Abre SEMPRE para BAIXO, com o mesmo contrato dos selects da
                  faixa de filtros (ver `FiltroSelect`): `side="bottom"` congela o
                  lado e `align="end"` encosta o menu na borda DIREITA do trigger
                  — ele é o último item da linha, então abrir pelo início jogaria
                  o popup para fora da janela (o `shift` está desligado aqui).
                  `avoidCollisions={false}` desliga `flip`/`shift` do Floating UI
                  (sem isso o popup troca de lado quando não cabe abaixo) e o
                  `max-h` pela altura disponível do popper é o contrapeso
                  obrigatório: o middleware `size` continua ativo e o menu rola
                  por dentro do espaço real. */}
              <SelectContent
                side="bottom"
                align="end"
                avoidCollisions={false}
                className="max-h-[var(--radix-select-content-available-height)]"
              >
                {ORDENACOES.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner size="lg" />
          </div>
        ) : lista.length === 0 ? (
          <EmptyList entityName="candidato" />
        ) : ordenados.length === 0 ? (
          <EmptySearch search={busca} onClear={limparFiltros} />
        ) : (
          <>
            {/* Transição discreta ao alternar Tabela/Cards. */}
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={visualizacao}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                {visualizacao === 'tabela' ? (
                  <TabelaCandidatos
                    itens={visiveis}
                    hoje={hoje}
                    selecionados={selecionados}
                    onToggleTodos={toggleTodos}
                    onToggleLinha={toggleLinha}
                    chaveCascata={cascataChave}
                    {...acoes}
                  />
                ) : (
                  <CardsCandidatos itens={visiveis} hoje={hoje} {...acoes} />
                )}
              </motion.div>
            </AnimatePresence>

            <Paginacao
              inicio={inicioIdx + 1}
              fim={Math.min(inicioIdx + porPagina, ordenados.length)}
              total={ordenados.length}
              pagina={paginaAtual}
              totalPaginas={totalPaginas}
              porPagina={porPagina}
              opcoesPorPagina={POR_PAGINA_POR_MODO[visualizacao]}
              onPagina={setPagina}
              onPorPagina={aoTrocarPorPagina}
            />
          </>
        )}
      </MotionCard>
    </div>
  );
}
