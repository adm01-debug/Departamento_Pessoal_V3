import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  AlertTriangle,
  ArrowDownUp,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Download,
  FileSearch,
  FileText,
  Plug,
  Search,
  Settings2,
  Trophy,
  UserRound,
  X as XIcone,
  type LucideIcon,
} from 'lucide-react';
import { PALETAS_CHIP, type TemaChip } from '@/components/avaliacao/chipFiltroComum';
// Entrada de referência do Dashboard Executivo — o MESMO objeto que os KPI Cards
// consomem (ver `ui/entrada-cards.tsx`). Não existe cópia local dos números.
import { cardVariants } from '@/components/dashboard/MetricCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useMovimentoReduzido } from '@/lib/motionMode';
import { formatCurrency } from '@/utils/format';
import type { AuditoriaHub, CampanhaHub, PagamentoHub } from './premiacoesComum';
import {
  CATEGORIAS_AUDITORIA,
  FILTROS_AUDITORIA_INICIAIS,
  PERIODOS_AUDITORIA,
  agruparEventosAuditoria,
  categoriasDisponiveis,
  contarCategoria,
  entidadesDisponiveis,
  filtrarEventosAuditoria,
  intervaloPeriodo,
  janelaPaginacao,
  normalizarEventosAuditoria,
  rotuloIntervalo,
  temFiltrosAtivos,
  tiposEventoDisponiveis,
  usuariosDisponiveis,
  type CategoriaAuditoriaId,
  type EventoAuditoria,
  type FiltrosAuditoria,
  type TomAuditoria,
} from './auditoriaComum';
import { AuditoriaEventoDialog } from './AuditoriaEventoDialog';
// Cascata dos FILTROS = o MESMO `cardVariants` dos KPI Cards (importado acima);
// cascata da TIMELINE = o movimento da lista de Campanhas com a temporização
// própria desta aba (ver `auditoriaEntrada.ts`). Nada de um segundo sistema.
import { EntradaPresenca } from './premiacoesEntrada';
import { linhaAuditoriaVariants } from './auditoriaEntrada';

/**
 * Botão e trigger de Select ANIMADOS sem nó extra no DOM (`motion.create`):
 * o elemento que entra em cascata é o próprio controle — o grid, as larguras e
 * os espaçamentos da barra ficam idênticos.
 */
const MotionButton = motion.create(Button);
const MotionSelectTrigger = motion.create(SelectTrigger);

/** Props da entrada de referência do Dashboard, por índice (delay = i × 0,08s). */
function entradaFiltro(indice: number) {
  return { custom: indice, variants: cardVariants, initial: 'hidden', animate: 'visible' } as const;
}

interface AuditoriaTabProps {
  auditoria: AuditoriaHub[];
  pagamentos: PagamentoHub[];
  campanhas: CampanhaHub[];
  carregando?: boolean;
  erro?: boolean;
  onTentarNovamente?: () => void;
  onExportar: (formato: 'csv' | 'pdf') => void;
}

const ICONE_CATEGORIA: Record<CategoriaAuditoriaId, LucideIcon> = {
  todas: Activity,
  campanhas: Trophy,
  pagamentos: DollarSign,
  regras: Settings2,
  conciliacao: AlertTriangle,
  integracoes: Plug,
  aprovacoes: CheckCircle2,
};

/**
 * Cores semânticas dos chips da Auditoria. A paleta é a MESMA do Design System
 * de chips coloridos (`chipFiltroComum`), sem criar tons paralelos:
 * lime = Todos; violeta = Campanhas; verde = Pagamentos/Aprovações;
 * azul = Regras; âmbar = Conciliação.
 */
const TEMA_CATEGORIA: Record<CategoriaAuditoriaId, TemaChip> = {
  todas: PALETAS_CHIP.lime,
  campanhas: PALETAS_CHIP.violet,
  pagamentos: PALETAS_CHIP.emerald,
  regras: PALETAS_CHIP.blue,
  conciliacao: PALETAS_CHIP.amber,
  integracoes: PALETAS_CHIP.blue,
  aprovacoes: PALETAS_CHIP.emerald,
};

/** Borda ativa da categoria (65–70%), mais evidente que a de repouso. */
const BORDA_ATIVA_CATEGORIA: Record<CategoriaAuditoriaId, string> = {
  todas: 'border-primary/70',
  campanhas: 'border-[hsl(var(--chart-4)/0.70)]',
  pagamentos: 'border-success/70',
  regras: 'border-info/70',
  conciliacao: 'border-warning/70',
  integracoes: 'border-info/70',
  aprovacoes: 'border-success/70',
};

/**
 * Glow suave por categoria. Usa SOMENTE os tokens de cor existentes e fica
 * restrito ao estado selecionado; o hover aumenta a mesma cor, sem criar um
 * segundo brilho branco/genérico.
 */
