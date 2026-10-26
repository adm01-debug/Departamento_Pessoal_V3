/**
 * ============================================================================
 * CARD DO PIPELINE — mesma anatomia do card do Kanban de Admissão
 *
 * TOPO      avatar + nome + vaga + menu de ações
 * INFO      status · origem · data · avaliação
 * TAGS      competências reais da vaga
 * CONTEXTO  bloco da etapa (rótulo + próxima ação + detalhe) com o ícone na cor
 *           da etapa — o mesmo lugar/estrutura do bloco de Admissão
 * RODAPÉ    responsável (entrevistador do registro) + prazo da próxima etapa
 *
 * Nada aqui inventa dado: `contextoDaEtapa`, `statusDoCard` e
 * `habilidadesDaCandidatura` leem a candidatura real (campos da vaga, datas,
 * entrevistador e observações). A superfície é a mesma do card de Admissão:
 * `bg-background/85` com borda discreta e sombra curta — nunca branco/cinza.
 * ============================================================================
 */
import { useEffect, useRef, useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { ArrowRight, CalendarDays, ExternalLink, Mail, MoreVertical, Star, UserRound } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { CandidaturaComRelacoes } from '@/types/recrutamento';
import {
  ETAPAS,
  contextoDaEtapa,
  formatarDataCurta,
  habilidadesDaCandidatura,
  iniciaisDoNome,
  statusDoCard,
  type EtapaPipeline,
  type EtapaPipelineId,
} from './pipelineEtapas';
import { podeArrastarCandidatura } from './pipelineDragDrop';
import { ROTULO_CONTEXTO, TONS_PIPELINE } from './pipelineVisual';

/** Persiste a etapa. `false`/rejeição = rollback do estado otimista no board. */
export type MoverEtapaHandler = (id: string, etapa: EtapaPipelineId) => void | boolean | Promise<void | boolean>;

function AvatarIniciais({ nome, className }: { nome?: string | null; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full border border-border/40 font-semibold tracking-tight',
        className
      )}
    >
      {iniciaisDoNome(nome)}
    </span>
  );
}

