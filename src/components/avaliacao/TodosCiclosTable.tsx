import { useMemo, useState } from 'react';
import { Table, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CascadeTableBody, CascadeTableRow } from '@/components/ui/cascade-table';
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
  GalleryVerticalEnd,
  MoreHorizontal,
  Search,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AppPagination } from '@/components/ui/app-pagination';
import { useMovimentoReduzido } from '@/lib/motionMode';
import { formatarPeriodo, mediaProgresso } from './desempenhoComum';
import { motion } from 'framer-motion';
import { entradaCard } from './entradaCards';
import { BarraProgresso } from './barraProgresso';

/**
 * ============================================================================
 * TABELA "TODOS OS CICLOS" — Gestão de Desempenho.
 *
 * Busca, filtro de status, progresso (média das metas vinculadas) e paginação
 * são puramente client-side sobre os ciclos já carregados por
 * `avaliacaoService.listarCiclos`. As ações reutilizam funcionalidade real:
 * destacar o ciclo no painel e excluir o registro (com confirmação).
 *
 * ENTRADA DAS LINHAS: a MESMA cascata do card "Processos" da Gestão de
 * Desligamentos (`components/desligamentos/GestaoDesligamentos.tsx`), que
 * consome o mecanismo compartilhado `ui/cascade-table` +
 * `ui/table-row-reveal` (linha "de dentro para fora": `opacity 0→1`,
 * `y 10→0`, `scaleX 0.94→1`, 0,8s, ease `[0.22, 1, 0.36, 1]`, atraso
 * `0,52s + índice × 40ms`). Nenhum número é recalculado aqui: `CascadeTableRow`
 * é dono das props de animação. O cabeçalho NÃO anima (a referência também não
 * anima) e a moldura da seção continua com o `entradaCard` de sempre.
 * ============================================================================
 */

interface TodosCiclosTableProps {
  ciclos: any[];
  metas: any[];
  /**
   * Ciclo destacado no painel ao lado. Mantido por compatibilidade de API —
   * a tabela NÃO o usa mais para pintar a linha (todas as linhas têm o mesmo
   * fundo); a identificação do ciclo ativo fica por conta do ponto colorido
   * ao lado do nome e do badge de status.
   */
  cicloSelecionadoId?: string;
  onSelecionar: (ciclo: any) => void;
  onExcluir: (ciclo: any) => void;
  excluindo?: boolean;
  /** Posição na cascata de entrada (mesma régua do Dashboard Executivo). */
  indice?: number;
}

/**
 * Tinta do ponto, do badge e do PROGRESSO por status real de `ciclos_avaliacao`.
 *
 * Semântica única da tabela (refino cromático):
 *   · ativo        → verde-lima oficial (`--primary`): ponto, badge sólida com
 *                    texto escuro e barra verde → verde-lima;
 *   · concluido    → verde de sucesso (`--success`): ponto, badge translúcida
 *                    com contorno sutil e barra no degradê de sucesso
 *                    (substitui o azul-ciano de `--info`);
 *   · em_andamento → âmbar (`--warning`): ponto, badge translúcida com contorno
 *                    discreto, texto âmbar e barra âmbar;
 *   · rascunho     → cinza-azulado discreto (`--muted-foreground`) e trilho
 *                    neutro, sem cor de status.
 *
 * A cor vem do STATUS, não de faixas de percentual: um ciclo concluído com 40%
 * segue verde de sucesso e um ciclo em andamento com 90% segue âmbar — a cor
 * nunca contradiz o estado real do registro.
 */
const ESTILO_STATUS: Record<string, { ponto: string; badge: string; barra: string; tinta: string }> = {
  ativo: {
    ponto: 'bg-primary',
    badge: 'border-transparent bg-primary text-primary-foreground',
    barra: 'bg-gradient-to-r from-success to-primary',
    tinta: 'text-primary',
  },
  concluido: {
    ponto: 'bg-success',
    badge: 'border-success/40 bg-success/10 text-success',
    barra: 'bg-gradient-to-r from-success/70 to-success',
    tinta: 'text-success',
  },
  em_andamento: {
    ponto: 'bg-warning',
    badge: 'border-warning/40 bg-warning/10 text-warning',
    barra: 'bg-gradient-to-r from-warning/60 to-warning',
    tinta: 'text-warning',
  },
  rascunho: {
    ponto: 'bg-muted-foreground',
    badge: 'border-border bg-muted/40 text-muted-foreground',
    barra: 'bg-muted-foreground/40',
    tinta: 'text-muted-foreground',
  },
};

/**
 * Trilho neutro + tinta secundária quando o ciclo NÃO tem progresso mensurável
 * (nenhuma meta vinculada): nenhuma cor de status, nenhum percentual inventado —
 * o valor continua sendo "—".
 */
const PROGRESSO_INDISPONIVEL = { barra: 'bg-muted-foreground/40', tinta: 'text-muted-foreground' };

function estiloStatus(status: unknown) {
  return ESTILO_STATUS[String(status ?? '')] ?? ESTILO_STATUS.rascunho;
}