const GLOW_CATEGORIA: Record<CategoriaAuditoriaId, string> = {
  todas: 'shadow-[0_0_16px_hsl(var(--primary)/0.16)] hover:shadow-[0_0_20px_hsl(var(--primary)/0.20)]',
  campanhas: 'shadow-[0_0_16px_hsl(var(--chart-4)/0.16)] hover:shadow-[0_0_20px_hsl(var(--chart-4)/0.20)]',
  pagamentos: 'shadow-[0_0_16px_hsl(var(--success)/0.16)] hover:shadow-[0_0_20px_hsl(var(--success)/0.20)]',
  regras: 'shadow-[0_0_16px_hsl(var(--info)/0.16)] hover:shadow-[0_0_20px_hsl(var(--info)/0.20)]',
  conciliacao: 'shadow-[0_0_16px_hsl(var(--warning)/0.16)] hover:shadow-[0_0_20px_hsl(var(--warning)/0.20)]',
  integracoes: 'shadow-[0_0_16px_hsl(var(--info)/0.16)] hover:shadow-[0_0_20px_hsl(var(--info)/0.20)]',
  aprovacoes: 'shadow-[0_0_16px_hsl(var(--success)/0.16)] hover:shadow-[0_0_20px_hsl(var(--success)/0.20)]',
};

const ICONE_ENTIDADE: Record<string, LucideIcon> = {
  campanha: Trophy,
  pagamento: FileText,
  regra: Settings2,
  integracao: Plug,
};

const TOM_ICONE: Record<TomAuditoria, string> = {
  success: 'border-success/35 bg-success/12 text-success',
  warning: 'border-warning/40 bg-warning/12 text-warning',
  destructive: 'border-destructive/40 bg-destructive/12 text-destructive',
  info: 'border-info/40 bg-info/12 text-info',
  primary: 'border-primary/40 bg-primary/12 text-primary',
  muted: 'border-border/50 bg-muted/40 text-muted-foreground',
};

const TOM_PONTO: Record<TomAuditoria, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  destructive: 'bg-destructive',
  info: 'bg-info',
  primary: 'bg-primary',
  muted: 'bg-muted-foreground',
};

const TOM_BADGE: Record<TomAuditoria, string> = {
  success: 'border-success/35 bg-success/10 text-success',
  warning: 'border-warning/40 bg-warning/10 text-warning',
  destructive: 'border-destructive/40 bg-destructive/10 text-destructive',
  info: 'border-info/35 bg-info/10 text-info',
  primary: 'border-primary/35 bg-primary/10 text-primary',
  muted: 'border-border/50 bg-muted/40 text-muted-foreground',
};

function ValorEvento({ evento, compacto = false }: { evento: EventoAuditoria; compacto?: boolean }) {
  const temTransicao =
    evento.valorAnterior !== null && evento.valorPosterior !== null && evento.valorAnterior !== evento.valorPosterior;

  if (temTransicao) {
    return (
      <div className={cn('min-w-0', compacto && 'text-right')}>
        <div className="flex flex-wrap items-center gap-1 text-[11px] font-semibold tabular-nums">
          <span className="text-muted-foreground line-through">{formatCurrency(evento.valorAnterior)}</span>
          <ChevronRight className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
          <span>{formatCurrency(evento.valorPosterior)}</span>
        </div>
        <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{evento.valorLegenda}</p>
      </div>
    );
  }

  if (evento.valor === null) {
    return (
      <div className={cn('min-w-0', compacto && 'text-right')}>
        <span className="text-[12px] text-muted-foreground">—</span>
        <p className="mt-0.5 truncate text-[10px] text-muted-foreground">Sem valor financeiro</p>
      </div>
    );
  }

  return (
    <div className={cn('min-w-0', compacto && 'text-right')}>
      <p className="truncate text-[12px] font-semibold tabular-nums">{formatCurrency(evento.valor)}</p>
      <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{evento.valorLegenda}</p>
    </div>
  );
}

function EntidadeEvento({ evento }: { evento: EventoAuditoria }) {
  const Icone = ICONE_ENTIDADE[evento.entidadeTipo] ?? FileText;
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border/40 bg-background/60 text-muted-foreground">
        <Icone className="h-3 w-3" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-[11px] font-medium">{evento.entidade.rotulo}</p>
        <p className="truncate text-[10px] text-muted-foreground" title={evento.entidade.nome ?? undefined}>
          {evento.entidade.nome ?? 'Não informado'}
        </p>
        {evento.entidade.detalhe && (
          <p className="truncate text-[10px] text-muted-foreground/80" title={evento.entidade.detalhe}>
            {evento.entidade.detalhe}
          </p>
        )}
      </div>
    </div>
  );
}

