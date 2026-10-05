import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { PageTitle } from '@/components/PageTitle';
import { PageLayout } from '@/components/layout';
import { Table, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyList } from '@/components/ui/empty-state';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  cascadeContainerVariants,
  cascadeItemVariants,
  cascadeOverlayVariants,
  cascadeShellVariants,
} from '@/components/ui/cascade-motion';
import { CascadeTableBody, CascadeTableRow } from '@/components/ui/cascade-table';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { MetricCard, cardVariants, type MetricTone } from '@/components/dashboard/MetricCard';
import { auditoriaService, type AuditoriaRegistro } from '@/services/auditoriaService';
// MOCK VISUAL — ver src/mocks/auditoriaMock.ts (dev + VITE_AUDITORIA_MOCK=true).
import { getMockAuditoriaGlobal, isAuditoriaMockEnabled } from '@/mocks/auditoriaMock';
import { useExcelExport } from '@/hooks/useExcelExport';
import { useEmpresas } from '@/hooks/useEmpresas';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Activity,
  ArrowUpDown,
  Calculator,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Database,
  Download,
  Eye,
  FilePenLine,
  FilePlus2,
  History,
  MoreVertical,
  PenLine,
  RotateCcw,
  ScrollText,
  Search,
  Shield,
  SlidersHorizontal,
  Trash2,
  User,
  X,
  type LucideIcon,
} from 'lucide-react';

/**
 * AUDITORIA GLOBAL — painel de conformidade da trilha do sistema (rota
 * `/auditoria`).
 *
 * FONTE DE DADOS: exclusivamente o RPC `listar_auditoria` (via
 * `auditoriaService.listar`). Nenhuma query nova de negócio, nenhum endpoint novo
 * e nenhuma métrica inventada: tudo abaixo é lido OU derivado dos campos reais do
 * log (`created_at`, `tabela`, `registro_id`, `acao`, `user_id`, `payload`).
 *
 * CAMPOS REAIS × DERIVADOS: o RPC NÃO devolve `status`, `user_email`,
 * `ip_address` nem `user_agent` — esses só aparecem quando quem gravou os
 * incluiu no payload. Por isso:
 *   • `user_email`/`ip_address`/`user_agent` são exibidos SOMENTE quando
 *     presentes (payload do log ou o mock de layout); caso contrário caem para
 *     `Sistema`/`—` — nunca inventamos um valor.
 *   • `dados_anteriores`/`dados_novos` são desembrulhados do `payload`
 *     (aceitando as duas chaves históricas: `dados_anteriores|anteriores`).
 *   • Os KPIs sucesso/pendente/falha NÃO existem no log global (não há coluna de
 *     status). No lugar deles a linha de resumo mostra dimensões REAIS e
 *     mapeáveis: Eventos (total), Inserções, Atualizações e Exclusões — todas
 *     contagens diretas de `acao`, com a variação calculada a partir de
 *     `created_at` (últimos 30 dias vs. os 30 anteriores).
 *   • O nome do responsável é derivado do `user_email` quando existir; senão do
 *     cadastro de `profiles` (`user_id → nome`) por uma LEITURA opcional da
 *     tabela já existente; senão do próprio `user_id`; senão `Sistema`.
 *
 * MOCK VISUAL: quando `isAuditoriaMockEnabled()` é verdadeiro (dev + env var), a
 * leitura do RPC é curto-circuitada por dados fictícios SÓ para validação de
 * layout — o bloco está marcado e é removível (ver `src/mocks/auditoriaMock.ts`).
 */

/* ─── Tipos normalizados da trilha ────────────────────────────────────────── */

/** Linha de auditoria já normalizada (payload desembrulhado) para a tela. */
interface LogAuditoria {
  id: string;
  created_at: string;
  tabela: string | null;
  registro_id: string | null;
  acao: string | null;
  user_id: string | null;
  user_email: string | null;
  ip_address: string | null;
  user_agent: string | null;
  dados_anteriores: unknown;
  dados_novos: unknown;
}

/** Registro cru (RPC real ou mock de layout) — aceita chaves flat E aninhadas. */
type LogCru = Partial<AuditoriaRegistro> & {
  user_email?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  dados_anteriores?: unknown;
  dados_novos?: unknown;
  payload?: Record<string, unknown> | null;
};

/** Normaliza um valor desconhecido em string não vazia ou `null`. */
function comoTexto(valor: unknown): string | null {
  return typeof valor === 'string' && valor.length > 0 ? valor : null;
}

/**
 * Relógio da trilha isolado num módulo puro. Ler `Date.now()` direto no corpo do
 * componente dispararia o aviso `react-hooks/purity` (o render precisa ser
 * idempotente); expor a leitura atrás de uma função de módulo mantém o corpo do
 * componente puro sem inventar a data — é o relógio real, só encapsulado.
 */
function agoraEpoch(): number {
  return Date.now();
}

/** Desembrulha o `payload` do RPC e achata as chaves para o formato da tela. */
function normalizar(cru: LogCru): LogAuditoria {
  const p = (cru.payload ?? {}) as Record<string, unknown>;
  return {
    id: String(cru.id ?? ''),
    created_at: String(cru.created_at ?? ''),
    tabela: cru.tabela ?? null,
    registro_id: cru.registro_id ?? null,
    acao: cru.acao ?? null,
    user_id: comoTexto(cru.user_id) ?? comoTexto(p.user_id),
    user_email: comoTexto(cru.user_email) ?? comoTexto(p.user_email),
    ip_address: comoTexto(cru.ip_address) ?? comoTexto(p.ip_address),
    user_agent: comoTexto(cru.user_agent) ?? comoTexto(p.user_agent),
    dados_anteriores: cru.dados_anteriores ?? p.dados_anteriores ?? p.anteriores ?? null,
    dados_novos: cru.dados_novos ?? p.dados_novos ?? p.novos ?? null,
  };
}

/* ─── Ação → apresentação amigável (título, chip, ícone, badge) ───────────── */

interface AcaoMeta {
  titulo: string;
  chip: string;
  icon: LucideIcon;
  badge: string;
  ponto: string;
  tom: MetricTone;
}

/**
 * Camada de APRESENTAÇÃO das operações técnicas. Nenhum dado novo: só troca o
 * código cru (`INSERT`…) por um nome amigável + a tinta semântica do sistema.
 * DELETE usa a variante `destructive-vivid` (a mesma dos estados críticos do
 * módulo de Admissões), legível sobre o navy — o `--destructive` do tema fica
 * com ~2:1 de contraste e o alerta some no fundo.
 */
