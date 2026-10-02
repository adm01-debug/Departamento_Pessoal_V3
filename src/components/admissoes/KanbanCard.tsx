/**
 * Card de candidato do Kanban de Admissões — compacto e denso, um "mini painel"
 * da etapa (não um bloco solto).
 *
 * HIERARQUIA (a leitura que o card entrega de relance):
 *   1. nome do candidato           (principal — `font-display`, cor de texto cheia)
 *   2. cargo                       (secundário — muted, uma linha)
 *   3. badge do departamento       (chip discreto)
 *   4. bloco contextual da etapa   (rótulo + status + progresso/alertas) — muda por
 *                                  etapa e vem de `contextoDoCard`/`statusDoCard`
 *   5. responsável                 (avatar de iniciais + nome, no rodapé)
 *   6. prazo                       (data_prevista, no canto direito do rodapé)
 *
 * O contexto do card NÃO é frase inventada: `statusDoCard` lê checklist, pendência
 * registrada e recibo do eSocial do próprio registro, e `contextoDoCard` monta o
 * rótulo/barra/linhas de apoio (`kanbanComum.ts`). Ver a nota daqueles helpers.
 *
 * ANIMAÇÃO: o card em SI não anima — `KanbanCard` é puro visual e o wrapper
 * `DraggableCard` (`.kanban-card`) só carrega a variável `--card-index`. Quem anima é
 * a keyframe `kanban-card-in` do CSS (`src/index.css`), disparada pela classe
 * `.kanban-em-entrada` da coluna. O wrapper fica FORA do nó do dnd-kit: fundir o
 * transform de entrada com o do arraste no mesmo DOM é o que quebraria o arraste.
 *
 * ARRASTE: o card inteiro é a área de arraste (os `listeners` do dnd-kit ficam no
 * wrapper `DraggableCard`), com `cursor-grab`. O sensor do board usa
 * `activationConstraint: { distance: 6 }`, então clicar no menu de ações não
 * inicia arraste. O ícone ⠿ do board antigo saiu: o canto superior direito passou
 * a ser do menu de ações (pedido da referência) e a affordance de arraste é o
 * próprio cursor + o realce no hover.
 */

import { type CSSProperties } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CalendarClock, ExternalLink, Mail, MessageSquare, MoreVertical } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { formatDate } from '@/utils/format';
import {
  TOM_KANBAN,
  colunaDaEtapa,
  contextoDoCard,
  iniciais,
  responsavelDaAdmissao,
  statusDoCard,
  type AdmissaoKanban,
  type TomLinha,
} from './kanbanComum';

/**
 * Cor de cada linha de contexto do card. `alerta` usa a variante vibrante do
 * vermelho (a mesma dos estados críticos da área); `ok` o verde semântico;
 * `acento` mantém o texto em foreground (só o ícone da etapa puxa cor) e
 * `neutro` fica muted.
 */
const COR_LINHA: Record<TomLinha, string> = {
  neutro: 'text-muted-foreground',
  acento: 'text-foreground/85',
  alerta: 'text-destructive-vivid',
  ok: 'text-success',
};

/** Ações do card — as MESMAS da Gestão de Candidatos, vindas da página. */
export interface KanbanAcoes {
  /**
   * id da admissão cujo link está sendo enviado (é o MESMO estado da tabela de
   * candidatos — `string | null`, não um booleano): o card que casa o id mostra
   * spinner e fica bloqueado, os outros seguem livres.
   */
  sendingLink?: string | null;
  /** `any` de propósito: espelha o contrato de `GestaoCandidatos` (a página guarda
   * a linha como `LooseRow<'admissoes'>`, e o board recebe registros frouxos). */
  onEnviarLink?: (admissao: any) => void;
  onEnviarWhatsApp?: (admissao: any) => void;
  onOpenDetalhes?: (admissao: any) => void;
}

/**
 * Menu de três pontos do card — pequeno e discreto no canto superior direito. Os
 * três itens são exatamente os da tabela de candidatos (`GestaoCandidatos`), com
 * o mesmo tratamento de `sendingLink` (spinner no card em envio), para o módulo
 * ter as mesmas ações nos dois lugares.
 */
function MenuAcoes({ item, acoes }: { item: AdmissaoKanban; acoes?: KanbanAcoes }) {
  const { sendingLink, onEnviarLink, onEnviarWhatsApp, onOpenDetalhes } = acoes ?? {};
  const enviando = sendingLink === item.id;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 rounded-lg text-muted-foreground opacity-60 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100"
          disabled={enviando}
          aria-label={`Mais ações de ${item.nome}`}
        >
          {enviando ? <Spinner size="sm" /> : <MoreVertical className="h-4 w-4" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="rounded-xl">
        <DropdownMenuItem onClick={() => onOpenDetalhes?.(item)} className="cursor-pointer gap-2">
          <ExternalLink className="h-4 w-4 text-info" /> Abrir detalhes
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onEnviarLink?.(item)} className="cursor-pointer gap-2">
          <Mail className="h-4 w-4 text-primary" /> Enviar por e-mail
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onEnviarWhatsApp?.(item)} className="cursor-pointer gap-2">
          <MessageSquare className="h-4 w-4 text-success" /> Enviar por WhatsApp
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Avatar de iniciais — usado no candidato (36px) e no responsável (20px). */
function AvatarIniciais({ nome, className }: { nome?: string | null; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full border border-border/40 font-semibold tracking-tight',
        className
      )}
    >
      {iniciais(nome)}
    </span>
  );
}

export interface KanbanCardProps {
  item: AdmissaoKanban;
  /** Clone do card no `DragOverlay` (elevado, montado já no estado final). */
  dragging?: boolean;
  acoes?: KanbanAcoes;
}