/** Menu de três pontos — mesmas ações do card atual, no acabamento de Admissão. */
function MenuAcoes({
  cand,
  etapa,
  onAbrir,
  onMoverEtapa,
  onContatar,
}: {
  cand: CandidaturaComRelacoes;
  etapa: EtapaPipeline;
  onAbrir: (cand: CandidaturaComRelacoes) => void;
  onMoverEtapa: MoverEtapaHandler;
  onContatar: (cand: CandidaturaComRelacoes) => void;
}) {
  const nome = cand.candidato?.nome ?? 'candidato';
  const outras = ETAPAS.filter((item) => item.id !== etapa.id);
  /**
   * O menu abre no `pointerdown`. Em viewport baixo o Radix pode posicioná-lo
   * sobre o gatilho, e o MESMO toque (pointerup) selecionaria o primeiro item
   * antes de o usuário ver o menu. Um bloqueio transparente absorve só esse
   * toque de abertura (fallback de 1,2s) — o menu fica aberto e o próximo
   * clique funciona normalmente.
   */
  const [bloqueioInicial, setBloqueioInicial] = useState(false);
  const timerBloqueio = useRef<number | null>(null);
  const liberarBloqueio = () => {
    if (timerBloqueio.current) window.clearTimeout(timerBloqueio.current);
    setBloqueioInicial(false);
  };
  useEffect(
    () => () => {
      if (timerBloqueio.current) window.clearTimeout(timerBloqueio.current);
    },
    []
  );

  return (
    <DropdownMenu
      onOpenChange={(aberto) => {
        if (!aberto) return;
        setBloqueioInicial(true);
        if (timerBloqueio.current) window.clearTimeout(timerBloqueio.current);
        // Fallback: se nenhum clique chegar (toque cancelado), libera sozinho.
        timerBloqueio.current = window.setTimeout(() => setBloqueioInicial(false), 1200);
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Mais ações de ${nome}`}
          className="h-7 w-7 shrink-0 rounded-lg text-muted-foreground opacity-60 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100"
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="relative w-52 rounded-xl"
        onClick={(event) => event.stopPropagation()}
      >
        {bloqueioInicial && (
          <div
            aria-hidden
            data-bloqueio-menu
            className="absolute inset-0 z-50 rounded-xl"
            onClick={liberarBloqueio}
            onPointerUp={() => {
              // Libera DEPOIS do clique de abertura (mesma tarefa), para o
              // primeiro clique não selecionar um item sem querer.
              window.setTimeout(liberarBloqueio, 0);
            }}
          />
        )}
        <DropdownMenuItem className="cursor-pointer gap-2" onSelect={() => onAbrir(cand)}>
          <ExternalLink className="h-4 w-4 text-info" /> Ver detalhes
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer gap-2" onSelect={() => onContatar(cand)}>
          <Mail className="h-4 w-4 text-primary" /> Contatar candidato
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-[9px] uppercase tracking-[0.08em] text-muted-foreground">
          Mover para
        </DropdownMenuLabel>
        {outras.map((item) => (
          <DropdownMenuItem
            key={item.id}
            className="cursor-pointer gap-2"
            onSelect={() => onMoverEtapa(cand.id, item.id)}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: `hsl(var(--${item.token}))` }} />
            {item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export interface PipelineCardProps {
  cand: CandidaturaComRelacoes;
  /** Etapa EFETIVA da coluna (inclui o override otimista do drop). */
  etapa: EtapaPipeline;
  /** Clone do `DragOverlay` — elevação e leve rotação, montado no estado final. */
  dragging?: boolean;
  onAbrir: (cand: CandidaturaComRelacoes) => void;
  onMoverEtapa: MoverEtapaHandler;
  onContatar: (cand: CandidaturaComRelacoes) => void;
}

/** Card puramente visual (o arraste fica no wrapper `DraggablePipelineCard`). */
export function PipelineCard({ cand, etapa, dragging, onAbrir, onMoverEtapa, onContatar }: PipelineCardProps) {
  const tom = TONS_PIPELINE[etapa.id];
  // A etapa da COLUNA manda: durante o drop otimista o registro ainda pode estar
  // com a etapa antiga por alguns milissegundos, e o card não deve "piscar".
  const visual: CandidaturaComRelacoes = { ...cand, etapa: etapa.id };
  const status = statusDoCard(visual);
  const contexto = contextoDaEtapa(visual);
  const IconeContexto = contexto.icone;
  const nome = cand.candidato?.nome ?? 'Candidato';
  const vaga = cand.vaga?.titulo ?? 'Vaga não informada';
  const habilidades = habilidadesDaCandidatura(cand);
  const entrevistador = cand.entrevistador?.trim() || null;
  const prazo = cand.data_proxima_etapa ? formatarDataCurta(cand.data_proxima_etapa) : null;

  return (
    <Card
      className={cn(
        'group cursor-grab space-y-2 rounded-xl border border-border/50 bg-background/85 p-2.5 shadow-sm shadow-black/25 transition-all active:cursor-grabbing hover:shadow-md',
        tom.bordaHover,
        dragging && 'rotate-1 border-primary/40 shadow-lg ring-2 ring-primary/30'
      )}
    >
      {/* TOPO — avatar + nome/vaga + menu */}
      <div className="flex items-start gap-2">
        <AvatarIniciais nome={nome} className={cn('h-8 w-8 text-[10px]', tom.veu)} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-[13px] font-semibold leading-tight text-foreground" title={nome}>
            {nome}
          </p>
          <p className="mt-0.5 truncate text-[11px] leading-tight text-muted-foreground" title={vaga}>
            {vaga}
          </p>
        </div>
        <MenuAcoes cand={cand} etapa={etapa} onAbrir={onAbrir} onMoverEtapa={onMoverEtapa} onContatar={onContatar} />
      </div>

      {/* INFORMAÇÕES — status · origem · data · avaliação */}
      <div className="flex flex-wrap items-center gap-1">
        <span
          style={{ '--status-cor': `var(--${status.token})` } as React.CSSProperties}
          className="inline-flex h-[18px] shrink-0 items-center rounded-full border border-[hsl(var(--status-cor)/0.28)] bg-[hsl(var(--status-cor)/0.12)] px-1.5 text-[9.5px] font-semibold leading-none text-[hsl(var(--status-cor))]"
        >
          {status.label}
        </span>
        <span className="inline-flex h-[18px] max-w-full items-center gap-1 rounded-full border border-border/50 bg-muted/40 px-1.5 text-[9.5px] font-medium leading-none text-muted-foreground">
          <span className="truncate">{cand.candidato?.origem || 'Direto'}</span>
        </span>
        <span className="inline-flex h-[18px] items-center gap-1 rounded-full border border-border/50 bg-muted/40 px-1.5 text-[9.5px] leading-none text-muted-foreground">
          <CalendarDays className="h-2.5 w-2.5 shrink-0" aria-hidden />
          {formatarDataCurta(cand.created_at)}
        </span>
        <span
          className={cn(
            'ml-auto inline-flex items-center gap-0.5 text-[10.5px] font-semibold tabular-nums',
            cand.nota_geral ? 'text-warning' : 'text-muted-foreground/70'
          )}
          title={cand.nota_geral ? `Avaliação ${cand.nota_geral}` : 'Sem avaliação'}
        >
          <Star
            className={cn(
              'h-3 w-3 shrink-0',
              cand.nota_geral ? 'fill-warning text-warning' : 'text-muted-foreground/40'
            )}
          />
          {cand.nota_geral ?? 'S/N'}
        </span>
      </div>

      {/* COMPETÊNCIAS — requisitos reais da vaga (mesmo chip discreto do card de Admissão) */}
      {habilidades.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {habilidades.slice(0, 3).map((habilidade) => (
            <span
              key={habilidade}
              className="max-w-full truncate rounded-md border border-border/50 bg-muted/40 px-1.5 py-0.5 text-[9.5px] font-medium leading-tight text-muted-foreground"
              title={habilidade}
            >
              {habilidade}
            </span>
          ))}
          {habilidades.length > 3 && (
            <span className="rounded-md border border-border/50 bg-muted/40 px-1.5 py-0.5 text-[9.5px] font-medium leading-tight text-muted-foreground">
              +{habilidades.length - 3}
            </span>
          )}
        </div>
      )}

      {/* BLOCO CONTEXTUAL DA ETAPA — rótulo + próxima ação + detalhe */}
      <div data-pipeline-contexto className="rounded-lg border border-border/40 bg-muted/20 px-2 py-1.5">
        <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/70">
          {ROTULO_CONTEXTO[etapa.id]}
        </p>
        <p className="mt-0.5 flex items-center gap-1.5 text-[11px] leading-snug text-foreground/90">
          <IconeContexto className={cn('h-3.5 w-3.5 shrink-0', tom.tinta)} />
          <span className="truncate">{contexto.titulo}</span>
        </p>
        <p className="mt-1 flex items-center gap-1.5 text-[10.5px] leading-snug text-muted-foreground">
          <ArrowRight className="h-3 w-3 shrink-0" />
          <span className="truncate">{contexto.detalhe}</span>
        </p>
      </div>

      {/* RODAPÉ — responsável do processo + prazo da próxima etapa */}
      <div className="flex items-center justify-between gap-2 border-t border-border/40 pt-1.5">
        <span className="flex min-w-0 items-center gap-1.5">
          {entrevistador ? (
            <AvatarIniciais nome={entrevistador} className={cn('h-5 w-5 text-[8.5px]', tom.veu)} />
          ) : (
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border/40 bg-muted/60 text-muted-foreground/70">
              <UserRound className="h-3 w-3" aria-hidden />
            </span>
          )}
          <span className="truncate text-[10.5px] text-muted-foreground">
            {entrevistador ?? 'Sem responsável definido'}
          </span>
        </span>
        {prazo && (
          <span className="flex shrink-0 items-center gap-1 text-[10.5px] tabular-nums text-muted-foreground">
            <CalendarDays className="h-3 w-3" />
            {prazo}
          </span>
        )}
      </div>
    </Card>
  );
}

/**
 * Wrapper de arraste — o MESMO desenho do `DraggableCard` de Admissão: o card
 * inteiro é a superfície (sensor com `distance: 6`, então clique não arrasta) e
 * o card original fica em `opacity-30` enquanto o `DragOverlay` segue o cursor.
 */
export function DraggablePipelineCard({
  cand,
  etapa,
  onAbrir,
  onMoverEtapa,
  onContatar,
}: {
  cand: CandidaturaComRelacoes;
  etapa: EtapaPipeline;
  onAbrir: (cand: CandidaturaComRelacoes) => void;
  onMoverEtapa: MoverEtapaHandler;
  onContatar: (cand: CandidaturaComRelacoes) => void;
}) {
  const arrastavel = podeArrastarCandidatura(cand.status);
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: cand.id,
    disabled: !arrastavel,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      data-candidato-card={cand.id}
      data-pipeline-arrastavel={arrastavel ? 'true' : 'false'}
      onClick={(event) => {
        // Cliques nos botões internos (menu de ações) são do Radix: não abrem o
        // dossiê. O card em si continua sendo a área de clique/drag.
        if ((event.target as HTMLElement).closest('button')) return;
        onAbrir(cand);
      }}
      className={cn(
        // `pan-y`: rolagem vertical (página/lista) continua nativa; o arraste
        // horizontal intencional inicia o DnD, sem "roubar" o scroll no toque.
        'touch-pan-y rounded-xl outline-hidden focus-visible:ring-2 focus-visible:ring-primary/50',
        isDragging && 'opacity-30'
      )}
    >
      <PipelineCard cand={cand} etapa={etapa} onAbrir={onAbrir} onMoverEtapa={onMoverEtapa} onContatar={onContatar} />
    </div>
  );
}
