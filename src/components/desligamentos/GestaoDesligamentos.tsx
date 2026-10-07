/**
 * ============================================================================
 * "Gestão de Desligamentos" — workspace operacional do módulo.
 *
 * Reconstrução visual completa seguindo o mesmo padrão já aprovado em
 * "Gestão de Candidatos" (Admissões): cabeçalho com alternância Tabela/Cards,
 * barra de filtros compacta, pills de etapa (filtro rápido) e uma tabela densa
 * com cascata de entrada (`ui/cascade-table`) e rodapé de paginação.
 *
 * NENHUM dado é inventado: filtros, pills, colunas e a "próxima ação" saem de
 * campos que já existem (`status`, `tipo`, `etapa`, `data_desligamento`,
 * `colaborador.cargo/departamento`). A coluna "Próxima ação" é derivada da etapa
 * + do prazo legal (ver `desligamentosDerivacoes`).
 * ============================================================================
 */
import { useMemo, useState, useTransition } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Spinner } from '@/components/ui/spinner';
import { EmptyList, EmptySearch } from '@/components/ui/empty-state';
import { Table, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CascadeTableBody, CascadeTableRow } from '@/components/ui/cascade-table';
import { SlidingIndicator } from '@/components/ui/sliding-indicator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ArrowUpDown,
  Calculator,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  LayoutGrid,
  List,
  MoreHorizontal,
  Table2,
  Trash2,
  UserMinus,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { StatusBadge, TipoBadge } from './DesligamentoStatusBadge';
import { DesligamentoFilters } from './DesligamentoFilters';
import { ETAPA_BADGE, ETAPA_LABELS, STATUS_LABELS } from './desligamentosComum';
import {
  DIA_MS,
  concluido,
  dataValida,
  formatCurrencyBRL,
  iniciais,
  pendente,
  prazoRescisao,
  proximaAcaoDesligamento,
  recortarPorPeriodo,
  type DesligamentoLike,
} from './desligamentosDerivacoes';

export type GestaoVisualizacao = 'tabela' | 'cards';

const HEAD_CLASS = 'text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground';

/** Pills de etapa (filtro rápido) — ordem real do fluxo. */
const ETAPA_PILULAS: readonly { value: string; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'comunicacao', label: 'Solicitação' },
  { value: 'documentacao', label: 'Documentos' },
  { value: 'calculo', label: 'Cálculo' },
  { value: 'homologacao', label: 'Aprovação' },
  { value: 'finalizacao', label: 'Finalização' },
];

const ORDENACOES: readonly { value: string; label: string }[] = [
  { value: 'recentes', label: 'Mais recentes' },
  { value: 'antigos', label: 'Mais antigos' },
  { value: 'nome', label: 'Nome (A–Z)' },
  { value: 'valor', label: 'Maior valor' },
];

const POR_PAGINA: readonly number[] = [5, 10, 20, 50];
const POR_PAGINA_CARDS: readonly number[] = [6, 12, 24];

/** Uma etapa "casa" com a pill? `finalizacao` agrupa pagamento + finalizado. */
function etapaCasa(etapa: string | null | undefined, alvo: string): boolean {
  if (alvo === 'todos') return true;
  if (alvo === 'finalizacao') return etapa === 'pagamento' || etapa === 'finalizado';
  return etapa === alvo;
}

/** Precisa de atenção? (mesma régua da faixa: em aberto, atrasado ou pendente). */
function precisaAtencao(d: DesligamentoLike, hojeMs: number): boolean {
  if (concluido(d) || d.status === 'cancelado') return false;
  if (pendente(d)) return true;
  const limite = prazoRescisao(d);
  if (!limite) return false;
  return Math.round((limite.getTime() - hojeMs) / DIA_MS) <= 0;
}

function valoresUnicos(valores: (string | null | undefined)[]): string[] {
  return Array.from(new Set(valores.map((v) => (v ?? '').trim()).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, 'pt-BR')
  );
}

/* ─── Células reutilizadas pela tabela e pelos cards ──────────────────────── */

function ColaboradorAvatar({ nome, className }: { nome?: string | null; className?: string }) {
  return (
    <div
      className={cn(
        'grid h-8 w-8 shrink-0 place-items-center rounded-full bg-destructive-vivid/10 text-[11px] font-medium text-destructive-vivid',
        className
      )}
    >
      {iniciais(nome)}
    </div>
  );
}

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