export function TodosCiclosTable({
  ciclos,
  metas,
  onSelecionar,
  onExcluir,
  excluindo,
  indice = 0,
}: TodosCiclosTableProps) {
  const [busca, setBusca] = useState('');
  const [statusFiltro, setStatusFiltro] = useState('todos');
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(10);
  const [paraExcluir, setParaExcluir] = useState<any | null>(null);
  // Movimento reduzido (fonte única do app): com ele ligado as barras de
  // progresso nascem já cheias, sem espera.
  const reduzirMovimento = useMovimentoReduzido();

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

  /**
   * Chave da cascata — MESMA régua do `chaveCascata` da tabela "Processos"
   * (`GestaoDesligamentos.tsx`): o `<tbody>` remonta quando a LISTA troca de
   * identidade (página, busca ou filtro de status) e a cascata toca de novo.
   * Hover, tooltip e re-render comum NÃO mudam a chave — as linhas seguem
   * montadas e não reanimam.
   */
  const chaveCascata = `${paginaAtual}|${busca}|${statusFiltro}`;

  return (
    <motion.section {...entradaCard(indice)} className="space-y-3">
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
          {/* Moldura da cascata: `AnimatePresence` local (devolve o keyframe
              `hidden` que o `initial={false}` do PageTransition bloquearia) +
              `<tbody>` com `key` — a MESMA peça usada pela tabela "Processos". */}
          <CascadeTableBody cascadeKey={chaveCascata}>
            {visiveis.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                  Nenhum ciclo encontrado
                </TableCell>
              </TableRow>
            ) : (
              visiveis.map((c, indiceLinha) => {
                const progresso = progressoPorCiclo.get(c.id) ?? null;
                const est = estiloStatus(c.status);
                // Progresso indisponível → trilho neutro e "—" (nada de cor de status).
                const corProgresso = progresso === null ? PROGRESSO_INDISPONIVEL : est;
                return (
                  <CascadeTableRow
                    key={c.id}
                    index={indiceLinha}
                    className={cn(
                      // FUNDO DAS LINHAS — todas idênticas, sem destaque por status.
                      //
                      // A tabela vive sobre `bg-card` (`hsl(214 42% 12%)`) e nenhuma
                      // linha recebe `background-color` próprio: o ciclo ativo era o
                      // único pintado (`bg-primary/5`, depois
                      // `bg-gradient-to-r from-primary/5 to-primary/5`), o que criava
                      // um fundo esverdeado/amarelado só naquela linha — removido.
                      // Agora o status é identificado APENAS pelo ponto colorido ao
                      // lado do nome e pelo badge da coluna Status.
                      //
                      // No hover a linha inteira passa para `--background`
                      // (`hsl(216 48% 8%)`), o azul-marinho mais escuro do próprio
                      // Design System — mesmo efeito para todas as linhas, cobrindo
                      // de "Nome do Ciclo" a "Ações". `duration-[220ms] ease-in-out`
                      // é a transição pedida.
                      'border-border/20 transition-colors duration-[220ms] ease-in-out hover:bg-background',
                    )}
                  >
                    <TableCell className="py-2.5">
                      <span className="flex items-center gap-2">
                        <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', est.ponto)} />
                        <span className="truncate text-[13px] font-medium text-foreground">{c.nome}</span>
                      </span>
                    </TableCell>
                    <TableCell className="max-w-[280px] py-2.5">
                      {/* Descrição um tom acima de "Tipo/Período": cinza-azulado
                          legível, sem competir com o nome do ciclo. */}
                      <span className="line-clamp-1 text-xs text-foreground/70" title={c.descricao}>
                        {c.descricao || '—'}
                      </span>
                    </TableCell>
                    <TableCell className="py-2.5 text-xs capitalize text-muted-foreground">{c.tipo || '—'}</TableCell>
                    <TableCell className="whitespace-nowrap py-2.5 font-mono text-xs text-muted-foreground">
                      {formatarPeriodo(c.data_inicio, c.data_fim)}
                    </TableCell>
                    <TableCell className="py-2.5">
                      <span className="flex items-center gap-2">
                        <BarraProgresso
                          percentual={progresso}
                          indice={indiceLinha}
                          cor={corProgresso.barra}
                          reduzirMovimento={reduzirMovimento}
                          trilhoClassName="h-1.5 w-16 bg-secondary"
                        />
                        <span className={cn('text-[11px] font-medium tabular-nums', corProgresso.tinta)}>
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
                  </CascadeTableRow>
                );
              })
            )}
          </CascadeTableBody>
        </Table>

        {/* ─── Rodapé: paginação (padrão único do sistema) ────────────── */}
        <div className="border-t border-border/20 px-4 py-1.5">
          <AppPagination
            page={paginaAtual}
            total={filtrados.length}
            pageSize={porPagina}
            pageSizeOptions={[5, 10, 20]}
            onPageChange={setPagina}
            onPageSizeChange={(n) => {
              setPorPagina(n);
              setPagina(1);
            }}
            label={
              <>
                Mostrando <span className="font-medium text-foreground">{inicio}-{fim}</span> de{' '}
                <span className="font-medium text-foreground">{filtrados.length}</span>{' '}
                {filtrados.length === 1 ? 'ciclo' : 'ciclos'}
              </>
            }
          />
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
    </motion.section>
  );
}
