import { useMemo, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  ChevronLeft,
  ChevronRight,
  GalleryVerticalEnd,
  MoreHorizontal,
  Search,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { corProgresso, formatarPeriodo, mediaProgresso, tintaProgresso } from './desempenhoComum';

/**
 * ============================================================================
 * TABELA "TODOS OS CICLOS" — Gestão de Desempenho.
 *
 * Busca, filtro de status, progresso (média das metas vinculadas) e paginação
 * são puramente client-side sobre os ciclos já carregados por
 * `avaliacaoService.listarCiclos`. As ações reutilizam funcionalidade real:
 * destacar o ciclo no painel e excluir o registro (com confirmação).
 * ============================================================================
 */

interface TodosCiclosTableProps {
  ciclos: any[];
  metas: any[];
  cicloSelecionadoId?: string;
  onSelecionar: (ciclo: any) => void;
  onExcluir: (ciclo: any) => void;
  excluindo?: boolean;
}

/** Tinta do ponto e estilo do badge por status real de `ciclos_avaliacao`. */
const ESTILO_STATUS: Record<string, { ponto: string; badge: string }> = {
  ativo: { ponto: 'bg-primary', badge: 'border-transparent bg-primary text-primary-foreground' },
  em_andamento: { ponto: 'bg-warning', badge: 'border-warning/40 bg-warning/10 text-warning' },
  concluido: { ponto: 'bg-info', badge: 'border-info/40 bg-info/10 text-info' },
  rascunho: { ponto: 'bg-muted-foreground', badge: 'border-border bg-muted/50 text-muted-foreground' },
};

function estiloStatus(status: unknown) {
  return ESTILO_STATUS[String(status ?? '')] ?? ESTILO_STATUS.rascunho;
}

export function TodosCiclosTable({
  ciclos,
  metas,
  cicloSelecionadoId,
  onSelecionar,
  onExcluir,
  excluindo,
}: TodosCiclosTableProps) {
  const [busca, setBusca] = useState('');
  const [statusFiltro, setStatusFiltro] = useState('todos');
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(10);
  const [paraExcluir, setParaExcluir] = useState<any | null>(null);

  const statusDisponiveis = useMemo(
    () => Array.from(new Set(ciclos.map((c) => String(c.status ?? '')))).filter(Boolean),
    [ciclos],
  );

  const progressoPorCiclo = useMemo(() => {
    const mapa = new Map<string, number | null>();
    ciclos.forEach((c) => {
      const doCiclo = metas.filter((m) => m?.ciclo_id === c.id);
      mapa.set(c.id, doCiclo.length ? mediaProgresso(doCiclo) : null);
    });
    return mapa;
  }, [ciclos, metas]);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return ciclos.filter((c) => {
      const alvo = `${c.nome ?? ''} ${c.descricao ?? ''}`.toLowerCase();
      const casaBusca = !termo || alvo.includes(termo);
      const casaStatus = statusFiltro === 'todos' || String(c.status ?? '') === statusFiltro;
      return casaBusca && casaStatus;
    });
  }, [ciclos, busca, statusFiltro]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / porPagina));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const visiveis = filtrados.slice((paginaAtual - 1) * porPagina, paginaAtual * porPagina);
  const inicio = filtrados.length === 0 ? 0 : (paginaAtual - 1) * porPagina + 1;
  const fim = Math.min(paginaAtual * porPagina, filtrados.length);

  return (
    <section className="space-y-3">
      {/* ─── Cabeçalho da seção ─────────────────────────────────────── */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="font-display text-lg font-medium tracking-tight">Todos os Ciclos</h2>
          <p className="text-xs text-muted-foreground">Histórico e próximos ciclos de avaliação</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={busca}
              onChange={(e) => {
                setBusca(e.target.value);
                setPagina(1);
              }}
              placeholder="Buscar ciclos..."
              className="h-9 w-full pl-9 sm:w-[230px]"
            />
          </div>
          <Select
            value={statusFiltro}
            onValueChange={(v) => {
              setStatusFiltro(v);
              setPagina(1);
            }}
          >
            <SelectTrigger className="h-9 w-full sm:w-[168px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              {statusDisponiveis.map((s) => (
                <SelectItem key={s} value={s} className="capitalize">
                  {s.replace('_', ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ─── Tabela ─────────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-2xl border border-border/30 bg-card shadow-elevated">
        <Table>
          <TableHeader>
            <TableRow className="border-border/30 bg-muted/20 hover:bg-muted/20">
              <TableHead className="h-10 text-[11px] uppercase tracking-wider text-muted-foreground">Nome do Ciclo</TableHead>
              <TableHead className="h-10 text-[11px] uppercase tracking-wider text-muted-foreground">Descrição</TableHead>
              <TableHead className="h-10 text-[11px] uppercase tracking-wider text-muted-foreground">Tipo</TableHead>
              <TableHead className="h-10 text-[11px] uppercase tracking-wider text-muted-foreground">Período</TableHead>
              <TableHead className="h-10 w-[170px] text-[11px] uppercase tracking-wider text-muted-foreground">Progresso</TableHead>
              <TableHead className="h-10 text-[11px] uppercase tracking-wider text-muted-foreground">Status</TableHead>
              <TableHead className="h-10 w-[56px] text-right text-[11px] uppercase tracking-wider text-muted-foreground">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visiveis.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                  Nenhum ciclo encontrado
                </TableCell>
              </TableRow>
            ) : (
              visiveis.map((c) => {
                const progresso = progressoPorCiclo.get(c.id) ?? null;
                const est = estiloStatus(c.status);
                const selecionado = c.id === cicloSelecionadoId;
                return (
                  <TableRow
                    key={c.id}
                    className={cn(
                      'border-border/20 transition-colors hover:bg-accent/10',
                      selecionado && 'bg-primary/5',
                    )}
                  >
                    <TableCell className="py-2.5">
                      <span className="flex items-center gap-2">
                        <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', est.ponto)} />
                        <span className="truncate text-[13px] font-medium">{c.nome}</span>
                      </span>
                    </TableCell>
                    <TableCell className="max-w-[280px] py-2.5">
                      <span className="line-clamp-1 text-xs text-muted-foreground" title={c.descricao}>
                        {c.descricao || '—'}
                      </span>
                    </TableCell>
                    <TableCell className="py-2.5 text-xs capitalize text-muted-foreground">{c.tipo || '—'}</TableCell>
                    <TableCell className="whitespace-nowrap py-2.5 font-mono text-xs text-muted-foreground">
                      {formatarPeriodo(c.data_inicio, c.data_fim)}
                    </TableCell>
                    <TableCell className="py-2.5">
                      <span className="flex items-center gap-2">
                        <span className="h-1.5 w-16 overflow-hidden rounded-full bg-secondary">
                          <span
                            className={cn('block h-full rounded-full', corProgresso(progresso))}
                            style={{ width: `${progresso ?? 0}%` }}
                          />
                        </span>
                        <span className={cn('text-[11px] font-medium tabular-nums', tintaProgresso(progresso))}>
                          {progresso === null ? '—' : `${progresso}%`}
                        </span>
                      </span>
                    </TableCell>
                    <TableCell className="py-2.5">
                      <Badge variant="outline" className={cn('text-[10px] font-medium capitalize', est.badge)}>
                        {String(c.status ?? '').replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2.5 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground"
                            aria-label={`Ações do ciclo ${c.nome}`}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                          <DropdownMenuItem onClick={() => onSelecionar(c)}>
                            <GalleryVerticalEnd className="mr-2 h-3.5 w-3.5" /> Acompanhar no painel
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive-vivid focus:text-destructive-vivid"
                            onClick={() => setParaExcluir(c)}
                          >
                            <Trash2 className="mr-2 h-3.5 w-3.5" /> Excluir ciclo
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {/* ─── Rodapé: paginação ─────────────────────────────────────── */}
        <div className="flex flex-col gap-2 border-t border-border/20 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11px] text-muted-foreground">
            Mostrando <span className="font-medium text-foreground">{inicio}-{fim}</span> de{' '}
            <span className="font-medium text-foreground">{filtrados.length}</span>{' '}
            {filtrados.length === 1 ? 'ciclo' : 'ciclos'}
          </p>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              Itens por página
              <Select
                value={String(porPagina)}
                onValueChange={(v) => {
                  setPorPagina(Number(v));
                  setPagina(1);
                }}
              >
                <SelectTrigger className="h-7 w-[64px] text-[11px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[5, 10, 20].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </span>
            <span className="text-[11px] tabular-nums text-muted-foreground">
              {paginaAtual}/{totalPaginas}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                disabled={paginaAtual <= 1}
                onClick={() => setPagina(paginaAtual - 1)}
                aria-label="Página anterior"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                disabled={paginaAtual >= totalPaginas}
                onClick={() => setPagina(paginaAtual + 1)}
                aria-label="Próxima página"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <AlertDialog
        open={!!paraExcluir}
        onOpenChange={(aberto) => {
          if (!aberto) setParaExcluir(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir ciclo</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{paraExcluir?.nome}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive-vivid text-white hover:bg-destructive-vivid/90"
              disabled={excluindo}
              onClick={() => {
                if (paraExcluir) onExcluir(paraExcluir);
                setParaExcluir(null);
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