function ResponsavelEvento({ evento }: { evento: EventoAuditoria }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      {evento.responsavel.iniciais ? (
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[9px] font-semibold text-primary ring-1 ring-inset ring-primary/20">
          {evento.responsavel.iniciais}
        </span>
      ) : (
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border/40 bg-background/60 text-muted-foreground">
          <UserRound className="h-3 w-3" aria-hidden="true" />
        </span>
      )}
      <div className="min-w-0">
        <p className="truncate text-[11px] font-medium">{evento.responsavel.nome ?? 'Não informado'}</p>
        <p className="truncate text-[10px] text-muted-foreground">{evento.responsavel.detalhe ?? '—'}</p>
      </div>
    </div>
  );
}

function BadgesEvento({ evento }: { evento: EventoAuditoria }) {
  return (
    <div className="flex flex-wrap items-center gap-1 pt-0.5">
      <span
        className={cn(
          'inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9px] font-medium',
          TOM_BADGE[evento.tom]
        )}
      >
        {evento.categoriaRotulo}
      </span>
      <span className="inline-flex items-center rounded-full border border-border/40 bg-muted/20 px-1.5 py-0.5 text-[9px] text-muted-foreground">
        {evento.entidade.rotulo}
      </span>
    </div>
  );
}

const GRID_EVENTO =
  'lg:grid-cols-[42px_16px_34px_minmax(145px,2fr)_minmax(72px,1fr)_minmax(92px,1.1fr)_minmax(70px,1fr)_88px] xl:grid-cols-[46px_18px_38px_minmax(170px,2fr)_minmax(92px,1fr)_minmax(120px,1.1fr)_minmax(96px,1fr)_104px] items-center gap-2 xl:gap-2.5 px-3';

function LinhaTempo({ primeiro, ultimo, tom }: { primeiro: boolean; ultimo: boolean; tom: TomAuditoria }) {
  return (
    <div className="relative flex h-full min-h-[72px] items-center justify-center self-stretch" aria-hidden="true">
      <span
        className={cn('absolute w-px bg-border/60', primeiro ? 'top-1/2' : 'top-0', ultimo ? 'bottom-1/2' : 'bottom-0')}
      />
      <span className={cn('relative z-10 h-2.5 w-2.5 rounded-full ring-4 ring-card', TOM_PONTO[tom])} />
    </div>
  );
}

function LinhaEvento({
  evento,
  indice,
  primeiro,
  ultimo,
  entradaImediata,
  onDetalhe,
}: {
  evento: EventoAuditoria;
  /** Índice GLOBAL na lista (atravessa os grupos) — vira o `custom` do stagger. */
  indice: number;
  primeiro: boolean;
  ultimo: boolean;
  /** Movimento reduzido: renderiza já no estado final (sem fade/espera). */
  entradaImediata: boolean;
  onDetalhe: (origem: HTMLButtonElement) => void;
}) {
  const Icone = ICONE_CATEGORIA[evento.categoria] ?? ICONE_ENTIDADE[evento.entidadeTipo] ?? Activity;
  return (
    // A LINHA INTEIRA é a unidade visual da cascata: horário, trilho/ponto, ícone,
    // descrição, valor, entidade, responsável e botão acompanham o mesmo
    // movimento. O keyframe é o da linguagem das linhas de Campanhas (fade +
    // 10px), com a temporização própria da Auditoria (0,55s · passo 0,11s ·
    // easeOutCubic) e sem escala horizontal — assim o trilho e o ponto ficam
    // alinhados durante a cascata. Ver `auditoriaEntrada.ts`.
    <motion.li
      data-testid="auditoria-evento"
      data-cascata-indice={indice}
      custom={indice}
      variants={linhaAuditoriaVariants}
      initial={entradaImediata ? false : 'hidden'}
      animate="visible"
      className="group origin-center border-b border-border/25 transition-colors duration-150 last:border-b-0 hover:bg-accent/[0.045] focus-within:bg-accent/[0.045]"
    >
      <div className={cn('hidden min-h-[76px] lg:grid', GRID_EVENTO)}>
        <time
          dateTime={evento.dataIso ?? undefined}
          className="text-right text-[10px] tabular-nums text-muted-foreground"
          aria-label={`Horário ${evento.hora}`}
        >
          {evento.hora}
        </time>
        <LinhaTempo primeiro={primeiro} ultimo={ultimo} tom={evento.tom} />
        <span
          className={cn('flex h-10 w-10 items-center justify-center rounded-xl border', TOM_ICONE[evento.tom])}
          aria-hidden="true"
        >
          <Icone className="h-[18px] w-[18px]" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold leading-tight" title={evento.titulo}>
            {evento.titulo}
          </p>
          <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-muted-foreground" title={evento.descricao}>
            {evento.descricao}
          </p>
          <BadgesEvento evento={evento} />
        </div>
        <ValorEvento evento={evento} />
        <EntidadeEvento evento={evento} />
        <ResponsavelEvento evento={evento} />
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 w-[88px] gap-1 border-border/60 bg-secondary/30 px-1.5 text-[9px] font-medium hover:border-primary/40 hover:bg-primary/10 hover:text-primary xl:w-[104px] xl:px-2 xl:text-[10px]"
            onClick={(clique) => onDetalhe(clique.currentTarget)}
            aria-label={`Ver detalhes de ${evento.titulo}`}
          >
            Ver detalhes
            <ChevronRight className="h-3 w-3" aria-hidden="true" />
          </Button>
        </div>
      </div>

      <div className="p-3 lg:hidden">
        <div className="flex items-start gap-2.5">
          <span
            className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border', TOM_ICONE[evento.tom])}
            aria-hidden="true"
          >
            <Icone className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="min-w-0 truncate text-[13px] font-semibold">{evento.titulo}</p>
              <time
                dateTime={evento.dataIso ?? undefined}
                className="shrink-0 text-[10px] tabular-nums text-muted-foreground"
              >
                {evento.hora}
              </time>
            </div>
            <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-muted-foreground">{evento.descricao}</p>
            <BadgesEvento evento={evento} />
          </div>
        </div>
        <div className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-border/30 pt-2.5 sm:grid-cols-3">
          <ValorEvento evento={evento} compacto />
          <EntidadeEvento evento={evento} />
          <div className="col-span-2 min-w-0 sm:col-span-1">
            <ResponsavelEvento evento={evento} />
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-2.5 h-8 w-full gap-1 border-border/60 bg-secondary/30 text-[11px] hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
          onClick={(clique) => onDetalhe(clique.currentTarget)}
        >
          Ver detalhes
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
      </div>
    </motion.li>
  );
}