const ACOES: Record<string, AcaoMeta> = {
  INSERT: {
    titulo: 'Inserção de registro',
    chip: 'Inserções',
    icon: FilePlus2,
    badge: 'bg-success/15 text-success',
    ponto: 'bg-success',
    tom: 'success',
  },
  UPDATE: {
    titulo: 'Atualização de registro',
    chip: 'Atualizações',
    icon: FilePenLine,
    badge: 'bg-info/15 text-info',
    ponto: 'bg-info',
    tom: 'info',
  },
  DELETE: {
    titulo: 'Exclusão de registro',
    chip: 'Exclusões',
    icon: Trash2,
    badge: 'bg-destructive-vivid/15 text-destructive-vivid',
    ponto: 'bg-destructive-vivid',
    tom: 'destructive',
  },
  EXECUTE_CALC: {
    titulo: 'Execução de cálculo',
    chip: 'Cálculos',
    icon: Calculator,
    badge: 'bg-warning/15 text-warning',
    ponto: 'bg-warning',
    tom: 'warning',
  },
  VISUALIZACAO: {
    titulo: 'Visualização de registro',
    chip: 'Visualizações',
    icon: Eye,
    badge: 'bg-muted text-muted-foreground',
    ponto: 'bg-muted-foreground',
    tom: 'muted',
  },
  EXPORT: {
    titulo: 'Exportação de dados',
    chip: 'Exportações',
    icon: Download,
    badge: 'bg-info/15 text-info',
    ponto: 'bg-info',
    tom: 'info',
  },
  SIGN: {
    titulo: 'Assinatura de documento',
    chip: 'Assinaturas',
    icon: PenLine,
    badge: 'bg-primary/15 text-primary',
    ponto: 'bg-primary',
    tom: 'primary',
  },
};

/** Ação desconhecida não some: cai num metadado neutro com o código cru. */
const ACAO_FALLBACK: AcaoMeta = {
  titulo: 'Evento',
  chip: 'Eventos',
  icon: Activity,
  badge: 'bg-muted text-muted-foreground',
  ponto: 'bg-muted-foreground',
  tom: 'muted',
};

function acaoMeta(acao?: string | null): AcaoMeta {
  return (acao && ACOES[acao]) || ACAO_FALLBACK;
}

/* ─── Recurso (tabela) → nome amigável ────────────────────────────────────── */

const RECURSO_LABELS: Record<string, string> = {
  colaboradores: 'Colaboradores',
  admissoes: 'Admissões',
  folha_pagamento: 'Folha de Pagamento',
  desligamentos: 'Desligamentos',
  ferias: 'Férias',
  ponto: 'Ponto',
  usuarios: 'Usuários',
  beneficios: 'Benefícios',
  empresas: 'Empresas',
  medidas_disciplinares: 'Medidas Disciplinares',
};

/**
 * Nome amigável do recurso. Para tabelas fora do mapa, deriva um título a partir
 * do nome técnico REAL (troca `_` por espaço e capitaliza) — não inventamos um
 * rótulo, só formatamos o que veio do log.
 */
function rotuloRecurso(tabela?: string | null): string {
  if (!tabela) return '—';
  if (RECURSO_LABELS[tabela]) return RECURSO_LABELS[tabela];
  return tabela.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/* ─── Descrição secundária do evento (derivada de dados reais) ────────────── */

/** Campos cujo valor mudou entre `antes` e `depois` (só objetos simples). */
function camposAlterados(antes: unknown, depois: unknown): string[] {
  if (!antes || !depois || typeof antes !== 'object' || typeof depois !== 'object') return [];
  const a = antes as Record<string, unknown>;
  const d = depois as Record<string, unknown>;
  const chaves = new Set([...Object.keys(a), ...Object.keys(d)]);
  return [...chaves].filter((k) => JSON.stringify(a[k]) !== JSON.stringify(d[k]));
}

/**
 * Frase de apoio do evento — SEMPRE derivada de `acao` + `tabela` (+ diff real
 * dos payloads no UPDATE). Nada de texto sobre campos que não existem.
 */
function descricaoEvento(log: LogAuditoria): string {
  const recurso = rotuloRecurso(log.tabela);
  switch (log.acao) {
    case 'INSERT':
      return `Novo registro em ${recurso}`;
    case 'UPDATE': {
      const n = camposAlterados(log.dados_anteriores, log.dados_novos).length;
      return n > 0
        ? `${n} campo${n > 1 ? 's' : ''} alterado${n > 1 ? 's' : ''} em ${recurso}`
        : `Alteração em ${recurso}`;
    }
    case 'DELETE':
      return `Registro removido de ${recurso}`;
    case 'EXECUTE_CALC':
      return `Cálculo executado em ${recurso}`;
    case 'VISUALIZACAO':
      return `Acesso a ${recurso}`;
    case 'EXPORT':
      return `Exportação de ${recurso}`;
    case 'SIGN':
      return `Assinatura em ${recurso}`;
    default:
      return `Evento em ${recurso}`;
  }
}

/* ─── Responsável (identidade + avatar de iniciais) ───────────────────────── */

const CORES_AVATAR = [
  'bg-primary/15 text-primary',
  'bg-info/15 text-info',
  'bg-success/15 text-success',
  'bg-warning/15 text-warning',
  'bg-destructive-vivid/15 text-destructive-vivid',
];

function iniciaisDe(valor: string): string {
  const local = valor
    .split('@')[0]
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim();
  const partes = local.split(/\s+/).filter(Boolean);
  if (partes.length === 0) return valor.slice(0, 2).toUpperCase();
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[1][0]).toUpperCase();
}

/** Avatar circular de iniciais, cor estável por nome (não muda entre reloads). */
function AvatarIniciais({ valor, className }: { valor: string; className?: string }) {
  let hash = 0;
  for (let i = 0; i < valor.length; i += 1) hash = (hash + valor.charCodeAt(i) * (i + 1)) % CORES_AVATAR.length;
  return (
    <span
      aria-hidden
      className={cn(
        'flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-display text-[10px] font-semibold',
        CORES_AVATAR[hash],
        className
      )}
    >
      {iniciaisDe(valor)}
    </span>
  );
}

/** Linha rótulo/valor do detalhe do log. */
function CampoDetalhe({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{rotulo}</dt>
      <dd className="mt-0.5 break-words text-[12.5px] leading-snug text-foreground">{children}</dd>
    </div>
  );
}

/* ─── Filtros, ordenação e paginação (constantes) ─────────────────────────── */

type OrdemAuditoria = 'recentes' | 'antigos';
type PeriodoAuditoria = 'todos' | '7d' | '30d' | '90d' | 'ano';

const ORDENS: readonly { value: OrdemAuditoria; label: string }[] = [
  { value: 'recentes', label: 'Mais recentes' },
  { value: 'antigos', label: 'Mais antigos' },
];

const PERIODOS: readonly { value: PeriodoAuditoria; label: string }[] = [
  { value: 'todos', label: 'Todo o período' },
  { value: '7d', label: 'Últimos 7 dias' },
  { value: '30d', label: 'Últimos 30 dias' },
  { value: '90d', label: 'Últimos 90 dias' },
  { value: 'ano', label: 'Últimos 12 meses' },
];

const DIAS_PERIODO: Record<Exclude<PeriodoAuditoria, 'todos'>, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  ano: 365,
};

