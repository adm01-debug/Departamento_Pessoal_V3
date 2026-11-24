/**
 * ============================================================================
 * LINHA DO TEMPO DE AUDITORIA — o card da coluna esquerda (~69%).
 *
 * Cada evento é UMA LINHA compacta (56–68 px), não um card vertical: marcador no
 * trilho, ícone da operação em chip arredondado, selo INSERT/UPDATE/DELETE,
 * título legível, responsável · data · hora, entidade, parecer de integridade e
 * o chevron que abre o painel ao lado. O json NUNCA aparece aqui — ele mora no
 * painel de detalhes.
 *
 * ── O TRILHO ───────────────────────────────────────────────────────────────
 * Uma única linha vertical (`absolute left-2`) atravessa a lista inteira e cada
 * marcador fica centrado nela (`w-4` + `justify-center`), por isso os pontos
 * ficam sempre conectados — inclusive quando a lista é filtrada. O marcador do
 * evento ABERTO acende em lime com halo (`shadow-glow`); os demais ficam
 * vazados, com o anel do tom da operação.
 *
 * ── SELEÇÃO ────────────────────────────────────────────────────────────────
 * A linha é um `<button>` de largura total (teclado e leitor de tela gratuitos).
 * O evento aberto ganha borda lime + tinta lime translúcida + glow, com
 * transição de 200 ms — e o painel ao lado é atualizado no mesmo clique. Nada
 * expande verticalmente.
 *
 * ── RODAPÉ ─────────────────────────────────────────────────────────────────
 * `[1–5 de 18 eventos]` à esquerda e, à direita, ‹ · páginas · ›. A página ativa
 * é lime sólida com texto escuro (o mesmo par do `AppPagination`), as setas
 * desabilitam nas pontas e o rodapé fica preso na base do card (`mt-auto`), para
 * a lista não empurrar a paginação. Na Central o card recebe `flex-1` e estica
 * até a base da coluna esquerda: o rodapé é, na prática, a linha de base do
 * painel de detalhes ao lado.
 *
 * ── MOBILIÁRIO DA LINHA SEGUE A LARGURA DO CARD (`@container`) ─────────────
 * O card agora divide a linha com o painel de detalhes, então a largura dele
 * deixou de ser "a largura da página": depende da viewport E da sidebar. As duas
 * peças de apoio — o chip da entidade (`@min-[700px]`) e o selo de integridade
 * (`@min-[560px]`) — aparecem por CONTAINER QUERY, medidas na largura do próprio
 * card: quando ele encolhe, sai primeiro o chip da entidade (o nome do registro
 * já diz o tipo e o painel mostra a entidade) e o selo de integridade, que é
 * informação de auditoria, é o último a sair. Antes esses limiares eram de
 * viewport (`lg`/`xl`) e, com o painel ao lado, espremiam o título e o
 * responsável a zero em 1280 px.
 * ============================================================================
 */
import {
  ChevronLeft,
  ChevronRight,
  CircleDashed,
  Layers,
  PencilLine,
  Plus,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
  Trash2,
  TriangleAlert,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  dataHoraDoEvento,
  evidenciaDoEvento,
  faixaExibidaAuditoria,
  paginasVisiveisAuditoria,
  responsavelDoEvento,
  rotuloDoRecurso,
  tituloDoEvento,
  type EstadoEvidencia,
  type EventoAuditoria,
  type OperacaoAuditoria,
} from './centralAuditoria';

interface CentralAuditoriaTimelineProps {
  /** Somente os eventos da PÁGINA atual, já filtrados. */
  eventos: readonly EventoAuditoria[];
  /** Total de eventos do recorte (todas as páginas). */
  total: number;
  pagina: number;
  /** Eventos por página — base do total de páginas do rodapé. */
  tamanhoPagina: number;
  /** Evento aberto no painel (ou `null`). */
  idAtivo: string | null;
  carregando?: boolean;
  /** Mensagem de erro da consulta (a lista fica vazia e o card avisa). */
  erro?: string | null;
  /** Existe algum filtro ativo? Muda o texto do estado vazio. */
  temFiltros: boolean;
  onSelecionar: (id: string) => void;
  onPagina: (pagina: number) => void;
  onLimparFiltros: () => void;
}

/** Moldura de cada operação — ícone e tinta dos tokens semânticos do sistema. */
const MOLDURA_OPERACAO: Record<
  OperacaoAuditoria,
  { icone: LucideIcon; chip: string; selo: 'success' | 'info' | 'destructive' | 'outline' }
> = {
  INSERT: { icone: Plus, chip: 'bg-success/10 text-success', selo: 'success' },
  UPDATE: { icone: PencilLine, chip: 'bg-info/10 text-info', selo: 'info' },
  DELETE: {
    icone: Trash2,
    chip: 'bg-destructive-vivid/10 text-destructive-vivid',
    selo: 'destructive',
  },
  OUTRA: { icone: CircleDashed, chip: 'bg-muted text-muted-foreground', selo: 'outline' },
};