function PaginacaoAuditoria({
  pagina,
  total,
  porPagina,
  onPagina,
  onPorPagina,
}: {
  pagina: number;
  total: number;
  porPagina: number;
  onPagina: (pagina: number) => void;
  onPorPagina: (porPagina: number) => void;
}) {
  const totalPaginas = Math.max(1, Math.ceil(total / Math.max(1, porPagina)));
  const paginaAtual = Math.min(Math.max(1, pagina), totalPaginas);
  const inicio = total === 0 ? 0 : (paginaAtual - 1) * porPagina + 1;
  const fim = Math.min(total, paginaAtual * porPagina);
  const rotulo = total === 0 ? 'Mostrando 0 de 0 eventos' : `Mostrando ${inicio}–${fim} de ${total} eventos`;

  return (
    <div className="flex flex-col gap-2 border-t border-border/40 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-[10px] text-muted-foreground">{rotulo}</p>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground">Itens por página</span>
          <Select value={String(porPagina)} onValueChange={(v) => onPorPagina(Number(v))}>
            <SelectTrigger
              aria-label="Itens por página"
              className="h-7 w-[58px] rounded-lg border-border/40 bg-background text-[10px]"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent side="top">
              {[10, 25, 50].map((n) => (
                <SelectItem key={n} value={String(n)} className="text-xs tabular-nums">
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <nav className="flex items-center gap-1" aria-label="Paginação da auditoria">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-lg text-muted-foreground hover:bg-accent"
            onClick={() => onPagina(paginaAtual - 1)}
            disabled={paginaAtual <= 1}
            aria-label="Página anterior"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          {janelaPaginacao(paginaAtual, totalPaginas).map((item, indice) =>
            item === '…' ? (
              <span key={`gap-${indice}`} className="px-1 text-[10px] text-muted-foreground" aria-hidden="true">
                …
              </span>
            ) : (
              <Button
                key={item}
                variant={item === paginaAtual ? 'default' : 'ghost'}
                size="icon"
                className={cn(
                  'h-7 w-7 rounded-lg text-[10px] tabular-nums',
                  item === paginaAtual
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'text-muted-foreground hover:bg-accent'
                )}
                onClick={() => onPagina(item)}
                aria-label={`Página ${item}`}
                aria-current={item === paginaAtual ? 'page' : undefined}
              >
                {item}
              </Button>
            )
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-lg text-muted-foreground hover:bg-accent"
            onClick={() => onPagina(paginaAtual + 1)}
            disabled={paginaAtual >= totalPaginas}
            aria-label="Próxima página"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </nav>
      </div>
    </div>
  );
}

export function AuditoriaTab({
  auditoria,
  pagamentos,
  campanhas,
  carregando = false,
  erro = false,
  onTentarNovamente,
  onExportar,
}: AuditoriaTabProps) {
  const { user } = useAuth();
  const [filtros, setFiltros] = useState<FiltrosAuditoria>(FILTROS_AUDITORIA_INICIAIS);
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(10);
  const [eventoDetalhe, setEventoDetalhe] = useState<EventoAuditoria | null>(null);
  /**
   * Aberto/FECHADO separado do dado (mesma regra do modal de Pendências): ao
   * fechar, o evento continua em memória até a animação de SAÍDA terminar —
   * zerar o dado no clique desmontaria o conteúdo e a saída nunca rodaria.
   */
  const [detalheAberto, setDetalheAberto] = useState(false);
  /** Botão que abriu a janela — o Radix devolve o foco a ele ao terminar a saída. */
  const [origemDetalhe, setOrigemDetalhe] = useState<HTMLButtonElement | null>(null);
  const abrirDetalhe = (evento: EventoAuditoria, origem: HTMLButtonElement) => {
    setOrigemDetalhe(origem);
    setEventoDetalhe(evento);
    setDetalheAberto(true);
  };
  const agora = useMemo(() => new Date(), []);

  const eventos = useMemo(
    () =>
      normalizarEventosAuditoria(auditoria, pagamentos, campanhas, {
        usuarioAtual: user ? { id: user.id, nome: user.name ?? null, email: user.email } : undefined,
        agora,
      }),
    [auditoria, pagamentos, campanhas, user, agora]
  );
  const categorias = useMemo(() => categoriasDisponiveis(eventos), [eventos]);
  const tipos = useMemo(() => tiposEventoDisponiveis(eventos), [eventos]);
  const entidades = useMemo(() => entidadesDisponiveis(eventos), [eventos]);
  const usuarios = useMemo(() => usuariosDisponiveis(eventos), [eventos]);
  const intervalo = useMemo(() => intervaloPeriodo(eventos, filtros.periodo, agora), [eventos, filtros.periodo, agora]);
  const filtrados = useMemo(() => filtrarEventosAuditoria(eventos, filtros, agora), [eventos, filtros, agora]);
  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / Math.max(1, porPagina)));
  const paginaAtual = Math.min(Math.max(1, pagina), totalPaginas);
  const eventosDaPagina = useMemo(
    () => filtrados.slice((paginaAtual - 1) * porPagina, paginaAtual * porPagina),
    [filtrados, paginaAtual, porPagina]
  );
  const grupos = useMemo(() => agruparEventosAuditoria(eventosDaPagina, agora), [eventosDaPagina, agora]);
  /**
   * Índice GLOBAL de cada unidade visual da timeline — o CABEÇALHO do dia e cada
   * EVENTO ocupam uma posição na MESMA sequência (cabeçalho primeiro, depois os
   * eventos do dia, depois o próximo grupo). Assim a cascata atravessa os grupos
   * como uma lista só e nunca empilha cabeçalho + eventos no mesmo instante.
   */
  const indicesEntrada = useMemo(() => {
    const mapa = new Map<string, number>();
    let indice = 0;
    for (const grupo of grupos) {
      mapa.set(`grupo:${grupo.chave}`, indice++);
      for (const evento of grupo.eventos) mapa.set(`evento:${evento.id}`, indice++);
    }
    return mapa;
  }, [grupos]);
  /**
   * Identidade da lista visível (página + ordenação + registros) — a MESMA
   * `chaveCascata` da tabela de Campanhas. Quando o conjunto/ordem muda (filtro,
   * ordenação, paginação) os grupos remontam e a cascata das linhas toca de
   * novo; hover, clique e re-render não mudam a chave, então nada reinicia à
   * toa. O PAINEL de filtros não entra nesta chave: ele nunca reanima ao filtrar.
   */
  const chaveCascata = useMemo(
    () => [paginaAtual, filtros.ordem, ...eventosDaPagina.map((evento) => evento.id)].join('|'),
    [paginaAtual, filtros.ordem, eventosDaPagina]
  );
  const filtrosAtivos = useMemo(() => temFiltrosAtivos(filtros), [filtros]);
  /**
   * Movimento reduzido (fonte única do app): sem cascata, sem espera e sem
   * deslocamento — cada unidade é renderizada JÁ no estado final. Não usamos o
   * `useReducedMotion()` do Framer direto porque ele ignora o modo centralizado
   * (`dp-force-motion`) documentado em `lib/motionMode.ts`.
   */
  const movimentoReduzido = useMovimentoReduzido();
  /** Props da cascata de um controle; com movimento reduzido, entra visível. */
  const entradaControle = (indice: number) =>
    movimentoReduzido ? ({ initial: false } as const) : entradaFiltro(indice);

  const atualizar = (patch: Partial<FiltrosAuditoria>) => {
    setFiltros((atual) => ({ ...atual, ...patch }));
    setPagina(1);
  };
  const limpar = () => {
    setFiltros(FILTROS_AUDITORIA_INICIAIS);
    setPagina(1);
  };
  const alterarPorPagina = (valor: number) => {
    setPorPagina(valor);
    setPagina(1);
  };

  return (
    // Contexto de presença local (não renderiza DOM): o `AnimatePresence
    // initial={false}` de um ancestral pularia o keyframe `hidden` de todo
    // `motion.*` abaixo e nenhuma entrada tocaria. Mesmo mecanismo documentado
    // em `ui/entrada-cards.tsx` e já usado pela aba Pagamentos.
    <EntradaPresenca>
      <div className="space-y-3">
        {erro && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-warning/35 bg-warning/10 px-3 py-2 text-[11px] text-warning">
            <span className="flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              Não foi possível carregar a auditoria agora.
            </span>
            {onTentarNovamente && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 border-warning/40 bg-transparent text-[10px] text-warning"
                onClick={onTentarNovamente}
              >
                Tentar novamente
              </Button>
            )}
          </div>
        )}

        {/* Cascata REAL dos controles: o painel (borda/fundo) é estático e cada
            unidade entra com o MESMO `cardVariants` dos KPI Cards do Dashboard
            (fade + y 20 · 0,4s · delay 0,08s por índice). Como o container não
            anima, não existe movimento acumulado nem cascata "toda de uma vez".
            As seis badges contam como UMA unidade (evita cascata longa). */}
        <section
          className="rounded-xl border border-border/40 bg-card/40 p-3 shadow-xs"
          aria-label="Filtros da auditoria"
        >
          <div className="grid min-w-0 gap-2.5 xl:grid-cols-[minmax(0,30%)_minmax(0,1fr)] xl:items-center">
            <motion.div {...entradaControle(0)} className="relative min-w-0">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                value={filtros.busca}
                onChange={(event) => atualizar({ busca: event.target.value })}
                placeholder="Buscar evento, campanha, colaborador ou valor..."
                aria-label="Buscar evento, campanha, colaborador ou valor"
                className="h-10 rounded-lg border-border/50 bg-background/70 pl-9 text-[11px]"
              />
            </motion.div>
            <div className="grid min-w-0 flex-1 grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.18fr)_minmax(0,1fr)_minmax(0,1.42fr)]">
              <Select value={filtros.tipo} onValueChange={(valor) => atualizar({ tipo: valor })}>
                <MotionSelectTrigger
                  {...entradaControle(1)}
                  aria-label="Tipo de evento"
                  className="h-10 rounded-lg border-border/50 bg-background/70 text-[11px]"
                >
                  <SelectValue placeholder="Todos os tipos" />
                </MotionSelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os tipos</SelectItem>
                  {tipos.map((tipo) => (
                    <SelectItem key={tipo.valor} value={tipo.valor}>
                      {tipo.rotulo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filtros.entidade} onValueChange={(valor) => atualizar({ entidade: valor })}>
                <MotionSelectTrigger
                  {...entradaControle(2)}
                  aria-label="Entidade"
                  className="h-10 rounded-lg border-border/50 bg-background/70 text-[11px]"
                >
                  <SelectValue placeholder="Todas as entidades" />
                </MotionSelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as entidades</SelectItem>
                  {entidades.map((entidade) => (
                    <SelectItem key={entidade.valor} value={entidade.valor}>
                      {entidade.rotulo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filtros.usuario} onValueChange={(valor) => atualizar({ usuario: valor })}>
                <MotionSelectTrigger
                  {...entradaControle(3)}
                  aria-label="Usuário"
                  className="h-10 rounded-lg border-border/50 bg-background/70 text-[11px]"
                >
                  <SelectValue placeholder="Todos os usuários" />
                </MotionSelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os usuários</SelectItem>
                  {usuarios.map((usuario) => (
                    <SelectItem key={usuario.valor} value={usuario.valor}>
                      {usuario.rotulo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filtros.periodo}
                onValueChange={(valor) => atualizar({ periodo: valor as FiltrosAuditoria['periodo'] })}
              >
                <MotionSelectTrigger
                  {...entradaControle(4)}
                  aria-label="Período"
                  className="h-10 min-w-0 gap-1.5 rounded-lg border-border/50 bg-background/70 text-[10px]"
                >
                  <CalendarDays className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="min-w-0 truncate">{rotuloIntervalo(intervalo)}</span>
                </MotionSelectTrigger>
                <SelectContent>
                  {PERIODOS_AUDITORIA.map((periodo) => (
                    <SelectItem key={periodo.id} value={periodo.id}>
                      {periodo.rotulo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="audit-filter-secondary mt-2.5">
            <motion.div
              {...entradaControle(5)}
              className="flex min-w-0 flex-wrap items-center gap-3 max-[1439px]:gap-px min-[1440px]:gap-1.5 min-[1600px]:gap-2 min-[1800px]:gap-3"
            >
              {categorias.map((categoria) => {
                const ativa = filtros.categoria === categoria.id;
                const tema = TEMA_CATEGORIA[categoria.id];
                const glow = GLOW_CATEGORIA[categoria.id];
                return (
                  <button
                    key={categoria.id}
                    type="button"
                    aria-pressed={ativa}
                    data-active={ativa}
                    data-category={categoria.id}
                    onClick={() => atualizar({ categoria: categoria.id })}
                    className={cn(
                      'inline-flex h-[38px] shrink-0 items-center gap-1.5 rounded-full border px-[15px] text-[10px] font-medium transition-[background-color,border-color,color,box-shadow] duration-200 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background max-[1365px]:gap-0.5 max-[1365px]:px-[3px] max-[1599px]:gap-1 max-[1599px]:px-[8px] min-[1600px]:gap-1 min-[1600px]:px-[14px] min-[1800px]:gap-1.5 min-[1800px]:px-[15px]',
                      ativa
                        ? cn(tema.fundoAtivo, BORDA_ATIVA_CATEGORIA[categoria.id], tema.textoAtivo, glow)
                        : cn(tema.fundo, tema.borda, tema.texto, tema.hoverFundo, tema.hoverBorda, tema.hoverTexto)
                    )}
                  >
                    <span className={cn('h-2 w-2 shrink-0 rounded-full', tema.ponto)} aria-hidden="true" />
                    <span className="whitespace-nowrap">{categoria.rotulo}</span>
                    <span
                      className={cn(
                        'inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold tabular-nums transition-colors duration-200',
                        ativa ? tema.contadorAtivo : tema.contador
                      )}
                    >
                      {contarCategoria(eventos, categoria.id)}
                    </span>
                  </button>
                );
              })}
            </motion.div>

            <div className="flex flex-wrap items-center justify-end gap-1 min-[1280px]:flex-nowrap min-[1600px]:gap-2">
              <motion.div {...entradaControle(6)} className="flex shrink-0 items-center gap-1">
                <span className="hidden whitespace-nowrap text-[10px] text-muted-foreground min-[1600px]:inline">
                  Ordenar por
                </span>
                <Select
                  value={filtros.ordem}
                  onValueChange={(valor) => atualizar({ ordem: valor as FiltrosAuditoria['ordem'] })}
                >
                  <SelectTrigger
                    aria-label="Ordenar por"
                    className="h-8 shrink-0 gap-1 rounded-lg border-border/40 bg-background/70 px-2 text-[10px] max-[1599px]:w-[118px] max-[1599px]:px-1"
                  >
                    <ArrowDownUp className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recentes">Mais recentes</SelectItem>
                    <SelectItem value="antigos">Mais antigos</SelectItem>
                  </SelectContent>
                </Select>
              </motion.div>
              <MotionButton
                {...entradaControle(7)}
                type="button"
                variant={filtrosAtivos ? 'outline' : 'ghost'}
                size="sm"
                aria-label="Limpar filtros"
                aria-pressed={filtrosAtivos}
                data-active={filtrosAtivos}
                className={cn(
                  'h-8 shrink-0 gap-1.5 px-2 text-[10px] transition-[background-color,border-color,color,box-shadow] duration-200',
                  filtrosAtivos
                    ? 'border-primary/40 bg-primary/10 text-primary shadow-[0_0_12px_hsl(var(--primary)/0.14)] hover:border-primary/60 hover:bg-primary/15 hover:shadow-[0_0_16px_hsl(var(--primary)/0.18)]'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                onClick={limpar}
              >
                <XIcone className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="max-[1439px]:hidden">Limpar filtros</span>
                <span className="max-[1439px]:inline min-[1440px]:hidden">Limpar</span>
              </MotionButton>
              <div className="ml-0 flex shrink-0 items-center gap-3 min-[1600px]:ml-2">
                <MotionButton
                  {...entradaControle(8)}
                  type="button"
                  variant="outline"
                  className="h-10 shrink-0 gap-1.5 rounded-[10px] border-success/45 bg-success/12 px-4 text-[13px] font-semibold text-success transition-[background-color,border-color,color,box-shadow] duration-200 hover:border-success/65 hover:bg-success/20 hover:shadow-[0_0_12px_hsl(var(--success)/0.14)]"
                  onClick={() => onExportar('csv')}
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                  CSV
                </MotionButton>
                <MotionButton
                  {...entradaControle(9)}
                  type="button"
                  variant="outline"
                  className="h-10 shrink-0 gap-1.5 rounded-[10px] border-destructive/45 bg-destructive/12 px-4 text-[13px] font-semibold text-destructive transition-[background-color,border-color,color,box-shadow] duration-200 hover:border-destructive/65 hover:bg-destructive/20 hover:shadow-[0_0_12px_hsl(var(--destructive)/0.14)]"
                  onClick={() => onExportar('pdf')}
                >
                  <FileText className="h-4 w-4" aria-hidden="true" />
                  PDF
                </MotionButton>
              </div>
            </div>
          </div>
        </section>

        {carregando ? (
          <div className="space-y-3" aria-busy="true" aria-label="Carregando auditoria">
            {[0, 1, 2].map((grupo) => (
              <section key={grupo} className="overflow-hidden rounded-xl border border-border/40 bg-card/30">
                <div className="flex h-8 items-center justify-between border-b border-border/30 bg-muted/20 px-3">
                  <Skeleton className="h-3 w-44" />
                  <Skeleton className="h-4 w-16 rounded-full" />
                </div>
                <div className="space-y-3 p-3">
                  {[0, 1, 2].map((linha) => (
                    <div key={linha} className="grid grid-cols-[42px_1fr_120px_100px] items-center gap-3">
                      <Skeleton className="h-3 w-8" />
                      <div className="space-y-1.5">
                        <Skeleton className="h-3 w-2/3" />
                        <Skeleton className="h-2.5 w-1/2" />
                      </div>
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-7 w-24" />
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : grupos.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/50 px-6 py-12 text-center">
            <FileSearch className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
            <p className="text-[13px] font-medium">Nenhum evento encontrado</p>
            <p className="text-[11px] text-muted-foreground">Ajuste os filtros ou selecione outro período.</p>
            <Button type="button" variant="outline" size="sm" className="mt-1 h-8 text-xs" onClick={limpar}>
              Limpar filtros
            </Button>
          </div>
        ) : (
          // Contêiner ESTÁTICO: cada unidade anima uma única vez (cabeçalho do dia
          // e linhas). Animar também o contêiner com `y` criaria movimento
          // acumulado sobre os mesmos elementos — exatamente o que se quer evitar.
          <div data-testid="auditoria-timeline" className="space-y-2.5">
            {grupos.map((grupo) => (
              <section
                key={grupo.chave}
                className="overflow-hidden rounded-xl border border-border/40 bg-card/30"
                aria-label={grupo.rotulo}
              >
                <motion.div
                  data-testid="auditoria-grupo-cabecalho"
                  data-cascata-indice={indicesEntrada.get(`grupo:${grupo.chave}`) ?? 0}
                  custom={indicesEntrada.get(`grupo:${grupo.chave}`) ?? 0}
                  variants={linhaAuditoriaVariants}
                  initial={movimentoReduzido ? false : 'hidden'}
                  animate="visible"
                  className="flex h-8 items-center justify-between border-b border-border/30 bg-muted/20 px-3"
                >
                  <h3 className="truncate text-[11px] font-semibold">{grupo.rotulo}</h3>
                  <Badge
                    variant="outline"
                    className="h-5 rounded-full border-border/40 bg-background/50 px-2 text-[9px] font-normal text-muted-foreground"
                  >
                    {grupo.eventos.length} {grupo.eventos.length === 1 ? 'evento' : 'eventos'}
                  </Badge>
                </motion.div>
                {/* `AnimatePresence` local (sem props) + `key` de identidade da
                  lista: mesmo mecanismo do `<tbody>` da tabela de Campanhas. Ao
                  trocar página/ordenação/filtros as linhas remontam e cascateiam
                  de novo; o cabeçalho do dia e a moldura do grupo ficam montados,
                  então o agrupamento nunca se desorganiza. */}
                <AnimatePresence>
                  <motion.ul key={`${grupo.chave}|${chaveCascata}`} className="m-0 list-none p-0">
                    {grupo.eventos.map((evento, indice) => (
                      <LinhaEvento
                        key={evento.id}
                        evento={evento}
                        indice={indicesEntrada.get(`evento:${evento.id}`) ?? indice}
                        primeiro={indice === 0}
                        ultimo={indice === grupo.eventos.length - 1}
                        entradaImediata={movimentoReduzido}
                        onDetalhe={(origem) => abrirDetalhe(evento, origem)}
                      />
                    ))}
                  </motion.ul>
                </AnimatePresence>
              </section>
            ))}
          </div>
        )}

        {!carregando && (
          <div className="overflow-hidden rounded-xl border border-border/40 bg-card/30">
            <PaginacaoAuditoria
              pagina={paginaAtual}
              total={filtrados.length}
              porPagina={porPagina}
              onPagina={setPagina}
              onPorPagina={alterarPorPagina}
            />
          </div>
        )}

        <AuditoriaEventoDialog
          evento={eventoDetalhe}
          aberto={detalheAberto}
          retornarFocoPara={origemDetalhe}
          onOpenChange={(aberto) => {
            // Só o booleano muda: o evento fica em memória durante a saída.
            setDetalheAberto(aberto);
          }}
        />
      </div>
    </EntradaPresenca>
  );
}