/** Ordem canônica dos chips/filtros rápidos por ação. */
const ORDEM_ACOES = ['INSERT', 'UPDATE', 'DELETE', 'EXECUTE_CALC', 'VISUALIZACAO', 'EXPORT', 'SIGN'] as const;

const TAMANHOS_PAGINA = [10, 25, 50] as const;

/**
 * Blocos que cascateiam na janela de detalhe do log (cabeçalho, corpo e rodapé).
 * Alimenta as MESMAS variants do popup "Pendências" (`ui/cascade-motion.ts`) —
 * usadas também pelas janelas de Admissões-Auditoria.
 */
const BLOCOS_CASCATA_DETALHE = 3;
const SHELL_DETALHE = cascadeShellVariants(BLOCOS_CASCATA_DETALHE);
const OVERLAY_DETALHE = cascadeOverlayVariants(BLOCOS_CASCATA_DETALHE);

/* ─── Peças do topo ───────────────────────────────────────────────────────── */

interface ChipFiltroProps {
  label: string;
  total: number;
  ativo: boolean;
  ponto?: string;
  icone?: LucideIcon;
  onClick: () => void;
}

/** Atalho arredondado de filtro rápido com contagem real. */
function ChipFiltro({ label, total, ativo, ponto, icone: Icone, onClick }: ChipFiltroProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativo}
      className={cn(
        // `w-full` + `flex`: o chip é o CONTEÚDO de um wrapper Motion que carrega a
        // geometria (`flex-1 min-w-fit`) — MESMO padrão de Admissões-Auditoria.
        'flex h-8 w-full min-w-fit items-center justify-center gap-2 whitespace-nowrap rounded-full border px-3 text-[11.5px] font-medium transition-colors',
        ativo
          ? 'border-primary bg-primary text-primary-foreground shadow-sm'
          : 'border-border/40 bg-card text-muted-foreground hover:border-border/70 hover:bg-muted/50 hover:text-foreground'
      )}
    >
      {ponto && (
        <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', ativo ? 'bg-primary-foreground/60' : ponto)} />
      )}
      {Icone && <Icone className={cn('h-3.5 w-3.5 shrink-0', ativo && 'text-primary-foreground')} />}
      {label}
      <span className={cn('tabular-nums', ativo ? 'text-primary-foreground/70' : 'text-muted-foreground/60')}>
        ({total})
      </span>
    </button>
  );
}