export function KanbanCard({ item, dragging, acoes }: KanbanCardProps) {
  const tom = TOM_KANBAN[colunaDaEtapa(item.etapa)?.tom ?? 'primary'];
  const status = statusDoCard(item);
  const ctx = contextoDoCard(item);
  const responsavel = responsavelDaAdmissao(item);
  const pct = ctx.progresso ? Math.round((ctx.progresso.feito / ctx.progresso.total) * 100) : 0;

  return (
    <Card
      className={cn(
        // O CARD é a superfície ESCURA da escada (fundo da página → painel →
        // card), como na referência: fica dentro do painel `bg-card` e desce um
        // degrau (`bg-background/85`), com borda e sombra curta por cima.
        //
        // Sombra: `shadow-sm shadow-black/25` — os tokens do tema só definem
        // `glow/elevated/glass` (`theme.extend.boxShadow`); `shadow-card` e
        // `shadow-float` NÃO existem e resolvem para `none`. `shadow-md` no hover
        // é o default do Tailwind, que continua disponível.
        'group cursor-grab space-y-2 rounded-xl border border-border/50 bg-background/85 p-2.5 shadow-sm shadow-black/25 transition-all active:cursor-grabbing hover:shadow-md',
        tom.bordaHover,
        dragging && 'rotate-1 border-primary/40 shadow-lg ring-2 ring-primary/30'
      )}
    >
      {/* TOPO — avatar + nome/cargo + menu de ações */}
      <div className="flex items-start gap-2">
        <AvatarIniciais nome={item.nome} className={cn('h-8 w-8 text-[10px]', tom.veu)} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-[13px] font-semibold leading-tight text-foreground">{item.nome}</p>
          <p className="mt-0.5 truncate text-[11px] leading-tight text-muted-foreground">
            {item.cargo || 'Cargo não informado'}
          </p>
        </div>
        <MenuAcoes item={item} acoes={acoes} />
      </div>

      {/* DEPARTAMENTO — chip pequeno */}
      {item.departamento && (
        <span className="inline-flex max-w-full items-center truncate rounded-md border border-border/50 bg-muted/40 px-1.5 py-0.5 text-[10px] font-medium leading-tight text-muted-foreground">
          {item.departamento}
        </span>
      )}

      {/* BLOCO CONTEXTUAL DA ETAPA — rótulo + status + progresso + alertas */}
      <div className="rounded-lg border border-border/40 bg-muted/20 px-2 py-1.5">
        <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/70">{ctx.rotulo}</p>

        <p className="mt-0.5 flex items-center gap-1.5 text-[11px] leading-snug text-foreground/90">
          <status.icone className={cn('h-3.5 w-3.5 shrink-0', tom.tinta)} />
          <span className="truncate">{status.texto}</span>
        </p>

        {ctx.progresso && (
          <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted/70">
            <div
              className={cn('h-full rounded-full transition-[width] duration-300', tom.barra)}
              style={{ width: `${pct}%` }}
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        )}

        {ctx.linhas.map((linha) => (
          <p
            key={linha.texto}
            className={cn('mt-1 flex items-center gap-1.5 text-[10.5px] leading-snug', COR_LINHA[linha.tom])}
          >
            <linha.icone className="h-3 w-3 shrink-0" />
            <span className="truncate">{linha.texto}</span>
          </p>
        ))}
      </div>

      {/* RODAPÉ — responsável (esquerda) + prazo (direita) */}
      <div className="flex items-center justify-between gap-2 border-t border-border/40 pt-1.5">
        <span className="flex min-w-0 items-center gap-1.5">
          <AvatarIniciais nome={responsavel} className="h-5 w-5 bg-muted/70 text-[9px] text-muted-foreground" />
          <span className="truncate text-[10.5px] text-muted-foreground">{responsavel}</span>
        </span>
        {item.data_prevista && (
          <span className="flex shrink-0 items-center gap-1 text-[10.5px] tabular-nums text-muted-foreground">
            <CalendarClock className="h-3 w-3" />
            {formatDate(item.data_prevista)}
          </span>
        )}
      </div>
    </Card>
  );
}

/** CSS custom property do stagger dos cards (tipada sem `any`). */
type VarsCard = CSSProperties & Record<'--card-index', string | number>;

/**
 * Wrapper do card: ENTRADA (CSS) + arraste. Dois nós de propósito — o `<div>`
 * EXTERNO (`.kanban-card`) carrega `--card-index` e recebe a keyframe
 * `kanban-card-in` (via `.kanban-em-entrada` da coluna); o `<div>` INTERNO é o nó do
 * dnd-kit (`listeners`/`attributes`/ref e o alvo das medições do sensor). Separar os
 * dois é o que impede o transform da entrada de competir com o do arraste no mesmo
 * DOM. Depois que a coluna conclui a entrada, o card não tem mais animação — cards
 * adicionados/movidos entram visíveis.
 */
export function DraggableCard({
  item,
  cardIndex,
  acoes,
}: {
  item: AdmissaoKanban;
  /** Posição do card NA COLUNA — vira `--card-index` (stagger de 80ms no CSS). */
  cardIndex: number;
  acoes?: KanbanAcoes;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: item.id });
  const estilo: VarsCard = { '--card-index': cardIndex };
  return (
    <div className="kanban-card" style={estilo}>
      <div ref={setNodeRef} {...listeners} {...attributes} className={cn(isDragging && 'opacity-30')}>
        <KanbanCard item={item} acoes={acoes} />
      </div>
    </div>
  );
}