/** Coluna "Próxima ação": ação da etapa + cue de prazo (colorido por urgência). */
function ProximaAcaoCell({ d, hojeMs }: { d: DesligamentoLike; hojeMs: number }) {
  const { label, prazo, tom } = proximaAcaoDesligamento(d, hojeMs);
  const cor =
    tom === 'destructive' ? 'text-destructive-vivid' : tom === 'warning' ? 'text-warning' : 'text-muted-foreground';
  return (
    <div className="min-w-0">
      <p className="truncate text-xs font-body font-medium text-foreground">{label}</p>
      {prazo && (
        <p className={cn('mt-0.5 flex items-center gap-1 text-[11px]', cor)}>
          {tom !== 'muted' && <Clock className="h-3 w-3" />}
          {prazo}
        </p>
      )}
    </div>
  );
}

/* ─── Paginação ───────────────────────────────────────────────────────────── */

function janelaPaginas(atual: number, total: number): (number | 'gap')[] {
  const saida: (number | 'gap')[] = [];
  const adicionar = new Set<number>();
  for (let p = 1; p <= total; p++) {
    if (p === 1 || p === total || Math.abs(p - atual) <= 1) adicionar.add(p);
  }
  const ordenado = [...adicionar].sort((a, b) => a - b);
  let anterior = 0;
  ordenado.forEach((p) => {
    if (p - anterior > 1) saida.push('gap');
    saida.push(p);
    anterior = p;
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
  opcoesPorPagina: readonly number[];
  onPagina: (p: number) => void;
  onPorPagina: (p: number) => void;
}) {
  return (
    <div className="flex flex-col gap-3 border-t border-border/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-muted-foreground">
        Mostrando <span className="font-semibold text-foreground">{inicio}</span>–
        <span className="font-semibold text-foreground">{fim}</span> de{' '}
        <span className="font-semibold text-foreground">{total}</span> registros
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

        <div className="flex items-center gap-2">
          <span className="hidden text-xs text-muted-foreground sm:inline">Itens por página</span>
          <div className="flex items-center gap-1">
            {opcoesPorPagina.map((n) => (
              <Button
                key={n}
                variant={n === porPagina ? 'default' : 'ghost'}
                size="sm"
                className="h-8 w-9 rounded-lg text-xs"
                onClick={() => onPorPagina(n)}
                aria-label={`${n} por página`}
              >
                {n}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Pills de etapa + alternância de visualização ────────────────────────── */

function EtapaPills({
  ativo,
  contagens,
  onSelecionar,
}: {
  ativo: string;
  contagens: Record<string, number>;
  onSelecionar: (v: string) => void;
}) {
  return (
    // Ocupa 100% da largura do card "Processos" logo abaixo (mesmo pai). Em telas
    // estreitas o `overflow-x-auto` rola DENTRO da TabList (com `min-w` nas colunas)
    // sem quebrar o texto nem estourar a página.
    <div className="w-full overflow-x-auto">
      <div className="grid w-full min-w-[640px] grid-cols-6 gap-2">
        {ETAPA_PILULAS.map((p) => {
          const selecionada = ativo === p.value;
          return (
            <button
              key={p.value}
              type="button"
              onClick={() => onSelecionar(p.value)}
              className={cn(
                'inline-flex w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-body transition-colors',
                selecionada
                  ? 'border-primary/40 bg-primary/15 text-primary'
                  : 'border-border/40 bg-card text-muted-foreground hover:bg-muted/40 hover:text-foreground'
              )}
              aria-pressed={selecionada}
            >
              {p.label}
              <span
                className={cn(
                  'rounded-full px-1.5 text-[10px] tabular-nums',
                  selecionada ? 'bg-primary/20' : 'bg-muted/60'
                )}
              >
                {contagens[p.value] ?? 0}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Alternância Tabela/Cards (Tabela é o padrão).
 *
 * MESMA peça de "Gestão de Candidatos" (fonte de verdade): container
 * `grid-cols-2` com o `SlidingIndicator` COMPARTILHADO — o contorno lime
 * permanente, `absolute`, do tamanho de UMA coluna, que desliza por
 * `translate3d` (CSS puro/GPU, `420ms cubic-bezier(0.22, 1, 0.36, 1)`) — e
 * botões `Button`/`ghost` de largura IGUAL. Aqui só muda o estado de visão que
 * ela dirige (`GestaoVisualizacao`); a aparência e a animação são as mesmas.
 *
 * O estado `visual` é LOCAL (só do indicador) para o contorno mover no clique,
 * IMEDIATAMENTE; a troca REAL de conteúdo (tabela ↔ grade) já é adiada pelo
 * `startTransition` do pai (`aoTrocarVisualizacao`), fora do caminho do slide.
 */
function VisualizacaoToggle({
  value,
  onChange,
}: {
  value: GestaoVisualizacao;
  onChange: (v: GestaoVisualizacao) => void;
}) {
  const opcoes: { value: GestaoVisualizacao; label: string; icon: typeof List }[] = [
    { value: 'tabela', label: 'Tabela', icon: Table2 },
    { value: 'cards', label: 'Cards', icon: LayoutGrid },
  ];
  // Estado VISUAL (só do indicador): muda na hora e dirige apenas o `transform`.
  const [visual, setVisual] = useState<GestaoVisualizacao>(value);

  const trocar = (v: GestaoVisualizacao) => {
    if (v === visual) return;
    // 1) URGENTE: aplica o `transform` novo agora → a transição de `transform`
    //    (GPU) já inicia neste quadro. 2) O pai adia a troca real de visão.
    setVisual(v);
    onChange(v);
  };

  return (
    <div className="relative grid grid-cols-2 rounded-xl border border-border/40 bg-card/50 p-1">
      {/* UM contorno único e permanente — CSS puro, só `transform` (GPU). */}
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

/* ─── Ações da linha (compartilhadas por tabela e cards) ───────────────────── */

interface AcoesLinha {
  onOpenDetalhes: (d: DesligamentoLike) => void;
  onCalcular: () => void;
  onExcluir: (id: string, e: React.MouseEvent) => void;
}

/* ─── Tabela ──────────────────────────────────────────────────────────────── */

function TabelaDesligamentos({
  itens,
  hojeMs,
  selecionados,
  onToggleTodos,
  onToggleLinha,
  chaveCascata,
  ...acoes
}: {
  itens: DesligamentoLike[];
  hojeMs: number;
  selecionados: Set<string>;
  onToggleTodos: (marcar: boolean) => void;
  onToggleLinha: (id: string) => void;
  chaveCascata: string;
} & AcoesLinha) {
  const idsPagina = itens.map((d) => String(d.id));
  const todosMarcados = idsPagina.length > 0 && idsPagina.every((id) => selecionados.has(id));

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-border/30 bg-muted/40 hover:bg-muted/40">
            <TableHead className="h-11 w-10 pr-0">
              <Checkbox
                checked={todosMarcados}
                onCheckedChange={(v) => onToggleTodos(v === true)}
                aria-label="Selecionar página"
              />
            </TableHead>
            <TableHead className={HEAD_CLASS}>Colaborador</TableHead>
            <TableHead className={HEAD_CLASS}>Cargo / Departamento</TableHead>
            <TableHead className={HEAD_CLASS}>Data</TableHead>
            <TableHead className={HEAD_CLASS}>Tipo</TableHead>
            <TableHead className={HEAD_CLASS}>Status</TableHead>
            <TableHead className={cn(HEAD_CLASS, 'min-w-[168px]')}>Próxima Ação</TableHead>
            <TableHead className={cn(HEAD_CLASS, 'text-right')}>Valor Líquido</TableHead>
            <TableHead className={cn(HEAD_CLASS, 'w-[72px] text-right')}>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <CascadeTableBody cascadeKey={chaveCascata}>
          {itens.map((d, i) => {
            const id = String(d.id);
            const data = dataValida(d.data_desligamento);
            return (
              <CascadeTableRow
                key={id}
                index={i}
                className="group cursor-pointer border-b border-border/20 transition-colors hover:bg-muted/20"
                onClick={() => acoes.onOpenDetalhes(d)}
              >
                <TableCell className="py-2.5 pr-0" onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selecionados.has(id)}
                    onCheckedChange={() => onToggleLinha(id)}
                    aria-label={`Selecionar ${d.colaborador?.nome_completo ?? ''}`}
                  />
                </TableCell>
                <TableCell className="py-2.5">
                  <div className="flex items-center gap-2.5">
                    <ColaboradorAvatar nome={d.colaborador?.nome_completo} />
                    <span className="text-sm font-body font-medium text-foreground">
                      {d.colaborador?.nome_completo || '—'}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="py-2.5">
                  <p className="text-xs text-foreground">{d.colaborador?.cargo || '—'}</p>
                  <p className="text-[11px] text-muted-foreground">{d.colaborador?.departamento || '—'}</p>
                </TableCell>
                <TableCell className="py-2.5 text-xs tabular-nums text-muted-foreground">
                  {data ? data.toLocaleDateString('pt-BR') : '—'}
                </TableCell>
                <TableCell className="py-2.5">
                  <TipoBadge tipo={d.tipo ?? ''} />
                </TableCell>
                <TableCell className="py-2.5">
                  <StatusBadge status={d.status ?? ''} />
                </TableCell>
                <TableCell className="py-2.5">
                  <ProximaAcaoCell d={d} hojeMs={hojeMs} />
                </TableCell>
                <TableCell className="py-2.5 text-right text-sm font-body font-medium tabular-nums">
                  {d.valor_liquido ? formatCurrencyBRL(d.valor_liquido) : '—'}
                </TableCell>
                <TableCell className="py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                  <AcoesDropdown d={d} {...acoes} />
                </TableCell>
              </CascadeTableRow>
            );
          })}
        </CascadeTableBody>
      </Table>
    </div>
  );
}

function AcoesDropdown({ d, onOpenDetalhes, onCalcular, onExcluir }: { d: DesligamentoLike } & AcoesLinha) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Mais opções" className="h-7 w-7 text-muted-foreground">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onOpenDetalhes(d)}>
          <Eye className="h-3.5 w-3.5 mr-2" />
          Ver Detalhes
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onCalcular}>
          <Calculator className="h-3.5 w-3.5 mr-2" />
          Calcular Rescisão
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={(e) => onExcluir(String(d.id), e)}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5 mr-2" />
          Excluir
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ─── Cards (visualização alternativa) ────────────────────────────────────── */

function CardsDesligamentos({ itens, hojeMs, ...acoes }: { itens: DesligamentoLike[]; hojeMs: number } & AcoesLinha) {
  return (
    <div className="grid gap-3 p-3 sm:grid-cols-2 xl:grid-cols-3">
      {itens.map((d) => {
        const data = dataValida(d.data_desligamento);
        return (
          <motion.div
            key={String(d.id)}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => acoes.onOpenDetalhes(d)}
            className="cursor-pointer rounded-xl border border-border/40 bg-card/60 p-3 transition-colors hover:border-primary/30 hover:bg-muted/20"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2.5">
                <ColaboradorAvatar nome={d.colaborador?.nome_completo} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-body font-medium text-foreground">
                    {d.colaborador?.nome_completo || '—'}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">{d.colaborador?.cargo || '—'}</p>
                </div>
              </div>
              <div onClick={(e) => e.stopPropagation()}>
                <AcoesDropdown d={d} {...acoes} />
              </div>
            </div>

            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              <TipoBadge tipo={d.tipo ?? ''} />
              <StatusBadge status={d.status ?? ''} />
            </div>

            <div className="mt-2.5 flex items-end justify-between gap-2">
              <ProximaAcaoCell d={d} hojeMs={hojeMs} />
              <div className="shrink-0 text-right">
                <p className="text-sm font-body font-medium tabular-nums text-foreground">
                  {d.valor_liquido ? formatCurrencyBRL(d.valor_liquido) : '—'}
                </p>
                <p className="text-[11px] tabular-nums text-muted-foreground">
                  {data ? data.toLocaleDateString('pt-BR') : '—'}
                </p>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

/* ─── Tela ─────────────────────────────────────────────────────────────────── */

interface GestaoDesligamentosProps {
  desligamentos: DesligamentoLike[];
  isLoading?: boolean;
  onOpenDetalhes: (d: DesligamentoLike) => void;
  onNovo: () => void;
  onExcluir: (id: string, e: React.MouseEvent) => void;
  onCalcular: () => void;
  /** Vem da faixa de atenção: filtra só os processos que precisam de att. */
  atencaoAtiva?: boolean;
  onLimparAtencao?: () => void;
}

export function GestaoDesligamentos({
  desligamentos,
  isLoading,
  onOpenDetalhes,
  onNovo,
  onExcluir,
  onCalcular,
  atencaoAtiva,
  onLimparAtencao,
}: GestaoDesligamentosProps) {
  const agora = useMemo(() => new Date(), []);
  const hojeMs = useMemo(() => new Date(agora.getFullYear(), agora.getMonth(), agora.getDate()).getTime(), [agora]);

  const [busca, setBusca] = useState('');
  const [etapa, setEtapa] = useState('todos');
  const [status, setStatus] = useState('todos');
  const [tipo, setTipo] = useState('todos');
  const [departamento, setDepartamento] = useState('todos');
  const [periodo, setPeriodo] = useState('todos');

  const [visualizacao, setVisualizacao] = useState<GestaoVisualizacao>('tabela');
  const [ordenacao, setOrdenacao] = useState('recentes');
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(5);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [, startTransition] = useTransition();

  const opcoesDepartamento = useMemo(
    () => valoresUnicos(desligamentos.map((d) => d.colaborador?.departamento)),
    [desligamentos]
  );

  const comReset =
    <T,>(setter: (v: T) => void) =>
    (valor: T) => {
      setter(valor);
      setPagina(1);
    };

  /** Base já filtrada por TUDO, menos a etapa (que vira pills + contagem). */
  const baseSemEtapa = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    let lista = desligamentos.filter((d) => {
      const casaBusca =
        !termo ||
        (d.colaborador?.nome_completo || '').toLowerCase().includes(termo) ||
        (d.colaborador?.cargo || '').toLowerCase().includes(termo) ||
        (d.colaborador?.departamento || '').toLowerCase().includes(termo) ||
        (d.motivo || '').toLowerCase().includes(termo);
      const casaStatus = status === 'todos' || d.status === status;
      const casaTipo = tipo === 'todos' || d.tipo === tipo;
      const casaDep = departamento === 'todos' || (d.colaborador?.departamento || '') === departamento;
      const casaAtencao = !atencaoAtiva || precisaAtencao(d, hojeMs);
      return casaBusca && casaStatus && casaTipo && casaDep && casaAtencao;
    });
    if (periodo !== 'todos') lista = recortarPorPeriodo(lista, Number(periodo), agora);
    return lista;
  }, [desligamentos, busca, status, tipo, departamento, atencaoAtiva, hojeMs, periodo, agora]);

  const contagens = useMemo(() => {
    const c: Record<string, number> = { todos: baseSemEtapa.length };
    ETAPA_PILULAS.forEach((p) => {
      if (p.value === 'todos') return;
      c[p.value] = baseSemEtapa.filter((d) => etapaCasa(d.etapa, p.value)).length;
    });
    return c;
  }, [baseSemEtapa]);

  const filtrados = useMemo(() => baseSemEtapa.filter((d) => etapaCasa(d.etapa, etapa)), [baseSemEtapa, etapa]);

  const ordenados = useMemo(() => {
    const arr = [...filtrados];
    switch (ordenacao) {
      case 'antigos':
        return arr.sort((a, b) => (a.data_desligamento ?? '').localeCompare(b.data_desligamento ?? ''));
      case 'nome':
        return arr.sort((a, b) =>
          (a.colaborador?.nome_completo ?? '').localeCompare(b.colaborador?.nome_completo ?? '', 'pt-BR')
        );
      case 'valor':
        return arr.sort((a, b) => (b.valor_liquido ?? 0) - (a.valor_liquido ?? 0));
      default:
        return arr.sort((a, b) => (b.data_desligamento ?? '').localeCompare(a.data_desligamento ?? ''));
    }
  }, [filtrados, ordenacao]);

  const totalPaginas = Math.max(1, Math.ceil(ordenados.length / porPagina));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const inicioIdx = (paginaAtual - 1) * porPagina;
  const visiveis = useMemo(() => ordenados.slice(inicioIdx, inicioIdx + porPagina), [ordenados, inicioIdx, porPagina]);

  const chaveCascata = `${paginaAtual}|${ordenacao}|${etapa}|${status}|${tipo}|${departamento}|${periodo}|${busca}|${visualizacao}`;

  const toggleLinha = (id: string) => {
    setSelecionados((prev) => {
      const proximo = new Set(prev);
      if (proximo.has(id)) proximo.delete(id);
      else proximo.add(id);
      return proximo;
    });
  };

  const toggleTodos = (marcar: boolean) => {
    setSelecionados((prev) => {
      const proximo = new Set(prev);
      visiveis.forEach((d) => {
        const id = String(d.id);
        if (marcar) proximo.add(id);
        else proximo.delete(id);
      });
      return proximo;
    });
  };

  const limparFiltros = () => {
    setBusca('');
    setEtapa('todos');
    setStatus('todos');
    setTipo('todos');
    setDepartamento('todos');
    setPeriodo('todos');
    setPagina(1);
    onLimparAtencao?.();
  };

  const filtroAtivo =
    busca.trim() !== '' ||
    etapa !== 'todos' ||
    status !== 'todos' ||
    tipo !== 'todos' ||
    departamento !== 'todos' ||
    periodo !== 'todos' ||
    !!atencaoAtiva;

  const aoTrocarVisualizacao = (v: GestaoVisualizacao) => {
    startTransition(() => {
      setVisualizacao(v);
      setPorPagina(v === 'tabela' ? 5 : 6);
      setPagina(1);
    });
  };

  const opcoesPorPagina = visualizacao === 'tabela' ? POR_PAGINA : POR_PAGINA_CARDS;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <UserMinus className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div>
            <h2 className="font-display text-base font-medium leading-tight">Gestão de Desligamentos</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Acompanhe e gerencie todos os processos de desligamento
            </p>
          </div>
        </div>
        <VisualizacaoToggle value={visualizacao} onChange={aoTrocarVisualizacao} />
      </div>

      <DesligamentoFilters
        search={busca}
        onSearchChange={comReset(setBusca)}
        statusFilter={status}
        onStatusChange={comReset(setStatus)}
        tipoFilter={tipo}
        onTipoChange={comReset(setTipo)}
        departamentoFilter={departamento}
        onDepartamentoChange={comReset(setDepartamento)}
        departamentoOptions={opcoesDepartamento}
        periodoFilter={periodo}
        onPeriodoChange={comReset(setPeriodo)}
        onLimpar={limparFiltros}
        filtroAtivo={filtroAtivo}
      />

      {atencaoAtiva && (
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1.5 border-warning/30 bg-warning/10 text-warning">
            <Clock className="h-3 w-3" />
            Mostrando só processos que precisam de atenção
          </Badge>
          <button
            type="button"
            onClick={onLimparAtencao}
            className="text-xs text-muted-foreground underline-offset-2 hover:underline"
          >
            limpar
          </button>
        </div>
      )}

      <EtapaPills ativo={etapa} contagens={contagens} onSelecionar={comReset(setEtapa)} />

      <Card className="overflow-hidden rounded-2xl border-border/40 bg-card/60">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/30 px-4 py-3">
          <h3 className="flex items-center gap-2 font-display text-sm font-medium text-foreground">
            <List className="h-4 w-4 text-primary" />
            Processos
            <span className="text-sm font-normal text-muted-foreground">({ordenados.length})</span>
          </h3>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-[34px] gap-2 rounded-lg border-border/40 font-body text-xs"
              >
                <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                {ORDENACOES.find((o) => o.value === ordenacao)?.label}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {ORDENACOES.map((o) => (
                <DropdownMenuItem key={o.value} onClick={() => comReset(setOrdenacao)(o.value)}>
                  {o.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner size="lg" />
          </div>
        ) : desligamentos.length === 0 ? (
          <EmptyList entityName="desligamento" onCreate={onNovo} />
        ) : ordenados.length === 0 ? (
          <EmptySearch search={busca} onClear={limparFiltros} />
        ) : (
          <>
            {visualizacao === 'tabela' ? (
              <TabelaDesligamentos
                itens={visiveis}
                hojeMs={hojeMs}
                selecionados={selecionados}
                onToggleTodos={toggleTodos}
                onToggleLinha={toggleLinha}
                chaveCascata={chaveCascata}
                onOpenDetalhes={onOpenDetalhes}
                onCalcular={onCalcular}
                onExcluir={onExcluir}
              />
            ) : (
              <CardsDesligamentos
                itens={visiveis}
                hojeMs={hojeMs}
                onOpenDetalhes={onOpenDetalhes}
                onCalcular={onCalcular}
                onExcluir={onExcluir}
              />
            )}

            <Paginacao
              inicio={inicioIdx + 1}
              fim={Math.min(inicioIdx + porPagina, ordenados.length)}
              total={ordenados.length}
              pagina={paginaAtual}
              totalPaginas={totalPaginas}
              porPagina={porPagina}
              opcoesPorPagina={opcoesPorPagina}
              onPagina={setPagina}
              onPorPagina={(n) => {
                setPorPagina(n);
                setPagina(1);
              }}
            />
          </>
        )}
      </Card>
    </div>
  );
}