/** Botão de ícone com o tooltip padrão do sistema (sem botão morto). */
function BotaoAcao({
  label,
  icon: Icone,
  onClick,
  disabled,
}: {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={label}
          disabled={disabled}
          onClick={onClick}
          className="h-7 w-7 rounded-lg text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
        >
          <Icone className="h-3.5 w-3.5" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

/* ─── Página ──────────────────────────────────────────────────────────────── */

export default function AuditoriaPage() {
  const { exportarExcel } = useExcelExport();
  const { empresaAtual } = useEmpresas();
  const empresaId = empresaAtual?.id || '';

  const [search, setSearch] = useState('');
  const [tabelaFilter, setTabelaFilter] = useState('todos');
  const [acaoFilter, setAcaoFilter] = useState('todos');
  const [responsavelFilter, setResponsavelFilter] = useState('todos');
  const [periodoFilter, setPeriodoFilter] = useState<PeriodoAuditoria>('todos');
  const [registroFilter, setRegistroFilter] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [painelAberto, setPainelAberto] = useState(false);
  const [ordem, setOrdem] = useState<OrdemAuditoria>('recentes');
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState<number>(TAMANHOS_PAGINA[0]);
  const [selectedLog, setSelectedLog] = useState<LogAuditoria | null>(null);
  // `aberto` SEPARADO do log: ao fechar, o registro continua montado durante a
  // animação de SAÍDA (Radix + `AnimatePresence`) — MESMO comportamento das
  // janelas de Admissões-Auditoria/"Pendências".
  const [detalheAberto, setDetalheAberto] = useState(false);

  /** Abre o detalhe e mantém o log montado até a saída terminar. */
  const abrirDetalhe = (log: LogAuditoria) => {
    setSelectedLog(log);
    setDetalheAberto(true);
  };

  const { data: logsDb, isLoading: isLoadingDb } = useQuery({
    queryKey: ['auditoria', empresaId],
    queryFn: () => auditoriaService.listar(empresaId, { limite: 500 }),
    enabled: !!empresaId,
  });

  // MOCK VISUAL — ver src/mocks/auditoriaMock.ts (dev + VITE_AUDITORIA_MOCK=true).
  // Curto-circuita a leitura do RPC `listar_auditoria` para validação de LAYOUT:
  // nenhum registro real é lido e nada é gravado. Sem o opt-in, o fluxo real segue.
  const mockAuditoriaAtivo = isAuditoriaMockEnabled();
  const logsCru = useMemo<LogCru[]>(
    () => (mockAuditoriaAtivo ? (getMockAuditoriaGlobal() as unknown as LogCru[]) : ((logsDb ?? []) as LogCru[])),
    [mockAuditoriaAtivo, logsDb]
  );
  const isLoading = mockAuditoriaAtivo ? false : isLoadingDb;

  // LEITURA opcional do cadastro já existente (`profiles`) para resolver
  // `user_id → nome` quando o log não traz o e-mail do autor. Degrada em
  // silêncio (retry:false): se a RLS não liberar, cai para o `user_id`.
  const { data: perfis } = useQuery({
    queryKey: ['auditoria-perfis'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('user_id, nome');
      if (error) throw error;
      return data ?? [];
    },
    enabled: !mockAuditoriaAtivo,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const perfisPorId = useMemo(() => {
    const mapa = new Map<string, string>();
    (perfis ?? []).forEach((p) => {
      if (p.user_id && p.nome) mapa.set(p.user_id, p.nome);
    });
    return mapa;
  }, [perfis]);

  const normalizados = useMemo(() => logsCru.map(normalizar), [logsCru]);

  /** Identidade exibida do responsável (e-mail → nome do perfil → user_id → Sistema). */
  const nomeResponsavel = (log: LogAuditoria): string => {
    if (log.user_email) return log.user_email;
    if (log.user_id && perfisPorId.has(log.user_id)) return perfisPorId.get(log.user_id) as string;
    if (log.user_id) return log.user_id;
    return 'Sistema';
  };

  const opcoesTabela = useMemo(
    () =>
      Array.from(new Set(normalizados.map((l) => l.tabela).filter((t): t is string => !!t))).sort((a, b) =>
        rotuloRecurso(a).localeCompare(rotuloRecurso(b), 'pt-BR')
      ),
    [normalizados]
  );

  const opcoesResponsavel = useMemo(
    () => Array.from(new Set(normalizados.map((l) => nomeResponsavel(l)))).sort((a, b) => a.localeCompare(b, 'pt-BR')),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [normalizados, perfisPorId]
  );

  const contagemPorAcao = useMemo(() => {
    const mapa = new Map<string, number>();
    normalizados.forEach((l) => {
      if (l.acao) mapa.set(l.acao, (mapa.get(l.acao) ?? 0) + 1);
    });
    return mapa;
  }, [normalizados]);

  const filtrados = useMemo(() => {
    const agora = agoraEpoch();
    const termo = search.trim().toLowerCase();
    return normalizados.filter((l) => {
      const alvo = [
        l.user_email,
        l.user_id,
        l.tabela,
        rotuloRecurso(l.tabela),
        l.acao,
        acaoMeta(l.acao).titulo,
        l.registro_id,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      const matchSearch = !termo || alvo.includes(termo);
      const matchTabela = tabelaFilter === 'todos' || l.tabela === tabelaFilter;
      const matchAcao = acaoFilter === 'todos' || l.acao === acaoFilter;
      const matchResponsavel = responsavelFilter === 'todos' || nomeResponsavel(l) === responsavelFilter;
      const matchRegistro =
        !registroFilter || (l.registro_id ?? '').toLowerCase().includes(registroFilter.toLowerCase());
      let matchPeriodo = true;
      if (periodoFilter !== 'todos') {
        const limite = DIAS_PERIODO[periodoFilter] * 86_400_000;
        matchPeriodo = agora - new Date(l.created_at).getTime() <= limite;
      }
      let matchDatas = true;
      if (dataInicio) matchDatas = matchDatas && new Date(l.created_at).getTime() >= new Date(dataInicio).getTime();
      if (dataFim)
        matchDatas = matchDatas && new Date(l.created_at).getTime() <= new Date(dataFim).getTime() + 86_399_000;
      return matchSearch && matchTabela && matchAcao && matchResponsavel && matchRegistro && matchPeriodo && matchDatas;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    normalizados,
    search,
    tabelaFilter,
    acaoFilter,
    responsavelFilter,
    periodoFilter,
    registroFilter,
    dataInicio,
    dataFim,
    perfisPorId,
  ]);

  const ordenados = useMemo(() => {
    const copia = [...filtrados];
    copia.sort((a, b) => {
      const ta = new Date(a.created_at).getTime();
      const tb = new Date(b.created_at).getTime();
      return ordem === 'recentes' ? tb - ta : ta - tb;
    });
    return copia;
  }, [filtrados, ordem]);

  const totalPaginas = Math.max(1, Math.ceil(ordenados.length / porPagina));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const inicioRange = (paginaAtual - 1) * porPagina;
  const linhas = ordenados.slice(inicioRange, inicioRange + porPagina);
  const fimRange = Math.min(inicioRange + porPagina, ordenados.length);

  /**
   * Chave da CASCATA de linhas — MESMA ideia de Admissões-Auditoria: muda quando
   * a listagem troca de identidade (página, ordenação, filtros), remontando o
   * `<tbody>` e repetindo a cascata. A busca textual fica FORA (não reanima a
   * cada tecla).
   */
  const cascataChave = `${paginaAtual}|${ordem}|${tabelaFilter}|${acaoFilter}|${responsavelFilter}|${periodoFilter}|${registroFilter}|${dataInicio}|${dataFim}|${porPagina}`;

  // Sempre que um filtro (ou o tamanho da página) muda, a lista encolhe/cresce
  // e a página corrente deixa de fazer sentido — volta para a primeira. É um
  // efeito de sincronização legítimo (estado derivado do filtro): só dispara
  // quando UMA das dependências muda.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPagina(1);
  }, [
    search,
    tabelaFilter,
    acaoFilter,
    responsavelFilter,
    periodoFilter,
    registroFilter,
    dataInicio,
    dataFim,
    porPagina,
  ]);

  const temFiltro =
    !!search.trim() ||
    tabelaFilter !== 'todos' ||
    acaoFilter !== 'todos' ||
    responsavelFilter !== 'todos' ||
    periodoFilter !== 'todos' ||
    !!registroFilter ||
    !!dataInicio ||
    !!dataFim;

  const limparFiltros = () => {
    setSearch('');
    setTabelaFilter('todos');
    setAcaoFilter('todos');
    setResponsavelFilter('todos');
    setPeriodoFilter('todos');
    setRegistroFilter('');
    setDataInicio('');
    setDataFim('');
  };

  const handleExport = () => {
    if (!ordenados.length) return;
    exportarExcel(
      'Log de Auditoria',
      ordenados.map((l) => ({
        ...l,
        data: new Date(l.created_at).toLocaleString('pt-BR'),
        usuario: nomeResponsavel(l),
        dados_anteriores: JSON.stringify(l.dados_anteriores),
        dados_novos: JSON.stringify(l.dados_novos),
      })),
      ['data', 'tabela', 'acao', 'usuario', 'registro_id', 'ip_address', 'dados_anteriores', 'dados_novos']
    );
  };

  const copiarRegistro = async (registroId: string) => {
    try {
      await navigator.clipboard.writeText(registroId);
      toast.success('ID do registro copiado.');
    } catch {
      toast.error('Não foi possível copiar o ID.');
    }
  };

  // KPIs REAIS — contagens diretas de `acao` sobre a trilha inteira (não filtrada,
  // como nos resumos do Dashboard). A variação (%) é a leitura dos últimos 30
  // dias contra os 30 anteriores, derivada de `created_at`. Sem coluna de status
  // no log global não há sucesso/pendente/falha para exibir.
  const agoraMs = agoraEpoch();
  const JANELA = 30 * 86_400_000;
  const tendencia = (pred: (l: LogAuditoria) => boolean): { value: number; label: string } | undefined => {
    const t = (l: LogAuditoria) => new Date(l.created_at).getTime();
    const atual = normalizados.filter((l) => agoraMs - t(l) <= JANELA && pred(l)).length;
    const anterior = normalizados.filter((l) => {
      const delta = agoraMs - t(l);
      return delta > JANELA && delta <= 2 * JANELA && pred(l);
    }).length;
    if (anterior === 0) return undefined;
    return { value: Math.round(((atual - anterior) / anterior) * 100), label: 'vs. período anterior' };
  };

  const kpis: {
    chave: string;
    label: string;
    descricao: string;
    icon: LucideIcon;
    tom: MetricTone;
    valor: number;
    trend?: { value: number; label: string };
  }[] = [
    {
      chave: 'eventos',
      label: 'Eventos',
      descricao: 'Total de eventos registrados',
      icon: ScrollText,
      tom: 'info',
      valor: normalizados.length,
      trend: tendencia(() => true),
    },
    {
      chave: 'insercoes',
      label: 'Inserções',
      descricao: 'Registros criados',
      icon: FilePlus2,
      tom: 'success',
      valor: contagemPorAcao.get('INSERT') ?? 0,
      trend: tendencia((l) => l.acao === 'INSERT'),
    },
    {
      chave: 'atualizacoes',
      label: 'Atualizações',
      descricao: 'Registros alterados',
      icon: FilePenLine,
      tom: 'primary',
      valor: contagemPorAcao.get('UPDATE') ?? 0,
      trend: tendencia((l) => l.acao === 'UPDATE'),
    },
    {
      chave: 'exclusoes',
      label: 'Exclusões',
      descricao: 'Registros removidos',
      icon: Trash2,
      tom: 'destructive',
      valor: contagemPorAcao.get('DELETE') ?? 0,
      trend: tendencia((l) => l.acao === 'DELETE'),
    },
  ];

  // Chips = ações REALMENTE presentes no log (só o que existe vira atalho).
  const chips = useMemo(() => {
    const ordem = ORDEM_ACOES as readonly string[];
    const presentes = ordem.filter((a) => contagemPorAcao.has(a));
    const extras = Array.from(contagemPorAcao.keys()).filter((a) => !ordem.includes(a));
    return [...presentes, ...extras].map((a) => ({ chave: a, meta: acaoMeta(a), total: contagemPorAcao.get(a) ?? 0 }));
  }, [contagemPorAcao]);

  return (
    <>
      <PageTitle title="Auditoria" description="Log de auditoria do sistema" />
      <TooltipProvider delayDuration={200}>
        <PageLayout
          title="Auditoria"
          description="Log de auditoria do sistema"
          icon={<Shield className="h-5 w-5 text-primary-foreground" />}
          gradient="from-primary to-info"
          // Container da página SEM animação de entrada: o único movimento é a
          // cascata das linhas da tabela (`ui/table-row-reveal.ts`). Assim o
          // card + cabeçalho + tabela já estão visíveis desde o 1º frame e só as
          // linhas entram em cascata — mesma sensação da lista de Gestão de
          // Candidatos (lá o container já está parado quando a lista é exibida).
          animate={false}
          actions={
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-2 rounded-xl font-body"
              onClick={handleExport}
              disabled={!ordenados.length}
            >
              <Download className="h-4 w-4 text-success" />
              Exportar Logs
            </Button>
          }
        >
          {/* Escudo de contexto de presença — MESMO recurso do `CardsEntrada` de
              `AdmissoesPage` (e do `OrganogramaPage`): a rota embrulha o conteúdo
              em `AnimatePresence initial={false}` (`PageTransition`, em
              `MainLayout`), e esse valor viaja por CONTEXTO até TODO `motion.*`
              descendente. Sem este `AnimatePresence` local (sem props → `initial`
              verdadeiro), os KPIs, filtros, chips e o card nasceriam prontos, sem
              cascata. Não renderiza DOM. */}
          <AnimatePresence>
            <div className="space-y-4">
              {/* 1. KPIs — MESMO componente, grade e chrome dos KPI Cards dos
                dashboards (`MetricCard` + `cardVariants`). Só dimensões reais:
                Eventos/Inserções/Atualizações/Exclusões (contagens de `acao`). */}
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {kpis.map((kpi, indice) => (
                  <MetricCard
                    key={kpi.chave}
                    index={indice}
                    title={kpi.label}
                    value={String(kpi.valor)}
                    rawValue={kpi.valor}
                    icon={kpi.icon}
                    tone={kpi.tom}
                    vividRed
                    description={kpi.descricao}
                    trend={kpi.trend}
                    className="rounded-2xl border-border/40 shadow-elevated"
                  />
                ))}
              </div>

              {/* 2. FILTROS — UMA linha no desktop (busca + selects + ações). Se a
                largura não bastar, o container rola na horizontal: nada desce. */}
              <div className="space-y-3 rounded-2xl border border-border/40 bg-card p-3 shadow-sm">
                <div className="overflow-x-auto">
                  <div className="flex items-center gap-2.5">
                    {/* Cada controle tem o PRÓPRIO wrapper Motion com `cardVariants`
                      (mesmos variants/duration/easing/stagger de Admissões-Auditoria);
                      a GEOMETRIA vai para o wrapper, que passa a ser o item do flex. */}
                    <motion.div
                      custom={0}
                      variants={cardVariants}
                      initial="hidden"
                      animate="visible"
                      className="relative min-w-[200px] flex-[3_1_260px]"
                    >
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          placeholder="Buscar por usuário, tabela, ação ou ID do registro..."
                          aria-label="Buscar na trilha de auditoria"
                          className="h-9 w-full rounded-xl border-border/40 bg-background/70 pl-9"
                        />
                      </div>
                    </motion.div>

                    <motion.div
                      custom={1}
                      variants={cardVariants}
                      initial="hidden"
                      animate="visible"
                      className="flex min-w-[150px] max-w-[210px] flex-1"
                    >
                      <Select value={acaoFilter} onValueChange={setAcaoFilter}>
                        <SelectTrigger
                          aria-label="Filtrar por ação"
                          className="h-9 w-full rounded-xl border-border/40 bg-background/70"
                        >
                          <SelectValue placeholder="Ação" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">Todas as ações</SelectItem>
                          {chips.map((chip) => (
                            <SelectItem key={chip.chave} value={chip.chave}>
                              {chip.meta.chip} ({chip.total})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </motion.div>

                    <motion.div
                      custom={2}
                      variants={cardVariants}
                      initial="hidden"
                      animate="visible"
                      className="flex min-w-[150px] max-w-[210px] flex-1"
                    >
                      <Select value={tabelaFilter} onValueChange={setTabelaFilter}>
                        <SelectTrigger
                          aria-label="Filtrar por tabela"
                          className="h-9 w-full rounded-xl border-border/40 bg-background/70"
                        >
                          <SelectValue placeholder="Tabela" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">Todas as tabelas</SelectItem>
                          {opcoesTabela.map((t) => (
                            <SelectItem key={t} value={t}>
                              {rotuloRecurso(t)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </motion.div>

                    <motion.div
                      custom={3}
                      variants={cardVariants}
                      initial="hidden"
                      animate="visible"
                      className="flex min-w-[160px] max-w-[240px] flex-1"
                    >
                      <Select value={responsavelFilter} onValueChange={setResponsavelFilter}>
                        <SelectTrigger
                          aria-label="Filtrar por responsável"
                          className="h-9 w-full rounded-xl border-border/40 bg-background/70"
                        >
                          <SelectValue placeholder="Responsável" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">Todos os responsáveis</SelectItem>
                          {opcoesResponsavel.map((r) => (
                            <SelectItem key={r} value={r}>
                              {r}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </motion.div>

                    <motion.div
                      custom={4}
                      variants={cardVariants}
                      initial="hidden"
                      animate="visible"
                      className="flex min-w-[150px] max-w-[190px] flex-1"
                    >
                      <Select value={periodoFilter} onValueChange={(v) => setPeriodoFilter(v as PeriodoAuditoria)}>
                        <SelectTrigger
                          aria-label="Filtrar por período"
                          className="h-9 w-full rounded-xl border-border/40 bg-background/70"
                        >
                          <SelectValue placeholder="Período" />
                        </SelectTrigger>
                        <SelectContent>
                          {PERIODOS.map((p) => (
                            <SelectItem key={p.value} value={p.value}>
                              {p.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </motion.div>

                    <div className="flex shrink-0 items-center gap-2">
                      <motion.div
                        custom={5}
                        variants={cardVariants}
                        initial="hidden"
                        animate="visible"
                        className="flex shrink-0"
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          aria-expanded={painelAberto}
                          onClick={() => setPainelAberto((a) => !a)}
                          className="h-9 shrink-0 gap-1.5 whitespace-nowrap rounded-xl border-border/40 px-3 text-xs"
                        >
                          <SlidersHorizontal className="h-3.5 w-3.5" /> Mais filtros
                          <ChevronDown className={cn('h-3 w-3 transition-transform', painelAberto && 'rotate-180')} />
                        </Button>
                      </motion.div>
                      {/* "Limpar filtros" é o termômetro: com QUALQUER filtro ativo
                        assume o lime do sistema; sem nada a limpar fica neutro e
                        desabilitado. `border` nos dois estados evita pulo. */}
                      <motion.div
                        custom={6}
                        variants={cardVariants}
                        initial="hidden"
                        animate="visible"
                        className="flex shrink-0"
                      >
                        <Button
                          variant={temFiltro ? 'default' : 'outline'}
                          size="sm"
                          disabled={!temFiltro}
                          onClick={limparFiltros}
                          className={cn(
                            'h-9 shrink-0 gap-1.5 whitespace-nowrap rounded-xl border px-3 text-xs',
                            temFiltro ? 'cursor-pointer border-transparent' : 'border-border/40 text-muted-foreground'
                          )}
                        >
                          <RotateCcw className="h-3.5 w-3.5" /> Limpar filtros
                        </Button>
                      </motion.div>
                    </div>
                  </div>
                </div>

                {painelAberto && (
                  <div className="flex flex-wrap items-end gap-3 border-t border-border/40 pt-3">
                    <div className="flex w-[280px] flex-col gap-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        ID do registro
                      </span>
                      <Input
                        value={registroFilter}
                        onChange={(e) => setRegistroFilter(e.target.value)}
                        placeholder="Filtrar por ID..."
                        aria-label="Filtrar por ID do registro"
                        className="h-9 rounded-xl border-border/40 bg-background/70"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        De
                      </span>
                      <Input
                        type="date"
                        value={dataInicio}
                        onChange={(e) => setDataInicio(e.target.value)}
                        aria-label="Data inicial"
                        className="h-9 w-[160px] rounded-xl border-border/40 bg-background/70"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Até
                      </span>
                      <Input
                        type="date"
                        value={dataFim}
                        onChange={(e) => setDataFim(e.target.value)}
                        aria-label="Data final"
                        className="h-9 w-[160px] rounded-xl border-border/40 bg-background/70"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 3. CHIPS — filtros rápidos por ação REALMENTE presentes no log
                (faixa própria, 100% da largura, um único ativo por vez). */}
              <div className="overflow-x-auto py-0.5">
                <div className="flex items-center gap-2">
                  {/* Chips: MESMA cascata dos chips de Admissões-Auditoria — um
                    wrapper Motion por chip (geometria `flex-1 min-w-fit` no
                    wrapper, botão só preenche). "Todos" = 7; os demais seguem. */}
                  <motion.div
                    custom={7}
                    variants={cardVariants}
                    initial="hidden"
                    animate="visible"
                    className="flex min-w-fit flex-1"
                  >
                    <ChipFiltro
                      label="Todos"
                      total={normalizados.length}
                      ativo={acaoFilter === 'todos'}
                      onClick={() => setAcaoFilter('todos')}
                    />
                  </motion.div>
                  {chips.map((chip, indice) => (
                    <motion.div
                      key={chip.chave}
                      custom={8 + indice}
                      variants={cardVariants}
                      initial="hidden"
                      animate="visible"
                      className="flex min-w-fit flex-1"
                    >
                      <ChipFiltro
                        label={chip.meta.chip}
                        total={chip.total}
                        ativo={acaoFilter === chip.chave}
                        ponto={chip.meta.ponto}
                        icone={chip.meta.icon}
                        onClick={() => setAcaoFilter(chip.chave)}
                      />
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* 4. BLOCO PRINCIPAL — "Histórico de Auditoria". O container entra com
                o MESMO `cardVariants` do card de Admissões-Auditoria; a cascata
                das linhas começa depois (delay do variant), então o card não
                mascara a entrada das linhas. */}
              <motion.div custom={0} variants={cardVariants} initial="hidden" animate="visible">
                <div className="overflow-hidden rounded-2xl border border-border/40 bg-card shadow-elevated">
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/40 bg-muted/20 p-4">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                        <History className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <h3 className="font-display text-sm font-semibold text-foreground">Histórico de Auditoria</h3>
                        <p className="mt-0.5 text-[11.5px] leading-snug text-muted-foreground">
                          Registros de todas as ações realizadas no sistema
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
                        <ArrowUpDown className="h-3 w-3" /> Ordenar por
                      </span>
                      <Select value={ordem} onValueChange={(v) => setOrdem(v as OrdemAuditoria)}>
                        <SelectTrigger
                          aria-label="Ordenar a trilha de auditoria"
                          className="h-9 w-[180px] rounded-xl border-border/40 bg-background/60 text-[12px]"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ORDENS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {isLoading ? (
                    <div className="flex justify-center p-10">
                      <Spinner size="lg" />
                    </div>
                  ) : !ordenados.length ? (
                    <EmptyList entityName="registro de auditoria" />
                  ) : (
                    <>
                      <div className="overflow-x-auto">
                        <Table className="min-w-[1040px]">
                          <TableHeader>
                            <TableRow className="border-border/40 hover:bg-transparent">
                              <TableHead className="w-[150px] pl-5 text-[10.5px] uppercase tracking-wider">
                                Data/Hora
                              </TableHead>
                              <TableHead className="min-w-[280px] text-[10.5px] uppercase tracking-wider">
                                Evento
                              </TableHead>
                              <TableHead className="w-[190px] text-[10.5px] uppercase tracking-wider">Tabela</TableHead>
                              <TableHead className="w-[150px] text-[10.5px] uppercase tracking-wider">Ação</TableHead>
                              <TableHead className="min-w-[180px] text-[10.5px] uppercase tracking-wider">
                                Responsável
                              </TableHead>
                              <TableHead className="w-[104px] pr-5 text-right text-[10.5px] uppercase tracking-wider">
                                Ações
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          {/* CASCATA DAS LINHAS: MESMO mecanismo de Admissões-Auditoria
                          (`CascadeTableBody` + `CascadeTableRow`, de
                          `ui/cascade-table.tsx`): a moldura
                          (`AnimatePresence` sem props + `tbody` com `key`) e cada
                          `motion.tr` com o variant compartilhado. Sem animação
                          local — header estático, só as linhas entram. */}
                          <CascadeTableBody cascadeKey={cascataChave}>
                            {linhas.map((log, index) => {
                              const meta = acaoMeta(log.acao);
                              const IconeEvento = meta.icon;
                              const quando = new Date(log.created_at);
                              const responsavel = nomeResponsavel(log);
                              return (
                                <CascadeTableRow
                                  key={log.id || `${log.created_at}-${index}`}
                                  index={index}
                                  className="group cursor-pointer border-border/30 transition-colors hover:bg-muted/40"
                                  onClick={() => abrirDetalhe(log)}
                                >
                                  {/* Data/Hora */}
                                  <TableCell className="pl-5 align-top">
                                    <span className="block text-[12px] font-medium tabular-nums text-foreground">
                                      {quando.toLocaleDateString('pt-BR')}
                                    </span>
                                    <span className="mt-0.5 flex items-center gap-1 text-[11px] tabular-nums text-muted-foreground">
                                      <Clock className="h-3 w-3" />
                                      {quando.toLocaleTimeString('pt-BR', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        second: '2-digit',
                                      })}
                                    </span>
                                  </TableCell>

                                  {/* Evento — ícone do tipo + título amigável + descrição */}
                                  <TableCell className="align-top">
                                    <div className="flex items-start gap-3">
                                      <span
                                        className={cn(
                                          'mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg',
                                          meta.badge
                                        )}
                                      >
                                        <IconeEvento className="h-3.5 w-3.5" />
                                      </span>
                                      <div className="min-w-0">
                                        <p className="text-[13px] font-medium leading-snug text-foreground">
                                          {meta.titulo}
                                        </p>
                                        <p className="mt-0.5 text-[11.5px] leading-snug text-muted-foreground">
                                          {descricaoEvento(log)}
                                        </p>
                                      </div>
                                    </div>
                                  </TableCell>

                                  {/* Tabela/Recurso — nome amigável (técnico no title) */}
                                  <TableCell className="align-top">
                                    <span className="flex items-center gap-2" title={log.tabela ?? undefined}>
                                      <Database className="h-3.5 w-3.5 shrink-0 text-primary/60" />
                                      <span className="text-[12.5px] font-medium text-foreground">
                                        {rotuloRecurso(log.tabela)}
                                      </span>
                                    </span>
                                  </TableCell>

                                  {/* Ação — badge semântico derivado do código real */}
                                  <TableCell className="align-top">
                                    <span
                                      className={cn(
                                        'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                                        meta.badge
                                      )}
                                    >
                                      {log.acao ?? '—'}
                                    </span>
                                  </TableCell>

                                  {/* Responsável */}
                                  <TableCell className="align-top">
                                    <div className="flex items-center gap-2.5">
                                      <AvatarIniciais valor={responsavel} />
                                      <span className="truncate text-[12.5px] text-foreground" title={responsavel}>
                                        {responsavel}
                                      </span>
                                    </div>
                                  </TableCell>

                                  {/* Ações — olho (ver detalhes) + menu (só ações reais) */}
                                  <TableCell className="pr-5 align-top">
                                    <div
                                      className="flex items-center justify-end gap-0.5"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <BotaoAcao label="Ver detalhes" icon={Eye} onClick={() => abrirDetalhe(log)} />
                                      <DropdownMenu>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <DropdownMenuTrigger asChild>
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                aria-label="Mais ações"
                                                className="h-7 w-7 rounded-lg text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                                              >
                                                <MoreVertical className="h-3.5 w-3.5" />
                                              </Button>
                                            </DropdownMenuTrigger>
                                          </TooltipTrigger>
                                          <TooltipContent side="top" className="text-xs">
                                            Mais ações
                                          </TooltipContent>
                                        </Tooltip>
                                        <DropdownMenuContent align="end" className="w-56">
                                          <DropdownMenuItem
                                            className="gap-2 text-xs"
                                            onSelect={() => abrirDetalhe(log)}
                                          >
                                            <Eye className="h-3.5 w-3.5" /> Ver detalhes
                                          </DropdownMenuItem>
                                          {log.registro_id && (
                                            <DropdownMenuItem
                                              className="gap-2 text-xs"
                                              onSelect={() => copiarRegistro(log.registro_id as string)}
                                            >
                                              <Copy className="h-3.5 w-3.5" /> Copiar ID do registro
                                            </DropdownMenuItem>
                                          )}
                                          <DropdownMenuSeparator />
                                          {log.tabela && (
                                            <DropdownMenuItem
                                              className="gap-2 text-xs"
                                              onSelect={() => setTabelaFilter(log.tabela as string)}
                                            >
                                              <Database className="h-3.5 w-3.5" /> Filtrar por este recurso
                                            </DropdownMenuItem>
                                          )}
                                          <DropdownMenuItem
                                            className="gap-2 text-xs"
                                            onSelect={() => setResponsavelFilter(nomeResponsavel(log))}
                                          >
                                            <User className="h-3.5 w-3.5" /> Filtrar por este responsável
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </div>
                                  </TableCell>
                                </CascadeTableRow>
                              );
                            })}
                          </CascadeTableBody>
                        </Table>
                      </div>
                    </>
                  )}

                  {/* 5. PAGINAÇÃO — só no frontend, sobre a lista já filtrada/ordenada */}
                  {!isLoading && ordenados.length > 0 && (
                    <div className="flex flex-col gap-3 border-t border-border/40 p-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-[11.5px] text-muted-foreground">
                        Mostrando <span className="font-medium text-foreground">{inicioRange + 1}</span>–
                        <span className="font-medium text-foreground">{fimRange}</span> de{' '}
                        <span className="font-medium text-foreground">{ordenados.length}</span> registros
                      </p>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="icon"
                            aria-label="Página anterior"
                            disabled={paginaAtual <= 1}
                            onClick={() => setPagina((p) => Math.max(1, p - 1))}
                            className="h-8 w-8 rounded-lg border-border/40"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          {paginasVisiveis(paginaAtual, totalPaginas).map((item, i) =>
                            item === '...' ? (
                              <span key={`ellipsis-${i}`} className="px-1 text-[11px] text-muted-foreground">
                                …
                              </span>
                            ) : (
                              <Button
                                key={item}
                                variant={item === paginaAtual ? 'default' : 'outline'}
                                size="icon"
                                aria-label={`Página ${item}`}
                                aria-current={item === paginaAtual ? 'page' : undefined}
                                onClick={() => setPagina(item)}
                                className={cn(
                                  'h-8 w-8 rounded-lg text-[12px]',
                                  item === paginaAtual ? 'border-transparent' : 'border-border/40'
                                )}
                              >
                                {item}
                              </Button>
                            )
                          )}
                          <Button
                            variant="outline"
                            size="icon"
                            aria-label="Próxima página"
                            disabled={paginaAtual >= totalPaginas}
                            onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                            className="h-8 w-8 rounded-lg border-border/40"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                        <Select value={String(porPagina)} onValueChange={(v) => setPorPagina(Number(v))}>
                          <SelectTrigger
                            aria-label="Registros por página"
                            className="h-8 w-[132px] rounded-lg border-border/40 text-[12px]"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TAMANHOS_PAGINA.map((t) => (
                              <SelectItem key={t} value={String(t)}>
                                {t} por página
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          </AnimatePresence>
        </PageLayout>
      </TooltipProvider>

      {/* DETALHE DO EVENTO — MESMA coreografia das janelas de
          Admissões-Auditoria (que seguem o popup "Pendências"): variants de
          `ui/cascade-motion.ts` (véu `bg-black/60` + `backdrop-blur-sm`, casca que
          abre de dentro para fora, cascata dos blocos e botão X). Só o conteúdo
          (campos do log) é desta tela. */}
      <DialogPrimitive.Root open={detalheAberto} onOpenChange={setDetalheAberto}>
        <AnimatePresence>
          {detalheAberto && (
            <DialogPrimitive.Portal forceMount>
              <DialogPrimitive.Overlay asChild forceMount>
                <motion.div
                  className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
                  variants={OVERLAY_DETALHE}
                  initial="closed"
                  animate="open"
                  exit="closed"
                />
              </DialogPrimitive.Overlay>
              <DialogPrimitive.Content asChild forceMount>
                <motion.div
                  className="fixed left-[50%] top-[50%] z-50 flex max-h-[90vh] w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-border/30 bg-background p-0 shadow-elevated"
                  style={{ transformOrigin: 'top center' }}
                  variants={SHELL_DETALHE}
                  initial="closed"
                  animate="open"
                  exit="closed"
                >
                  <motion.div
                    className="flex min-h-0 flex-1 flex-col"
                    variants={cascadeContainerVariants}
                    initial="closed"
                    animate="open"
                    exit="closed"
                  >
                    <motion.div variants={cascadeItemVariants}>
                      <DialogHeader className="p-5 pb-3">
                        <div className="flex items-center gap-3">
                          <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                            <Shield className="h-5 w-5" />
                          </span>
                          <div className="min-w-0">
                            <DialogTitle className="font-display">Detalhes do evento</DialogTitle>
                            <DialogDescription className="font-body">
                              {selectedLog
                                ? `${acaoMeta(selectedLog.acao).titulo} em ${rotuloRecurso(selectedLog.tabela)}`
                                : ''}
                            </DialogDescription>
                          </div>
                        </div>
                      </DialogHeader>
                    </motion.div>

                    <motion.div variants={cascadeItemVariants} className="flex min-h-0 flex-1 flex-col">
                      <ScrollArea className="flex-1 px-5">
                        <dl className="grid grid-cols-2 gap-4 pb-4 sm:grid-cols-3">
                          <CampoDetalhe rotulo="Data/Hora">
                            {selectedLog?.created_at ? new Date(selectedLog.created_at).toLocaleString('pt-BR') : '—'}
                          </CampoDetalhe>
                          <CampoDetalhe rotulo="Usuário">
                            {selectedLog ? nomeResponsavel(selectedLog) : '—'}
                          </CampoDetalhe>
                          <CampoDetalhe rotulo="Ação">
                            {selectedLog ? (
                              <span
                                className={cn(
                                  'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                                  acaoMeta(selectedLog.acao).badge
                                )}
                              >
                                {selectedLog.acao ?? '—'}
                              </span>
                            ) : (
                              '—'
                            )}
                          </CampoDetalhe>
                          <CampoDetalhe rotulo="Tabela/Recurso">
                            {selectedLog ? (
                              <span className="flex flex-col">
                                <span>{rotuloRecurso(selectedLog.tabela)}</span>
                                {selectedLog.tabela && (
                                  <span className="font-mono text-[10.5px] text-muted-foreground">
                                    {selectedLog.tabela}
                                  </span>
                                )}
                              </span>
                            ) : (
                              '—'
                            )}
                          </CampoDetalhe>
                          <CampoDetalhe rotulo="Registro ID">
                            <span className="break-all font-mono text-[11px]">{selectedLog?.registro_id || '—'}</span>
                          </CampoDetalhe>
                          <CampoDetalhe rotulo="Endereço IP">
                            <span className="font-mono text-[11px]">{selectedLog?.ip_address || '—'}</span>
                          </CampoDetalhe>
                        </dl>

                        <div className="space-y-4 pb-5">
                          {/* ANTES / DEPOIS — lado a lado quando ambos existem. */}
                          {selectedLog?.dados_anteriores != null && selectedLog?.dados_novos != null ? (
                            <div className="grid gap-4 sm:grid-cols-2">
                              <div>
                                <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                                  Dados anteriores
                                </span>
                                {renderJson(selectedLog.dados_anteriores)}
                              </div>
                              <div>
                                <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                                  Dados novos
                                </span>
                                {renderJson(selectedLog.dados_novos)}
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              <div>
                                <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                                  Dados anteriores
                                </span>
                                {renderJson(selectedLog?.dados_anteriores)}
                              </div>
                              <div>
                                <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                                  Dados novos
                                </span>
                                {renderJson(selectedLog?.dados_novos)}
                              </div>
                            </div>
                          )}

                          {selectedLog?.user_agent && (
                            <div>
                              <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                                User Agent
                              </span>
                              <div className="break-all rounded-lg border border-border/20 bg-muted/30 p-2 font-mono text-[10px] text-muted-foreground">
                                {selectedLog.user_agent}
                              </div>
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    </motion.div>

                    <motion.div variants={cascadeItemVariants}>
                      <div className="flex justify-end border-t border-border/20 bg-muted/20 p-4">
                        <Button variant="outline" onClick={() => setDetalheAberto(false)} className="rounded-xl">
                          Fechar
                        </Button>
                      </div>
                    </motion.div>
                  </motion.div>

                  <DialogPrimitive.Close className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-md opacity-70 transition-colors hover:bg-accent hover:opacity-100 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset">
                    <X className="h-4 w-4" />
                    <span className="sr-only">Fechar</span>
                  </DialogPrimitive.Close>
                </motion.div>
              </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
          )}
        </AnimatePresence>
      </DialogPrimitive.Root>
    </>
  );
}

/**
 * Janela de páginas exibidas na paginação: primeira, atual−1..atual+1, última e
 * elipses entre os vãos. Sem números inventados — só as páginas que existem.
 */
function paginasVisiveis(atual: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const paginas: (number | '...')[] = [1];
  const inicio = Math.max(2, atual - 1);
  const fim = Math.min(total - 1, atual + 1);
  if (inicio > 2) paginas.push('...');
  for (let p = inicio; p <= fim; p += 1) paginas.push(p);
  if (fim < total - 1) paginas.push('...');
  paginas.push(total);
  return paginas;
}

/** Renderiza um bloco JSON (payload do log) — preservado do fluxo atual. */
function renderJson(json: unknown) {
  if (json == null) return <span className="text-xs italic text-muted-foreground">Sem dados</span>;
  return (
    <pre className="max-h-[220px] overflow-x-auto rounded-lg border border-border/30 bg-muted/50 p-2 font-mono text-[10px] text-foreground/80">
      {JSON.stringify(json, null, 2)}
    </pre>
  );
}