/** Anel do marcador do trilho (mesma família do chip da operação). */
const ANEL_MARCADOR: Record<OperacaoAuditoria, string> = {
  INSERT: 'border-success/60',
  UPDATE: 'border-info/60',
  DELETE: 'border-destructive-vivid/60',
  OUTRA: 'border-border',
};

/** Texto e tinta do selo de integridade (badge pequeno da linha). */
const SELO_EVIDENCIA: Record<
  EstadoEvidencia,
  { rotulo: string; variante: 'success' | 'warning' | 'destructive' | 'outline'; icone: LucideIcon }
> = {
  verificada: { rotulo: 'Evidência verificada', variante: 'success', icone: ShieldCheck },
  divergente: { rotulo: 'Evidência divergente', variante: 'destructive', icone: ShieldAlert },
  revisao: { rotulo: 'Revisão recomendada', variante: 'warning', icone: TriangleAlert },
  sem_comprovacao: { rotulo: 'Sem comprovação', variante: 'outline', icone: ShieldQuestion },
};

export function CentralAuditoriaTimeline({
  eventos,
  total,
  pagina,
  tamanhoPagina,
  idAtivo,
  carregando = false,
  erro = null,
  temFiltros,
  onSelecionar,
  onPagina,
  onLimparFiltros,
}: CentralAuditoriaTimelineProps) {
  const totalPaginas = Math.max(1, Math.ceil(total / Math.max(1, tamanhoPagina)));
  const paginaAtual = Math.min(Math.max(1, pagina), totalPaginas);
  const faixa = faixaExibidaAuditoria(paginaAtual, tamanhoPagina, total);

  return (
    <Card className="@container flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-border/60">
      <div className="flex items-center gap-2 border-b border-border/50 px-3.5 py-2.5">
        <Layers className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        <h3 className="truncate text-[13px] leading-tight font-semibold">Linha do Tempo de Auditoria</h3>
        <span className="ml-auto shrink-0 text-[10.5px] text-muted-foreground tabular-nums">
          {total} evento{total === 1 ? '' : 's'}
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2.5 py-2">
        {carregando ? (
          <div className="space-y-1.5" aria-busy="true" aria-label="Carregando trilha de auditoria">
            {Array.from({ length: 4 }).map((_, indice) => (
              <div key={indice} className="flex items-center gap-2.5 pl-6">
                <Skeleton className="h-8 w-8 shrink-0 rounded-lg" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-1/3" />
                  <Skeleton className="h-2.5 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : erro ? (
          <EstadoVazio icone={ShieldAlert} tom="destructive" titulo="Não foi possível ler a trilha" descricao={erro} />
        ) : eventos.length === 0 ? (
          <EstadoVazio
            icone={ShieldQuestion}
            titulo={temFiltros ? 'Nenhum evento neste recorte' : 'Nenhum evento no período'}
            descricao={
              temFiltros
                ? 'Os filtros atuais não encontraram operações auditadas. Limpe os filtros para ver a trilha completa do período.'
                : 'Não há operações auditadas para as entidades do ponto neste período.'
            }
            acao={temFiltros ? { rotulo: 'Limpar filtros', onClick: onLimparFiltros } : undefined}
          />
        ) : (
          <div className="relative">
            {/* Trilho contínuo: uma linha só, atrás de todos os marcadores. */}
            <span className="absolute top-3 bottom-3 left-2 w-px bg-border/50" aria-hidden="true" />
            <ol className="relative space-y-1">
              {eventos.map((evento) => (
                <LinhaEvento
                  key={evento.id}
                  evento={evento}
                  ativo={evento.id === idAtivo}
                  onSelecionar={onSelecionar}
                />
              ))}
            </ol>
          </div>
        )}
      </div>

      <footer className="mt-auto flex flex-col gap-1.5 border-t border-border/50 px-3.5 py-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[11px] text-muted-foreground tabular-nums">
          {total === 0 ? '0 evento' : `${faixa.inicio}–${faixa.fim} de ${total} evento${total === 1 ? '' : 's'}`}
        </p>

        <nav className="flex items-center gap-1" aria-label="Paginação da trilha">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
            onClick={() => onPagina(paginaAtual - 1)}
            disabled={paginaAtual <= 1 || carregando}
            aria-label="Página anterior"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>

          {paginasVisiveisAuditoria(paginaAtual, totalPaginas).map((numero, indice) =>
            numero === null ? (
              <span key={`gap-${indice}`} className="px-1 text-[11px] text-muted-foreground" aria-hidden="true">
                …
              </span>
            ) : (
              <button
                key={numero}
                type="button"
                onClick={() => onPagina(numero)}
                aria-current={numero === paginaAtual ? 'page' : undefined}
                aria-label={`Página ${numero}`}
                className={cn(
                  'h-7 w-7 rounded-lg text-[11.5px] font-semibold tabular-nums transition-colors duration-fast',
                  numero === paginaAtual
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
              >
                {numero}
              </button>
            )
          )}

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
            onClick={() => onPagina(paginaAtual + 1)}
            disabled={paginaAtual >= totalPaginas || carregando}
            aria-label="Próxima página"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </nav>
      </footer>
    </Card>
  );
}

/* ─── Uma linha da trilha ─────────────────────────────────────────────────── */

interface LinhaEventoProps {
  evento: EventoAuditoria;
  ativo: boolean;
  onSelecionar: (id: string) => void;
}

/**
 * Evento compacto: marcador + chip da operação + (selo, título, responsável ·
 * data · hora) + (entidade, integridade, chevron).
 */
function LinhaEvento({ evento, ativo, onSelecionar }: LinhaEventoProps) {
  const moldura = MOLDURA_OPERACAO[evento.operacao];
  const Icone = moldura.icone;
  const evidencia = evidenciaDoEvento(evento);
  const seloEvidencia = SELO_EVIDENCIA[evidencia.estado];
  const IconeEvidencia = seloEvidencia.icone;
  const { data, hora } = dataHoraDoEvento(evento.criadoEm);
  const responsavel = responsavelDoEvento(evento);

  return (
    <li className="relative flex items-stretch gap-2">
      {/* Marcador centrado no trilho (a linha vertical é do contêiner). */}
      <span className="relative flex w-4 shrink-0 justify-center pt-3.5" aria-hidden="true">
        <span
          className={cn(
            'grid h-3.5 w-3.5 place-items-center rounded-full border-2 bg-card transition-all duration-200 ease-out',
            ativo ? 'border-primary shadow-glow' : cn(ANEL_MARCADOR[evento.operacao], 'border-2')
          )}
        >
          <span
            className={cn(
              'h-1.5 w-1.5 rounded-full transition-colors duration-200',
              ativo ? 'bg-primary' : 'bg-transparent'
            )}
          />
        </span>
      </span>

      <button
        type="button"
        onClick={() => onSelecionar(evento.id)}
        aria-pressed={ativo}
        aria-label={`Ver detalhes: ${tituloDoEvento(evento)}`}
        className={cn(
          'group grid min-w-0 flex-1 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2.5 rounded-xl border px-2.5 py-2.5 text-left',
          'transition-[background-color,border-color,box-shadow] duration-200 ease-out',
          ativo
            ? 'border-primary/50 bg-primary/[0.06] shadow-glow'
            : 'border-border/30 bg-background/40 hover:border-border/60 hover:bg-background/70'
        )}
      >
        <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-lg', moldura.chip)}>
          <Icone className="h-4 w-4" aria-hidden="true" />
        </span>

        <span className="min-w-0">
          <span className="flex min-w-0 items-center gap-1.5">
            <Badge variant={moldura.selo} size="sm" className="shrink-0 px-1.5 py-0 text-[9.5px] font-semibold">
              {evento.acao}
            </Badge>
            <span className="truncate text-[12.5px] font-semibold leading-tight">{tituloDoEvento(evento)}</span>
          </span>
          <span className="mt-0.5 flex min-w-0 items-center gap-1 text-[10.5px] leading-tight text-muted-foreground">
            <UserRound className="h-3 w-3 shrink-0" aria-hidden="true" />
            <span className="truncate">{responsavel}</span>
            <span aria-hidden="true">·</span>
            <span className="shrink-0 tabular-nums">
              {data} · {hora}
            </span>
          </span>
        </span>

        <span className="flex shrink-0 items-center gap-2">
          <span className="hidden items-center gap-1 rounded-full border border-border/40 bg-muted/30 px-2 py-0.5 text-[10px] text-muted-foreground @min-[760px]:inline-flex">
            <Layers className="h-2.5 w-2.5" aria-hidden="true" />
            {rotuloDoRecurso(evento.tabela)}
          </span>
          <Badge variant={seloEvidencia.variante} size="sm" className="hidden shrink-0 gap-1 @min-[560px]:inline-flex">
            <IconeEvidencia className="h-2.5 w-2.5" aria-hidden="true" />
            {seloEvidencia.rotulo}
          </Badge>
          <ChevronRight
            className={cn(
              'h-4 w-4 shrink-0 transition-colors',
              ativo ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
            )}
            aria-hidden="true"
          />
        </span>
      </button>
    </li>
  );
}

/* ─── Estado vazio / de erro ──────────────────────────────────────────────── */

interface EstadoVazioProps {
  icone: LucideIcon;
  titulo: string;
  descricao: string;
  tom?: 'muted' | 'destructive';
  acao?: { rotulo: string; onClick: () => void };
}

/** Bloco de espera/erro — mesma diagramação nos dois casos. */
function EstadoVazio({ icone: Icone, titulo, descricao, tom = 'muted', acao }: EstadoVazioProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-1.5 px-4 py-10 text-center">
      <span
        className={cn(
          'grid h-9 w-9 place-items-center rounded-full',
          tom === 'destructive' ? 'bg-destructive/10 text-destructive-vivid' : 'bg-muted text-muted-foreground'
        )}
      >
        <Icone className="h-4 w-4" aria-hidden="true" />
      </span>
      <p className="text-xs font-medium">{titulo}</p>
      <p className="max-w-[300px] text-[11px] leading-snug text-muted-foreground">{descricao}</p>
      {acao && (
        <Button variant="outline" size="sm" className="mt-1 h-7 text-[11px]" onClick={acao.onClick}>
          {acao.rotulo}
        </Button>
      )}
    </div>
  );
}
